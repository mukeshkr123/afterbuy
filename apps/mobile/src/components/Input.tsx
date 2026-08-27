import { useState, type ReactNode } from "react";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";
import type { KeyboardTypeOptions, TextInputProps } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export interface InputProps {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string | undefined;
  secureTextEntry?: boolean | undefined;
  autoCapitalize?: "none" | "sentences" | "words" | "characters" | undefined;
  autoCorrect?: boolean | undefined;
  keyboardType?: KeyboardTypeOptions | undefined;
  textContentType?: TextInputProps["textContentType"];
  autoComplete?: TextInputProps["autoComplete"];
  returnKeyType?: TextInputProps["returnKeyType"];
  onSubmitEditing?: () => void;
  error?: string | undefined;
  multiline?: boolean | undefined;
  numberOfLines?: number | undefined;
  /** Rendered inside the field, right-aligned — e.g. a reveal-password toggle. */
  adornment?: ReactNode;
  /** Small helper line below the field. Hidden while an error is showing. */
  hint?: string | null | undefined;
  /** Trailing control on the label row — e.g. a "Forgot password?" link. */
  labelAccessory?: ReactNode;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = "sentences",
  autoCorrect,
  keyboardType,
  textContentType,
  autoComplete,
  returnKeyType,
  onSubmitEditing,
  error,
  multiline = false,
  numberOfLines,
  adornment,
  hint,
  labelAccessory,
}: InputProps) {
  const { tokens } = useTheme();
  const [focused, setFocused] = useState(false);
  const minHeight = multiline
    ? Math.max(54, (numberOfLines ?? 3) * 22 + 16)
    : Platform.select({ ios: 50, android: 56, default: 50 });

  const borderColor = error
    ? tokens.colors.danger
    : focused
      ? tokens.colors.focus
      : tokens.colors.outline;

  return (
    <View style={{ gap: tokens.spacing.xs }}>
      <View style={styles.labelRow}>
        <Text
          style={{
            color: tokens.colors.text,
            fontSize: tokens.type.bodySmall.fontSize,
            fontWeight: "600",
          }}
        >
          {label}
        </Text>
        {labelAccessory}
      </View>

      <View style={styles.fieldWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          keyboardType={keyboardType}
          textContentType={textContentType}
          autoComplete={autoComplete}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : undefined}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint ?? undefined}
          placeholderTextColor={tokens.colors.textMuted}
          style={[
            styles.input,
            {
              color: tokens.colors.text,
              borderColor,
              backgroundColor: tokens.colors.surface,
              borderRadius: 16,
              paddingLeft: tokens.spacing.lg,
              paddingRight: adornment ? 48 : tokens.spacing.lg,
              fontSize: tokens.type.body.fontSize,
              minHeight,
              textAlignVertical: multiline ? "top" : "auto",
            },
          ]}
        />
        {adornment ? <View style={styles.adornment}>{adornment}</View> : null}
      </View>

      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{
            color: tokens.colors.dangerText,
            fontSize: tokens.type.bodySmall.fontSize,
          }}
        >
          {error}
        </Text>
      ) : hint ? (
        <Text
          style={{
            color: tokens.colors.textMuted,
            fontSize: tokens.type.bodySmall.fontSize,
          }}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldWrap: {
    justifyContent: "center",
  },
  input: {
    borderWidth: 1,
  },
  adornment: {
    position: "absolute",
    right: 4,
    height: "100%",
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
});
