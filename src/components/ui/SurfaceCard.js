import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { useAppTheme, hexWithAlpha } from "../../theme";

export default function SurfaceCard({
  children,
  variant = "default",
  padded = true,
  elevated = false,
  style,
}) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const variantStyles = useMemo(
    () => ({
      default: {
        backgroundColor: theme.colors.cardBackground,
        borderColor: theme.colors.cardBorder,
      },
      muted: {
        backgroundColor: theme.colors.surfaceAlt,
        borderColor: theme.colors.border,
      },
      outlined: {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.borderStrong,
      },
      danger: {
        backgroundColor: hexWithAlpha(theme.colors.danger, 0.1),
        borderColor: hexWithAlpha(theme.colors.danger, 0.45),
      },
    }),
    [theme.colors]
  );
  const variantStyle = variantStyles[variant] || variantStyles.default;
  return (
    <View
      style={[
        styles.base,
        variantStyle,
        padded && styles.padded,
        elevated ? theme.shadows.raised : theme.shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    base: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
    },
    padded: {
      padding: theme.spacing.md,
    },
  });
}
