import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import colors from "../../theme/colors";
import spacing from "../../theme/spacing";
import radius from "../../theme/radius";
import typography from "../../theme/typography";

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
          placeholderTextColor={colors.textMuted}
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

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  inputWrap: {
    minHeight: 46,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
  },
  inputWrapFocused: {
    borderColor: colors.focusRing,
    backgroundColor: colors.surface,
  },
  inputWrapError: {
    borderColor: colors.danger,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    paddingVertical: spacing.xs,
  },
  adornmentLeft: {
    marginRight: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  adornmentRight: {
    marginLeft: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  helper: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.xs,
  },
});
