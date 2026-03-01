import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  RefreshControl,
  Share,
  Alert,
  ImageBackground,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { fetchFastDeviceStatus } from "../api/dataService";
import { classifyDeviceHealth, buildHealthSummary } from "../utils/deviceHealth";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { navigateToTabRoute } from "../navigation/navHelpers";

/* ------------------------- CONFIG / THRESHOLDS ------------------------- */

// Auto refresh interval (ms). Set to 0 to disable.
const AUTO_REFRESH_MS = 1000;
const STATUS_FETCH_TIMEOUT_MS = 5000;

const FILTER_LABELS = {
  all: "All Devices",
  good: "Good Devices",
  issue: "Issue Devices",
};

/* ------------------------- HELPER FUNCTIONS ------------------------- */

/**
 * Formats temperature value.
 * If invalid, returns "--".
 */
function formatTemp(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return "--";
  return n.toFixed(1); // no units
}

/**
 * Formats humidity value.
 * If invalid, returns "--".
 */
function formatHum(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return "--";
  return n.toFixed(1); // no units
}

/**
 * Checks if a value is within a specified range [min, max].
 */
// Range helpers removed from Home (no alarm checks here)

/* ------------------------- ENV VALUE HELPERS ------------------------- */
function pickNumberAlias(obj, aliases = []) {
  if (!obj || typeof obj !== "object") return { value: undefined, label: undefined };
  const entries = Object.entries(obj);
  for (const alias of aliases) {
    const target = String(alias).toLowerCase();
    const found = entries.find(([k]) => String(k).toLowerCase() === target);
    if (found) {
      const n = Number(found[1]);
      if (Number.isFinite(n)) {
        return { value: n, label: alias };
      }
    }
  }
  return { value: undefined, label: undefined };
}

function getEnvValues(item) {
  const tempLookup = pickNumberAlias(item, [
    "temperature_c",
    "temperature Deg",
    "temperature deg",
    "temperature",
    "temp",
  ]);
  const humLookup = pickNumberAlias(item, [
    "humidity_pct",
    "humidity %",
    "Humidity %",
    "humidity",
    "hum",
  ]);
  return {
    temperature: tempLookup.value,
    humidity: humLookup.value,
    tempLabel: tempLookup.label || "Temperature",
    humLabel: humLookup.label || "Humidity",
  };
}

/* ------------------------- DEVICE METRIC HELPERS ------------------------- */

// Extract press metrics like "Press 1 Amps" / "Press 1 Alarm"
function extractPressMetrics(item) {
  const presses = {};
  Object.entries(item || {}).forEach(([key, val]) => {
    const ampMatch = key.match(/^Press\s*(\d+)\s*Amps$/i);
    if (ampMatch) {
      const id = ampMatch[1];
      presses[id] = presses[id] || {};
      presses[id].amps = val;
    }
  });

  const list = Object.keys(presses)
    .sort((a, b) => Number(a) - Number(b))
    .map((id) => ({
      id,
      amps: presses[id]?.amps,
    }));

  return { list };
}

function formatPressAmps(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return "--";
  return n.toFixed(1); // one decimal place
}

function formatGenericMetricValue(value) {
  const n = Number(value);
  if (Number.isFinite(n)) {
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }
  if (value == null) return "--";
  return String(value);
}

function extractGenericMetrics(item) {
  if (!Array.isArray(item?.parameters)) return [];

  return item.parameters
    .filter((p) => p && typeof p === "object" && p.showOnCard !== false)
    .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0))
    .map((p, idx) => {
      const rendered = formatGenericMetricValue(p?.value);
      const unit = p?.unit ? ` ${p.unit}` : "";
      return {
        key: `param-${String(p?.key ?? idx)}`,
        label: String(p?.label ?? p?.key ?? `Parameter ${idx + 1}`),
        value: `${rendered}${unit}`,
        alarmActive: Boolean(p?.alarm?.active),
      };
    });
}

// Build a metrics array used by the UI. Supports "press" devices and env (temp/hum) devices.
function buildMetrics(item, envValues) {
  const genericMetrics = extractGenericMetrics(item);
  if (genericMetrics.length > 0) {
    return {
      type: "generic",
      metrics: genericMetrics,
    };
  }

  const { list: presses } = extractPressMetrics(item);
  if (presses.length > 0) {
    return {
      type: "press",
      metrics: presses.map((p) => ({
        key: `press-${p.id}`,
        label: `Phase-${p.id} Amps`,
        value: formatPressAmps(p.amps),
      })),
    };
  }

  // Fallback: Temperature / Humidity device
  const tempVal = envValues?.temperature ?? item.temperature;
  const humVal = envValues?.humidity ?? item.humidity;

  return {
    type: "env",
    metrics: [
      {
        key: "temperature",
        label: envValues?.tempLabel ?? "Temperature",
        value: formatTemp(tempVal),
      },
      {
        key: "humidity",
        label: envValues?.humLabel ?? "Humidity",
        value: formatHum(humVal),
      },
    ],
    env: { temperature: tempVal, humidity: humVal },
  };
}

// Determine status color/label for Home cards (no alarm styling)
function computeStatusInfo(item) {
  const { category, online, commonIssue } = classifyDeviceHealth(item);
  if (!online) {
    return { color: "#95A5A6", label: "Offline", online };
  }
  if (commonIssue || category === "issue") {
    return { color: "#e74c3c", label: "Alarm", online, category };
  }
  return { color: "#2ECC71", label: "Online", online, category };
}

// Map wifi strength (1-4) to icon + label for the card
function getWifiInfo(item, { online = true } = {}) {
  if (!online) {
    return { label: "Offline", icon: "wifi-off", color: "#7f8c8d" };
  }

  const strength = Number(
    item?.status?.wifiStrength ??
      item?.status?.wifi?.level ??
    item?.wifi_strength ?? item?.wifiStrength ?? item?.wifiSignal ?? item?.wifi
  );

  const map = {
    1: { label: "Very poor (1/4)", icon: "wifi-strength-1", color: "#d32f2f" }, // red
    2: { label: "Weak (2/4)", icon: "wifi-strength-2", color: "#f4511e" }, // deep orange
    3: { label: "Good (3/4)", icon: "wifi-strength-3", color: "#42a5f5" }, // blue for contrast
    4: { label: "Excellent (4/4)", icon: "wifi-strength-4", color: "#2e7d32" }, // green
  };

  if (!Number.isFinite(strength)) {
    return { label: "Unknown", icon: "wifi-strength-off-outline", color: "#7f8c8d" };
  }

  return map[strength] || { label: `Level ${strength}`, icon: "wifi-strength-1", color: "#2980b9" };
}

/* ------------------------- MAIN COMPONENT ------------------------- */

export default function HomeScreen(props) {
  const navFromHook = useNavigation();
  const navigation = props?.navigation ?? navFromHook;
  const navigateToTab = (route) => navigateToTabRoute(navigation, route);
  const refreshLabel = AUTO_REFRESH_MS > 0 ? `${Math.round(AUTO_REFRESH_MS / 1000)}s auto-refresh` : "Manual refresh";

  // --- State Variables ---
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rawItems, setRawItems] = useState([]); // Raw data from API
  const [error, setError] = useState("");
  const timerRef = useRef(null);
  const inFlightRef = useRef(false);
  const [filterKey, setFilterKey] = useState("all");
  const [filterLabel, setFilterLabel] = useState(FILTER_LABELS.all);

  /**
   * Process raw items for display.
   * memoized to avoid re-calculation on every render.
   */
  const items = useMemo(() => {
    const normalized = (rawItems || []).map((item) => ({
      ...item,
      deviceId: String(item?.deviceId ?? "Unknown"),
      ts: Number(item?.ts),
    }));

    // Sorting logic:
    // If timestamps exist, sort by newest first.
    const hasTs = normalized.some((x) => Number.isFinite(x.ts));
    if (hasTs) return normalized.sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));

    // Fallback: sort alphabetically by deviceId
    return normalized.sort((a, b) => String(a.deviceId).localeCompare(String(b.deviceId)));
  }, [rawItems]);

  const summary = useMemo(() => buildHealthSummary(items), [items]);

  const filteredItems = useMemo(() => {
    if (filterKey === "good") {
      return items.filter((it) => classifyDeviceHealth(it).category === "good");
    }
    if (filterKey === "issue") {
      return items.filter((it) => classifyDeviceHealth(it).category === "issue");
    }
    return items;
  }, [items, filterKey]);

  /**
   * Fetches data from the API.
   * Handles 'initial' load (screen spinner) and 'refresh' (pull-to-refresh).
   */
  const loadData = useCallback(async (mode) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      if (mode === "initial") setLoading(true);
      else if (mode === "refresh") setRefreshing(true);

      if (mode === "initial") setError("");
      // API Call to fetch real-time monitor data
      const data = await fetchFastDeviceStatus({ timeoutMs: STATUS_FETCH_TIMEOUT_MS });
      setRawItems(Array.isArray(data) ? data : []);
      setError("");
    } catch (e) {
      const message = e?.message || "Failed to load realtime data";
      if (mode === "initial") {
        setError(message);
        setRawItems([]);
      } else {
        console.warn(`[HomeScreen] ${mode} refresh failed: ${message}`);
      }
    } finally {
      inFlightRef.current = false;
      if (mode === "initial") setLoading(false);
      if (mode === "refresh") setRefreshing(false);
    }
  }, []);

  // --- Effects ---

  // Initial load and auto-refresh interval setup
  useEffect(() => {
    loadData("initial");

    if (AUTO_REFRESH_MS > 0) {
      timerRef.current = setInterval(() => loadData("auto"), AUTO_REFRESH_MS);
    }

    // Cleanup interval on unmount
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loadData]);

  // Apply filter passed from Dashboard (good/issue/all)
  useEffect(() => {
    const incomingFilter = props?.route?.params?.filter;
    const incomingTitle = props?.route?.params?.title;
    if (incomingFilter) {
      setFilterKey(incomingFilter);
      setFilterLabel(incomingTitle || FILTER_LABELS[incomingFilter] || FILTER_LABELS.all);
    }
  }, [props?.route?.params?.filter, props?.route?.params?.title]);

  // --- Callbacks ---

  const onRefresh = useCallback(() => loadData("refresh"), [loadData]);

  const onChangeFilter = useCallback(
    (key) => {
      setFilterKey(key);
      setFilterLabel(FILTER_LABELS[key] || FILTER_LABELS.all);
    },
    []
  );

  // Navigate to Graph screen with device data
  const onPressGraph = useCallback(
    (item) => {
      navigation.navigate("GraphShow", {
        deviceId: item.deviceId,
        deviceName: item.deviceName,
        temperature: item.temperature,
        humidity: item.humidity,
        ts: item.ts,
        raw: item.raw,
      });
    },
    [navigation]
  );

  // Navigate to Export screen with device data
  const onPressExport = useCallback(
    (item) => {
      navigation.navigate("Export", {
        deviceId: item.deviceId,
        deviceName: item.deviceName,
        temperature: item.temperature,
        humidity: item.humidity,
        ts: item.ts,
        raw: item.raw,
      });
    },
    [navigation]
  );

  // Share device data via OS share sheet
  const onPressShare = useCallback(async (item) => {
    try {
      const source = item;
      const env = getEnvValues(source);
      const genericMetrics = extractGenericMetrics(source);
      const { list: extractedPresses = [] } = extractPressMetrics(source);
      let pressList = extractedPresses;
      if (!Array.isArray(pressList)) pressList = [];
      // Remove duplicates by press id and prefer numeric
      const dedup = {};
      pressList.forEach((p) => { if (p && p.id != null) dedup[p.id] = p; });
      pressList = Object.values(dedup);
      const hasEnv = env.temperature !== undefined || env.humidity !== undefined;
      const hasPress = pressList.length > 0;
      const hasGeneric = genericMetrics.length > 0;
      const ts = Number(source?.ts ?? item?.ts);
      const status = classifyDeviceHealth(source);

      const lines = [];
      lines.push(`Device: ${source?.deviceId ?? "Unknown"}`);
      if (source?.deviceName) lines.push(`Name: ${source.deviceName}`);
      if (hasGeneric) {
        genericMetrics.forEach((m) => {
          lines.push(`${m.label}: ${m.value}`);
        });
      } else {
        if (env.temperature !== undefined) lines.push(`Temperature: ${formatTemp(env.temperature)}`);
        if (env.humidity !== undefined) lines.push(`Humidity: ${formatHum(env.humidity)}`);
        if (pressList.length) {
          pressList.forEach((p) => {
            lines.push(`Phase-${p.id} Amps: ${formatPressAmps(p.amps)}`);
          });
        }
      }
      if (!hasEnv && !hasPress && !hasGeneric) {
        lines.push("No live metrics available in this reading.");
      }
      lines.push(`Status: ${status.commonIssue ? "Alarm" : status.online ? "Online" : "Offline"}`);
      if (Number.isFinite(ts)) lines.push(`Timestamp: ${new Date(ts).toISOString()}`);

      const msg = lines.join("\n");
      await Share.share({ message: msg });
    } catch (e) {
      Alert.alert("Share failed", e?.message || "Unable to share");
    }
  }, []);

  /**
   * Renders a single "Cabin Card" (data item).
   */
  const renderCabinCard = ({ item }) => {
    const envValues = getEnvValues(item);
    const metricsInfo = buildMetrics(item, envValues);
    const { color: dotColor, label: statusLabel, online } = computeStatusInfo(item);
    const wifi = getWifiInfo(item, { online });

    return (
      <View style={styles.cabinBox}>
        {/* Card Header: Cabin Name and ID */}
        <View style={styles.cabinHeader}>
          <View style={styles.cabinHeaderLeft}>
            <Text style={styles.cabinName}>{String(item.deviceName ?? "Device")}</Text>
            <Text style={styles.cabinID}>
              ID: {String(item.deviceId ?? "-")}
            </Text>
          </View>

          <View style={styles.statusWrap}>
            <MaterialCommunityIcons
              name={wifi.icon}
              size={20}
              color={wifi.color}
              style={styles.wifiHeaderIcon}
            />
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        </View>

        {/* Metrics (dynamic: either press metrics or temp/humidity) */}
        {metricsInfo.metrics.map((m) => (
          <View style={styles.row} key={m.key}>
            <Text style={styles.label}>{m.label}</Text>
            <View style={styles.valueWithBadge}>
              <Text style={styles.valueText}>{m.value}</Text>
            </View>
          </View>
        ))}

        {/* Actions Row */}
        <View style={[styles.row, styles.actionsRow]}>
          <View style={styles.labelPlaceholder} />
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionIconBtn} onPress={() => onPressGraph(item)}>
              <Image
                source={require("../../assets/images/graph_Icon.png")}
                style={styles.icongraph}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionIconBtn} onPress={() => onPressExport(item)}>
              <Image
                source={require("../../assets/images/Export_Icon.png")}
                style={styles.icon}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionIconBtn} onPress={() => onPressShare(item)}>
              <Image
                source={require("../../assets/images/share.png")}
                style={styles.icon}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* -------- Header Section -------- */}
      <Image source={require("../../assets/images/WaveTop.png")} style={styles.headerImage} />

      <View style={styles.topHeader}>
        {/* Left Icon (Sidebar Trigger) */}
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => {
              if (navigation?.openDrawer) navigation.openDrawer();
              else navigation.navigate("Sidebar");
            }}
          >
            <Image
              source={require("../../assets/images/MoreTop.png")}
              style={styles.navIconmore}
            />
          </TouchableOpacity>
        </View>

        {/* Center Title */}
        <Text style={styles.headerText}>BIOT</Text>

        {/* Right Placeholder for balancing layout */}
        <View style={styles.headerRightPlaceholder} />
      </View>

      {/* -------- Main Content -------- */}
      <View style={styles.filterRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.filterTitle}>{filterLabel}</Text>
          <Text style={styles.filterSubtitle}>
            {`${summary.total} devices · ${refreshLabel}`}
          </Text>
        </View>
        <View style={styles.filterChips}>
          {["all", "good", "issue"].map((key) => (
            <Pressable
              key={key}
              style={[styles.chip, filterKey === key && styles.chipActive]}
              onPress={() => onChangeFilter(key)}
            >
              <Text style={[styles.chipText, filterKey === key && styles.chipTextActive]}>
                {FILTER_LABELS[key]?.replace(" Devices", "")}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={() => loadData("initial")} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          // style={{ flex: 1 }}
          style={styles.flexOne}
          data={filteredItems}
          keyExtractor={(it, idx) => `${String(it.deviceId)}_${String(it.ts ?? "na")}_${idx}`}
          renderItem={renderCabinCard}
          // Padding bottom ensures content isn't hidden behind the custom bottom nav
          // contentContainerStyle={{ paddingBottom: 130 }}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.muted}>No devices match the selected filter.</Text>
            </View>
          }
        />
      )}

      {/* -------- Bottom Navigation -------- */}
      <ImageBackground
        source={require("../../assets/images/WaveBottom.png")}
        style={styles.bottomNavBg}
        resizeMode="stretch"
      >
        <View style={styles.navContainer}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigateToTab("Dashboard")}
            activeOpacity={0.85}
          >
            <Image source={require("../../assets/images/GraphIcon.png")} style={styles.navIcon} />
            <Text style={styles.navText} numberOfLines={1} adjustsFontSizeToFit>DASH</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigateToTab("Home")}
            activeOpacity={0.85}
          >
            <Image source={require("../../assets/images/HomeIcon.png")} style={styles.navIcon} />
            <Text style={styles.navText} numberOfLines={1} adjustsFontSizeToFit>HOME</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigateToTab("Graph")}
            activeOpacity={0.85}
          >
            <Image source={require("../../assets/images/GraphIcon.png")} style={styles.navIcon} />
            <Text style={styles.navText} numberOfLines={1} adjustsFontSizeToFit>GRAPH</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigateToTab("Alarm")}
            activeOpacity={0.85}
          >
            <Image source={require("../../assets/images/AlarmIcon.png")} style={styles.navIcon} />
            <Text style={styles.navText} numberOfLines={1} adjustsFontSizeToFit>ALARM</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigateToTab("More")}
            activeOpacity={0.85}
          >
            <Image source={require("../../assets/images/MoreIcon.png")} style={styles.navIcon} />
            <Text style={styles.navText} numberOfLines={1} adjustsFontSizeToFit>MORE</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

/* ------------------------- STYLES ------------------------- */

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },

  /* Header Layout */
  headerImage: { width: "100%", height: 86, resizeMode: "cover" },
  topHeader: {
    position: "absolute",
    top: 22,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // Distribute Left, Center, Right
    paddingHorizontal: 14,
    zIndex: 10,
  },
  headerLeft: { width: 50 }, // Fixed width for left placeholder
  headerIconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  navIconmore: { width: 28, height: 24, resizeMode: "contain" },
  headerText: { fontSize: 26, fontWeight: "bold", color: "#000", textAlign: "center", flex: 1 },
  headerRightPlaceholder: { width: 50 }, // Symmetrical fixed width for right

  /* Filter Pills */
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterTitle: { fontSize: 18, fontWeight: "700", color: "#000" },
  filterSubtitle: { fontSize: 12, color: "#666", marginTop: 2 },
  filterChips: { flexDirection: "row", alignItems: "center" },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ddd",
    marginLeft: 6,
    backgroundColor: "#f7f7f7",
  },
  chipActive: { borderColor: "#f6b85c", backgroundColor: "#ffe9c2" },
  chipText: { fontSize: 12, fontWeight: "600", color: "#444" },
  chipTextActive: { color: "#c47b1a" },

  /* Cabin Card Styles */
  cabinBox: {
    marginHorizontal: 12,
    marginTop: 14,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1f1f1f",
    elevation: 2, // Shadow for Android
  },
  cabinHeader: {
    flexDirection: "row",
    backgroundColor: "#ffcc80",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  cabinHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  cabinName: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#000",
    marginRight: 8,
    flexShrink: 1, // Allow shrinking if needed
  },
  cabinID: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#000",
    textAlign: "right",
    flexGrow: 1, // Take remaining space
  },

  row: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  label: { width: "35%", fontWeight: "bold", fontSize: 14, color: "#000" },

  valueText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    textAlign: "left",
  },
  valueWithBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  wifiHeaderIcon: { marginRight: 8 },
  badge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 12,
    fontWeight: "bold",
  },
  badgeAlarm: {
    backgroundColor: "#f8d7da",
    color: "#c0392b",
  },
  badgeOk: {
    backgroundColor: "#d4edda",
    color: "#1e8449",
  },

  /* Status Indicator */
  statusWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
    justifyContent: "flex-end", // Align to right
    flex: 1, // Allow it to take available space
  },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: "#111" },
  statusText: { marginLeft: 6, fontWeight: "bold", color: "#000", flexShrink: 1 }, // Removed fixed width and padding

  /* Action Buttons */
  actionsRow: { marginTop: 6 },
  labelPlaceholder: { width: "35%" },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", flex: 1 },
  actionIconBtn: { alignItems: "center", justifyContent: "center", marginLeft: 10, width: 28 },
  icon: { width: 22, height: 26, resizeMode: "contain" },
  icongraph: { width: 26, height: 22, resizeMode: "contain" },

  /* Bottom Navigation Bar */
  bottomNavBg: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 86,
    justifyContent: "center",
  },
  navContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: "100%",
    paddingBottom: 10,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  listContent: {
    paddingBottom: 130,
  },
  flexOne: {
    flex: 1,
  },
  navIcon: { width: 30, height: 32, resizeMode: "contain", marginBottom: 4 },
  navText: { fontWeight: "800", fontSize: 12, color: "#000", textAlign: "center" },

  /* Loading & Error States */
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  muted: { color: "#888", fontSize: 14, marginTop: 8 },
  error: { color: "red", fontSize: 14, textAlign: "center", marginBottom: 12 },
  retryBtn: { padding: 8, backgroundColor: "#ddd", borderRadius: 4 },
  retryText: { color: "#000" },
});
