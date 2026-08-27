import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppIcon, Button, ScreenView } from "@/components";
import { useTheme } from "@/theme/ThemeProvider";

export default function PurchaseSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const goToPurchases = () => router.replace("/(tabs)/purchases");

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenView>
        <View
          style={[
            styles.container,
            {
              paddingHorizontal: tokens.spacing.xxl - 4,
              paddingTop: Math.max(insets.top + tokens.spacing.xxl, 48),
              paddingBottom: Math.max(insets.bottom + tokens.spacing.xl, 28),
              gap: tokens.spacing.xl,
            },
          ]}
        >
          <View style={[styles.centerContent, { gap: tokens.spacing.md }]}>
            <View
              style={[
                styles.pedestalCircle,
                { backgroundColor: tokens.colors.successSoft },
              ]}
            >
              <AppIcon
                name="check"
                size={88}
                color={tokens.colors.successText}
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
              Purchase added
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
              We&apos;ll remind you before the return window closes and before
              the warranty runs out.
            </Text>
          </View>

          <View style={{ gap: tokens.spacing.sm }}>
            {/* Without an id there is no purchase to open — the screen used to
                navigate to the literal purchase "1". */}
            {id ? (
              <Button
                label="View purchase"
                onPress={() =>
                  router.replace({
                    pathname: "/purchase/[id]",
                    params: { id },
                  })
                }
              />
            ) : null}
            <Button
              label="Back to purchases"
              variant={id ? "secondary" : "primary"}
              onPress={goToPurchases}
            />
          </View>
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
  pedestalCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    padding: 16,
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
