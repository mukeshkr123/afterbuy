import React, { useCallback, useEffect, useState } from "react";
import { AppState, Linking, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import * as ImagePicker from "expo-image-picker";
import {
  AppText,
  Button,
  IconTile,
  ListItem,
  ScreenHeader,
  ScreenScroll,
  SectionCard,
  StatusPill,
} from "@/components";
import { useTheme } from "@/theme/ThemeProvider";

type Grant = "granted" | "limited" | "denied" | "undetermined";

interface PermissionRow {
  id: "notifications" | "camera" | "photos";
  title: string;
  subtitle: string;
  icon: "notifications-outline" | "camera-outline" | "images-outline";
}

const ROWS: readonly PermissionRow[] = [
  {
    id: "notifications",
    title: "Notifications",
    subtitle: "Return and warranty reminders",
    icon: "notifications-outline",
  },
  {
    id: "camera",
    title: "Camera",
    subtitle: "Photographing receipts",
    icon: "camera-outline",
  },
  {
    id: "photos",
    title: "Photos",
    subtitle: "Attaching receipts from your library",
    icon: "images-outline",
  },
];

const TONE: Record<Grant, "success" | "warning" | "danger" | "neutral"> = {
  granted: "success",
  limited: "warning",
  denied: "danger",
  undetermined: "neutral",
};

const LABEL: Record<Grant, string> = {
  granted: "Allowed",
  limited: "Limited",
  denied: "Blocked",
  undetermined: "Not set",
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
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<Record<PermissionRow["id"], Grant>>({
    notifications: "undetermined",
    camera: "undetermined",
    photos: "undetermined",
  });

  // Reads the real OS state rather than a local boolean map — the previous
  // "Allow" buttons flipped a value that nothing outside this screen saw.
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
    // Returning from the OS settings app is the usual way these change.
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
        <ScreenHeader title="Permissions" />
      </View>

      <ScreenScroll
        gap={tokens.spacing.lg}
        safeTop={false}
        contentStyle={{
          paddingTop: tokens.spacing.lg,
          paddingBottom: Math.max(insets.bottom + 24, 32),
        }}
      >
        <View style={{ gap: tokens.spacing.xs }}>
          <AppText role="headline">App access</AppText>
          <AppText role="body" tone="subtle">
            We only ask for what AfterBuy actually uses.
          </AppText>
        </View>

        <SectionCard flush>
          {ROWS.map((row, idx) => {
            const grant = state[row.id];
            return (
              <ListItem
                key={row.id}
                title={row.title}
                subtitle={row.subtitle}
                divider={idx < ROWS.length - 1}
                leading={
                  <IconTile
                    icon={row.icon}
                    tone={
                      grant === "granted"
                        ? "success"
                        : grant === "limited"
                          ? "warning"
                          : "neutral"
                    }
                  />
                }
                trailing={
                  <StatusPill label={LABEL[grant]} tone={TONE[grant]} />
                }
                // Once blocked, only the OS settings app can re-grant.
                onPress={
                  grant === "undetermined"
                    ? () => void request(row.id)
                    : grant === "denied" || grant === "limited"
                      ? () => void Linking.openSettings()
                      : undefined
                }
              />
            );
          })}
        </SectionCard>

        <Button
          label="Open system settings"
          variant="secondary"
          onPress={() => void Linking.openSettings()}
        />

        <SectionCard tone="muted">
          <View style={styles.noteRow}>
            <IconTile icon="lock-closed-outline" tone="neutral" />
            <AppText role="subheadline" tone="subtle" style={{ flex: 1 }}>
              You can change these at any time in your device settings.
            </AppText>
          </View>
        </SectionCard>
      </ScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
