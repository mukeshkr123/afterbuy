import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Sheet } from "./Sheet";
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
  const [open, setOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption?.label ?? value;

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
        accessibilityLabel={`${label}, ${displayLabel}`}
        style={({ pressed }) => [
          styles.trigger,
          {
            borderColor: error ? tokens.colors.danger : tokens.colors.border,
            borderRadius: 14,
            backgroundColor: tokens.colors.surface,
            paddingHorizontal: tokens.spacing.lg,
          },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color: tokens.colors.text,
            fontSize: tokens.type.body.fontSize,
          }}
        >
          {displayLabel}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={tokens.colors.icon} />
      </Pressable>

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
      ) : null}

      <Sheet visible={open} onRequestClose={() => setOpen(false)}>
        <View style={{ gap: tokens.spacing.sm }}>
          <View style={styles.sheetHeader}>
            <Text
              style={{
                color: tokens.colors.text,
                fontSize: tokens.type.headline.fontSize + 1,
                fontWeight: "700",
                letterSpacing: -0.3,
              }}
            >
              {label}
            </Text>
            <Pressable
              onPress={() => setOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Ionicons name="close" size={22} color={tokens.colors.icon} />
            </Pressable>
          </View>

          <FlatList
            data={options as ReadonlyArray<{ value: T; label: string }>}
            keyExtractor={(item) => item.value}
            style={{ maxHeight: 380 }}
            ItemSeparatorComponent={() => (
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: tokens.colors.border,
                }}
              />
            )}
            renderItem={({ item }) => {
              const isSelected = item.value === value;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.optionRow,
                    {
                      backgroundColor: isSelected
                        ? tokens.colors.accentSoft
                        : "transparent",
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={{
                      flex: 1,
                      color: isSelected
                        ? tokens.colors.primary
                        : tokens.colors.text,
                      fontSize: tokens.type.body.fontSize,
                      fontWeight: isSelected ? "700" : "500",
                    }}
                  >
                    {item.label}
                  </Text>
                  {isSelected ? (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={tokens.colors.primary}
                    />
                  ) : null}
                </Pressable>
              );
            }}
          />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 52,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
});
