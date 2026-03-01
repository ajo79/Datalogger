import React from 'react';
import {
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { navigateToTabRoute } from "../navigation/navHelpers";

const PageFirst = ({ navigation }) => {
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
    <ScrollView contentContainerStyle={styles.container}>
      {/* Logo */}
      <Image
        source={require('../../assets/images/new_logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      {/* Title & Subtitle */}
      <Text style={styles.title}>Data Guard</Text>
      <Text style={styles.subtitle}>The Advance Datalogger</Text>

      {/* Shield Image */}
      <Image
        source={require('../../assets/images/shield.png')}
        style={styles.shield}
        resizeMode="contain"
      />

      <Text style={styles.clouded}>Proudly Clouded</Text>

      {/* Sign Up Heading */}
      <Text style={styles.signupHeading}>Sign Up</Text>
      <Text style={styles.continueText}>Continue with Mail</Text>

      {/* Continue Button */}
      <TouchableOpacity
        style={styles.continueBtn}
        onPress={goToLogin}
      >
        <Image
          source={require('../../assets/images/email.png')}
          style={styles.mailIcon}
        />
        <Text style={styles.continueBtnText}>Continue with Mail</Text>
      </TouchableOpacity>

      {/* Sign as Guest */}
      <TouchableOpacity style={styles.guestBtn} onPress={handleGuestSignIn}>
        <Text style={styles.guestBtnText}>Sign As Guest</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
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
    fontSize: 40,
    color: '#FF5733',
    fontWeight: 'bold',
    marginBottom: 1,
  },
  subtitle: {
    height: 20,
    fontSize: 18,
    color: '#0056D2',
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
    color: '#0056D2',
    marginBottom: 20,
  },
  signupHeading: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  continueText: {
    fontSize: 18,
    marginBottom: 10,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6F61',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 30,
    marginBottom: 10,
  },
  mailIcon: {
    width: 24,
    height: 24,
    marginRight: 20,
    resizeMode: 'contain',
  },
  continueBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  guestBtn: {
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 80,
    borderRadius: 30,
    marginTop: 15,
  },
  guestBtnText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default PageFirst;
