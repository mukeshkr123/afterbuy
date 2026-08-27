import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  EmptyState,
  IconTile,
  ListItem,
  ScreenHeader,
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
import type { Claim, PurchaseListResponse } from "@acme/shared";

export default function GlobalClaimsScreen() {
  const api = useApi();
  const router = useRouter();
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { contentWidth } = useAdaptiveLayout();
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
  const purchaseTitle = useMemo(
    () =>
      new Map(
        purchaseItems.map((purchase) => [purchase.id, purchase.title] as const)
      ),
    [purchaseItems]
  );
  const items: Claim[] = claims.data?.items ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: tokens.colors.canvas }}>
      <View
        style={{
          paddingTop: Math.max(insets.top, 12),
          paddingHorizontal: tokens.spacing.xl - 4,
          backgroundColor: tokens.colors.canvas,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: tokens.colors.border,
        }}
      >
        <ScreenHeader title="Claims" />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          width: "100%",
          maxWidth: contentWidth,
          alignSelf: "center",
          paddingBottom: Math.max(insets.bottom + 24, 32),
        }}
        refreshControl={
          <RefreshControl
            refreshing={claims.isRefetching}
            onRefresh={() => void claims.refetch()}
            tintColor={tokens.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            {claims.isLoading ? (
              <SkeletonGroup count={5} gap={tokens.spacing.sm} />
            ) : (
              <EmptyState
                compact
                icon="shield-outline"
                title="No claims yet"
                message={
                  purchaseItems.length === 0
                    ? "Add a purchase before starting a return or warranty claim."
                    : "If something goes wrong with a purchase, start a claim from its details."
                }
                action={{
                  label:
                    purchaseItems.length === 0
                      ? "Add purchase"
                      : "Choose a purchase",
                  onPress:
                    purchaseItems.length === 0
                      ? () => router.push("/purchase/new")
                      : () => router.push("/claim/new"),
                }}
              />
            )}
          </View>
        }
        ItemSeparatorComponent={() => (
          <View
            style={{
              height: StyleSheet.hairlineWidth,
              marginLeft: 76,
              backgroundColor: tokens.colors.border,
            }}
          />
        )}
        renderItem={({ item }) => (
          <ListItem
            title={
              purchaseTitle.get(item.purchaseId) ??
              CLAIM_TYPE_LABEL[item.type] ??
              "Claim"
            }
            subtitle={`${CLAIM_TYPE_LABEL[item.type]} · Opened ${
              formatDate(item.openedAt.slice(0, 10)) ??
              item.openedAt.slice(0, 10)
            }`}
            divider={false}
            leading={<IconTile icon="shield-checkmark-outline" tone="accent" />}
            trailing={
              <StatusPill
                label={CLAIM_STATUS_LABEL[item.status] ?? item.status}
                tone={statusTone(item.status)}
              />
            }
            chevron
            onPress={() =>
              router.push({ pathname: "/claim/[id]", params: { id: item.id } })
            }
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 32,
  },
});
