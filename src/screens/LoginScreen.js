import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
  ImageBackground,
  Dimensions,
  Linking,
} from 'react-native';
import { saveUser } from '../storage/userStorage';
import { authenticate } from '../api/authService';

const { width } = Dimensions.get("window");

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
   const [submitting, setSubmitting] = useState(false);

  const validateEmail = (value) => /\S+@\S+\.\S+/.test(value);

  const handleForgotPassword = async () => {
    const mailto = `mailto:support@datalogger.app?subject=Password%20Reset%20Request&body=Please%20help%20me%20reset%20my%20password.%20UserID/Email:%20${encodeURIComponent(email || "")}`;
    try {
      const supported = await Linking.canOpenURL(mailto);
      if (supported) {
        await Linking.openURL(mailto);
      } else {
        Alert.alert('Support', 'Email client not available. Please contact support@datalogger.app');
      }
    } catch {
      Alert.alert('Support', 'Unable to open email client right now.');
    }
  };

  const handleLogin = async () => {
    if (!email || !pwd) {
      Alert.alert('Missing info', 'Enter both email and password.');
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    try {
      setSubmitting(true);
      const session = await authenticate(email.trim(), pwd);
      await saveUser({ userId: session.userId, password: pwd });
      navigation.replace('Home');
    } catch (e) {
      Alert.alert('Login failed', e?.message || 'Unable to log in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header (Yellow Wave + Title) */}
      <ImageBackground
        source={require("../../assets/images/WaveTop.png")}
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
        <Image source={require('../../assets/images/shield.png')} style={styles.logo} />

        {/* Subtitle */}
        <Text style={styles.subTitle} numberOfLines={2}>The Advance Datalogger system</Text>
        <Text style={styles.loginTitle}>Login</Text>
        <Text style={styles.signInText}>Sign in to continue.</Text>

        {/* Email Input */}
        <View style={styles.labelContainer}>
          <Text style={styles.label}>EMAIL ID</Text>
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter Email"
            placeholderTextColor="#aaa"
            value={email}
            onChangeText={setEmail}
          />
          <Image source={require("../../assets/images/email.png")} style={styles.icon} />
        </View>

        {/* Password Input */}
        <View style={styles.labelContainer}>
          <Text style={styles.label}>PASSWORD</Text>
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="******"
            placeholderTextColor="#aaa"
            secureTextEntry
            value={pwd}
            onChangeText={setPwd}
          />
          <Image source={require("../../assets/images/lock.png")} style={styles.icon} />
        </View>

        {/* Forgot Password */}
        <TouchableOpacity onPress={handleForgotPassword}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={submitting}
        >
          <Text style={styles.loginButtonText}>{submitting ? 'Signing in...' : 'Login'}</Text>
        </TouchableOpacity>

        {/* Spacer flex to push footer */}
        <View style={{ flex: 1 }} />
      </ScrollView>

      {/* Footer (Yellow Wave + Text) */}
      <ImageBackground
        source={require("../../assets/images/WaveBottom.png")}
        style={styles.footer}
        resizeMode="cover"
      >
        <Text style={styles.footerText}>Proudly Clouded</Text>
      </ImageBackground>
    </SafeAreaView>
  );
};

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
    textAlign: "center",
    paddingHorizontal: 20,
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
  labelContainer: {
    width: "85%",
    alignItems: "flex-start",
    marginTop: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
    marginLeft: 5,
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

export default LoginScreen;
