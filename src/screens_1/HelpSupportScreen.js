import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ImageBackground,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

export default function HelpSupportScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ===== Header ===== */}
      <View style={styles.header}>
        <Image
          source={require("./Image/WaveTop.png")}
          style={styles.headerImage}
        />
        <View style={styles.topHeader}>
          <TouchableOpacity>
          <Image
            source={require("./Image/MoreTop.png")} 
            style={styles.moreIcon}
          />
        </TouchableOpacity>
          <Text style={styles.headerText}>Help & Support</Text>
          <View style={{ width: 30 }} /> 
        </View>
      </View>

      {/* ===== Content ===== */}
      <View style={styles.content}>
        {/* Download Section */}
        <View style={styles.row}>
          <Text style={styles.sectionTitle}>Download User Manual</Text>
          <TouchableOpacity>
          <Image
            source={require("./Image/DownloadIcon.png")}  
            style={styles.downloadIcon}
          />
        </TouchableOpacity>
      </View>
        {/* Contact Nos */}
        <Text style={styles.subTitle}>Contact Nos.</Text>
        <Text style={styles.text}>Baburao Patil : +91-9920977089</Text>
        <Text style={styles.text}>Anil Patil : +91-8669751135</Text>

        {/* Email */}
        <Text style={styles.subTitle}>Email ID:</Text>
        <Text style={styles.text}>blackstrproductcssupport@gmail.com</Text>

        {/* Website */}
        <Text style={styles.subTitle}>Website:</Text>
        <Text style={styles.text}>www.blackstarproducts.com</Text>
      </View>

      {/* ===== Footer ===== */}
      <ImageBackground
        source={require("./Image/WaveBottom.png")}
        style={styles.bottomNavBg}
        resizeMode="stretch"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f4f0",
  },

  /* ===== Header ===== */
  header: {
    height: 80,
    justifyContent: "center",
  },
  moreIcon :{
  width: 28,
    height: 28,
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
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
  },

  /* ===== Content ===== */
  content: {
    flex: 1,
    padding: 20,
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
