import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import type { PurchaseDetailResponse } from "@acme/shared";
import {
  AppText,
  Button,
  CategoryArtwork,
  DeadlineCard,
  Dialog,
  EmptyState,
  FormError,
  IconTile,
  ListItem,
  Money,
  ScreenHeader,
  ScreenScroll,
  SectionCard,
  SectionHeading,
  SegmentedControl,
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
  categoryLabel,
  deadlineState,
  deliveryDisplay,
  formatDate,
} from "@/lib/purchaseDisplay";

type PurchaseSection = "details" | "receipts" | "protection" | "activity";

const SECTIONS: Array<{ key: PurchaseSection; label: string }> = [
  { key: "details", label: "Details" },
  { key: "receipts", label: "Receipts" },
  { key: "protection", label: "Protection" },
  { key: "activity", label: "Activity" },
];

function isPurchaseSection(
  value: string | undefined
): value is PurchaseSection {
  return SECTIONS.some((item) => item.key === value);
}

export default function PurchaseDetailScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const { tokens } = useTheme();
  const { id, section } = useLocalSearchParams<{
    id: string;
    section?: string;
  }>();
  const [activeSection, setActiveSection] = useState<PurchaseSection>(
    isPurchaseSection(section) ? section : "details"
  );
  const [error, setError] = useState<FormErrorState>({
    message: null,
    fields: {},
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const detail = useQuery({
    queryKey: apiKeys.purchases.detail(id ?? ""),
    queryFn: () => getPurchase(api, id ?? ""),
    enabled: Boolean(id),
  });

  const softDelete = useMutation({
    mutationFn: () => deletePurchase(api, id ?? ""),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["purchases"] });
      setConfirmDelete(false);
      setDeleted(true);
    },
    onError: (caught) => {
      setError(fromCaught(caught));
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
    onError: (caught) => setError(fromCaught(caught)),
  });

  if (detail.isLoading) {
    return (
      <ScreenScroll gap={tokens.spacing.lg}>
        <ScreenHeader title="Purchase" />
        <Skeleton height={118} />
        <Skeleton height={42} />
        <Skeleton height={180} />
      </ScreenScroll>
    );
  }

  const purchase: PurchaseDetailResponse | undefined = detail.data;
  if (!purchase) {
    return (
      <ScreenScroll gap={tokens.spacing.lg}>
        <ScreenHeader title="Purchase" />
        <EmptyState
          icon="alert-circle-outline"
          title="Purchase not available"
          message={
            detail.isError
              ? "We couldn't load this purchase. Check your connection and try again."
              : "This purchase no longer exists."
          }
          action={{ label: "Try again", onPress: () => void detail.refetch() }}
        />
      </ScreenScroll>
    );
  }

  const status = deliveryDisplay(purchase.deliveryStatus);
  const purchasedOn = formatDate(purchase.purchaseDate);
  const warranty = deadlineState(purchase.warrantyExpiresAt, "Coverage until");
  const returnWindow = deadlineState(purchase.returnDeadlineAt, "Return by");
  const nextDeadline = [
    purchase.returnDeadlineAt && returnWindow
      ? {
          date: purchase.returnDeadlineAt,
          title: "Return window",
          ...returnWindow,
        }
      : null,
    purchase.warrantyExpiresAt && warranty
      ? { date: purchase.warrantyExpiresAt, title: "Warranty", ...warranty }
      : null,
  ]
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => !item.expired)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const openRoute = (
    pathname:
      | "/purchase/[id]/receipts"
      | "/purchase/[id]/claims"
      | "/purchase/[id]/track"
  ) => router.push({ pathname, params: { id: purchase.id } });

  return (
    <>
      <ScreenScroll gap={tokens.spacing.lg}>
        <ScreenHeader
          title="Purchase"
          action={{
            text: "Edit",
            tone: "accent",
            onPress: () =>
              router.push({
                pathname: "/purchase/[id]/edit",
                params: { id: purchase.id },
              }),
          }}
        />

        <View style={[styles.hero, { gap: tokens.spacing.lg }]}>
          <CategoryArtwork category={purchase.category} size="lg" />
          <View style={styles.heroCopy}>
            <AppText role="title" tone="strong">
              {purchase.title}
            </AppText>
            <AppText role="subheadline" tone="subtle">
              {[purchase.merchant, categoryLabel(purchase.category)]
                .filter(Boolean)
                .join(" · ")}
            </AppText>
            <Money
              amountMinor={purchase.amountMinor}
              currency={purchase.currency}
              emphasis="strong"
              style={{ fontSize: tokens.type.title.fontSize }}
            />
          </View>
          <StatusPill label={status.label} tone={status.tone} />
        </View>

        {nextDeadline ? (
          <DeadlineCard
            title={nextDeadline.title}
            dateLabel={nextDeadline.label}
            detail={nextDeadline.detail}
            tone={nextDeadline.urgent ? "warning" : "success"}
            onPress={() => setActiveSection("protection")}
          />
        ) : null}

        <SegmentedControl
          tabs={SECTIONS}
          activeKey={activeSection}
          onChange={(value) => {
            if (isPurchaseSection(value)) setActiveSection(value);
          }}
        />

        {activeSection === "details" ? (
          <View style={{ gap: tokens.spacing.lg }}>
            <SectionHeading title="Purchase details" />
            <SectionCard flush>
              <DetailRow
                label="Category"
                value={categoryLabel(purchase.category)}
              />
              {purchase.orderNumber ? (
                <DetailRow label="Order number" value={purchase.orderNumber} />
              ) : null}
              {purchasedOn ? (
                <DetailRow label="Purchased" value={purchasedOn} />
              ) : null}
              <DetailRow
                label="Amount"
                valueNode={
                  <Money
                    amountMinor={purchase.amountMinor}
                    currency={purchase.currency}
                    emphasis="strong"
                  />
                }
                last={!purchase.notes}
              />
              {purchase.notes ? (
                <DetailRow label="Notes" value={purchase.notes} last />
              ) : null}
            </SectionCard>
            <FormError message={error.message} />
            <Button
              label="Delete purchase"
              variant="tertiary"
              onPress={() => setConfirmDelete(true)}
            />
          </View>
        ) : null}

        {activeSection === "receipts" ? (
          <View style={{ gap: tokens.spacing.md }}>
            <SectionHeading
              title="Receipts"
              detail="Keep proof of purchase with the item."
            />
            <SectionCard flush>
              <ListItem
                title={
                  purchase.receipts.length === 0
                    ? "No receipt attached"
                    : purchase.receipts.length === 1
                      ? "1 receipt attached"
                      : `${purchase.receipts.length} receipts attached`
                }
                subtitle="Photograph or choose an image from your library."
                divider={false}
                leading={<IconTile icon="document-text-outline" tone="info" />}
                chevron
                onPress={() => openRoute("/purchase/[id]/receipts")}
              />
            </SectionCard>
            <Button
              label={
                purchase.receipts.length ? "Manage receipts" : "Add receipt"
              }
              onPress={() => openRoute("/purchase/[id]/receipts")}
            />
          </View>
        ) : null}

        {activeSection === "protection" ? (
          <View style={{ gap: tokens.spacing.md }}>
            <SectionHeading
              title="Protection"
              detail="Return, warranty, and claim coverage."
            />
            <SectionCard flush>
              <ListItem
                title="Return window"
                subtitle={returnWindow?.label ?? "No return window recorded"}
                detail={returnWindow?.detail ?? null}
                leading={
                  <IconTile
                    icon="sync-outline"
                    tone={returnWindow?.urgent ? "warning" : "accent"}
                  />
                }
                trailing={
                  returnWindow?.expired ? (
                    <StatusPill label="Closed" tone="neutral" />
                  ) : returnWindow?.urgent ? (
                    <StatusPill label="Soon" tone="warning" />
                  ) : undefined
                }
                onPress={() => router.push("/(tabs)/reminders")}
                chevron
              />
              <ListItem
                title="Warranty"
                subtitle={warranty?.label ?? "No warranty recorded"}
                detail={warranty?.detail ?? null}
                leading={
                  <IconTile
                    icon="shield-checkmark-outline"
                    tone={warranty?.urgent ? "warning" : "success"}
                  />
                }
                trailing={
                  warranty?.expired ? (
                    <StatusPill label="Expired" tone="neutral" />
                  ) : warranty?.urgent ? (
                    <StatusPill label="Soon" tone="warning" />
                  ) : undefined
                }
                onPress={() => openRoute("/purchase/[id]/claims")}
                chevron
                divider={false}
              />
            </SectionCard>
            <Button
              label={purchase.claims.length ? "View claims" : "Start a claim"}
              variant="secondary"
              onPress={() => openRoute("/purchase/[id]/claims")}
            />
          </View>
        ) : null}

        {activeSection === "activity" ? (
          <View style={{ gap: tokens.spacing.md }}>
            <SectionHeading
              title="Activity"
              detail="Delivery and reminder history."
            />
            <SectionCard flush>
              <ListItem
                title="Delivery"
                subtitle={
                  purchase.trackingNumber
                    ? `Tracking ${purchase.trackingNumber}`
                    : status.label
                }
                leading={<IconTile icon="cube-outline" tone="neutral" />}
                trailing={
                  <StatusPill label={status.label} tone={status.tone} />
                }
                chevron={Boolean(purchase.trackingNumber)}
                onPress={
                  purchase.trackingNumber
                    ? () => openRoute("/purchase/[id]/track")
                    : undefined
                }
              />
              <ListItem
                title="Reminders"
                subtitle={
                  purchase.reminders.length === 0
                    ? "No reminders recorded"
                    : `${purchase.reminders.length} reminder${
                        purchase.reminders.length === 1 ? "" : "s"
                      }`
                }
                leading={
                  <IconTile icon="notifications-outline" tone="accent" />
                }
                divider={false}
                chevron
                onPress={() => router.push("/(tabs)/reminders")}
              />
            </SectionCard>
          </View>
        ) : null}
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
          if (router.canGoBack()) router.back();
          else router.replace("/(tabs)/purchases");
        }}
      />
    </>
  );
}

function DetailRow({
  label,
  value,
  valueNode,
  last = false,
}: {
  label: string;
  value?: string;
  valueNode?: ReactNode;
  last?: boolean;
}) {
  const { tokens } = useTheme();
  return (
    <View
      style={[
        styles.detailRow,
        {
          padding: tokens.spacing.lg,
          gap: tokens.spacing.lg,
          borderBottomColor: tokens.colors.border,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <AppText role="subheadline" tone="subtle">
        {label}
      </AppText>
      <View style={styles.detailValue}>
        {valueNode ?? (
          <AppText role="subheadline" weight="600" style={styles.valueText}>
            {value}
          </AppText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center" },
  heroCopy: { flex: 1, gap: 3 },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  detailValue: { flex: 1, alignItems: "flex-end" },
  valueText: { textAlign: "right" },
});
