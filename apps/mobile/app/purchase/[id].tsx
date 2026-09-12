import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type {
  Claim,
  PurchaseDetailResponse,
  Receipt,
  Reminder,
} from "@acme/shared";
import {
  Dialog,
  EmptyState,
  FormError,
  Skeleton,
  UndoableToast,
  useAdaptiveLayout,
} from "@/components";
import { PurchaseArtworkTile } from "@/components/PurchaseArtworkTile";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getPurchase } from "@/api/purchases";
import { useEnqueueMutation } from "@/offline";
import { fromCaught, type FormErrorState } from "@/hooks/useApiError";
import { formatMoney } from "@/components/Money";
import {
  categoryLabel,
  deadlineState,
  deliveryDisplay,
  formatDate,
} from "@/lib/purchaseDisplay";
import { CLAIM_STATUS_LABEL, CLAIM_TYPE_LABEL } from "@/lib/claims";

type ActivityEvent = {
  id: string;
  title: string;
  subtitle: string;
  detail?: string | null;
  icon: keyof typeof Ionicons.glyphMap;
  at: string;
};

export default function PurchaseDetailScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentWidth } = useAdaptiveLayout();
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

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/purchases");
  };

  if (detail.isLoading) {
    return (
      <View
        style={[
          styles.screen,
          { paddingTop: insets.top + 10, paddingHorizontal: 16 },
        ]}
      >
        <View style={styles.navBar}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </Pressable>
          <Text style={styles.navTitle}>Purchase</Text>
          <View style={styles.navSpacer} />
        </View>
        <View style={{ gap: 16, marginTop: 16 }}>
          <Skeleton height={140} />
          <Skeleton height={200} />
          <Skeleton height={160} />
        </View>
      </View>
    );
  }

  const purchase: PurchaseDetailResponse | undefined = detail.data;
  if (!purchase) {
    return (
      <View
        style={[
          styles.screen,
          { paddingTop: insets.top + 10, paddingHorizontal: 16 },
        ]}
      >
        <View style={styles.navBar}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </Pressable>
          <Text style={styles.navTitle}>Purchase</Text>
          <View style={styles.navSpacer} />
        </View>
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
      </View>
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

  const formattedAmount = formatMoney(purchase.amountMinor, purchase.currency);
  const activityEvents = buildActivityEvents(purchase);

  const openRoute = (
    pathname:
      | "/purchase/[id]/receipts"
      | "/purchase/[id]/claims"
      | "/purchase/[id]/track"
      | "/purchase/[id]/edit"
  ) => router.push({ pathname, params: { id: purchase.id } });

  return (
    <View style={styles.screen}>
      {/* Ambient pastel glow at top right */}
      <View style={styles.ambientGlowTopRight} pointerEvents="none" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          width: "100%",
          maxWidth: contentWidth,
          alignSelf: "center",
          paddingHorizontal: 16,
          paddingTop: Math.max(insets.top + 6, 16),
          paddingBottom: Math.max(insets.bottom + 36, 44),
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </Pressable>

          <Text style={styles.navTitle}>Purchase</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit purchase"
            onPress={() => openRoute("/purchase/[id]/edit")}
            style={({ pressed }) => [
              styles.editButton,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
        </View>

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <PurchaseArtworkTile
              title={purchase.title}
              category={purchase.category}
              size={50}
            />

            <View style={styles.heroCopy}>
              <Text numberOfLines={2} style={styles.heroTitle}>
                {purchase.title}
              </Text>
              <Text numberOfLines={1} style={styles.heroSubtitle}>
                {[purchase.merchant, categoryLabel(purchase.category)]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              <Text style={styles.heroPrice}>{formattedAmount}</Text>
            </View>

            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{status.label}</Text>
            </View>
          </View>

          {nextDeadline ? (
            <View style={styles.deadlineSubCard}>
              <View style={styles.deadlineIconTile}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={19}
                  color="#16A34A"
                />
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={styles.deadlineLabel}>Next deadline</Text>
                <Text style={styles.deadlineTitle}>{nextDeadline.title}</Text>
                <Text style={styles.deadlineDetail}>
                  {nextDeadline.label} · {nextDeadline.detail}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Section 1: Purchase details */}
        <View style={{ gap: 8 }}>
          <View style={styles.sectionHeaderStack}>
            <Text style={styles.sectionTitle}>Purchase details</Text>
            <Text style={styles.sectionSubtitle}>Recorded data</Text>
          </View>

          <View style={styles.groupedCard}>
            {purchasedOn ? (
              <DetailRow
                icon="calendar-outline"
                label="Purchase date"
                value={purchasedOn}
              />
            ) : null}

            {purchase.orderNumber ? (
              <>
                <View style={styles.cardDivider} />
                <DetailRow
                  icon="receipt-outline"
                  label="Order number"
                  value={purchase.orderNumber}
                />
              </>
            ) : null}

            <View style={styles.cardDivider} />
            <DetailRow
              icon="pricetag-outline"
              label="Category"
              value={categoryLabel(purchase.category)}
            />

            <View style={styles.cardDivider} />
            <DetailRow
              icon="card-outline"
              label="Amount"
              value={formattedAmount}
            />

            {purchase.notes ? (
              <>
                <View style={styles.cardDivider} />
                <DetailRow
                  icon="document-text-outline"
                  label="Notes"
                  value={purchase.notes}
                  multiline
                />
              </>
            ) : null}
          </View>
        </View>

        {/* Section 2: Protection */}
        <View style={{ gap: 8 }}>
          <View style={styles.sectionHeaderStack}>
            <Text style={styles.sectionTitle}>Protection</Text>
            <Text style={styles.sectionSubtitle}>
              Return, warranty, and claims.
            </Text>
          </View>

          <View style={styles.groupedCard}>
            {/* Return window */}
            <View style={styles.protectionRow}>
              <View style={[styles.protectionIconTile, styles.tilePeach]}>
                <Ionicons name="sync-outline" size={19} color="#E11D48" />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.protectionItemTitle}>Return window</Text>
                <Text style={styles.protectionItemSubtitle}>
                  {returnWindow?.label ?? "No return deadline recorded"}
                </Text>
              </View>
              <View
                style={[
                  styles.pillBadge,
                  returnWindow?.expired
                    ? styles.pillBadgeRed
                    : styles.pillBadgeGreen,
                ]}
              >
                <Text
                  style={[
                    styles.pillBadgeText,
                    returnWindow?.expired
                      ? styles.pillBadgeTextRed
                      : styles.pillBadgeTextGreen,
                  ]}
                >
                  {returnWindow?.expired
                    ? "Expired"
                    : (returnWindow?.detail ?? "Active")}
                </Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            {/* Warranty */}
            <View style={styles.protectionRow}>
              <View style={[styles.protectionIconTile, styles.tileMint]}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={19}
                  color="#059669"
                />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.protectionItemTitle}>Warranty</Text>
                <Text style={styles.protectionItemSubtitle}>
                  {warranty?.label ?? "No warranty expiry recorded"}
                </Text>
              </View>
              <View style={[styles.pillBadge, styles.pillBadgeGreen]}>
                <Text style={[styles.pillBadgeText, styles.pillBadgeTextGreen]}>
                  {warranty?.detail ?? "Active"}
                </Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            {/* Claims */}
            {purchase.claims.length === 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="No claims opened, start a claim"
                onPress={() => openRoute("/purchase/[id]/claims")}
                style={({ pressed }) => [
                  styles.protectionRow,
                  { opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <View style={[styles.protectionIconTile, styles.tileLavender]}>
                  <Ionicons name="shield-outline" size={19} color="#6366F1" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.protectionItemTitle}>
                    No claims opened
                  </Text>
                  <Text style={styles.protectionItemSubtitle}>
                    Start a return, refund, or warranty claim from this
                    purchase.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </Pressable>
            ) : (
              purchase.claims.map((claim, idx) => (
                <React.Fragment key={claim.id}>
                  {idx > 0 ? <View style={styles.cardDivider} /> : null}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      router.push({
                        pathname: "/claim/[id]",
                        params: { id: claim.id },
                      })
                    }
                    style={({ pressed }) => [
                      styles.protectionRow,
                      { opacity: pressed ? 0.75 : 1 },
                    ]}
                  >
                    <View
                      style={[styles.protectionIconTile, styles.tileLavender]}
                    >
                      <Ionicons
                        name="shield-outline"
                        size={19}
                        color="#6366F1"
                      />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.protectionItemTitle}>
                        {CLAIM_TYPE_LABEL[claim.type]}
                      </Text>
                      <Text style={styles.protectionItemSubtitle}>
                        {CLAIM_STATUS_LABEL[claim.status]} · Opened{" "}
                        {formatTimestamp(claim.openedAt)}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#94A3B8"
                    />
                  </Pressable>
                </React.Fragment>
              ))
            )}
          </View>
        </View>

        {/* Section 3: Receipts */}
        <View style={{ gap: 8 }}>
          <View style={styles.sectionHeaderStack}>
            <Text style={styles.sectionTitle}>Receipts</Text>
            <Text style={styles.sectionSubtitle}>
              {`${purchase.receipts.length} ${
                purchase.receipts.length === 1 ? "file" : "files"
              } attached`}
            </Text>
          </View>

          <View style={styles.groupedCard}>
            {purchase.receipts.length === 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="No receipt attached, photograph or choose image"
                onPress={() => openRoute("/purchase/[id]/receipts")}
                style={({ pressed }) => [
                  styles.protectionRow,
                  { opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <View style={[styles.protectionIconTile, styles.tileLavender]}>
                  <Ionicons
                    name="document-text-outline"
                    size={19}
                    color="#6366F1"
                  />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.protectionItemTitle}>
                    No receipt attached
                  </Text>
                  <Text style={styles.protectionItemSubtitle}>
                    Photograph or choose an image from your library.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </Pressable>
            ) : (
              purchase.receipts.map((receipt, idx) => (
                <React.Fragment key={receipt.id}>
                  {idx > 0 ? <View style={styles.cardDivider} /> : null}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openRoute("/purchase/[id]/receipts")}
                    style={({ pressed }) => [
                      styles.protectionRow,
                      { opacity: pressed ? 0.75 : 1 },
                    ]}
                  >
                    <View
                      style={[styles.protectionIconTile, styles.tileLavender]}
                    >
                      <Ionicons
                        name="document-outline"
                        size={19}
                        color="#6366F1"
                      />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.protectionItemTitle}>
                        {receiptTitle(receipt)}
                      </Text>
                      <Text style={styles.protectionItemSubtitle}>
                        {receiptSize(receipt)} · Added{" "}
                        {formatTimestamp(receipt.createdAt)}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#94A3B8"
                    />
                  </Pressable>
                </React.Fragment>
              ))
            )}
          </View>

          {/* Add Receipt Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add receipt"
            onPress={() => openRoute("/purchase/[id]/receipts")}
            style={({ pressed }) => [
              styles.addReceiptButton,
              {
                opacity: pressed ? 0.88 : 1,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              },
            ]}
          >
            <Ionicons name="camera-outline" size={19} color="#FFFFFF" />
            <Text style={styles.addReceiptButtonText}>
              {purchase.receipts.length ? "Manage receipts" : "Add receipt"}
            </Text>
          </Pressable>
        </View>

        {/* Section 4: Activity */}
        <View style={{ gap: 8 }}>
          <View style={styles.sectionHeaderStack}>
            <Text style={styles.sectionTitle}>Activity</Text>
            <Text style={styles.sectionSubtitle}>
              Delivery and reminder history.
            </Text>
          </View>

          <View style={styles.activityCard}>
            <View style={styles.timelineContainer}>
              {/* Vertical connector line */}
              <View style={styles.timelineLine} pointerEvents="none" />

              {activityEvents.map((event) => (
                <View key={event.id} style={styles.timelineItem}>
                  {/* Purple dot on the line */}
                  <View style={styles.timelineDot} />

                  {/* Icon Tile */}
                  <View style={styles.timelineIconTile}>
                    <Ionicons name={event.icon} size={18} color="#6366F1" />
                  </View>

                  {/* Event Details */}
                  <View style={styles.timelineCopy}>
                    <Text numberOfLines={1} style={styles.timelineTitle}>
                      {event.title}
                    </Text>
                    <Text numberOfLines={1} style={styles.timelineSubtitle}>
                      {event.subtitle}
                    </Text>
                  </View>

                  {/* Date on Right */}
                  <Text style={styles.timelineDate}>{event.detail}</Text>
                </View>
              ))}
            </View>

            {/* View Delivery Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View delivery"
              onPress={() => openRoute("/purchase/[id]/track")}
              style={({ pressed }) => [
                styles.viewDeliveryButton,
                { opacity: pressed ? 0.82 : 1 },
              ]}
            >
              <Ionicons name="navigate-outline" size={17} color="#4F46E5" />
              <Text style={styles.viewDeliveryText}>View delivery</Text>
            </Pressable>
          </View>
        </View>

        <FormError message={error.message} />

        {/* Section 5: Delete purchase */}
        <View style={styles.deleteCard}>
          <View style={styles.deleteTopRow}>
            <View style={styles.deleteIconTile}>
              <Ionicons name="trash-outline" size={20} color="#DC2626" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.deleteTitle}>Delete purchase</Text>
              <Text style={styles.deleteSubtitle}>
                This removes the purchase from your active list. You can undo
                the delete for 5 seconds.
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete purchase"
            onPress={() => setConfirmDelete(true)}
            style={({ pressed }) => [
              styles.deleteButton,
              {
                opacity: pressed ? 0.88 : 1,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              },
            ]}
          >
            <Text style={styles.deleteButtonText}>Delete purchase</Text>
          </Pressable>
        </View>
      </ScrollView>

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
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  multiline = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconTile}>
        <Ionicons name={icon} size={17} color="#6366F1" />
      </View>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[
          styles.detailValue,
          multiline && {
            flex: 1,
            textAlign: "right",
            lineHeight: 18,
            fontSize: 13,
            fontWeight: "400",
            color: "#64748B",
          },
        ]}
        numberOfLines={multiline ? 3 : 1}
      >
        {value}
      </Text>
    </View>
  );
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
    at: purchase.updatedAt,
  });

  purchase.receipts.forEach((receipt) => {
    events.push({
      id: `receipt-${receipt.id}`,
      title: "Receipt attached",
      subtitle: receiptTitle(receipt),
      detail: formatTimestamp(receipt.createdAt),
      icon: "document-text-outline",
      at: receipt.createdAt,
    });
  });

  purchase.reminders.forEach((reminder) => {
    events.push({
      id: `reminder-created-${reminder.id}`,
      title: "Reminder created",
      subtitle: `${reminderKindLabel(reminder)} for ${
        formatDate(reminder.fireOn) ?? reminder.fireOn
      }`,
      detail: formatTimestamp(reminder.createdAt),
      icon: "notifications-outline",
      at: reminder.createdAt,
    });
    if (reminder.sentAt) {
      events.push({
        id: `reminder-sent-${reminder.id}`,
        title: "Reminder sent",
        subtitle: reminderKindLabel(reminder),
        detail: formatTimestamp(reminder.sentAt),
        icon: "send-outline",
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
      at: claim.openedAt,
    });
  });

  return events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    position: "relative",
  },
  ambientGlowTopRight: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 260,
    height: 220,
    borderRadius: 130,
    backgroundColor: "#EDE9FE",
    opacity: 0.6,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    marginBottom: 2,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  navSpacer: {
    width: 42,
  },
  editButton: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#E0E7FF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5B4DF5",
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  heroCopy: {
    flex: 1,
    gap: 2,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 22,
  },
  heroSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  heroPrice: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  deadlineSubCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
  },
  deadlineIconTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  deadlineLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  deadlineTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  deadlineDetail: {
    fontSize: 12,
    fontWeight: "500",
    color: "#15803D",
  },
  sectionHeaderStack: {
    gap: 2,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "400",
  },
  groupedCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#F1F5F9",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  detailIconTile: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  detailLabel: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  detailValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  protectionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  protectionIconTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tilePeach: {
    backgroundColor: "#FFF1F2",
  },
  tileMint: {
    backgroundColor: "#ECFDF5",
  },
  tileLavender: {
    backgroundColor: "#EEF2FF",
  },
  protectionItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  protectionItemSubtitle: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 16,
  },
  pillBadge: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  pillBadgeRed: {
    backgroundColor: "#FEF2F2",
  },
  pillBadgeGreen: {
    backgroundColor: "#ECFDF5",
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  pillBadgeTextRed: {
    color: "#E11D48",
  },
  pillBadgeTextGreen: {
    color: "#059669",
  },
  addReceiptButton: {
    height: 48,
    backgroundColor: "#775DF5",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#775DF5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  addReceiptButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  activityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  timelineContainer: {
    position: "relative",
    gap: 14,
  },
  timelineLine: {
    position: "absolute",
    left: 4,
    top: 10,
    bottom: 10,
    width: 2,
    backgroundColor: "#EDE9FE",
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#775DF5",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  timelineIconTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  timelineCopy: {
    flex: 1,
    gap: 2,
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  timelineSubtitle: {
    fontSize: 11,
    color: "#64748B",
  },
  timelineDate: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  viewDeliveryButton: {
    backgroundColor: "#F1F5FD",
    height: 44,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
  },
  viewDeliveryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4F46E5",
  },
  deleteCard: {
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 18,
    padding: 16,
  },
  deleteTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  deleteIconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#DC2626",
  },
  deleteSubtitle: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 16,
    marginTop: 2,
  },
  deleteButton: {
    height: 48,
    backgroundColor: "#DC2626",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
