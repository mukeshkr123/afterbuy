import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, IconTile, ScreenScroll, SectionCard } from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getMe } from "@/api/auth";
import { useEnqueueMutation } from "@/offline";
import { useTheme } from "@/theme/ThemeProvider";

const LEAD_PRESETS = [
  { days: 7, label: "7 days before" },
  { days: 14, label: "14 days before" },
  { days: 30, label: "30 days before" },
  { days: 60, label: "60 days before" },
];

const DEFAULT_LEAD_DAYS = 30;

export default function LeadDaysScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const { tokens } = useTheme();

  const me = useQuery({ queryKey: apiKeys.me(), queryFn: () => getMe(api) });

  // `useState(me.data?…)` captured the value before the query resolved and
  // never caught up, so the saved setting appeared unselected on open.
  const [picked, setPicked] = useState<number | null>(null);
  const selectedDays = picked ?? me.data?.reminderLeadDays ?? DEFAULT_LEAD_DAYS;

  const saveMutation = useEnqueueMutation<
    { reminderLeadDays: number },
    unknown
  >({
    build: (input) => ({
      method: "PATCH",
      endpoint: "/v1/me",
      body: input,
      label: `Set lead time to ${input.reminderLeadDays} days`,
      optimisticPatch: {
        queryKey: apiKeys.me(),
        updater: (prev) =>
          prev && typeof prev === "object"
            ? {
                ...(prev as Record<string, unknown>),
                reminderLeadDays: input.reminderLeadDays,
              }
            : prev,
        rollback: () => undefined,
      },
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: apiKeys.me() });
      router.back();
    },
  });

  return (
    <>
      <ScreenScroll gap={tokens.spacing.lg + 2} safeTop={false}>
        <SectionCard>
          <View style={[styles.infoRow, { gap: tokens.spacing.md + 2 }]}>
            <IconTile icon="alarm-outline" tone="accent" />
            <Text
              style={{
                flex: 1,
                color: tokens.colors.textMuted,
                fontSize: tokens.type.bodySmall.fontSize,
                lineHeight: tokens.type.bodySmall.lineHeight,
              }}
            >
              How far ahead we warn you that a warranty or return window is
              about to end.
            </Text>
          </View>
        </SectionCard>

        <SectionCard flush>
          {LEAD_PRESETS.map((preset, idx) => {
            const isLast = idx === LEAD_PRESETS.length - 1;
            const isSelected = selectedDays === preset.days;
            return (
              <Pressable
                key={preset.days}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={preset.label}
                onPress={() => setPicked(preset.days)}
                style={({ pressed }) => [
                  styles.presetRow,
                  {
                    paddingVertical: tokens.spacing.lg + 2,
                    paddingHorizontal: tokens.spacing.xl - 4,
                    borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: tokens.colors.border,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text
                  style={{
                    color: isSelected
                      ? tokens.colors.accent
                      : tokens.colors.text,
                    fontSize: tokens.type.body.fontSize,
                    fontWeight: "700",
                  }}
                >
                  {preset.label}
                </Text>
                <Ionicons
                  name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                  size={22}
                  color={
                    isSelected ? tokens.colors.accent : tokens.colors.border
                  }
                />
              </Pressable>
            );
          })}
        </SectionCard>

        <Button
          label={saveMutation.isPending ? "Saving…" : "Save setting"}
          disabled={saveMutation.isPending}
          onPress={() =>
            saveMutation.mutate({ reminderLeadDays: selectedDays })
          }
        />
      </ScreenScroll>
    </>
  );
}

const styles = StyleSheet.create({
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  presetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 56,
  },
});
