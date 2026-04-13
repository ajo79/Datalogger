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
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { fetchFastDeviceStatus, getCachedFastDeviceStatus } from "../api/dataService";
import { classifyDeviceHealth, buildHealthSummary } from "../utils/deviceHealth";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useResponsiveLayout } from "../theme/responsive";
import { useAppTheme } from "../theme";
import { ModernBottomNav, ModernTopHeader } from "../components/ui";

/* ------------------------- CONFIG / THRESHOLDS ------------------------- */

// Auto refresh interval (ms). Set to 0 to disable.
const AUTO_REFRESH_MS = 5000;
const STATUS_FETCH_TIMEOUT_MS = 5000;
const STATUS_CACHE_MAX_AGE_MS = 30000;

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
function computeStatusInfo(item, palette) {
  const { category, online, commonIssue } = classifyDeviceHealth(item);
  if (!online) {
    return { color: palette.statusOffline, label: "Offline", online };
  }
  if (commonIssue || category === "issue") {
    return { color: palette.statusAlarm, label: "Alarm", online, category };
  }
  return { color: palette.statusOnline, label: "Online", online, category };
}

// Map wifi strength (1-4) to icon + label for the card
function getWifiInfo(item, { online = true } = {}, palette) {
  if (!online) {
    return { label: "Offline", icon: "wifi-off", color: palette.wifiUnknown };
  }

  const strength = Number(
    item?.status?.wifiStrength ??
      item?.status?.wifi?.level ??
    item?.wifi_strength ?? item?.wifiStrength ?? item?.wifiSignal ?? item?.wifi
  );

  const map = {
    1: { label: "Very poor (1/4)", icon: "wifi-strength-1", color: palette.wifiPoor },
    2: { label: "Weak (2/4)", icon: "wifi-strength-2", color: palette.wifiWeak },
    3: { label: "Good (3/4)", icon: "wifi-strength-3", color: palette.wifiGood },
    4: { label: "Excellent (4/4)", icon: "wifi-strength-4", color: palette.wifiExcellent },
  };

  if (!Number.isFinite(strength)) {
    return { label: "Unknown", icon: "wifi-strength-off-outline", color: palette.wifiUnknown };
  }

  return map[strength] || { label: `Level ${strength}`, icon: "wifi-strength-1", color: palette.wifiFallback };
}

/* ------------------------- MAIN COMPONENT ------------------------- */

export default function HomeScreen(props) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navFromHook = useNavigation();
  const navigation = props?.navigation ?? navFromHook;
  const ui = useResponsiveLayout();
  const palette = useMemo(
    () => ({
      statusOffline: theme.colors.textMuted,
      statusAlarm: theme.colors.danger,
      statusOnline: theme.colors.success,
      wifiPoor: theme.colors.danger,
      wifiWeak: theme.colors.warning,
      wifiGood: theme.colors.info,
      wifiExcellent: theme.colors.success,
      wifiUnknown: theme.colors.textMuted,
      wifiFallback: theme.colors.brand,
    }),
    [theme.colors]
  );
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

  const normalizedFilterLabel = useMemo(() => {
    if (!ui.isCompact) return filterLabel;
    const source = String(filterLabel || "");
    if (source.toLowerCase().includes("good")) return "Good Devices";
    if (source.toLowerCase().includes("issue")) return "Issue Devices";
    if (source.toLowerCase().includes("all")) return "All Devices";
    return source;
  }, [filterLabel, ui.isCompact]);

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

  const hydrateFromWarmCache = useCallback(() => {
    const cached = getCachedFastDeviceStatus({ maxAgeMs: STATUS_CACHE_MAX_AGE_MS });
    if (!Array.isArray(cached)) return false;

    setRawItems(cached);
    setLoading(false);
    setError("");
    return true;
  }, []);

  // --- Effects ---

  // Initial load and auto-refresh interval setup
  useEffect(() => {
    const hydrated = hydrateFromWarmCache();
    loadData(hydrated ? "auto" : "initial");

    if (AUTO_REFRESH_MS > 0) {
      timerRef.current = setInterval(() => loadData("auto"), AUTO_REFRESH_MS);
    }

    // Cleanup interval on unmount
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hydrateFromWarmCache, loadData]);

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
    const { color: dotColor, label: statusLabel, online } = computeStatusInfo(item, palette);
    const wifi = getWifiInfo(item, { online }, palette);

    return (
      <View style={[styles.cabinBox, ui.isVeryCompact && styles.cabinBoxCompact]}>
        {/* Card Header: Cabin Name and ID */}
        <View style={[styles.cabinHeader, ui.isCompact && styles.cabinHeaderCompact]}>
          <View style={[styles.cabinHeaderLeft, ui.isCompact && styles.cabinHeaderLeftCompact]}>
            <Text
              style={[styles.cabinName, { fontSize: ui.font(16, { min: 13, max: 17 }) }]}
              numberOfLines={1}
              ellipsizeMode="tail"
              maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
            >
              {String(item.deviceName ?? "Device")}
            </Text>
            <Text
              style={[styles.cabinID, { fontSize: ui.font(16, { min: 13, max: 17 }) }]}
              numberOfLines={1}
              ellipsizeMode="middle"
              maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
            >
              ID: {String(item.deviceId ?? "-")}
            </Text>
          </View>

          <View style={[styles.statusWrap, ui.isCompact && styles.statusWrapCompact]}>
            <MaterialCommunityIcons
              name={wifi.icon}
              size={ui.size(20, { min: 16, max: 22 })}
              color={wifi.color}
              style={styles.wifiHeaderIcon}
            />
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
            <Text
              style={[styles.statusText, { fontSize: ui.font(16, { min: 12, max: 16 }) }]}
              numberOfLines={1}
              maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
            >
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Metrics (dynamic: either press metrics or temp/humidity) */}
        {metricsInfo.metrics.map((m) => (
          <View style={styles.row} key={m.key}>
            <Text
              style={[styles.label, { fontSize: ui.font(14, { min: 12, max: 15 }) }]}
              numberOfLines={1}
              maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
            >
              {m.label}
            </Text>
            <View style={styles.valueWithBadge}>
              <Text
                style={[styles.valueText, { fontSize: ui.font(16, { min: 13, max: 17 }) }]}
                numberOfLines={1}
                maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
              >
                {m.value}
              </Text>
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
      <ModernTopHeader
        title="BIOT"
        subtitle={`${summary.online}/${summary.total} online`}
        leftIcon={require("../../assets/images/MoreTop.png")}
        onLeftPress={() => {
          if (navigation?.openDrawer) navigation.openDrawer();
          else navigation.navigate("Sidebar");
        }}
      />

      {/* -------- Main Content -------- */}
      <View style={[styles.filterRow, ui.isCompact && styles.filterRowCompact]}>
        <View style={styles.filterInfo}>
          <Text
            style={[styles.filterTitle, { fontSize: ui.font(18, { min: 16, max: 20 }) }]}
            numberOfLines={ui.isCompact ? 2 : 1}
            maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
          >
            {normalizedFilterLabel}
          </Text>
          <Text
            style={[styles.filterSubtitle, { fontSize: ui.font(12, { min: 11, max: 13 }) }]}
            numberOfLines={1}
            maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
          >
            {`${summary.total} devices · ${refreshLabel}`}
          </Text>
        </View>
        <View style={[styles.filterChips, ui.isCompact && styles.filterChipsCompact]}>
          {["all", "good", "issue"].map((key) => (
            <Pressable
              key={key}
              style={[
                styles.chip,
                ui.isCompact && styles.chipCompact,
                filterKey === key && styles.chipActive,
              ]}
              onPress={() => onChangeFilter(key)}
            >
              <Text
                style={[
                  styles.chipText,
                  { fontSize: ui.font(12, { min: 10, max: 13 }) },
                  filterKey === key && styles.chipTextActive,
                ]}
                numberOfLines={1}
                maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
              >
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

      <ModernBottomNav navigation={navigation} activeRoute="Home" />
    </SafeAreaView>
  );
}

/* ------------------------- STYLES ------------------------- */

function createStyles(theme) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.canvas },
    filterRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    filterRowCompact: {
      flexDirection: "column",
      alignItems: "stretch",
    },
    filterInfo: {
      flex: 1,
      minWidth: 0,
    },
    filterTitle: { fontSize: 18, fontWeight: "700", color: theme.colors.textPrimary },
    filterSubtitle: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
    filterChips: { flexDirection: "row", alignItems: "center" },
    filterChipsCompact: {
      marginTop: 8,
      alignSelf: "flex-start",
      marginLeft: -6,
    },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginLeft: 6,
      backgroundColor: theme.colors.chipBackground,
    },
    chipCompact: {
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    chipActive: { borderColor: theme.colors.brand, backgroundColor: theme.colors.chipActiveBackground },
    chipText: { fontSize: 12, fontWeight: "600", color: theme.colors.chipText },
    chipTextActive: { color: theme.colors.chipActiveText },
    cabinBox: {
      marginHorizontal: 12,
      marginTop: 14,
      padding: 10,
      backgroundColor: theme.colors.cardBackground,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      elevation: 2,
      shadowColor: theme.colors.overlaySoft,
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 5,
    },
    cabinBoxCompact: {
      marginHorizontal: 10,
      paddingHorizontal: 9,
    },
    cabinHeader: {
      flexDirection: "row",
      backgroundColor: theme.colors.cardHeader,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "space-between",
    },
    cabinHeaderCompact: {
      alignItems: "flex-start",
    },
    cabinHeaderLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      minWidth: 0,
      marginRight: 8,
    },
    cabinHeaderLeftCompact: {
      width: "100%",
      marginRight: 0,
    },
    cabinName: {
      fontWeight: "bold",
      fontSize: 16,
      color: theme.colors.textPrimary,
      marginRight: 8,
      flexShrink: 1,
    },
    cabinID: {
      fontWeight: "bold",
      fontSize: 16,
      color: theme.colors.textPrimary,
      flexShrink: 1,
    },
    row: { flexDirection: "row", alignItems: "center", marginTop: 10 },
    label: { width: "35%", fontWeight: "bold", fontSize: 14, color: theme.colors.textPrimary },
    valueText: {
      flex: 1,
      fontSize: 16,
      fontWeight: "bold",
      color: theme.colors.textPrimary,
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
      backgroundColor: theme.colors.accentSoft,
      color: theme.colors.danger,
    },
    badgeOk: {
      backgroundColor: theme.colors.brandSoft,
      color: theme.colors.success,
    },
    statusWrap: {
      flexDirection: "row",
      alignItems: "center",
      marginLeft: 6,
      justifyContent: "flex-end",
      flexShrink: 0,
    },
    statusWrapCompact: {
      marginTop: 6,
      alignSelf: "flex-end",
    },
    dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.borderStrong },
    statusText: { marginLeft: 6, fontWeight: "bold", color: theme.colors.textPrimary },
    actionsRow: { marginTop: 6 },
    labelPlaceholder: { width: "35%" },
    actions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", flex: 1 },
    actionIconBtn: { alignItems: "center", justifyContent: "center", marginLeft: 10, width: 28 },
    icon: { width: 22, height: 26, resizeMode: "contain", tintColor: theme.colors.navActive },
    icongraph: { width: 26, height: 22, resizeMode: "contain", tintColor: theme.colors.navActive },
    listContent: {
      paddingBottom: 116,
    },
    flexOne: {
      flex: 1,
    },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
    muted: { color: theme.colors.textMuted, fontSize: 14, marginTop: 8 },
    error: { color: theme.colors.danger, fontSize: 14, textAlign: "center", marginBottom: 12 },
    retryBtn: {
      padding: 8,
      backgroundColor: theme.colors.buttonGhost,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    retryText: { color: theme.colors.buttonGhostText },
  });
}
