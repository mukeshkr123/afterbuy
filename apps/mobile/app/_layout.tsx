import { ClerkProvider } from "@clerk/clerk-expo";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { tokenCache } from "@/auth/ClerkProvider";
import { ApiProvider } from "@/api/ApiProvider";
import { queryClient, queryPersister } from "@/lib/queryClient";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";
import { PushRegistration } from "@/notifications/PushRegistration";
import { usePushTapHandler } from "@/notifications/usePushHandler";
import { OnlineProvider, OfflineBanner } from "@/offline/OnlineProvider";

const CLERK_PUBLISHABLE_KEY = process.env["EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"];

if (!CLERK_PUBLISHABLE_KEY) {
  console.warn(
    "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set — sign-in will fail."
  );
}

function PushWiring() {
  usePushTapHandler();
  return null;
}

function ThemedStatusBar() {
  // The root <Stack> lives inside ThemeProvider so we can read the resolved
  // scheme and pick a StatusBar style that matches the header tint.
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

function ThemedStack() {
  const { tokens } = useTheme();
  // A transparent stack background let the native window color show through,
  // which stayed light after a theme switch. Paint the canvas explicitly.
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tokens.colors.canvas },
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ClerkProvider
          publishableKey={CLERK_PUBLISHABLE_KEY ?? "pk_test_placeholder"}
          tokenCache={tokenCache}
        >
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister: queryPersister }}
          >
            <ApiProvider>
              <ThemeProvider>
                <OnlineProvider>
                  <ThemedStatusBar />
                  <OfflineBanner />
                  <PushRegistration />
                  <PushWiring />
                  <ThemedStack />
                </OnlineProvider>
              </ThemeProvider>
            </ApiProvider>
          </PersistQueryClientProvider>
        </ClerkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
