import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { EmptyState, ListItem, SkeletonGroup } from "@/components";
import { useApi } from "@/api/ApiProvider";
import { listPurchases } from "@/api/purchases";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { fromCaught } from "@/hooks/useApiError";
import { useTheme } from "@/theme/ThemeProvider";

export default function SearchScreen() {
  const api = useApi();
  const { tokens } = useTheme();
  const [q, setQ] = useState("");
  const debounced = useDebouncedValue(q, 300);
  const result = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => listPurchases(api, { q: debounced, limit: 50 }),
    enabled: debounced.length >= 2,
  });
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.colors.bg }}
      contentContainerStyle={{
        padding: tokens.spacing.lg,
        gap: tokens.spacing.lg,
      }}
    >
      <Text
        style={{
          fontSize: tokens.type.display.fontSize,
          fontWeight: "700",
          color: tokens.colors.text,
        }}
      >
        Search
      </Text>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Search title or merchant"
        autoCapitalize="none"
        accessibilityLabel="Search"
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
      {debounced.length < 2 ? (
        <EmptyState title="Type at least 2 characters" />
      ) : result.isLoading ? (
        <SkeletonGroup count={4} />
      ) : result.isError ? (
        <EmptyState
          title="Search failed"
          message={fromCaught(result.error).message}
        />
      ) : (result.data?.items.length ?? 0) === 0 ? (
        <EmptyState title="No matches" />
      ) : (
        <View style={{ gap: tokens.spacing.sm }}>
          {result.data!.items.map((p) => (
            <ListItem
              key={p.id}
              title={p.title}
              subtitle={p.merchant ?? p.category}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
