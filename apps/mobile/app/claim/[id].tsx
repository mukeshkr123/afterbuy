import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { Claim, ClaimStatus } from "@acme/shared";
import {
  AppText,
  Button,
  EmptyState,
  FormError,
  IconTile,
  Money,
  ScreenHeader,
  ScreenScroll,
  SectionCard,
  Skeleton,
  StatusPill,
} from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getClaim, patchClaim } from "@/api/claims";
import { getPurchase } from "@/api/purchases";
import { fromCaught, type FormErrorState } from "@/hooks/useApiError";
import {
  CLAIM_STATUS_LABEL,
  CLAIM_TYPE_LABEL,
  nextStatuses,
  statusTone,
} from "@/lib/claims";
import { categoryIcon, formatDate } from "@/lib/purchaseDisplay";
import { useTheme } from "@/theme/ThemeProvider";

const LIFECYCLE: ClaimStatus[] = [
  "draft",
  "submitted",
  "in_progress",
  "approved",
  "completed",
];

function formatDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ClaimDetailScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const { tokens } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [error, setError] = useState<FormErrorState>({
    message: null,
    fields: {},
  });

  const claim = useQuery({
    queryKey: apiKeys.claims.detail(id ?? ""),
    queryFn: () => getClaim(api, id ?? ""),
    enabled: Boolean(id),
  });
  const purchase = useQuery({
    queryKey: apiKeys.purchases.detail(claim.data?.purchaseId ?? ""),
    queryFn: () => getPurchase(api, claim.data?.purchaseId ?? ""),
    enabled: Boolean(claim.data?.purchaseId),
  });

  const advance = useMutation({
    mutationFn: (status: ClaimStatus) => patchClaim(api, id ?? "", { status }),
    onSuccess: async (updatedClaim) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["claims"] }),
        qc.invalidateQueries({
          queryKey: apiKeys.claims.detail(id ?? ""),
        }),
        qc.invalidateQueries({ queryKey: ["purchases"] }),
      ]);
      setError({ message: null, fields: {} });
      claim.refetch().catch(() => {});
      return updatedClaim;
    },
    onError: (caught) => setError(fromCaught(caught)),
  });

  if (claim.isLoading) {
    return (
      <ScreenScroll gap={tokens.spacing.lg} safeTop={true}>
        <ScreenHeader title="Claim details" />
        <Skeleton height={112} />
        <Skeleton height={156} />
        <Skeleton height={220} />
      </ScreenScroll>
    );
  }

  if (!claim.data) {
    return (
      <ScreenScroll gap={tokens.spacing.lg} safeTop={true}>
        <ScreenHeader title="Claim details" />
        <SectionCard>
          <EmptyState
            icon="alert-circle-outline"
            title="Claim not available"
            message="We couldn't load this claim. Check your connection and try again."
            action={{
              label: "Try again",
              onPress: () => void claim.refetch(),
            }}
          />
        </SectionCard>
      </ScreenScroll>
    );
  }

  const item = claim.data;
  const transitions = nextStatuses(item.status);
  const timeline = buildTimeline(item);

  return (
    <ScreenScroll gap={tokens.spacing.lg} safeTop={true}>
      <ScreenHeader title="Claim details" />

      <SectionCard>
        <View style={{ gap: tokens.spacing.lg }}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText role="caption" tone="subtle" weight="700">
                {CLAIM_TYPE_LABEL[item.type]}
              </AppText>
              <AppText role="title">
                {purchase.data?.title ?? "Purchase"}
              </AppText>
              <AppText role="subheadline" tone="subtle">
                Opened{" "}
                {formatDate(item.openedAt.slice(0, 10)) ??
                  item.openedAt.slice(0, 10)}
              </AppText>
            </View>
            <StatusPill
              label={CLAIM_STATUS_LABEL[item.status]}
              tone={statusTone(item.status)}
            />
          </View>

          <Button
            label="View purchase"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: "/purchase/[id]",
                params: { id: item.purchaseId, section: "warranty" },
              })
            }
          />
        </View>
      </SectionCard>

      <SectionCard>
        <View style={{ gap: tokens.spacing.sm }}>
          <AppText role="label" tone="subtle" weight="700">
            Current status
          </AppText>
          <AppText role="headline">{CLAIM_STATUS_LABEL[item.status]}</AppText>
          <AppText role="subheadline" tone="subtle">
            {statusSummary(item.status, item.resolvedAt)}
          </AppText>
        </View>
      </SectionCard>

      <SectionCard>
        <View style={{ gap: tokens.spacing.lg }}>
          <AppText role="headline">Timeline</AppText>
          <View style={{ gap: tokens.spacing.md }}>
            {timeline.map((step, index) => (
              <TimelineRow
                key={`${step.label}-${index}`}
                label={step.label}
                detail={step.detail}
                active={step.active}
                complete={step.complete}
                last={index === timeline.length - 1}
              />
            ))}
          </View>
        </View>
      </SectionCard>

      <SectionCard>
        <View style={{ gap: tokens.spacing.md }}>
          <AppText role="headline">Details</AppText>
          <DetailRow label="Type" value={CLAIM_TYPE_LABEL[item.type]} />
          <DetailRow
            label="Opened"
            value={formatDateTime(item.openedAt) ?? "—"}
          />
          {item.resolvedAt ? (
            <DetailRow
              label="Resolved"
              value={formatDateTime(item.resolvedAt) ?? "—"}
            />
          ) : null}
          {item.reference ? (
            <DetailRow label="Reference" value={item.reference} />
          ) : null}
          {item.refundAmountMinor !== null ? (
            <DetailRow
              label="Refund"
              valueNode={
                <Money
                  amountMinor={item.refundAmountMinor}
                  currency={purchase.data?.currency ?? null}
                  emphasis="strong"
                  style={{ fontSize: tokens.type.body.fontSize }}
                />
              }
            />
          ) : null}
        </View>
      </SectionCard>

      {item.notes ? (
        <SectionCard>
          <View style={{ gap: tokens.spacing.sm }}>
            <AppText role="headline">Notes</AppText>
            <AppText role="body" tone="subtle">
              {item.notes}
            </AppText>
          </View>
        </SectionCard>
      ) : null}

      <FormError message={error.message} />

      {transitions.length > 0 ? (
        <View style={{ gap: tokens.spacing.sm }}>
          {transitions.map((status, index) => (
            <Button
              key={status}
              label={
                advance.isPending
                  ? "Updating..."
                  : `Mark as ${(CLAIM_STATUS_LABEL[status] ?? status).toLowerCase()}`
              }
              variant={
                status === "cancelled"
                  ? "ghost"
                  : index === 0
                    ? "primary"
                    : "secondary"
              }
              disabled={advance.isPending}
              busy={advance.isPending}
              onPress={() => advance.mutate(status)}
            />
          ))}
        </View>
      ) : null}
    </ScreenScroll>
  );
}

function buildTimeline(item: Claim) {
  if (item.status === "rejected") {
    return [
      {
        label: "Submitted",
        detail: formatDateTime(item.openedAt) ?? "Opened",
        complete: true,
        active: false,
      },
      {
        label: "Under review",
        detail: "The claim was reviewed before it was rejected.",
        complete: true,
        active: false,
      },
      {
        label: "Rejected",
        detail: formatDateTime(item.resolvedAt) ?? "Closed",
        complete: true,
        active: true,
      },
    ];
  }

  if (item.status === "cancelled") {
    return [
      {
        label: "Submitted",
        detail: formatDateTime(item.openedAt) ?? "Opened",
        complete: true,
        active: false,
      },
      {
        label: "Cancelled",
        detail: formatDateTime(item.resolvedAt) ?? "Closed",
        complete: true,
        active: true,
      },
    ];
  }

  const currentIndex = LIFECYCLE.indexOf(item.status);
  return LIFECYCLE.map((status, index) => ({
    label: CLAIM_STATUS_LABEL[status],
    detail:
      status === "draft"
        ? (formatDateTime(item.createdAt) ?? "Created")
        : status === "submitted"
          ? (formatDateTime(item.openedAt) ?? "Opened")
          : status === item.status && item.resolvedAt
            ? (formatDateTime(item.resolvedAt) ?? "Resolved")
            : status === item.status
              ? "Current stage"
              : status === "completed" && item.status === "approved"
                ? "Awaiting final completion"
                : "Not reached yet",
    complete: index < currentIndex || status === item.status,
    active: status === item.status,
  }));
}

function statusSummary(status: ClaimStatus, resolvedAt: string | null) {
  if (status === "rejected") {
    return resolvedAt
      ? `Rejected on ${formatDate(resolvedAt.slice(0, 10)) ?? resolvedAt.slice(0, 10)}.`
      : "This claim was rejected.";
  }
  if (status === "cancelled") {
    return resolvedAt
      ? `Cancelled on ${formatDate(resolvedAt.slice(0, 10)) ?? resolvedAt.slice(0, 10)}.`
      : "This claim was cancelled.";
  }
  if (status === "approved")
    return "Approved and waiting for final completion.";
  if (status === "completed") {
    return resolvedAt
      ? `Completed on ${formatDate(resolvedAt.slice(0, 10)) ?? resolvedAt.slice(0, 10)}.`
      : "This claim has been completed.";
  }
  if (status === "in_progress") return "The claim is currently under review.";
  if (status === "submitted")
    return "The claim has been submitted and is waiting for review.";
  return "The claim has been drafted and is ready for follow-through.";
}

function TimelineRow({
  label,
  detail,
  active,
  complete,
  last,
}: {
  label: string;
  detail: string;
  active: boolean;
  complete: boolean;
  last: boolean;
}) {
  const { tokens } = useTheme();
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineRail}>
        <View
          style={[
            styles.timelineDot,
            {
              backgroundColor: complete
                ? tokens.colors.accent
                : tokens.colors.border,
            },
          ]}
        />
        {!last ? (
          <View
            style={[
              styles.timelineLine,
              {
                backgroundColor: complete
                  ? tokens.colors.accentSoft
                  : tokens.colors.border,
              },
            ]}
          />
        ) : null}
      </View>
      <View style={{ flex: 1, gap: 2, paddingBottom: last ? 0 : 8 }}>
        <AppText role="body" weight={active ? "700" : "600"}>
          {label}
        </AppText>
        <AppText role="subheadline" tone="subtle">
          {detail}
        </AppText>
      </View>
    </View>
  );
}

function DetailRow({
  label,
  value,
  valueNode,
}: {
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
}) {
  return (
    <View style={styles.detailRow}>
      <AppText role="subheadline" tone="subtle">
        {label}
      </AppText>
      {valueNode ?? (
        <AppText role="body" weight="600" style={styles.detailValue}>
          {value}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  timelineRow: {
    flexDirection: "row",
    gap: 12,
  },
  timelineRail: {
    alignItems: "center",
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 28,
    marginTop: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  detailValue: {
    flex: 1,
    textAlign: "right",
  },
});
