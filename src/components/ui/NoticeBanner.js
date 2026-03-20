import React from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import colors, { hexWithAlpha } from "../../theme/colors";
import spacing from "../../theme/spacing";
import radius from "../../theme/radius";
import typography from "../../theme/typography";

const TONES = {
  info: {
    bg: hexWithAlpha(colors.info, 0.12),
    border: hexWithAlpha(colors.info, 0.4),
    icon: "information-outline",
    iconColor: colors.info,
  },
  success: {
    bg: hexWithAlpha(colors.success, 0.12),
    border: hexWithAlpha(colors.success, 0.42),
    icon: "check-circle-outline",
    iconColor: colors.success,
  },
  warning: {
    bg: hexWithAlpha(colors.warning, 0.18),
    border: hexWithAlpha(colors.warning, 0.42),
    icon: "alert-outline",
    iconColor: "#B45309",
  },
  danger: {
    bg: hexWithAlpha(colors.danger, 0.12),
    border: hexWithAlpha(colors.danger, 0.42),
    icon: "alert-circle-outline",
    iconColor: colors.danger,
  },
};

export default function NoticeBanner({
  tone = "info",
  title,
  message,
  dense = false,
  iconName,
  onPress,
  style,
}) {
  const cfg = TONES[tone] || TONES.info;
  const Container = onPress ? Pressable : View;
  return (
    <Container
      onPress={onPress}
      style={[
        styles.base,
        {
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
          paddingVertical: dense ? spacing.xs : spacing.sm,
        },
        style,
      ]}
    >
      <MaterialCommunityIcons
        name={iconName || cfg.icon}
        size={18}
        color={cfg.iconColor}
        style={styles.icon}
      />
      <View style={styles.content}>
        {!!title && <Text style={styles.title}>{title}</Text>}
        {!!message && <Text style={styles.message}>{message}</Text>}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  icon: {
    marginTop: 1,
    marginRight: spacing.xs,
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
