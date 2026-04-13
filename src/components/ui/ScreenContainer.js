import React, { useMemo } from "react";
import { SafeAreaView, View, StyleSheet } from "react-native";
import { hexWithAlpha, useAppTheme } from "../../theme";

export default function ScreenContainer({
  children,
  style,
  contentStyle,
  padded = true,
}) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={[styles.safeArea, style]}>
      <View pointerEvents="none" style={styles.ambientTop} />
      <View pointerEvents="none" style={styles.ambientBottom} />
      <View style={[styles.content, padded && styles.padded, contentStyle]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.canvas,
    },
    content: {
      flex: 1,
    },
    padded: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
    ambientTop: {
      position: "absolute",
      top: -140,
      right: -80,
      width: 300,
      height: 300,
      borderRadius: 150,
      backgroundColor: hexWithAlpha(theme.colors.brand, 0.08),
    },
    ambientBottom: {
      position: "absolute",
      bottom: -180,
      left: -110,
      width: 320,
      height: 320,
      borderRadius: 160,
      backgroundColor: hexWithAlpha(theme.colors.accent, 0.07),
    },
  });
}
