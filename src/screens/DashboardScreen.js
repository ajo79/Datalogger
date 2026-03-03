import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { PieChart } from "react-native-chart-kit";
import Svg, { Circle, G } from "react-native-svg";
import { fetchFastDeviceStatus, getCachedFastDeviceStatus } from "../api/dataService";
import { buildHealthSummary } from "../utils/deviceHealth";
import { navigateToTabRoute } from "../navigation/navHelpers";
import { useResponsiveLayout } from "../theme/responsive";

const AUTO_REFRESH_MS = 5000;
const STATUS_FETCH_TIMEOUT_MS = 5000;
const STATUS_CACHE_MAX_AGE_MS = 30000;
const COLORS = {
  total: "#0EA5E9", // blue
  good: "#16A34A", // green
  issue: "#F97316", // amber
  empty: "#E2E8F0",
  legendText: "#0F172A",
  legendMuted: "#64748B",
};
const chartConfig = {
  color: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
  decimalPlaces: 0,
  propsForLabels: { fontWeight: "700" },
};

function CircularStat({ percent, value, label, accent = COLORS.total, size = 108 }) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(percent, 0), 100);
  const dashOffset = circumference * (1 - clamped / 100);
  const track = `${accent}26`; // 15% alpha

  return (
    <View style={[styles.circularWrap, { width: size + 2, height: size + 2 }]}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={track} strokeWidth={strokeWidth} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={accent}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      </Svg>
      <View style={styles.circularCenter}>
        <Text style={styles.circularValue}>{value}</Text>
        <Text style={styles.circularLabel}>{label}</Text>
      </View>
    </View>
  );
}

export default function DashboardScreen(props) {
  const navFromHook = useNavigation();
  const navigation = props?.navigation ?? navFromHook;
  const ui = useResponsiveLayout();
  const screenWidth = ui.width;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const timerRef = useRef(null);
  const inFlightRef = useRef(false);

  const summary = useMemo(() => buildHealthSummary(items), [items]);
  const percent = useCallback(
    (value) => {
      if (!summary.total) return 0;
      return Math.round((value / summary.total) * 100);
    },
    [summary.total]
  );
  const chartSize = useMemo(() => Math.max(150, Math.min(screenWidth - 96, 210)), [screenWidth]);
  const ringSize = ui.isCompact ? 96 : 108;
  const pieSlices = useMemo(() => {
    const slices = [
      { key: "good", label: "Good", value: summary.good, color: COLORS.good },
      { key: "issue", label: "Issue", value: summary.issue, color: COLORS.issue },
    ].filter((slice) => slice.value > 0);

    if (slices.length === 0) {
      return [{ key: "empty", label: "No data", value: 1, color: COLORS.empty, placeholder: true }];
    }
    return slices;
  }, [summary.good, summary.issue]);
  const legendRows = useMemo(
    () => [
      { key: "good", label: "Good", value: summary.good, color: COLORS.good },
      { key: "issue", label: "Issue", value: summary.issue, color: COLORS.issue },
    ],
    [summary.good, summary.issue]
  );
  const chartData = useMemo(
    () =>
      pieSlices.map((slice) => ({
        name: slice.label,
        population: slice.value,
        color: slice.color,
        legendFontColor: COLORS.legendText,
        legendFontSize: 13,
      })),
    [pieSlices]
  );

  const loadData = useCallback(
    async (mode = "initial") => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      try {
        if (mode === "initial") setLoading(true);
        if (mode === "refresh") setRefreshing(true);
        if (mode === "initial") setError("");
        const data = await fetchFastDeviceStatus({ timeoutMs: STATUS_FETCH_TIMEOUT_MS });
        setItems(Array.isArray(data) ? data : []);
        setError("");
      } catch (e) {
        const message = e?.message || "Failed to load dashboard data";
        if (mode === "initial") {
          setError(message);
          setItems([]);
        } else {
          console.warn(`[DashboardScreen] ${mode} refresh failed: ${message}`);
        }
      } finally {
        inFlightRef.current = false;
        if (mode === "initial") setLoading(false);
        if (mode === "refresh") setRefreshing(false);
      }
    },
    []
  );

  const hydrateFromWarmCache = useCallback(() => {
    const cached = getCachedFastDeviceStatus({ maxAgeMs: STATUS_CACHE_MAX_AGE_MS });
    if (!Array.isArray(cached)) return false;

    setItems(cached);
    setLoading(false);
    setError("");
    return true;
  }, []);

  useEffect(() => {
    const hydrated = hydrateFromWarmCache();
    loadData(hydrated ? "auto" : "initial");
    if (AUTO_REFRESH_MS > 0) {
      timerRef.current = setInterval(() => loadData("auto"), AUTO_REFRESH_MS);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hydrateFromWarmCache, loadData]);

  const navigateToHome = useCallback(
    (filter, title) => {
      navigation.navigate("Home", { filter, title });
    },
    [navigation]
  );

  const cards = [
    {
      key: "online",
      title: "Total Devices Online",
      subtitle: `${summary.online} of ${summary.total || 0} online`,
      value: `${summary.online}/${summary.total || 0}`,
      count: summary.online,
      percent: percent(summary.online),
      accent: COLORS.total,
      onPress: () => navigateToHome("all", "All Devices"),
    },
    {
      key: "good",
      title: "Good Devices",
      subtitle: `${summary.good} of ${summary.total || 0} healthy`,
      value: `${summary.good}/${summary.total || 0}`,
      count: summary.good,
      percent: percent(summary.good),
      accent: COLORS.good,
      onPress: () => navigateToHome("good", "Good Devices"),
    },
    {
      key: "issue",
      title: "Issue Devices",
      subtitle: `${summary.issue} needing attention`,
      value: `${summary.issue}/${summary.total || 0}`,
      count: summary.issue,
      percent: percent(summary.issue),
      accent: COLORS.issue,
      onPress: () => navigateToHome("issue", "Issue Devices"),
    },
  ];

  const navigateToTab = (route) => navigateToTabRoute(navigation, route);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Image source={require("../../assets/images/WaveTop.png")} style={styles.headerImage} />

      <View style={[styles.topHeader, { paddingHorizontal: ui.contentHorizontalPadding }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => {
              if (navigation?.openDrawer) navigation.openDrawer();
              else navigation.navigate("Sidebar");
            }}
          >
            <Image source={require("../../assets/images/MoreTop.png")} style={styles.navIconmore} />
          </TouchableOpacity>
        </View>
        <Text
          style={[styles.headerText, { fontSize: ui.font(25, { min: 21, max: 27 }) }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
        >
          Dashboard
        </Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData("refresh")} />}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading dashboard...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadData("initial")}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text
              style={[styles.leadText, { fontSize: ui.font(16, { min: 14, max: 17 }) }]}
              maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
            >
              Fleet overview
            </Text>

            <View style={styles.pieCard}>
              <View style={styles.pieHeader}>
                <Text
                  style={[styles.tileTitle, { fontSize: ui.font(16, { min: 14, max: 17 }) }]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
                >
                  Health breakdown
                </Text>
                <Text
                  style={[styles.pieSub, { fontSize: ui.font(13, { min: 11, max: 14 }) }]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
                >
                  {summary.total} total devices
                </Text>
              </View>

              <View style={styles.pieRow}>
                <View style={styles.chartWrap}>
                  <View style={[styles.chartFrame, { width: chartSize, height: chartSize }]}>
                    <PieChart
                      data={chartData}
                      width={chartSize}
                      height={chartSize}
                      chartConfig={chartConfig}
                      accessor="population"
                      backgroundColor="transparent"
                      paddingLeft={chartSize / 4}
                      center={[0, 0]}
                      hasLegend={false}
                      style={styles.pieChart}
                    />
                  </View>
                </View>

                <View style={styles.legendWrap}>
                  {summary.total === 0 ? (
                    <Text style={styles.muted}>No devices yet. Data will appear once readings arrive.</Text>
                  ) : (
                    legendRows.map((row) => (
                      <View key={row.key} style={styles.legendRow}>
                        <View style={[styles.legendDot, { backgroundColor: row.color }]} />
                        <View style={styles.legendTextWrap}>
                          <Text
                            style={[styles.legendLabel, { fontSize: ui.font(14, { min: 12, max: 15 }) }]}
                            maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
                          >
                            {row.label}
                          </Text>
                          <Text
                            style={[styles.legendCount, { fontSize: ui.font(13, { min: 11, max: 14 }) }]}
                            maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
                          >
                            {row.value} devices · {percent(row.value)}%
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>
            </View>

            {cards.map((card) => (
              <TouchableOpacity
                key={card.key}
                style={[styles.statCard, { borderColor: `${card.accent}33`, shadowColor: card.accent }]}
                activeOpacity={0.9}
                onPress={card.onPress}
              >
                <Text
                  style={[styles.statTitle, { fontSize: ui.font(15, { min: 13, max: 16 }) }]}
                  numberOfLines={2}
                  maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
                >
                  {card.title}
                </Text>
                <View style={styles.statRow}>
                  <CircularStat
                    percent={card.percent}
                    value={card.count}
                    label={`${card.percent}%`}
                    accent={card.accent}
                    size={ringSize}
                  />
                  <View style={styles.statTextBlock}>
                    <Text
                      style={[styles.statValue, { fontSize: ui.font(24, { min: 19, max: 26 }) }]}
                      numberOfLines={1}
                      maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
                    >
                      {card.value}
                    </Text>
                    <Text
                      style={[styles.statSubtitle, { fontSize: ui.font(13, { min: 11, max: 14 }) }]}
                      numberOfLines={2}
                      maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
                    >
                      {card.subtitle}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      <ImageBackground
        source={require("../../assets/images/WaveBottom.png")}
        style={styles.bottomNavBg}
        resizeMode="stretch"
      >
        <View style={styles.navContainer}>
          <TouchableOpacity style={styles.navItem} onPress={() => navigateToTab("Dashboard")} activeOpacity={0.85}>
            <Image
              source={require("../../assets/images/GraphIcon.png")}
              style={[styles.navIcon, { width: ui.navIconSize, height: ui.navIconSize + 2 }]}
            />
            <Text
              style={[styles.navText, { fontSize: ui.navTextSize }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
            >
              DASH
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigateToTab("Home")} activeOpacity={0.85}>
            <Image
              source={require("../../assets/images/HomeIcon.png")}
              style={[styles.navIcon, { width: ui.navIconSize, height: ui.navIconSize + 2 }]}
            />
            <Text
              style={[styles.navText, { fontSize: ui.navTextSize }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
            >
              HOME
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigateToTab("Graph")} activeOpacity={0.85}>
            <Image
              source={require("../../assets/images/GraphIcon.png")}
              style={[styles.navIcon, { width: ui.navIconSize, height: ui.navIconSize + 2 }]}
            />
            <Text
              style={[styles.navText, { fontSize: ui.navTextSize }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
            >
              GRAPH
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigateToTab("Alarm")} activeOpacity={0.85}>
            <Image
              source={require("../../assets/images/AlarmIcon.png")}
              style={[styles.navIcon, { width: ui.navIconSize, height: ui.navIconSize + 2 }]}
            />
            <Text
              style={[styles.navText, { fontSize: ui.navTextSize }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
            >
              ALARM
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigateToTab("More")} activeOpacity={0.85}>
            <Image
              source={require("../../assets/images/MoreIcon.png")}
              style={[styles.navIcon, { width: ui.navIconSize, height: ui.navIconSize + 2 }]}
            />
            <Text
              style={[styles.navText, { fontSize: ui.navTextSize }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
            >
              MORE
            </Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
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
  headerLeft: { width: 50 },
  headerIconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  navIconmore: { width: 28, height: 24, resizeMode: "contain" },
  headerText: { fontSize: 25, fontWeight: "bold", color: "#000", textAlign: "center", flex: 1, paddingHorizontal: 8 },
  headerRightPlaceholder: { width: 50 },

  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 140,
  },
  leadText: { fontSize: 16, fontWeight: "700", color: "#444", marginBottom: 8 },
  pieCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.1,
    borderColor: "#dbeafe",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
  },
  pieHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tileTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a", flex: 1, minWidth: 0 },
  pieSub: { color: COLORS.legendMuted, fontWeight: "700", fontSize: 13, marginLeft: 8, flexShrink: 1 },
  pieRow: { flexDirection: "column", alignItems: "center", marginTop: 6 },
  chartWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  chartFrame: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
  pieChart: {
    alignSelf: "center",
  },
  legendWrap: { width: "100%", marginTop: 10 },
  legendRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  legendTextWrap: { flexShrink: 1 },
  legendLabel: { fontWeight: "700", color: COLORS.legendText, fontSize: 14 },
  legendCount: { color: COLORS.legendMuted, fontSize: 13 },

  statCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1.2,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
    alignItems: "center",
  },
  statTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a", textAlign: "center", paddingHorizontal: 4 },
  statRow: { flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", marginTop: 8 },
  statTextBlock: { alignItems: "center", marginTop: 10, width: "100%" },
  statValue: { fontSize: 24, fontWeight: "800", color: "#0f172a", maxWidth: "100%" },
  statSubtitle: { fontSize: 13, color: "#475569", marginTop: 4, textAlign: "center" },
  circularWrap: { width: 110, height: 110, alignItems: "center", justifyContent: "center" },
  circularCenter: { position: "absolute", alignItems: "center", justifyContent: "center" },
  circularValue: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  circularLabel: { fontSize: 12, fontWeight: "700", color: "#475569", marginTop: -2 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  muted: { color: "#888", fontSize: 14, marginTop: 8 },
  error: { color: "red", fontSize: 14, textAlign: "center", marginBottom: 12 },
  retryBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#f1f1f1", borderRadius: 8 },
  retryText: { fontWeight: "700", color: "#333" },

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
  navItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  navIcon: { width: 30, height: 32, resizeMode: "contain", marginBottom: 4 },
  navText: { fontWeight: "800", fontSize: 12, color: "#000", textAlign: "center" },
});
