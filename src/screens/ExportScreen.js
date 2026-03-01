/*
 * ExportScreen.js
 *
 * This screen allows users to select a date range and export/download device data.
 * The data is converted to CSV and shared via the native share sheet.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  ImageBackground,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  PermissionsAndroid
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { fetchAllIoTReadings } from '../api/dataService';
import { useNavigation } from "@react-navigation/native";

// --- Helpers reused from other screens ---

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    if (["1", "true", "yes", "y", "on", "alarm", "active"].includes(lowered)) return true;
    if (["0", "false", "no", "n", "off", "ok", "normal", "inactive", "none"].includes(lowered)) {
      return false;
    }
  }
  return undefined;
};

const toNumberOrUndefined = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const toDisplayValue = (value) => {
  const n = toNumberOrUndefined(value);
  if (n !== undefined) return n;
  if (value == null) return "";
  return String(value);
};

const extractMetrics = (item) => {
  if (Array.isArray(item?.parameters) && item.parameters.length > 0) {
    return item.parameters
      .filter((p) => p && typeof p === "object")
      .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0))
      .map((p, idx) => ({
        key: String(p?.key ?? `param_${idx + 1}`),
        label: p?.unit ? `${String(p?.label ?? p?.key ?? `Param ${idx + 1}`)} (${String(p.unit)})` : String(p?.label ?? p?.key ?? `Param ${idx + 1}`),
        value: toDisplayValue(p?.value),
      }));
  }

  const fallback = [];
  const temperature = pickNumberAlias(item, ["temperature_c", "temperature deg", "temperature", "temp"]);
  const humidity = pickNumberAlias(item, ["humidity_pct", "humidity %", "humidity", "hum"]);
  if (temperature !== undefined) fallback.push({ key: "temperature", label: "Temperature", value: temperature });
  if (humidity !== undefined) fallback.push({ key: "humidity", label: "Humidity", value: humidity });

  Object.entries(item || {}).forEach(([key, val]) => {
    const ampMatch = key.match(/^Press\s*(\d+)\s*Amps$/i);
    if (!ampMatch) return;
    const id = ampMatch[1];
    fallback.push({
      key: `press_${id}_amps`,
      label: `Phase-${id} Amps`,
      value: toDisplayValue(val),
    });
  });

  return fallback;
};

const getOverallAlarm01 = (item) => {
  const value =
    item?.status?.overallAlarm ??
    item?.status?.overall_alarm ??
    item?.status?.commonAlarm ??
    item?.overallAlarm ??
    item?.commonAlarm ??
    item?.commonIssue ??
    item?.["Common Alarm"] ??
    item?.["Common Issue"] ??
    item?.["Common Issues"];
  const parsed = parseBoolean(value);
  if (typeof parsed === "boolean") return parsed ? 1 : 0;
  const n = toNumberOrUndefined(value);
  return n !== undefined ? (n !== 0 ? 1 : 0) : "";
};

const getWifiStrength = (item) =>
  pickNumberAlias(item, [
    "wifi_strength",
    "wifiStrength",
    "wifiSignal",
    "wifi",
    "status.wifiStrength",
  ]) ??
  toNumberOrUndefined(item?.status?.wifiStrength) ??
  toNumberOrUndefined(item?.status?.wifi?.level) ??
  "";

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

const getTsEpochMs = (item) => {
  const ts = toNumberOrUndefined(item?.tsEpochMs ?? item?.ts_epoch_ms);
  return ts !== undefined ? Math.round(ts) : undefined;
};

export default function ExportScreen({ navigation: navigationProp, route }) {
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
    navigation?.reset?.({
      index: 0,
      routes: [{ name: "Home" }],
    });
  };
  // State for Date Selection
  const formatDate = (date) =>
    `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;

  const parseDateToTs = (dateStr, isEndOfDay = false) => {
    if (!dateStr) return 0;
    const [day, month, year] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (isEndOfDay) date.setHours(23, 59, 59, 999);
    else date.setHours(0, 0, 0, 0);
    return date.getTime();
  };

  const getToday = () => {
    return formatDate(new Date());
  };

  const getSevenDaysAgo = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return formatDate(d);
  };

  const [startDate, setStartDate] = useState(getSevenDaysAgo());
  const [endDate, setEndDate] = useState(getToday());

  const [isLoading, setIsLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [currentField, setCurrentField] = useState(null);

const [previewRows, setPreviewRows] = useState([]);
const [previewMetricKeys, setPreviewMetricKeys] = useState([]);
const [previewMetricLabels, setPreviewMetricLabels] = useState({});

  const deviceIdFilter = route?.params?.deviceId;
  const deviceName = route?.params?.deviceName;

  // Prefill dates if provided from Graph page
  React.useEffect(() => {
    if (route?.params?.startDate) setStartDate(route.params.startDate);
    if (route?.params?.endDate) setEndDate(route.params.endDate);
  }, [route?.params?.startDate, route?.params?.endDate]);

  const handleExport = async (target = "download") => {
    if (!startDate || !endDate) {
      Alert.alert("Missing Dates", "Please select both Start and End dates.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Resolve filter window
      const startTs = parseDateToTs(startDate, false);
      const endTs = parseDateToTs(endDate, true);
      if (!Number.isFinite(startTs) || !Number.isFinite(endTs) || startTs > endTs) {
        Alert.alert("Invalid Range", "Please select a valid start and end date range.");
        return;
      }

      // 2. Fetch all IoTReadings pages (if backend exposes pagination)
      const { IoTReadings, _meta: fetchMeta } = await fetchAllIoTReadings({
        deviceId: deviceIdFilter ? String(deviceIdFilter) : undefined,
        startTsEpochMs: startTs,
        endTsEpochMs: endTs,
      });
      if (fetchMeta?.potentiallyIncomplete) {
        const warningText = fetchMeta?.likelySinglePageCap
          ? "API returned a large single page without pagination token. This usually means DynamoDB scan cap (about 1 MB). CSV is likely partial."
          : "Could not confirm full table pagination from API. CSV may be partial. Try a smaller date range or enable backend pagination token support.";
        console.warn(
          `[ExportScreen] IoTReadings may be partial. stopReason=${fetchMeta.stopReason} pages=${fetchMeta.pagesFetched}`
        );
        Alert.alert(
          "Export Warning",
          warningText
        );
      }

      // 3. Filter Data defensively on client as final gate
      const filtered = (IoTReadings || [])
        .filter((item) => item?._schemaValid)
        .map((item) => {
          const tsEpochMs = getTsEpochMs(item);
          return { ...item, exportTsEpochMs: tsEpochMs };
        })
        .filter((item) => item.exportTsEpochMs !== undefined)
        .filter(item => {
          const ts = Number(item.exportTsEpochMs);
          const id = String(item.deviceId || "Unknown");
          if (deviceIdFilter && id !== String(deviceIdFilter)) return false;
          return ts >= startTs && ts <= endTs;
        })
        .sort((a, b) => b.exportTsEpochMs - a.exportTsEpochMs);

      if (filtered.length === 0) {
        Alert.alert("No Data", "No readings found for the selected date range.");
        return;
      }

      // Save for on-screen preview (like an in-app sheet)
      const previewSlice = filtered.slice(0, 50); // keep latest 50 rows for view

      // Collect metric columns using BIOT parameters-first mapping
      const metricLabelsByKey = {};
      const metricKeysOrdered = [];
      filtered.forEach((row) => {
        extractMetrics(row).forEach((metric) => {
          if (!metricLabelsByKey[metric.key]) {
            metricLabelsByKey[metric.key] = metric.label;
            metricKeysOrdered.push(metric.key);
          }
        });
      });
      setPreviewMetricKeys(metricKeysOrdered);
      setPreviewMetricLabels(metricLabelsByKey);

      // Normalize rows for table preview
      const normalizedPreview = previewSlice.map((row) => {
        const metricMap = {};
        extractMetrics(row).forEach((metric) => {
          metricMap[metric.key] = metric.value;
        });
        return {
          ...row,
          metricMap,
        };
      });
      setPreviewRows(normalizedPreview);

      // 4. Convert to CSV
      const csvHeaderParts = ["DeviceID", "SiteID", "DeviceType", "DeviceName"];
      csvHeaderParts.push(...metricKeysOrdered.map((key) => metricLabelsByKey[key] || key));
      csvHeaderParts.push("OverallAlarm", "WifiStrength", "Timestamp", "Date Time");
      const header = csvHeaderParts.join(",") + "\n";
      const rows = filtered.map(item => {
        const metricMap = {};
        extractMetrics(item).forEach((metric) => {
          metricMap[metric.key] = metric.value;
        });

        const overallAlarm = getOverallAlarm01(item);
        const wifiStrength = getWifiStrength(item);

        const tsEpochMs = Number(item.exportTsEpochMs);
        const dateObj = new Date(tsEpochMs);
        const dateStr = dateObj.toLocaleString(); // Local readable format

        const metricValues = metricKeysOrdered.map((key) => metricMap[key] ?? "");
        const rowValues = [
          item.deviceId || "Unknown",
          item.siteId || "",
          item.deviceType || "",
          item.deviceName || "",
          ...metricValues,
          overallAlarm,
          wifiStrength,
          tsEpochMs,
          `"${dateStr}"`,
        ];
        return rowValues.join(",");
      }).join("\n");

      const csvContent = header + rows;

      // 5. Write to cache once, then branch for download/share
      const fileName = `datalogger_export_${Date.now()}.csv`;
      const cachePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
      await RNFS.writeFile(cachePath, csvContent, 'utf8');

      if (target === "share") {
        await Share.open({
          title: "Save or open CSV",
          url: `file://${cachePath}`,
          type: "text/csv",
          failOnCancel: false,
          saveToFiles: true,
          showAppsToView: true,
        });
      } else {
        if (Platform.OS === 'android') {
          try {
            const downloadPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;

            // Check/Request Permission only on < Android 13
            if (Platform.Version < 33) {
              const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
              );
              if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                throw new Error("Storage permission denied");
              }
            }

            // Attempt copy (might fail on Android 11+ without MediaStore)
            await RNFS.copyFile(cachePath, downloadPath);
            Alert.alert(
              "Success",
              `File saved to Downloads folder:\n${fileName}`,
              [{ text: "OK" }]
            );

          } catch (err) {
            console.log("Direct download failed, falling back to Share:", err);
            const shareOptions = {
              title: "Save or open CSV",
              url: `file://${cachePath}`,
              type: 'text/csv',
              failOnCancel: false,
              saveToFiles: true,
              showAppsToView: true,
            };
            await Share.open(shareOptions);
          }

        } else {
          // --- iOS / fallback: Share Sheet (Save to Files) ---
          const shareOptions = {
            title: "Save or open CSV",
            url: `file://${cachePath}`,
            type: 'text/csv',
            failOnCancel: false,
            saveToFiles: true,
            showAppsToView: true,
          };
          await Share.open(shareOptions);
        }
      }

    } catch (e) {
      console.error(e);
      Alert.alert("Export Failed", "An error occurred while exporting data.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Opens the date picker
   */
  const showDatePicker = (field) => {
    setCurrentField(field);
    setShowPicker(true);
  };

  /**
   * Handles date selection
   */
  const onDateChange = (event, selectedDate) => {
    setShowPicker(false);
    if (selectedDate) {
      const formatted = formatDate(selectedDate);
      if (currentField === "startDate" || currentField === "start") setStartDate(formatted);
      else if (currentField === "endDate" || currentField === "end") setEndDate(formatted);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section */}
      <Image source={require("../../assets/images/WaveTop.png")} style={styles.headerImage} />
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Image
            source={require("../../assets/images/BackIcon.png")}
            style={styles.icon}
          />
        </TouchableOpacity>
        <Text style={styles.headerText} numberOfLines={1} adjustsFontSizeToFit>
          {deviceName ? `${deviceName} Export` : "Export"}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.content}>
        {/* Date Filter Row */}
        <View style={styles.filterRow}>
          {/* Start Date Field */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Start Date</Text>
            <View style={styles.inputWithIcon}>
              <TextInput
                style={styles.input}
                placeholder="DD-MM-YYYY"
                value={startDate}
                onChangeText={setStartDate}
              />
              <TouchableOpacity onPress={() => showDatePicker("startDate")}>
                <Image
                  source={require("../../assets/images/Calender.png")}
                  style={styles.calendarIcon}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* End Date Field */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>End Date</Text>
            <View style={styles.inputWithIcon}>
              <TextInput
                style={styles.input}
                placeholder="DD-MM-YYYY"
                value={endDate}
                onChangeText={setEndDate}
              />
              <TouchableOpacity onPress={() => showDatePicker("endDate")}>
                <Image
                  source={require("../../assets/images/Calender.png")}
                  style={styles.calendarIcon}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Export Data Button */}
        <TouchableOpacity
          style={[styles.downloadBtnAlt, isLoading && { opacity: 0.6 }]}
          onPress={() => handleExport("share")}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.downloadText}>Export Data</Text>
          )}
        </TouchableOpacity>

        {previewRows.length > 0 && (
          <View style={styles.tableWrapper}>
            <Text style={styles.previewTitle}>
              Preview (latest {previewRows.length} rows {deviceIdFilter ? `for ${deviceIdFilter}` : ""})
            </Text>
            <ScrollView horizontal>
              <View>
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={[styles.cell, styles.cellNarrow]}>#</Text>
                  <Text style={[styles.cell, styles.cellWide]}>Device</Text>
                  {previewMetricKeys.map((metricKey) => (
                    <Text key={`h-${metricKey}`} style={[styles.cell, styles.cellNarrow]}>
                      {previewMetricLabels[metricKey] || metricKey}
                    </Text>
                  ))}
                  <Text style={[styles.cell, styles.cellWide]}>Timestamp</Text>
                </View>
                {previewRows.map((row, idx) => (
                  <View key={`${row.deviceId}_${row.exportTsEpochMs}_${idx}`} style={styles.tableRow}>
                    <Text style={[styles.cell, styles.cellNarrow]}>{idx + 1}</Text>
                    <Text style={[styles.cell, styles.cellWide]} numberOfLines={1}>{row.deviceId}</Text>
                    {previewMetricKeys.map((metricKey) => (
                      <Text key={`r-${idx}-${metricKey}`} style={[styles.cell, styles.cellNarrow]}>
                        {row.metricMap?.[metricKey] ?? "-"}
                      </Text>
                    ))}
                    <Text style={[styles.cell, styles.cellWide]}>
                      {row.exportTsEpochMs ? new Date(Number(row.exportTsEpochMs)).toLocaleString() : "-"}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
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
    width: 30,
    height: 26,
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
    padding: 10
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
    paddingHorizontal: 12,
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
    fontWeight: "600",
    textAlign: "center"
  },
  input: {
    borderWidth: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
    width: 100,
    fontSize: 12
  },
  downloadBtn: {
    backgroundColor: "green",
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 20,
    marginTop: 30,
  },
  downloadText: {
    color: "black",
    fontWeight: "bold",
    fontSize: 14
  },
  downloadBtnAlt: {
    backgroundColor: "#f6b85c", // theme yellow
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 20,
    marginTop: 10,
    alignItems: "center",
  },

  /* Preview Table */
  tableWrapper: {
    width: "100%",
    marginTop: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
  },
  previewTitle: {
    fontWeight: "700",
    fontSize: 14,
    color: "#111",
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#eee",
    paddingVertical: 6,
  },
  tableHeader: {
    backgroundColor: "#f7f7f7",
  },
  cell: {
    paddingHorizontal: 8,
    fontSize: 12,
    color: "#000",
  },
  cellNarrow: { width: 70 },
  cellWide: { width: 140 },
  footer: {
    height: 80,
    width: "100%"
  },
});
