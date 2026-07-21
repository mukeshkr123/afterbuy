import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  EmptyState,
  IconTile,
  ListItem,
  ScreenScroll,
  SectionCard,
  Skeleton,
  StatusPill,
} from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getMe } from "@/api/auth";
import { listPurchases } from "@/api/purchases";
import { getReminders } from "@/api/reminders";
import { useTheme } from "@/theme/ThemeProvider";
import {
  categoryIcon,
  deliveryDisplay,
  formatDate,
} from "@/lib/purchaseDisplay";

const QUICK_ACTIONS = [
  {
    id: "scan",
    label: "Scan Bill",
    icon: "scan-outline",
    tone: "accent",
    href: "/purchase/new",
  },
  {
    id: "add",
    label: "Add Order",
    icon: "add-circle-outline",
    tone: "accent",
    href: "/purchase/new",
  },
  {
    id: "claims",
    label: "My Claims",
    icon: "shield-checkmark-outline",
    tone: "success",
    href: "/claim/new",
  },
  {
    id: "help",
    label: "Help",
    icon: "help-circle-outline",
    tone: "info",
    href: "/(tabs)/profile",
  },
] as const;

export default function HomeScreen() {
  const api = useApi();
  const router = useRouter();
  const { tokens } = useTheme();

  const me = useQuery({ queryKey: apiKeys.me(), queryFn: () => getMe(api) });
  const recent = useQuery({
    queryKey: apiKeys.purchases.list({ sort: "createdAt", limit: 5 }),
    queryFn: () => listPurchases(api, { sort: "createdAt", limit: 5 }),
  });
  const reminders = useQuery({
    queryKey: apiKeys.reminders("upcoming"),
    queryFn: () => getReminders(api, "upcoming"),
  });

  // The greeting is the account's own name when we have one. It previously
  // fell back to the literal "Rohan", which greeted every user by a stranger's
  // name.
  const emailName = me.data?.email?.split("@")[0];
  const greeting = emailName
    ? `Hello, ${emailName.charAt(0).toUpperCase()}${emailName.slice(1)}`
    : "Hello";

  const items = recent.data?.items ?? [];

  // Both counts come from the reminders endpoint, the only server-of-record for
  // deadlines. Anything else here would be guesswork over a paginated list.
  const upcoming = reminders.data?.items ?? [];
  const warrantyAlerts = upcoming.filter((r) => r.kind === "warranty_expiry");

  const countLabel = (n: number, one: string, many: string, none: string) =>
    reminders.isLoading
      ? null
      : n === 0
        ? none
        : n === 1
          ? one
          : `${n} ${many}`;

  return (
    <ScreenScroll>
      <View style={styles.headerRow}>
        <View style={styles.greetingBlock}>
          <Text
            style={[
              styles.greeting,
              {
                color: tokens.colors.text,
                fontSize: tokens.type.display.fontSize - 6,
              },
            ]}
          >
            {greeting}
          </Text>
          <Text
            style={{
              color: tokens.colors.textMuted,
              fontSize: tokens.type.bodySmall.fontSize + 1,
              marginTop: 2,
            }}
          >
            Here&apos;s your overview
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <HeaderIconButton
            icon="notifications-outline"
            label="Reminders"
            onPress={() => router.push("/(tabs)/reminders")}
          />
          <HeaderIconButton
            icon="add"
            label="Add order"
            onPress={() => router.push("/purchase/new")}
          />
        </View>
      </View>

      <View style={{ gap: tokens.spacing.md + 2 }}>
        <SummaryCard
          icon="alarm-outline"
          tone="accent"
          title="Upcoming Reminders"
          subtitle={countLabel(
            upcoming.length,
            "1 due soon",
            "due soon",
            "Nothing due"
          )}
          onPress={() => router.push("/(tabs)/reminders")}
        />
        <SummaryCard
          icon="shield-checkmark-outline"
          tone="success"
          title="Warranty Alerts"
          subtitle={countLabel(
            warrantyAlerts.length,
            "1 expiring soon",
            "expiring soon",
            "None expiring"
          )}
          onPress={() => router.push("/(tabs)/reminders")}
        />
      </View>

      <View style={{ gap: tokens.spacing.md + 2 }}>
        <View style={styles.sectionHeader}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: tokens.colors.text,
                fontSize: tokens.type.body.fontSize + 2,
              },
            ]}
          >
            Recent Orders
          </Text>
          {items.length > 0 ? (
            <Pressable
              onPress={() => router.push("/(tabs)/purchases")}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text
                style={{
                  color: tokens.colors.accent,
                  fontSize: tokens.type.bodySmall.fontSize,
                  fontWeight: "700",
                }}
              >
                View All
              </Text>
            </Pressable>
          ) : null}
        </View>

        {recent.isLoading ? (
          <View style={{ gap: tokens.spacing.md }}>
            <Skeleton height={72} />
            <Skeleton height={72} />
            <Skeleton height={72} />
          </View>
        ) : items.length === 0 ? (
          <SectionCard>
            <EmptyState
              icon="receipt-outline"
              title="No orders yet"
              message="Add your first purchase to start tracking returns and warranties."
              action={{
                label: "Add an order",
                onPress: () => router.push("/purchase/new"),
              }}
            />
          </SectionCard>
        ) : (
          <SectionCard flush>
            {items.map((item, idx) => {
              const status = deliveryDisplay(item.deliveryStatus);
              const date = formatDate(item.purchaseDate);
              return (
                <ListItem
                  key={item.id}
                  title={item.title}
                  subtitle={date ? `Ordered ${date}` : null}
                  divider={idx < items.length - 1}
                  leading={
                    <IconTile
                      icon={categoryIcon(item.category)}
                      tone="neutral"
                    />
                  }
                  trailing={
                    <StatusPill label={status.label} tone={status.tone} />
                  }
                  onPress={() =>
                    router.push({
                      pathname: "/purchase/[id]",
                      params: { id: item.id },
                    })
                  }
                />
              );
            })}
          </SectionCard>
        )}
      </View>

      <View style={{ gap: tokens.spacing.md + 2 }}>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: tokens.colors.text,
              fontSize: tokens.type.body.fontSize + 2,
            },
          ]}
        >
          Quick Actions
        </Text>

        <View style={[styles.actionsGrid, { gap: tokens.spacing.sm + 2 }]}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.id}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              onPress={() => router.push(action.href)}
              style={({ pressed }) => [
                styles.actionItem,
                {
                  backgroundColor: tokens.colors.surface,
                  borderRadius: tokens.radius.xl,
                  borderColor: tokens.colors.border,
                  paddingVertical: tokens.spacing.lg - 2,
                  gap: tokens.spacing.sm,
                  ...tokens.shadow.card,
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              <IconTile icon={action.icon} tone={action.tone} />
              <Text
                style={{
                  color: tokens.colors.text,
                  fontSize: tokens.type.bodySmall.fontSize - 2,
                  fontWeight: "600",
                  textAlign: "center",
                }}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScreenScroll>
  );
}

function HeaderIconButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconButton,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          ...tokens.shadow.raised,
        },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Ionicons name={icon} size={20} color={tokens.colors.text} />
    </Pressable>
  );
}

function SummaryCard({
  icon,
  tone,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone: "accent" | "success";
  title: string;
  subtitle: string | null;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <SectionCard onPress={onPress}>
      <View style={styles.summaryRow}>
        <View style={[styles.summaryLeft, { gap: tokens.spacing.md + 2 }]}>
          <IconTile icon={icon} tone={tone} />
          <View style={{ gap: 2, flex: 1 }}>
            <Text
              style={{
                color: tokens.colors.text,
                fontSize: tokens.type.body.fontSize,
                fontWeight: "700",
              }}
            >
              {title}
            </Text>
            {subtitle === null ? (
              <Skeleton width="50%" height={14} />
            ) : (
              <Text
                style={{
                  color: tokens.colors.textMuted,
                  fontSize: tokens.type.bodySmall.fontSize,
                }}
              >
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={tokens.colors.icon}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingBlock: { flex: 1 },
  greeting: {
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  actionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionItem: {
    flex: 1,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 6,
  },
});
