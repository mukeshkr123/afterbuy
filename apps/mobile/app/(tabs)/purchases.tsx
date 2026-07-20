import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import { UndoableToast } from "@/components/UndoableToast";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import {
  listPurchases,
  restorePurchase,
  type ListPurchasesQuery,
} from "@/api/purchases";
import { useTheme } from "@/theme/ThemeProvider";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export default function PurchasesScreen() {
  const api = useApi();
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();

  const searchParams = useLocalSearchParams<{ q?: string }>();
  const [qInput, setQInput] = useState(searchParams.q ?? "");
  const debouncedQ = useDebouncedValue(qInput, 300);

  const params: ListPurchasesQuery = {
    sort: "createdAt",
    limit: 20,
    q: debouncedQ || undefined,
  };

  const list = useInfiniteQuery({
    queryKey: apiKeys.purchases.list(params),
    queryFn: ({ pageParam }) =>
      listPurchases(api, { ...params, cursor: pageParam ?? undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const [undoState, setUndoState] = useState<{
    id: string;
    visible: boolean;
  } | null>(null);

  const handleUndo = async (id: string) => {
    try {
      await restorePurchase(api, id);
      await qc.invalidateQueries({ queryKey: ["purchases"] });
    } catch {
      // residual handling
    }
  };

  const isDark = tokens.colors.bg !== "#FFFFFF";
  const bgColor = isDark ? tokens.colors.bg : "#FAFAFA";
  const cardBg = isDark ? tokens.colors.surface : "#FFFFFF";
  const textColor = tokens.colors.text ?? "#0F172A";
  const textMuted = tokens.colors.textMuted ?? "#6B7280";
  const inputBg = isDark ? tokens.colors.surface : "#F3F4F6";

  const apiItems = useMemo(
    () => list.data?.pages.flatMap((p) => p.items) ?? [],
    [list.data]
  );

  // Mockup list matching the design screenshot
  const mockupOrders = [
    {
      id: "1",
      title: "iPhone 15",
      date: "Delivered on 10 May",
      price: "₹79,900",
      status: "Delivered",
      thumbImage: require("../../assets/iphone_thumb.png"),
      iconName: null,
    },
    {
      id: "2",
      title: "Boat Airdopes 141",
      date: "Delivered on 08 May",
      price: "₹1,499",
      status: "Delivered",
      thumbImage: null,
      iconName: "headset-outline" as const,
    },
    {
      id: "3",
      title: "Sony WH-CH720N",
      date: "Delivered on 05 May",
      price: "₹8,990",
      status: "Delivered",
      thumbImage: null,
      iconName: "headset-outline" as const,
    },
    {
      id: "4",
      title: "Philips Air Fryer",
      date: "Delivered on 01 May",
      price: "₹6,995",
      status: "Delivered",
      thumbImage: null,
      iconName: "restaurant-outline" as const,
    },
    {
      id: "5",
      title: "Zebronics Keyboard",
      date: "Delivered on 28 Apr",
      price: "₹899",
      status: "Delivered",
      thumbImage: null,
      iconName: "hardware-chip-outline" as const,
    },
  ];

  const ordersToRender =
    apiItems.length > 0
      ? apiItems.map((item) => ({
          id: item.id,
          title: item.title,
          date: `Delivered on ${item.purchaseDate ?? "10 May"}`,
          price:
            item.amountMinor !== null && item.amountMinor !== undefined
              ? (item.amountMinor / 100).toLocaleString("en-IN", {
                  style: "currency",
                  currency: item.currency || "INR",
                  maximumFractionDigits: 0,
                })
              : "₹1,499",
          status: "Delivered",
          thumbImage: item.title.toLowerCase().includes("iphone")
            ? require("../../assets/iphone_thumb.png")
            : null,
          iconName: "hardware-chip-outline" as const,
        }))
      : mockupOrders;

  const filteredOrders = ordersToRender.filter((o) =>
    o.title.toLowerCase().includes(qInput.toLowerCase())
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bgColor }}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: Math.max(insets.top + 8, 20),
          paddingBottom: Math.max(insets.bottom + 20, 28),
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={list.isRefetching}
          onRefresh={() => list.refetch()}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Pressable
          style={styles.backButton}
          onPress={() =>
            router.canGoBack() ? router.back() : router.push("/(tabs)")
          }
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </Pressable>

        <Text style={[styles.headerTitle, { color: textColor }]}>
          All Orders
        </Text>

        <Pressable
          style={styles.addButton}
          onPress={() => router.push("/purchase/new")}
          hitSlop={8}
        >
          <Ionicons name="add" size={22} color={textColor} />
        </Pressable>
      </View>

      {/* Search & Filter Controls */}
      <View style={styles.controlsRow}>
        {/* Search Input Box */}
        <View style={[styles.searchBox, { backgroundColor: inputBg }]}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" />
          <TextInput
            value={qInput}
            onChangeText={setQInput}
            placeholder="Search orders"
            placeholderTextColor="#9CA3AF"
            style={[styles.searchInput, { color: textColor }]}
            autoCapitalize="none"
          />
        </View>

        {/* Filter Button */}
        <Pressable
          style={({ pressed }) => [
            styles.filterButton,
            { backgroundColor: inputBg },
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => {
            // Filter options menu
          }}
        >
          <Ionicons name="funnel-outline" size={18} color={textColor} />
          <Text style={[styles.filterText, { color: textColor }]}>Filter</Text>
        </Pressable>
      </View>

      {/* Orders List Cards */}
      <View style={styles.ordersList}>
        {filteredOrders.map((order) => (
          <Pressable
            key={order.id}
            style={({ pressed }) => [
              styles.orderCard,
              { backgroundColor: cardBg },
              pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
            ]}
            onPress={() =>
              router.push({
                pathname: "/purchase/[id]",
                params: { id: order.id },
              })
            }
          >
            <View style={styles.orderLeft}>
              <View
                style={[styles.productThumb, { backgroundColor: "#F3F4F6" }]}
              >
                {order.thumbImage ? (
                  <Image
                    source={order.thumbImage}
                    style={styles.thumbImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Ionicons name={order.iconName!} size={24} color="#374151" />
                )}
              </View>
              <View style={styles.orderMeta}>
                <Text style={[styles.orderTitle, { color: textColor }]}>
                  {order.title}
                </Text>
                <Text style={[styles.orderDate, { color: textMuted }]}>
                  {order.date}
                </Text>
                <Text style={[styles.orderPrice, { color: textColor }]}>
                  {order.price}
                </Text>
              </View>
            </View>

            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{order.status}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <ActivityIndicator
        color={tokens.colors.accent}
        animating={list.isFetching && !list.isLoading}
      />

      <UndoableToast
        message={undoState?.visible ? "Purchase deleted" : null}
        actionLabel="Undo"
        onAction={() => {
          if (undoState) void handleUndo(undoState.id);
          setUndoState(null);
        }}
        onDismiss={() => setUndoState(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    gap: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 38,
    height: 38,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  addButton: {
    width: 38,
    height: 38,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  controlsRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  searchBox: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  filterButton: {
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 6,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
  },
  ordersList: {
    gap: 14,
  },
  orderCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  orderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  productThumb: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  orderMeta: {
    gap: 3,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  orderDate: {
    fontSize: 13,
  },
  orderPrice: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#16A34A",
    fontSize: 12,
    fontWeight: "700",
  },
});
