import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AppText,
  EmptyState,
  IconTile,
  ListItem,
  SkeletonGroup,
  StatusPill,
  Tabs,
  useAdaptiveLayout,
} from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { dismissReminder, getReminders } from "@/api/reminders";
import { listPurchases } from "@/api/purchases";
import { useTheme } from "@/theme/ThemeProvider";
import { deadlineState } from "@/lib/purchaseDisplay";
import { announce } from "@/lib/accessibility";
import type { PurchaseListResponse, Reminder } from "@acme/shared";

const SCOPES = [
  { value: "upcoming", label: "Upcoming" },
  { value: "history", label: "History" },
] as const;
type Scope = (typeof SCOPES)[number]["value"];

const KIND = {
  warranty_expiry: {
    label: "Warranty",
    icon: "shield-checkmark-outline",
    tone: "success",
    prefix: "Expires",
  },
  return_deadline: {
    label: "Return",
    icon: "sync-outline",
    tone: "accent",
    prefix: "Return by",
  },
} as const;

export default function RemindersScreen() {
  const api = useApi();
  const router = useRouter();
  const qc = useQueryClient();
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { contentWidth } = useAdaptiveLayout();
  const [scope, setScope] = useState<Scope>("upcoming");

  const list = useQuery({
    queryKey: apiKeys.reminders(scope),
    queryFn: () => getReminders(api, scope),
  });
  const purchases = useQuery({
    queryKey: apiKeys.purchases.list({ sort: "createdAt", limit: 50 }),
    queryFn: () => listPurchases(api, { sort: "createdAt", limit: 50 }),
  });
  const titleFor = useMemo(() => {
    const map = new Map<string, string>(
      ((purchases.data?.items ?? []) as PurchaseListResponse["items"]).map(
        (purchase) => [purchase.id, purchase.title] as const
      )
    );
    return (purchaseId: string) => map.get(purchaseId) ?? null;
  }, [purchases.data]);

  const dismiss = useMutation({
    mutationFn: (id: string) => dismissReminder(api, id),
    onSuccess: () => {
      announce("Reminder dismissed");
      void qc.invalidateQueries({ queryKey: ["reminders"] });
    },
  });

  const rawItems: Reminder[] = list.data?.items ?? [];
  const items = useMemo(() => {
    return [...rawItems].sort((a, b) => {
      if (scope === "upcoming") {
        return a.fireOn.localeCompare(b.fireOn);
      }
      return b.fireOn.localeCompare(a.fireOn);
    });
  }, [rawItems, scope]);

  return (
    <View style={{ flex: 1, backgroundColor: tokens.colors.canvas }}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          width: "100%",
          maxWidth: contentWidth,
          alignSelf: "center",
          paddingBottom: Math.max(insets.bottom + 88, 112),
        }}
        refreshControl={
          <RefreshControl
            refreshing={list.isRefetching}
            onRefresh={() => void list.refetch()}
            tintColor={tokens.colors.primary}
          />
        }
        stickyHeaderIndices={[0]}
        ListHeaderComponent={
          <View
            style={{
              backgroundColor: tokens.colors.canvas,
              paddingTop: Math.max(insets.top + tokens.spacing.md, 24),
              paddingHorizontal: tokens.spacing.xl - 4,
              paddingBottom: tokens.spacing.md,
              gap: tokens.spacing.lg + 2,
            }}
          >
            <View style={{ gap: 4 }}>
              <AppText role="largeTitle" weight="700">
                Reminders
              </AppText>
              <AppText role="subheadline" tone="subtle">
                Return and warranty deadlines in one place.
              </AppText>
            </View>
            <Tabs
              tabs={SCOPES.map((item) => ({
                key: item.value,
                label: item.label,
              }))}
              activeKey={scope}
              onChange={(key) => setScope(key as Scope)}
            />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            {list.isLoading ? (
              <SkeletonGroup count={5} gap={tokens.spacing.sm} />
            ) : list.isError ? (
              <EmptyState
                compact
                icon="alert-circle-outline"
                title="Couldn't load reminders"
                message="Check your connection and try again."
                action={{
                  label: "Try again",
                  onPress: () => void list.refetch(),
                }}
              />
            ) : (
              <EmptyState
                compact
                icon={scope === "upcoming" ? "alarm-outline" : "time-outline"}
                title={
                  scope === "upcoming"
                    ? "Nothing needs attention"
                    : "No reminder history"
                }
                message={
                  scope === "upcoming"
                    ? "Upcoming return and warranty deadlines will appear here."
                    : "Dismissed and completed reminders will appear here."
                }
                {...(scope === "upcoming"
                  ? {
                      action: {
                        label: "Add purchase",
                        onPress: () => router.push("/purchase/new"),
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
        renderItem={({ item }) => {
          const kind = KIND[item.kind];
          const state = deadlineState(item.fireOn, kind.prefix);
          const title = titleFor(item.purchaseId);
          const row = (
            <View
              accessible
              accessibilityActions={
                scope === "upcoming"
                  ? [{ name: "dismiss", label: "Dismiss reminder" }]
                  : undefined
              }
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === "dismiss") {
                  dismiss.mutate(item.id);
                }
              }}
            >
              <ListItem
                title={title ?? kind.label}
                subtitle={
                  state ? `${state.label} · ${state.detail}` : item.fireOn
                }
                divider={false}
                leading={
                  <IconTile
                    icon={kind.icon}
                    tone={state?.urgent ? "warning" : "neutral"}
                  />
                }
                trailing={
                  state?.urgent ? (
                    <StatusPill label={state.detail} tone="warning" />
                  ) : state?.expired ? (
                    <StatusPill label="Passed" tone="neutral" />
                  ) : (
                    <StatusPill
                      label={state?.detail ?? "Upcoming"}
                      tone="neutral"
                    />
                  )
                }
                chevron
                onPress={() =>
                  router.push({
                    pathname: "/purchase/[id]",
                    params: { id: item.purchaseId },
                  })
                }
              />
            </View>
          );

          if (scope !== "upcoming") return row;
          return (
            <Swipeable
              overshootRight={false}
              renderRightActions={() => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss reminder"
                  disabled={dismiss.isPending}
                  onPress={() => dismiss.mutate(item.id)}
                  style={({ pressed }) => [
                    styles.dismissAction,
                    {
                      backgroundColor: tokens.colors.dangerSurface,
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <AppText role="subheadline" tone="danger" weight="700">
                    Dismiss
                  </AppText>
                </Pressable>
              )}
            >
              {row}
            </Swipeable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 32,
  },
  dismissAction: {
    width: 96,
    alignItems: "center",
    justifyContent: "center",
  },
});
