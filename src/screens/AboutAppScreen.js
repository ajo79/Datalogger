/*
 * AboutAppScreen.js
 *
 * This screen displays information about the application, including version and description.
 * It follows the standard app layout with a Wave header and footer.
 *
 * Key Features:
 * - Displays App Name, Version, and Description.
 * - Simple textual content within a ScrollView.
 * - Standard navigation header with "Back" functionality.
 */

import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { navigateToTabRoute } from "../navigation/navHelpers";
import { useAppTheme } from "../theme";
import { ModernTopHeader } from "../components/ui";

export default function AboutAppScreen({ navigation }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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
    navigateToTabRoute(navigation, "More");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ModernTopHeader
        title="About App"
        leftIcon={require("../../assets/images/BackIcon.png")}
        onLeftPress={handleBack}
      />

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* App Info Section */}
        <Text style={styles.appName}>My IoT Monitoring App</Text>
        <Text style={styles.version}>Version 1.0.0</Text>

        <Text style={styles.description}>
          {"     "}This application is designed for IoT devices to display alarms, data graphs, and reports.
          It helps users monitor device status in real-time, ensuring they stay updated with important alerts and performance insights.
        </Text>
      </ScrollView>

      <View style={styles.bottomNavBg} />
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
    scrollContent: {
      paddingBottom: 24,
    },
    appName: {
      fontSize: 20,
      fontWeight: "600",
      textAlign: "center",
      marginTop: 20,
      color: theme.colors.textPrimary,
    },
    version: {
      fontSize: 14,
      textAlign: "center",
      marginBottom: 10,
      color: theme.colors.textSecondary,
    },
    description: {
      fontSize: 16,
      textAlign: "justify",
      marginBottom: 20,
      color: theme.colors.textMuted,
      paddingHorizontal: 20,
      lineHeight: 22,
      fontWeight: "500",
    },
    firstLine: {
      marginLeft: 20,
    },
    bottomNavBg: {
      height: 20,
    },
  });
}
