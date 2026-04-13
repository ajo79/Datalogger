import React, { useMemo } from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { hexWithAlpha, useAppTheme } from "../../theme";

export default function NoticeBanner({
  tone = "info",
  title,
  message,
  dense = false,
  iconName,
  onPress,
  style,
}) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const tones = useMemo(
    () => ({
      info: {
        bg: hexWithAlpha(theme.colors.info, 0.12),
        border: hexWithAlpha(theme.colors.info, 0.4),
        icon: "information-outline",
        iconColor: theme.colors.info,
      },
      success: {
        bg: hexWithAlpha(theme.colors.success, 0.12),
        border: hexWithAlpha(theme.colors.success, 0.42),
        icon: "check-circle-outline",
        iconColor: theme.colors.success,
      },
      warning: {
        bg: hexWithAlpha(theme.colors.warning, 0.18),
        border: hexWithAlpha(theme.colors.warning, 0.42),
        icon: "alert-outline",
        iconColor: theme.colors.warning,
      },
      danger: {
        bg: hexWithAlpha(theme.colors.danger, 0.12),
        border: hexWithAlpha(theme.colors.danger, 0.42),
        icon: "alert-circle-outline",
        iconColor: theme.colors.danger,
      },
    }),
    [theme.colors]
  );
  const cfg = tones[tone] || tones.info;
  const Container = onPress ? Pressable : View;
  return (
    <Container
      onPress={onPress}
      style={[
        styles.base,
        {
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
          paddingVertical: dense ? theme.spacing.xs : theme.spacing.sm,
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

function createStyles(theme) {
  return StyleSheet.create({
    base: {
      borderWidth: 1,
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.spacing.sm,
      flexDirection: "row",
      alignItems: "flex-start",
    },
    icon: {
      marginTop: 1,
      marginRight: theme.spacing.xs,
    },
    content: {
      flex: 1,
    },
    title: {
      ...theme.typography.bodyStrong,
      color: theme.colors.textPrimary,
    },
    message: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
    },
  });
}
