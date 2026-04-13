import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Switch,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { goBackWithFallback } from "../navigation/navHelpers";
import { useAppTheme } from "../theme";
import { ModernTopHeader } from "../components/ui";

const NOTIFICATION_TOGGLE_KEY = "@notification_enabled_v1";

export default function NotificationScreen({ navigation }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isEnabled, setIsEnabled] = useState(false);

  const toggleSwitch = () => setIsEnabled((prev) => !prev);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(NOTIFICATION_TOGGLE_KEY);
        if (!mounted) return;
        setIsEnabled(raw === "1");
      } catch {
        // no-op
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(NOTIFICATION_TOGGLE_KEY, isEnabled ? "1" : "0").catch(() => {});
  }, [isEnabled]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ModernTopHeader
        title="Notification"
        leftIcon={require("../../assets/images/BackIcon.png")}
        onLeftPress={() => goBackWithFallback(navigation, "More")}
      />

      {/* ===== Page Content ===== */}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.row}>
          <Text style={styles.label}>Notification Enable</Text>
          <Switch
            trackColor={{ false: theme.colors.borderStrong, true: theme.colors.accent }}
            thumbColor={isEnabled ? theme.colors.navActive : theme.colors.surfaceElevated}
            ios_backgroundColor={theme.colors.borderStrong}
            onValueChange={toggleSwitch}
            value={isEnabled}
          />
        </View>
      </ScrollView>

      <View style={styles.bottomNavBg} />
    </SafeAreaView>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.canvas,
    },
    content: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingBottom: 24,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
    },
    label: {
      fontSize: 20,
      fontWeight: "bold",
      marginRight: 18,
      color: theme.colors.textPrimary,
    },
    bottomNavBg: {
      height: 20,
    },
  });
}
