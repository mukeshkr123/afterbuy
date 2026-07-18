import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Sheet } from "./Sheet";
import { Button } from "./Button";
import { useTheme } from "../theme/ThemeProvider";

export interface OptionPickerProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (next: T) => void;
  error?: string | undefined;
}

export function OptionPicker<T extends string>({
  label,
  value,
  options,
  onChange,
  error,
}: OptionPickerProps<T>) {
  const { tokens } = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label ?? value;
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
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => ({
          borderColor: error ? tokens.colors.danger : tokens.colors.border,
          backgroundColor: tokens.colors.surface,
          borderRadius: tokens.radius.md,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm + 2,
          minHeight: 44,
          justifyContent: "center",
          opacity: pressed ? 0.85 : 1,
          borderWidth: 1,
        })}
      >
        <Text
          style={{
            color: tokens.colors.text,
            fontSize: tokens.type.body.fontSize,
          }}
        >
          {current}
        </Text>
      </Pressable>
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
      <Sheet visible={open} onRequestClose={() => setOpen(false)}>
        <View style={{ gap: tokens.spacing.sm }}>
          {options.map((o) => (
            <Button
              key={o.value}
              label={o.label}
              variant={o.value === value ? "primary" : "secondary"}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
            />
          ))}
          <Button
            label="Cancel"
            variant="ghost"
            onPress={() => setOpen(false)}
          />
        </View>
      </Sheet>
    </View>
  );
}
