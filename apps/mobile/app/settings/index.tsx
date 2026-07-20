import { Stack, useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens, preference, setPreference } = useTheme();

  const isDark = preference === "dark";
  const bgColor = isDark ? tokens.colors.bg : "#FAFAFA";
  const cardBg = isDark ? tokens.colors.surface : "#FFFFFF";
  const textColor = tokens.colors.text ?? "#0F172A";
  const textMuted = tokens.colors.textMuted ?? "#6B7280";
  const borderColor = isDark ? tokens.colors.border : "#F3F4F6";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top + 8, 20),
              paddingBottom: Math.max(insets.bottom + 20, 28),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Bar */}
          <View style={styles.headerRow}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={24} color={textColor} />
            </Pressable>

            <Text style={[styles.headerTitle, { color: textColor }]}>
              Settings
            </Text>

            <View style={{ width: 38 }} />
          </View>

          {/* General Section */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              General
            </Text>

            <View style={[styles.groupCard, { backgroundColor: cardBg }]}>
              {/* Dark Mode Row */}
              <View
                style={[
                  styles.settingRow,
                  { borderBottomColor: borderColor, borderBottomWidth: 1 },
                ]}
              >
                <Text style={[styles.settingLabel, { color: textColor }]}>
                  Dark Mode
                </Text>
                <Switch
                  value={isDark}
                  onValueChange={(val) =>
                    void setPreference(val ? "dark" : "light")
                  }
                  trackColor={{ false: "#E5E7EB", true: "#4F46E5" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Language Row */}
              <Pressable
                style={({ pressed }) => [
                  styles.settingRow,
                  { borderBottomColor: borderColor, borderBottomWidth: 1 },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => {}}
              >
                <Text style={[styles.settingLabel, { color: textColor }]}>
                  Language
                </Text>
                <View style={styles.rightValueBox}>
                  <Text style={[styles.rightValueText, { color: textMuted }]}>
                    English
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </View>
              </Pressable>

              {/* Currency Row */}
              <Pressable
                style={({ pressed }) => [
                  styles.settingRow,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => {}}
              >
                <Text style={[styles.settingLabel, { color: textColor }]}>
                  Currency
                </Text>
                <View style={styles.rightValueBox}>
                  <Text style={[styles.rightValueText, { color: textMuted }]}>
                    INR (₹)
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </View>
              </Pressable>
            </View>
          </View>

          {/* Data & Privacy Section */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Data & Privacy
            </Text>

            <View style={[styles.groupCard, { backgroundColor: cardBg }]}>
              {/* Data Backup */}
              <Pressable
                style={({ pressed }) => [
                  styles.settingRow,
                  { borderBottomColor: borderColor, borderBottomWidth: 1 },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => {}}
              >
                <Text style={[styles.settingLabel, { color: textColor }]}>
                  Data Backup
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </Pressable>

              {/* Export My Data */}
              <Pressable
                style={({ pressed }) => [
                  styles.settingRow,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => {}}
              >
                <Text style={[styles.settingLabel, { color: textColor }]}>
                  Export My Data
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </Pressable>
            </View>
          </View>

          {/* App Permissions Link */}
          <View style={styles.sectionContainer}>
            <View style={[styles.groupCard, { backgroundColor: cardBg }]}>
              <Pressable
                style={({ pressed }) => [
                  styles.settingRow,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => router.push("/settings/permissions")}
              >
                <Text style={[styles.settingLabel, { color: textColor }]}>
                  App Permissions
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </Pressable>
            </View>
          </View>

          {/* About Section */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              About
            </Text>

            <View style={[styles.groupCard, { backgroundColor: cardBg }]}>
              <Pressable
                style={({ pressed }) => [
                  styles.settingRow,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => {}}
              >
                <Text style={[styles.settingLabel, { color: textColor }]}>
                  About AfterBuy
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    gap: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 38,
    height: 38,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  sectionContainer: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  groupCard: {
    borderRadius: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  rightValueBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rightValueText: {
    fontSize: 14,
  },
});
