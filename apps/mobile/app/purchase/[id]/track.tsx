import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PurchaseDeliveryStatus } from "@acme/shared";
import {
  EmptyState,
  ScreenHeader,
  ScreenScroll,
  SectionCard,
  Skeleton,
  StatusPill,
} from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getPurchase } from "@/api/purchases";
import { useTheme } from "@/theme/ThemeProvider";
import { deliveryDisplay, formatDate } from "@/lib/purchaseDisplay";

// The API records a single delivery state, not a carrier event feed. The
// timeline therefore shows which stage the purchase has reached — it does not
// invent per-step timestamps as this screen previously did.
const STAGES: ReadonlyArray<{
  status: Exclude<PurchaseDeliveryStatus, "cancelled">;
  title: string;
  description: string;
}> = [
  {
    status: "ordered",
    title: "Purchase recorded",
    description: "You recorded this purchase.",
  },
  {
    status: "shipped",
    title: "Shipped",
    description: "The merchant handed the parcel to a carrier.",
  },
  {
    status: "delivered",
    title: "Delivered",
    description: "The parcel reached you.",
  },
];

export default function TrackOrderScreen() {
  const api = useApi();
  const { tokens } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const detail = useQuery({
    queryKey: apiKeys.purchases.detail(id ?? ""),
    queryFn: () => getPurchase(api, id ?? ""),
    enabled: Boolean(id),
  });

  const p = detail.data;

  if (detail.isLoading) {
    return (
      <ScreenScroll gap={tokens.spacing.lg} safeTop={true}>
        <ScreenHeader title="Delivery" />
        <Skeleton height={88} />
        <Skeleton height={220} />
      </ScreenScroll>
    );
  }

  if (!p) {
    return (
      <ScreenScroll gap={tokens.spacing.lg} safeTop={true}>
        <ScreenHeader title="Delivery" />
        <SectionCard>
          <EmptyState
            icon="alert-circle-outline"
            title="Purchase not available"
            message="We couldn't load this purchase. Check your connection and try again."
            action={{
              label: "Try again",
              onPress: () => void detail.refetch(),
            }}
          />
        </SectionCard>
      </ScreenScroll>
    );
  }

  const status = deliveryDisplay(p.deliveryStatus);
  const cancelled = p.deliveryStatus === "cancelled";
  const reachedIndex = cancelled
    ? -1
    : STAGES.findIndex((s) => s.status === p.deliveryStatus);
  const orderedOn = formatDate(p.purchaseDate);

  return (
    <>
      <ScreenScroll gap={tokens.spacing.lg} safeTop={true}>
        <ScreenHeader title="Delivery" />
        <SectionCard>
          <View style={{ gap: 6 }}>
            <View style={[styles.titleRow, { gap: tokens.spacing.md }]}>
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  color: tokens.colors.text,
                  fontSize: tokens.type.body.fontSize,
                  fontWeight: "700",
                }}
              >
                {p.merchant ?? p.title}
              </Text>
              <StatusPill label={status.label} tone={status.tone} />
            </View>
            {p.orderNumber ? (
              <Text
                style={{
                  color: tokens.colors.textSubtle,
                  fontSize: tokens.type.bodySmall.fontSize,
                }}
              >
                Purchase reference:{" "}
                <Text style={{ color: tokens.colors.text }}>
                  {p.orderNumber}
                </Text>
              </Text>
            ) : null}
            {orderedOn ? (
              <Text
                style={{
                  color: tokens.colors.textSubtle,
                  fontSize: tokens.type.bodySmall.fontSize,
                }}
              >
                Purchased on {orderedOn}
              </Text>
            ) : null}
          </View>
        </SectionCard>

        <SectionCard>
          {cancelled ? (
            <EmptyState
              icon="close-circle-outline"
              title="Purchase cancelled"
              message="This purchase was cancelled, so there is nothing left to track."
            />
          ) : (
            <View>
              {STAGES.map((stage, idx) => {
                const reached = idx <= reachedIndex;
                const isLast = idx === STAGES.length - 1;
                return (
                  <View key={stage.status} style={styles.stepRow}>
                    <View style={styles.indicatorCol}>
                      <View
                        style={[
                          styles.dot,
                          {
                            backgroundColor: reached
                              ? tokens.colors.success
                              : tokens.colors.border,
                          },
                        ]}
                      >
                        {reached ? (
                          <Ionicons
                            name="checkmark"
                            size={12}
                            color={tokens.colors.surface}
                          />
                        ) : null}
                      </View>
                      {!isLast ? (
                        <View
                          style={[
                            styles.connector,
                            {
                              backgroundColor:
                                idx < reachedIndex
                                  ? tokens.colors.success
                                  : tokens.colors.border,
                            },
                          ]}
                        />
                      ) : null}
                    </View>

                    <View
                      style={[
                        styles.stepContent,
                        !isLast && { paddingBottom: tokens.spacing.xl },
                      ]}
                    >
                      <Text
                        style={{
                          color: reached
                            ? tokens.colors.text
                            : tokens.colors.textMuted,
                          fontSize: tokens.type.body.fontSize,
                          fontWeight: "700",
                          letterSpacing: -0.2,
                        }}
                      >
                        {stage.title}
                      </Text>
                      <Text
                        style={{
                          color: tokens.colors.textMuted,
                          fontSize: tokens.type.bodySmall.fontSize,
                        }}
                      >
                        {stage.description}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </SectionCard>

        <SectionCard title="Carrier">
          {p.trackingNumber ? (
            <View style={{ gap: 2 }}>
              <Text
                style={{
                  color: tokens.colors.textMuted,
                  fontSize: tokens.type.bodySmall.fontSize,
                }}
              >
                {p.carrier ?? "Tracking number"}
              </Text>
              {/* Selectable so the number can be copied without pulling in a
                  clipboard native module. */}
              <Text
                selectable
                style={{
                  color: tokens.colors.text,
                  fontSize: tokens.type.body.fontSize,
                  fontWeight: "600",
                }}
              >
                {p.trackingNumber}
              </Text>
            </View>
          ) : (
            <Text
              style={{
                color: tokens.colors.textMuted,
                fontSize: tokens.type.body.fontSize,
                lineHeight: tokens.type.body.lineHeight,
              }}
            >
              No tracking number recorded. Add one by editing this purchase.
            </Text>
          )}
        </SectionCard>
      </ScreenScroll>
    </>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepRow: {
    flexDirection: "row",
    gap: 16,
  },
  indicatorCol: {
    alignItems: "center",
    width: 20,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  connector: {
    width: 2.5,
    flex: 1,
    marginTop: -2,
    marginBottom: -2,
  },
  stepContent: {
    flex: 1,
    gap: 3,
  },
});
