import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import colors, { hexWithAlpha } from "../../theme/colors";
import spacing from "../../theme/spacing";
import radius from "../../theme/radius";
import typography from "../../theme/typography";

const TONE_MAP = {
  neutral: {
    bg: colors.surfaceStrong,
    border: colors.borderStrong,
    text: colors.textPrimary,
  },
  info: {
    bg: hexWithAlpha(colors.info, 0.14),
    border: hexWithAlpha(colors.info, 0.4),
    text: colors.info,
  },
  success: {
    bg: hexWithAlpha(colors.success, 0.14),
    border: hexWithAlpha(colors.success, 0.45),
    text: colors.success,
  },
  warning: {
    bg: hexWithAlpha(colors.warning, 0.18),
    border: hexWithAlpha(colors.warning, 0.45),
    text: "#A16207",
  },
  danger: {
    bg: hexWithAlpha(colors.danger, 0.14),
    border: hexWithAlpha(colors.danger, 0.45),
    text: colors.danger,
  },
  offline: {
    bg: hexWithAlpha(colors.textMuted, 0.16),
    border: hexWithAlpha(colors.textMuted, 0.4),
    text: colors.textMuted,
  },
};

export default function StatusChip({
  label,
  tone = "neutral",
  selected = false,
  onPress,
  style,
}) {
  const toneStyle = TONE_MAP[tone] || TONE_MAP.neutral;
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
          { color: selected ? colors.white : toneStyle.text },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 30,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    ...typography.label,
  },
  pressed: {
    opacity: 0.85,
  },
});
