import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import {
  Card,
  EmptyState,
  ListItem,
  SkeletonGroup,
  StatusPill,
  Tabs,
} from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { dismissReminder, getReminders } from "@/api/reminders";
import { fromCaught } from "@/hooks/useApiError";
import { useTheme } from "@/theme/ThemeProvider";

type Scope = "upcoming" | "history";

const SCOPE_TABS = [
  { key: "upcoming" as const, label: "Upcoming" },
  { key: "history" as const, label: "History" },
];

export default function RemindersScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const { tokens } = useTheme();
  const [scope, setScope] = useState<Scope>("upcoming");
  const list = useQuery({
    queryKey: apiKeys.reminders(scope),
    queryFn: () => getReminders(api, scope),
  });
  const dismiss = useMutation({
    mutationFn: (id: string) => dismissReminder(api, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
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
          refreshing={list.isRefetching}
          onRefresh={() => list.refetch()}
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
        Reminders
      </Text>
      <Tabs
        tabs={SCOPE_TABS}
        activeKey={scope}
        onChange={(k) => setScope(k as Scope)}
      />
      {list.isLoading ? (
        <SkeletonGroup count={4} />
      ) : list.isError ? (
        <EmptyState
          title="Couldn't load reminders"
          message={fromCaught(list.error).message ?? "Try again."}
        />
      ) : (list.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title={
            scope === "upcoming" ? "Nothing coming up" : "No reminders yet"
          }
          message={
            scope === "upcoming"
              ? "Add a purchase to start tracking deadlines."
              : "Dismissed or sent reminders appear here."
          }
        />
      ) : (
        <Card>
          <View style={{ gap: tokens.spacing.sm }}>
            {list.data!.items.map((r) => (
              <ListItem
                key={r.id}
                title={
                  r.kind === "warranty_expiry"
                    ? "Warranty expiring"
                    : "Return deadline"
                }
                subtitle={`Fires on ${r.fireOn}${r.sentAt ? " · sent" : ""}${r.dismissedAt ? " · dismissed" : ""}`}
                trailing={
                  scope === "upcoming" && !r.dismissedAt && !r.sentAt ? (
                    <Text
                      onPress={() => dismiss.mutate(r.id)}
                      accessibilityRole="button"
                      style={{
                        color: tokens.colors.accent,
                        fontWeight: "700",
                      }}
                    >
                      Dismiss
                    </Text>
                  ) : (
                    <StatusPill label={r.kind} tone="neutral" />
                  )
                }
              />
            ))}
          </View>
        </Card>
      )}
    </ScrollView>
  );
}
