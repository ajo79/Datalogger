import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
  Linking,
  Alert,
} from "react-native";
import { goBackWithFallback } from "../navigation/navHelpers";
import { useAppTheme } from "../theme";
import { ModernTopHeader } from "../components/ui";
export default function HelpSupportScreen({ navigation }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
      <ModernTopHeader
        title="Help & Support"
        leftIcon={require("../../assets/images/BackIcon.png")}
        onLeftPress={() => goBackWithFallback(navigation, "More")}
      />

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
      padding: 20,
      paddingBottom: 24,
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
      color: theme.colors.textPrimary,
    },
    subTitle: {
      fontSize: 22,
      fontWeight: "bold",
      marginTop: 20,
      marginBottom: 5,
      color: theme.colors.textPrimary,
    },
    text: {
      fontSize: 18,
      marginBottom: 5,
      color: theme.colors.textSecondary,
    },
    linkText: {
      color: theme.colors.brand,
      textDecorationLine: "underline",
    },
    downloadIcon: {
      width: 28,
      height: 28,
      resizeMode: "contain",
      tintColor: theme.colors.navActive,
    },
    bottomNavBg: {
      height: 20,
    },
  });
}
