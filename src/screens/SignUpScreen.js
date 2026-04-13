import React, { useMemo, useState } from "react";
import { saveSession, saveUser } from "../storage/userStorage";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { navigateToTabRoute } from "../navigation/navHelpers";
import { hexWithAlpha, useAppTheme } from "../theme";
import { AnimatedPressable } from "../components/ui";

export default function SignUpScreen({ navigation }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const colors = theme.colors;
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSignUp = async () => {
    // Save only when we actually have userId/password and they match.
    // (We still navigate to keep your flow.)
    if (userId && password && password === confirm) {
      try {
        await saveUser({ userId, password, name });
        await saveSession({ userId, token: "local-token" });
      } catch {}
    }
    navigateToTabRoute(navigation, "Home");
  };

  const goToLogin = () => {
    const state = navigation?.getState?.();
    const routeNames = Array.isArray(state?.routeNames) ? state.routeNames : [];
    if (routeNames.includes("Login")) {
      navigation.navigate("Login");
      return;
    }

    const parent = navigation?.getParent?.();
    const parentState = parent?.getState?.();
    const parentRouteNames = Array.isArray(parentState?.routeNames) ? parentState.routeNames : [];
    if (parentRouteNames.includes("Auth")) {
      parent.navigate("Auth", { screen: "Login" });
      return;
    }

    navigation.navigate("Home");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerShape}>
            <Text style={styles.headerText}>SignUp</Text>
          </View>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Anil Patil"
            placeholderTextColor={colors.inputPlaceholder}
          />

          <Text style={styles.label}>UserID</Text>
          <TextInput
            style={styles.input}
            keyboardType="email-address"
            value={userId}
            onChangeText={setUserId}
            placeholder="hello@reallygreatsite.com"
            placeholderTextColor={colors.inputPlaceholder}
            autoCapitalize="none"
          />

          {/* Password Field */}
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 10, borderWidth: 0 }]}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              placeholder="******"
              placeholderTextColor={colors.inputPlaceholder}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Image
                source={
                  showPassword
                    ? require('../../assets/images/unlock.png')
                    : require('../../assets/images/lock.png')
                }
                style={styles.lock}
              />
            </TouchableOpacity>
          </View>

          {/* Confirm Field */}
          <Text style={styles.label}>Confirm</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 10, borderWidth: 0 }]}
              secureTextEntry={!showConfirm}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="******"
              placeholderTextColor={colors.inputPlaceholder}
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
              <Image
                source={
                  showConfirm
                    ? require('../../assets/images/unlock.png')
                    : require('../../assets/images/lock.png')
                }
                style={styles.lock}
              />
            </TouchableOpacity>
          </View>

          {/* SignUp Button */}
          <AnimatedPressable
            style={styles.button}
            onPress={handleSignUp}>
            <Text style={styles.buttonText}>SignUp</Text>
          </AnimatedPressable>

          {/* Footer */}
          <TouchableOpacity onPress={goToLogin}>
            <Text style={styles.footerText}>
              Already Registered?
              <Text style={styles.logText}> Log in here.</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(theme) {
  const colors = theme.colors;
  return StyleSheet.create({
  header: {
    height: 100,
    backgroundColor: colors.canvas,
    alignItems: "flex-start",
    justifyContent: "flex-end",
  },
  headerShape: {
    backgroundColor: colors.brand,
    borderBottomRightRadius: 120,
    width: 260,
    height: 120,
    justifyContent: "flex-end",
    alignItems: "center",
    marginLeft: 20,
    marginBottom: -30,
    shadowColor: colors.brand,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
  },
  headerText: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.white,
    paddingBottom: 20,
    paddingLeft: 50,
    alignSelf: "flex-start",
  },
  form: {
    flex: 1,
    paddingHorizontal: 25,
    marginTop: 10,
  },
  label: {
    fontSize: 17,
    fontWeight: 'bold',
    marginTop: 18,
    marginBottom: 5,
    letterSpacing: 2,
    color: colors.textPrimary,
  },
  input: {
    borderColor: hexWithAlpha(colors.brand, 0.3),
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: colors.surface,
    marginBottom: 0,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: hexWithAlpha(colors.brand, 0.3),
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 5,
    marginBottom: 0,
    marginTop: 0,
  },
  button: {
    marginTop: 30,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 17,
    alignItems: "center",
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "600",
  },
  footerText: {
    textAlign: "center",
    color: colors.textMuted,
    marginTop: 25,
    fontSize: 15,
  },
  logText: {
    textAlign: "center",
    color: colors.brand,
    fontWeight: "500",
    marginTop: 25,
    fontSize: 15,
  },
  lock: {
    width: 24,
    height: 24,
    marginRight: 0,
    resizeMode: 'contain',
  },
  unlock: {
    width: 24,
    height: 24,
    marginRight: 0,
    resizeMode: 'contain',
  },
  loginText: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
  },
  subText: {
    textAlign: 'center',
    color: colors.textMuted,
    marginBottom: 20,
  }
  });
}
