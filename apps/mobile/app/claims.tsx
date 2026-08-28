import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Claim, ClaimStatus, PurchaseListResponse } from "@acme/shared";
import {
  AppText,
  Button,
  EmptyState,
  IconTile,
  ListItem,
  ScreenHeader,
  SectionCard,
  SectionHeading,
  SegmentedControl,
  SkeletonGroup,
  StatusPill,
  useAdaptiveLayout,
} from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { listClaims } from "@/api/claims";
import { listPurchases } from "@/api/purchases";
import { CLAIM_STATUS_LABEL, CLAIM_TYPE_LABEL, statusTone } from "@/lib/claims";
import { formatDate } from "@/lib/purchaseDisplay";
import { useTheme } from "@/theme/ThemeProvider";

const CLAIM_SEGMENTS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "resolved", label: "Resolved" },
  { key: "closed", label: "Closed" },
] as const;

type ClaimSegment = (typeof CLAIM_SEGMENTS)[number]["key"];

const ACTIVE_STATUSES = new Set<ClaimStatus>([
  "draft",
  "submitted",
  "in_progress",
]);
const RESOLVED_STATUSES = new Set<ClaimStatus>(["approved", "completed"]);
const CLOSED_STATUSES = new Set<ClaimStatus>(["rejected", "cancelled"]);

function matchesSegment(segment: ClaimSegment, status: ClaimStatus) {
  if (segment === "active") return ACTIVE_STATUSES.has(status);
  if (segment === "resolved") return RESOLVED_STATUSES.has(status);
  if (segment === "closed") return CLOSED_STATUSES.has(status);
  return true;
}

function emptyStateCopy(purchaseCount: number) {
  if (purchaseCount === 0) {
    return {
      icon: "receipt-outline" as const,
      title: "No purchases yet",
      message:
        "Add a purchase before starting a return, refund, or warranty claim.",
      action: {
        label: "Add purchase",
        onPressRoute: "/purchase/new" as const,
      },
    };
  }

  return {
    icon: "shield-checkmark-outline" as const,
    title: "No claims yet",
    message: "When something goes wrong, start a claim from a saved purchase.",
    action: {
      label: "Start a claim",
      onPressRoute: "/claim/new" as const,
    },
  };
}

export default function GlobalClaimsScreen() {
  const api = useApi();
  const router = useRouter();
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { contentWidth } = useAdaptiveLayout();
  const [segment, setSegment] = useState<ClaimSegment>("all");

  const claims = useQuery({
    queryKey: apiKeys.claims.list({}),
    queryFn: () => listClaims(api),
  });
  const purchases = useQuery({
    queryKey: apiKeys.purchases.list({ sort: "createdAt", limit: 50 }),
    queryFn: () => listPurchases(api, { sort: "createdAt", limit: 50 }),
  });

  const purchaseItems = (purchases.data?.items ??
    []) as PurchaseListResponse["items"];
  const titleForPurchase = useMemo(
    () =>
      new Map(
        purchaseItems.map((purchase) => [purchase.id, purchase.title] as const)
      ),
    [purchaseItems]
  );
  const allItems: Claim[] = claims.data?.items ?? [];
  const items = useMemo(
    () => allItems.filter((item) => matchesSegment(segment, item.status)),
    [allItems, segment]
  );
  const empty = emptyStateCopy(purchaseItems.length);

  return (
    <View style={{ flex: 1, backgroundColor: tokens.colors.canvas }}>
      <View
        style={{
          paddingTop: Math.max(insets.top, 12),
          paddingHorizontal: tokens.spacing.xl - 4,
          paddingBottom: tokens.spacing.md,
          backgroundColor: tokens.colors.canvas,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: tokens.colors.border,
        }}
      >
        <ScreenHeader title="Claims" showBack={false} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          width: "100%",
          maxWidth: contentWidth,
          alignSelf: "center",
          paddingHorizontal: tokens.spacing.xl - 4,
          paddingTop: tokens.spacing.xl,
          paddingBottom: Math.max(insets.bottom + 24, 32),
          gap: tokens.spacing.xl,
          flexGrow: claims.isLoading || items.length === 0 ? 1 : undefined,
        }}
        refreshControl={
          <RefreshControl
            refreshing={claims.isRefetching}
            onRefresh={() => {
              void claims.refetch();
              void purchases.refetch();
            }}
            tintColor={tokens.colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: tokens.spacing.lg }}>
            <View style={{ gap: tokens.spacing.xs }}>
              <AppText role="screenTitle">Claims</AppText>
              <AppText role="subheadline" tone="subtle">
                Active work first, resolved and closed claims kept for
                reference.
              </AppText>
            </View>
            <SegmentedControl
              tabs={CLAIM_SEGMENTS.map((item) => ({
                key: item.key,
                label: item.label,
              }))}
              activeKey={segment}
              onChange={(value) => setSegment(value as ClaimSegment)}
            />
            {!claims.isLoading && allItems.length > 0 ? (
              <SectionHeading
                title={
                  CLAIM_SEGMENTS.find((item) => item.key === segment)?.label ??
                  "All"
                }
                detail={
                  segment === "all"
                    ? `${allItems.length} total ${allItems.length === 1 ? "claim" : "claims"}`
                    : `${items.length} ${items.length === 1 ? "claim" : "claims"} in this view`
                }
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            {claims.isLoading ? (
              <SkeletonGroup count={5} gap={tokens.spacing.sm} />
            ) : claims.isError ? (
              <SectionCard>
                <View style={{ gap: tokens.spacing.md }}>
                  <View style={{ gap: 4 }}>
                    <AppText role="headline">Couldn't load claims</AppText>
                    <AppText role="subheadline" tone="subtle">
                      Check your connection and try again.
                    </AppText>
                  </View>
                  <Button
                    label="Try again"
                    variant="secondary"
                    onPress={() => {
                      void claims.refetch();
                      void purchases.refetch();
                    }}
                  />
                </View>
              </SectionCard>
            ) : allItems.length === 0 ? (
              <EmptyState
                icon={empty.icon}
                title={empty.title}
                message={empty.message}
                action={{
                  label: empty.action.label,
                  onPress: () => router.push(empty.action.onPressRoute),
                }}
              />
            ) : (
              <EmptyState
                compact
                icon="filter-outline"
                title={`No ${segment} claims`}
                message="Try another status view or start a new claim from a purchase."
                action={{
                  label: "Start a claim",
                  onPress: () => router.push("/claim/new"),
                }}
              />
            )}
          </View>
        }
        ItemSeparatorComponent={() => (
          <View style={{ height: tokens.spacing.sm }} />
        )}
        renderItem={({ item }) => (
          <SectionCard style={{ padding: 0 }}>
            <ListItem
              title={
                titleForPurchase.get(item.purchaseId) ??
                CLAIM_TYPE_LABEL[item.type] ??
                "Claim"
              }
              subtitle={`${CLAIM_TYPE_LABEL[item.type]} · Opened ${
                formatDate(item.openedAt.slice(0, 10)) ??
                item.openedAt.slice(0, 10)
              }`}
              detail={claimDetailText(item)}
              divider={false}
              leading={
                <IconTile
                  icon="shield-checkmark-outline"
                  tone={claimTone(item.status)}
                />
              }
              trailing={
                <StatusPill
                  label={CLAIM_STATUS_LABEL[item.status] ?? item.status}
                  tone={statusTone(item.status)}
                />
              }
              chevron
              onPress={() =>
                router.push({
                  pathname: "/claim/[id]",
                  params: { id: item.id },
                })
              }
            />
          </SectionCard>
        )}
      />
    </View>
  );
}

function claimTone(status: ClaimStatus) {
  if (ACTIVE_STATUSES.has(status)) return "accent";
  if (RESOLVED_STATUSES.has(status)) return "success";
  return "warning";
}

function claimDetailText(item: Claim) {
  if (item.reference) return `Reference ${item.reference}`;
  if (item.resolvedAt) {
    const resolvedOn = formatDate(item.resolvedAt.slice(0, 10));
    return resolvedOn ? `Resolved ${resolvedOn}` : "Resolved";
  }
  return "Open claim";
}

const styles = StyleSheet.create({
  emptyWrap: {
    flex: 1,
    paddingTop: 32,
    justifyContent: "center",
  },
});
