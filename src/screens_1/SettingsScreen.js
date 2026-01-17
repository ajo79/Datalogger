import React, { useState } from "react";
import { View, Text, StyleSheet, Switch, TouchableOpacity, SafeAreaView } from "react-native";

export default function SettingsScreen() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.header}>Settings</Text>

        {/* Dark Mode */}
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>Dark Mode</Text>
          <Switch value={isDarkMode} onValueChange={setIsDarkMode} />
        </View>

        {/* Notifications */}
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>Enable Notifications</Text>
          <Switch value={notifications} onValueChange={setNotifications} />
        </View>

        {/* Language */}
        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingText}>Language</Text>
          <Text style={styles.settingSub}>English</Text>
        </TouchableOpacity>

        {/* Privacy Policy */}
        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingText}>Privacy Policy</Text>
        </TouchableOpacity>

        {/* Clear Cache */}
        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingText}>Clear Cache</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, padding: 20 },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  settingText: { fontSize: 16, color: "#333" },
  settingSub: { fontSize: 14, color: "#888" },
});
