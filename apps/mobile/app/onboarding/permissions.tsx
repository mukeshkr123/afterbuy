import React, { useCallback, useEffect, useState } from "react";
import {
  AppState,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import { Button, IconTile, ScreenHeader, ScreenScroll } from "@/components";
import { patchMe } from "@/api/auth";
import { useApi } from "@/api/ApiProvider";
import { useTheme } from "@/theme/ThemeProvider";

type PermissionId = "notifications" | "camera" | "photos";
type Grant = "granted" | "denied" | "undetermined";

const ROWS: readonly {
  id: PermissionId;
  title: string;
  subtitle: string;
  icon: "notifications-outline" | "camera-outline" | "images-outline";
}[] = [
  {
    id: "notifications",
    title: "Notifications",
    subtitle: "Get reminders for warranties, returns, and claims.",
    icon: "notifications-outline",
  },
  {
    id: "camera",
    title: "Camera",
    subtitle: "Scan receipts and product details quickly.",
    icon: "camera-outline",
  },
  {
    id: "photos",
    title: "Photo Library",
    subtitle: "Attach receipts and product images.",
    icon: "images-outline",
  },
];

function toGrant(status: string, granted: boolean): Grant {
  if (granted) return "granted";
  return status === "undetermined" ? "undetermined" : "denied";
}

export default function OnboardingPermissionsScreen() {
  const router = useRouter();
  const api = useApi();
  const { tokens } = useTheme();
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
    <ScreenScroll gap={tokens.spacing.lg} contentStyle={styles.scrollContent}>
      <ScreenHeader
        title=""
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/(auth)/sign-up")
        }
      />

      <View style={styles.heading}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: tokens.colors.textStrong }]}
        >
          Allow permissions
        </Text>
        <Text style={[styles.subtitle, { color: tokens.colors.textSubtle }]}>
          Enable permissions to get the most out of AfterBuy.
        </Text>
      </View>

      <View style={styles.rows}>
        {ROWS.map((row) => {
          const grant = state[row.id];
          const enabled = grant === "granted";
          return (
            <Pressable
              key={row.id}
              accessibilityRole="switch"
              accessibilityState={{ checked: enabled, disabled: false }}
              accessibilityLabel={row.title}
              onPress={() => void request(row.id)}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: tokens.colors.surface,
                  borderColor: tokens.colors.border,
                  borderRadius: tokens.radius.xl,
                  opacity: pressed ? 0.86 : 1,
                },
              ]}
            >
              <IconTile icon={row.icon} tone={enabled ? "accent" : "neutral"} />
              <View style={styles.rowCopy}>
                <Text style={[styles.rowTitle, { color: tokens.colors.text }]}>
                  {row.title}
                </Text>
                <Text
                  style={[
                    styles.rowSubtitle,
                    { color: tokens.colors.textSubtle },
                  ]}
                >
                  {grant === "denied"
                    ? "Open Settings to enable this."
                    : row.subtitle}
                </Text>
              </View>
              <Toggle checked={enabled} />
            </Pressable>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />

      <Button
        label="Continue"
        size="lg"
        onPress={() => router.push("/onboarding/preferences")}
      />
      <Text style={[styles.footnote, { color: tokens.colors.textMuted }]}>
        You can change this anytime in Settings.
      </Text>
    </ScreenScroll>
  );
}

function Toggle({ checked }: { checked: boolean }) {
  const { tokens } = useTheme();
  return (
    <View
      style={[
        styles.toggle,
        {
          backgroundColor: checked
            ? tokens.colors.accent
            : tokens.colors.surfaceMuted,
          borderColor: checked ? tokens.colors.accent : tokens.colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.knob,
          {
            backgroundColor: checked
              ? tokens.colors.accentText
              : tokens.colors.surface,
            transform: [{ translateX: checked ? 18 : 0 }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    minHeight: "100%",
    paddingBottom: 28,
  },
  heading: { gap: 7, marginTop: 8, marginBottom: 6 },
  title: { fontSize: 28, lineHeight: 35, fontWeight: "800" },
  subtitle: { fontSize: 15, lineHeight: 22, fontWeight: "500", maxWidth: 340 },
  rows: { gap: 12 },
  row: {
    minHeight: 82,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, lineHeight: 20, fontWeight: "800" },
  rowSubtitle: { fontSize: 13, lineHeight: 18, fontWeight: "500" },
  toggle: {
    width: 48,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  knob: { width: 24, height: 24, borderRadius: 12 },
  footnote: {
    textAlign: "center",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
});
