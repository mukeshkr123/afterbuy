import { Picker } from "@expo/ui/community/picker";
import { Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export interface SelectionFieldProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (next: T) => void;
  error?: string | undefined;
}

export function SelectionField<T extends string>({
  label,
  value,
  options,
  onChange,
  error,
}: SelectionFieldProps<T>) {
  const { tokens } = useTheme();
  return (
    <View style={{ gap: tokens.spacing.xs }}>
      <Text
        style={{
          color: tokens.colors.text,
          fontSize: tokens.type.subheadline.fontSize,
          lineHeight: tokens.type.subheadline.lineHeight,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
      <View
        accessibilityLabel={label}
        style={{
          minHeight: tokens.target.android,
          justifyContent: "center",
          borderWidth: 1,
          borderColor: error ? tokens.colors.danger : tokens.colors.outline,
          borderRadius: tokens.radius.md,
          backgroundColor: tokens.colors.surface,
          overflow: "hidden",
        }}
      >
        <Picker
          selectedValue={value}
          onValueChange={(next) => onChange(next as T)}
          style={{ minHeight: tokens.target.android }}
        >
          {options.map((option) => (
            <Picker.Item
              key={option.value}
              label={option.label}
              value={option.value}
              color={tokens.colors.text}
            />
          ))}
        </Picker>
      </View>
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{
            color: tokens.colors.dangerText,
            fontSize: tokens.type.caption.fontSize,
            lineHeight: tokens.type.caption.lineHeight,
          }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
