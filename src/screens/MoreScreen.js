/*
 * MoreScreen.js
 *
 * This screen serves as the "More" or "Menu" tab.
 * It provides access to secondary features like Profile, Notifications, Help, About, and Logout.
 *
 * Key Features:
 * - List of actionable menu items.
 * - Navigation to sub-screens.
 * - Logout confirmation logic with app exit.
 */

import React, { useMemo } from 'react';
import {
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';

import IMAGES from "../constants/images";
import { clearSession } from '../storage/userStorage';
import { logoutToAuthRoot } from '../navigation/navHelpers';
import { useResponsiveLayout } from '../theme/responsive';
import { useAppTheme } from "../theme";
import { ModernBottomNav, ModernTopHeader } from "../components/ui";

export default function MoreScreen({ navigation }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const ui = useResponsiveLayout();
  const isNarrow = ui.isCompact;

  const logoutToAuth = async () => {
    await clearSession();
    logoutToAuthRoot(navigation);
  };

  // Menu Configuration
  const menuItems = [
    { id: 1, title: "Profile", icon: IMAGES.ProfilePic, type: "image" },
    { id: 2, title: "Settings", icon: IMAGES.SettingIcon, type: "image" },
    { id: 4, title: "Factory Settings", icon: IMAGES.SettingIcon, type: "image" },
    { id: 3, title: "Notifications", icon: IMAGES.AlarmIcon, type: "image" },
    { id: 6, title: "Help & Support", icon: IMAGES.HelpIcon, type: "image" },
    { id: 7, title: "About App", icon: IMAGES.AboutAppIcon, type: "image" },
    { id: 8, title: "Logout", icon: IMAGES.LogoutIcon, type: "image" },
  ];

  /**
   * Handles menu item clicks.
   * Navigates to respective screens or triggers logout alert.
   */
  const handleMenuPress = (item) => {
    switch (item.title) {
      case "Profile":
        navigation.navigate("Profile");
        break;
      case "Notifications":
        navigation.navigate("Notifications");
        break;
      case "Settings":
        navigation.navigate("Settings");
        break;
      case "Factory Settings":
        navigation.navigate("FactorySettings");
        break;
      case "Help & Support":
        navigation.navigate("HelpSupport");
        break;
      case "About App":
        navigation.navigate("AboutApp");
        break;
      case "Logout":
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
        break;
      default:
        Alert.alert(item.title + " clicked");
        break;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ModernTopHeader
        title="MORE"
        leftIcon={IMAGES.MoreTop}
        onLeftPress={() => navigation.navigate('Sidebar')}
      />

      {/* Menu Items List */}
      <ScrollView contentContainerStyle={[styles.container, isNarrow && styles.containerNarrow]}>
        {menuItems.map(item => (
          <TouchableOpacity
            key={item.id}
            style={[styles.menuItem, isNarrow && styles.menuItemNarrow]}
            onPress={() => handleMenuPress(item)}
          >
            <Image
              source={item.icon}
              style={[styles.customIcon, { width: ui.size(24, { min: 20, max: 26 }), height: ui.size(24, { min: 20, max: 26 }) }]}
            />
            <Text
              style={[
                styles.menuText,
                isNarrow && styles.menuTextNarrow,
                { fontSize: ui.font(18, { min: 14, max: 19 }) },
              ]}
              numberOfLines={1}
              maxFontSizeMultiplier={ui.maxFontSizeMultiplier}
            >
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ModernBottomNav navigation={navigation} activeRoute="More" />
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
    container: {
      padding: 20,
      paddingBottom: 116,
    },
    containerNarrow: {
      paddingHorizontal: 12,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.cardBackground,
      borderColor: theme.colors.cardBorder,
      borderWidth: 1,
      padding: 15,
      marginBottom: 12,
      borderRadius: 10,
      shadowColor: theme.colors.overlaySoft,
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 3,
      minHeight: 56,
    },
    menuItemNarrow: {
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    customIcon: {
      width: 24,
      height: 24,
      marginRight: 15,
      resizeMode: "contain",
      tintColor: theme.colors.navActive,
    },
    menuText: {
      fontSize: 18,
      color: theme.colors.textPrimary,
      flex: 1,
      minWidth: 0,
    },
    menuTextNarrow: {
      fontSize: 16,
    },
  });
}
