import { StyleSheet, Text, TextInput, View } from "react-native";
import type { KeyboardTypeOptions } from "react-native";
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
  error?: string | undefined;
  multiline?: boolean | undefined;
  numberOfLines?: number | undefined;
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
  error,
  multiline = false,
  numberOfLines,
}: InputProps) {
  const { tokens } = useTheme();
  const minHeight = multiline
    ? Math.max(44, (numberOfLines ?? 3) * 22 + 16)
    : 44;
  return (
    <View style={{ gap: tokens.spacing.xs }}>
      <Text
        style={{
          color: tokens.colors.text,
          fontSize: tokens.type.bodySmall.fontSize,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? numberOfLines : undefined}
        accessibilityLabel={label}
        placeholderTextColor={tokens.colors.textMuted}
        style={[
          styles.input,
          {
            color: tokens.colors.text,
            borderColor: error ? tokens.colors.danger : tokens.colors.border,
            backgroundColor: tokens.colors.surface,
            borderRadius: tokens.radius.md,
            paddingHorizontal: tokens.spacing.md,
            paddingVertical: tokens.spacing.sm + 2,
            fontSize: tokens.type.body.fontSize,
            minHeight,
            textAlignVertical: multiline ? "top" : "auto",
          },
        ]}
      />
      {error ? (
        <Text
          style={{
            color: tokens.colors.danger,
            fontSize: tokens.type.bodySmall.fontSize,
          }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
  },
});
