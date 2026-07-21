import { Stack, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button, ScreenHeader, ScreenView } from "@/components";
import { useOnline } from "@/offline";
import { useTheme } from "@/theme/ThemeProvider";

export default function NoInternetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const online = useOnline();

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/(tabs)");

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenView>
        <View
          style={[
            styles.container,
            {
              paddingHorizontal: tokens.spacing.xl - 4,
              paddingTop: Math.max(insets.top + tokens.spacing.md, 20),
              paddingBottom: Math.max(insets.bottom + tokens.spacing.xl, 28),
            },
          ]}
        >
          <ScreenHeader title="No Internet" onBack={goBack} />

          <View style={[styles.centerContent, { gap: tokens.spacing.md }]}>
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[
                styles.iconCircle,
                {
                  backgroundColor: online
                    ? tokens.colors.successSoft
                    : tokens.colors.dangerSurface,
                },
              ]}
            >
              <Ionicons
                name={online ? "wifi" : "wifi-outline"}
                size={64}
                color={online ? tokens.colors.success : tokens.colors.danger}
              />
            </View>

            <Text
              accessibilityRole="header"
              style={[
                styles.mainTitle,
                {
                  color: tokens.colors.text,
                  fontSize: tokens.type.title.fontSize,
                },
              ]}
            >
              {online ? "You're back online" : "You're offline"}
            </Text>
            <Text
              style={[
                styles.subtitle,
                {
                  color: tokens.colors.textMuted,
                  fontSize: tokens.type.body.fontSize,
                  lineHeight: tokens.type.body.lineHeight,
                },
              ]}
            >
              {online
                ? "Your connection is back. Anything you changed while offline is syncing now."
                : "AfterBuy keeps working from its saved copy. Changes you make will sync once you reconnect."}
            </Text>
          </View>

          <Button label={online ? "Continue" : "Try again"} onPress={goBack} />
        </View>
      </ScreenView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  mainTitle: {
    fontWeight: "800",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
  },
});
