import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Claim, ClaimStatus } from "@acme/shared";
import {
  Button,
  EmptyState,
  FormError,
  IconTile,
  Money,
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
  CLAIM_STATUS_LABEL as STATUS_LABEL,
  CLAIM_TYPE_LABEL as TYPE_LABEL,
  nextStatuses,
  statusTone,
} from "@/lib/claims";
import { categoryIcon, formatDate } from "@/lib/purchaseDisplay";
import { useTheme } from "@/theme/ThemeProvider";

// The lifecycle a healthy claim walks through. `rejected` and `cancelled` are
// terminal branches, shown in place of the timeline rather than as extra rows.
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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["claims"] });
      setError({ message: null, fields: {} });
    },
    onError: (e) => setError(fromCaught(e)),
  });

  if (claim.isLoading) {
    return (
      <ScreenScroll gap={tokens.spacing.lg + 2} safeTop={false}>
        <Skeleton height={96} />
        <Skeleton height={200} />
      </ScreenScroll>
    );
  }

  const c: Claim | undefined = claim.data;
  if (!c) {
    return (
      <ScreenScroll gap={tokens.spacing.lg + 2} safeTop={false}>
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

  const terminated = c.status === "rejected" || c.status === "cancelled";
  const reachedIndex = LIFECYCLE.indexOf(c.status);
  const transitions = nextStatuses(c.status);

  return (
    <>
      <ScreenScroll gap={tokens.spacing.lg + 2} safeTop={false}>
        <SectionCard
          onPress={
            purchase.data
              ? () =>
                  router.push({
                    pathname: "/purchase/[id]",
                    params: { id: c.purchaseId },
                  })
              : undefined
          }
        >
          <View style={[styles.productRow, { gap: tokens.spacing.md + 2 }]}>
            <IconTile
              icon={
                purchase.data
                  ? categoryIcon(purchase.data.category)
                  : "cube-outline"
              }
              tone="neutral"
            />
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={{
                  color: tokens.colors.text,
                  fontSize: tokens.type.body.fontSize,
                  fontWeight: "700",
                }}
              >
                {purchase.data?.title ?? TYPE_LABEL[c.type] ?? c.type}
              </Text>
              <Text
                style={{
                  color: tokens.colors.textMuted,
                  fontSize: tokens.type.bodySmall.fontSize,
                }}
              >
                {purchase.data
                  ? (TYPE_LABEL[c.type] ?? c.type)
                  : (formatDate(c.openedAt.slice(0, 10)) ?? "")}
              </Text>
              <View style={{ marginTop: 2 }}>
                <StatusPill
                  label={STATUS_LABEL[c.status] ?? c.status}
                  tone={statusTone(c.status)}
                />
              </View>
            </View>
          </View>
        </SectionCard>

        <SectionCard title="Claim Status">
          {terminated ? (
            <View style={{ gap: tokens.spacing.xs }}>
              <Text
                style={{
                  color: tokens.colors.text,
                  fontSize: tokens.type.body.fontSize,
                  fontWeight: "700",
                }}
              >
                {STATUS_LABEL[c.status]}
              </Text>
              <Text
                style={{
                  color: tokens.colors.textMuted,
                  fontSize: tokens.type.bodySmall.fontSize,
                }}
              >
                {formatDateTime(c.resolvedAt) ??
                  "This claim is no longer in progress."}
              </Text>
            </View>
          ) : (
            <View>
              {LIFECYCLE.map((stage, idx) => {
                const reached = idx <= reachedIndex;
                const isCurrent = idx === reachedIndex;
                const isLast = idx === LIFECYCLE.length - 1;
                return (
                  <View key={stage} style={styles.stepRow}>
                    <View style={styles.indicatorCol}>
                      <View
                        style={[
                          styles.dot,
                          {
                            backgroundColor: reached
                              ? tokens.colors.accent
                              : tokens.colors.border,
                          },
                        ]}
                      />
                      {!isLast ? (
                        <View
                          style={[
                            styles.connector,
                            {
                              backgroundColor:
                                idx < reachedIndex
                                  ? tokens.colors.accent
                                  : tokens.colors.border,
                            },
                          ]}
                        />
                      ) : null}
                    </View>
                    <View
                      style={[
                        styles.stepContent,
                        !isLast && { paddingBottom: tokens.spacing.lg },
                      ]}
                    >
                      <Text
                        style={{
                          color: reached
                            ? tokens.colors.text
                            : tokens.colors.textMuted,
                          fontSize: tokens.type.body.fontSize,
                          fontWeight: isCurrent ? "700" : "600",
                        }}
                      >
                        {STATUS_LABEL[stage]}
                      </Text>
                      {isCurrent ? (
                        <Text
                          style={{
                            color: tokens.colors.textMuted,
                            fontSize: tokens.type.bodySmall.fontSize,
                          }}
                        >
                          Current stage
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </SectionCard>

        <SectionCard title="Details">
          <View style={{ gap: tokens.spacing.md }}>
            <DetailRow label="Type" value={TYPE_LABEL[c.type] ?? c.type} />
            <DetailRow
              label="Opened"
              value={formatDateTime(c.openedAt) ?? "—"}
            />
            {c.resolvedAt ? (
              <DetailRow
                label="Resolved"
                value={formatDateTime(c.resolvedAt) ?? "—"}
              />
            ) : null}
            {c.reference ? (
              <DetailRow label="Reference" value={c.reference} />
            ) : null}
            {c.refundAmountMinor !== null ? (
              <View style={styles.detailRow}>
                <Text
                  style={{
                    color: tokens.colors.textMuted,
                    fontSize: tokens.type.bodySmall.fontSize,
                  }}
                >
                  Refund
                </Text>
                <Money
                  amountMinor={c.refundAmountMinor}
                  currency={purchase.data?.currency ?? null}
                  emphasis="strong"
                  style={{ fontSize: tokens.type.bodySmall.fontSize }}
                />
              </View>
            ) : null}
          </View>
        </SectionCard>

        {c.notes ? (
          <SectionCard title="Notes">
            <Text
              style={{
                color: tokens.colors.textSubtle,
                fontSize: tokens.type.body.fontSize,
                lineHeight: tokens.type.body.lineHeight,
              }}
            >
              {c.notes}
            </Text>
          </SectionCard>
        ) : null}

        <FormError message={error.message} />

        {transitions.length > 0 ? (
          <View style={{ gap: tokens.spacing.sm }}>
            {transitions.map((status, idx) => (
              <Button
                key={status}
                label={
                  advance.isPending
                    ? "Updating…"
                    : `Mark as ${(
                        STATUS_LABEL[status] ?? status
                      ).toLowerCase()}`
                }
                variant={
                  status === "cancelled"
                    ? "ghost"
                    : idx === 0
                      ? "primary"
                      : "secondary"
                }
                disabled={advance.isPending}
                onPress={() => advance.mutate(status)}
              />
            ))}
          </View>
        ) : null}
      </ScreenScroll>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { tokens } = useTheme();
  return (
    <View style={styles.detailRow}>
      <Text
        style={{
          color: tokens.colors.textMuted,
          fontSize: tokens.type.bodySmall.fontSize,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: tokens.colors.text,
          fontSize: tokens.type.bodySmall.fontSize,
          fontWeight: "600",
          flexShrink: 1,
          textAlign: "right",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  productRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  stepRow: {
    flexDirection: "row",
    gap: 16,
  },
  indicatorCol: {
    alignItems: "center",
    width: 16,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 3,
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
    gap: 2,
  },
});
