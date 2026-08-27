import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { useMutation } from "@tanstack/react-query";
import { useApi } from "@/api/ApiProvider";
import { registerDevice, unregisterDevice } from "@/api/devices";
import { useAuth } from "@/auth/useAuth";
import { storage } from "@/lib/storage";

const DEVICE_REGISTRATION_KEY = "push:device-registration-id";

export async function unregisterCurrentDevice(
  api: Parameters<typeof unregisterDevice>[0]
): Promise<void> {
  const deviceId = await storage.getItem(DEVICE_REGISTRATION_KEY);
  if (!deviceId) return;
  try {
    await unregisterDevice(api, deviceId);
  } finally {
    await storage.removeItem(DEVICE_REGISTRATION_KEY);
  }
}

export function PushRegistration() {
  const api = useApi();
  const { isSignedIn } = useAuth();
  const enabled = process.env["EXPO_PUBLIC_PUSH_ENABLED"] === "true";

  const register = useMutation({
    mutationFn: async () => {
      if (!enabled) return null;
      if (!Device.isDevice) return null;

      if (Device.osName === "Android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#4F46E5",
        });
      }

      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") return null;
      const projectId =
        (
          Constants.expoConfig?.extra as
            { eas?: { projectId?: string } } | undefined
        )?.eas?.projectId || process.env["EXPO_PUBLIC_EAS_PROJECT_ID"];
      const token = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      const platform: "ios" | "android" =
        Device.osName === "iOS" ? "ios" : "android";
      const device = await registerDevice(api, {
        expoPushToken: token.data,
        platform,
      });
      await storage.setItem(DEVICE_REGISTRATION_KEY, device.id);
      return token.data;
    },
  });

  useEffect(() => {
    if (!isSignedIn || !enabled) return;
    register.mutate();
    // Intentionally fire once per (isSignedIn, enabled) transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, enabled]);

  return null;
}
