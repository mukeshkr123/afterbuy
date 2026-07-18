import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView } from "react-native";
import { Card, EmptyState, ListItem } from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getPurchase } from "@/api/purchases";
import { useTheme } from "@/theme/ThemeProvider";

interface ClaimLike {
  id: string;
  kind: string;
  status: string;
}

export default function ClaimsScreen() {
  const api = useApi();
  const { tokens } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useQuery({
    queryKey: apiKeys.purchases.detail(id ?? ""),
    queryFn: () => getPurchase(api, id ?? ""),
    enabled: Boolean(id),
  });

  return (
    <>
      <Stack.Screen options={{ title: "Claims" }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: tokens.colors.bg }}
        contentContainerStyle={{
          padding: tokens.spacing.lg,
          gap: tokens.spacing.md,
        }}
      >
        <Card title="Claims">
          {(detail.data?.claims ?? []).length === 0 ? (
            <EmptyState
              title="No claims"
              message="Claims open/edit lands in Phase 7."
            />
          ) : (
            (detail.data?.claims as ClaimLike[] | undefined)?.map((c) => (
              <ListItem key={c.id} title={c.kind} subtitle={c.status} />
            ))
          )}
        </Card>
      </ScrollView>
    </>
  );
}
