import React, { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import IMAGES from "../../constants/images";
import { hexWithAlpha, useAppTheme } from "../../theme";
import { navigateToTabRoute } from "../../navigation/navHelpers";
import AnimatedPressable from "./AnimatedPressable";

const DEFAULT_ITEMS = Object.freeze([
  { key: "DASH", label: "DASH", route: "Dashboard", icon: IMAGES.GraphIcon },
  { key: "HOME", label: "HOME", route: "Home", icon: IMAGES.HomeIcon },
  { key: "GRAPH", label: "GRAPH", route: "Graph", icon: IMAGES.GraphIcon },
  { key: "ALARM", label: "ALARM", route: "Alarm", icon: IMAGES.AlarmIcon },
  { key: "MORE", label: "MORE", route: "More", icon: IMAGES.MoreIcon },
]);

function BottomItem({ item, active, onPress }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const activeAnim = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(activeAnim, {
      toValue: active ? 1 : 0,
      duration: theme.motion.duration.normal,
      useNativeDriver: true,
    }).start();
  }, [active, activeAnim, theme.motion.duration.normal]);

  const indicatorScale = activeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 1],
  });

  const iconLift = activeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2],
  });

  const iconOpacity = activeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 1],
  });

  return (
    <View style={styles.itemWrap}>
      <Animated.View style={[styles.activeIndicator, { transform: [{ scaleX: indicatorScale }] }]} />
      <AnimatedPressable
        onPress={onPress}
        contentStyle={styles.itemPressable}
        accessibilityRole="button"
      >
        <Animated.Image
          source={item.icon}
          style={[
            styles.icon,
            {
              tintColor: active ? theme.colors.navActive : theme.colors.navInactive,
              transform: [{ translateY: iconLift }],
              opacity: iconOpacity,
            },
          ]}
        />
        <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
          {item.label}
        </Text>
      </AnimatedPressable>
    </View>
  );
}

export default function ModernBottomNav({
  navigation,
  activeRoute = "",
  items = DEFAULT_ITEMS,
  style,
}) {
  const list = useMemo(() => {
    if (Array.isArray(items) && items.length) return items;
    return DEFAULT_ITEMS;
  }, [items]);

  const normalizedActiveRoute = String(activeRoute || "").toLowerCase();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View pointerEvents="box-none" style={[styles.host, style]}>
      <View style={styles.glow} />
      <View style={styles.card}>
        {list.map((item) => {
          const itemRoute = String(item.route || "").toLowerCase();
          const itemKey = String(item.key || "").toLowerCase();
          const active = itemRoute === normalizedActiveRoute || itemKey === normalizedActiveRoute;
          return (
            <BottomItem
              key={item.key || item.route}
              item={item}
              active={active}
              onPress={() => navigateToTabRoute(navigation, item.route)}
            />
          );
        })}
      </View>
    </View>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    host: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      paddingTop: theme.spacing.xs,
    },
    glow: {
      position: "absolute",
      left: theme.spacing.md + 24,
      right: theme.spacing.md + 24,
      bottom: theme.spacing.sm - 8,
      height: 24,
      borderRadius: theme.radius.pill,
      backgroundColor: hexWithAlpha(theme.colors.brand, 0.2),
    },
    card: {
      minHeight: 74,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: hexWithAlpha(theme.colors.brand, 0.18),
      backgroundColor: hexWithAlpha(theme.colors.surfaceElevated, 0.98),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.xs,
      ...theme.shadows.raised,
    },
    itemWrap: {
      flex: 1,
      minWidth: 54,
      alignItems: "center",
      justifyContent: "center",
    },
    itemPressable: {
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      paddingVertical: theme.spacing.xs,
      gap: 1,
    },
    activeIndicator: {
      width: 26,
      height: 3,
      borderRadius: theme.radius.pill,
      marginBottom: 4,
      backgroundColor: theme.colors.navIndicator,
      opacity: 0.95,
    },
    icon: {
      width: 22,
      height: 22,
      resizeMode: "contain",
    },
    label: {
      ...theme.typography.caption,
      color: theme.colors.navInactive,
      fontWeight: "700",
      letterSpacing: 0.24,
    },
    labelActive: {
      color: theme.colors.navActive,
    },
  });
}
