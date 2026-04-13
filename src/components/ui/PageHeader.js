import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../../theme";

export default function PageHeader({
  title,
  subtitle,
  leftSlot = null,
  rightSlot = null,
  style,
}) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.sideSlot}>{leftSlot}</View>
      <View style={styles.centerSlot}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={styles.sideSlot}>{rightSlot}</View>
    </View>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    wrapper: {
      minHeight: 60,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      flexDirection: "row",
      alignItems: "center",
      ...theme.shadows.card,
    },
    sideSlot: {
      width: 44,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    centerSlot: {
      flex: 1,
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
      textAlign: "center",
      marginTop: 2,
    },
  });
}
