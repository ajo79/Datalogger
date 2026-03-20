import React from "react";
import { Pressable, Text, StyleSheet, View } from "react-native";
import colors from "../../theme/colors";
import spacing from "../../theme/spacing";
import radius from "../../theme/radius";
import typography from "../../theme/typography";
import shadows from "../../theme/shadows";

const VARIANT_STYLES = StyleSheet.create({
  primary: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.brand,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: colors.borderStrong,
  },
  danger: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
});

const LABEL_STYLES = StyleSheet.create({
  primary: { color: colors.white },
  secondary: { color: colors.brand },
  ghost: { color: colors.textPrimary },
  danger: { color: colors.white },
});

const SIZE_STYLES = StyleSheet.create({
  sm: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  md: {
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  lg: {
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
});

export default function ThemedButton({
  label,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  leftIcon = null,
  rightIcon = null,
  style,
  textStyle,
}) {
  const variantStyle = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;
  const labelStyle = LABEL_STYLES[variant] || LABEL_STYLES.primary;
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.md;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyle,
        sizeStyle,
        shadows.card,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {!!leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
      <Text style={[styles.label, labelStyle, textStyle]} numberOfLines={1}>
        {loading ? "Please wait..." : label}
      </Text>
      {!!rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    ...typography.button,
  },
  iconLeft: {
    marginRight: spacing.xs,
  },
  iconRight: {
    marginLeft: spacing.xs,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.55,
  },
});
