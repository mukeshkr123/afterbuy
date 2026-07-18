import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button, EmptyState, ListItem, SkeletonGroup } from "@/components";
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
import { fromCaught } from "@/hooks/useApiError";

export default function PurchasesScreen() {
  const api = useApi();
  const router = useRouter();
  const qc = useQueryClient();
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
      // next list refresh will hide the residual state
    }
  };

  const items = useMemo(
    () => list.data?.pages.flatMap((p) => p.items) ?? [],
    [list.data]
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.colors.bg }}
      contentContainerStyle={{
        padding: tokens.spacing.lg,
        gap: tokens.spacing.md,
      }}
      refreshControl={
        <RefreshControl
          refreshing={list.isRefetching}
          onRefresh={() => list.refetch()}
        />
      }
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            fontSize: tokens.type.display.fontSize,
            fontWeight: "700",
            color: tokens.colors.text,
          }}
        >
          Purchases
        </Text>
        <Button label="+ Add" onPress={() => router.push("/purchase/new")} />
      </View>

      <TextInput
        value={qInput}
        onChangeText={setQInput}
        placeholder="Search title or merchant"
        autoCapitalize="none"
        accessibilityLabel="Search purchases"
        placeholderTextColor={tokens.colors.textMuted}
        style={{
          color: tokens.colors.text,
          borderColor: tokens.colors.border,
          backgroundColor: tokens.colors.surface,
          borderRadius: tokens.radius.md,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm + 2,
          fontSize: tokens.type.body.fontSize,
          borderWidth: 1,
          minHeight: 44,
        }}
      />

      {list.isLoading ? (
        <SkeletonGroup count={5} />
      ) : list.isError ? (
        <EmptyState
          title="Couldn't load purchases"
          message={fromCaught(list.error).message}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="No purchases yet"
          message="Tap + Add to start tracking returns and warranties."
        />
      ) : (
        <View style={{ gap: tokens.spacing.sm }}>
          {items.map((p) => (
            <ListItem
              key={p.id}
              title={p.title}
              subtitle={p.merchant ?? p.category}
              trailing={
                <Text style={{ color: tokens.colors.textMuted }}>
                  {p.purchaseDate}
                </Text>
              }
              onPress={() =>
                router.push({
                  pathname: "/purchase/[id]",
                  params: { id: p.id },
                })
              }
            />
          ))}
          {list.hasNextPage ? (
            <Button
              label={list.isFetchingNextPage ? "Loading…" : "Load more"}
              variant="secondary"
              onPress={() => list.fetchNextPage()}
            />
          ) : null}
        </View>
      )}

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
