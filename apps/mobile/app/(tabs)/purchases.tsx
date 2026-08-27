import {
  PURCHASE_CATEGORIES,
  PURCHASE_DELIVERY_STATUSES,
  type PurchaseCategory,
  type PurchaseDeliveryStatus,
} from "@acme/shared";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AppIcon,
  AppText,
  Button,
  EmptyState,
  IconTile,
  ListItem,
  Money,
  SelectionField,
  Sheet,
  SkeletonGroup,
  StatusPill,
  useAdaptiveLayout,
} from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { listPurchases, type ListPurchasesQuery } from "@/api/purchases";
import { useTheme } from "@/theme/ThemeProvider";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  categoryIcon,
  categoryLabel,
  deliveryDisplay,
  formatDate,
} from "@/lib/purchaseDisplay";

type CategoryFilter = PurchaseCategory | "all";
type StatusFilter = PurchaseDeliveryStatus | "all";

export default function PurchasesScreen() {
  const api = useApi();
  const router = useRouter();
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { contentWidth } = useAdaptiveLayout();
  const searchParams = useLocalSearchParams<{ q?: string }>();
  const [qInput, setQInput] = useState(searchParams.q ?? "");
  const debouncedQ = useDebouncedValue(qInput, 300);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const activeFilters =
    (category === "all" ? 0 : 1) + (status === "all" ? 0 : 1);

  const params: ListPurchasesQuery = {
    sort: "createdAt",
    limit: 20,
    q: debouncedQ || undefined,
    category: category === "all" ? undefined : category,
    deliveryStatus: status === "all" ? undefined : status,
  };
  const list = useInfiniteQuery({
    queryKey: apiKeys.purchases.list(params),
    queryFn: ({ pageParam }) =>
      listPurchases(api, { ...params, cursor: pageParam ?? undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const items = useMemo(
    () => list.data?.pages.flatMap((page) => page.items) ?? [],
    [list.data]
  );
  const searching = Boolean(debouncedQ) || activeFilters > 0;

  const clearFilters = () => {
    setQInput("");
    setCategory("all");
    setStatus("all");
  };

  return (
    <>
      <View style={{ flex: 1, backgroundColor: tokens.colors.canvas }}>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            width: "100%",
            maxWidth: contentWidth,
            alignSelf: "center",
            paddingBottom: Math.max(insets.bottom + 88, 112),
            flexGrow: items.length === 0 ? 1 : undefined,
          }}
          refreshControl={
            <RefreshControl
              refreshing={list.isRefetching && !list.isFetchingNextPage}
              onRefresh={() => void list.refetch()}
              tintColor={tokens.colors.primary}
            />
          }
          onEndReachedThreshold={0.45}
          onEndReached={() => {
            if (list.hasNextPage && !list.isFetchingNextPage) {
              void list.fetchNextPage();
            }
          }}
          stickyHeaderIndices={[0]}
          ListHeaderComponent={
            <View
              style={{
                backgroundColor: tokens.colors.canvas,
                paddingTop: Math.max(insets.top + tokens.spacing.md, 24),
                paddingHorizontal: tokens.spacing.xl - 4,
                paddingBottom: tokens.spacing.md,
                gap: tokens.spacing.lg,
              }}
            >
              <View style={styles.titleRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText role="largeTitle">Purchases</AppText>
                  <AppText role="subheadline" tone="subtle">
                    Receipts, returns, warranties, all in one place.
                  </AppText>
                </View>
                <Pressable
                  onPress={() => router.push("/purchase/new")}
                  accessibilityRole="button"
                  accessibilityLabel="Add purchase"
                  style={({ pressed }) => [
                    styles.addButton,
                    {
                      backgroundColor: tokens.colors.primary,
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <AppIcon
                    name="add"
                    size={24}
                    color={tokens.colors.onPrimary}
                  />
                </Pressable>
              </View>

              <View style={[styles.controlsRow, { gap: tokens.spacing.sm }]}>
                <View
                  style={[
                    styles.searchBox,
                    {
                      backgroundColor: tokens.colors.surfaceMuted,
                      borderRadius: tokens.radius.md,
                      paddingHorizontal: tokens.spacing.md,
                      gap: tokens.spacing.sm,
                    },
                  ]}
                >
                  <AppIcon name="search" size={20} color={tokens.colors.icon} />
                  <TextInput
                    value={qInput}
                    onChangeText={setQInput}
                    placeholder="Search purchases"
                    placeholderTextColor={tokens.colors.textMuted}
                    accessibilityLabel="Search purchases"
                    autoCapitalize="none"
                    returnKeyType="search"
                    style={{
                      flex: 1,
                      height: "100%",
                      color: tokens.colors.text,
                      fontSize: tokens.type.body.fontSize,
                    }}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    activeFilters
                      ? `Filters, ${activeFilters} active`
                      : "Filter purchases"
                  }
                  onPress={() => setFiltersOpen(true)}
                  style={({ pressed }) => [
                    styles.filterButton,
                    {
                      backgroundColor:
                        activeFilters > 0
                          ? tokens.colors.accentSoft
                          : tokens.colors.surfaceMuted,
                      borderRadius: tokens.radius.md,
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <AppIcon
                    name="filter"
                    size={21}
                    color={
                      activeFilters > 0
                        ? tokens.colors.primary
                        : tokens.colors.text
                    }
                  />
                  {activeFilters > 0 ? (
                    <AppText role="caption" tone="accent" weight="700">
                      {activeFilters}
                    </AppText>
                  ) : null}
                </Pressable>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              {list.isLoading ? (
                <SkeletonGroup count={6} gap={tokens.spacing.sm} />
              ) : (
                <EmptyState
                  icon={searching ? "search-outline" : "receipt-outline"}
                  title={
                    searching ? "No matching purchases" : "No purchases yet"
                  }
                  message={
                    searching
                      ? "Try another search or clear the active filters."
                      : "Add a purchase to keep its receipt, return window, and warranty together."
                  }
                  action={{
                    label: searching ? "Clear filters" : "Add a purchase",
                    onPress: searching
                      ? clearFilters
                      : () => router.push("/purchase/new"),
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
          renderItem={({ item }) => {
            const badge = deliveryDisplay(item.deliveryStatus);
            const date = formatDate(item.purchaseDate);
            return (
              <ListItem
                title={item.title}
                subtitle={
                  [item.merchant, date].filter(Boolean).join(" • ") || null
                }
                divider={false}
                leading={
                  <IconTile icon={categoryIcon(item.category)} tone="neutral" />
                }
                trailing={
                  <View style={styles.trailing}>
                    <StatusPill label={badge.label} tone={badge.tone} />
                    <Money
                      amountMinor={item.amountMinor}
                      currency={item.currency}
                      emphasis="strong"
                      style={{ fontSize: tokens.type.caption.fontSize }}
                    />
                  </View>
                }
                onPress={() =>
                  router.push({
                    pathname: "/purchase/[id]",
                    params: { id: item.id },
                  })
                }
              />
            );
          }}
          ListFooterComponent={
            list.isFetchingNextPage ? (
              <ActivityIndicator
                color={tokens.colors.primary}
                style={{ padding: tokens.spacing.xl }}
                accessibilityLabel="Loading more purchases"
              />
            ) : null
          }
        />
      </View>

      <Sheet visible={filtersOpen} onRequestClose={() => setFiltersOpen(false)}>
        <View style={{ gap: tokens.spacing.lg }}>
          <AppText role="title">Filter purchases</AppText>
          <SelectionField
            label="Category"
            value={category}
            options={[
              { value: "all" as const, label: "All categories" },
              ...PURCHASE_CATEGORIES.map((value) => ({
                value,
                label: categoryLabel(value),
              })),
            ]}
            onChange={setCategory}
          />
          <SelectionField
            label="Delivery status"
            value={status}
            options={[
              { value: "all" as const, label: "Any status" },
              ...PURCHASE_DELIVERY_STATUSES.map((value) => ({
                value,
                label: deliveryDisplay(value).label,
              })),
            ]}
            onChange={setStatus}
          />
          <Button label="Done" onPress={() => setFiltersOpen(false)} />
          {activeFilters > 0 ? (
            <Button
              label="Clear filters"
              variant="ghost"
              onPress={clearFilters}
            />
          ) : null}
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchBox: {
    flex: 1,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
  },
  filterButton: {
    minWidth: 48,
    height: 48,
    paddingHorizontal: 12,
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  trailing: {
    alignItems: "flex-end",
    gap: 5,
  },
});
