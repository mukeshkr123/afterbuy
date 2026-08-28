import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AppText,
  Button,
  ListItem,
  ScreenHeader,
  ScreenScroll,
  SectionCard,
  StatusPill,
  Switch,
  Tabs,
} from "@/components";
import type {
  AccentPreference,
  ReduceMotionPreference,
  TextSizePreference,
  ThemePreference,
} from "@/lib/settings";
import {
  ACCENT_OPTIONS,
  TEXT_SIZE_OPTIONS,
  useTheme,
} from "@/theme/ThemeProvider";

const THEME_TABS: Array<{ key: ThemePreference; label: string }> = [
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "system", label: "System" },
];

const TEXT_SIZE_LABEL: Record<TextSizePreference, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

const TEXT_SIZE_ORDER: TextSizePreference[] = ["small", "medium", "large"];
const ACCENT_ORDER: AccentPreference[] = [
  "indigo",
  "green",
  "amber",
  "red",
  "slate",
];

export default function AppearanceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    tokens,
    reducedMotion,
    preference,
    accentPreference,
    textSizePreference,
    reduceMotionPreference,
    setPreference,
    setAccentPreference,
    setTextSizePreference,
    setReduceMotionPreference,
  } = useTheme();
  const [draftTheme, setDraftTheme] = useState<ThemePreference>(preference);
  const [draftAccent, setDraftAccent] =
    useState<AccentPreference>(accentPreference);
  const [draftTextSize, setDraftTextSize] =
    useState<TextSizePreference>(textSizePreference);
  const [draftReduceMotion, setDraftReduceMotion] =
    useState<ReduceMotionPreference>(reduceMotionPreference);
  const [saving, setSaving] = useState(false);

  const accent = ACCENT_OPTIONS[draftAccent][tokens.name];
  const textScale = TEXT_SIZE_OPTIONS[draftTextSize];
  const reduceMotionEnabled =
    draftReduceMotion === "system"
      ? reducedMotion
      : draftReduceMotion === "reduced";

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all([
        setPreference(draftTheme),
        setAccentPreference(draftAccent),
        setTextSizePreference(draftTextSize),
        setReduceMotionPreference(draftReduceMotion),
      ]);
      if (router.canGoBack()) router.back();
      else router.replace("/settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.colors.canvas }}>
      <View
        style={{
          paddingTop: Math.max(insets.top, 12),
          paddingHorizontal: tokens.spacing.xl - 4,
          backgroundColor: tokens.colors.canvas,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: tokens.colors.border,
        }}
      >
        <ScreenHeader title="Appearance" />
      </View>

      <ScreenScroll
        gap={tokens.spacing.lg}
        safeTop={false}
        contentStyle={{
          paddingTop: tokens.spacing.lg,
          paddingBottom: Math.max(insets.bottom + 24, 32),
        }}
      >
        <View style={{ gap: tokens.spacing.md }}>
          <SectionLabel>Theme</SectionLabel>
          <Tabs
            tabs={THEME_TABS}
            activeKey={draftTheme}
            onChange={(next) => setDraftTheme(next as ThemePreference)}
          />
        </View>

        <View style={{ gap: tokens.spacing.md }}>
          <SectionLabel>Accent Color</SectionLabel>
          <View style={[styles.swatchRow, { gap: tokens.spacing.lg }]}>
            {ACCENT_ORDER.map((key) => {
              const option = ACCENT_OPTIONS[key][tokens.name];
              const selected = draftAccent === key;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${ACCENT_OPTIONS[key].label} accent`}
                  onPress={() => setDraftAccent(key)}
                  style={({ pressed }) => [
                    styles.swatchButton,
                    {
                      borderColor: selected ? option.primary : "transparent",
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View
                    style={[styles.swatch, { backgroundColor: option.primary }]}
                  >
                    {selected ? (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={option.onPrimary}
                      />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: tokens.spacing.md - 2 }}>
          <SectionLabel>Display</SectionLabel>
          <SectionCard flush>
            <ListItem
              title="Text Size"
              subtitle={TEXT_SIZE_LABEL[draftTextSize]}
              leading={<StatusPill label={TEXT_SIZE_LABEL[draftTextSize]} />}
            />
            <View
              style={[
                styles.sizePicker,
                {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: tokens.colors.border,
                  paddingHorizontal: tokens.spacing.lg,
                  paddingBottom: tokens.spacing.lg,
                  gap: tokens.spacing.sm,
                },
              ]}
            >
              {TEXT_SIZE_ORDER.map((size) => {
                const selected = draftTextSize === size;
                return (
                  <Pressable
                    key={size}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${TEXT_SIZE_LABEL[size]} text size`}
                    onPress={() => setDraftTextSize(size)}
                    style={({ pressed }) => [
                      styles.sizeChip,
                      {
                        backgroundColor: selected
                          ? accent.soft
                          : tokens.colors.surfaceMuted,
                        borderColor: selected
                          ? accent.primary
                          : tokens.colors.border,
                        opacity: pressed ? 0.82 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: selected ? accent.primary : tokens.colors.text,
                        fontSize: tokens.type.label.fontSize,
                        fontWeight: "700",
                      }}
                    >
                      {TEXT_SIZE_LABEL[size]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <ListItem
              title="Reduce Motion"
              subtitle="Minimize animations across the app"
              divider={false}
              trailing={
                <Switch
                  value={reduceMotionEnabled}
                  onValueChange={(enabled) =>
                    setDraftReduceMotion(enabled ? "reduced" : "standard")
                  }
                  accessibilityLabel="Reduce motion"
                />
              }
            />
          </SectionCard>
        </View>

        <View style={{ gap: tokens.spacing.md - 2 }}>
          <SectionLabel>Preview</SectionLabel>
          <SectionCard>
            <View style={{ gap: tokens.spacing.md }}>
              <View style={styles.previewTop}>
                <View style={{ gap: 2, flex: 1 }}>
                  <AppText
                    role="headline"
                    tone="strong"
                    style={{ fontSize: Math.round(17 * textScale) }}
                  >
                    AfterBuy
                  </AppText>
                  <AppText
                    role="body"
                    tone="strong"
                    style={{ fontSize: Math.round(17 * textScale) }}
                  >
                    Track everything.
                  </AppText>
                </View>
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color={accent.primary}
                />
              </View>
              <AppText
                role="subheadline"
                tone="subtle"
                style={{ fontSize: Math.round(15 * textScale) }}
              >
                Stay on top of returns and warranty deadlines.
              </AppText>
              <View
                style={[
                  styles.previewButton,
                  {
                    backgroundColor: accent.primary,
                    borderRadius: tokens.radius.md,
                  },
                ]}
              >
                <Text
                  style={{
                    color: accent.onPrimary,
                    fontSize: Math.round(15 * textScale),
                    fontWeight: "700",
                  }}
                >
                  Save changes
                </Text>
              </View>
            </View>
          </SectionCard>
        </View>

        <Button
          label={saving ? "Saving..." : "Save changes"}
          busy={saving}
          disabled={saving}
          onPress={() => void save()}
          style={{ backgroundColor: accent.primary }}
        />
      </ScreenScroll>
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  const { tokens } = useTheme();
  return (
    <Text
      style={{
        color: tokens.colors.text,
        fontSize: tokens.type.bodySmall.fontSize + 1,
        fontWeight: "700",
      }}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  swatchRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  swatchButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  sizePicker: {
    flexDirection: "row",
  },
  sizeChip: {
    minHeight: 38,
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  previewTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  previewButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
