import type { Claim } from "@acme/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  EmptyState,
  IconTile,
  ListItem,
  SkeletonGroup,
  StatusPill,
  useAdaptiveLayout,
} from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { listClaims } from "@/api/claims";
import { fromCaught } from "@/hooks/useApiError";
import { CLAIM_STATUS_LABEL, CLAIM_TYPE_LABEL, statusTone } from "@/lib/claims";
import { formatDate } from "@/lib/purchaseDisplay";
import { useTheme } from "@/theme/ThemeProvider";

export default function PurchaseClaimsScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { contentWidth } = useAdaptiveLayout();
  const { id } = useLocalSearchParams<{ id: string }>();
  const list = useQuery({
    queryKey: apiKeys.claims.list({ purchaseId: id ?? "" }),
    queryFn: () => listClaims(api, { purchaseId: id ?? "" }),
    enabled: Boolean(id),
  });
  useEffect(() => {
    void qc.invalidateQueries({ queryKey: ["claims"] });
  }, [qc]);
  const items: Claim[] = list.data?.items ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: tokens.colors.canvas }}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          width: "100%",
          maxWidth: contentWidth,
          alignSelf: "center",
          paddingBottom: Math.max(insets.bottom + 24, 32),
          flexGrow: items.length === 0 ? 1 : undefined,
        }}
        refreshControl={
          <RefreshControl
            refreshing={list.isRefetching}
            onRefresh={() => void list.refetch()}
            tintColor={tokens.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            {list.isLoading ? (
              <SkeletonGroup count={4} gap={tokens.spacing.sm} />
            ) : (
              <EmptyState
                icon={
                  list.isError
                    ? "alert-circle-outline"
                    : "shield-checkmark-outline"
                }
                title={list.isError ? "Couldn't load claims" : "No claims yet"}
                message={
                  list.isError
                    ? (fromCaught(list.error).message ?? "Try again.")
                    : "Open a return or warranty claim when something goes wrong with this purchase."
                }
                {...(list.isError
                  ? {
                      action: {
                        label: "Try again",
                        onPress: () => void list.refetch(),
                      },
                    }
                  : {})}
              />
            )}
          </View>
        }
        ItemSeparatorComponent={() => (
          <View
            style={{
              height: StyleSheet.hairlineWidth,
              marginLeft: 76,
              backgroundColor: tokens.colors.border,
            }}
          />
        )}
        renderItem={({ item }) => (
          <ListItem
            title={CLAIM_TYPE_LABEL[item.type] ?? item.type}
            subtitle={`Opened ${formatDate(item.openedAt.slice(0, 10)) ?? ""}`}
            divider={false}
            leading={<IconTile icon="shield-checkmark-outline" tone="accent" />}
            trailing={
              <StatusPill
                label={CLAIM_STATUS_LABEL[item.status] ?? item.status}
                tone={statusTone(item.status)}
              />
            }
            chevron
            onPress={() =>
              router.push({ pathname: "/claim/[id]", params: { id: item.id } })
            }
          />
        )}
        ListFooterComponent={
          <View style={{ padding: tokens.spacing.xl }}>
            <Button
              label="Open a claim"
              onPress={() =>
                router.push({
                  pathname: "/claim/new",
                  params: { purchaseId: id ?? "" },
                })
              }
            />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
});
