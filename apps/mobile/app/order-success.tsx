import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AppIcon,
  Button,
  CategoryArtwork,
  Money,
  ScreenView,
  Skeleton,
} from "@/components";
import { apiKeys } from "@/api/apiKeys";
import { useApi } from "@/api/ApiProvider";
import { getPurchase } from "@/api/purchases";
import { categoryLabel, formatDate } from "@/lib/purchaseDisplay";
import { useTheme } from "@/theme/ThemeProvider";

export default function PurchaseSuccessScreen() {
  const router = useRouter();
  const api = useApi();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const purchase = useQuery({
    queryKey: apiKeys.purchases.detail(id ?? ""),
    queryFn: () => getPurchase(api, id ?? ""),
    enabled: Boolean(id),
  });

  const p = purchase.data;
  const purchaseDate = formatDate(p?.purchaseDate);

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
          <View style={[styles.centerContent, { gap: tokens.spacing.lg }]}>
            <View
              style={[
                styles.checkCircle,
                { backgroundColor: tokens.colors.successSoft },
              ]}
            >
              <AppIcon
                name="check"
                size={48}
                color={tokens.colors.successText}
              />
            </View>

            <View style={{ alignItems: "center", gap: tokens.spacing.sm }}>
              <Text
                accessibilityRole="header"
                style={[
                  styles.mainTitle,
                  {
                    color: tokens.colors.text,
                    fontSize: tokens.type.title.fontSize,
                    lineHeight: tokens.type.title.lineHeight,
                  },
                ]}
              >
                Purchase saved
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  {
                    color: tokens.colors.textSubtle,
                    fontSize: tokens.type.body.fontSize,
                    lineHeight: tokens.type.body.lineHeight,
                  },
                ]}
              >
                Return windows, warranty dates, delivery notes, and receipts now
                live together.
              </Text>
            </View>

            {purchase.isLoading ? (
              <View style={{ width: "100%", gap: tokens.spacing.sm }}>
                <Skeleton height={86} />
              </View>
            ) : p ? (
              <View
                style={[
                  styles.summary,
                  {
                    backgroundColor: tokens.colors.surface,
                    borderColor: tokens.colors.border,
                    borderRadius: tokens.radius.xl,
                    padding: tokens.spacing.lg,
                    gap: tokens.spacing.md,
                  },
                ]}
              >
                <CategoryArtwork category={p.category} size="lg" />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text
                    numberOfLines={2}
                    style={{
                      color: tokens.colors.text,
                      fontSize: tokens.type.headline.fontSize,
                      lineHeight: tokens.type.headline.lineHeight,
                      fontWeight: "800",
                    }}
                  >
                    {p.title}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={{
                      color: tokens.colors.textSubtle,
                      fontSize: tokens.type.subheadline.fontSize,
                      lineHeight: tokens.type.subheadline.lineHeight,
                    }}
                  >
                    {[p.merchant, categoryLabel(p.category), purchaseDate]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                  {p.amountMinor != null && p.amountMinor > 0 ? (
                    <Money amountMinor={p.amountMinor} currency={p.currency} />
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>

          <View style={{ gap: tokens.spacing.sm }}>
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
              label="Add another purchase"
              variant="secondary"
              onPress={() => router.replace("/purchase/new")}
            />
            <Button
              label="Back to purchases"
              variant="secondary"
              onPress={() => router.replace("/(tabs)/purchases")}
            />
            <Button
              label="Done"
              variant="tertiary"
              onPress={() => router.replace("/")}
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
  checkCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  mainTitle: {
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
  },
  summary: {
    width: "100%",
    maxWidth: 440,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
});
