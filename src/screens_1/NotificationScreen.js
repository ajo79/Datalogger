import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  ImageBackground,
  TouchableOpacity,
  Switch,
} from "react-native";

export default function NotificationScreen({ navigation }) {
  const [isEnabled, setIsEnabled] = useState(false);

  const toggleSwitch = () => setIsEnabled((prev) => !prev);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ===== Header ===== */}
      <View style={styles.header}>
        <Image
          source={require("./Image/WaveTop.png")}
          style={styles.headerImage}
        />
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => navigation.openDrawer?.()}>
            <Image
              source={require("./Image/MoreTop.png")}
              style={styles.iconSmall1}
            />
          </TouchableOpacity>
          <Text style={styles.headerText}>Notification</Text>
        </View>
      </View>

      {/* ===== Page Content ===== */}
      <View style={styles.content}>
        <Text style={styles.label}>Notification Enable</Text>
        <Switch
          trackColor={{ false: "#767577", true: "#f4a261" }}
          thumbColor={isEnabled ? "#000" : "#fff"}
          ios_backgroundColor="#3e3e3e"
          onValueChange={toggleSwitch}
          value={isEnabled}
        />
      </View>

      {/* ===== Footer ===== */}
      <ImageBackground
        source={require("./Image/WaveBottom.png")}
        style={styles.bottomNavBg}
        resizeMode="stretch"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },

  /* ===== Header ===== */
  header: {
    height: 80,
    justifyContent: "center",
  },
  headerImage: {
    position: "absolute",
    top: 0,
    width: "100%",
    height: 80,
    resizeMode: "cover",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    height: "100%",
  },
  headerText: {
    alignItems: "center",
    paddingRight :120,
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
  },
  iconSmall1: {
    width: 28,
    height: 28,
  },

  /* ===== Content ===== */
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom : 660,
  },
  label: {
    fontSize: 20,
    fontWeight: "bold",
    marginRight: 15,
    
  },

  /* ===== Footer ===== */
  bottomNavBg: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 80,
  },
});
