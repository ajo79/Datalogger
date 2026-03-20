import React from "react";
import { View, StyleSheet } from "react-native";
import colors from "../../theme/colors";
import spacing from "../../theme/spacing";
import radius from "../../theme/radius";
import shadows from "../../theme/shadows";

const VARIANT_STYLES = StyleSheet.create({
  default: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  muted: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
  },
  outlined: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
  },
  danger: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
  },
});

export default function SurfaceCard({
  children,
  variant = "default",
  padded = true,
  elevated = false,
  style,
}) {
  const variantStyle = VARIANT_STYLES[variant] || VARIANT_STYLES.default;
  return (
    <View
      style={[
        styles.base,
        variantStyle,
        padded && styles.padded,
        elevated ? shadows.raised : shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: radius.md,
  },
  padded: {
    padding: spacing.md,
  },
});
