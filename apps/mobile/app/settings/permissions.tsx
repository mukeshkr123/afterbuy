import React, { useCallback, useEffect, useState } from "react";
import {
  AppState,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import * as ImagePicker from "expo-image-picker";

type Grant = "granted" | "limited" | "denied" | "undetermined";

interface PermissionRow {
  id: "notifications" | "camera" | "photos";
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
}

const ROWS: readonly PermissionRow[] = [
  {
    id: "notifications",
    title: "Notifications",
    subtitle: "Return and warranty reminders",
    icon: "notifications-outline",
    iconBg: "#EEF2FF",
    iconColor: "#6366F1",
  },
  {
    id: "camera",
    title: "Camera",
    subtitle: "Photographing receipts on the go",
    icon: "camera-outline",
    iconBg: "#FEF3C7",
    iconColor: "#D97706",
  },
  {
    id: "photos",
    title: "Photos Library",
    subtitle: "Attaching receipts from your camera roll",
    icon: "images-outline",
    iconBg: "#FCE7F3",
    iconColor: "#DB2777",
  },
];

const BADGE_STYLES: Record<
  Grant,
  { label: string; bg: string; text: string; border: string }
> = {
  granted: {
    label: "Allowed",
    bg: "#DCFCE7",
    text: "#16A34A",
    border: "#BBF7D0",
  },
  limited: {
    label: "Limited",
    bg: "#FEF9C3",
    text: "#CA8A04",
    border: "#FEF08A",
  },
  denied: {
    label: "Blocked",
    bg: "#FEE2E2",
    text: "#DC2626",
    border: "#FECACA",
  },
  undetermined: {
    label: "Not Set",
    bg: "#F1F5F9",
    text: "#64748B",
    border: "#E2E8F0",
  },
};

function toGrant(status: string, granted: boolean, limited = false): Grant {
  if (limited) return "limited";
  if (granted) return "granted";
  return status === "undetermined" ? "undetermined" : "denied";
}

function hasLimitedPhotoAccess(
  permission: ImagePicker.MediaLibraryPermissionResponse
): boolean {
  return permission.granted && permission.accessPrivileges === "limited";
}

export default function PermissionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<Record<PermissionRow["id"], Grant>>({
    notifications: "undetermined",
    camera: "undetermined",
    photos: "undetermined",
  });

  const refresh = useCallback(async () => {
    const [notif, camera, photos] = await Promise.all([
      Notifications.getPermissionsAsync(),
      ImagePicker.getCameraPermissionsAsync(),
      ImagePicker.getMediaLibraryPermissionsAsync(),
    ]);
    setState({
      notifications: toGrant(notif.status, notif.granted),
      camera: toGrant(camera.status, camera.granted),
      photos: toGrant(
        photos.status,
        photos.granted,
        hasLimitedPhotoAccess(photos)
      ),
    });
  }, []);

  useEffect(() => {
    void refresh();
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const request = async (id: PermissionRow["id"]) => {
    if (id === "notifications") await Notifications.requestPermissionsAsync();
    else if (id === "camera") await ImagePicker.requestCameraPermissionsAsync();
    else await ImagePicker.requestMediaLibraryPermissionsAsync();
    await refresh();
  };

  return (
    <View style={styles.container}>
      {/* Ambient glow */}
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
        {/* Intro */}
        <View style={styles.introBox}>
          <Text style={styles.headline}>App Access</Text>
          <Text style={styles.subheadline}>
            AfterBuy only requests permissions essential for tracking your
            purchases, receipts, and deadlines.
          </Text>
        </View>

        {/* Permissions Group Card */}
        <View style={styles.groupCard}>
          {ROWS.map((row, idx) => {
            const grant = state[row.id];
            const badge = BADGE_STYLES[grant];
            const isLast = idx === ROWS.length - 1;
            const canInteract =
              grant === "undetermined" ||
              grant === "denied" ||
              grant === "limited";

            return (
              <React.Fragment key={row.id}>
                <Pressable
                  accessibilityRole={canInteract ? "button" : undefined}
                  onPress={
                    grant === "undetermined"
                      ? () => void request(row.id)
                      : grant === "denied" || grant === "limited"
                        ? () => void Linking.openSettings()
                        : undefined
                  }
                  style={({ pressed }) => [
                    styles.row,
                    canInteract && pressed && styles.rowPressed,
                  ]}
                >
                  <View
                    style={[styles.iconBox, { backgroundColor: row.iconBg }]}
                  >
                    <Ionicons name={row.icon} size={20} color={row.iconColor} />
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle}>{row.title}</Text>
                    <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: badge.bg,
                        borderColor: badge.border,
                      },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: badge.text }]}>
                      {badge.label}
                    </Text>
                  </View>
                </Pressable>
                {!isLast && <View style={styles.separator} />}
              </React.Fragment>
            );
          })}
        </View>

        {/* System Settings Action */}
        <Pressable
          accessibilityRole="button"
          onPress={() => void Linking.openSettings()}
          style={({ pressed }) => [
            styles.settingsBtn,
            pressed && styles.settingsBtnPressed,
          ]}
        >
          <Ionicons name="settings-outline" size={18} color="#0F172A" />
          <Text style={styles.settingsBtnText}>Open System Settings</Text>
        </Pressable>

        {/* Security / Privacy Note Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconBox}>
            <Ionicons name="lock-closed-outline" size={18} color="#6366F1" />
          </View>
          <Text style={styles.infoText}>
            You can modify or revoke any of these permissions at any time
            through iOS Settings &gt; AfterBuy.
          </Text>
        </View>
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
    gap: 20,
  },
  introBox: {
    gap: 6,
    marginBottom: 4,
  },
  headline: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  subheadline: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
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
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  separator: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 70,
  },
  settingsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  settingsBtnPressed: {
    backgroundColor: "#F8FAFC",
    transform: [{ scale: 0.99 }],
  },
  settingsBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 12,
  },
  infoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
});
