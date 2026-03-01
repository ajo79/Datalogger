import React from "react";
import { View, Text, StyleSheet, Image, ImageBackground, TouchableOpacity } from "react-native";

export default function BottomWaveNav({ navigation, active = "HOME" }) {
  const items = [
    { key: "HOME", label: "HOM", route: "Home", icon: require("../../assets/images/HomeIcon.png") },
    { key: "GRAPH", label: "GRAP", route: "Graph", icon: require("../../assets/images/GraphIcon.png") },
    { key: "ALARM", label: "ALARM", route: "Alarm", icon: require("../../assets/images/AlarmIcon.png") },
    { key: "MORE", label: "MOR", route: "More", icon: require("../../assets/images/MoreIcon.png") },
  ];

  return (
    <ImageBackground
      source={require("../../assets/images/WaveBottom.png")}
      style={styles.bottomNavBg}
      resizeMode="stretch"
    >
      <View style={styles.navContainer}>
        {items.map((it) => {
          const isActive = it.key === active;
          return (
            <TouchableOpacity
              key={it.key}
              style={styles.navItem}
              onPress={() => navigation.navigate(it.route)}
              activeOpacity={0.8}
            >
              <Image source={it.icon} style={styles.navIcon} />
              <Text style={[styles.navText, isActive && styles.navTextActive]}>
                {it.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bottomNavBg: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 86,
  },
  navContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: "100%",
    paddingBottom: 14, // puts icons nicely on the wave
    paddingHorizontal: 18,
  },
  navItem: { alignItems: "center", justifyContent: "center", width: 70 },
  navIcon: { width: 30, height: 32, resizeMode: "contain", marginBottom: 4 },
  navText: { fontWeight: "800", fontSize: 12, color: "#000" },
  navTextActive: { textDecorationLine: "underline" }, // optional
});
