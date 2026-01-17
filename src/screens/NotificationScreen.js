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
  ScrollView,
} from "react-native";

export default function NotificationScreen({ navigation }) {
  const [isEnabled, setIsEnabled] = useState(false);

  const toggleSwitch = () => setIsEnabled((prev) => !prev);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ===== Header ===== */}
      <View style={styles.header}>
        <Image
          source={require("../../assets/images/WaveTop.png")}
          style={styles.headerImage}
        />
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Image
              source={require("../../assets/images/BackIcon.png")}
              style={styles.iconSmall1}
            />
          </TouchableOpacity>
          <Text style={styles.headerText}>Notification</Text>
        </View>
      </View>

      {/* ===== Page Content ===== */}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.row}>
          <Text style={styles.label}>Notification Enable</Text>
          <Switch
            trackColor={{ false: "#767577", true: "#f4a261" }}
            thumbColor={isEnabled ? "#000" : "#fff"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={toggleSwitch}
            value={isEnabled}
          />
        </View>
      </ScrollView>

      {/* ===== Footer ===== */}
      <ImageBackground
        source={require("../../assets/images/WaveBottom.png")}
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
    flex: 1,
    textAlign: "center",
    fontSize: 25,
    fontWeight: "bold",
    color: "#000",
    marginRight: 32, // Balance the back button width
  },
  iconSmall1: {
    width: 32,
    height: 32,
  },

  /* ===== Content ===== */
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 100,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    fontSize: 20,
    fontWeight: "bold",
    marginRight: 18,

  },

  /* ===== Footer ===== */
  bottomNavBg: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 80,
  },
});
