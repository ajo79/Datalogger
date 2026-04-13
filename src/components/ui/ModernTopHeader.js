import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";
import { hexWithAlpha, useAppTheme } from "../../theme";
import AnimatedPressable from "./AnimatedPressable";

function IconButton({ icon, onPress, hidden = false, styles, iconTintColor }) {
  if (hidden) return <View style={styles.iconGhost} />;
  return (
    <AnimatedPressable
      onPress={onPress}
      contentStyle={styles.iconButton}
      accessibilityRole="button"
    >
      {!!icon && <Image source={icon} style={[styles.iconImage, { tintColor: iconTintColor }]} />}
    </AnimatedPressable>
  );
}

export default function ModernTopHeader({
  title,
  subtitle = "",
  leftIcon,
  rightIcon,
  onLeftPress,
  onRightPress,
  leftSlot = null,
  rightSlot = null,
  style,
  contentStyle,
}) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const fade = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: theme.motion.duration.medium,
        useNativeDriver: true,
      }),
      Animated.timing(y, {
        toValue: 0,
        duration: theme.motion.duration.medium,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, theme.motion.duration.medium, y]);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          opacity: fade,
          transform: [{ translateY: y }],
        },
        style,
      ]}
    >
      <View style={styles.backgroundGlow} />
      <View style={[styles.headerCard, contentStyle]}>
        <View style={styles.side}>
          {leftSlot || (
            <IconButton
              icon={leftIcon}
              onPress={onLeftPress}
              hidden={!leftIcon && !onLeftPress}
              styles={styles}
              iconTintColor={theme.colors.navActive}
            />
          )}
        </View>
        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {!!subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        <View style={styles.side}>
          {rightSlot || (
            <IconButton
              icon={rightIcon}
              onPress={onRightPress}
              hidden={!rightIcon && !onRightPress}
              styles={styles}
              iconTintColor={theme.colors.navActive}
            />
          )}
        </View>
      </View>
    </Animated.View>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    wrapper: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
    },
    backgroundGlow: {
      position: "absolute",
      top: -58,
      left: -42,
      right: -42,
      height: 170,
      borderBottomLeftRadius: theme.radius.xl * 2,
      borderBottomRightRadius: theme.radius.xl * 2,
      backgroundColor: hexWithAlpha(theme.colors.brand, 0.13),
    },
    headerCard: {
      minHeight: 62,
      backgroundColor: hexWithAlpha(theme.colors.surfaceElevated, 0.98),
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: hexWithAlpha(theme.colors.brand, 0.18),
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.spacing.xs,
      ...theme.shadows.raised,
    },
    side: {
      width: 52,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.xs,
    },
    title: {
      ...theme.typography.h2,
      color: theme.colors.textPrimary,
      textAlign: "center",
    },
    subtitle: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      marginTop: 1,
      textAlign: "center",
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: hexWithAlpha(theme.colors.brand, 0.2),
      backgroundColor: theme.colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    iconImage: {
      width: 22,
      height: 22,
      resizeMode: "contain",
    },
    iconGhost: {
      width: 42,
      height: 42,
    },
  });
}
