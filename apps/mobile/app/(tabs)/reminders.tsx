import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { View } from "react-native";
import {
  Button,
  EmptyState,
  IconTile,
  ListItem,
  ScreenHeader,
  ScreenScroll,
  SectionCard,
  SkeletonGroup,
  StatusPill,
  Tabs,
} from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { dismissReminder, getReminders } from "@/api/reminders";
import { listPurchases } from "@/api/purchases";
import { useTheme } from "@/theme/ThemeProvider";
import { deadlineState } from "@/lib/purchaseDisplay";

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
  const [scope, setScope] = useState<Scope>("upcoming");

  const list = useQuery({
    queryKey: apiKeys.reminders(scope),
    queryFn: () => getReminders(api, scope),
  });

  // Reminders carry only a purchaseId. Resolve titles from one page of
  // purchases rather than inventing product names as the screen used to.
  const purchases = useQuery({
    queryKey: apiKeys.purchases.list({ sort: "createdAt", limit: 50 }),
    queryFn: () => listPurchases(api, { sort: "createdAt", limit: 50 }),
  });

  const titleFor = useMemo(() => {
    const map = new Map(
      (purchases.data?.items ?? []).map((p) => [p.id, p.title])
    );
    return (purchaseId: string) => map.get(purchaseId) ?? null;
  }, [purchases.data]);

  const dismiss = useMutation({
    mutationFn: (id: string) => dismissReminder(api, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["reminders"] });
    },
  });

  const items = list.data?.items ?? [];

  return (
    <ScreenScroll
      gap={tokens.spacing.lg + 2}
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
    >
      <ScreenHeader
        title="Reminders"
        showBack={false}
        action={{
          icon: "add",
          label: "Add order",
          onPress: () => router.push("/purchase/new"),
        }}
      />

      <Tabs
        tabs={SCOPES.map((s) => ({ key: s.value, label: s.label }))}
        activeKey={scope}
        onChange={(key) => setScope(key as Scope)}
      />

      {list.isLoading ? (
        <SkeletonGroup count={4} gap={tokens.spacing.md} />
      ) : items.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={scope === "upcoming" ? "alarm-outline" : "time-outline"}
            title={
              scope === "upcoming" ? "Nothing coming up" : "No past reminders"
            }
            message={
              scope === "upcoming"
                ? "Reminders appear here as return windows and warranties approach their end date."
                : "Reminders you have already received will be listed here."
            }
            {...(scope === "upcoming"
              ? {
                  action: {
                    label: "Add an order",
                    onPress: () => router.push("/purchase/new"),
                  },
                }
              : {})}
          />
        </SectionCard>
      ) : (
        <SectionCard flush>
          {items.map((r, idx) => {
            const kind = KIND[r.kind];
            const state = deadlineState(r.fireOn, kind.prefix);
            const title = titleFor(r.purchaseId);
            return (
              <ListItem
                key={r.id}
                title={title ?? kind.label}
                subtitle={title ? kind.label : null}
                detail={state ? `${state.label} · ${state.detail}` : r.fireOn}
                divider={idx < items.length - 1}
                leading={<IconTile icon={kind.icon} tone={kind.tone} />}
                trailing={
                  state?.urgent ? (
                    <StatusPill label="Soon" tone="warning" />
                  ) : state?.expired ? (
                    <StatusPill label="Passed" tone="neutral" />
                  ) : undefined
                }
                chevron
                onPress={() =>
                  router.push({
                    pathname: "/purchase/[id]",
                    params: { id: r.purchaseId },
                  })
                }
              />
            );
          })}
        </SectionCard>
      )}

      {scope === "upcoming" && items.length > 0 ? (
        <View>
          <Button
            label={
              dismiss.isPending ? "Dismissing…" : "Dismiss oldest reminder"
            }
            variant="secondary"
            disabled={dismiss.isPending}
            onPress={() => {
              const first = items[0];
              if (first) dismiss.mutate(first.id);
            }}
          />
        </View>
      ) : null}
    </ScreenScroll>
  );
}
