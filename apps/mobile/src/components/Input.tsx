import { useState, type ReactNode } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
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
    ? Math.max(44, (numberOfLines ?? 3) * 22 + 16)
    : 48;

  const borderColor = error
    ? tokens.colors.danger
    : focused
      ? tokens.colors.accent
      : tokens.colors.border;

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
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : undefined}
          accessibilityLabel={label}
          placeholderTextColor={tokens.colors.textMuted}
          style={[
            styles.input,
            {
              color: tokens.colors.text,
              borderColor,
              backgroundColor: tokens.colors.surface,
              borderRadius: tokens.radius.md,
              paddingLeft: tokens.spacing.md,
              paddingRight: adornment ? 48 : tokens.spacing.md,
              paddingVertical: tokens.spacing.sm + 2,
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
          style={{
            color: tokens.colors.danger,
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
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
