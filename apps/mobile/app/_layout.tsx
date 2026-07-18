import { ClerkProvider } from "@clerk/clerk-expo";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { tokenCache } from "@/auth/ClerkProvider";
import { ApiProvider } from "@/api/ApiProvider";
import { queryClient, queryPersister } from "@/lib/queryClient";
import { ThemeProvider } from "@/theme/ThemeProvider";

const CLERK_PUBLISHABLE_KEY = process.env["EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"];

if (!CLERK_PUBLISHABLE_KEY) {
  // We log rather than throw so the rest of the layout can still render in
  // dev mode; the auth screens will surface the missing-key error on use.
  console.warn(
    "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set — sign-in will fail."
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
            <QueryClientProvider client={queryClient}>
              <ApiProvider>
                <ThemeProvider>
                  <StatusBar style="auto" />
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: "transparent" },
                    }}
                  />
                </ThemeProvider>
              </ApiProvider>
            </QueryClientProvider>
          </PersistQueryClientProvider>
        </ClerkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
