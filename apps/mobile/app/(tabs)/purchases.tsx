import { useInfiniteQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  PURCHASE_CATEGORIES,
  PURCHASE_DELIVERY_STATUSES,
  type PurchaseCategory,
  type PurchaseDeliveryStatus,
} from "@acme/shared";
import {
  Button,
  EmptyState,
  IconTile,
  ListItem,
  Money,
  ScreenHeader,
  ScreenScroll,
  SectionCard,
  Sheet,
  SkeletonGroup,
  StatusPill,
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

  // The server already applies `q`, `category` and `deliveryStatus`. Filtering
  // again on the client would silently hide rows from later pages.
  const items = useMemo(
    () => list.data?.pages.flatMap((p) => p.items) ?? [],
    [list.data]
  );

  const searching = Boolean(debouncedQ) || activeFilters > 0;

  return (
    <>
      <ScreenScroll
        gap={tokens.spacing.lg + 2}
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
      >
        <ScreenHeader
          title="All Orders"
          // A tab root has nothing to go back to.
          showBack={false}
          action={{
            icon: "add",
            label: "Add order",
            onPress: () => router.push("/purchase/new"),
          }}
        />

        <View style={[styles.controlsRow, { gap: tokens.spacing.md }]}>
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: tokens.colors.surfaceMuted,
                borderRadius: tokens.radius.lg,
                paddingHorizontal: tokens.spacing.md + 2,
                gap: tokens.spacing.sm + 2,
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={20}
              color={tokens.colors.icon}
            />
            <TextInput
              value={qInput}
              onChangeText={setQInput}
              placeholder="Search orders"
              placeholderTextColor={tokens.colors.textMuted}
              accessibilityLabel="Search orders"
              autoCapitalize="none"
              style={[
                styles.searchInput,
                {
                  color: tokens.colors.text,
                  fontSize: tokens.type.body.fontSize - 1,
                },
              ]}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              activeFilters > 0
                ? `Filter, ${activeFilters} active`
                : "Filter orders"
            }
            onPress={() => setFiltersOpen(true)}
            style={({ pressed }) => [
              styles.filterButton,
              {
                backgroundColor:
                  activeFilters > 0
                    ? tokens.colors.accentSoft
                    : tokens.colors.surfaceMuted,
                borderRadius: tokens.radius.lg,
                paddingHorizontal: tokens.spacing.lg,
                gap: tokens.spacing.xs + 2,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Ionicons
              name="funnel-outline"
              size={18}
              color={
                activeFilters > 0 ? tokens.colors.accent : tokens.colors.text
              }
            />
            <Text
              style={{
                color:
                  activeFilters > 0 ? tokens.colors.accent : tokens.colors.text,
                fontSize: tokens.type.bodySmall.fontSize,
                fontWeight: "600",
              }}
            >
              {activeFilters > 0 ? `Filter (${activeFilters})` : "Filter"}
            </Text>
          </Pressable>
        </View>

        {list.isLoading ? (
          <SkeletonGroup count={5} gap={tokens.spacing.md} />
        ) : items.length === 0 ? (
          <SectionCard>
            <EmptyState
              icon={searching ? "search-outline" : "receipt-outline"}
              title={searching ? "No matching orders" : "No orders yet"}
              message={
                searching
                  ? "Try a different search term, or clear your filters."
                  : "Add your first purchase to start tracking returns and warranties."
              }
              action={
                searching
                  ? {
                      label: "Clear filters",
                      onPress: () => {
                        setQInput("");
                        setCategory("all");
                        setStatus("all");
                      },
                    }
                  : {
                      label: "Add an order",
                      onPress: () => router.push("/purchase/new"),
                    }
              }
            />
          </SectionCard>
        ) : (
          <SectionCard flush>
            {items.map((item, idx) => {
              const badge = deliveryDisplay(item.deliveryStatus);
              const date = formatDate(item.purchaseDate);
              return (
                <ListItem
                  key={item.id}
                  title={item.title}
                  subtitle={
                    [item.merchant, date].filter(Boolean).join(" • ") || null
                  }
                  divider={idx < items.length - 1}
                  leading={
                    <IconTile
                      icon={categoryIcon(item.category)}
                      tone="neutral"
                    />
                  }
                  trailing={
                    <View style={styles.trailing}>
                      <StatusPill label={badge.label} tone={badge.tone} />
                      <Money
                        amountMinor={item.amountMinor}
                        currency={item.currency}
                        emphasis="strong"
                        style={{ fontSize: tokens.type.bodySmall.fontSize }}
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
            })}
          </SectionCard>
        )}

        {list.hasNextPage ? (
          <Button
            label={list.isFetchingNextPage ? "Loading…" : "Load more"}
            variant="secondary"
            disabled={list.isFetchingNextPage}
            onPress={() => void list.fetchNextPage()}
          />
        ) : null}
      </ScreenScroll>

      <Sheet visible={filtersOpen} onRequestClose={() => setFiltersOpen(false)}>
        <View style={{ gap: tokens.spacing.lg }}>
          <Text
            style={{
              color: tokens.colors.text,
              fontSize: tokens.type.title.fontSize,
              fontWeight: "700",
            }}
          >
            Filter orders
          </Text>

          <FilterGroup
            label="Category"
            value={category}
            options={[
              { value: "all" as const, label: "All categories" },
              ...PURCHASE_CATEGORIES.map((c) => ({
                value: c,
                label: categoryLabel(c),
              })),
            ]}
            onChange={setCategory}
          />

          <FilterGroup
            label="Delivery status"
            value={status}
            options={[
              { value: "all" as const, label: "Any status" },
              ...PURCHASE_DELIVERY_STATUSES.map((s) => ({
                value: s,
                label: deliveryDisplay(s).label,
              })),
            ]}
            onChange={setStatus}
          />

          <View style={{ gap: tokens.spacing.sm }}>
            <Button label="Done" onPress={() => setFiltersOpen(false)} />
            {activeFilters > 0 ? (
              <Button
                label="Clear filters"
                variant="ghost"
                onPress={() => {
                  setCategory("all");
                  setStatus("all");
                }}
              />
            ) : null}
          </View>
        </View>
      </Sheet>
    </>
  );
}

function FilterGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (next: T) => void;
}) {
  const { tokens } = useTheme();
  return (
    <View style={{ gap: tokens.spacing.sm }}>
      <Text
        style={{
          color: tokens.colors.textMuted,
          fontSize: tokens.type.bodySmall.fontSize,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
      <View style={[styles.chipWrap, { gap: tokens.spacing.sm }]}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(o.value)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: selected
                    ? tokens.colors.accent
                    : tokens.colors.surfaceMuted,
                  borderRadius: tokens.radius.pill,
                  paddingHorizontal: tokens.spacing.md + 2,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text
                style={{
                  color: selected
                    ? tokens.colors.accentText
                    : tokens.colors.text,
                  fontSize: tokens.type.bodySmall.fontSize,
                  fontWeight: "600",
                }}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  searchInput: {
    flex: 1,
    height: "100%",
  },
  filterButton: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
  },
  trailing: {
    alignItems: "flex-end",
    gap: 4,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  chip: {
    minHeight: 36,
    justifyContent: "center",
  },
});
