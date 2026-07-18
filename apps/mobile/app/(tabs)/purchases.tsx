import { useQuery } from "@tanstack/react-query";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { EmptyState, ListItem, SkeletonGroup } from "@/components";
import { useApi } from "@/api/ApiProvider";
import { listPurchases } from "@/api/purchases";
import { useTheme } from "@/theme/ThemeProvider";

export default function PurchasesScreen() {
  const api = useApi();
  const { tokens } = useTheme();
  const query = useQuery({
    queryKey: ["purchases", { cursor: undefined, sort: "createdAt" }],
    queryFn: () => listPurchases(api, { sort: "createdAt", limit: 20 }),
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.colors.bg }}
      contentContainerStyle={{
        padding: tokens.spacing.lg,
        gap: tokens.spacing.md,
      }}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={() => query.refetch()}
        />
      }
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

      {query.isLoading ? (
        <SkeletonGroup count={5} />
      ) : query.isError ? (
        <EmptyState
          title="Couldn't load purchases"
          message="Pull down to retry. Check your connection if this keeps happening."
        />
      ) : (query.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="No purchases yet"
          message="Add your first purchase to start tracking returns and warranties."
        />
      ) : (
        (query.data?.items ?? []).map((p) => (
          <ListItem
            key={p.id}
            title={p.title}
            subtitle={p.merchant ?? p.category}
            trailing={
              <Text style={{ color: tokens.colors.textMuted }}>
                {p.purchaseDate}
              </Text>
            }
          />
        ))
      )}

      {query.isFetching && !query.isLoading ? (
        <ActivityIndicator color={tokens.colors.accent} />
      ) : null}
    </ScrollView>
  );
}
