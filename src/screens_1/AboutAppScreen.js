import React from "react";
import { View, Text, StyleSheet, SafeAreaView, Linking, TouchableOpacity } from "react-native";

export default function AboutAppScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>About App</Text>

      <Text style={styles.appName}>My IoT Monitoring App</Text>
      <Text style={styles.version}>Version 1.0.0</Text>

      <Text style={styles.description}>
        This application is designed for IoT devices to display alarms, data graphs, and reports.
        It helps users monitor device status in real-time, ensuring they stay updated with important alerts and performance insights.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Developer</Text>
        <Text>ANIL PATIL</Text>
        <TouchableOpacity onPress={() => Linking.openURL("mailto:blacksupport@gmail.com")}>
          <Text style={styles.link}>blacksupport@gmail.com</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>More</Text>
        <TouchableOpacity onPress={() => Linking.openURL("https://myiotapp.com/privacy")}>
          <Text style={styles.link}>Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL("https://myiotapp.com/terms")}>
          <Text style={styles.link}>Terms & Conditions</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  appName: { fontSize: 20, fontWeight: "600", textAlign: "center" },
  version: { fontSize: 14, textAlign: "center", marginBottom: 10 },
  description: { fontSize: 16, textAlign: "center", marginBottom: 20, color: "#555" },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 5 },
  link: { color: "blue", textDecorationLine: "underline" },
});
