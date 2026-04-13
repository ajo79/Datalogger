/*
 * AlarmScreen.js
 *
 * This screen displays a log of system alarms and events.
 * Currently, it uses hardcoded dummy data to demonstrate the table layout.
 *
 * Key Features:
 * - Tabular display of alarm history (SrNo, DeviceID, Message, Date, Status).
 * - Horizontal scrolling for wider table content.
 * - Standard navigation and header layout.
 */

import React, { useMemo, useState } from 'react';     // useEffect,
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getAlarms } from '../storage/alarmStorage';
import { fetchDashboardData, fetchESP32Alarms } from '../api/dataService';
import { useResponsiveLayout } from '../theme/responsive';
import { useAppTheme } from "../theme";
import { ModernBottomNav, ModernTopHeader } from "../components/ui";

export default function AlarmScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();
  const ui = useResponsiveLayout();
  const screenWidth = ui.width;
  const tableMinWidth = Math.max(screenWidth, 910);
  const [alarmData, setAlarmData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

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

  const toEpochMs = (value) => {
    const n = Number(value);
    if (Number.isFinite(n)) {
      if (n > 1e16) return Math.round(n / 1e6); // ns -> ms
      if (n > 1e13) return Math.round(n / 1e3); // us -> ms
      if (n > 1e9 && n < 1e12) return Math.round(n * 1000); // s -> ms
      return Math.round(n);
    }
    return undefined;
  };

  const hasAnyParameterAlarm = (item) =>
    Array.isArray(item?.parameters) &&
    item.parameters.some((p) => parseBoolean(p?.alarm?.active) === true);

  const hasAlarm = (item) => {
    const alarmFlag = Number(item?.payload?.alarmFlag ?? item?.alarmFlag);
    if (Number.isFinite(alarmFlag)) return alarmFlag === 1;
    const overall =
      item?.status?.overallAlarm ??
      item?.status?.overall_alarm ??
      item?.status?.commonAlarm ??
      item?.overallAlarm ??
      item?.commonAlarm ??
      item?.commonIssue ??
      item?.["Common Alarm"] ??
      item?.["Common Issue"] ??
      item?.["Common Issues"];
    const parsed = parseBoolean(overall);
    if (typeof parsed === "boolean") return parsed;
    return hasAnyParameterAlarm(item);
  };

  // Helper to pick message with fallbacks and case-insensitive keys
  const pickMessage = (item) => {
    const normalizePayload = (p) => {
      if (!p) return {};
      if (typeof p === "string") {
        try {
          const parsed = JSON.parse(p);
          return parsed && typeof parsed === "object" ? parsed : {};
        } catch {
          return {};
        }
      }
      return typeof p === "object" ? p : {};
    };

    const payload = normalizePayload(item?.payload);
    const candidates = [
      payload.message,
      payload.Message,
      payload.msg,
      item.message,
    ];
    const found = candidates.find((v) => typeof v === "string" && v.trim().length > 0);
    return found ? String(found) : "--";
  };

  // Format timestamp (ms) to "MM-DD-YYYY HH:MM:SS"
  const formatTs = (ts) => {
    const n = Number(ts);
    if (!Number.isFinite(n)) return null;
    const d = new Date(n);
    const pad = (v) => String(v).padStart(2, "0");
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  // Load alarms from API (primary) then fall back to local storage
  const loadAlarms = async () => {
    try {
      const apiData = await fetchESP32Alarms();
      if (Array.isArray(apiData) && apiData.length) {
        setAlarmData(apiData);
        return;
      }

      // BIOT fallback: synthesize alarm rows from telemetry when alarm table is empty.
      const { IoTReadings } = await fetchDashboardData();
      const synthesized = (IoTReadings || [])
        .filter((item) => hasAlarm(item))
        .sort((a, b) => Number(b?.ts || 0) - Number(a?.ts || 0))
        .slice(0, 500)
        .map((item, idx) => ({
          id: `telemetry_${item?.deviceId || "unknown"}_${item?.ts || idx}_${idx}`,
          deviceId: item?.deviceId || "--",
          deviceName: item?.deviceName || item?.device_name || "--",
          status: "Alarm",
          timestamp: toEpochMs(item?.ts),
          ts: toEpochMs(item?.ts),
          message:
            pickMessage(item) !== "--"
              ? pickMessage(item)
              : Array.isArray(item?.parameters)
                ? item.parameters
                    .filter((p) => parseBoolean(p?.alarm?.active) === true)
                    .map((p) => String(p?.label || p?.key || "Parameter"))
                    .join(", ") || "Telemetry alarm"
                : "Telemetry alarm",
          payload: item?.payload,
          ackBy: "--",
          ackDateTime: "--",
        }));

      if (synthesized.length) {
        setAlarmData(synthesized);
        return;
      }
    } catch (e) {
      // ignore and fall back to local storage
    }
    const localData = await getAlarms();
    setAlarmData(localData || []);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAlarms();
    setRefreshing(false);
  };

  // Reload when screen comes into focus, and poll every 1s
  useFocusEffect(() => {
    loadAlarms();
    const interval = setInterval(loadAlarms, 1000);
    return () => clearInterval(interval);
  });

  /**
   * Renders a single row of the alarm table.
   */
  const renderItem = ({ item, index }) => {
    // Prefer payload fields first, then root fields
    const status = (() => {
      const flag = Number(item?.payload?.alarmFlag ?? item.alarmFlag);
      if (Number.isFinite(flag)) return flag === 1 ? "Active" : "Cleared";
      return hasAlarm(item) ? "Active" : "Cleared";
    })();
    const deviceName =
      item?.payload?.deviceName ||
      item?.payload?.device_name ||
      item.deviceName ||
      item.device_name ||
      // try to parse name suffix from message like "Device alarm ... - Machine"
      (item.message && String(item.message).includes("-")
        ? String(item.message).split("-").pop().trim()
        : "--");
    const ackBy = item.ackBy || item.ack_by || "--";
    const ackDateTime = item.ackDateTime || item.ack_date_time || "--";
    const message = pickMessage(item);
    const dateTime = formatTs(item?.ts) || "--";

    return (
    <View style={styles.row}>
        <Text
          style={[styles.cellSrNo, { fontSize: ui.font(12, { min: 10, max: 13 }) }]}
          maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
        >
          {index + 1}
        </Text>
        <Text
          style={[styles.cellDevice, { fontSize: ui.font(12, { min: 10, max: 13 }) }]}
          numberOfLines={1}
          maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
        >
          {item.deviceId || "--"}
        </Text>
        <Text
          style={[styles.cellDeviceName, { fontSize: ui.font(12, { min: 10, max: 13 }) }]}
          numberOfLines={2}
          maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
        >
          {deviceName}
        </Text>
        <Text
          style={[styles.cellMessage, { fontSize: ui.font(12, { min: 10, max: 13 }) }]}
          numberOfLines={2}
          maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
        >
          {message}
        </Text>
        <Text
          style={[styles.cellDate, { fontSize: ui.font(12, { min: 10, max: 13 }) }]}
          numberOfLines={1}
          maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
        >
          {dateTime}
        </Text>
        <Text
          style={[styles.cellStatus, { fontSize: ui.font(12, { min: 10, max: 13 }) }]}
          numberOfLines={1}
          maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
        >
          {status}
        </Text>
        <Text
          style={[styles.cellAckBy, { fontSize: ui.font(12, { min: 10, max: 13 }) }]}
          numberOfLines={1}
          maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
        >
          {ackBy}
        </Text>
        <Text
          style={[styles.cellAckDate, { fontSize: ui.font(12, { min: 10, max: 13 }) }]}
          numberOfLines={1}
          maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
        >
          {ackDateTime}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ModernTopHeader
        title="ALARM"
        leftIcon={require("../../assets/images/MoreTop.png")}
        onLeftPress={() => navigation.navigate("Sidebar")}
      />

      {/* --- Data Table Section --- */}
      <ScrollView style={styles.tableScrollArea} horizontal>
        <View style={[styles.tableContainer, { minWidth: tableMinWidth }]}>
          {/* Table Header */}
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.cellSrNo, styles.headerCell, { fontSize: ui.font(12, { min: 10, max: 13 }) }]}>Sr. No.</Text>
            <Text style={[styles.cellDevice, styles.headerCell, { fontSize: ui.font(12, { min: 10, max: 13 }) }]}>Device ID</Text>
            <Text style={[styles.cellDeviceName, styles.headerCell, { fontSize: ui.font(12, { min: 10, max: 13 }) }]}>Device Name</Text>
            <Text style={[styles.cellMessage, styles.headerCell, { fontSize: ui.font(12, { min: 10, max: 13 }) }]}>Message</Text>
            <Text style={[styles.cellDate, styles.headerCell, { fontSize: ui.font(12, { min: 10, max: 13 }) }]}>Alarm Date Time</Text>
            <Text style={[styles.cellStatus, styles.headerCell, { fontSize: ui.font(12, { min: 10, max: 13 }) }]}>Status</Text>
            <Text style={[styles.cellAckBy, styles.headerCell, { fontSize: ui.font(12, { min: 10, max: 13 }) }]}>Ack By</Text>
            <Text style={[styles.cellAckDate, styles.headerCell, { fontSize: ui.font(12, { min: 10, max: 13 }) }]}>Ack Date Time</Text>
          </View>

          {/* Table Rows */}
            <FlatList
              data={alarmData}
              renderItem={renderItem}
              keyExtractor={(item, idx) =>
                String(item?.id ?? `${item?.deviceId || "unknown"}_${item?.timestamp ?? item?.ts ?? idx}_${idx}`)
              }
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No alarm history found.</Text>
            }
          />
        </View>
      </ScrollView>

      <ModernBottomNav navigation={navigation} activeRoute="Alarm" />
    </SafeAreaView>
  );
}

/* ------------------------- STYLES ------------------------- */

function createStyles(theme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.canvas,
    },
    tableScrollArea: {
      marginBottom: 108,
    },
    tableContainer: {
      paddingRight: 6,
    },
    row: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingVertical: 10,
      paddingHorizontal: 5,
      alignItems: 'center',
      backgroundColor: theme.colors.tableRow,
    },
    headerRow: {
      backgroundColor: theme.colors.surfaceAlt,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    headerCell: {
      fontWeight: 'bold',
      color: theme.colors.textPrimary,
    },
    cellSrNo: {
      width: 60,
      padding: 8,
      fontSize: 12,
      textAlign: 'center',
      borderRightWidth: 1,
      borderColor: theme.colors.border,
      color: theme.colors.textPrimary,
    },
    cellDevice: {
      width: 90,
      padding: 8,
      fontSize: 12,
      textAlign: 'center',
      borderRightWidth: 1,
      borderColor: theme.colors.border,
      color: theme.colors.textPrimary,
    },
    cellDeviceName: {
      width: 130,
      padding: 8,
      fontSize: 12,
      textAlign: 'left',
      borderRightWidth: 1,
      borderColor: theme.colors.border,
      color: theme.colors.textPrimary,
    },
    cellMessage: {
      width: 160,
      padding: 8,
      fontSize: 12,
      textAlign: 'left',
      borderRightWidth: 1,
      borderColor: theme.colors.border,
      color: theme.colors.textPrimary,
    },
    cellDate: {
      width: 150,
      padding: 8,
      fontSize: 12,
      textAlign: 'center',
      borderRightWidth: 1,
      borderColor: theme.colors.border,
      color: theme.colors.textPrimary,
    },
    cellStatus: {
      width: 80,
      padding: 4,
      fontSize: 12,
      textAlign: 'center',
      borderRightWidth: 1,
      borderColor: theme.colors.border,
      color: theme.colors.textPrimary,
    },
    cellAckBy: {
      width: 90,
      padding: 8,
      fontSize: 12,
      textAlign: 'center',
      borderRightWidth: 1,
      borderColor: theme.colors.border,
      color: theme.colors.textPrimary,
    },
    cellAckDate: {
      width: 150,
      padding: 8,
      fontSize: 12,
      textAlign: 'center',
      color: theme.colors.textPrimary,
    },
    emptyText: {
      textAlign: 'center',
      margin: 20,
      color: theme.colors.textMuted,
    },
  });
}
