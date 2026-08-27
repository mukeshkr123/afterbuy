import DateTimePicker from "@expo/ui/community/datetime-picker";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { isIsoDate } from "../lib/date";
import { useTheme } from "../theme/ThemeProvider";
import { AppIcon } from "./AppIcon";

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
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date)
    : "Choose a date";

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
      {Platform.OS === "ios" ? (
        <View
          style={{
            minHeight: tokens.target.ios,
            justifyContent: "center",
            borderWidth: 1,
            borderColor: error ? tokens.colors.danger : tokens.colors.outline,
            borderRadius: tokens.radius.md,
            backgroundColor: tokens.colors.surface,
            paddingHorizontal: tokens.spacing.md,
          }}
        >
          <DateTimePicker
            value={date}
            mode="date"
            display="compact"
            accentColor={tokens.colors.primary}
            themeVariant={isDark ? "dark" : "light"}
            onValueChange={(_, next) => onChange(toIso(next))}
            style={{ width: "100%" }}
          />
        </View>
      ) : (
        <>
          <Pressable
            onPress={() => setOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`${label}, ${display}`}
            style={({ pressed }) => ({
              minHeight: tokens.target.android,
              borderWidth: 1,
              borderColor: error ? tokens.colors.danger : tokens.colors.outline,
              borderRadius: tokens.radius.md,
              backgroundColor: tokens.colors.surface,
              paddingHorizontal: tokens.spacing.md,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              opacity: pressed ? 0.82 : 1,
            })}
          >
            <Text
              style={{
                color: value ? tokens.colors.text : tokens.colors.textMuted,
                fontSize: tokens.type.body.fontSize,
              }}
            >
              {display}
            </Text>
            <AppIcon name="calendar" size={20} color={tokens.colors.icon} />
          </Pressable>
          {open ? (
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
        </>
      )}
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
