import React from 'react';
import { BackHandler } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  SafeAreaView,
  // BackHandler,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';  

export default function MoreScreen({ navigation }) {
  const menuItems = [
    { id: 1, title: "Profile", icon: require("./Image/Profilepicicon.png"), type: "image" },
    { id: 2, title: "Settings", icon: require("./Image/SettingIconpng.png"), type: "image" },
    { id: 3, title: "Notifications", icon: require("./Image/AlarmIcon.png"), type: "image" },
    { id: 6, title: "Help & Support",  icon: require("./Image/Help.png"), type: "image" },
    { id: 7, title: "About App", icon: require("./Image/AboutApp.png"), type: "image" },
    { id: 8, title: "Logout", icon: require("./Image/logout.png"), type: "image" },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={require("./Image/WaveTop.png")} style={styles.headerImage} />
        <Text style={styles.headerText}>MORE</Text>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.container}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
          onPress={() => {
          if (item.title === "Profile") {
            navigation.navigate("Profile");
          } else if (item.title === "Settings") {
            navigation.navigate("Settings");
          } else if (item.title === "About App") {
            navigation.navigate("AboutApp");
          } else if (item.title === "Help & Support") {
            navigation.navigate("HelpSupport");
          } else if (item.title === "Notifications") {
            navigation.navigate("Notifications");
          } else if (item.title === "Logout") {
            Alert.alert(
              "Logout",
              "Are you sure you want to logout?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "OK", onPress: () => BackHandler.exitApp() }
              ]
            );
          } else {
            alert(item.title + " clicked");
          }
        }}
      >
            {item.type === "image" ? (
              <Image source={item.icon} style={styles.customIcon} />
            ) : (
              <Icon name={item.icon} size={24} color="#333" style={styles.icon} />
            )}
            <Text style={styles.menuText}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Footer Navigation */}
      <ImageBackground
        source={require("./Image/WaveBottom.png")}
        style={styles.bottomNavBg}
        resizeMode="stretch"
      >
        <View style={styles.navContainer}>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Home")}>
            <Image source={require("./Image/HomeIcon.png")} style={styles.navIcon} />
            <Text style={styles.navText}>HOME</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Graph")}>
            <Image source={require("./Image/GraphIcon.png")} style={styles.navIcon1} />
            <Text style={styles.navText}>GRAPH</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Alarm")}>
            <Image source={require("./Image/AlarmIcon.png")} style={styles.navIcon2} />
            <Text style={styles.navText}>ALARM</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("More")}>
            <Image source={require("./Image/MoreIcon.png")} style={styles.navIcon} />
            <Text style={styles.navText}>MORE</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // backgroundColor: "#f5f5f5",
    backgroundColor: "#fff",
  },

  // Header
  header: {
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  headerImage: {
    position: "absolute",
    top: 0,
    width: "100%",
    height: 80,
    resizeMode: "cover",
  },
  headerText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
  },

  // Content
  container: {
    padding: 20,
    paddingBottom: 120, 
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    marginBottom: 12,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  icon: {
    marginRight: 15,
  },
  customIcon: {
    width: 24,
    height: 24,
    marginRight: 15,
    resizeMode: "contain",
  },
  menuText: {
    fontSize: 18,
    color: "#333",
  },

  // Footer
  bottomNavBg: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 80,
  },
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: '120%',
    paddingHorizontal: 20,
  },
  navItem: {
    alignItems: 'center',
  },
  navIcon: {
    width: 28,
    height: 30,
    marginBottom: 0,
  },
  navIcon1: {
    width: 35,
    height: 30,
    marginBottom: 0,
  },
  navIcon2: {
    width: 25,
    height: 30,
    marginBottom: 0,
  },
  navText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
});
