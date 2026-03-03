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

import React, { useState } from 'react';     // useEffect,
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ImageBackground,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getAlarms } from '../storage/alarmStorage';
import { fetchDashboardData, fetchESP32Alarms } from '../api/dataService';
import { navigateToTabRoute } from '../navigation/navHelpers';
import { useResponsiveLayout } from '../theme/responsive';

export default function AlarmScreen() {
  const navigation = useNavigation();
  const ui = useResponsiveLayout();
  const screenWidth = ui.width;
  const navigateToTab = (route) => navigateToTabRoute(navigation, route);
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
      if (n > 1e9 && n < 1e12) return Math.round(n * 1000);
      return Math.round(n);
    }
    return Date.now();
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
      if (Number.isFinite(flag)) return flag === 1 ? "Alarm" : "Ok";
      return hasAlarm(item) ? "Alarm" : (item.status || "Ok");
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
    const dateTime =
      formatTs(item.timestamp ?? item.ts) ||
      item.dateTime ||
      item.date_time ||
      "--";

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
      {/* Header Wave Image */}
      <Image source={require('../../assets/images/WaveTop.png')} style={styles.headerImage} />

      {/* Top Header Bar */}
      <View style={[styles.topHeader, { paddingHorizontal: ui.contentHorizontalPadding }]}>
        {/* Left Sidebar Toggle */}
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('Sidebar')}>
            <Image
              source={require('../../assets/images/MoreTop.png')}
              style={styles.iconSmall1}
            />
          </TouchableOpacity>
        </View>

        {/* Screen Title */}
        <Text
          style={[styles.headerText, { fontSize: ui.font(25, { min: 21, max: 27 }) }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
        >
          ALARM
        </Text>

        {/* Right Spacer for Symmetry */}
        <View style={styles.headerLeft} />
      </View>

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

      {/* --- Bottom Navigation Bar --- */}
      <ImageBackground
        source={require('../../assets/images/WaveBottom.png')}
        style={styles.bottomNavBg}
        resizeMode="stretch"
      >
        <View style={styles.navContainer}>
          <TouchableOpacity style={styles.navItem} onPress={() => navigateToTab('Dashboard')}>
            <Image source={require('../../assets/images/GraphIcon.png')} style={[styles.navIcon, { width: ui.navIconSize, height: ui.navIconSize + 2 }]} />
            <Text
              style={[styles.navText, { fontSize: ui.navTextSize }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
            >
              DASH
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigateToTab('Home')}>
            <Image source={require('../../assets/images/HomeIcon.png')} style={[styles.navIcon, { width: ui.navIconSize, height: ui.navIconSize + 2 }]} />
            <Text
              style={[styles.navText, { fontSize: ui.navTextSize }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
            >
              HOME
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigateToTab('Graph')}>
            <Image source={require('../../assets/images/GraphIcon.png')} style={[styles.navIcon1, { width: ui.navIconSize + 4, height: ui.navIconSize + 2 }]} />
            <Text
              style={[styles.navText, { fontSize: ui.navTextSize }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
            >
              GRAPH
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigateToTab('Alarm')}>
            <Image source={require('../../assets/images/AlarmIcon.png')} style={[styles.navIcon2, { width: ui.navIconSize - 2, height: ui.navIconSize + 2 }]} />
            <Text
              style={[styles.navText, { fontSize: ui.navTextSize }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
            >
              ALARM
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigateToTab('More')}>
            <Image source={require('../../assets/images/MoreIcon.png')} style={[styles.navIcon, { width: ui.navIconSize, height: ui.navIconSize + 2 }]} />
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

/* ------------------------- STYLES ------------------------- */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
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
    color: '#000',
    textAlign: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },

  /* Table Layout */
  tableScrollArea: {
    marginBottom: 90,
  },
  tableContainer: {
    paddingRight: 6, // keeps right-most column readable near edge on small screens
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
  },
  headerRow: {
    backgroundColor: '#f1f1f1',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  headerCell: {
    fontWeight: 'bold',
    color: '#000',
  },

  // Column Styles
  cellSrNo: {
    width: 60,
    padding: 8,
    fontSize: 12,
    textAlign: 'center',
    borderRightWidth: 1,
    borderColor: '#ddd',
  },
  cellDevice: {
    width: 90,
    padding: 8,
    fontSize: 12,
    textAlign: 'center',
    borderRightWidth: 1,
    borderColor: '#ddd',
  },
  cellDeviceName: {
    width: 130,
    padding: 8,
    fontSize: 12,
    textAlign: 'left',
    borderRightWidth: 1,
    borderColor: '#ddd',
  },
  cellMessage: {
    width: 160, // Flexible width for longer text
    padding: 8,
    fontSize: 12,
    textAlign: 'left',
    borderRightWidth: 1,
    borderColor: '#ddd',
  },
  cellDate: {
    width: 150,
    padding: 8,
    fontSize: 12,
    textAlign: 'center',
    borderRightWidth: 1,
    borderColor: '#ddd',
  },
  cellStatus: {
    width: 80,
    padding: 4,
    fontSize: 12,
    textAlign: 'center',
    borderRightWidth: 1,
    borderColor: '#ddd',
  },
  cellAckBy: {
    width: 90,
    padding: 8,
    fontSize: 12,
    textAlign: 'center',
    borderRightWidth: 1,
    borderColor: '#ddd',
  },
  cellAckDate: {
    width: 150,
    padding: 8,
    fontSize: 12,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    margin: 20,
    color: '#888',
  },


  /* Bottom Navigation Layout */
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
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: {
    width: 28,
    height: 30,
    resizeMode: 'contain',
    marginBottom: 4,
  },
  navIcon1: {
    width: 35,
    height: 30,
    resizeMode: 'contain',
    marginBottom: 4,
  },
  navIcon2: {
    width: 25,
    height: 30,
    resizeMode: 'contain',
    marginBottom: 4,
  },
  navText: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#000',
    textAlign: 'center',
  },
});
