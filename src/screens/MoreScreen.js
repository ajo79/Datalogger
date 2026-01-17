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

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  StyleSheet,
  Alert,
  BackHandler
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import IMAGES from "../constants/images";

export default function MoreScreen({ navigation }) {
  const navigateToTab = (route) => {
    if (navigation?.navigate) {
      navigation.navigate(route);
      return;
    }
    navigation.getParent()?.navigate('Home', { screen: route });
  };
  // Menu Configuration
  const menuItems = [
    { id: 1, title: "Profile", icon: IMAGES.ProfilePic, type: "image" },
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
            { text: "Yes", onPress: () => BackHandler.exitApp() }
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
      {/* Top Header */}
      <Image source={IMAGES.WaveTop} style={styles.headerImage} />

      <View style={styles.topHeader}>
        {/* Left Sidebar Button */}
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('Sidebar')}>
            <Image source={IMAGES.MoreTop} style={styles.iconSmall1} />
          </TouchableOpacity>
        </View>

        {/* Screen Title */}
        <Text style={styles.headerText}>MORE</Text>

        {/* Right Spacer */}
        <View style={styles.headerLeft} />
      </View>

      {/* Menu Items List */}
      <ScrollView contentContainerStyle={styles.container}>
        {menuItems.map(item => (
          <TouchableOpacity key={item.id} style={styles.menuItem} onPress={() => handleMenuPress(item)}>
            <Image source={item.icon} style={styles.customIcon} />
            <Text style={styles.menuText}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <ImageBackground source={IMAGES.WaveBottom} style={styles.bottomNavBg} resizeMode="stretch">
        <View style={styles.navContainer}>
          <TouchableOpacity style={styles.navItem} onPress={() => navigateToTab("Dashboard")}>
            <Image source={IMAGES.HomeIcon} style={styles.navIcon} />
            <Text style={styles.navText} numberOfLines={1} adjustsFontSizeToFit>HOME</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigateToTab("Graph")}>
            <Image source={IMAGES.GraphIcon} style={styles.navIcon1} />
            <Text style={styles.navText} numberOfLines={1} adjustsFontSizeToFit>GRAPH</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigateToTab("Alarm")}>
            <Image source={IMAGES.AlarmIcon} style={styles.navIcon2} />
            <Text style={styles.navText} numberOfLines={1} adjustsFontSizeToFit>ALARM</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigateToTab("More")}>
            <Image source={IMAGES.MoreIcon} style={styles.navIcon} />
            <Text style={styles.navText} numberOfLines={1} adjustsFontSizeToFit>MORE</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

/* ------------------------- STYLES ------------------------- */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff'
  },

  /* Header Layout */
  headerImage: {
    width: '100%',
    height: 80,
    resizeMode: 'cover'
  },
  topHeader: {
    position: 'absolute',
    top: 25,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    zIndex: 10
  },
  iconSmall1: {
    width: 28,
    height: 24,
    resizeMode: 'contain',
  },
  headerLeft: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    flex: 1
  },

  /* Menu List */
  container: {
    padding: 20,
    paddingBottom: 120 // Space for bottom nav
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    marginBottom: 12,
    borderRadius: 10,
    // Shadows
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3
  },
  customIcon: {
    width: 24,
    height: 24,
    marginRight: 15,
    resizeMode: "contain"
  },
  menuText: {
    fontSize: 18,
    color: "#333"
  },

  /* Bottom Navigation */
  bottomNavBg: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 86,
    justifyContent: "center",
  },
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '100%',
    paddingBottom: 10
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  navIcon: {
    width: 28,
    height: 30,
    resizeMode: 'contain',
    marginBottom: 4
  },
  navIcon1: {
    width: 35,
    height: 30,
    resizeMode: 'contain',
    marginBottom: 4
  },
  navIcon2: {
    width: 25,
    height: 30,
    resizeMode: 'contain',
    marginBottom: 4
  },
  navText: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#000',
    textAlign: 'center'
  },
});
