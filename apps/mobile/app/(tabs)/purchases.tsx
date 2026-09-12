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
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  AppIcon,
  AppText,
  Button,
  DateField,
  EmptyState,
  PurchaseArtworkTile,
  SelectionField,
  Sheet,
  Skeleton,
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

function formatPurchaseDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const parts = iso.split("-");
  const yearStr = parts[0];
  const monthStr = parts[1];
  const dayStr = parts[2];
  if (!yearStr || !monthStr || !dayStr) return null;
  const monthIdx = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${day} ${months[monthIdx] ?? ""} ${yearStr}`;
}

function formatPrice(amountMinor: number, currency = "USD"): string {
  if (currency === "USD") {
    if (amountMinor % 100 === 0) {
      return `$${Math.round(amountMinor / 100)}`;
    }
    return `$${(amountMinor / 100).toFixed(2)}`;
  }
  return `${currency} ${(amountMinor / 100).toFixed(2)}`;
}

interface BadgeConfig {
  label: string;
  bgColor: string;
  textColor: string;
}

function resolvePurchaseBadge(purchase: Purchase): BadgeConfig {
  // Check warranty first for long-term protection status
  if (purchase.warrantyExpiresAt) {
    const warrantyState = deadlineState(purchase.warrantyExpiresAt, "Warranty");
    if (warrantyState && !warrantyState.expired) {
      if (warrantyState.urgent) {
        return {
          label: `Warranty ${warrantyState.detail}`,
          bgColor: "#FEF3C7",
          textColor: "#B45309",
        };
      }
      return {
        label: "Warranty active",
        bgColor: "#EEF2FF",
        textColor: "#6366F1",
      };
    }
  }

  // Check return deadline
  if (purchase.returnDeadlineAt) {
    const returnState = deadlineState(purchase.returnDeadlineAt, "Return");
    if (returnState && !returnState.expired) {
      if (returnState.urgent) {
        return {
          label: `Return ${returnState.detail}`,
          bgColor: "#FEF3C7",
          textColor: "#B45309",
        };
      }
      return {
        label: "Return active",
        bgColor: "#EEF2FF",
        textColor: "#6366F1",
      };
    }
  }

  // Fallback to delivery status
  switch (purchase.deliveryStatus) {
    case "shipped":
      return {
        label: "Shipped",
        bgColor: "#EEF2FF",
        textColor: "#6366F1",
      };
    case "delivered":
      return {
        label: "Delivered",
        bgColor: "#ECFDF5",
        textColor: "#059669",
      };
    case "ordered":
      return {
        label: "Ordered",
        bgColor: "#EEF2FF",
        textColor: "#6366F1",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        bgColor: "#FEE2E2",
        textColor: "#DC2626",
      };
    default:
      return {
        label: "Ordered",
        bgColor: "#EEF2FF",
        textColor: "#6366F1",
      };
  }
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
      <View style={styles.screen}>
        {/* Ambient top pastel background glow */}
        <View style={styles.topAmbientGlowLeft} pointerEvents="none" />
        <View style={styles.topAmbientGlowRight} pointerEvents="none" />

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
              tintColor="#5B4DF5"
            />
          }
          onEndReachedThreshold={0.45}
          onEndReached={() => {
            if (list.hasNextPage && !list.isFetchingNextPage) {
              void list.fetchNextPage();
            }
          }}
          ListHeaderComponent={
            <View
              style={{
                paddingTop: Math.max(insets.top + 6, 16),
                paddingHorizontal: 16,
                paddingBottom: 8,
                gap: 12,
              }}
            >
              {/* Header Title + Gradient Plus Button */}
              <View style={styles.titleRow}>
                <View style={styles.titleCopy}>
                  <Text style={styles.screenTitle}>Purchases</Text>
                  <Text style={styles.screenSubtitle}>
                    Receipts, returns, and warranties
                  </Text>
                </View>

                <Pressable
                  onPress={() => router.push("/purchase/new")}
                  accessibilityRole="button"
                  accessibilityLabel="Add purchase"
                  style={({ pressed }) => [
                    styles.addButton,
                    {
                      opacity: pressed ? 0.88 : 1,
                      transform: [
                        { scale: pressed && !reducedMotion ? 0.95 : 1 },
                      ],
                    },
                  ]}
                >
                  <Ionicons name="add" size={26} color="#FFFFFF" />
                </Pressable>
              </View>

              {/* Search Bar + Filter Options Button */}
              <View style={styles.controlsRow}>
                <View
                  style={[
                    styles.searchBox,
                    searchFocused && styles.searchBoxFocused,
                  ]}
                >
                  <Ionicons name="search-outline" size={20} color="#64748B" />
                  <TextInput
                    ref={searchRef}
                    value={qInput}
                    onChangeText={setQInput}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    placeholder="Search purchases"
                    placeholderTextColor="#94A3B8"
                    accessibilityLabel="Search purchases"
                    autoCapitalize="none"
                    returnKeyType="search"
                    style={styles.searchInput}
                  />
                  {qInput ? (
                    <Pressable
                      onPress={() => setQInput("")}
                      accessibilityRole="button"
                      accessibilityLabel="Clear search"
                      hitSlop={8}
                    >
                      <Ionicons name="close-circle" size={18} color="#94A3B8" />
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
                    <Text style={styles.cancelButtonText}>Cancel</Text>
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
                      activeFilters > 0 && styles.filterButtonActive,
                      {
                        opacity: pressed ? 0.82 : 1,
                        transform: [
                          { scale: pressed && !reducedMotion ? 0.96 : 1 },
                        ],
                      },
                    ]}
                  >
                    {/* 3 Horizontal lines matching the design */}
                    <View style={styles.filterIconBars}>
                      <View style={[styles.filterBar, { width: 17 }]} />
                      <View style={[styles.filterBar, { width: 12 }]} />
                      <View style={[styles.filterBar, { width: 7 }]} />
                    </View>
                    {activeFilters > 0 ? (
                      <View style={styles.filterBadge}>
                        <Text style={styles.filterBadgeText}>
                          {activeFilters}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                )}
              </View>

              {/* Category Filter Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
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

              {/* Results Count & Sort Dropdown Selector */}
              <View style={styles.resultsRow}>
                <Text style={styles.resultsCount}>
                  {searchActive
                    ? `Results (${items.length})`
                    : `${items.length} purchase${items.length === 1 ? "" : "s"}`}
                </Text>

                <Pressable
                  onPress={() => setSortOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={`Sort purchases, ${sortLabel}`}
                  style={({ pressed }) => [
                    styles.sortButton,
                    { opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <Text style={styles.sortButtonText}>{sortLabel}</Text>
                  <Ionicons name="chevron-down" size={14} color="#475569" />
                </Pressable>
              </View>

              {list.isRefetching && !list.isLoading ? (
                <Text style={styles.refreshingText}>Refreshing purchases</Text>
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
                color="#5B4DF5"
                style={{ padding: 20 }}
                accessibilityLabel="Loading more purchases"
              />
            ) : null
          }
        />
      </View>

      {/* Filter Sheet */}
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

      {/* Sort Sheet */}
      <Sheet visible={sortOpen} onRequestClose={() => setSortOpen(false)}>
        <View style={{ gap: tokens.spacing.md }}>
          <View style={styles.sheetHeader}>
            <View>
              <AppText role="title" weight="700">
                Sort purchases
              </AppText>
              <AppText role="caption" tone="subtle">
                Server-supported order
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
                      backgroundColor: selected ? "#EEF2FF" : "#FFFFFF",
                      borderColor: selected ? "#5B4DF5" : "#E2E8F0",
                      borderRadius: 14,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionLabel,
                      {
                        color: selected ? "#5B4DF5" : "#0F172A",
                        fontWeight: selected ? "700" : "500",
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {selected ? (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color="#5B4DF5"
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
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.chipSelected : styles.chipUnselected,
        {
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          selected ? styles.chipTextSelected : styles.chipTextUnselected,
        ]}
      >
        {label}
      </Text>
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
  const badge = resolvePurchaseBadge(purchase);
  const formattedDate = formatPurchaseDate(purchase.purchaseDate);
  const merchant = purchase.merchant?.trim() || "Store";
  const subtitle = [merchant, formattedDate].filter(Boolean).join("  ·  ");

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${purchase.title}, ${merchant}`}
      style={({ pressed }) => [
        styles.card,
        {
          opacity: pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
      ]}
    >
      {/* Product Artwork Tile */}
      <PurchaseArtworkTile
        title={purchase.title}
        category={purchase.category}
        size={54}
      />

      {/* Card Body */}
      <View style={styles.cardCenter}>
        {/* Title + Price */}
        <View style={styles.cardHeaderLine}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {purchase.title}
          </Text>
          {purchase.amountMinor != null && purchase.amountMinor > 0 ? (
            <Text style={styles.cardPrice}>
              {formatPrice(purchase.amountMinor, purchase.currency)}
            </Text>
          ) : null}
        </View>

        {/* Store · Date */}
        <Text style={styles.cardSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>

        {/* Status Pill Badge */}
        <View style={styles.badgeRow}>
          <View style={[styles.badgePill, { backgroundColor: badge.bgColor }]}>
            <Text style={[styles.badgeText, { color: badge.textColor }]}>
              {badge.label}
            </Text>
          </View>
        </View>
      </View>

      {/* Trailing Chevron */}
      <Ionicons
        name="chevron-forward"
        size={18}
        color="#94A3B8"
        style={styles.cardChevron}
      />
    </Pressable>
  );
}

function PurchaseSkeletonList({ count }: { count: number }) {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.skeletonCard}>
          <Skeleton width={54} height={54} style={{ borderRadius: 16 }} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width="68%" height={18} />
            <Skeleton width="45%" height={14} />
            <Skeleton width={100} height={24} style={{ borderRadius: 8 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    position: "relative",
  },
  topAmbientGlowLeft: {
    position: "absolute",
    top: -50,
    left: -40,
    width: 280,
    height: 200,
    borderRadius: 140,
    backgroundColor: "#E0E7FE",
    opacity: 0.5,
  },
  topAmbientGlowRight: {
    position: "absolute",
    top: -40,
    right: -50,
    width: 240,
    height: 180,
    borderRadius: 120,
    backgroundColor: "#EDE9FE",
    opacity: 0.6,
  },
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
  screenTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 15,
    fontWeight: "400",
    color: "#64748B",
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#5B4DF5",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#5B4DF5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  searchBox: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  searchBoxFocused: {
    borderColor: "#5B4DF5",
  },
  searchInput: {
    flex: 1,
    height: "100%",
    color: "#0F172A",
    fontSize: 15,
  },
  cancelButton: {
    minHeight: 44,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#5B4DF5",
  },
  filterButton: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  filterButtonActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#5B4DF5",
  },
  filterIconBars: {
    alignItems: "flex-start",
    gap: 3.5,
  },
  filterBar: {
    height: 2,
    borderRadius: 1,
    backgroundColor: "#334155",
  },
  filterBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#5B4DF5",
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  chipsRow: {
    gap: 8,
    paddingRight: 16,
    paddingVertical: 2,
  },
  chip: {
    height: 38,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  chipSelected: {
    backgroundColor: "#5B4DF5",
    shadowColor: "#5B4DF5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  chipUnselected: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipText: {
    fontSize: 14,
  },
  chipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  chipTextUnselected: {
    color: "#0F172A",
    fontWeight: "600",
  },
  resultsRow: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 2,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  refreshingText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardCenter: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  cardHeaderLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "400",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardChevron: {
    marginLeft: 2,
  },
  emptyWrap: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
  },
  skeletonCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  optionLabel: {
    fontSize: 15,
  },
});
