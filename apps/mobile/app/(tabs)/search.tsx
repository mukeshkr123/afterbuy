import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  EmptyState,
  IconTile,
  ListItem,
  Money,
  ScreenHeader,
  ScreenScroll,
  SectionCard,
  SkeletonGroup,
} from "@/components";
import { useApi } from "@/api/ApiProvider";
import { listPurchases } from "@/api/purchases";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { fromCaught } from "@/hooks/useApiError";
import { categoryIcon, formatDate } from "@/lib/purchaseDisplay";
import { useTheme } from "@/theme/ThemeProvider";

const MIN_QUERY_LENGTH = 2;

export default function SearchScreen() {
  const api = useApi();
  const router = useRouter();
  const { tokens } = useTheme();
  const [q, setQ] = useState("");
  const debounced = useDebouncedValue(q, 300);

  const result = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => listPurchases(api, { q: debounced, limit: 50 }),
    enabled: debounced.length >= MIN_QUERY_LENGTH,
  });

  const items = result.data?.items ?? [];

  return (
    <ScreenScroll gap={tokens.spacing.lg + 2}>
      <ScreenHeader title="Search" showBack={false} />

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
        <Ionicons name="search-outline" size={20} color={tokens.colors.icon} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search title or merchant"
          placeholderTextColor={tokens.colors.textMuted}
          accessibilityLabel="Search purchases"
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.searchInput,
            {
              color: tokens.colors.text,
              fontSize: tokens.type.body.fontSize - 1,
            },
          ]}
        />
      </View>

      {debounced.length < MIN_QUERY_LENGTH ? (
        <SectionCard>
          <EmptyState
            icon="search-outline"
            title="Search your purchases"
            message={`Type at least ${MIN_QUERY_LENGTH} characters to search by product name or merchant.`}
          />
        </SectionCard>
      ) : result.isLoading ? (
        <SkeletonGroup count={4} gap={tokens.spacing.md} />
      ) : result.isError ? (
        <SectionCard>
          <EmptyState
            icon="alert-circle-outline"
            title="Search failed"
            message={fromCaught(result.error).message ?? "Try again."}
            action={{
              label: "Try again",
              onPress: () => void result.refetch(),
            }}
          />
        </SectionCard>
      ) : items.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon="search-outline"
            title="No matches"
            message="Nothing matched that search. Try a different product or merchant."
          />
        </SectionCard>
      ) : (
        <SectionCard flush>
          {items.map((p, idx) => (
            <ListItem
              key={p.id}
              title={p.title}
              subtitle={
                [p.merchant, formatDate(p.purchaseDate)]
                  .filter(Boolean)
                  .join(" • ") || null
              }
              divider={idx < items.length - 1}
              leading={
                <IconTile icon={categoryIcon(p.category)} tone="neutral" />
              }
              trailing={
                <Money
                  amountMinor={p.amountMinor}
                  currency={p.currency}
                  emphasis="strong"
                  style={{ fontSize: tokens.type.bodySmall.fontSize }}
                />
              }
              onPress={() =>
                router.push({
                  pathname: "/purchase/[id]",
                  params: { id: p.id },
                })
              }
            />
          ))}
        </SectionCard>
      )}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    height: "100%",
  },
});
