import DateTimePicker from "@expo/ui/community/datetime-picker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { isIsoDate } from "../lib/date";
import { useTheme } from "../theme/ThemeProvider";
import { AppIcon } from "./AppIcon";
import { Button } from "./Button";
import { Sheet } from "./Sheet";

function parseIso(value: string): Date {
  if (isIsoDate(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year ?? 2000, (month ?? 1) - 1, day ?? 1);
  }
  return new Date();
}

function toIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function NativeDateField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  error?: string | undefined;
}) {
  const { tokens, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const date = parseIso(value);
  const display = value
    ? new Intl.DateTimeFormat(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date)
    : "Choose a date";

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
        accessibilityLabel={`${label}, ${display}`}
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
            color: value ? tokens.colors.text : tokens.colors.textMuted,
            fontSize: tokens.type.body.fontSize,
          }}
        >
          {display}
        </Text>
        <AppIcon name="calendar" size={19} color={tokens.colors.icon} />
      </Pressable>

      {Platform.OS === "ios" ? (
        <Sheet visible={open} onRequestClose={() => setOpen(false)}>
          <View style={{ gap: tokens.spacing.md, alignItems: "center" }}>
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
            </View>

            <DateTimePicker
              value={date}
              mode="date"
              display="inline"
              accentColor={tokens.colors.primary}
              themeVariant={isDark ? "dark" : "light"}
              onValueChange={(_, next) => {
                onChange(toIso(next));
              }}
              style={{ width: 320, alignSelf: "center" }}
            />

            <Button
              label="Done"
              size="lg"
              style={{ width: "100%" }}
              onPress={() => setOpen(false)}
            />
          </View>
        </Sheet>
      ) : open ? (
        <DateTimePicker
          value={date}
          mode="date"
          presentation="dialog"
          accentColor={tokens.colors.primary}
          onDismiss={() => setOpen(false)}
          onValueChange={(_, next) => {
            onChange(toIso(next));
            setOpen(false);
          }}
        />
      ) : null}

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
    width: "100%",
    paddingBottom: 4,
  },
});
