import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEnqueueMutation } from "@/offline";
import { useState, type ComponentProps, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import type {
  Claim,
  PurchaseDetailResponse,
  Receipt,
  Reminder,
} from "@acme/shared";
import {
  AppText,
  Button,
  CategoryArtwork,
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
  Skeleton,
  StatusPill,
  UndoableToast,
} from "@/components";
import type { IconTileTone } from "@/components/IconTile";
import type { StatusPillProps } from "@/components/StatusPill";
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
import { CLAIM_STATUS_LABEL, CLAIM_TYPE_LABEL, statusTone } from "@/lib/claims";

type ActivityEvent = {
  id: string;
  title: string;
  subtitle: string;
  detail?: string | null;
  tone: IconTileTone;
  icon: ComponentProps<typeof IconTile>["icon"];
  at: string;
};

export default function PurchaseDetailScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const { tokens } = useTheme();
  const { id } = useLocalSearchParams<{ id: string; section?: string }>();
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

  const softDelete = useEnqueueMutation<void, unknown>({
    build: () => ({
      method: "DELETE",
      endpoint: `/v1/purchases/${id}`,
      body: null,
      label: `Delete purchase "${detail.data?.title || id}"`,
      optimisticPatch: {
        queryKey: apiKeys.purchases.detail(id ?? ""),
        updater: (prev) =>
          prev && typeof prev === "object"
            ? {
                ...(prev as Record<string, unknown>),
                deletedAt: new Date().toISOString(),
              }
            : prev,
        rollback: () => undefined,
      },
    }),
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

  const undoDelete = useEnqueueMutation<void, unknown>({
    build: () => ({
      method: "POST",
      endpoint: `/v1/purchases/${id}/restore`,
      body: null,
      label: `Restore purchase "${detail.data?.title || id}"`,
      optimisticPatch: {
        queryKey: apiKeys.purchases.detail(id ?? ""),
        updater: (prev) =>
          prev && typeof prev === "object"
            ? { ...(prev as Record<string, unknown>), deletedAt: null }
            : prev,
        rollback: () => undefined,
      },
    }),
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
      <ScreenScroll density="compact" gap={tokens.spacing.lg}>
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
      <ScreenScroll density="compact" gap={tokens.spacing.lg}>
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
      <ScreenScroll density="compact" gap={tokens.spacing.lg}>
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

        <SectionCard surface="grouped" style={{ gap: tokens.spacing.md }}>
          <View style={[styles.hero, { gap: tokens.spacing.md }]}>
            <CategoryArtwork category={purchase.category} size="md" />
            <View style={styles.heroCopy}>
              <AppText role="title" tone="strong" numberOfLines={2}>
                {purchase.title}
              </AppText>
              <AppText role="subheadline" tone="subtle" numberOfLines={1}>
                {[purchase.merchant, categoryLabel(purchase.category)]
                  .filter(Boolean)
                  .join(" · ")}
              </AppText>
            </View>
          </View>
          <View style={styles.summaryMetaRow}>
            <Money
              amountMinor={purchase.amountMinor}
              currency={purchase.currency}
              emphasis="strong"
              style={{ fontSize: tokens.type.headline.fontSize }}
            />
            <StatusPill label={status.label} tone={status.tone} quiet />
          </View>
          {nextDeadline ? (
            <View
              style={[
                styles.nextDeadlineRow,
                {
                  borderTopColor: tokens.colors.border,
                  paddingTop: tokens.spacing.sm,
                },
              ]}
            >
              <AppText role="caption" tone="subtle" weight="700">
                Next deadline
              </AppText>
              <AppText role="subheadline" weight="600">
                {nextDeadline.title}
              </AppText>
              <AppText role="caption" tone="subtle">
                {nextDeadline.label} · {nextDeadline.detail}
              </AppText>
            </View>
          ) : null}
        </SectionCard>

        <View style={{ gap: tokens.spacing.md }}>
          <SectionHeading title="Purchase details" detail="Recorded data" />
          <SectionCard flush surface="grouped">
            {purchasedOn ? (
              <DetailRow label="Purchase date" value={purchasedOn} />
            ) : null}
            {purchase.orderNumber ? (
              <DetailRow label="Order number" value={purchase.orderNumber} />
            ) : null}
            <DetailRow
              label="Category"
              value={categoryLabel(purchase.category)}
            />
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
        </View>

        <View style={{ gap: tokens.spacing.md }}>
          <SectionHeading
            title="Protection"
            detail="Return, warranty, and claims."
          />
          <SectionCard flush surface="grouped">
            <CoverageRow
              title="Return window"
              state={returnWindow}
              empty="No return deadline recorded"
              icon="sync-outline"
            />
            <CoverageRow
              title="Warranty"
              state={warranty}
              empty="No warranty expiry recorded"
              icon="shield-checkmark-outline"
              last={purchase.claims.length === 0}
            />
            {purchase.claims.length === 0 ? (
              <ListItem
                density="compact"
                title="No claims opened"
                subtitle="Start a return, refund, or warranty claim from this purchase."
                leading={
                  <IconTile icon="shield-checkmark-outline" tone="accent" />
                }
                divider={false}
                chevron
                onPress={() => openRoute("/purchase/[id]/claims")}
              />
            ) : (
              purchase.claims.slice(0, 3).map((claim, index) => (
                <ListItem
                  key={claim.id}
                  density="compact"
                  title={CLAIM_TYPE_LABEL[claim.type]}
                  subtitle={`Opened ${formatTimestamp(claim.openedAt)}`}
                  detail={
                    claim.reference ? `Reference ${claim.reference}` : null
                  }
                  leading={
                    <IconTile
                      icon="shield-checkmark-outline"
                      tone={claimTileTone(claim)}
                    />
                  }
                  trailing={
                    <StatusPill
                      label={CLAIM_STATUS_LABEL[claim.status]}
                      tone={statusTone(claim.status)}
                      quiet
                    />
                  }
                  divider={index < Math.min(purchase.claims.length, 3) - 1}
                  chevron
                  onPress={() =>
                    router.push({
                      pathname: "/claim/[id]",
                      params: { id: claim.id },
                    })
                  }
                />
              ))
            )}
          </SectionCard>
        </View>

        <View style={{ gap: tokens.spacing.md }}>
          <SectionHeading
            title="Receipts"
            detail={`${purchase.receipts.length} ${
              purchase.receipts.length === 1 ? "file" : "files"
            } attached`}
          />
          <SectionCard flush surface="grouped">
            {purchase.receipts.length === 0 ? (
              <ListItem
                density="compact"
                title="No receipt attached"
                subtitle="Photograph or choose an image from your library."
                divider={false}
                leading={<IconTile icon="document-text-outline" tone="info" />}
                chevron
                onPress={() => openRoute("/purchase/[id]/receipts")}
              />
            ) : (
              purchase.receipts
                .slice(0, 3)
                .map((receipt, index) => (
                  <ListItem
                    key={receipt.id}
                    density="compact"
                    title={receiptTitle(receipt)}
                    subtitle={receiptSize(receipt)}
                    detail={`Added ${formatTimestamp(receipt.createdAt)}`}
                    divider={index < Math.min(purchase.receipts.length, 3) - 1}
                    leading={<IconTile icon="document-outline" tone="info" />}
                  />
                ))
            )}
          </SectionCard>
          <Button
            label={purchase.receipts.length ? "Manage receipts" : "Add receipt"}
            onPress={() => openRoute("/purchase/[id]/receipts")}
          />
        </View>

        <View style={{ gap: tokens.spacing.md }}>
          <SectionHeading
            title="Activity"
            detail="Delivery and reminder history."
          />
          <SectionCard flush surface="grouped">
            {buildActivityEvents(purchase).map((event, index, events) => (
              <ListItem
                key={event.id}
                density="compact"
                title={event.title}
                subtitle={event.subtitle}
                detail={event.detail}
                leading={<IconTile icon={event.icon} tone={event.tone} />}
                divider={index < events.length - 1}
                chevron={
                  event.id === "delivery" && Boolean(purchase.trackingNumber)
                }
                onPress={
                  event.id === "delivery"
                    ? () => openRoute("/purchase/[id]/track")
                    : undefined
                }
              />
            ))}
          </SectionCard>
          <Button
            label="View delivery"
            variant="secondary"
            onPress={() => openRoute("/purchase/[id]/track")}
          />
        </View>

        <FormError message={error.message} />

        <SectionCard tone="danger" surface="grouped">
          <View style={{ gap: tokens.spacing.sm }}>
            <AppText role="subheadline" tone="danger" weight="700">
              Delete purchase
            </AppText>
            <AppText role="caption" tone="subtle">
              This removes the purchase from your active list. You can undo the
              delete for 5 seconds.
            </AppText>
            <Button
              label="Delete purchase"
              variant="danger"
              onPress={() => setConfirmDelete(true)}
            />
          </View>
        </SectionCard>
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
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.md,
          gap: tokens.spacing.md,
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

function CoverageRow({
  title,
  state,
  empty,
  icon,
  last = false,
}: {
  title: string;
  state: ReturnType<typeof deadlineState>;
  empty: string;
  icon: ComponentProps<typeof IconTile>["icon"];
  last?: boolean;
}) {
  const { tokens } = useTheme();
  const tone = deadlineTone(state);
  return (
    <View
      style={[
        styles.coverageRow,
        {
          borderBottomColor: tokens.colors.border,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.md,
        },
      ]}
    >
      <IconTile icon={icon} tone={deadlineIconTone(state)} />
      <View style={styles.coverageCopy}>
        <AppText role="subheadline" tone="strong" weight="700">
          {title}
        </AppText>
        <AppText role="caption" tone="subtle">
          {state?.label ?? empty}
        </AppText>
      </View>
      <StatusPill label={state?.detail ?? "Not set"} tone={tone} quiet />
    </View>
  );
}

function deadlineTone(
  state: ReturnType<typeof deadlineState>
): NonNullable<StatusPillProps["tone"]> {
  if (!state) return "neutral";
  if (state.expired) return "danger";
  if (state.urgent) return "warning";
  return "success";
}

function deadlineIconTone(
  state: ReturnType<typeof deadlineState>
): IconTileTone {
  const tone = deadlineTone(state);
  return tone === "danger" ? "neutral" : tone;
}

function receiptTitle(receipt: Receipt): string {
  const subtype = receipt.contentType.split("/")[1]?.toUpperCase();
  return subtype ? `${subtype} receipt` : "Receipt";
}

function receiptSize(receipt: Receipt): string {
  const dimensions =
    receipt.width && receipt.height
      ? `${receipt.width} x ${receipt.height}`
      : null;
  return [formatBytes(receipt.sizeBytes), dimensions]
    .filter(Boolean)
    .join(" · ");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTimestamp(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "Recorded";
  return new Date(ms).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function reminderKindLabel(reminder: Reminder): string {
  return reminder.kind === "return_deadline"
    ? "Return reminder"
    : "Warranty reminder";
}

function claimTileTone(claim: Claim): IconTileTone {
  const tone = statusTone(claim.status);
  return tone === "danger" ? "warning" : tone;
}

function buildActivityEvents(
  purchase: PurchaseDetailResponse
): ActivityEvent[] {
  const delivery = deliveryDisplay(purchase.deliveryStatus);
  const events: ActivityEvent[] = [
    {
      id: "created",
      title: "Purchase recorded",
      subtitle: purchase.merchant ?? purchase.title,
      detail: formatTimestamp(purchase.createdAt),
      icon: "bag-check-outline",
      tone: "accent",
      at: purchase.createdAt,
    },
  ];

  events.push({
    id: "delivery",
    title: `Delivery status: ${delivery.label}`,
    subtitle: purchase.trackingNumber
      ? [purchase.carrier, purchase.trackingNumber].filter(Boolean).join(" · ")
      : "Current delivery status",
    detail: formatTimestamp(purchase.updatedAt),
    icon: "cube-outline",
    tone: deliveryTileTone(delivery.tone),
    at: purchase.updatedAt,
  });

  purchase.receipts.forEach((receipt) => {
    events.push({
      id: `receipt-${receipt.id}`,
      title: "Receipt attached",
      subtitle: receiptTitle(receipt),
      detail: formatTimestamp(receipt.createdAt),
      icon: "document-text-outline",
      tone: "info",
      at: receipt.createdAt,
    });
  });

  purchase.reminders.forEach((reminder) => {
    events.push({
      id: `reminder-created-${reminder.id}`,
      title: "Reminder created",
      subtitle: `${reminderKindLabel(reminder)} for ${formatDate(reminder.fireOn) ?? reminder.fireOn}`,
      detail: formatTimestamp(reminder.createdAt),
      icon: "notifications-outline",
      tone: "accent",
      at: reminder.createdAt,
    });
    if (reminder.sentAt) {
      events.push({
        id: `reminder-sent-${reminder.id}`,
        title: "Reminder sent",
        subtitle: reminderKindLabel(reminder),
        detail: formatTimestamp(reminder.sentAt),
        icon: "send-outline",
        tone: "success",
        at: reminder.sentAt,
      });
    }
    if (reminder.dismissedAt) {
      events.push({
        id: `reminder-dismissed-${reminder.id}`,
        title: "Reminder dismissed",
        subtitle: reminderKindLabel(reminder),
        detail: formatTimestamp(reminder.dismissedAt),
        icon: "checkmark-done-outline",
        tone: "neutral",
        at: reminder.dismissedAt,
      });
    }
  });

  purchase.claims.forEach((claim) => {
    events.push({
      id: `claim-${claim.id}`,
      title: CLAIM_TYPE_LABEL[claim.type],
      subtitle: CLAIM_STATUS_LABEL[claim.status],
      detail: formatTimestamp(claim.openedAt),
      icon: "shield-checkmark-outline",
      tone: claimTileTone(claim),
      at: claim.openedAt,
    });
  });

  return events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

function deliveryTileTone(
  tone: ReturnType<typeof deliveryDisplay>["tone"]
): IconTileTone {
  if (tone === "danger") return "warning";
  if (tone === "success" || tone === "accent") return tone;
  return "neutral";
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center" },
  heroCopy: { flex: 1, gap: 3 },
  summaryMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  nextDeadlineRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  coverageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  coverageCopy: {
    flex: 1,
    gap: 2,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  detailValue: { flex: 1, alignItems: "flex-end" },
  valueText: { textAlign: "right" },
});
