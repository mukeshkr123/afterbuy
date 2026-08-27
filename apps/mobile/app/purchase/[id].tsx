import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  AppText,
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
import type { PurchaseDetailResponse } from "@acme/shared";

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

  const p: PurchaseDetailResponse | undefined = detail.data;

  if (detail.isLoading) {
    return (
      <ScreenScroll gap={tokens.spacing.lg} safeTop={true}>
        <ScreenHeader title="Purchase" />
        <Skeleton height={104} />
        <Skeleton height={96} />
        <Skeleton height={160} />
      </ScreenScroll>
    );
  }

  if (!p) {
    return (
      <ScreenScroll gap={tokens.spacing.lg} safeTop={true}>
        <ScreenHeader title="Purchase" />
        <SectionCard>
          <EmptyState
            icon="alert-circle-outline"
            title="Purchase not available"
            message={
              detail.isError
                ? "We couldn't load this purchase. Check your connection and try again."
                : "This purchase no longer exists."
            }
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
  const purchasedOn = formatDate(p.purchaseDate);
  const warranty = deadlineState(p.warrantyExpiresAt, "Valid till");
  const returnWindow = deadlineState(p.returnDeadlineAt, "Eligible till");
  const receiptCount = p.receipts.length;
  const nextDeadline = [
    p.returnDeadlineAt && returnWindow
      ? { date: p.returnDeadlineAt, title: "Return window", ...returnWindow }
      : null,
    p.warrantyExpiresAt && warranty
      ? { date: p.warrantyExpiresAt, title: "Warranty", ...warranty }
      : null,
  ]
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => !item.expired)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  return (
    <>
      <ScreenScroll gap={tokens.spacing.lg} safeTop={true}>
        <ScreenHeader
          title={p.title || "Purchase"}
          action={{
            text: "Edit",
            tone: "accent",
            onPress: () =>
              router.push({
                pathname: "/purchase/[id]/edit",
                params: { id: id ?? "" },
              }),
          }}
        />

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

        {nextDeadline ? (
          <View
            style={[
              styles.deadline,
              {
                backgroundColor: nextDeadline.urgent
                  ? tokens.colors.warningSoft
                  : tokens.colors.accentSoft,
                borderRadius: tokens.radius.md,
              },
            ]}
          >
            <AppText role="caption" tone="subtle" weight="700">
              Next deadline
            </AppText>
            <AppText role="headline">
              {nextDeadline.title} · {nextDeadline.label}
            </AppText>
            <AppText role="subheadline" tone="subtle">
              {nextDeadline.detail}
            </AppText>
          </View>
        ) : null}

        {/* Purchase metadata. Every row is omitted when the server has no value. */}
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
                    Purchase reference:{" "}
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
                    Purchased on {purchasedOn}
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
            title="Receipts"
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
          label="Delete Purchase"
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
  deadline: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 2,
  },
});
