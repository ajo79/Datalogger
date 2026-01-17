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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { fetchRealTimeDataMonitor } from "../api/dataService";
import { saveAlarm } from "../storage/alarmStorage";

/* ------------------------- CONFIG / THRESHOLDS ------------------------- */

// Auto refresh interval (ms). Set to 0 to disable.
const AUTO_REFRESH_MS = 5000;

// Basic thresholds (adjust to your needs)
const TEMP_MIN = 0;
const TEMP_MAX = 60;
const HUM_MIN = 0;
const HUM_MAX = 100;

// If you have a timestamp and want “offline if old”
const OFFLINE_AFTER_MS = 2 * 60 * 1000; // 2 minutes

/* ------------------------- DYNAMODB VALUE HELPERS ------------------------- */

function unwrapAttr(v) {
  // Supports DynamoDB AttributeValue forms: {S:""}, {N:""}, {BOOL:true}
  if (v && typeof v === "object") {
    if (Object.prototype.hasOwnProperty.call(v, "S")) return String(v.S);
    if (Object.prototype.hasOwnProperty.call(v, "N")) return Number(v.N);
    if (Object.prototype.hasOwnProperty.call(v, "BOOL")) return Boolean(v.BOOL);
  }
  return v;
}

/* ------------------------- HELPER FUNCTIONS ------------------------- */

/**
 * Formats temperature value.
 * If invalid, returns "--".
 */
function formatTemp(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return "--";
  return n.toFixed(1) + " °C";
}

/**
 * Formats humidity value.
 * If invalid, returns "--".
 */
function formatHum(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return "--";
  return n.toFixed(1) + " %";
}

/**
 * Checks if a value is within a specified range [min, max].
 */
function isWithinRange(val, min, max) {
  const n = Number(val);
  if (!Number.isFinite(n)) return false;
  return n >= min && n <= max;
}

/**
 * Determines if a device is online based on its last timestamp.
 */
function computeIsOnline(item) {
  if (item.ts && Number.isFinite(item.ts)) {
    const age = Date.now() - item.ts;
    // If data is older than threshold, mark as offline
    if (age > OFFLINE_AFTER_MS) return false;
  }
  // Default to true if logic allows or timestamp missing (depending on requirement)
  return true;
}

/**
 * Checks if device readings are within healthy ranges.
 */
function computeIsHealthy(item) {
  const okTemp = isWithinRange(item.temperature, TEMP_MIN, TEMP_MAX);
  const okHum = isWithinRange(item.humidity, HUM_MIN, HUM_MAX);
  return okTemp && okHum;
}

/**
 * Returns the status color based on device state.
 * - Gray: Offline or Missing Data
 * - Green: Healthy
 * - Red: Alert (Unhealthy)
 */
function getStatusColor(item) {
  const online = computeIsOnline(item);
  if (!online) return "#95A5A6"; // Gray (Offline)

  const hasTemp = Number.isFinite(Number(item.temperature));
  const hasHum = Number.isFinite(Number(item.humidity));
  if (!hasTemp || !hasHum) return "#95A5A6"; // Gray (Missing Data)

  const healthy = computeIsHealthy(item);
  return healthy ? "#2ECC71" : "#E74C3C"; // Green (Healthy) / Red (Unhealthy)
}

/**
 * Returns a human-readable status label corresponding to the status color.
 */
function getStatusLabelFromColor(color) {
  if (color === "#2ECC71") return "Online";
  if (color === "#E74C3C") return "Alarm";
  return "Offline";
}

/* ------------------------- MAIN COMPONENT ------------------------- */

export default function HomeScreen(props) {
  const navFromHook = useNavigation();
  const navigation = props?.navigation ?? navFromHook;
  const navigateToTab = (route) => {
    if (navigation?.navigate) {
      navigation.navigate(route);
      return;
    }
    navigation.getParent()?.navigate('Home', { screen: route });
  };

  // --- State Variables ---
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rawItems, setRawItems] = useState([]); // Raw data from API
  const [error, setError] = useState("");
  const timerRef = useRef(null);

  /**
   * Process raw items for display.
   * memoized to avoid re-calculation on every render.
   */
  const items = useMemo(() => {
    // Basic normalization: ensure deviceId is a string
    const normalized = (rawItems || []).map((item) => {
      // Flatten payload into the item if it exists
      const source = item.payload ? { ...item, ...item.payload } : item;
      return {
        ...source,
        deviceId: String(source.deviceId ?? "Unknown"),
        ts: Number(source.ts), // ensure timestamp is number
      };
    });

    // Sorting logic:
    // If timestamps exist, sort by newest first.
    const hasTs = normalized.some((x) => Number.isFinite(x.ts));
    if (hasTs) return normalized.sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));

    // Fallback: sort alphabetically by deviceId
    return normalized.sort((a, b) => String(a.deviceId).localeCompare(String(b.deviceId)));
  }, [rawItems]);

  /**
   * Fetches data from the API.
   * Handles 'initial' load (screen spinner) and 'refresh' (pull-to-refresh).
   */
  const loadData = useCallback(async (mode) => {
    try {
      if (mode === "initial") setLoading(true);
      else if (mode === "refresh") setRefreshing(true);

      setError("");
      // API Call to fetch real-time monitor data
      const data = await fetchRealTimeDataMonitor();
      setRawItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Failed to load realtime data");
      setRawItems([]);
    } finally {
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

  // --- Alarm Logging Side Effect ---
  // To avoid repeatedly logging the same alarm every 5 seconds, we store the IDs of currently alarmed devices.
  const alarmedDevicesRef = useRef(new Set());

  useEffect(() => {
    (items || []).forEach(item => {
      const isUnhealthy = !computeIsHealthy(item);
      const isOnline = computeIsOnline(item);

      // We only log "Device Alarm" if it is Online but Unhealthy
      if (isOnline && isUnhealthy) {
        if (!alarmedDevicesRef.current.has(item.deviceId)) {
          // New alarm event
          saveAlarm({
            deviceId: item.deviceId,
            message: `Values out of range (T:${formatTemp(item.temperature)} H:${formatHum(item.humidity)})`,
            status: "Alarm"
          });
          alarmedDevicesRef.current.add(item.deviceId);
        }
      } else {
        // If healthy or offline, remove from set so we can log again if it re-enters alarm state later
        if (alarmedDevicesRef.current.has(item.deviceId)) {
          alarmedDevicesRef.current.delete(item.deviceId);
        }
      }
    });
  }, [items]);

  // --- Callbacks ---

  const onRefresh = useCallback(() => loadData("refresh"), [loadData]);

  // Navigate to Graph screen with device data
  const onPressGraph = useCallback(
    (item) => {
      navigation.navigate("GraphShow", {
        deviceId: item.deviceId,
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
      const msg =
        `Device: ${item.deviceId}\n` +
        `Temperature: ${formatTemp(item.temperature)}\n` +
        `Humidity: ${formatHum(item.humidity)}\n` +
        (item.ts ? `Timestamp: ${new Date(item.ts).toISOString()}\n` : "");

      await Share.share({ message: msg });
    } catch (e) {
      Alert.alert("Share failed", e?.message || "Unable to share");
    }
  }, []);

  /**
   * Renders a single "Cabin Card" (data item).
   */
  const renderCabinCard = ({ item }) => {
    const dotColor = getStatusColor(item);
    const statusLabel = getStatusLabelFromColor(dotColor);

    return (
      <View style={styles.cabinBox}>
        {/* Card Header: Cabin Name and ID */}
        <View style={styles.cabinHeader}>
          <Text style={styles.cabinName}>Cabin</Text>
          <Text style={styles.cabinID}>
            ID: {String(item.deviceId ?? "-")}
          </Text>
        </View>

        {/* Temperature Row */}
        <View style={styles.row}>
          <Text style={styles.label}>Temperature</Text>
          <Text style={styles.valueText}>{formatTemp(item.temperature)}</Text>

          {/* Status Indicator (Dot + Label) */}
          <View style={styles.statusWrap}>
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        </View>

        {/* Humidity Row + Action Buttons */}
        <View style={styles.row}>
          <Text style={styles.label}>Humidity</Text>
          <Text style={styles.valueText}>{formatHum(item.humidity)}</Text>

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
          data={items}
          keyExtractor={(it, idx) => `${String(it.deviceId)}_${idx}`}
          renderItem={renderCabinCard}
          // Padding bottom ensures content isn't hidden behind the custom bottom nav
          // contentContainerStyle={{ paddingBottom: 130 }}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.muted}>No realtime data available.</Text>
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
