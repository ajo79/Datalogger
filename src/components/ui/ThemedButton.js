import React, { useMemo } from "react";
import { Text, StyleSheet, View } from "react-native";
import { useAppTheme } from "../../theme";
import AnimatedPressable from "./AnimatedPressable";

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
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { colors } = theme;

  const variantStyles = useMemo(
    () => ({
      primary: {
        backgroundColor: colors.buttonPrimary,
        borderColor: colors.buttonPrimary,
      },
      secondary: {
        backgroundColor: colors.buttonSecondary,
        borderColor: colors.buttonSecondary,
      },
      ghost: {
        backgroundColor: colors.buttonGhost,
        borderColor: colors.borderStrong,
      },
      danger: {
        backgroundColor: colors.danger,
        borderColor: colors.danger,
      },
    }),
    [colors]
  );

  const labelStyles = useMemo(
    () => ({
      primary: { color: colors.buttonPrimaryText },
      secondary: { color: colors.buttonSecondaryText },
      ghost: { color: colors.buttonGhostText },
      danger: { color: colors.textInverse },
    }),
    [colors]
  );

  const sizeStyles = useMemo(
    () => ({
      sm: {
        minHeight: 40,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
      },
      md: {
        minHeight: 46,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
      },
      lg: {
        minHeight: 52,
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.md,
      },
    }),
    [theme.spacing]
  );

  const variantStyle = variantStyles[variant] || variantStyles.primary;
  const labelStyle = labelStyles[variant] || labelStyles.primary;
  const sizeStyle = sizeStyles[size] || sizeStyles.md;
  const isDisabled = disabled || loading;

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        variantStyle,
        sizeStyle,
        theme.shadows.card,
        styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      contentStyle={styles.content}
    >
      {!!leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
      <Text style={[styles.label, labelStyle, textStyle]} numberOfLines={1}>
        {loading ? "Please wait..." : label}
      </Text>
      {!!rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
    </AnimatedPressable>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    base: {
      borderWidth: 1,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      ...theme.typography.button,
    },
    content: {
      minHeight: "100%",
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    iconLeft: {
      marginRight: theme.spacing.xs,
    },
    iconRight: {
      marginLeft: theme.spacing.xs,
    },
    pressed: {
      opacity: 0.96,
    },
    disabled: {
      opacity: 0.55,
    },
  });
}
