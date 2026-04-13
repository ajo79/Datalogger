import React, { useMemo, useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { useAppTheme } from "../../theme";

export default function ThemedInput({
  label,
  value,
  onChangeText,
  placeholder,
  helperText,
  errorText,
  leftAdornment = null,
  rightAdornment = null,
  inputStyle,
  containerStyle,
  ...rest
}) {
  const [isFocused, setFocused] = useState(false);
  const hasError = Boolean(errorText);
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.container, containerStyle]}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrap,
          isFocused && styles.inputWrapFocused,
          hasError && styles.inputWrapError,
        ]}
      >
        {!!leftAdornment && <View style={styles.adornmentLeft}>{leftAdornment}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.inputPlaceholder}
          style={[styles.input, inputStyle]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {!!rightAdornment && <View style={styles.adornmentRight}>{rightAdornment}</View>}
      </View>
      {hasError ? (
        <Text style={styles.error}>{errorText}</Text>
      ) : (
        !!helperText && <Text style={styles.helper}>{helperText}</Text>
      )}
    </View>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    container: {
      width: "100%",
    },
    label: {
      ...theme.typography.label,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    inputWrap: {
      minHeight: 46,
      borderRadius: theme.radius.sm,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      backgroundColor: theme.colors.inputBackground,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.spacing.sm,
    },
    inputWrapFocused: {
      borderColor: theme.colors.focusRing,
      backgroundColor: theme.colors.surface,
    },
    inputWrapError: {
      borderColor: theme.colors.danger,
    },
    input: {
      ...theme.typography.body,
      color: theme.colors.inputText,
      flex: 1,
      paddingVertical: theme.spacing.xs,
    },
    adornmentLeft: {
      marginRight: theme.spacing.xs,
      alignItems: "center",
      justifyContent: "center",
    },
    adornmentRight: {
      marginLeft: theme.spacing.xs,
      alignItems: "center",
      justifyContent: "center",
    },
    helper: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
      marginTop: theme.spacing.xs,
    },
    error: {
      ...theme.typography.caption,
      color: theme.colors.danger,
      marginTop: theme.spacing.xs,
    },
  });
}
