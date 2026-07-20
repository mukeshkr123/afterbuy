import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";

export default function PermissionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();

  const [allowedMap, setAllowedMap] = useState<Record<string, boolean>>({});

  const togglePermission = (id: string) => {
    setAllowedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isDark = tokens.colors.bg !== "#FFFFFF";
  const bgColor = isDark ? tokens.colors.bg : "#FAFAFA";
  const cardBg = isDark ? tokens.colors.surface : "#FFFFFF";
  const textColor = tokens.colors.text ?? "#0F172A";
  const textMuted = tokens.colors.textMuted ?? "#6B7280";
  const borderColor = isDark ? tokens.colors.border : "#F3F4F6";

  const permissionsList = [
    {
      id: "camera",
      title: "Camera",
      subtitle: "For scanning bills",
    },
    {
      id: "storage",
      title: "Storage",
      subtitle: "For saving invoices",
    },
    {
      id: "notifications",
      title: "Notifications",
      subtitle: "For reminders & updates",
    },
    {
      id: "email",
      title: "Email Access (Optional)",
      subtitle: "For auto-import (Gmail)",
    },
  ];

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
          {/* Header Row */}
          <View style={styles.headerRow}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={24} color={textColor} />
            </Pressable>

            <View style={{ width: 38 }} />
          </View>

          {/* Title Header */}
          <View style={styles.titleContainer}>
            <Text style={[styles.screenTitle, { color: textColor }]}>
              Permissions
            </Text>
            <Text style={[styles.screenSubtitle, { color: textMuted }]}>
              We only ask for what's needed.
            </Text>
          </View>

          {/* Permissions Group Card */}
          <View style={[styles.groupCard, { backgroundColor: cardBg }]}>
            {permissionsList.map((item, idx) => {
              const isLast = idx === permissionsList.length - 1;
              const isAllowed = Boolean(allowedMap[item.id]);

              return (
                <View
                  key={item.id}
                  style={[
                    styles.permissionRow,
                    !isLast && {
                      borderBottomColor: borderColor,
                      borderBottomWidth: 1,
                    },
                  ]}
                >
                  <View style={styles.permissionMeta}>
                    <Text
                      style={[styles.permissionTitle, { color: textColor }]}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[styles.permissionSubtitle, { color: textMuted }]}
                    >
                      {item.subtitle}
                    </Text>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.allowButton,
                      isAllowed && styles.allowedButton,
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => togglePermission(item.id)}
                  >
                    <Text
                      style={[
                        styles.allowButtonText,
                        isAllowed && styles.allowedButtonText,
                      ]}
                    >
                      {isAllowed ? "Allowed ✓" : "Allow >"}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          {/* Footer Note */}
          <Text style={[styles.footerNoteText, { color: textMuted }]}>
            You can change permissions anytime in system settings.
          </Text>
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
  titleContainer: {
    gap: 4,
    marginTop: 4,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  screenSubtitle: {
    fontSize: 14,
  },
  groupCard: {
    borderRadius: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  permissionMeta: {
    gap: 3,
    flex: 1,
    paddingRight: 12,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  permissionSubtitle: {
    fontSize: 13,
  },
  allowButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  allowButtonText: {
    color: "#4F46E5",
    fontSize: 13,
    fontWeight: "700",
  },
  allowedButton: {
    backgroundColor: "#DCFCE7",
    borderColor: "#DCFCE7",
  },
  allowedButtonText: {
    color: "#16A34A",
  },
  footerNoteText: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 18,
  },
});
