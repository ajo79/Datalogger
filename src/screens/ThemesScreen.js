import React, { useMemo } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import IMAGES from "../constants/images";
import { goBackWithFallback } from "../navigation/navHelpers";
import { useAppTheme } from "../theme";
import { ModernTopHeader } from "../components/ui";

export default function ThemesScreen({ navigation }) {
  const { theme, themeId, setTheme, themeOptions } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ModernTopHeader
        title="Themes"
        leftIcon={IMAGES.BackIcon}
        onLeftPress={() => goBackWithFallback(navigation, "Settings")}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.panel}>
          <Text style={styles.title}>Choose Theme</Text>
          <Text style={styles.subtitle}>
            Changes apply instantly and persist across app relaunch.
          </Text>

          {themeOptions.map((option) => {
            const isActiveTheme = option.id === themeId;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.option, isActiveTheme && styles.optionActive]}
                onPress={() => setTheme(option.id)}
              >
                <View style={styles.optionTextWrap}>
                  <Text style={[styles.optionTitle, isActiveTheme && styles.optionTitleActive]}>
                    {option.label}
                  </Text>
                  <Text style={styles.optionSubtitle}>{option.description}</Text>
                </View>
                <View style={styles.swatchRow}>
                  {option.swatches.map((swatch, idx) => (
                    <View key={`${option.id}_${idx}`} style={[styles.swatch, { backgroundColor: swatch }]} />
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
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
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 24,
    },
    panel: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.cardBackground,
      padding: 14,
    },
    title: {
      fontSize: 18,
      fontWeight: "800",
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    subtitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    option: {
      marginTop: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: theme.colors.surface,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    optionActive: {
      borderColor: theme.colors.brand,
      backgroundColor: theme.colors.brandSoft,
    },
    optionTextWrap: {
      flex: 1,
      marginRight: 8,
    },
    optionTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    optionTitleActive: {
      color: theme.colors.brandDark,
    },
    optionSubtitle: {
      marginTop: 2,
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    swatchRow: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: 5,
    },
    swatch: {
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
    },
  });
}

