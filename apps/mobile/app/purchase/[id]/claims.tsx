import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import {
  Button,
  Card,
  EmptyState,
  ListItem,
  SkeletonGroup,
  StatusPill,
} from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { listClaims } from "@/api/claims";
import { fromCaught } from "@/hooks/useApiError";
import { statusTone } from "@/lib/claims";
import { useTheme } from "@/theme/ThemeProvider";
import { useEffect } from "react";

export default function ClaimsScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const { tokens } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const list = useQuery({
    queryKey: apiKeys.claims.list({ purchaseId: id ?? "" }),
    queryFn: () => listClaims(api, { purchaseId: id ?? "" }),
    enabled: Boolean(id),
  });
  // Refresh when the screen mounts after a successful create.
  useEffect(() => {
    void qc.invalidateQueries({ queryKey: ["claims"] });
  }, [qc]);

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
        <Card>
          <View style={{ gap: tokens.spacing.sm }}>
            {list.isLoading ? (
              <SkeletonGroup count={3} />
            ) : list.isError ? (
              <EmptyState
                title="Couldn't load claims"
                message={fromCaught(list.error).message ?? "Try again."}
              />
            ) : (list.data?.items.length ?? 0) === 0 ? (
              <EmptyState
                title="No claims"
                message="Open a return or warranty claim for this purchase."
              />
            ) : (
              list.data!.items.map((c) => (
                <ListItem
                  key={c.id}
                  title={c.type}
                  subtitle={`Opened ${c.openedAt.slice(0, 10)}`}
                  trailing={
                    <StatusPill label={c.status} tone={statusTone(c.status)} />
                  }
                  onPress={() =>
                    router.push({
                      pathname: "/claim/[id]",
                      params: { id: c.id },
                    })
                  }
                />
              ))
            )}
          </View>
        </Card>
        <Button
          label="Open a claim"
          onPress={() =>
            router.push({
              pathname: "/claim/new",
              params: { purchaseId: id ?? "" },
            })
          }
        />
      </ScrollView>
    </>
  );
}
