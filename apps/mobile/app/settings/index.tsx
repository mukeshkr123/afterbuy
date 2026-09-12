import { useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useTheme } from "@/theme/ThemeProvider";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { tokens } = useTheme();

  const version =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "1.0.0";
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    "Not available";

  return (
    <View style={styles.container}>
      {/* Ambient background glow */}
      <View style={styles.ambientGlow} pointerEvents="none" />

      {/* Modern Top Bar */}
      <View
        style={[styles.header, { paddingTop: Math.max(insets.top + 8, 16) }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(tabs)/profile")
          }
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.backBtnPressed,
          ]}
        >
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 32, 40) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* PREFERENCES SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>PREFERENCES</Text>
          <View style={styles.groupCard}>
            <SettingRow
              icon="color-palette-outline"
              iconBg="#EEF2FF"
              iconColor="#6366F1"
              title="Appearance"
              subtitle="Theme, colors, and display"
              onPress={() => router.push("/settings/appearance")}
            />
            <View style={styles.separator} />
            <SettingRow
              icon="time-outline"
              iconBg="#E0F2FE"
              iconColor="#0284C7"
              title="Reminder Timing"
              subtitle="How far ahead we warn you"
              onPress={() => router.push("/settings/lead-days")}
            />
            <View style={styles.separator} />
            <SettingRow
              icon="globe-outline"
              iconBg="#ECFDF5"
              iconColor="#059669"
              title="Time Zone"
              subtitle="When daily reminders are sent"
              onPress={() => router.push("/settings/timezone")}
            />
          </View>
        </View>

        {/* ACCOUNT SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>ACCOUNT</Text>
          <View style={styles.groupCard}>
            <SettingRow
              icon="mail-outline"
              iconBg="#F3E8FF"
              iconColor="#9333EA"
              title="Email"
              subtitle={email}
              hasChevron={false}
            />
            <View style={styles.separator} />
            <SettingRow
              icon="trash-outline"
              iconBg="#FFE4E6"
              iconColor="#E11D48"
              title="Delete Account"
              subtitle="Permanently remove your data"
              onPress={() => router.push("/delete-account")}
              isDestructive
            />
          </View>
        </View>

        {/* APP & SUPPORT SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>APP & SUPPORT</Text>
          <View style={styles.groupCard}>
            <SettingRow
              icon="shield-checkmark-outline"
              iconBg="#EEF2FF"
              iconColor="#4F46E5"
              title="App Permissions"
              subtitle="Notifications, camera, and photos"
              onPress={() => router.push("/settings/permissions")}
            />
            <View style={styles.separator} />
            <SettingRow
              icon="help-circle-outline"
              iconBg="#CCFBF1"
              iconColor="#0D9488"
              title="Help & Support"
              subtitle="Get help or send feedback"
              onPress={() => router.push("/support")}
            />
          </View>
        </View>

        {/* VERSION INFO */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>AfterBuy • Version {version}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function SettingRow({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  onPress,
  hasChevron = true,
  isDestructive = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
  hasChevron?: boolean;
  isDestructive?: boolean;
}) {
  const content = (
    <View style={styles.rowInner}>
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.rowTextCol}>
        <Text
          style={[styles.rowTitle, isDestructive && styles.destructiveTitle]}
        >
          {title}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {hasChevron ? (
        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.rowPressable,
          pressed && styles.rowPressed,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.rowPressable}>{content}</View>;
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
  rowPressable: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowPressed: {
    backgroundColor: "#F8FAFC",
  },
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTextCol: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  destructiveTitle: {
    color: "#E11D48",
  },
  rowSubtitle: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
  separator: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 70,
  },
  versionContainer: {
    alignItems: "center",
    paddingTop: 8,
  },
  versionText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
});
