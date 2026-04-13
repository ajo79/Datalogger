import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
} from "react-native";

import { clearSession } from "../storage/userStorage";
import { goBackWithFallback, logoutToAuthRoot } from "../navigation/navHelpers";
import { useAppTheme } from "../theme";
import { ModernTopHeader } from "../components/ui";

export default function SidebarScreen({ navigation }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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
      <ModernTopHeader
        title="BIOT"
        leftIcon={require("../../assets/images/BackIcon.png")}
        onLeftPress={() => goBackWithFallback(navigation, "Home")}
      />

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

      <View style={styles.bottomNavBg} />
    </SafeAreaView>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.canvas,
    },
    menuItem: {
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingHorizontal: 20,
    },
    menuText: {
      fontSize: 18,
      color: theme.colors.textSecondary,
    },
    logoutText: {
      fontSize: 18,
      color: theme.colors.danger,
      fontWeight: "bold",
    },
    scrollContent: {
      paddingBottom: 24,
    },
    versionContainer: {
      marginTop: 50,
      width: "100%",
      alignItems: "center",
    },
    versionText: {
      fontSize: 14,
      color: theme.colors.textMuted,
    },
    bottomNavBg: {
      height: 20,
    },
  });
}
