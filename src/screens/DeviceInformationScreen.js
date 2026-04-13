/*
 * DeviceInformationScreen.js
 *
 * This screen provides a detailed view of device information.
 * It features a tabbed interface (Device, Data, Graph, Alarm, Export) to toggle different views.
 * Currently, it renders a list of cabin cards with temperature and humidity data.
 *
 * Key Features:
 * - Custom Tab Bar navigation within the screen.
 * - Interactive tab selection.
 * - Card-based layout for cabin data.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hexWithAlpha, useAppTheme } from "../theme";
import { AnimatedPressable } from "../components/ui";

export default function DeviceInformationScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  // Mock data for cabins
  const cabinData = [
    { id: 1, temperature: 28, humidity: 25 },
    { id: 2, temperature: 28, humidity: 25 },
    { id: 3, temperature: 28, humidity: 25 },
    { id: 4, temperature: 28, humidity: 25 },
  ];

  // Tab configurations
  const tabs = [
    { id: 'device', label: 'Device' },
    { id: 'data', label: 'Data' },
    { id: 'graph', label: 'Graph' },
    { id: 'alarm', label: 'Alarm' },
    { id: 'export', label: 'Export' },
  ];

  // State for currently selected tab
  const [selectedTab, setSelectedTab] = useState('data');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Device Information</Text>
      </View>

      {/* Tab Navigation Bar */}
      <View style={styles.tabsContainer}>
        {tabs.map(tab => (
          <AnimatedPressable
            key={tab.id}
            style={[
              styles.tabButton,
              tab.id === selectedTab && styles.tabButtonActive,
            ]}
            onPress={() => setSelectedTab(tab.id)}
          >
            <Text
              style={[
                styles.tabButtonText,
                tab.id === selectedTab && styles.tabButtonTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </AnimatedPressable>
        ))}
      </View>

      {/* Main Content Area */}
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {cabinData.map(cabin => (
          <View key={cabin.id} style={styles.cabinCard}>
            <Text style={styles.cabinLabel}>Cabin {cabin.id}</Text>
            <Text style={styles.cabinText}>
              Temperature: <Text style={styles.value}>{cabin.temperature} °</Text>
            </Text>
            <Text style={styles.cabinText}>
              Humidity: <Text style={styles.value}>{cabin.humidity} %</Text>
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Footer Section */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Live Data</Text>
      </View>
    </SafeAreaView>
  );
}

/* ------------------------- STYLES ------------------------- */

function createStyles(theme) {
  const colors = theme.colors;
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },

  /* Header Styles */
  header: {
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomColor: 'rgba(255,255,255,0.4)',
    borderBottomWidth: 1,
    backgroundColor: colors.brand,
  },
  headerTitle: {
    fontSize: 18,
    color: colors.white,
    fontWeight: '600',
  },

  /* Tab Bar Styles */
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: hexWithAlpha(colors.brand, 0.9),
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    opacity: 0.6,
  },
  tabButtonActive: {
    backgroundColor: colors.accentSoft,
    opacity: 1,
  },
  tabButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    fontWeight: '700',
    color: colors.brandDark,
  },

  /* Content Styles */
  contentContainer: {
    padding: 10,
    alignItems: 'center',
  },
  cabinCard: {
    width: '90%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: hexWithAlpha(colors.brand, 0.2),
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
    // Shadows
    shadowColor: colors.brand,
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 3,
  },
  cabinLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: colors.textSecondary,
  },
  cabinText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  value: {
    fontWeight: '800',
  },

  /* Footer Styles */
  footer: {
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: colors.brand,
    borderTopColor: 'rgba(255,255,255,0.4)',
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '600',
  },
  });
}
