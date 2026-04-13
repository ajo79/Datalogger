/*
 * DataScreen.js
 *
 * A simple screen to fetch and display raw data in a list format.
 * Likely used for testing data connectivity independent of the main HomeScreen complex UI.
 *
 * Key Features:
 * - Fetch data on mount using `fetchData` service.
 * - Loading and Error states.
 * - Simple Card display for Temperature and Humidity.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, ActivityIndicator } from 'react-native';
import { fetchData } from '../api/dataService';
import { hexWithAlpha, useAppTheme } from "../theme";

const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on', 'alarm', 'active'].includes(lowered)) return true;
    if (['0', 'false', 'no', 'n', 'off', 'ok', 'normal', 'inactive', 'none'].includes(lowered)) return false;
  }
  return undefined;
};

const formatMetricValue = (value) => {
  const n = Number(value);
  if (Number.isFinite(n)) return Number.isInteger(n) ? String(n) : n.toFixed(2);
  return value == null ? '--' : String(value);
};

/**
 * Component to render individual data items in the list.
 */
const DataItem = ({ item, styles }) => (
  <View style={styles.itemContainer}>
    <Text style={styles.location}>{item.deviceId}</Text>
    <Text style={styles.metaText}>
      {item.deviceName ? `${item.deviceName} · ` : ''}
      {item.siteId ? `Site: ${item.siteId} · ` : ''}
      {item.deviceType ? `Type: ${item.deviceType}` : ''}
    </Text>
    {(Array.isArray(item.parameters) && item.parameters.length
      ? item.parameters
          .filter((p) => p && typeof p === 'object')
          .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0))
      : [
          { key: 'temperature', label: 'Temperature', value: item.temperature, unit: 'C' },
          { key: 'humidity', label: 'Humidity', value: item.humidity, unit: '%' },
        ]
    ).map((metric, idx) => (
      <View style={styles.dataRow} key={`${item.deviceId}_${metric?.key || idx}`}>
        <Text style={styles.dataLabel}>{String(metric?.label || metric?.key || `Metric ${idx + 1}`)}:</Text>
        <Text style={styles.dataValue}>
          {formatMetricValue(metric?.value)}
          {metric?.unit ? ` ${metric.unit}` : ''}
          {parseBoolean(metric?.alarm?.active) ? '  (Alarm)' : ''}
        </Text>
      </View>
    ))}
    <Text style={styles.metaText}>
      Overall Alarm:{' '}
      {parseBoolean(
        item?.status?.overallAlarm ??
          item?.status?.overall_alarm ??
          item?.status?.commonAlarm ??
          item?.commonIssue ??
          item?.commonAlarm
      )
        ? 'Yes'
        : 'No'}
      {Number.isFinite(Number(item?.status?.wifiStrength)) ? ` · Wi-Fi: ${Number(item.status.wifiStrength)}` : ''}
    </Text>
  </View>
);

const DataScreen = () => {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch data when component mounts
    const getData = async () => {
      try {
        const fetchedData = await fetchData();
        setData(fetchedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, []);

  // Loading State
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.brandDark} />
      </View>
    );
  }

  // Error State
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  // Loaded State
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Live Data</Text>
      <FlatList
        data={data}
        renderItem={({ item }) => <DataItem item={item} styles={styles} />}
        keyExtractor={(item, idx) => `${String(item?.deviceId || 'Unknown')}_${String(item?.ts ?? idx)}_${idx}`}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
};

/* ------------------------- STYLES ------------------------- */

function createStyles(theme) {
  const colors = theme.colors;
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: colors.brandDark,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  itemContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: hexWithAlpha(colors.brand, 0.2),
    shadowColor: colors.overlaySoft,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  location: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.brandDark,
    marginBottom: 10,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  dataLabel: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  dataValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.brandDark,
    flexShrink: 1, // Prevent overflow
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: colors.danger,
  },
  });
}

export default DataScreen;
