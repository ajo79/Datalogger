import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  Dimensions,
  ImageBackground,
  ScrollView,
} from "react-native";

const { width } = Dimensions.get("window");

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <SafeAreaView style={styles.safeArea}>
     
        {/* Header (Yellow Wave + Title) */}
        <ImageBackground
          source={require("./Image/WaveTop.png")}
          style={styles.header}
          resizeMode="cover"
        >
          <Text style={styles.headerText}>BIOT</Text>
        </ImageBackground>
         <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >

        {/* Logo */}
        <Image source={require("./Image/shield.png")} style={styles.logo} />

        {/* Subtitle */}
        <Text style={styles.subTitle}>The Advance Datalogger system</Text>
        <Text style={styles.loginTitle}>Login</Text>
        <Text style={styles.signInText}>Sign in to continue.</Text>

        {/* Email Input */}
        <Text style={styles.label}>EMAIL ID</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter Email"
            placeholderTextColor="#aaa"
            value={email}
            onChangeText={setEmail}
          />
          <Image source={require("./Image/email.png")} style={styles.icon} />
        </View>

        {/* Password Input */}
        <Text style={styles.label}>PASSWORD</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="******"
            placeholderTextColor="#aaa"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Image source={require("./Image/lock.png")} style={styles.icon} />
        </View>

        {/* Forgot Password */}
        <TouchableOpacity>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>

        {/* Spacer flex to push footer */}
        <View style={{ flex: 1 }} />
      </ScrollView>

      {/* Footer (Yellow Wave + Text) */}
      <ImageBackground
        source={require("./Image/WaveBottom.png")}
        style={styles.footer}
        resizeMode="cover"
      >
        <Text style={styles.footerText}>Proudly Clouded</Text>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: "center",
    paddingBottom: 20,
  },
  header: {
    width: "100%",
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#000",
    marginTop: 10,
  },
  logo: {
    width: 180,
    height: 180,
    resizeMode: "contain",
    marginVertical: 10,
  },
  subTitle: {
    fontSize: 14,
    color: "#333",
    marginBottom: 5,
  },
  loginTitle: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#000",
  },
  signInText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
    alignSelf: "flex-start",
    marginLeft: width * 0.08,
    marginTop: 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#004080",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginVertical: 5,
    width: "85%",
  },
  input: {
    flex: 1,
    height: 45,
    fontSize: 14,
    color: "#000",
  },
  icon: {
    width: 22,
    height: 22,
    tintColor: "#004080",
  },
  forgotText: {
    alignSelf: "flex-start",
    marginLeft: width * 0.55,
    marginTop: 5,
    color: "#000",
    fontWeight: "500",
  },
  loginButton: {
    backgroundColor: "#f4a020",
    paddingVertical: 12,
    paddingHorizontal: 60,
    borderRadius: 10,
    marginTop: 20,
    borderWidth: 2,
    borderColor: "#004080",
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  footer: {
    width: "100%",
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },
});
