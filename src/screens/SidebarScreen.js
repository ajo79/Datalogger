import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ImageBackground,
  Alert,
  Image,
  ScrollView,
} from "react-native";

import IMAGES from "../constants/images";
import { clearSession } from "../storage/userStorage";
import { logoutToAuthRoot } from "../navigation/navHelpers";

export default function SidebarScreen({ navigation }) {
  const logoutToAuth = async () => {
    await clearSession();
    logoutToAuthRoot(navigation);
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              await logoutToAuth();
            } catch {
              // no-op
            }
          },
        }
      ],
      { cancelable: true }
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Wave */}
      <ImageBackground
        source={IMAGES.WaveTop}
        style={styles.header}
        resizeMode="stretch"
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerText}>BIOT</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image
            source={require("../../assets/images/BackIcon.png")}
            style={styles.iconSmall1}
          />
        </TouchableOpacity>
        </View>
      </ImageBackground>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Menu Items */}
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("Home")}>
          <Text style={styles.menuText}>🏠 Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("Settings")}>
          <Text style={styles.menuText}>⚙️ Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("Profile")}>
          <Text style={styles.menuText}>👤 Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 Logout</Text>
        </TouchableOpacity>

        {/* Version Number */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Footer Wave */}
      <ImageBackground
        source={IMAGES.WaveBottom}
        style={styles.bottomNavBg}
        resizeMode="stretch"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    width: "100%",
    height: 100,
    justifyContent: "flex-end",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  headerContent: {
    justifyContent: "flex-end",
    alignItems: "flex-start",
  },
  headerText: {
    paddingLeft: 155,
    fontSize: 25,
    fontWeight: "bold",
    color: "#000",
    top: -5,
  },
  iconSmall1: {
    width: 35,
    height: 35,
    left:15,
    top: -35,
  },
  menuItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingHorizontal: 20,
  },
  menuText: {
    fontSize: 18,
    color: "#444",
  },
  logoutText: {
    fontSize: 18,
    color: "#d00",
    fontWeight: "bold",
  },
  scrollContent: {
    paddingBottom: 100,
  },
  versionContainer: {
    marginTop: 50,
    width: "100%",
    alignItems: "center",
  },
  versionText: {
    fontSize: 14,
    color: "#555",
  },
  bottomNavBg: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 80,
  },
});
