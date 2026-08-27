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
  CategoryArtwork,
  EmptyState,
  IconTile,
  ListItem,
  Money,
  SelectionField,
  Sheet,
  ScreenTitle,
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
  const { tokens, reducedMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const { contentWidth } = useAdaptiveLayout();
  const searchParams = useLocalSearchParams<{ q?: string }>();
  const [qInput, setQInput] = useState(searchParams.q ?? "");
  const debouncedQ = useDebouncedValue(qInput, 300);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  // Local draft filter state inside the sheet
  const [draftCategory, setDraftCategory] = useState<CategoryFilter>(category);
  const [draftStatus, setDraftStatus] = useState<StatusFilter>(status);

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

  const clearFilters = () => {
    setQInput("");
    setCategory("all");
    setStatus("all");
    setDraftCategory("all");
    setDraftStatus("all");
  };

  const openFiltersSheet = () => {
    setDraftCategory(category);
    setDraftStatus(status);
    setFiltersOpen(true);
  };

  const applyFilters = () => {
    setCategory(draftCategory);
    setStatus(draftStatus);
    setFiltersOpen(false);
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
                gap: tokens.spacing.md,
              }}
            >
              <View style={styles.titleRow}>
                <ScreenTitle
                  title="Purchases"
                  subtitle="Receipts, returns, and warranties in one place."
                />
                <Pressable
                  onPress={() => router.push("/purchase/new")}
                  accessibilityRole="button"
                  accessibilityLabel="Add purchase"
                  style={({ pressed }) => [
                    styles.addButton,
                    {
                      backgroundColor: tokens.colors.primary,
                      opacity: pressed ? 0.85 : 1,
                      transform: [
                        { scale: pressed && !reducedMotion ? 0.96 : 1 },
                      ],
                    },
                  ]}
                >
                  <AppIcon
                    name="add"
                    size={22}
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
                      borderColor: tokens.colors.border,
                      borderRadius: tokens.radius.lg,
                      paddingHorizontal: tokens.spacing.md,
                      gap: tokens.spacing.sm,
                    },
                  ]}
                >
                  <AppIcon name="search" size={18} color={tokens.colors.icon} />
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
                  {qInput ? (
                    <Pressable
                      onPress={() => setQInput("")}
                      accessibilityRole="button"
                      accessibilityLabel="Clear search"
                      hitSlop={8}
                    >
                      <AppIcon
                        name="close"
                        size={16}
                        color={tokens.colors.textMuted}
                      />
                    </Pressable>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    activeFilters
                      ? `Filters, ${activeFilters} active`
                      : "Filter purchases"
                  }
                  onPress={openFiltersSheet}
                  style={({ pressed }) => [
                    styles.filterButton,
                    {
                      backgroundColor:
                        activeFilters > 0
                          ? tokens.colors.accentSoft
                          : tokens.colors.surfaceMuted,
                      borderColor:
                        activeFilters > 0
                          ? tokens.colors.primary
                          : tokens.colors.border,
                      borderRadius: 14,
                      opacity: pressed ? 0.82 : 1,
                      transform: [
                        { scale: pressed && !reducedMotion ? 0.96 : 1 },
                      ],
                    },
                  ]}
                >
                  <AppIcon
                    name="filter"
                    size={18}
                    color={
                      activeFilters > 0
                        ? tokens.colors.primary
                        : tokens.colors.icon
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
                <SkeletonGroup count={5} gap={tokens.spacing.sm} />
              ) : debouncedQ ? (
                <EmptyState
                  compact
                  icon="search-outline"
                  title="No matching purchases"
                  message="Try another search or clear the active search query."
                  action={{
                    label: "Clear search",
                    onPress: () => setQInput(""),
                  }}
                />
              ) : activeFilters > 0 ? (
                <EmptyState
                  compact
                  icon="funnel-outline"
                  title="No matching purchases"
                  message="Try changing or resetting your active category or status filters."
                  action={{
                    label: "Reset filters",
                    onPress: clearFilters,
                  }}
                />
              ) : (
                <EmptyState
                  compact
                  icon="receipt-outline"
                  title="No purchases yet"
                  message="Add a purchase to keep its receipt, return window, and warranty together."
                  action={{
                    label: "Add purchase",
                    onPress: () => router.push("/purchase/new"),
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
                leading={<CategoryArtwork category={item.category} size="sm" />}
                trailing={
                  <View style={styles.trailing}>
                    <StatusPill label={badge.label} tone={badge.tone} />
                    {item.amountMinor != null && item.amountMinor > 0 ? (
                      <Money
                        amountMinor={item.amountMinor}
                        currency={item.currency}
                        emphasis="strong"
                        style={{ fontSize: tokens.type.caption.fontSize }}
                      />
                    ) : null}
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
        <View style={{ gap: tokens.spacing.md }}>
          <View style={styles.sheetHeader}>
            <AppText role="title" weight="700">
              Filter purchases
            </AppText>
            {draftCategory !== "all" || draftStatus !== "all" ? (
              <Pressable
                onPress={() => {
                  setDraftCategory("all");
                  setDraftStatus("all");
                }}
                accessibilityRole="button"
                accessibilityLabel="Reset filters"
                hitSlop={8}
              >
                <AppText role="subheadline" tone="accent" weight="600">
                  Reset
                </AppText>
              </Pressable>
            ) : null}
          </View>

          <SelectionField
            label="Category"
            value={draftCategory}
            options={[
              { value: "all" as const, label: "All categories" },
              ...PURCHASE_CATEGORIES.map((value) => ({
                value,
                label: categoryLabel(value),
              })),
            ]}
            onChange={setDraftCategory}
          />
          <SelectionField
            label="Delivery status"
            value={draftStatus}
            options={[
              { value: "all" as const, label: "Any status" },
              ...PURCHASE_DELIVERY_STATUSES.map((value) => ({
                value,
                label: deliveryDisplay(value).label,
              })),
            ]}
            onChange={setDraftStatus}
          />

          <View style={{ marginTop: 8 }}>
            <Button label="Apply filters" size="lg" onPress={applyFilters} />
          </View>
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    height: 52,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  filterButton: {
    minWidth: 52,
    height: 52,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 32,
  },
  trailing: {
    alignItems: "flex-end",
    gap: 5,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
