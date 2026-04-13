import React, { useMemo, useState } from 'react';
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
  Linking,
} from 'react-native';
import { saveSession } from '../storage/userStorage';
import { authenticate } from '../api/authService';
import { hexWithAlpha, useAppTheme } from "../theme";
import { AnimatedPressable } from "../components/ui";

const LoginScreen = ({ navigation }) => {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
    // Only enforce email format if the user typed something that looks like an email.
    if (email.includes('@') && !validateEmail(email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    try {
      setSubmitting(true);
      const session = await authenticate(email.trim(), pwd);
      await saveSession({ userId: session.userId, token: session.token });
      navigation.replace('Home');
    } catch (e) {
      Alert.alert('Login failed', e?.message || 'Unable to log in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerText}>BIOT</Text>
      </View>

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
            placeholderTextColor={theme.colors.inputPlaceholder}
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
            placeholderTextColor={theme.colors.inputPlaceholder}
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
        <AnimatedPressable
          style={styles.loginButton}
          contentStyle={styles.loginButtonInner}
          onPress={handleLogin}
          disabled={submitting}
        >
          <Text style={styles.loginButtonText}>{submitting ? 'Signing in...' : 'Login'}</Text>
        </AnimatedPressable>

        {/* Spacer flex to push footer */}
        <View style={{ flex: 1 }} />
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Proudly Clouded</Text>
      </View>
    </SafeAreaView>
  );
};

function createStyles(theme) {
  const colors = theme.colors;
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.canvas,
    },
  scrollContainer: {
    flexGrow: 1,
    alignItems: "center",
    paddingBottom: 20,
  },
  header: {
    width: "100%",
    height: 86,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: hexWithAlpha(colors.brand, 0.14),
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerText: {
    fontSize: 34,
    fontWeight: "bold",
    color: colors.brandDark,
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
    color: colors.textSecondary,
    marginBottom: 5,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  loginTitle: {
    fontSize: 30,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  signInText: {
    fontSize: 14,
    color: colors.textMuted,
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
    color: colors.textPrimary,
    marginLeft: 5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: hexWithAlpha(colors.brand, 0.36),
    borderRadius: 14,
    paddingHorizontal: 10,
    marginVertical: 5,
    width: "85%",
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    height: 45,
    fontSize: 14,
    color: colors.textPrimary,
  },
  icon: {
    width: 22,
    height: 22,
    tintColor: colors.brandDark,
  },
  forgotText: {
    alignSelf: "flex-start",
    marginTop: 5,
    color: colors.textSecondary,
    fontWeight: "500",
  },

  loginButton: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 60,
    borderRadius: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: hexWithAlpha(colors.brandDark, 0.4),
  },
  loginButtonInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  footer: {
    width: "100%",
    height: 70,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: hexWithAlpha(colors.brand, 0.09),
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  footerText: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  });
}

export default LoginScreen;
