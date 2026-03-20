import React from "react";
import { View, Text, StyleSheet } from "react-native";
import colors from "../../theme/colors";
import spacing from "../../theme/spacing";
import radius from "../../theme/radius";
import typography from "../../theme/typography";
import shadows from "../../theme/shadows";

export default function PageHeader({
  title,
  subtitle,
  leftSlot = null,
  rightSlot = null,
  style,
}) {
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

const styles = StyleSheet.create({
  wrapper: {
    minHeight: 60,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    ...shadows.card,
  },
  sideSlot: {
    width: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  centerSlot: {
    flex: 1,
    paddingHorizontal: spacing.xs,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 2,
  },
});
