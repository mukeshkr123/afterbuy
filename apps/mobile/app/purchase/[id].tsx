import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Button,
  Dialog,
  EmptyState,
  FormError,
  IconTile,
  ListItem,
  Money,
  ScreenHeader,
  ScreenScroll,
  SectionCard,
  Skeleton,
  StatusPill,
  UndoableToast,
} from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { deletePurchase, getPurchase, restorePurchase } from "@/api/purchases";
import { fromCaught, type FormErrorState } from "@/hooks/useApiError";
import { useTheme } from "@/theme/ThemeProvider";
import {
  categoryIcon,
  categoryLabel,
  deadlineState,
  deliveryDisplay,
  formatDate,
} from "@/lib/purchaseDisplay";

export default function PurchaseDetailScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const { tokens } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const detail = useQuery({
    queryKey: apiKeys.purchases.detail(id ?? ""),
    queryFn: () => getPurchase(api, id ?? ""),
    enabled: Boolean(id),
  });

  const [error, setError] = useState<FormErrorState>({
    message: null,
    fields: {},
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const softDelete = useMutation({
    mutationFn: () => deletePurchase(api, id ?? ""),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["purchases"] });
      setConfirmDelete(false);
      setDeleted(true);
    },
    onError: (e) => {
      setError(fromCaught(e));
      setConfirmDelete(false);
    },
  });

  const undoDelete = useMutation({
    mutationFn: () => restorePurchase(api, id ?? ""),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: apiKeys.purchases.detail(id ?? ""),
      });
      void qc.invalidateQueries({ queryKey: ["purchases"] });
      setDeleted(false);
    },
    onError: (e) => setError(fromCaught(e)),
  });

  const p = detail.data;

  const header = (
    <ScreenHeader
      title="Order Details"
      action={
        p
          ? {
              icon: "create-outline",
              label: "Edit order",
              onPress: () =>
                router.push({
                  pathname: "/purchase/[id]/edit",
                  params: { id: id ?? "" },
                }),
            }
          : undefined
      }
    />
  );

  if (detail.isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenScroll gap={tokens.spacing.lg + 2}>
          {header}
          <Skeleton height={104} />
          <Skeleton height={96} />
          <Skeleton height={160} />
        </ScreenScroll>
      </>
    );
  }

  if (!p) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenScroll gap={tokens.spacing.lg + 2}>
          {header}
          <SectionCard>
            <EmptyState
              icon="alert-circle-outline"
              title="Order not available"
              message={
                detail.isError
                  ? "We couldn't load this order. Check your connection and try again."
                  : "This order no longer exists."
              }
              action={{
                label: "Try again",
                onPress: () => void detail.refetch(),
              }}
            />
          </SectionCard>
        </ScreenScroll>
      </>
    );
  }

  const status = deliveryDisplay(p.deliveryStatus);
  const purchasedOn = formatDate(p.purchaseDate);
  const warranty = deadlineState(p.warrantyExpiresAt, "Valid till");
  const returnWindow = deadlineState(p.returnDeadlineAt, "Eligible till");
  const receiptCount = p.receipts.length;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenScroll gap={tokens.spacing.lg + 2}>
        {header}

        <SectionCard>
          <View style={[styles.productRow, { gap: tokens.spacing.lg }]}>
            <IconTile
              icon={categoryIcon(p.category)}
              tone="neutral"
              size="lg"
            />
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={{
                  color: tokens.colors.text,
                  fontSize: tokens.type.body.fontSize + 2,
                  fontWeight: "700",
                  letterSpacing: -0.3,
                }}
              >
                {p.title}
              </Text>
              <Text
                style={{
                  color: tokens.colors.textMuted,
                  fontSize: tokens.type.bodySmall.fontSize,
                }}
              >
                {categoryLabel(p.category)}
              </Text>
              <View style={{ marginTop: 4 }}>
                <StatusPill label={status.label} tone={status.tone} />
              </View>
            </View>
          </View>
        </SectionCard>

        {/* Merchant / order metadata. Every row is omitted when the server has
            no value — this block used to invent an order number. */}
        {p.merchant || p.orderNumber || purchasedOn || p.trackingNumber ? (
          <SectionCard
            onPress={
              p.trackingNumber
                ? () =>
                    router.push({
                      pathname: "/purchase/[id]/track",
                      params: { id: p.id },
                    })
                : undefined
            }
          >
            <View style={styles.metaRow}>
              <View style={{ gap: 6, flex: 1 }}>
                {p.merchant ? (
                  <Text
                    style={{
                      color: tokens.colors.text,
                      fontSize: tokens.type.body.fontSize,
                      fontWeight: "700",
                    }}
                  >
                    {p.merchant}
                  </Text>
                ) : null}
                {p.orderNumber ? (
                  <Text
                    style={{
                      color: tokens.colors.textSubtle,
                      fontSize: tokens.type.bodySmall.fontSize,
                    }}
                  >
                    Order ID:{" "}
                    <Text style={{ color: tokens.colors.text }}>
                      {p.orderNumber}
                    </Text>
                  </Text>
                ) : null}
                {purchasedOn ? (
                  <Text
                    style={{
                      color: tokens.colors.textSubtle,
                      fontSize: tokens.type.bodySmall.fontSize,
                    }}
                  >
                    Ordered on {purchasedOn}
                  </Text>
                ) : null}
                {p.trackingNumber ? (
                  <Text
                    style={{
                      color: tokens.colors.accent,
                      fontSize: tokens.type.bodySmall.fontSize,
                      fontWeight: "600",
                    }}
                  >
                    Track this delivery
                  </Text>
                ) : null}
              </View>
            </View>
          </SectionCard>
        ) : null}

        <View style={{ gap: tokens.spacing.md - 2 }}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: tokens.colors.text,
                fontSize: tokens.type.body.fontSize,
              },
            ]}
          >
            Protection
          </Text>
          <SectionCard flush>
            <ListItem
              title="Warranty"
              subtitle={warranty?.label ?? "No warranty recorded"}
              detail={warranty?.detail ?? null}
              leading={
                <IconTile icon="shield-checkmark-outline" tone="success" />
              }
              trailing={
                warranty?.expired ? (
                  <StatusPill label="Expired" tone="neutral" />
                ) : warranty?.urgent ? (
                  <StatusPill label="Soon" tone="warning" />
                ) : undefined
              }
              chevron
              onPress={() =>
                router.push({
                  pathname: "/purchase/[id]/claims",
                  params: { id: p.id },
                })
              }
            />
            <ListItem
              title="Return Window"
              subtitle={returnWindow?.label ?? "No return window recorded"}
              detail={returnWindow?.detail ?? null}
              divider={false}
              leading={<IconTile icon="sync-outline" tone="accent" />}
              trailing={
                returnWindow?.expired ? (
                  <StatusPill label="Closed" tone="neutral" />
                ) : returnWindow?.urgent ? (
                  <StatusPill label="Soon" tone="warning" />
                ) : undefined
              }
              chevron
              onPress={() => router.push("/(tabs)/reminders")}
            />
          </SectionCard>
        </View>

        <SectionCard flush>
          <ListItem
            title="Bill & Documents"
            subtitle={
              receiptCount === 0
                ? "No receipt attached"
                : receiptCount === 1
                  ? "1 receipt"
                  : `${receiptCount} receipts`
            }
            divider={false}
            leading={<IconTile icon="document-text-outline" tone="info" />}
            chevron
            onPress={() =>
              router.push({
                pathname: "/purchase/[id]/receipts",
                params: { id: p.id },
              })
            }
          />
        </SectionCard>

        <SectionCard title="Price Details">
          <Money
            amountMinor={p.amountMinor}
            currency={p.currency}
            emphasis="strong"
            style={{ fontSize: tokens.type.title.fontSize }}
          />
        </SectionCard>

        {p.notes ? (
          <SectionCard title="Notes">
            <Text
              style={{
                color: tokens.colors.textSubtle,
                fontSize: tokens.type.body.fontSize,
                lineHeight: tokens.type.body.lineHeight,
              }}
            >
              {p.notes}
            </Text>
          </SectionCard>
        ) : null}

        <FormError message={error.message} />

        <Button
          label="Delete Order"
          variant="ghost"
          onPress={() => setConfirmDelete(true)}
        />
      </ScreenScroll>

      <Dialog
        visible={confirmDelete}
        title="Delete this purchase?"
        description="Returns and warranties will pause. You can undo this for 5 seconds."
        primaryLabel="Delete"
        destructive
        onPrimary={() => softDelete.mutate()}
        secondaryLabel="Cancel"
        onDismiss={() => setConfirmDelete(false)}
      />

      <UndoableToast
        message={deleted ? "Purchase deleted" : null}
        actionLabel="Undo"
        onAction={() => undoDelete.mutate()}
        onDismiss={() => {
          setDeleted(false);
          // The record is gone from every list; staying on its detail screen
          // would show a "not available" shell.
          if (router.canGoBack()) router.back();
          else router.replace("/(tabs)/purchases");
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  productRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontWeight: "700",
  },
});
