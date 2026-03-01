import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ImageBackground,
  ScrollView,
  Linking,
  Alert,
} from "react-native";
export default function HelpSupportScreen({ navigation }) {
  const MANUAL_URL = "https://www.blackstarproducts.com";
  const WEBSITE_URL = "https://www.blackstarproducts.com";
  const SUPPORT_EMAIL = "blackstrproductcssupport@gmail.com";

  const openExternal = async (url, fallbackMessage) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert("Not supported", fallbackMessage || "Unable to open this link right now.");
        return;
      }
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert("Action failed", e?.message || "Unable to open link.");
    }
  };

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
              style={styles.moreIcon}
            />
          </TouchableOpacity>
          <Text style={styles.headerText}>Help & Support</Text>
          <View style={{ width: 30 }} />
        </View>
      </View>

      {/* ===== Content ===== */}
      <ScrollView contentContainerStyle={styles.content}>
        {/* Download Section */}
        <View style={styles.row}>
          <Text style={styles.sectionTitle}>Download User Manual</Text>
          <TouchableOpacity
            onPress={() => openExternal(MANUAL_URL, "Manual link is not available on this device.")}
          >
            <Image
              source={require("../../assets/images/DownloadIcon.png")}
              style={styles.downloadIcon}
            />
          </TouchableOpacity>
        </View>
        {/* Contact Nos */}
        <Text style={styles.subTitle}>Contact Nos.</Text>
        <TouchableOpacity onPress={() => openExternal("tel:+919920977089", "Unable to open dialer.")}>
          <Text style={[styles.text, styles.linkText]}>Baburao Patil : +91-9920977089</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => openExternal("tel:+918669751135", "Unable to open dialer.")}>
          <Text style={[styles.text, styles.linkText]}>Anil Patil : +91-8669751135</Text>
        </TouchableOpacity>

        {/* Email */}
        <Text style={styles.subTitle}>Email ID:</Text>
        <TouchableOpacity
          onPress={() =>
            openExternal(
              `mailto:${SUPPORT_EMAIL}?subject=BIOT%20Support%20Request`,
              "Unable to open email client."
            )
          }
        >
          <Text style={[styles.text, styles.linkText]}>{SUPPORT_EMAIL}</Text>
        </TouchableOpacity>

        {/* Website */}
        <Text style={styles.subTitle}>Website:</Text>
        <TouchableOpacity onPress={() => openExternal(WEBSITE_URL, "Unable to open website.")}>
          <Text style={[styles.text, styles.linkText]}>www.blackstarproducts.com</Text>
        </TouchableOpacity>
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
    // backgroundColor: "#f8f4f0",
    backgroundColor: '#fff',
  },

  /* ===== Header ===== */
  header: {
    height: 80,
    justifyContent: "center",
  },
  moreIcon: {
    width: 32,
    height: 32,
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
    fontSize: 25,
    fontWeight: "bold",
    color: "#000",
  },

  /* ===== Content ===== */
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
  },
  subTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 5,
    color: "#000",
  },
  text: {
    fontSize: 18,
    marginBottom: 5,
    color: "#333",
  },
  linkText: {
    color: "#1f5fbf",
    textDecorationLine: "underline",
  },
  downloadIcon: {
    width: 28,
    height: 28,
    resizeMode: "contain",
    // paddingRight : 190,
  },


  /* ===== Footer ===== */
  bottomNavBg: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 80,
  },
});
