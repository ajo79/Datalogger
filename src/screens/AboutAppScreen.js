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

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  // Linking,
  TouchableOpacity,
  Image,
  ImageBackground,
  ScrollView
} from "react-native";

export default function AboutAppScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Wave Header */}
      <Image source={require("../../assets/images/WaveTop.png")} style={styles.headerImage} />

      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        {/* Back Button */}
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image
            source={require("../../assets/images/BackIcon.png")}
            style={styles.iconSmall1}
          />
        </TouchableOpacity>

        {/* Screen Title */}
        <Text style={styles.headerText}>About App</Text>

        {/* Dummy view for layout balance */}
        <View style={styles.headerSpacer} />
      </View>

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

      {/* Footer Wave */}
      <ImageBackground
        source={require("../../assets/images/WaveBottom.png")}
        style={styles.bottomNavBg}
        resizeMode="stretch"
      />
    </SafeAreaView>
  );
}

/* ------------------------- STYLES ------------------------- */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff"
  },

  /* Header Styles */
  headerImage: {
    width: "100%",
    height: 80,
    resizeMode: "cover"
  },
  topHeader: {
    position: "absolute",
    top: 25,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    zIndex: 10,
  },
  headerSpacer: {
    width: 28,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  iconSmall1: {
    width: 32,
    height: 32,
  },
  headerText: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    flex: 1,
  },

  /* Content Styles */
  appName: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 20,
  },
  version: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10
  },
  description: {
    fontSize: 16,
    textAlign: "justify",
    marginBottom: 20,
    color: "#555",
    paddingHorizontal: 20,
    lineHeight: 22,
    fontWeight: "490", // Note: 490 might fallback to 400 or 500 depending on font support
  },
  firstLine: {
    marginLeft: 20,
  },

  /* Footer Styles */
  bottomNavBg: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 80,
  },
});
