import React from "react";
import { SafeAreaView, View, StyleSheet } from "react-native";
import colors, { hexWithAlpha } from "../../theme/colors";
import spacing from "../../theme/spacing";

export default function ScreenContainer({
  children,
  style,
  contentStyle,
  padded = true,
}) {
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  ambientTop: {
    position: "absolute",
    top: -140,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: hexWithAlpha(colors.brand, 0.06),
  },
  ambientBottom: {
    position: "absolute",
    bottom: -180,
    left: -110,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: hexWithAlpha(colors.info, 0.05),
  },
});
