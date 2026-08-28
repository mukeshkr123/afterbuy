import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AppIcon,
  AppText,
  EmptyState,
  IconTile,
  ListItem,
  ScreenTitle,
  SectionCard,
  SectionHeading,
  SkeletonGroup,
  StatusPill,
  SegmentedControl,
  useAdaptiveLayout,
} from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { dismissReminder, getReminders } from "@/api/reminders";
import { listPurchases } from "@/api/purchases";
import { announce } from "@/lib/accessibility";
import {
  REMINDER_KIND,
  reminderDetailHref,
  reminderHistoryPresentation,
  reminderHistorySection,
  reminderState,
  reminderUpcomingSection,
} from "@/lib/reminders";
import { useTheme } from "@/theme/ThemeProvider";
import type { PurchaseListResponse, Reminder } from "@acme/shared";

const SCOPES = [
  { value: "upcoming", label: "Upcoming" },
  { value: "history", label: "History" },
] as const;
type Scope = (typeof SCOPES)[number]["value"];

type ReminderSection = {
  title: string;
  detail: string;
  items: Reminder[];
};

export default function RemindersScreen() {
  const api = useApi();
  const router = useRouter();
  const qc = useQueryClient();
  const { tokens, reducedMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, contentWidth } = useAdaptiveLayout();
  const [scope, setScope] = useState<Scope>("upcoming");

  const list = useQuery({
    queryKey: apiKeys.reminders(scope),
    queryFn: () => getReminders(api, scope),
  });
  const purchases = useQuery({
    queryKey: apiKeys.purchases.list({ sort: "createdAt", limit: 100 }),
    queryFn: () => listPurchases(api, { sort: "createdAt", limit: 100 }),
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

  const items: Reminder[] = useMemo(() => {
    const rawItems = list.data?.items ?? [];
    return [...rawItems].sort((a, b) =>
      scope === "upcoming"
        ? a.fireOn.localeCompare(b.fireOn)
        : b.fireOn.localeCompare(a.fireOn)
    );
  }, [list.data, scope]);

  const sections = useMemo<ReminderSection[]>(() => {
    if (scope === "upcoming") {
      const groups = {
        "Due Soon": items.filter(
          (item) => reminderUpcomingSection(item) === "Due Soon"
        ),
        Later: items.filter(
          (item) => reminderUpcomingSection(item) === "Later"
        ),
      };
      return [
        {
          title: "Due Soon",
          detail: "Returns and warranties that need attention first.",
          items: groups["Due Soon"],
        },
        {
          title: "Later",
          detail: "Upcoming reminders with more runway.",
          items: groups.Later,
        },
      ].filter((section) => section.items.length > 0);
    }

    const groups = {
      "Past 30 Days": items.filter(
        (item) => reminderHistorySection(item) === "Past 30 Days"
      ),
      Older: items.filter((item) => reminderHistorySection(item) === "Older"),
    };
    return [
      {
        title: "Past 30 Days",
        detail: "Recently closed or expired reminders.",
        items: groups["Past 30 Days"],
      },
      {
        title: "Older",
        detail: "Earlier reminder activity kept for reference.",
        items: groups.Older,
      },
    ].filter((section) => section.items.length > 0);
  }, [items, scope]);

  const showFloatingAdd = scope === "upcoming" && sections.length > 0;
  const floatingRight = Math.max((width - contentWidth) / 2 + 20, 20);

  return (
    <View style={{ flex: 1, backgroundColor: tokens.colors.canvas }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          width: "100%",
          maxWidth: contentWidth,
          alignSelf: "center",
          paddingHorizontal: tokens.spacing.xl - 4,
          paddingTop: Math.max(insets.top + tokens.spacing.md, 24),
          paddingBottom: Math.max(insets.bottom + 112, 132),
          gap: tokens.spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        refreshControl={
          <RefreshControl
            refreshing={list.isRefetching}
            onRefresh={() => void list.refetch()}
            tintColor={tokens.colors.primary}
          />
        }
      >
        <View style={{ gap: tokens.spacing.lg + 2 }}>
          <ScreenTitle
            title="Reminders"
            subtitle="Upcoming deadlines first, closed activity second."
          />
          <SegmentedControl
            tabs={SCOPES.map((item) => ({
              key: item.value,
              label: item.label,
            }))}
            activeKey={scope}
            onChange={(key) => setScope(key as Scope)}
          />
        </View>

        {list.isLoading ? (
          <SkeletonGroup count={5} gap={tokens.spacing.sm} />
        ) : list.isError ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Couldn't load reminders"
            message="Check your connection and try again."
            action={{
              label: "Try again",
              onPress: () => void list.refetch(),
            }}
          />
        ) : sections.length === 0 ? (
          <EmptyState
            icon={scope === "upcoming" ? "alarm-outline" : "time-outline"}
            title={
              scope === "upcoming"
                ? "Nothing needs attention"
                : "No reminder history"
            }
            message={
              scope === "upcoming"
                ? "Add a purchase to start tracking return and warranty deadlines."
                : "Closed and expired reminders will collect here after they run their course."
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
        ) : (
          sections.map((section) => (
            <View key={section.title} style={{ gap: tokens.spacing.md }}>
              <SectionHeading title={section.title} detail={section.detail} />
              <SectionCard flush>
                {section.items.map((item, index) => (
                  <ReminderRow
                    key={item.id}
                    item={item}
                    index={index}
                    total={section.items.length}
                    scope={scope}
                    title={titleFor(item.purchaseId)}
                    onPress={() => router.push(reminderDetailHref(item))}
                    onDismiss={() => dismiss.mutate(item.id)}
                    dismissPending={dismiss.isPending}
                  />
                ))}
              </SectionCard>
            </View>
          ))
        )}
      </ScrollView>

      {showFloatingAdd ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add purchase"
          onPress={() => router.push("/purchase/new")}
          style={({ pressed }) => [
            styles.floatingAdd,
            {
              right: floatingRight,
              bottom: Math.max(insets.bottom + 20, 28),
              backgroundColor: tokens.colors.primary,
              borderRadius: tokens.radius.pill,
              shadowColor: tokens.shadow.raised.shadowColor,
              shadowOffset: tokens.shadow.raised.shadowOffset,
              shadowOpacity: tokens.shadow.raised.shadowOpacity,
              shadowRadius: tokens.shadow.raised.shadowRadius,
              elevation: tokens.shadow.raised.elevation,
              opacity: pressed ? 0.92 : 1,
              transform: [{ scale: pressed && !reducedMotion ? 0.98 : 1 }],
            },
          ]}
        >
          <AppIcon name="add" size={18} color={tokens.colors.onPrimary} />
          <AppText
            role="subheadline"
            weight="700"
            style={{ color: tokens.colors.onPrimary }}
          >
            Add purchase
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

function ReminderRow({
  item,
  index,
  total,
  scope,
  title,
  onPress,
  onDismiss,
  dismissPending,
}: {
  item: Reminder;
  index: number;
  total: number;
  scope: Scope;
  title: string | null;
  onPress: () => void;
  onDismiss: () => void;
  dismissPending: boolean;
}) {
  const { tokens } = useTheme();
  const kind = REMINDER_KIND[item.kind];
  const state = reminderState(item);
  const history = reminderHistoryPresentation(item);
  const divider = index < total - 1;

  const row = (
    <View
      key={item.id}
      accessible
      accessibilityActions={
        scope === "upcoming"
          ? [{ name: "dismiss", label: "Dismiss reminder" }]
          : undefined
      }
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "dismiss") onDismiss();
      }}
    >
      <ListItem
        title={title ?? kind.title}
        subtitle={scope === "upcoming" ? kind.title : `${kind.title} reminder`}
        detail={
          scope === "upcoming" ? (state?.label ?? item.fireOn) : history.detail
        }
        divider={divider}
        leading={
          <IconTile
            icon={kind.icon}
            tone={
              scope === "upcoming"
                ? state?.urgent || state?.expired
                  ? "warning"
                  : kind.tone
                : history.tone === "warning"
                  ? "warning"
                  : "neutral"
            }
          />
        }
        trailing={
          <StatusPill
            label={
              scope === "upcoming"
                ? (state?.detail ?? "Upcoming")
                : history.label
            }
            tone={
              scope === "upcoming"
                ? state?.urgent || state?.expired
                  ? "warning"
                  : "neutral"
                : history.tone
            }
          />
        }
        chevron
        onPress={onPress}
      />
    </View>
  );

  if (scope !== "upcoming") return row;
  return (
    <Swipeable
      key={item.id}
      overshootRight={false}
      renderRightActions={() => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss reminder"
          disabled={dismissPending}
          onPress={onDismiss}
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
}

const styles = StyleSheet.create({
  dismissAction: {
    width: 112,
    alignItems: "center",
    justifyContent: "center",
  },
  floatingAdd: {
    position: "absolute",
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
  },
});
