import { Text, TextInput, View } from "react-native";
import { isIsoDate } from "../lib/date";
import { useTheme } from "../theme/ThemeProvider";

export interface DateFieldProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  error?: string | undefined;
}

export function DateField({ label, value, onChange, error }: DateFieldProps) {
  const { tokens } = useTheme();
  const localError =
    error ??
    (value.length === 10 && !isIsoDate(value) ? "Use YYYY-MM-DD" : undefined);
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
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={label}
        placeholderTextColor={tokens.colors.textMuted}
        style={{
          color: tokens.colors.text,
          borderColor: localError ? tokens.colors.danger : tokens.colors.border,
          backgroundColor: tokens.colors.surface,
          borderRadius: tokens.radius.md,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm + 2,
          fontSize: tokens.type.body.fontSize,
          minHeight: 44,
          borderWidth: 1,
        }}
      />
      {localError ? (
        <Text
          style={{
            color: tokens.colors.danger,
            fontSize: tokens.type.bodySmall.fontSize,
          }}
        >
          {localError}
        </Text>
      ) : null}
    </View>
  );
}
