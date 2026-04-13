import React, { useMemo } from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { hexWithAlpha, useAppTheme } from "../../theme";

export default function StatusChip({
  label,
  tone = "neutral",
  selected = false,
  onPress,
  style,
}) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const toneMap = useMemo(
    () => ({
      neutral: {
        bg: theme.colors.surfaceStrong,
        border: theme.colors.borderStrong,
        text: theme.colors.textPrimary,
      },
      info: {
        bg: hexWithAlpha(theme.colors.info, 0.14),
        border: hexWithAlpha(theme.colors.info, 0.4),
        text: theme.colors.info,
      },
      success: {
        bg: hexWithAlpha(theme.colors.success, 0.14),
        border: hexWithAlpha(theme.colors.success, 0.45),
        text: theme.colors.success,
      },
      warning: {
        bg: hexWithAlpha(theme.colors.warning, 0.18),
        border: hexWithAlpha(theme.colors.warning, 0.45),
        text: theme.colors.warning,
      },
      danger: {
        bg: hexWithAlpha(theme.colors.danger, 0.14),
        border: hexWithAlpha(theme.colors.danger, 0.45),
        text: theme.colors.danger,
      },
      offline: {
        bg: hexWithAlpha(theme.colors.textMuted, 0.16),
        border: hexWithAlpha(theme.colors.textMuted, 0.4),
        text: theme.colors.textMuted,
      },
    }),
    [theme.colors]
  );

  const toneStyle = toneMap[tone] || toneMap.neutral;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: selected ? toneStyle.text : toneStyle.bg,
          borderColor: selected ? toneStyle.text : toneStyle.border,
        },
        pressed && !!onPress && styles.pressed,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: selected ? theme.colors.textInverse : toneStyle.text },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    base: {
      minHeight: 30,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      ...theme.typography.label,
    },
    pressed: {
      opacity: 0.85,
    },
  });
}
