/*
 * AnimationScreen.js
 *
 * This screen acts as an animated splash or intro screen.
 * It displays a shield logo with parallel animations (fade, scale, rotate)
 * followed by staggered letter animations for "BIOT".
 *
 * Key Features:
 * - React Native Animated API usage.
 * - Parallel and Staggered animations.
 * - Auto-navigation to Main or Auth stack based on login status.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  View,
  StyleSheet,
  Easing,
  Pressable,
} from 'react-native';
import { getSession } from '../storage/userStorage';
import { prefetchFastDeviceStatus } from '../api/dataService';
import { useAppTheme } from "../theme";

const STARTUP_PREFETCH_TIMEOUT_MS = 8000;
const STARTUP_PREFETCH_WAIT_MS = 3000;

const AnimationScreen = ({ navigation }) => {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  // --- Animation Values ---
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const prefetchPromiseRef = useRef(null);
  const routeOnceRef = useRef(false);

  // Letter processing for "BIOT"
  const letters = 'BIOT'.split('');
  const letterAnimations = useRef(letters.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Warm device status while splash animation is running.
    prefetchPromiseRef.current = prefetchFastDeviceStatus({
      timeoutMs: STARTUP_PREFETCH_TIMEOUT_MS,
    });

    // Start main parallel animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1.1,
        friction: 84, // Controls "bounciness"
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 5000,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Trigger letter animation after main animation
      animateLetters();

      // Check login status after a set delay
      setTimeout(() => {
        checkLoginStatus();
      }, 2000); // 2 seconds delay
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Animates the "BIOT" letters one by one (staggered).
   */
  const animateLetters = () => {
    const animations = letterAnimations.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: i * 100,
        useNativeDriver: true,
      })
    );
    Animated.stagger(100, animations).start();
  };

  // Interpolate rotation value 0-1 to 0deg-360deg
  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const waitForPrefetch = async () => {
    const promise = prefetchPromiseRef.current;
    if (!promise) return;
    await Promise.race([
      promise.catch(() => null),
      new Promise((resolve) => setTimeout(resolve, STARTUP_PREFETCH_WAIT_MS)),
    ]);
  };

  /**
   * Checks if user is logged in via userStorage.
   * Navigates to appropriate stack.
   */
  const checkLoginStatus = async () => {
    if (routeOnceRef.current) return;
    routeOnceRef.current = true;
    try {
      const session = await getSession();
      if (session && session.userId) {
        await waitForPrefetch();
        navigation.replace('Main'); // Go to home/main
        return;
      }
      navigation.replace('Auth'); // Go to login
    } catch (e) {
      console.log('Error checking login status:', e);
      navigation.replace('Auth'); // fallback safety
    }
  };

  /**
   * Manual skip Handler.
   */
  const goToNextScreen = () => {
    checkLoginStatus();
  };

  return (
    <View style={styles.container}>
      {/* Pressable Shield Logo */}
      <Pressable onPress={goToNextScreen}>
        <Animated.Image
          source={require('../../assets/images/shield.png')}
          style={[
            styles.image,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { rotate: rotateInterpolate },
              ],
            },
          ]}
          resizeMode="contain"
        />
      </Pressable>

      {/* Animated Letters Row */}
      <View style={styles.letterRow}>
        {letters.map((letter, index) => (
          <Animated.Text
            key={index}
            style={[
              styles.letter,
              {
                opacity: letterAnimations[index],
                transform: [
                  {
                    translateY: letterAnimations[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0], // Slide up effect
                    }),
                  },
                ],
              },
            ]}
          >
            {letter}
          </Animated.Text>
        ))}
      </View>
    </View>
  );
};

/* ------------------------- STYLES ------------------------- */

function createStyles(theme) {
  const colors = theme.colors;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.accentSoft,
      justifyContent: 'center',
      alignItems: 'center',
    },
    image: {
      width: 300,
      height: 300,
    },
    letterRow: {
      flexDirection: 'row',
      position: 'absolute',
      top: '23%',
    },
    letter: {
      fontSize: 45,
      color: colors.brandDark,
      fontWeight: 'bold',
      marginHorizontal: 3,
    },
  });
}

export default AnimationScreen;
