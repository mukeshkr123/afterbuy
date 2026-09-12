import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

const THEME_OPTIONS: Array<{
  key: ThemePreference;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: "light", label: "Light", icon: "sunny-outline" },
  { key: "dark", label: "Dark", icon: "moon-outline" },
  { key: "system", label: "System", icon: "phone-portrait-outline" },
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
    <View style={styles.container}>
      {/* Ambient background glow */}
      <View style={styles.ambientGlow} pointerEvents="none" />

      {/* Modern Header */}
      <View
        style={[styles.header, { paddingTop: Math.max(insets.top + 8, 16) }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/settings")
          }
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.backBtnPressed,
          ]}
        >
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle}>Appearance</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 32, 40) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* THEME MODE */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>THEME MODE</Text>
          <View style={styles.themeGrid}>
            {THEME_OPTIONS.map((item) => {
              const isSelected = draftTheme === item.key;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setDraftTheme(item.key)}
                  style={({ pressed }) => [
                    styles.themeCard,
                    isSelected && styles.themeCardSelected,
                    pressed && styles.themeCardPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.themeIconBox,
                      isSelected && styles.themeIconBoxSelected,
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={isSelected ? "#775DF5" : "#64748B"}
                    />
                  </View>
                  <Text
                    style={[
                      styles.themeLabel,
                      isSelected && styles.themeLabelSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ACCENT COLOR */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>ACCENT COLOR</Text>
          <View style={styles.accentCard}>
            <View style={styles.swatchRow}>
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
                      style={[
                        styles.swatch,
                        { backgroundColor: option.primary },
                      ]}
                    >
                      {selected && (
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color={option.onPrimary}
                        />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* DISPLAY OPTIONS */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>DISPLAY & ACCESSIBILITY</Text>
          <View style={styles.groupCard}>
            {/* Text Size */}
            <View style={styles.displayRow}>
              <View style={styles.displayInfo}>
                <Text style={styles.displayTitle}>Text Size</Text>
                <Text style={styles.displaySubtitle}>
                  Scale application typography
                </Text>
              </View>
              <View style={styles.sizeChips}>
                {TEXT_SIZE_ORDER.map((size) => {
                  const selected = draftTextSize === size;
                  return (
                    <Pressable
                      key={size}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => setDraftTextSize(size)}
                      style={[
                        styles.sizeChip,
                        selected && styles.sizeChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.sizeChipText,
                          selected && styles.sizeChipTextSelected,
                        ]}
                      >
                        {TEXT_SIZE_LABEL[size]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.separator} />

            {/* Reduce Motion */}
            <View style={styles.displayRow}>
              <View style={styles.displayInfo}>
                <Text style={styles.displayTitle}>Reduce Motion</Text>
                <Text style={styles.displaySubtitle}>
                  Minimize animations across the app
                </Text>
              </View>
              <Switch
                value={reduceMotionEnabled}
                onValueChange={(enabled) =>
                  setDraftReduceMotion(enabled ? "reduced" : "standard")
                }
                trackColor={{ false: "#E2E8F0", true: "#775DF5" }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* LIVE PREVIEW */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>PREVIEW</Text>
          <View style={styles.previewCard}>
            <View style={styles.previewTop}>
              <View style={{ gap: 2, flex: 1 }}>
                <Text
                  style={[
                    styles.previewHeader,
                    { fontSize: Math.round(18 * textScale) },
                  ]}
                >
                  AfterBuy Preview
                </Text>
                <Text
                  style={[
                    styles.previewSubheader,
                    { fontSize: Math.round(14 * textScale) },
                  ]}
                >
                  Never miss a return window or warranty deadline.
                </Text>
              </View>
              <View
                style={[
                  styles.previewIconBox,
                  { backgroundColor: accent.soft },
                ]}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={20}
                  color={accent.primary}
                />
              </View>
            </View>

            <View
              style={[
                styles.previewButtonMock,
                { backgroundColor: accent.primary },
              ]}
            >
              <Text
                style={[
                  styles.previewButtonText,
                  {
                    color: accent.onPrimary,
                    fontSize: Math.round(15 * textScale),
                  },
                ]}
              >
                Sample Action Button
              </Text>
            </View>
          </View>
        </View>

        {/* SAVE BUTTON */}
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={() => void save()}
          style={({ pressed }) => [
            styles.saveBtn,
            saving && { opacity: 0.7 },
            pressed && styles.saveBtnPressed,
          ]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveBtnText}>Save Appearance</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  ambientGlow: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#EDE9FE",
    opacity: 0.7,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 24,
  },
  section: {
    gap: 10,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginLeft: 4,
  },
  themeGrid: {
    flexDirection: "row",
    gap: 12,
  },
  themeCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    paddingVertical: 16,
    alignItems: "center",
    gap: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  themeCardSelected: {
    borderColor: "#775DF5",
    backgroundColor: "#F5F3FF",
  },
  themeCardPressed: {
    opacity: 0.8,
  },
  themeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  themeIconBoxSelected: {
    backgroundColor: "#EDE9FE",
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  themeLabelSelected: {
    color: "#775DF5",
    fontWeight: "700",
  },
  accentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  swatchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
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
  groupCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  displayRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  displayInfo: {
    flex: 1,
    gap: 2,
  },
  displayTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  displaySubtitle: {
    fontSize: 13,
    color: "#64748B",
  },
  sizeChips: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  sizeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sizeChipSelected: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  sizeChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  sizeChipTextSelected: {
    color: "#775DF5",
    fontWeight: "700",
  },
  separator: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 16,
  },
  previewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 18,
    gap: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  previewTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  previewHeader: {
    fontWeight: "800",
    color: "#0F172A",
  },
  previewSubheader: {
    color: "#64748B",
    lineHeight: 20,
    marginTop: 2,
  },
  previewIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  previewButtonMock: {
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  previewButtonText: {
    fontWeight: "700",
  },
  saveBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#775DF5",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#775DF5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 4,
  },
  saveBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
