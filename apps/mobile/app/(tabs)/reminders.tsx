import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  EmptyState,
  RemindersBellIllustration,
  SkeletonGroup,
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
  reminderUpcomingSection,
} from "@/lib/reminders";
import { daysBetween, todayIso } from "@/lib/date";
import type { PurchaseListResponse, Reminder } from "@acme/shared";

const SCOPES = [
  { value: "upcoming", label: "Upcoming" },
  { value: "history", label: "History" },
] as const;
type Scope = (typeof SCOPES)[number]["value"];

type ReminderSection = {
  title: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  items: Reminder[];
};

function formatReminderDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const parts = iso.split("-");
  const yearStr = parts[0];
  const monthStr = parts[1];
  const dayStr = parts[2];
  if (!yearStr || !monthStr || !dayStr) return null;
  const monthIdx = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${day < 10 ? `0${day}` : day} ${months[monthIdx] ?? ""} ${yearStr}`;
}

export default function RemindersScreen() {
  const api = useApi();
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { contentWidth } = useAdaptiveLayout();
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
      const dueSoonItems = items.filter(
        (item) => reminderUpcomingSection(item) === "Due Soon"
      );
      const laterItems = items.filter(
        (item) => reminderUpcomingSection(item) === "Later"
      );

      return [
        {
          title: "Due Soon",
          detail: "Returns and warranties that need attention first.",
          icon: "time-outline" as const,
          iconBg: "#FFF7ED",
          iconColor: "#D97706",
          items: dueSoonItems,
        },
        {
          title: "Later",
          detail: "Upcoming reminders with more runway.",
          icon: "shield-outline" as const,
          iconBg: "#ECFDF5",
          iconColor: "#059669",
          items: laterItems,
        },
      ].filter((section) => section.items.length > 0);
    }

    const past30Items = items.filter(
      (item) => reminderHistorySection(item) === "Past 30 Days"
    );
    const olderItems = items.filter(
      (item) => reminderHistorySection(item) === "Older"
    );

    return [
      {
        title: "Past 30 Days",
        detail: "Recently closed or expired reminders.",
        icon: "time-outline" as const,
        iconBg: "#FFF7ED",
        iconColor: "#D97706",
        items: past30Items,
      },
      {
        title: "Older",
        detail: "Earlier reminder activity kept for reference.",
        icon: "time-outline" as const,
        iconBg: "#F1F5F9",
        iconColor: "#64748B",
        items: olderItems,
      },
    ].filter((section) => section.items.length > 0);
  }, [items, scope]);

  const showFloatingAdd = scope === "upcoming";

  return (
    <View style={styles.screen}>
      {/* Ambient background glows */}
      <View style={styles.ambientGlowTopRight} pointerEvents="none" />
      <View style={styles.ambientGlowBottomLeft} pointerEvents="none" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          width: "100%",
          maxWidth: contentWidth,
          alignSelf: "center",
          paddingHorizontal: 16,
          paddingTop: Math.max(insets.top + 6, 16),
          paddingBottom: Math.max(insets.bottom + 96, 112),
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        refreshControl={
          <RefreshControl
            refreshing={list.isRefetching}
            onRefresh={() => void list.refetch()}
            tintColor="#5B4DF5"
          />
        }
      >
        {/* Header Row: Title & Subtitle + 3D Bell Graphic */}
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.screenTitle}>Reminders</Text>
            <Text style={styles.screenSubtitle}>
              Upcoming deadlines first, closed activity second.
            </Text>
          </View>
          <RemindersBellIllustration />
        </View>

        {/* Custom Segmented Control (Upcoming vs History) */}
        <View style={styles.segmentedContainer}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: scope === "upcoming" }}
            accessibilityLabel="Upcoming"
            onPress={() => setScope("upcoming")}
            style={[
              styles.segmentTab,
              scope === "upcoming" && styles.segmentUpcomingActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                scope === "upcoming"
                  ? styles.segmentTextUpcomingActive
                  : styles.segmentTextInactive,
              ]}
            >
              Upcoming
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: scope === "history" }}
            accessibilityLabel="History"
            onPress={() => setScope("history")}
            style={[
              styles.segmentTab,
              scope === "history" && styles.segmentHistoryActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                scope === "history"
                  ? styles.segmentTextHistoryActive
                  : styles.segmentTextInactive,
              ]}
            >
              History
            </Text>
          </Pressable>
        </View>

        {/* Content list */}
        {list.isLoading ? (
          <SkeletonGroup count={5} gap={12} />
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
            <View key={section.title} style={{ gap: 10 }}>
              {/* Section Header */}
              <View style={styles.sectionHeaderRow}>
                {scope === "upcoming" ? (
                  <View
                    style={[
                      styles.sectionIconCircle,
                      { backgroundColor: section.iconBg },
                    ]}
                  >
                    <Ionicons
                      name={section.icon}
                      size={18}
                      color={section.iconColor}
                    />
                  </View>
                ) : null}

                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text
                    style={
                      scope === "history"
                        ? styles.historySectionTitle
                        : styles.upcomingSectionTitle
                    }
                  >
                    {section.title}
                  </Text>
                  <Text style={styles.sectionSubtitle}>{section.detail}</Text>
                </View>
              </View>

              {/* Grouped White Card Container */}
              <View style={styles.cardContainer}>
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
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Floating Add Purchase Button (Upcoming view) */}
      {showFloatingAdd ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add purchase"
          onPress={() => router.push("/purchase/new")}
          style={({ pressed }) => [
            styles.floatingAdd,
            {
              bottom: Math.max(insets.bottom + 20, 28),
              opacity: pressed ? 0.92 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            },
          ]}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
          <Text style={styles.floatingAddText}>Add purchase</Text>
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
  const isWarranty = item.kind === "warranty_expiry";
  const kind = REMINDER_KIND[item.kind];
  const formattedDate = formatReminderDate(item.fireOn);
  const divider = index < total - 1;

  const daysLeft = daysBetween(todayIso(), item.fireOn);
  const isExpired = daysLeft <= 0;

  // Date line text matching design:
  let dateLine = "";
  if (scope === "upcoming") {
    if (isWarranty) {
      dateLine = `Expires ${formattedDate}`;
    } else {
      dateLine = `Return by ${formattedDate}`;
    }
  } else {
    dateLine = `Passed ${formattedDate}`;
  }

  // Trailing Badge label & color
  let badgeLabel = "";
  if (scope === "history") {
    const history = reminderHistoryPresentation(item);
    badgeLabel = history.label;
  } else if (isExpired) {
    badgeLabel = "Expired";
  } else if (daysLeft === 1) {
    badgeLabel = "1 day left";
  } else {
    badgeLabel = `${daysLeft} days left`;
  }

  const row = (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title ?? kind.title}, ${dateLine}`}
      style={({ pressed }) => [
        styles.rowItem,
        divider && styles.rowDivider,
        { opacity: pressed ? 0.88 : 1 },
      ]}
    >
      {/* Left Icon Square */}
      <View
        style={[
          styles.rowIconBox,
          { backgroundColor: isWarranty ? "#ECFDF5" : "#FFF7ED" },
        ]}
      >
        <Ionicons
          name={isWarranty ? "shield-outline" : "sync-outline"}
          size={22}
          color={isWarranty ? "#059669" : "#C2410C"}
        />
      </View>

      {/* Center Copy */}
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {kind.title}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {scope === "upcoming" ? kind.title : `${kind.title} reminder`}
        </Text>
        <Text style={styles.rowDateLine} numberOfLines={1}>
          {dateLine}
        </Text>
      </View>

      {/* Trailing Badge + Chevron */}
      <View style={styles.rowTrailing}>
        <View
          style={[
            styles.badgePill,
            {
              backgroundColor: isExpired ? "#FEF3C7" : "#F1F5F9",
            },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              {
                color: isExpired ? "#B45309" : "#475569",
                fontWeight: isExpired ? "700" : "600",
              },
            ]}
          >
            {badgeLabel}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
      </View>
    </Pressable>
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
            { opacity: pressed ? 0.82 : 1 },
          ]}
        >
          <Text style={styles.dismissActionText}>Dismiss</Text>
        </Pressable>
      )}
    >
      {row}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    position: "relative",
  },
  ambientGlowTopRight: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 260,
    height: 200,
    borderRadius: 130,
    backgroundColor: "#EDE9FE",
    opacity: 0.6,
  },
  ambientGlowBottomLeft: {
    position: "absolute",
    bottom: 40,
    left: -60,
    width: 260,
    height: 200,
    borderRadius: 130,
    backgroundColor: "#E0E7FE",
    opacity: 0.45,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 15,
    fontWeight: "400",
    color: "#64748B",
    lineHeight: 21,
  },
  segmentedContainer: {
    flexDirection: "row",
    height: 48,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    padding: 4,
    alignItems: "center",
  },
  segmentTab: {
    flex: 1,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  segmentUpcomingActive: {
    backgroundColor: "#5B4DF5",
    shadowColor: "#5B4DF5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentHistoryActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 15,
  },
  segmentTextUpcomingActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  segmentTextHistoryActive: {
    color: "#5B4DF5",
    fontWeight: "700",
  },
  segmentTextInactive: {
    color: "#64748B",
    fontWeight: "600",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  sectionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  upcomingSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  historySectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#64748B",
  },
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  rowIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  rowSubtitle: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "400",
  },
  rowDateLine: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "400",
  },
  rowTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 12,
  },
  dismissAction: {
    width: 100,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  dismissActionText: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 14,
  },
  floatingAdd: {
    position: "absolute",
    right: 20,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: "#5B4DF5",
    shadowColor: "#5B4DF5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  floatingAddText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
