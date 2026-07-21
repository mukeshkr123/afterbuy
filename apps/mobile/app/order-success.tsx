import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, ScreenView } from "@/components";
import { useTheme } from "@/theme/ThemeProvider";

export default function OrderSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const goToOrders = () => router.replace("/(tabs)/purchases");

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
              <Image
                source={require("../assets/success_badge_icon.png")}
                style={styles.illustrationImage}
                resizeMode="contain"
                accessibilityRole="image"
                accessibilityLabel=""
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
              Order added
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
            {/* Without an id there is no order to open — the screen used to
                navigate to the literal purchase "1". */}
            {id ? (
              <Button
                label="View order"
                onPress={() =>
                  router.replace({
                    pathname: "/purchase/[id]",
                    params: { id },
                  })
                }
              />
            ) : null}
            <Button
              label="Back to orders"
              variant={id ? "secondary" : "primary"}
              onPress={goToOrders}
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
  illustrationImage: {
    width: "100%",
    height: "100%",
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
