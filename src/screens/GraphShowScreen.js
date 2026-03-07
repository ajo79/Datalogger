/*
 * GraphShowScreen.js
 *
 * This screen displays a detailed graph view for a specific device context (e.g., Cabin1).
 * It includes date filtering to adjust the graph range.
 *
 * Key Features:
 * - LineChart visualization of Temperature and Humidity.
 * - Date Range Filter with DateTimePicker.
 * - Custom Legend for chart series.
 */

import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Image,
  ImageBackground,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LineChart } from "react-native-chart-kit";
import { fetchAllIoTReadings, fetchRealTimeDataMonitor } from '../api/dataService';
import { useNavigation } from "@react-navigation/native";
import { computeIsOnline } from "../utils/deviceHealth";

const screenWidth = Dimensions.get("window").width;
const LIVE_POLL_MS = 5000;
const MIN_POINT_WIDTH = 60; // px per point for horizontal scroll
const MAX_GRAPH_POINTS = 100;
const HISTORY_PAGE_SIZE = 500;
const OFFLINE_STALE_HYSTERESIS_COUNT = 2;
const TOOLTIP_WIDTH = 170;
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const EMPTY_GRAPH_DATA = {
  type: "env",
  labels: ["0"],
  timestamps: [],
  temp: [0],
  hum: [0],
  press: {},
};

export default function GraphShowScreen({ route, navigation: navigationProp }) {
  const navFromHook = useNavigation();
  const navigation = navigationProp ?? navFromHook;

  const tryParentBack = (nav) => {
    let current = nav;
    while (current) {
      if (current?.canGoBack?.()) {
        current.goBack();
        return true;
      }
      current = current.getParent?.();
    }
    return false;
  };

  const handleBack = () => {
    if (tryParentBack(navigation)) return;
    // Hard fallback: reset to Home stack (TabNavigator entry)
    navigation?.reset?.({
      index: 0,
      routes: [{ name: "Home" }],
    });
  };
  // Get params from navigation (provided by HomeScreen)
  const { deviceId } = route.params || { deviceId: "Unknown" };

  // --- State for Data ---
  const [isLoading, setIsLoading] = useState(false);
  const [graphData, setGraphData] = useState(EMPTY_GRAPH_DATA);
  const [viewMode, setViewMode] = useState("live"); // "live" | "history"
  const [liveNotice, setLiveNotice] = useState("");
  const [historyPage, setHistoryPage] = useState(0);
  const [historyPageCount, setHistoryPageCount] = useState(0);
  const [historyTotalPoints, setHistoryTotalPoints] = useState(0);
  const [historyFullData, setHistoryFullData] = useState(null);
  const lastLiveTsRef = useRef(null);
  const offlineStreakRef = useRef(0);
  const chartScrollRef = useRef(null);
  const [chartScrollX, setChartScrollX] = useState(0);
  const [selectedPoint, setSelectedPoint] = useState(null);

  // --- State for Date Filter ---
  const getToday = () => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  };

  const getSevenDaysAgo = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  };

  const [startDate, setStartDate] = useState(getSevenDaysAgo());
  const [endDate, setEndDate] = useState(getToday());

  const [showPicker, setShowPicker] = useState(false);
  const [currentField, setCurrentField] = useState(null);

  // Helpers
  const pickNumberAlias = (obj, aliases = []) => {
    if (!obj || typeof obj !== "object") return undefined;
    const lowerMap = {};
    Object.entries(obj).forEach(([k, v]) => (lowerMap[String(k).toLowerCase()] = v));
    for (const alias of aliases) {
      const lk = String(alias).toLowerCase();
      if (Object.prototype.hasOwnProperty.call(lowerMap, lk)) {
        const n = Number(lowerMap[lk]);
        if (Number.isFinite(n)) return n;
      }
    }
    return undefined;
  };

  const getEnvValues = (item) => {
    const temperature = pickNumberAlias(item, ["temperature_c", "temperature deg", "temperature", "temp"]);
    const humidity = pickNumberAlias(item, ["humidity_pct", "humidity %", "humidity", "hum"]);
    return { temperature, humidity };
  };

  const getTsEpochMs = (item) => {
    const ts = Number(item?.tsEpochMs ?? item?.ts_epoch_ms);
    return Number.isFinite(ts) ? Math.round(ts) : undefined;
  };

  const extractPressMetrics = (item) => {
    const presses = {};
    Object.entries(item || {}).forEach(([key, val]) => {
      const ampMatch = key.match(/^Press\s*(\d+)\s*Amps$/i);
      const alarmMatch = key.match(/^Press\s*(\d+)\s*Alarm$/i);
      if (ampMatch) {
        const id = ampMatch[1];
        presses[id] = presses[id] || {};
        presses[id].amps = Number(val);
      } else if (alarmMatch) {
        const id = alarmMatch[1];
        presses[id] = presses[id] || {};
        presses[id].alarm = Number(val);
      }
    });
    const list = Object.keys(presses)
      .sort((a, b) => Number(a) - Number(b))
      .map((id) => ({ id, amps: presses[id]?.amps ?? 0, alarm: presses[id]?.alarm ?? 0 }));
    return list;
  };

  // Return consistent colors for press lines/legend with fallbacks for extra presses
  const getPressColor = (pid, idx = 0, opacity = 1) => {
    const map = {
      "1": `rgba(231, 76, 60, ${opacity})`,  // red
      "2": `rgba(46, 204, 113, ${opacity})`, // green
      "3": `rgba(52, 152, 219, ${opacity})`, // blue
    };
    return map[String(pid)] || `rgba(255, ${100 + idx * 40}, 0, ${opacity})`;
  };

  // Helper: Parse DD-MM-YYYY to Timestamp
  const parseDateToTs = (dateStr, isEndOfDay = false) => {
    if (!dateStr) return 0;
    const [day, month, year] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (isEndOfDay) date.setHours(23, 59, 59, 999);
    else date.setHours(0, 0, 0, 0);
    return date.getTime();
  };

  /**
   * Validates manual date input format (DD-MM-YYYY).
   * Also checks if it's a valid calendar date.
   */
  const validateDate = (dateStr) => {
    const regex = /^(\d{2})-(\d{2})-(\d{4})$/;
    if (!regex.test(dateStr)) return false;

    const [day, month, year] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  };

  /**
   * Handles text changes in the date input fields.
   * Allows manual typing with simple regex filtering.
   */
  const handleManualDate = (field, text) => {
    const cleaned = text.replace(/[^0-9-]/g, '');
    if (field === "end") {
      setEndDate(cleaned);
    } else {
      setStartDate(cleaned);
    }
  };

  const applyHistoryPage = (fullData, page) => {
    if (!fullData) return EMPTY_GRAPH_DATA;
    const start = page * HISTORY_PAGE_SIZE;
    const end = start + HISTORY_PAGE_SIZE;
    if (fullData.type === "press") {
      const nextPress = {};
      Object.entries(fullData.press || {}).forEach(([pid, series]) => {
        nextPress[pid] = (series || []).slice(start, end);
      });
      return {
        ...fullData,
        labels: (fullData.labels || []).slice(start, end),
        timestamps: (fullData.timestamps || []).slice(start, end),
        press: nextPress,
      };
    }
    return {
      ...fullData,
      labels: (fullData.labels || []).slice(start, end),
      timestamps: (fullData.timestamps || []).slice(start, end),
      temp: (fullData.temp || []).slice(start, end),
      hum: (fullData.hum || []).slice(start, end),
    };
  };

  const normalizeId = (id) => String(id || "").trim().toLowerCase();

  const formatTimeLabel = (ts, withSeconds = false) => {
    const d = new Date(Number(ts));
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    if (!withSeconds) return `${h}:${m}`;
    const s = String(d.getSeconds()).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const formatFullDateTime = (ts) => {
    const d = new Date(Number(ts));
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year} ${formatTimeLabel(ts, true)}`;
  };

  const getDayKey = (ts) => {
    const d = new Date(Number(ts));
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const formatHistoryAxisLabel = (ts, prevTs, hasMultipleDays) => {
    const d = new Date(Number(ts));
    const timePart = formatTimeLabel(ts, false);
    if (!hasMultipleDays) return timePart;
    if (!Number.isFinite(Number(prevTs)) || getDayKey(prevTs) !== getDayKey(ts)) {
      return `${String(d.getDate()).padStart(2, "0")} ${MONTH_SHORT[d.getMonth()]}\n${timePart}`;
    }
    return timePart;
  };

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const appendPoint = (arr, value) => [...(arr || []).slice(-(MAX_GRAPH_POINTS - 1)), value];

  const fetchHistory = async () => {
    if (!startDate || !endDate) {
      alert("Please select both Start and End dates.");
      return;
    }

    if (!validateDate(startDate) || !validateDate(endDate)) {
      alert("Please enter valid dates in DD-MM-YYYY format.");
      return;
    }

    const startTs = parseDateToTs(startDate, false);
    const endTs = parseDateToTs(endDate, true);
    if (startTs > endTs) {
      alert("Invalid date range. Start Date must be before End Date.");
      return;
    }

    setIsLoading(true);
    setSelectedPoint(null);
    console.log(`GraphShowScreen: Fetching history for ${deviceId} from ${startDate} to ${endDate}`);

    const targetId = normalizeId(deviceId);

    if (!targetId) {
      setHistoryFullData(null);
      setHistoryTotalPoints(0);
      setHistoryPageCount(0);
      setHistoryPage(0);
      setGraphData(EMPTY_GRAPH_DATA);
      setIsLoading(false);
      return;
    }

    try {
      // 1. Resolve date range
      const startTs = parseDateToTs(startDate, false);
      const endTs = parseDateToTs(endDate, true);
      console.log(`GraphShowScreen: Target Range TS: ${startTs} - ${endTs}`);

      // 2. Fetch paged IoT readings for this device/range
      const { IoTReadings, _meta: fetchMeta } = await fetchAllIoTReadings({
        deviceId: String(deviceId),
        startTsEpochMs: startTs,
        endTsEpochMs: endTs,
      });
      const sourceReadings = (IoTReadings || []).filter((item) => item?._schemaValid);
      console.log("GraphShowScreen: Total IoTReadings:", sourceReadings.length);
      if (fetchMeta?.potentiallyIncomplete) {
        console.warn(
          `[GraphShowScreen] IoTReadings may be partial. stopReason=${fetchMeta.stopReason} pages=${fetchMeta.pagesFetched}`
        );
      }

      // 3. Filter for this device and date range (defensive client-side filter)
      const filtered = sourceReadings
        .map((item) => ({ ...item, graphTsEpochMs: getTsEpochMs(item) }))
        .filter((item) => item.graphTsEpochMs !== undefined)
        .filter(item => {
          const dId = normalizeId(item.deviceId || "Unknown");
          const ts = Number(item.graphTsEpochMs);
          return dId === targetId && ts >= startTs && ts <= endTs;
        })
        .sort((a, b) => a.graphTsEpochMs - b.graphTsEpochMs); // Chronological order

      console.log(`GraphShowScreen: Found ${filtered.length} points for ${deviceId}`);

      // 4. Use all points in range (no display cap)
      const sliced = filtered;

      if (sliced.length > 0) {
        const labels = [];
        const timestamps = [];
        const temp = [];
        const hum = [];
        const pressMap = {};
        let isPress = false;

        sliced.forEach(item => {
          const ts = Number(item.graphTsEpochMs);
          labels.push(formatTimeLabel(ts));
          timestamps.push(ts);
          const pressList = extractPressMetrics(item);
          const envVals = getEnvValues(item);
          const hasEnv =
            Number.isFinite(Number(envVals.temperature)) ||
            Number.isFinite(Number(envVals.humidity));
          const hasPress =
            pressList.length > 0 &&
            pressList.some((p) => Number.isFinite(Number(p.amps)));
          const isPressReading = hasPress && !hasEnv;

          if (isPressReading) {
            isPress = true;
            pressList.forEach(p => {
              if (!pressMap[p.id]) pressMap[p.id] = [];
              pressMap[p.id].push(Number(p.amps) || 0);
            });
          } else {
            temp.push(Number(envVals.temperature) || 0);
            hum.push(Number(envVals.humidity) || 0);
          }
        });

        const fullData = isPress
          ? {
              type: "press",
              labels,
              timestamps,
              press: pressMap,
              temp: [],
              hum: []
            }
          : {
              type: "env",
              labels,
              timestamps,
              temp,
              hum,
              press: {}
            };

        const totalPoints = Array.isArray(timestamps) ? timestamps.length : 0;
        const pageCount = totalPoints ? Math.ceil(totalPoints / HISTORY_PAGE_SIZE) : 0;
        setHistoryFullData(fullData);
        setHistoryTotalPoints(totalPoints);
        setHistoryPageCount(pageCount);
        setHistoryPage(0);
        setGraphData(applyHistoryPage(fullData, 0));
      } else {
        // No data found
        console.log("GraphShowScreen: No data after filtering.");
        setHistoryFullData(null);
        setHistoryTotalPoints(0);
        setHistoryPageCount(0);
        setHistoryPage(0);
        setGraphData(EMPTY_GRAPH_DATA);
      }

    } catch (e) {
      console.error("GraphShow fetch error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Live polling (selected device only) ---
  useEffect(() => {
    if (viewMode !== "live") return;

    let cancelled = false;
    const targetId = normalizeId(deviceId);
    lastLiveTsRef.current = null;
    offlineStreakRef.current = 0;
    setGraphData({ type: "env", labels: [], timestamps: [], temp: [], hum: [], press: {} });
    setSelectedPoint(null);
    setLiveNotice("");

    const pollLive = async () => {
      try {
        const rows = await fetchRealTimeDataMonitor();
        if (cancelled) return;

        const selected = (rows || []).find((item) => normalizeId(item?.deviceId) === targetId);
        if (!selected) {
          offlineStreakRef.current = 0;
          setLiveNotice("No live reading yet for this device.");
          return;
        }

        if (computeIsOnline(selected)) {
          offlineStreakRef.current = 0;
        } else {
          offlineStreakRef.current += 1;
          if (offlineStreakRef.current >= OFFLINE_STALE_HYSTERESIS_COUNT) {
            setLiveNotice("Device is offline. Live graph shows online devices only.");
            return;
          }
        }
        setLiveNotice("");

        const tsEpochMs = getTsEpochMs(selected);
        if (!Number.isFinite(tsEpochMs)) {
          setLiveNotice("Live reading missing tsEpochMs.");
          return;
        }

        // Prevent duplicate points when backend returns same latest record repeatedly.
        if (lastLiveTsRef.current === tsEpochMs) return;
        lastLiveTsRef.current = tsEpochMs;
        setLiveNotice("");

        const pressList = extractPressMetrics(selected);
        const envVals = getEnvValues(selected);
        const hasEnv =
          Number.isFinite(Number(envVals.temperature)) ||
          Number.isFinite(Number(envVals.humidity));
        const hasPress =
          pressList.length > 0 &&
          pressList.some((p) => Number.isFinite(Number(p.amps)));
        const isPressReading = hasPress && !hasEnv;
        const label = formatTimeLabel(tsEpochMs, true);

        setGraphData((prev) => {
          if (isPressReading) {
            const incoming = {};
            pressList.forEach((p) => {
              incoming[String(p.id)] = Number(p.amps) || 0;
            });
            const prevPress = prev?.type === "press" ? (prev.press || {}) : {};
            const allIds = Array.from(new Set([...Object.keys(prevPress), ...Object.keys(incoming)]))
              .sort((a, b) => Number(a) - Number(b));
            const nextPress = {};
            allIds.forEach((pid) => {
              const nextVal = Object.prototype.hasOwnProperty.call(incoming, pid) ? incoming[pid] : 0;
              nextPress[pid] = appendPoint(prevPress[pid], nextVal);
            });
            return {
              type: "press",
              labels: appendPoint(prev?.labels, label),
              timestamps: appendPoint(prev?.timestamps, tsEpochMs),
              press: nextPress,
              temp: [],
              hum: [],
            };
          }

          const temp = Number(envVals.temperature) || 0;
          const hum = Number(envVals.humidity) || 0;
          const prevEnv = prev?.type === "env" ? prev : { labels: [], timestamps: [], temp: [], hum: [] };
          return {
            type: "env",
            labels: appendPoint(prevEnv.labels, label),
            timestamps: appendPoint(prevEnv.timestamps, tsEpochMs),
            temp: appendPoint(prevEnv.temp, temp),
            hum: appendPoint(prevEnv.hum, hum),
            press: {},
          };
        });
      } catch (e) {
        if (!cancelled) setLiveNotice("Unable to fetch live data.");
      }
    };

    pollLive();
    const timer = setInterval(pollLive, LIVE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [viewMode, deviceId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (viewMode !== "history") return;
    if (!historyFullData) return;
    setGraphData(applyHistoryPage(historyFullData, historyPage));
  }, [viewMode, historyFullData, historyPage]);

  /**
   * Opens the date picker for 'start' or 'end' field.
   */
  const showDatePicker = (field) => {
    setCurrentField(field);
    setShowPicker(true);
  };

  /**
   * Handles date selection.
   * Formats date as DD-MM-YYYY.
   */
  const onDateChange = (event, selectedDate) => {
    setShowPicker(false);
    if (selectedDate) {
      // Manual formatting to match DD-MM-YYYY
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const year = selectedDate.getFullYear();
      const formatted = `${day}-${month}-${year}`;

      if (currentField === "start") {
        setStartDate(formatted);
      } else if (currentField === "end") {
        setEndDate(formatted);
      }
    }
  };

  const chartTimestamps = Array.isArray(graphData.timestamps) ? graphData.timestamps : [];
  const historyDayCount = new Set(chartTimestamps.map(getDayKey)).size;
  const historyHasMultipleDays = viewMode === "history" && historyDayCount > 1;
  const chartLabels = chartTimestamps.length
    ? chartTimestamps.map((ts, idx) =>
        viewMode === "history"
          ? formatHistoryAxisLabel(ts, idx > 0 ? chartTimestamps[idx - 1] : undefined, historyHasMultipleDays)
          : formatTimeLabel(ts, true)
      )
    : (graphData.labels && graphData.labels.length ? graphData.labels : ["--"]);
  const pressIds = Object.keys(graphData.press || {}).sort((a, b) => Number(a) - Number(b));
  const chartLegend =
    graphData.type === "press"
      ? pressIds.map((pid) => `Phase-${pid} Amps`)
      : ["Temp", "Humidity"];
  const chartDatasets =
    graphData.type === "press"
      ? pressIds.map((pid, idx) => ({
          data: graphData.press[pid] && graphData.press[pid].length ? graphData.press[pid] : [0],
          color: (opacity = 1) => getPressColor(pid, idx, opacity),
          strokeWidth: 2,
        }))
      : [
          {
            data: graphData.temp && graphData.temp.length ? graphData.temp : [0],
            color: (opacity = 1) => `rgba(255,165,0,${opacity})`, // Orange
            strokeWidth: 2,
          },
          {
            data: graphData.hum && graphData.hum.length ? graphData.hum : [0],
            color: (opacity = 1) => `rgba(0,0,255,${opacity})`, // Blue
            strokeWidth: 2,
          },
        ];
  const viewportWidth = Math.max(screenWidth - 20, 260);
  const chartWidth = Math.max(viewportWidth, chartLabels.length * MIN_POINT_WIDTH);
  const canScroll = chartWidth > viewportWidth;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Image source={require("../../assets/images/WaveTop.png")} style={styles.headerImage} />
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Image
            source={require("../../assets/images/BackIcon.png")}
            style={styles.icon}
          />
        </TouchableOpacity>
        <Text style={styles.headerText} numberOfLines={1} adjustsFontSizeToFit>
          {route.params?.deviceName || deviceId}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.modeSwitchRow}>
          <TouchableOpacity
            style={[styles.modeBtn, viewMode === "live" && styles.modeBtnActive]}
            onPress={() => {
              setSelectedPoint(null);
              setViewMode("live");
            }}
          >
            <Text style={[styles.modeBtnText, viewMode === "live" && styles.modeBtnTextActive]}>Live</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, viewMode === "history" && styles.modeBtnActive]}
            onPress={() => {
              setSelectedPoint(null);
              setGraphData(EMPTY_GRAPH_DATA);
              setLiveNotice("");
              setHistoryPage(0);
              setViewMode("history");
            }}
          >
            <Text style={[styles.modeBtnText, viewMode === "history" && styles.modeBtnTextActive]}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Date Filter Inputs (History mode only) */}
        {viewMode === "history" && (
          <View style={styles.filterRow}>
            {/* Start Date */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Start Date</Text>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={styles.input}
                  placeholder="DD-MM-YYYY"
                  value={startDate}
                  onChangeText={(text) => handleManualDate("start", text)}
                />
                <TouchableOpacity onPress={() => showDatePicker("start")}>
                  <Image
                    source={require("../../assets/images/Calender.png")}
                    style={styles.calendarIcon}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* End Date */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>End Date</Text>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={styles.input}
                  placeholder="DD-MM-YYYY"
                  value={endDate}
                  onChangeText={(text) => handleManualDate("end", text)}
                />
                <TouchableOpacity onPress={() => showDatePicker("end")}>
                  <Image
                    source={require("../../assets/images/Calender.png")}
                    style={styles.calendarIcon}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Filter Button */}
            <TouchableOpacity style={styles.filterBtn} onPress={fetchHistory}>
              <Text style={styles.filterText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}
        {viewMode === "history" && historyPageCount > 1 && (
          <View style={styles.pagerRow}>
            <TouchableOpacity
              style={[styles.pagerBtn, historyPage === 0 && styles.pagerBtnDisabled]}
              onPress={() => setHistoryPage((p) => Math.max(0, p - 1))}
              disabled={historyPage === 0}
            >
              <Text style={styles.pagerText}>Prev</Text>
            </TouchableOpacity>
            <Text style={styles.pagerLabel}>
              Page {historyPage + 1} / {historyPageCount} ({historyTotalPoints === 0 ? 0 : historyPage * HISTORY_PAGE_SIZE + 1}-
              {Math.min((historyPage + 1) * HISTORY_PAGE_SIZE, historyTotalPoints)} of {historyTotalPoints})
            </Text>
            <TouchableOpacity
              style={[styles.pagerBtn, historyPage + 1 >= historyPageCount && styles.pagerBtnDisabled]}
              onPress={() => setHistoryPage((p) => Math.min(historyPageCount - 1, p + 1))}
              disabled={historyPage + 1 >= historyPageCount}
            >
              <Text style={styles.pagerText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Graph Display */}
        <View style={styles.graphContainer}>
          <Text style={styles.title}>{viewMode === "live" ? "Live Analysis" : "History Analysis"}</Text>
          {viewMode === "live" && !!liveNotice && (
            <Text style={styles.liveNotice}>{liveNotice}</Text>
          )}

          {/* Legend */}
          <View style={styles.legend}>
            {graphData.type === "press" ? (
              Object.keys(graphData.press || {})
                .sort((a, b) => Number(a) - Number(b))
                .map((pid, idx) => (
                  <View style={styles.legendItem} key={pid}>
                    <View style={[styles.dot, { backgroundColor: getPressColor(pid, idx, 1) }]} />
                    <Text style={styles.legendText}>{`Phase-${pid} Amps`}</Text>
                  </View>
                ))
            ) : (
              <>
                <View style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: "orange" }]} />
                  <Text style={styles.legendText}>Temp</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: "blue" }]} />
                  <Text style={styles.legendText}>Humidity</Text>
                </View>
              </>
            )}
          </View>

          {/* Loading Indicator */}
          {isLoading ? (
            <ActivityIndicator size="large" color="#0000ff" style={{ marginVertical: 20 }} />
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator
                contentContainerStyle={styles.chartScroll}
                ref={chartScrollRef}
                onScroll={(e) => setChartScrollX(e?.nativeEvent?.contentOffset?.x || 0)}
                scrollEventThrottle={16}
              >
                <View style={[styles.chartCanvas, { width: chartWidth }]}>
                  <LineChart
                    data={{
                      labels: chartLabels,
                      datasets: chartDatasets,
                    }}
                    width={chartWidth}
                    height={220}
                    yAxisSuffix=""
                    fromZero
                    chartConfig={{
                      backgroundColor: "#fff",
                      backgroundGradientFrom: "#fff",
                      backgroundGradientTo: "#fff",
                      decimalPlaces: 1,
                      color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
                      labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
                      propsForDots: {
                        r: "4",
                        strokeWidth: "2",
                        stroke: "#ffa726",
                      },
                    }}
                    onDataPointClick={(point) => {
                      const idx = Number(point?.index);
                      if (!Number.isFinite(idx)) return;
                      const value = Number(point?.value);
                      const valueText = Number.isFinite(value) ? value.toFixed(2) : String(point?.value ?? "--");
                      const ts = Number(chartTimestamps[idx]);
                      const tsText = Number.isFinite(ts) ? formatFullDateTime(ts) : "--";
                      let seriesIdx = chartDatasets.findIndex((ds) => ds === point?.dataset);
                      if (seriesIdx < 0) {
                        const hintedIdx = Number(point?.datasetIndex);
                        if (Number.isFinite(hintedIdx)) seriesIdx = hintedIdx;
                      }
                      const seriesName = chartLegend[seriesIdx] || chartLegend[0] || "Value";
                      setSelectedPoint((prev) => {
                        if (prev && prev.idx === idx && prev.seriesName === seriesName) return null;
                        return {
                          idx,
                          x: Number(point?.x) || 0,
                          y: Number(point?.y) || 0,
                          seriesName,
                          valueText,
                          tsText,
                        };
                      });
                    }}
                    bezier
                    style={{
                      marginVertical: 8,
                      borderRadius: 16
                    }}
                  />
                  {!!selectedPoint && (
                    <View
                      pointerEvents="none"
                      style={[
                        styles.chartTooltip,
                        {
                          left: clamp((selectedPoint.x || 0) - TOOLTIP_WIDTH / 2, 4, Math.max(4, chartWidth - TOOLTIP_WIDTH - 4)),
                          top: Math.max(6, (selectedPoint.y || 0) - 70),
                        },
                      ]}
                    >
                      <Text style={styles.chartTooltipTitle}>{selectedPoint.seriesName}: {selectedPoint.valueText}</Text>
                      <Text style={styles.chartTooltipTime}>{selectedPoint.tsText}</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
              <View style={styles.scrollControls}>
                <TouchableOpacity
                  style={[styles.scrollBtn, !canScroll && styles.scrollBtnDisabled]}
                  disabled={!canScroll}
                  onPress={() => {
                    const step = viewportWidth * 0.6;
                    const next = Math.max(0, chartScrollX - step);
                    chartScrollRef.current?.scrollTo({ x: next, animated: true });
                    setChartScrollX(next);
                  }}
                >
                  <Text style={styles.scrollBtnText}>◀</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.scrollBtn, !canScroll && styles.scrollBtnDisabled]}
                  disabled={!canScroll}
                  onPress={() => {
                    const step = viewportWidth * 0.6;
                    const maxOffset = Math.max(0, chartWidth - viewportWidth);
                    const next = Math.min(maxOffset, chartScrollX + step);
                    chartScrollRef.current?.scrollTo({ x: next, animated: true });
                    setChartScrollX(next);
                  }}
                >
                  <Text style={styles.scrollBtnText}>▶</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Axis Labels */}
          <Text style={styles.xLabel}>Time</Text>
          <Text style={styles.yLabel}>Val</Text>
        </View>

        {/* Download Data Button */}
        <TouchableOpacity
          style={styles.downloadBtn}
          onPress={() =>
            navigation.navigate("Export", {
              deviceId,
              deviceName: route.params?.deviceName,
              startDate,
              endDate,
            })
          }
        >
          <Text style={styles.downloadText}>Download Data</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Footer */}
      <ImageBackground
        source={require("../../assets/images/WaveBottom.png")}
        style={styles.footer}
        resizeMode="cover"
      />

      {/* Date Picker Modal */}
      {showPicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}
    </SafeAreaView>
  );
}

/* ------------------------- STYLES ------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF"
  },

  /* Header Styles */
  headerImage: { width: "100%", height: 86, resizeMode: "cover" },
  topHeader: {
    position: "absolute",
    top: 22,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    zIndex: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: { width: 44 },
  icon: {
    width: 28,
    height: 24,
    resizeMode: "contain"
  },
  headerText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
    flex: 1
  },

  /* Content Styles */
  content: {
    flexGrow: 1,
    alignItems: "center",
    padding: 10,
    paddingBottom: 100, // Clear footer
  },
  modeSwitchRow: {
    flexDirection: "row",
    marginBottom: 12,
    alignSelf: "center",
  },
  modeBtn: {
    borderWidth: 1,
    borderColor: "#d5d9e0",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginHorizontal: 4,
    backgroundColor: "#fff",
  },
  modeBtnActive: {
    backgroundColor: "#0b5fff",
    borderColor: "#0b5fff",
  },
  modeBtnText: {
    color: "#1e293b",
    fontSize: 13,
    fontWeight: "600",
  },
  modeBtnTextActive: {
    color: "#fff",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 15,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  inputContainer: { marginHorizontal: 8 },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  calendarIcon: {
    width: 20,
    height: 20,
    marginLeft: 5
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
    color: "#000",
    fontWeight: "600"
  },
  input: {
    borderWidth: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
    width: 100,
    fontSize: 12
  },
  filterBtn: {
    backgroundColor: "#f5a623",
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 5,
    marginLeft: 8,
    marginTop: 18,
  },
  filterText: {
    color: "black",
    fontWeight: "bold",
    fontSize: 14
  },
  pagerRow: {
    marginTop: -4,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  pagerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#e3e3e3",
  },
  pagerBtnDisabled: {
    opacity: 0.5,
  },
  pagerText: {
    color: "#000",
    fontWeight: "600",
  },
  pagerLabel: {
    color: "#444",
    fontSize: 12,
    paddingHorizontal: 6,
  },

  /* Graph Styles */
  graphContainer: {
    alignItems: "center",
    marginTop: 10,
    width: "100%",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center"
  },
  liveNotice: {
    fontSize: 12,
    color: "#334155",
    marginBottom: 8,
    textAlign: "center",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 5
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5
  },
  legendText: {
    fontSize: 12,
    color: "#000"
  },
  chartScroll: {
    paddingRight: 12,
  },
  chartCanvas: {
    position: "relative",
  },
  chartTooltip: {
    position: "absolute",
    width: TOOLTIP_WIDTH,
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  chartTooltipTitle: {
    color: "#f8fafc",
    fontSize: 11,
    fontWeight: "700",
  },
  chartTooltipTime: {
    color: "#cbd5e1",
    fontSize: 10,
    marginTop: 2,
  },
  scrollControls: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: "100%",
    marginTop: 4,
    marginBottom: 6,
    paddingRight: 10,
  },
  scrollBtn: {
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  scrollBtnDisabled: {
    opacity: 0.5,
  },
  scrollBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  xLabel: {
    marginTop: 2,
    fontSize: 12,
    color: "#000",
    fontWeight: "bold"
  },
  yLabel: {
    position: "absolute",
    left: -15,
    top: 150,
    transform: [{ rotate: "-90deg" }],
    fontSize: 14,
    fontWeight: "bold",
  },
  downloadBtn: {
    backgroundColor: "#f6b85c", // theme yellow
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 15,
  },
  downloadText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 14
  },

  /* Footer Styles */
  footer: {
    height: 80,
    width: "100%"
  },
});
