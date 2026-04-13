import React, { useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { navigateToTabRoute } from "../navigation/navHelpers";
import { hexWithAlpha, useAppTheme } from "../theme";
import { AnimatedPressable } from "../components/ui";

const PageFirst = ({ navigation }) => {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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

  const handleGuestSignIn = () => {
    navigateToTabRoute(navigation, "Home");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={styles.ambientTop} />
      <ScrollView contentContainerStyle={styles.container}>
        <Image
          source={require('../../assets/images/new_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Data Guard</Text>
        <Text style={styles.subtitle}>The Advance Datalogger</Text>

        <Image
          source={require('../../assets/images/shield.png')}
          style={styles.shield}
          resizeMode="contain"
        />

        <Text style={styles.clouded}>Proudly Clouded</Text>

        <Text style={styles.signupHeading}>Sign Up</Text>
        <Text style={styles.continueText}>Continue with Mail</Text>

        <AnimatedPressable
          style={styles.continueBtn}
          onPress={goToLogin}
          contentStyle={styles.buttonInner}
        >
          <Image
            source={require('../../assets/images/email.png')}
            style={styles.mailIcon}
          />
          <Text style={styles.continueBtnText}>Continue with Mail</Text>
        </AnimatedPressable>

        <AnimatedPressable style={styles.guestBtn} onPress={handleGuestSignIn}>
          <Text style={styles.guestBtnText}>Sign As Guest</Text>
        </AnimatedPressable>
      </ScrollView>
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
  ambientTop: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -110,
    right: -60,
    backgroundColor: hexWithAlpha(colors.brand, 0.1),
  },
  container: {
    flexGrow: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  logo: {
    width: 300,
    height: 70,
    marginBottom: 30,
  },
  title: {
    height: 45,
    fontSize: 38,
    color: colors.brandDark,
    fontWeight: 'bold',
    marginBottom: 1,
  },
  subtitle: {
    height: 20,
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 30,
  },
  shield: {
    width: 300,
    height: 250,
    marginTop: 1,
    marginBottom: 20,
  },
  clouded: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  signupHeading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  continueText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  continueBtn: {
    backgroundColor: colors.brand,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 30,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: hexWithAlpha(colors.brandDark, 0.32),
    minWidth: 260,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: "center",
  },
  mailIcon: {
    width: 24,
    height: 24,
    marginRight: 20,
    resizeMode: 'contain',
  },
  continueBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 18,
  },
  guestBtn: {
    borderWidth: 1,
    borderColor: hexWithAlpha(colors.brand, 0.4),
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 80,
    borderRadius: 30,
    marginTop: 15,
  },
  guestBtnText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 18,
  },
  });
}

export default PageFirst;
