import { useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  AppIcon,
  AppText,
  Button,
  EmptyState,
  IconTile,
  ListItem,
  ScreenScroll,
  Skeleton,
  StatusPill,
} from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getMe } from "@/api/auth";
import { listPurchases } from "@/api/purchases";
import { getReminders } from "@/api/reminders";
import { useTheme } from "@/theme/ThemeProvider";
import type { PurchaseListResponse, Reminder } from "@acme/shared";
import {
  categoryIcon,
  deadlineState,
  deliveryDisplay,
  formatDate,
} from "@/lib/purchaseDisplay";

const REMINDER_KIND = {
  warranty_expiry: {
    title: "Warranty ending",
    icon: "shield-checkmark-outline",
    tone: "success",
    prefix: "Expires",
  },
  return_deadline: {
    title: "Return window",
    icon: "sync-outline",
    tone: "accent",
    prefix: "Return by",
  },
} as const;

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
  const emailName = me.data?.email?.split("@")[0];
  const name = emailName
    ? `${emailName.charAt(0).toUpperCase()}${emailName.slice(1)}`
    : null;
  const purchases: PurchaseListResponse["items"] = recent.data?.items ?? [];
  const attention = useMemo<Reminder[]>(
    () =>
      [...(reminders.data?.items ?? [])]
        .sort((a, b) => a.fireOn.localeCompare(b.fireOn))
        .slice(0, 3),
    [reminders.data]
  );
  const purchaseTitle = useMemo(
    () => new Map(purchases.map((purchase) => [purchase.id, purchase.title])),
    [purchases]
  );

  return (
    <ScreenScroll gap={tokens.spacing.xl}>
      <View style={{ gap: tokens.spacing.xs }}>
        <AppText role="largeTitle">
          {name ? `Good to see you, ${name}` : "Welcome back"}
        </AppText>
        <AppText role="body" tone="subtle">
          Keep the proof. Never miss the date.
        </AppText>
      </View>

      <View style={{ gap: tokens.spacing.sm }}>
        <Button
          label="Add purchase"
          onPress={() => router.push("/purchase/new")}
        />
        <View style={[styles.secondaryActions, { gap: tokens.spacing.sm }]}>
          <SecondaryAction
            icon="camera"
            label="Scan receipt"
            onPress={() =>
              router.push({
                pathname: "/purchase/new",
                params: { capture: "camera" },
              })
            }
          />
          <SecondaryAction
            icon="claims"
            label="View claims"
            onPress={() => router.push("/claims" as Href)}
          />
        </View>
      </View>

      <SectionHeading
        title="Needs attention"
        actionLabel={attention.length ? "All reminders" : undefined}
        onAction={() => router.push("/(tabs)/reminders")}
      />
      {reminders.isLoading ? (
        <View style={{ gap: tokens.spacing.sm }}>
          <Skeleton height={72} />
          <Skeleton height={72} />
        </View>
      ) : attention.length === 0 ? (
        <View
          style={[
            styles.quietState,
            {
              backgroundColor: tokens.colors.successSoft,
              borderRadius: tokens.radius.md,
            },
          ]}
        >
          <AppIcon name="check" size={24} color={tokens.colors.successText} />
          <View style={{ flex: 1 }}>
            <AppText role="headline">You’re all caught up</AppText>
            <AppText role="subheadline" tone="subtle">
              No return or warranty dates are close.
            </AppText>
          </View>
        </View>
      ) : (
        <View>
          {attention.map((reminder, index) => {
            const kind = REMINDER_KIND[reminder.kind];
            const state = deadlineState(reminder.fireOn, kind.prefix);
            return (
              <ListItem
                key={reminder.id}
                title={purchaseTitle.get(reminder.purchaseId) ?? kind.title}
                subtitle={kind.title}
                detail={
                  state ? `${state.label} · ${state.detail}` : reminder.fireOn
                }
                divider={index < attention.length - 1}
                leading={<IconTile icon={kind.icon} tone={kind.tone} />}
                trailing={
                  state?.urgent ? (
                    <StatusPill label="Soon" tone="warning" />
                  ) : undefined
                }
                onPress={() =>
                  router.push({
                    pathname: "/purchase/[id]",
                    params: { id: reminder.purchaseId },
                  })
                }
              />
            );
          })}
        </View>
      )}

      <SectionHeading
        title="Recent purchases"
        actionLabel={purchases.length ? "View all" : undefined}
        onAction={() => router.push("/(tabs)/purchases")}
      />
      {recent.isLoading ? (
        <View style={{ gap: tokens.spacing.sm }}>
          <Skeleton height={72} />
          <Skeleton height={72} />
          <Skeleton height={72} />
        </View>
      ) : purchases.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="Your purchases will live here"
          message="Add one with or without a receipt, then fill in protection details when you have them."
          action={{
            label: "Add a purchase",
            onPress: () => router.push("/purchase/new"),
          }}
        />
      ) : (
        <View>
          {purchases.map((purchase, index) => {
            const status = deliveryDisplay(purchase.deliveryStatus);
            const date = formatDate(purchase.purchaseDate);
            return (
              <ListItem
                key={purchase.id}
                title={purchase.title}
                subtitle={[purchase.merchant, date ? `Purchased ${date}` : null]
                  .filter(Boolean)
                  .join(" • ")}
                divider={index < purchases.length - 1}
                leading={
                  <IconTile
                    icon={categoryIcon(purchase.category)}
                    tone="neutral"
                  />
                }
                trailing={
                  <StatusPill label={status.label} tone={status.tone} />
                }
                onPress={() =>
                  router.push({
                    pathname: "/purchase/[id]",
                    params: { id: purchase.id },
                  })
                }
              />
            );
          })}
        </View>
      )}
    </ScreenScroll>
  );
}

function SectionHeading({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string | undefined;
  onAction: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <View style={styles.sectionHeading}>
      <AppText role="title">{title}</AppText>
      {actionLabel ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          style={({ pressed }) => ({
            minHeight: 48,
            justifyContent: "center",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <AppText role="subheadline" tone="accent" weight="700">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : (
        <View style={{ height: tokens.spacing.xs }} />
      )}
    </View>
  );
}

function SecondaryAction({
  icon,
  label,
  onPress,
}: {
  icon: "camera" | "claims";
  label: string;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.secondaryAction,
        {
          borderColor: tokens.colors.outline,
          borderRadius: tokens.radius.md,
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      <AppIcon name={icon} size={20} color={tokens.colors.primary} />
      <AppText role="subheadline" weight="700">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  secondaryActions: { flexDirection: "row" },
  secondaryAction: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quietState: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
