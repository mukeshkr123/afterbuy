import React, { useCallback, useEffect, useState } from "react";
import {
  AppState,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import { patchMe } from "@/api/auth";
import { useApi } from "@/api/ApiProvider";

type PermissionId = "notifications" | "camera" | "photos";
type Grant = "granted" | "denied" | "undetermined";

const ROWS: readonly {
  id: PermissionId;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
}[] = [
  {
    id: "notifications",
    title: "Notifications",
    subtitle: "Get reminders for return deadlines and warranty expirations.",
    icon: "notifications-outline",
    iconBg: "#EEF2FF",
    iconColor: "#6366F1",
  },
  {
    id: "camera",
    title: "Camera",
    subtitle: "Quickly scan receipts and barcode serial numbers.",
    icon: "camera-outline",
    iconBg: "#FEF3C7",
    iconColor: "#D97706",
  },
  {
    id: "photos",
    title: "Photo Library",
    subtitle:
      "Attach receipt images and proofs directly from your camera roll.",
    icon: "images-outline",
    iconBg: "#FCE7F3",
    iconColor: "#DB2777",
  },
];

function toGrant(status: string, granted: boolean): Grant {
  if (granted) return "granted";
  return status === "undetermined" ? "undetermined" : "denied";
}

export default function OnboardingPermissionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const api = useApi();
  const [state, setState] = useState<Record<PermissionId, Grant>>({
    notifications: "undetermined",
    camera: "undetermined",
    photos: "undetermined",
  });

  const refresh = useCallback(async () => {
    const [notifications, camera, photos] = await Promise.all([
      Notifications.getPermissionsAsync(),
      ImagePicker.getCameraPermissionsAsync(),
      ImagePicker.getMediaLibraryPermissionsAsync(),
    ]);
    setState({
      notifications: toGrant(notifications.status, notifications.granted),
      camera: toGrant(camera.status, camera.granted),
      photos: toGrant(photos.status, photos.granted),
    });
  }, []);

  useEffect(() => {
    void refresh();
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const request = async (id: PermissionId) => {
    if (state[id] === "denied") {
      await Linking.openSettings();
      return;
    }
    if (id === "notifications") {
      const result = await Notifications.requestPermissionsAsync();
      if (result.granted) {
        await patchMe(api, { pushEnabled: true });
      }
    } else if (id === "camera") {
      await ImagePicker.requestCameraPermissionsAsync();
    } else {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    }
    await refresh();
  };

  return (
    <View style={styles.container}>
      {/* Ambient background glow */}
      <View style={styles.ambientGlow} pointerEvents="none" />

      {/* Header */}
      <View
        style={[styles.header, { paddingTop: Math.max(insets.top + 8, 16) }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(auth)/sign-up")
          }
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.backBtnPressed,
          ]}
        >
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle}>Permissions</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 32, 40) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>
            Allow access
          </Text>
          <Text style={styles.subtitle}>
            Enable device permissions to get automatic reminders and easily
            attach receipts.
          </Text>
        </View>

        {/* Permissions Group Card */}
        <View style={styles.groupCard}>
          {ROWS.map((row, idx) => {
            const grant = state[row.id];
            const enabled = grant === "granted";
            const isLast = idx === ROWS.length - 1;

            return (
              <React.Fragment key={row.id}>
                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{ checked: enabled }}
                  accessibilityLabel={row.title}
                  onPress={() => void request(row.id)}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <View
                    style={[styles.iconBox, { backgroundColor: row.iconBg }]}
                  >
                    <Ionicons name={row.icon} size={20} color={row.iconColor} />
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle}>{row.title}</Text>
                    <Text style={styles.rowSubtitle}>
                      {grant === "denied"
                        ? "Blocked • Tap to open Settings"
                        : row.subtitle}
                    </Text>
                  </View>
                  <Switch
                    value={enabled}
                    onValueChange={() => void request(row.id)}
                    trackColor={{ false: "#E2E8F0", true: "#775DF5" }}
                    thumbColor="#FFFFFF"
                  />
                </Pressable>
                {!isLast && <View style={styles.separator} />}
              </React.Fragment>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/onboarding/preferences")}
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && styles.primaryBtnPressed,
          ]}
        >
          <Text style={styles.primaryBtnText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </Pressable>

        <Text style={styles.footnote}>
          You can modify or revoke these permissions anytime in device Settings.
        </Text>
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
  heading: {
    gap: 8,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#64748B",
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  rowPressed: {
    backgroundColor: "#F8FAFC",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
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
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#775DF5",
    shadowColor: "#775DF5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
  },
  primaryBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  footnote: {
    textAlign: "center",
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },
});
