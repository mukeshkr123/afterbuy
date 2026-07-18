import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { useMutation } from "@tanstack/react-query";
import { useApi } from "@/api/ApiProvider";
import { registerDevice } from "@/api/devices";
import { useAuth } from "@/auth/useAuth";

export function PushRegistration() {
  const api = useApi();
  const { isSignedIn } = useAuth();
  const enabled = process.env["EXPO_PUBLIC_PUSH_ENABLED"] === "true";

  const register = useMutation({
    mutationFn: async () => {
      if (!enabled) return null;
      if (!Device.isDevice) return null;
      const { status } = await Notifications.getPermissionsAsync();
      let finalStatus = status;
      if (status !== "granted") {
        const req = await Notifications.requestPermissionsAsync();
        finalStatus = req.status;
      }
      if (finalStatus !== "granted") return null;
      const projectId = (
        Constants.expoConfig?.extra as
          { eas?: { projectId?: string } } | undefined
      )?.eas?.projectId;
      const token = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      const platform: "ios" | "android" =
        Device.osName === "iOS" ? "ios" : "android";
      const appVersion = Constants.expoConfig?.version ?? "0.0.0";
      await registerDevice(api, {
        expoPushToken: token.data,
        platform,
        appVersion,
      });
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
