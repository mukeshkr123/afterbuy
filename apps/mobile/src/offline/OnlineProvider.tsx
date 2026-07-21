import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../theme/ThemeProvider";
import { outbox } from "./outbox";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BANNER_HEIGHT = 28;

function isOnline(state: NetInfoState): boolean {
  // NetInfo considers "unknown" online — the device may have connectivity
  // even if we can't tell. The first successful request will fail loudly
  // if it doesn't.
  return state.isConnected !== false && state.isInternetReachable !== false;
}

export function OnlineProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Tell TanStack Query to use our online status — without this, paused
    // queries never resume on reconnect.
    onlineManager.setEventListener((setOnline) => {
      return NetInfo.addEventListener((state) => {
        const next = isOnline(state);
        outbox.setOnline(next);
        setOnline(next);
      });
    });
    // Seed the initial value; NetInfo fires asynchronously so we read once.
    void NetInfo.fetch().then((state) => {
      const next = isOnline(state);
      outbox.setOnline(next);
      onlineManager.setOnline(next);
    });
  }, []);
  return <>{children}</>;
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    (cb) => outbox.subscribe(() => cb()),
    () => outbox.isOnline(),
    () => true
  );
}

export function usePendingCount(): number {
  return useSyncExternalStore(
    (cb) => outbox.subscribe(() => cb()),
    () => outbox.pendingCount(),
    () => 0
  );
}

export function OfflineBanner() {
  const online = useOnline();
  const pending = usePendingCount();
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  if (online && pending === 0) return null;
  const label = !online
    ? `Offline${pending > 0 ? ` · ${pending} pending` : ""}`
    : `${pending} syncing…`;
  const tone = !online ? tokens.colors.warning : tokens.colors.accent;
  return (
    // Offline is the only state with somewhere to go: the full-screen
    // explanation of what still works without a connection.
    <Pressable
      onPress={online ? undefined : () => router.push("/no-internet")}
      disabled={online}
      style={[
        styles.banner,
        {
          backgroundColor: tone,
          paddingTop: insets.top + 2,
        },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole={online ? "alert" : "button"}
      accessibilityLabel={
        online ? label : `${label}. Tap to learn what still works.`
      }
    >
      {/* In dark mode the accent is a pale indigo, so white-on-accent fails
          contrast. `accentText` is the token paired with each fill. */}
      <Text style={[styles.text, { color: tokens.colors.accentText }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: BANNER_HEIGHT + 30,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});
