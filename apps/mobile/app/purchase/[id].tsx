import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
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

type PurchaseSection = "details" | "receipt" | "warranty" | "activity";

const SECTIONS: Array<{ key: PurchaseSection; label: string }> = [
  { key: "details", label: "Details" },
  { key: "receipt", label: "Receipt" },
  { key: "warranty", label: "Warranty" },
  { key: "activity", label: "Activity" },
];

type ActivityEvent = {
  id: string;
  title: string;
  subtitle: string;
  detail?: string | null;
  tone: IconTileTone;
  icon: ComponentProps<typeof IconTile>["icon"];
  at: string;
};

function isPurchaseSection(
  value: string | undefined
): value is PurchaseSection {
  return SECTIONS.some((item) => item.key === value);
}

function normalizeSection(value: string | undefined): PurchaseSection {
  if (value === "receipts") return "receipt";
  if (value === "protection") return "warranty";
  return isPurchaseSection(value) ? value : "details";
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
    normalizeSection(section)
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
            onPress={() => setActiveSection("warranty")}
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
            <View style={styles.summaryGrid}>
              <CoverageSummary
                title="Return window"
                state={returnWindow}
                empty="No return date"
                icon="sync-outline"
              />
              <CoverageSummary
                title="Warranty"
                state={warranty}
                empty="No expiry date"
                icon="shield-checkmark-outline"
              />
            </View>

            <SectionHeading title="Purchase details" detail="Recorded data" />
            <SectionCard flush>
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
            <FormError message={error.message} />
            <SectionCard tone="danger">
              <View style={{ gap: tokens.spacing.md }}>
                <AppText role="headline" tone="danger">
                  Delete purchase
                </AppText>
                <AppText role="subheadline" tone="subtle">
                  This removes the purchase from your active list. You can undo
                  the delete for 5 seconds.
                </AppText>
                <Button
                  label="Delete purchase"
                  variant="danger"
                  onPress={() => setConfirmDelete(true)}
                />
              </View>
            </SectionCard>
          </View>
        ) : null}

        {activeSection === "receipt" ? (
          <View style={{ gap: tokens.spacing.md }}>
            <SectionHeading
              title="Receipt"
              detail={`${purchase.receipts.length} ${
                purchase.receipts.length === 1 ? "file" : "files"
              } attached`}
            />
            <SectionCard flush>
              {purchase.receipts.length === 0 ? (
                <ListItem
                  title="No receipt attached"
                  subtitle="Photograph or choose an image from your library."
                  divider={false}
                  leading={
                    <IconTile icon="document-text-outline" tone="info" />
                  }
                  chevron
                  onPress={() => openRoute("/purchase/[id]/receipts")}
                />
              ) : (
                purchase.receipts
                  .slice(0, 3)
                  .map((receipt, index) => (
                    <ListItem
                      key={receipt.id}
                      title={receiptTitle(receipt)}
                      subtitle={receiptSize(receipt)}
                      detail={`Added ${formatTimestamp(receipt.createdAt)}`}
                      divider={
                        index < Math.min(purchase.receipts.length, 3) - 1
                      }
                      leading={<IconTile icon="document-outline" tone="info" />}
                    />
                  ))
              )}
            </SectionCard>
            <Button
              label={
                purchase.receipts.length ? "Manage receipts" : "Add receipt"
              }
              onPress={() => openRoute("/purchase/[id]/receipts")}
            />
          </View>
        ) : null}

        {activeSection === "warranty" ? (
          <View style={{ gap: tokens.spacing.md }}>
            <SectionHeading
              title="Warranty"
              detail="Recorded return, warranty, and claim data."
            />
            <View style={{ gap: tokens.spacing.md }}>
              <CoverageCard
                title="Return window"
                state={returnWindow}
                empty="No return deadline recorded"
                icon="sync-outline"
              />
              <CoverageCard
                title="Warranty"
                state={warranty}
                empty="No warranty expiry recorded"
                icon="shield-checkmark-outline"
              />
            </View>
            <SectionCard flush>
              {purchase.claims.length === 0 ? (
                <ListItem
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
              detail="Built from recorded purchase events."
            />
            <SectionCard flush>
              {buildActivityEvents(purchase).map((event, index, events) => (
                <ListItem
                  key={event.id}
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

function CoverageSummary({
  title,
  state,
  empty,
  icon,
}: {
  title: string;
  state: ReturnType<typeof deadlineState>;
  empty: string;
  icon: ComponentProps<typeof IconTile>["icon"];
}) {
  const tone = deadlineTone(state);
  return (
    <SectionCard style={styles.summaryCard}>
      <View style={styles.summaryContent}>
        <IconTile icon={icon} tone={deadlineIconTone(state)} />
        <View style={styles.summaryText}>
          <AppText role="caption" tone="subtle" weight="700">
            {title}
          </AppText>
          <AppText role="subheadline" tone="strong" weight="700">
            {state?.detail ?? empty}
          </AppText>
          {state ? (
            <AppText role="caption" tone="muted">
              {state.label}
            </AppText>
          ) : null}
        </View>
      </View>
    </SectionCard>
  );
}

function CoverageCard({
  title,
  state,
  empty,
  icon,
}: {
  title: string;
  state: ReturnType<typeof deadlineState>;
  empty: string;
  icon: ComponentProps<typeof IconTile>["icon"];
}) {
  const tone = deadlineTone(state);
  return (
    <SectionCard>
      <View style={[styles.coverageCard, { gap: 12 }]}>
        <View style={styles.coverageTop}>
          <IconTile icon={icon} tone={deadlineIconTone(state)} />
          <View style={styles.coverageCopy}>
            <AppText role="headline" tone="strong">
              {title}
            </AppText>
            <AppText role="subheadline" tone="subtle">
              {state?.label ?? empty}
            </AppText>
          </View>
          <StatusPill label={state?.detail ?? "Not set"} tone={tone} />
        </View>
      </View>
    </SectionCard>
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
  summaryGrid: {
    flexDirection: "row",
    gap: 12,
  },
  summaryCard: {
    flex: 1,
  },
  summaryContent: {
    gap: 12,
  },
  summaryText: {
    gap: 2,
  },
  coverageCard: {
    width: "100%",
  },
  coverageTop: {
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
