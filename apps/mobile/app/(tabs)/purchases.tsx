import {
  PURCHASE_CATEGORIES,
  PURCHASE_DELIVERY_STATUSES,
  type Purchase,
  type PurchaseCategory,
  type PurchaseDeliveryStatus,
} from "@acme/shared";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
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
  DateField,
  EmptyState,
  Money,
  SelectionField,
  Sheet,
  Skeleton,
  StatusPill,
  useAdaptiveLayout,
} from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { listPurchases, type ListPurchasesQuery } from "@/api/purchases";
import { useTheme } from "@/theme/ThemeProvider";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  categoryLabel,
  deadlineState,
  deliveryDisplay,
  formatDate,
} from "@/lib/purchaseDisplay";

type CategoryFilter = PurchaseCategory | "all";
type StatusFilter = PurchaseDeliveryStatus | "all";
type SortKey = NonNullable<ListPurchasesQuery["sort"]>;

const INLINE_CATEGORIES: ReadonlyArray<{
  label: string;
  value: CategoryFilter;
}> = [
  { label: "All", value: "all" },
  { label: "Electronics", value: "electronics" },
  { label: "Home", value: "home_improvement" },
  { label: "Clothing", value: "clothing" },
];

const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: "createdAt", label: "Newest added" },
  { value: "purchaseDate", label: "Recent purchase date" },
  { value: "amount", label: "Highest price" },
];

function protectionBadge(
  iso: string | null | undefined,
  noun: "Return" | "Warranty"
) {
  const state = deadlineState(iso, noun === "Return" ? "Return by" : "Until");
  if (!state || state.expired) return null;
  return {
    label: state.urgent ? `${noun} ${state.detail}` : `${noun} active`,
    tone: state.urgent ? ("warning" as const) : ("accent" as const),
  };
}

function purchaseListBadge(purchase: Purchase) {
  const returnBadge = protectionBadge(purchase.returnDeadlineAt, "Return");
  const warrantyBadge = protectionBadge(purchase.warrantyExpiresAt, "Warranty");

  return (
    (returnBadge?.tone === "warning" ? returnBadge : null) ??
    (warrantyBadge?.tone === "warning" ? warrantyBadge : null) ??
    returnBadge ??
    warrantyBadge ??
    deliveryDisplay(purchase.deliveryStatus)
  );
}

function shortDate(iso: string | null | undefined): string | null {
  const formatted = formatDate(iso);
  if (!formatted) return null;
  return formatted.replace(",", "");
}

export default function PurchasesScreen() {
  const api = useApi();
  const router = useRouter();
  const { tokens, reducedMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const { contentWidth } = useAdaptiveLayout();
  const searchParams = useLocalSearchParams<{ q?: string }>();
  const searchRef = useRef<TextInput>(null);
  const [qInput, setQInput] = useState(searchParams.q ?? "");
  const debouncedQ = useDebouncedValue(qInput, 300);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<SortKey>("createdAt");

  const [draftCategory, setDraftCategory] = useState<CategoryFilter>(category);
  const [draftStatus, setDraftStatus] = useState<StatusFilter>(status);
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);

  const activeFilters =
    (category === "all" ? 0 : 1) +
    (status === "all" ? 0 : 1) +
    (from ? 1 : 0) +
    (to ? 1 : 0);

  const params: ListPurchasesQuery = {
    sort,
    limit: 20,
    q: debouncedQ || undefined,
    category: category === "all" ? undefined : category,
    deliveryStatus: status === "all" ? undefined : status,
    from: from || undefined,
    to: to || undefined,
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

  const searchActive = searchFocused || qInput.length > 0;
  const sortLabel =
    SORT_OPTIONS.find((option) => option.value === sort)?.label ??
    "Newest added";

  const clearFilters = () => {
    setQInput("");
    setCategory("all");
    setStatus("all");
    setFrom("");
    setTo("");
    setDraftCategory("all");
    setDraftStatus("all");
    setDraftFrom("");
    setDraftTo("");
  };

  const openFiltersSheet = () => {
    setDraftCategory(category);
    setDraftStatus(status);
    setDraftFrom(from);
    setDraftTo(to);
    setFiltersOpen(true);
  };

  const resetDraftFilters = () => {
    setDraftCategory("all");
    setDraftStatus("all");
    setDraftFrom("");
    setDraftTo("");
  };

  const applyFilters = () => {
    setCategory(draftCategory);
    setStatus(draftStatus);
    setFrom(draftFrom);
    setTo(draftTo);
    setFiltersOpen(false);
  };

  const cancelSearch = () => {
    setQInput("");
    setSearchFocused(false);
    searchRef.current?.blur();
  };

  return (
    <>
      <View style={{ flex: 1, backgroundColor: tokens.colors.canvas }}>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            width: "100%",
            maxWidth: contentWidth,
            alignSelf: "center",
            paddingBottom: Math.max(insets.bottom + 84, 104),
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
                paddingTop: Math.max(insets.top + tokens.spacing.sm, 20),
                paddingHorizontal: tokens.spacing.lg,
                paddingBottom: tokens.spacing.sm,
                gap: tokens.spacing.sm,
              }}
            >
              <View style={styles.titleRow}>
                <View style={styles.titleCopy}>
                  <AppText role="screenTitle" tone="strong">
                    Purchases
                  </AppText>
                  <AppText role="subheadline" tone="subtle">
                    Receipts, returns, and warranties
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
                      backgroundColor: tokens.colors.surface,
                      borderColor: searchFocused
                        ? tokens.colors.focus
                        : tokens.colors.border,
                      borderRadius: tokens.radius.lg,
                      paddingHorizontal: tokens.spacing.sm + 2,
                      gap: tokens.spacing.sm,
                    },
                  ]}
                >
                  <AppIcon name="search" size={18} color={tokens.colors.icon} />
                  <TextInput
                    ref={searchRef}
                    value={qInput}
                    onChangeText={setQInput}
                    onFocus={() => setSearchFocused(true)}
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

                {searchActive ? (
                  <Pressable
                    onPress={cancelSearch}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel search"
                    style={({ pressed }) => [
                      styles.cancelButton,
                      { opacity: pressed ? 0.65 : 1 },
                    ]}
                  >
                    <AppText role="subheadline" tone="accent" weight="700">
                      Cancel
                    </AppText>
                  </Pressable>
                ) : (
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
                            : tokens.colors.surface,
                        borderColor: tokens.colors.border,
                        borderRadius: tokens.radius.lg,
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
                )}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.chipsRow,
                  { gap: tokens.spacing.sm },
                ]}
                keyboardShouldPersistTaps="handled"
              >
                {INLINE_CATEGORIES.map((option) => (
                  <FilterChip
                    key={option.value}
                    label={option.label}
                    selected={category === option.value}
                    onPress={() => setCategory(option.value)}
                  />
                ))}
              </ScrollView>

              <View style={styles.resultsRow}>
                <AppText role="caption" tone="subtle" weight="700">
                  {searchActive
                    ? `Results (${items.length})`
                    : `${items.length} purchase${items.length === 1 ? "" : "s"}`}
                </AppText>
                <Pressable
                  onPress={() => setSortOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={`Sort purchases, ${sortLabel}`}
                  style={({ pressed }) => [
                    styles.sortButton,
                    {
                      backgroundColor: tokens.colors.surface,
                      borderColor: tokens.colors.border,
                      borderRadius: tokens.radius.lg,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <AppText role="caption" tone="subtle" weight="600">
                    {sortLabel}
                  </AppText>
                </Pressable>
              </View>

              {list.isRefetching && !list.isLoading ? (
                <AppText role="caption" tone="muted">
                  Refreshing purchases
                </AppText>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              {list.isLoading ? (
                <PurchaseSkeletonList count={5} />
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
                  message="Try changing or resetting your active category, status, or date filters."
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
          renderItem={({ item }) => (
            <PurchaseRowCard
              purchase={item}
              onPress={() =>
                router.push({
                  pathname: "/purchase/[id]",
                  params: { id: item.id },
                })
              }
            />
          )}
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
            <View>
              <AppText role="title" weight="700">
                Filter purchases
              </AppText>
              <AppText role="caption" tone="subtle">
                Category, delivery status, and purchase date
              </AppText>
            </View>
            {draftCategory !== "all" ||
            draftStatus !== "all" ||
            draftFrom ||
            draftTo ? (
              <Pressable
                onPress={resetDraftFilters}
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

          <View style={[styles.dateRange, { gap: tokens.spacing.md }]}>
            <View style={styles.dateField}>
              <DateField
                label="From"
                value={draftFrom}
                onChange={setDraftFrom}
              />
            </View>
            <View style={styles.dateField}>
              <DateField label="To" value={draftTo} onChange={setDraftTo} />
            </View>
          </View>

          <View style={{ marginTop: 8 }}>
            <Button label="Apply filters" size="lg" onPress={applyFilters} />
          </View>
        </View>
      </Sheet>

      <Sheet visible={sortOpen} onRequestClose={() => setSortOpen(false)}>
        <View style={{ gap: tokens.spacing.md }}>
          <View style={styles.sheetHeader}>
            <View>
              <AppText role="title" weight="700">
                Sort purchases
              </AppText>
              <AppText role="caption" tone="subtle">
                Server-supported order, newest first
              </AppText>
            </View>
          </View>

          <View style={{ gap: tokens.spacing.sm }}>
            {SORT_OPTIONS.map((option) => {
              const selected = sort === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    setSort(option.value);
                    setSortOpen(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [
                    styles.optionRow,
                    {
                      backgroundColor: selected
                        ? tokens.colors.accentSoft
                        : tokens.colors.surface,
                      borderColor: selected
                        ? tokens.colors.primary
                        : tokens.colors.border,
                      borderRadius: tokens.radius.lg,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <AppText
                    role="body"
                    tone={selected ? "accent" : "default"}
                    weight={selected ? "700" : "500"}
                  >
                    {option.label}
                  </AppText>
                  {selected ? (
                    <AppIcon
                      name="check"
                      size={20}
                      color={tokens.colors.primary}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Sheet>
    </>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { tokens, reducedMotion } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected
            ? tokens.colors.primary
            : tokens.colors.surface,
          borderColor: selected ? tokens.colors.primary : tokens.colors.border,
          borderRadius: tokens.radius.pill,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !reducedMotion ? 0.98 : 1 }],
        },
      ]}
    >
      <AppText
        role="caption"
        tone={selected ? "strong" : "subtle"}
        weight="700"
        style={{ color: selected ? tokens.colors.onPrimary : undefined }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function PurchaseRowCard({
  purchase,
  onPress,
}: {
  purchase: Purchase;
  onPress: () => void;
}) {
  const { tokens, reducedMotion } = useTheme();
  const badge = purchaseListBadge(purchase);
  const purchasedAt = shortDate(purchase.purchaseDate);
  const merchant = purchase.merchant?.trim() || "Unknown merchant";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${purchase.title}, ${merchant}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.lg,
          marginHorizontal: tokens.spacing.lg,
          marginBottom: tokens.spacing.xs,
          opacity: pressed ? 0.88 : 1,
          transform: [{ scale: pressed && !reducedMotion ? 0.99 : 1 }],
        },
      ]}
    >
      <CategoryArtwork category={purchase.category} size="sm" />
      <View style={styles.cardBody}>
        <View style={styles.cardTopLine}>
          <AppText
            role="subheadline"
            numberOfLines={1}
            style={styles.cardTitle}
          >
            {purchase.title}
          </AppText>
          {purchase.amountMinor != null && purchase.amountMinor > 0 ? (
            <Money
              amountMinor={purchase.amountMinor}
              currency={purchase.currency}
              emphasis="strong"
              style={{ fontSize: tokens.type.bodySmall.fontSize }}
            />
          ) : null}
        </View>
        <View style={styles.metaRow}>
          <AppText role="caption" tone="subtle" numberOfLines={1}>
            {merchant}
          </AppText>
          {purchasedAt ? (
            <>
              <View
                style={[
                  styles.metaDot,
                  { backgroundColor: tokens.colors.textMuted },
                ]}
              />
              <AppText role="caption" tone="muted" numberOfLines={1}>
                {purchasedAt}
              </AppText>
            </>
          ) : null}
        </View>
        <StatusPill label={badge.label} tone={badge.tone} quiet />
      </View>
    </Pressable>
  );
}

function PurchaseSkeletonList({ count }: { count: number }) {
  const { tokens } = useTheme();
  return (
    <View style={{ gap: tokens.spacing.sm }}>
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          style={[
            styles.skeletonCard,
            {
              backgroundColor: tokens.colors.surface,
              borderColor: tokens.colors.border,
              borderRadius: tokens.radius.lg,
              gap: tokens.spacing.md,
            },
          ]}
        >
          <Skeleton width={40} height={40} style={{ borderRadius: 12 }} />
          <View style={{ flex: 1, gap: tokens.spacing.sm }}>
            <Skeleton width="72%" height={18} />
            <Skeleton width="48%" height={14} />
            <Skeleton width={112} height={26} style={{ borderRadius: 999 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  titleCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchBox: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  filterButton: {
    minWidth: 44,
    height: 44,
    borderWidth: 1,
    paddingHorizontal: 11,
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    minHeight: 44,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  chipsRow: {
    paddingRight: 16,
  },
  chip: {
    minHeight: 44,
    borderWidth: 1,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  resultsRow: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sortButton: {
    minHeight: 44,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
  },
  card: {
    borderWidth: 1,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  cardTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  cardTitle: {
    flex: 1,
    minWidth: 0,
  },
  metaRow: {
    minHeight: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  dateRange: {
    flexDirection: "row",
  },
  dateField: {
    flex: 1,
    minWidth: 0,
  },
  optionRow: {
    minHeight: 48,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  skeletonCard: {
    borderWidth: 1,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
  },
});
