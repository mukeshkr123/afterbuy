import { Stack } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { AppState, Linking, Text, View } from "react-native";
import * as Notifications from "expo-notifications";
import * as ImagePicker from "expo-image-picker";
import {
  Button,
  IconTile,
  ListItem,
  ScreenHeader,
  ScreenScroll,
  SectionCard,
  StatusPill,
} from "@/components";
import { useTheme } from "@/theme/ThemeProvider";

type Grant = "granted" | "denied" | "undetermined";

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
    subtitle: "Photographing bills",
    icon: "camera-outline",
  },
  {
    id: "photos",
    title: "Photos",
    subtitle: "Attaching bills from your library",
    icon: "images-outline",
  },
];

const TONE: Record<Grant, "success" | "danger" | "neutral"> = {
  granted: "success",
  denied: "danger",
  undetermined: "neutral",
};

const LABEL: Record<Grant, string> = {
  granted: "Allowed",
  denied: "Blocked",
  undetermined: "Not set",
};

function toGrant(status: string, granted: boolean): Grant {
  if (granted) return "granted";
  return status === "undetermined" ? "undetermined" : "denied";
}

export default function PermissionsScreen() {
  const { tokens } = useTheme();
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
      photos: toGrant(photos.status, photos.granted),
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
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenScroll gap={tokens.spacing.lg + 2}>
        <ScreenHeader title="Permissions" />

        <View style={{ gap: tokens.spacing.xs }}>
          <Text
            accessibilityRole="header"
            style={{
              color: tokens.colors.text,
              fontSize: tokens.type.title.fontSize,
              fontWeight: "800",
              letterSpacing: -0.3,
            }}
          >
            Permissions
          </Text>
          <Text
            style={{
              color: tokens.colors.textMuted,
              fontSize: tokens.type.body.fontSize,
              lineHeight: tokens.type.body.lineHeight,
            }}
          >
            We only ask for what AfterBuy actually uses.
          </Text>
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
                    tone={grant === "granted" ? "success" : "neutral"}
                  />
                }
                trailing={
                  <StatusPill label={LABEL[grant]} tone={TONE[grant]} />
                }
                // Once blocked, only the OS settings app can re-grant.
                onPress={
                  grant === "undetermined"
                    ? () => void request(row.id)
                    : grant === "denied"
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
      </ScreenScroll>
    </>
  );
}
