/*
 * GraphScreen.js
 *
 * This screen allows users to query and visualize device data over a date range.
 * It features a date picker for Start/End dates and displays logs in a table.
 * (Note: The actual graph visual might be in GraphShowScreen; this screen seems to focus on querying logs.)
 *
 * Key Features:
 * - Date Range Filter (Start Date, End Date).
 * - Datetime Picker integration.
 * - Tabular display of device logs (Temperature, Humidity, Status).
 * - Navigation to specific graph views or other main screens.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Image,
  TextInput,
  SafeAreaView,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { LineChart } from "react-native-chart-kit";
import { fetchRealTimeDataMonitor, fetchAllIoTReadings } from '../api/dataService';
import { computeIsOnline } from "../utils/deviceHealth";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useResponsiveLayout } from "../theme/responsive";
import { hexWithAlpha, useAppTheme } from "../theme";
import { ModernBottomNav, ModernTopHeader } from "../components/ui";

const MIN_POINT_WIDTH = 60; // px per point for horizontal scroll space
const MAX_GRAPH_POINTS = 100;
const HISTORY_PAGE_SIZE = 500;
const OFFLINE_STALE_HYSTERESIS_COUNT = 2;
const LIVE_POLL_MS = 5000;
const TOOLTIP_WIDTH = 170;
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function GraphScreen({ navigation }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const ui = useResponsiveLayout();
  const screenWidth = ui.width;
// --- State for Date Management ---
const formatDate = (d) =>
  `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

const getToday = () => formatDate(new Date());
const getSevenDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return formatDate(d);
};

const [startDate, setStartDate] = useState(getSevenDaysAgo());
const [endDate, setEndDate] = useState(getToday());
const [historyDeviceId, setHistoryDeviceId] = useState("");
const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
const [activeDateField, setActiveDateField] = useState("start"); // "start" | "end"

  // --- Date Picker Handlers ---

const showDatePickerFor = (field = "start") => {
  setActiveDateField(field);
  setDatePickerVisibility(true);
};

  /**
   * Closes the date picker.
   */
  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  /**
   * Handles date selection confirmation.
   * Formats date as DD-MM-YYYY.
   */
const handleConfirm = (date) => {
  const formattedDate = formatDate(date);
  if (activeDateField === "end") {
    setEndDate(formattedDate);
  } else {
    setStartDate(formattedDate);
  }
  hideDatePicker();
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

  // --- View Mode State ---
  const [viewMode, setViewMode] = useState('live'); // 'live' | 'history'
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Helper: Parse DD-MM-YYYY string to Start of Day Timestamp (ms).
   */
  const parseDateToTs = (dateStr, isEndOfDay = false) => {
    const [day, month, year] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (isEndOfDay) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }
    return date.getTime();
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

  const normalizeId = (id) => String(id || "").trim().toLowerCase();

  // --- Helpers ---
  const pad2 = (v) => String(v).padStart(2, '0');

  const formatTimeLabel = (ts) => {
    const d = Number.isFinite(Number(ts)) ? new Date(Number(ts)) : new Date();
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  };

  const formatFullDateTime = (ts) => {
    const d = Number.isFinite(Number(ts)) ? new Date(Number(ts)) : new Date();
    return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  };

  const getDayKey = (ts) => {
    const d = Number.isFinite(Number(ts)) ? new Date(Number(ts)) : new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  };

  const formatHistoryAxisLabel = (ts, prevTs, hasMultipleDays) => {
    const d = Number.isFinite(Number(ts)) ? new Date(Number(ts)) : new Date();
    const timePart = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    if (!hasMultipleDays) return timePart;
    if (!Number.isFinite(Number(prevTs)) || getDayKey(prevTs) !== getDayKey(ts)) {
      return `${pad2(d.getDate())} ${MONTH_SHORT[d.getMonth()]}\n${timePart}`;
    }
    return timePart;
  };

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const normalizeMetric = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const getTsEpochMs = (item) => {
    const ts = Number(item?.tsEpochMs ?? item?.ts_epoch_ms);
    return Number.isFinite(ts) ? Math.round(ts) : undefined;
  };

  const readingIdentity = (item) => {
    const deviceId = item?.deviceId != null ? String(item.deviceId) : "";
    const ts = getTsEpochMs(item);
    const msgType = item?.msgType != null ? String(item.msgType) : "";
    const parameterCount = Array.isArray(item?.parameters) ? item.parameters.length : 0;
    return `${deviceId}|${ts ?? ""}|${msgType}|${parameterCount}`;
  };

  const dedupeReadings = (rows = []) => {
    const out = [];
    const seen = new Set();
    (rows || []).forEach((row) => {
      const key = readingIdentity(row);
      if (seen.has(key)) return;
      seen.add(key);
      out.push(row);
    });
    return out;
  };

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

  // Extract press metrics like "Press 1 Amps"/"Press 1 Alarm"
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

  // Consistent press colors: 1=red, 2=green, 3=blue, fallback to orange shades
  const getPressColor = (pid, idx = 0, opacity = 1) => {
    const map = {
      "1": `rgba(231, 76, 60, ${opacity})`,  // red
      "2": `rgba(46, 204, 113, ${opacity})`, // green
      "3": `rgba(52, 152, 219, ${opacity})`, // blue
    };
    return map[String(pid)] || `rgba(255, ${100 + idx * 40}, 0, ${opacity})`;
  };

  // --- Real-time Chart Data (Multi-Device) ---
  // Structure: { [deviceId]: { labels: [], temp: [], hum: [] } }
  const [deviceHistory, setDeviceHistory] = useState({});
  const scrollRefs = useRef({});
  const [scrollOffsets, setScrollOffsets] = useState({});
  const [liveNotice, setLiveNotice] = useState("");
  const [offlineDevices, setOfflineDevices] = useState([]);
  const [historyNotice, setHistoryNotice] = useState("");
  const [historyPage, setHistoryPage] = useState(0);
  const [historyPageCount, setHistoryPageCount] = useState(0);
  const [historyTotalPoints, setHistoryTotalPoints] = useState(0);
  const [historyFull, setHistoryFull] = useState({});
  const [chartTooltips, setChartTooltips] = useState({});
  const offlineStreakRef = useRef({});
  const lastLiveTsRef = useRef({});
  const offlineSummary = useMemo(() => {
    if (!offlineDevices.length) return "";
    if (offlineDevices.length <= 2) return offlineDevices.join(", ");
    return `${offlineDevices.slice(0, 2).join(", ")} +${offlineDevices.length - 2}`;
  }, [offlineDevices]);

  useEffect(() => {
    // Only poll if in Live Mode
    if (viewMode !== 'live') return;
    lastLiveTsRef.current = {};

    const pollLive = async () => {
      try {
        const raw = await fetchRealTimeDataMonitor();
        if (raw && Array.isArray(raw)) {
          // Items are already normalized in dataService.
          const processed = raw;
          const nextOfflineStreak = {};
          const onlineItems = [];
          const offlineItems = [];

          processed.forEach((source) => {
            const deviceId = String(source?.deviceId || "Unknown");
            const isFresh = computeIsOnline(source);
            const prevStreak = Number(offlineStreakRef.current[deviceId] || 0);
            const streak = isFresh ? 0 : prevStreak + 1;
            nextOfflineStreak[deviceId] = streak;
            const isOnlineStable = isFresh || streak < OFFLINE_STALE_HYSTERESIS_COUNT;
            if (isOnlineStable) {
              onlineItems.push(source);
            } else {
              offlineItems.push(source);
            }
          });
          offlineStreakRef.current = nextOfflineStreak;

          const offlineLabels = offlineItems.map(src => {
            const did = src?.deviceId ? String(src.deviceId) : "Unknown";
            const name = src?.deviceName || src?.device_name;
            return name ? `${name} (${did})` : did;
          });
          setOfflineDevices(offlineLabels);

          if (!processed.length) {
            setLiveNotice("No live data. Devices look offline or quiet.");
            setDeviceHistory({});
            return;
          }

          if (!onlineItems.length) {
            setLiveNotice("All devices are offline. Live graph shows online devices only.");
            setDeviceHistory({});
            return;
          }
          setLiveNotice("");

          setDeviceHistory(prevHistory => {
            const onlineIds = new Set(
              onlineItems.map((source) => String(source?.deviceId || "Unknown"))
            );
            const nextHistory = {};

            Object.entries(prevHistory || {}).forEach(([id, history]) => {
              if (onlineIds.has(id)) {
                nextHistory[id] = history;
              }
            });

            onlineItems.forEach(source => {
              const deviceId = String(source.deviceId || "Unknown");
              const pressList = extractPressMetrics(source);
              const envVals = getEnvValues(source);
              const hasEnv =
                Number.isFinite(Number(envVals.temperature)) ||
                Number.isFinite(Number(envVals.humidity));
              const hasPress =
                pressList.length > 0 &&
                pressList.some((p) => Number.isFinite(Number(p.amps)));
              // Prefer env chart when env metrics are present, even if press fields also exist.
              const isPress = hasPress && !hasEnv;
              const tsEpochMs = getTsEpochMs(source);
              if (tsEpochMs === undefined) return;
              if (lastLiveTsRef.current[deviceId] === tsEpochMs) return;
              lastLiveTsRef.current[deviceId] = tsEpochMs;
              const timeLabel = formatTimeLabel(tsEpochMs);

              // Initialize if new device
              if (!nextHistory[deviceId]) {
                nextHistory[deviceId] = isPress
                  ? { type: "press", labels: [], timestamps: [], press: {} }
                  : { type: "env", labels: [], timestamps: [], temp: [], hum: [] };
              }

              const devData = nextHistory[deviceId];
              const newLabels = [...(devData.labels || []).slice(-(MAX_GRAPH_POINTS - 1)), timeLabel];
              const newTimestamps = [...(devData.timestamps || []).slice(-(MAX_GRAPH_POINTS - 1)), tsEpochMs];

              if (isPress) {
                // Ensure type is press
                devData.type = "press";
                devData.labels = newLabels;
                devData.timestamps = newTimestamps;
                devData.press = devData.press || {};
                pressList.forEach((p) => {
                  const arr = devData.press[p.id] ? [...devData.press[p.id].slice(-(MAX_GRAPH_POINTS - 1))] : [];
                  arr.push(normalizeMetric(p.amps));
                  devData.press[p.id] = arr;
                });
              } else {
                if (!hasEnv) return;
                devData.type = "env";
                const t = normalizeMetric(envVals.temperature);
                const h = normalizeMetric(envVals.humidity);
                const newTemp = [...(devData.temp || []).slice(-(MAX_GRAPH_POINTS - 1)), t];
                const newHum = [...(devData.hum || []).slice(-(MAX_GRAPH_POINTS - 1)), h];
                nextHistory[deviceId] = {
                  type: "env",
                  labels: newLabels,
                  timestamps: newTimestamps,
                  temp: newTemp,
                  hum: newHum
                };
                return;
              }

              nextHistory[deviceId] = { ...devData };
            });
            return nextHistory;
          });
        }
      } catch (e) {
        // quiet error
      }
    };

    // Immediate first fetch, then periodic refresh.
    pollLive();
    const interval = setInterval(pollLive, LIVE_POLL_MS);

    return () => clearInterval(interval);
  }, [viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Historical Data Handling ---

  const getHistoryTotalPoints = (fullHistory) => {
    let maxPoints = 0;
    Object.values(fullHistory || {}).forEach((history) => {
      const count = Array.isArray(history?.timestamps) ? history.timestamps.length : 0;
      if (count > maxPoints) maxPoints = count;
    });
    return maxPoints;
  };

  const applyHistoryPage = (fullHistory, page) => {
    const start = page * HISTORY_PAGE_SIZE;
    const end = start + HISTORY_PAGE_SIZE;
    const paged = {};

    Object.entries(fullHistory || {}).forEach(([deviceId, history]) => {
      if (!history) return;
      if (history.type === "press") {
        const nextPress = {};
        Object.entries(history.press || {}).forEach(([pid, series]) => {
          nextPress[pid] = (series || []).slice(start, end);
        });
        paged[deviceId] = {
          ...history,
          labels: (history.labels || []).slice(start, end),
          timestamps: (history.timestamps || []).slice(start, end),
          press: nextPress,
        };
      } else {
        paged[deviceId] = {
          ...history,
          labels: (history.labels || []).slice(start, end),
          timestamps: (history.timestamps || []).slice(start, end),
          temp: (history.temp || []).slice(start, end),
          hum: (history.hum || []).slice(start, end),
        };
      }
    });

    return paged;
  };

  const buildHistoryFromReadings = (sourceReadings, startTs, endTs, normalizedTargetId = "") => {
    const nextHistory = {};

    // Sort readings by time ascending first (if not already)
    const sortedReadings = (sourceReadings || [])
      .map((item) => ({ ...item, graphTsEpochMs: getTsEpochMs(item) }))
      .filter((item) => item.graphTsEpochMs !== undefined)
      .sort((a, b) => a.graphTsEpochMs - b.graphTsEpochMs);

    let processedCount = 0;
    let matchCount = 0;

    sortedReadings.forEach(item => {
      processedCount++;
      const reading = item;
      const ts = Number(reading.graphTsEpochMs);
      const envVals = getEnvValues(reading);

      // Debug first few items
      if (processedCount <= 3) {
        console.log("GraphScreen: Processing Item:", JSON.stringify(item));
        console.log("GraphScreen: Unwrapped Item:", JSON.stringify(reading));
        console.log(`GraphScreen: Item TS: ${ts}`);
      }

      // Filter by date range
      if (ts < startTs || ts > endTs) return;
      const readingDeviceId = String(reading.deviceId || "Unknown");
      if (normalizedTargetId && normalizeId(readingDeviceId) !== normalizedTargetId) return;

      matchCount++;
      const deviceId = readingDeviceId;
      const pressList = extractPressMetrics(reading);
      const hasEnv =
        Number.isFinite(Number(envVals.temperature)) ||
        Number.isFinite(Number(envVals.humidity));
      const hasPress =
        pressList.length > 0 &&
        pressList.some((p) => Number.isFinite(Number(p.amps)));
      const isPress = hasPress && !hasEnv;

      // Initialize if new
      if (!nextHistory[deviceId]) {
        nextHistory[deviceId] = isPress
          ? { type: "press", labels: [], timestamps: [], press: {} }
          : { type: "env", labels: [], timestamps: [], temp: [], hum: [] };
      }

      // Format label
      const timeLabel = formatTimeLabel(ts);

      const devData = nextHistory[deviceId];
      devData.labels = [...(devData.labels || []), timeLabel];
      devData.timestamps = [...(devData.timestamps || []), ts];

      if (isPress) {
        devData.type = "press";
        devData.press = devData.press || {};
        pressList.forEach((p) => {
          devData.press[p.id] = devData.press[p.id] || [];
          devData.press[p.id] = [...devData.press[p.id], normalizeMetric(p.amps)];
        });
      } else {
        if (!hasEnv) return;
        devData.type = "env";
        devData.temp = [...(devData.temp || []), normalizeMetric(envVals.temperature)];
        devData.hum = [...(devData.hum || []), normalizeMetric(envVals.humidity)];
      }
    });

    return { nextHistory, processedCount, matchCount };
  };

  const handleSearch = async () => {
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

    const targetDeviceId = String(historyDeviceId || "").trim();
    const normalizedTargetId = normalizeId(targetDeviceId);

    setIsLoading(true);
    setViewMode('history');
    setDeviceHistory({}); // Clear current live data
    setChartTooltips({});
    setHistoryNotice("");
    console.log("GraphScreen: Starting History Search...");

    try {
      // 1. Parse range
      console.log(`GraphScreen: Date Range: ${startDate} -> ${endDate}`);
      console.log(`GraphScreen: Device Filter: ${targetDeviceId || "ALL"}`);
      console.log(`GraphScreen: Date Range TS: ${startTs} - ${endTs}`);

      // 2. Fetch paged IoT readings for selected range
      const { IoTReadings, _meta: fetchMeta } = await fetchAllIoTReadings({
        deviceId: targetDeviceId || undefined,
        startTsEpochMs: startTs,
        endTsEpochMs: endTs,
      });
      let sourceReadings = dedupeReadings(
        (IoTReadings || []).filter((item) => item?._schemaValid)
      );
      console.log("GraphScreen: Fetched IoTReadings count:", sourceReadings.length);
      if (fetchMeta?.potentiallyIncomplete) {
        console.warn(
          `[GraphScreen] IoTReadings may be partial. stopReason=${fetchMeta.stopReason} pages=${fetchMeta.pagesFetched}`
        );
      }

      // 3. Filter and group
      let { nextHistory, processedCount, matchCount } = buildHistoryFromReadings(
        sourceReadings,
        startTs,
        endTs,
        normalizedTargetId
      );

      // Backend often behaves better with device-scoped history queries.
      // If all-device query finds no matches, retry by fetching each visible device separately.
      if (!targetDeviceId && matchCount === 0) {
        const fallbackDeviceIds = new Set();
        sourceReadings.forEach((row) => {
          const id = String(row?.deviceId || "").trim();
          if (id) fallbackDeviceIds.add(id);
        });
        try {
          const liveRows = await fetchRealTimeDataMonitor();
          (liveRows || []).forEach((row) => {
            const id = String(row?.deviceId || "").trim();
            if (id) fallbackDeviceIds.add(id);
          });
        } catch (liveErr) {
          console.warn("[GraphScreen] Could not fetch live device list for fallback:", liveErr?.message || liveErr);
        }

        if (fallbackDeviceIds.size > 0) {
          const ids = Array.from(fallbackDeviceIds);
          console.log(`[GraphScreen] Retrying history with device-scoped queries for ${ids.length} devices...`);
          const fallbackRows = [];

          for (const deviceId of ids) {
            try {
              const perDevice = await fetchAllIoTReadings({
                deviceId,
                startTsEpochMs: startTs,
                endTsEpochMs: endTs,
                maxPages: 120,
              });
              if (perDevice?._meta?.potentiallyIncomplete) {
                console.warn(
                  `[GraphScreen] Device ${deviceId} history may be partial. stopReason=${perDevice._meta.stopReason} pages=${perDevice._meta.pagesFetched}`
                );
              }
              fallbackRows.push(...(perDevice?.IoTReadings || []));
            } catch (perDeviceErr) {
              console.warn(`[GraphScreen] Device-scoped history failed for ${deviceId}:`, perDeviceErr?.message || perDeviceErr);
            }
          }

          sourceReadings = dedupeReadings([
            ...sourceReadings,
            ...(fallbackRows || []).filter((item) => item?._schemaValid),
          ]);
          const rebuilt = buildHistoryFromReadings(
            sourceReadings,
            startTs,
            endTs,
            normalizedTargetId
          );
          nextHistory = rebuilt.nextHistory;
          processedCount = rebuilt.processedCount;
          matchCount = rebuilt.matchCount;
          console.log(`[GraphScreen] Device-scoped retry matches: ${matchCount}`);
        }
      }

      console.log(`GraphScreen: Processed ${processedCount} items. Matches found: ${matchCount}`);

      console.log("GraphScreen: Resulting History Keys:", Object.keys(nextHistory));

      const totalPoints = getHistoryTotalPoints(nextHistory);
      const pageCount = totalPoints ? Math.ceil(totalPoints / HISTORY_PAGE_SIZE) : 0;
      setHistoryFull(nextHistory);
      setHistoryTotalPoints(totalPoints);
      setHistoryPageCount(pageCount);
      setHistoryPage(0);
      setDeviceHistory(applyHistoryPage(nextHistory, 0));

      if (matchCount === 0) {
        if (targetDeviceId) {
          setHistoryNotice(`No data found for ${targetDeviceId} in selected range.`);
        } else {
          setHistoryNotice("No data found for selected range.");
        }
      }

    } catch (e) {
      console.error("History fetch failed:", e);
      setViewMode('live'); // Revert on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetToLive = () => {
    setViewMode('live');
    setDeviceHistory({}); // Clear history to restart standard polling accumulation
    setChartTooltips({});
    setLiveNotice("");
    setOfflineDevices([]);
    setHistoryNotice("");
  };

  const handleModeLive = () => {
    handleResetToLive();
  };

  const handleModeHistory = () => {
    setViewMode('history');
    setDeviceHistory({});
    setChartTooltips({});
    setLiveNotice("");
    setOfflineDevices([]);
    setHistoryNotice("");
    setHistoryPage(0);
  };

  // Always default to live mode when Graph screen is focused from navigation.
  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      setViewMode('live');
      setDeviceHistory({});
      setChartTooltips({});
      setLiveNotice("");
      setOfflineDevices([]);
      setHistoryNotice("");
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (viewMode !== 'history') return;
    if (!historyPageCount) return;
    setDeviceHistory(applyHistoryPage(historyFull, historyPage));
  }, [viewMode, historyFull, historyPage, historyPageCount]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ModernTopHeader
        title="GRAPH"
        leftIcon={require("../../assets/images/MoreTop.png")}
        onLeftPress={() => navigation.navigate("Sidebar")}
      />

      {/* Main Content ScrollView */}
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* --- Date Filter Section --- */}
        <View style={styles.dateFilterSingle}>
          <Text
            style={[styles.label, { fontSize: ui.font(14, { min: 12, max: 15 }) }]}
            maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
          >
            Start Date
          </Text>
          <View style={styles.dateInputContainer}>
            <TextInput
              style={[styles.dateInput, { fontSize: ui.font(14, { min: 12, max: 15 }) }]}
              value={startDate}
              onChangeText={(text) => handleManualDate("start", text)}
              keyboardType="numeric"
              maxLength={10}
              maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
            />
            <TouchableOpacity onPress={() => showDatePickerFor("start")}>
              <Image
                source={require('../../assets/images/Calender.png')}
                style={styles.calendarIcon}
              />
            </TouchableOpacity>
          </View>

          <Text
            style={[styles.label, styles.dateSecondaryLabel, { fontSize: ui.font(14, { min: 12, max: 15 }) }]}
            maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
          >
            End Date
          </Text>
          <View style={styles.dateInputContainer}>
            <TextInput
              style={[styles.dateInput, { fontSize: ui.font(14, { min: 12, max: 15 }) }]}
              value={endDate}
              onChangeText={(text) => handleManualDate("end", text)}
              keyboardType="numeric"
              maxLength={10}
              maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
            />
            <TouchableOpacity onPress={() => showDatePickerFor("end")}>
              <Image
                source={require('../../assets/images/Calender.png')}
                style={styles.calendarIcon}
              />
            </TouchableOpacity>
          </View>

          <Text
            style={[styles.label, styles.dateSecondaryLabel, { fontSize: ui.font(14, { min: 12, max: 15 }) }]}
            maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
          >
            Device ID (Optional)
          </Text>
          <View style={styles.dateInputContainer}>
            <TextInput
              style={[styles.dateInput, { fontSize: ui.font(14, { min: 12, max: 15 }) }]}
              value={historyDeviceId}
              onChangeText={setHistoryDeviceId}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="All devices"
              placeholderTextColor={theme.colors.inputPlaceholder}
              maxLength={48}
              maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
            />
          </View>
        </View>

        {/* --- Mode Selector --- */}
        <View style={styles.modeToggleRow}>
          <TouchableOpacity
            style={[styles.modeBtn, ui.isVeryCompact && styles.modeBtnCompact, viewMode === 'live' && styles.modeBtnActive]}
            onPress={handleModeLive}
          >
            <Text
              style={[
                styles.modeBtnText,
                { fontSize: ui.font(14, { min: 12, max: 15 }) },
                viewMode === 'live' && styles.modeBtnTextActive
              ]}
              maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
            >
              Live
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, ui.isVeryCompact && styles.modeBtnCompact, viewMode === 'history' && styles.modeBtnActive]}
            onPress={handleModeHistory}
          >
            <Text
              style={[
                styles.modeBtnText,
                { fontSize: ui.font(14, { min: 12, max: 15 }) },
                viewMode === 'history' && styles.modeBtnTextActive
              ]}
              maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
            >
              History
            </Text>
          </TouchableOpacity>
        </View>

        {/* --- History Actions --- */}
        {viewMode === 'history' && (
        <View style={styles.actionButtonContainer}>
          <TouchableOpacity
            style={[
              styles.themedButton,
              styles.buttonPrimary,
              isLoading && styles.buttonDisabled
            ]}
            onPress={handleSearch}
            disabled={isLoading}
          >
            {isLoading ? (
              <Text style={styles.buttonTextTheme}>Loading...</Text>
            ) : (
              <>
                <Image
                  source={require('../../assets/images/Search_Icon.png')}
                  style={styles.searchIconTheme}
                />
                <Text style={styles.buttonTextTheme}>Search History</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        )}
        {viewMode === 'history' && historyPageCount > 1 && (
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

        {/* --- Graph Visualizations (Multi-Device) --- */}
        <View style={styles.centerBox}>
          {viewMode === 'live' && !!liveNotice && (
            <View style={[styles.noticeCard, styles.noticeCardCentered]}>
              <MaterialCommunityIcons name="information" size={16} color={theme.colors.brand} style={styles.cardIcon} />
              <Text style={[styles.noticeText, styles.noticeTextCentered]}>{liveNotice}</Text>
            </View>
          )}

          {viewMode === 'live' && offlineSummary && (
            <View style={[styles.noticeCard, styles.offlineCard]}>
              <MaterialCommunityIcons name="wifi-off" size={16} color={theme.colors.danger} style={styles.cardIcon} />
              <Text style={[styles.offlineText, styles.offlineTextCentered]} numberOfLines={2}>
                Offline: {offlineSummary}
              </Text>
            </View>
          )}

          {viewMode === 'history' && !!historyNotice && (
            <View style={[styles.noticeCard, styles.noticeCardCentered]}>
              <MaterialCommunityIcons name="calendar-remove" size={16} color={theme.colors.brand} style={styles.cardIcon} />
              <Text style={[styles.noticeText, styles.noticeTextCentered]}>{historyNotice}</Text>
            </View>
          )}
        </View>
        {!isLoading && Object.keys(deviceHistory).length === 0 && !liveNotice && (
          <Text style={styles.waitingText}>
            {viewMode === 'history'
              ? "No data for selected range."
              : "Waiting for live data..."}
          </Text>
        )}

        {Object.keys(deviceHistory).map((deviceId) => {
          const history = deviceHistory[deviceId];
          // Ensure we have at least one valid data point to avoid crash
          if (!(history?.labels?.length || history?.timestamps?.length)) return null;

          const timestamps = Array.isArray(history.timestamps) ? history.timestamps : [];
          const dayCount = new Set((timestamps || []).map(getDayKey)).size;
          const hasMultipleDays = viewMode === 'history' && dayCount > 1;
          const labels = timestamps.length
            ? timestamps.map((ts, idx) =>
                viewMode === 'history'
                  ? formatHistoryAxisLabel(ts, idx > 0 ? timestamps[idx - 1] : undefined, hasMultipleDays)
                  : formatTimeLabel(ts)
              )
            : (history.labels.length ? history.labels : ["0"]);
          const viewportWidth = Math.max(screenWidth - 24, 260);
          const chartWidth = Math.max(viewportWidth, labels.length * MIN_POINT_WIDTH);
          const canScroll = chartWidth > viewportWidth;
          const tooltip = chartTooltips[deviceId];

          let datasets = [];
          let legend = [];

          if (history.type === "press") {
            const pressIds = Object.keys(history.press || {}).sort((a, b) => Number(a) - Number(b));
            if (pressIds.length === 0) return null;
            datasets = pressIds.map((pid, idx) => ({
              data: history.press[pid] && history.press[pid].length ? history.press[pid] : [0],
              color: (opacity = 1) => getPressColor(pid, idx, opacity),
              strokeWidth: 2
            }));
            legend = pressIds.map((pid) => `Phase-${pid} Amps`);
          } else {
            const tData = history.temp.length ? history.temp : [0];
            const hData = history.hum.length ? history.hum : [0];
            datasets = [
              {
                data: tData,
                color: (opacity = 1) => `rgba(255, 165, 0, ${opacity})`, // Orange
                strokeWidth: 2
              },
              {
                data: hData,
                color: (opacity = 1) => `rgba(0, 0, 255, ${opacity})`, // Blue
                strokeWidth: 2
              }
            ];
            legend = ["Temp", "Humidity"];
          }

          return (
            <View key={deviceId} style={styles.chartContainer}>
              <Text
                style={[styles.chartTitle, { fontSize: ui.font(18, { min: 15, max: 19 }) }]}
                numberOfLines={1}
                ellipsizeMode="middle"
                maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
              >
                {deviceId} Trends
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator
                contentContainerStyle={styles.chartScroll}
                ref={(el) => {
                  if (el) scrollRefs.current[deviceId] = el;
                }}
                onScroll={(e) => {
                  const x = e?.nativeEvent?.contentOffset?.x || 0;
                  setScrollOffsets((prev) => {
                    if (prev[deviceId] === x) return prev;
                    return { ...prev, [deviceId]: x };
                  });
                }}
                scrollEventThrottle={16}
              >
                <View style={[styles.chartCanvas, { width: chartWidth }]}>
                  <LineChart
                    data={{
                      labels: labels,
                      datasets,
                      legend
                    }}
                    width={chartWidth}
                    height={220}
                    yAxisSuffix=""
                    yAxisInterval={1}
                    fromZero
                    segments={5}
                    chartConfig={{
                      backgroundColor: theme.colors.surfaceElevated,
                      backgroundGradientFrom: theme.colors.surfaceElevated,
                      backgroundGradientTo: theme.colors.surfaceElevated,
                      decimalPlaces: 1, // 1 decimal for precision
                      color: (opacity = 1) => hexWithAlpha(theme.colors.textPrimary, opacity),
                      labelColor: (opacity = 1) => hexWithAlpha(theme.colors.textPrimary, opacity),
                      style: {
                        borderRadius: 16
                      },
                      propsForDots: {
                        r: "5",
                        strokeWidth: "2",
                        stroke: theme.colors.accent
                      }
                    }}
                    onDataPointClick={(point) => {
                      const idx = Number(point?.index);
                      if (!Number.isFinite(idx)) return;
                      const value = Number(point?.value);
                      const valueText = Number.isFinite(value) ? value.toFixed(2) : String(point?.value ?? "--");
                      const ts = Number(timestamps[idx]);
                      const tsText = Number.isFinite(ts) ? formatFullDateTime(ts) : "--";
                      let seriesIdx = datasets.findIndex((ds) => ds === point?.dataset);
                      if (seriesIdx < 0) {
                        const hintedIdx = Number(point?.datasetIndex);
                        if (Number.isFinite(hintedIdx)) seriesIdx = hintedIdx;
                      }
                      const seriesName = legend[seriesIdx] || legend[0] || "Value";

                      setChartTooltips((prev) => {
                        const prevTip = prev[deviceId];
                        if (prevTip && prevTip.idx === idx && prevTip.seriesName === seriesName) {
                          const { [deviceId]: _hidden, ...rest } = prev;
                          return rest;
                        }
                        return {
                          ...prev,
                          [deviceId]: {
                            idx,
                            x: Number(point?.x) || 0,
                            y: Number(point?.y) || 0,
                            seriesName,
                            valueText,
                            tsText,
                          },
                        };
                      });
                    }}
                    // dot values intentionally hidden for clarity
                    bezier
                    style={styles.chartStyle}
                  />
                  {!!tooltip && (
                    <View
                      pointerEvents="none"
                      style={[
                        styles.chartTooltip,
                        {
                          left: clamp((tooltip.x || 0) - TOOLTIP_WIDTH / 2, 4, Math.max(4, chartWidth - TOOLTIP_WIDTH - 4)),
                          top: Math.max(6, (tooltip.y || 0) - 70),
                        },
                      ]}
                    >
                      <Text style={styles.chartTooltipTitle}>{tooltip.seriesName}: {tooltip.valueText}</Text>
                      <Text style={styles.chartTooltipTime}>{tooltip.tsText}</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
              <View style={styles.scrollControls}>
                <Pressable
                  style={styles.scrollBtn}
                  disabled={!canScroll}
                  onPress={() => {
                    const current = scrollOffsets[deviceId] || 0;
                    const step = viewportWidth * 0.6;
                    const next = Math.max(0, current - step);
                    scrollRefs.current[deviceId]?.scrollTo({ x: next, animated: true });
                    setScrollOffsets((prev) => ({ ...prev, [deviceId]: next }));
                  }}
                >
                  <Text style={styles.scrollBtnText}>◀</Text>
                </Pressable>
                <Pressable
                  style={styles.scrollBtn}
                  disabled={!canScroll}
                  onPress={() => {
                    const current = scrollOffsets[deviceId] || 0;
                    const step = viewportWidth * 0.6;
                    const maxOffset = Math.max(0, chartWidth - viewportWidth);
                    const next = Math.min(maxOffset, current + step);
                    scrollRefs.current[deviceId]?.scrollTo({ x: next, animated: true });
                    setScrollOffsets((prev) => ({ ...prev, [deviceId]: next }));
                  }}
                >
                  <Text style={styles.scrollBtnText}>▶</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Date Picker Modal (Hidden by default) */}
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirm}
        onCancel={hideDatePicker}
      />

      <ModernBottomNav navigation={navigation} activeRoute="Graph" />
    </SafeAreaView>
  );
}

/* ------------------------- STYLES ------------------------- */

function createStyles(theme) {
  const colors = theme.colors;
  return StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },

  /* Header Layout */
  headerImage: {
    width: '100%',
    height: 86,
    resizeMode: 'cover',
  },
  topHeader: {
    position: 'absolute',
    top: 22,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    zIndex: 10,
  },
  iconSmall1: {
    width: 28,
    height: 24,
    resizeMode: 'contain',
  },
  headerLeft: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 25,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },

  /* Scrollable Content */
  scrollContent: {
    paddingBottom: 112, // Space for bottom navigation
  },

  /* Date Filter Form */
  dateFilterSingle: {
    marginVertical: 12,
    paddingHorizontal: 14,
  },
  dateSecondaryLabel: {
    marginTop: 10,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 5,
    paddingHorizontal: 5,
    marginTop: 5,
    width: '100%',
    height: 40,
    backgroundColor: colors.inputBackground,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  dateInput: {
    flex: 1,
    fontSize: 14,
    color: colors.inputText,
    paddingVertical: 0,
  },
  calendarIcon: {
    width: 20,
    height: 20,
    marginLeft: 5,
  },



  /* Themed Buttons (New) */
  actionButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 10,
  },
  pagerRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  pagerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.buttonGhost,
  },
  pagerBtnDisabled: {
    opacity: 0.5,
  },
  pagerText: {
    color: colors.buttonGhostText,
    fontWeight: '600',
  },
  pagerLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    paddingHorizontal: 6,
  },
  modeToggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 10,
  },
  modeBtn: {
    minWidth: 0,
    flex: 1,
    maxWidth: 180,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.buttonGhost,
    marginHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnCompact: {
    marginHorizontal: 4,
    paddingHorizontal: 10,
  },
  modeBtnActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modeBtnTextActive: {
    color: colors.textInverse,
  },
  themedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25, // Rounded pill shape like Login
    shadowColor: colors.overlaySoft,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    minWidth: 140,
    marginHorizontal: 8,
  },
  buttonPrimary: {
    backgroundColor: colors.buttonPrimary,
  },
  buttonSecondary: {
    backgroundColor: colors.buttonSecondary,
  },
  centerBox: {
    alignItems: 'center',
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
  },
  chipLive: {
    backgroundColor: colors.brand,
  },
  chipMuted: {
    backgroundColor: colors.textMuted,
  },
  chipIcon: {
    marginRight: 4,
  },
  chipText: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  noticeText: {
    color: colors.brand,
    fontSize: 13,
    flex: 1,
    textAlign: 'left',
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brandSoft,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 6,
    marginHorizontal: 12,
    alignSelf: 'stretch',
    minHeight: 42,
  },
  noticeCardCentered: {
    justifyContent: 'center',
  },
  noticeTextCentered: {
    textAlign: 'center',
  },
  offlineCard: {
    backgroundColor: colors.accentSoft,
  },
  cardIcon: {
    marginRight: 6,
  },
  offlineWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 12,
    alignSelf: 'stretch',
  },
  offlineCentered: {
    justifyContent: 'center',
  },
  offlineIcon: {
    marginRight: 6,
  },
  offlineText: {
    color: colors.danger,
    fontSize: 12,
    flex: 1,
  },
  offlineTextCentered: {
    textAlign: 'center',
  },
  modeText: {
    fontSize: 16,
    color: colors.brand,
    fontWeight: '600',
  },
  waitingText: {
    textAlign: 'center',
    marginTop: 20,
    color: colors.textMuted,
  },
  buttonDisabled: {
    opacity: 0.7,
    backgroundColor: colors.textMuted,
  },
  buttonTextTheme: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  searchIconTheme: {
    width: 20,
    height: 20,
    tintColor: colors.textInverse,
    marginRight: 8,
    resizeMode: 'contain',
  },

  searchIcon: {
    width: 18,
    height: 18,
    tintColor: colors.textInverse,
    marginRight: 8,
  },
  buttonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: 'bold',
  },

  /* Data Table */
  tableScroll: {
    marginHorizontal: 10,
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.tableRow,
  },
  headerRow: {
    backgroundColor: colors.surfaceAlt,
  },
  headerCell: {
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  cellText: {
    color: colors.textPrimary,
    textAlign: 'center',
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    fontSize: 12,
  },
  // Column Widths
  cellSrNo: { width: 50 },
  cellDevice: { width: 80 },
  cellMessage: { width: 140 }, // wider for message
  cellDate: { width: 120 },
  cellStatus: { width: 80, borderRightWidth: 0 },

  /* Bottom Navigation Stack */
  bottomNavBg: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 86,
    justifyContent: 'center',
  },
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '100%',
    paddingBottom: 10,
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navIcon: { width: 28, height: 30, resizeMode: 'contain', marginBottom: 4 },
  navIcon1: { width: 35, height: 30, resizeMode: 'contain', marginBottom: 4 },
  navIcon2: { width: 25, height: 30, resizeMode: 'contain', marginBottom: 4 },
  navText: { fontWeight: 'bold', fontSize: 12, color: colors.textPrimary, textAlign: 'center' },

  /* Chart Styles */
  chartContainer: {
    alignItems: 'stretch',
    marginVertical: 10,
    marginHorizontal: 10,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartStyle: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartCanvas: {
    position: 'relative',
  },
  chartTooltip: {
    position: 'absolute',
    width: TOOLTIP_WIDTH,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  chartTooltipTitle: {
    color: colors.textInverse,
    fontSize: 11,
    fontWeight: '700',
  },
  chartTooltipTime: {
    color: hexWithAlpha(colors.textInverse, 0.82),
    fontSize: 10,
    marginTop: 2,
  },
  chartScroll: { paddingRight: 12 },
  scrollControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    marginTop: 4,
    marginBottom: 6,
    paddingRight: 6,
  },
  scrollBtn: {
    backgroundColor: colors.buttonGhost,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  scrollBtnText: { fontSize: 14, fontWeight: '800', color: colors.buttonGhostText },
  dotValue: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  });
}
