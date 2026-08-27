import { useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  AppIcon,
  AppText,
  Button,
  CategoryArtwork,
  EmptyState,
  IconTile,
  ListItem,
  Money,
  ScreenScroll,
  ScreenTitle,
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
  const { tokens, reducedMotion } = useTheme();
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

  const isRefreshing =
    (recent.isRefetching && !recent.isLoading) ||
    (reminders.isRefetching && !reminders.isLoading);

  const handleRefresh = () => {
    void Promise.all([recent.refetch(), reminders.refetch(), me.refetch()]);
  };

  return (
    <ScreenScroll gap={28} refreshing={isRefreshing} onRefresh={handleRefresh}>
      <ScreenTitle
        title={name ? `Welcome back, ${name}` : "Welcome back"}
        subtitle="Your returns and warranties, under control."
      />

      {/* Attention is intentionally first: this is the app's core promise. */}
      <View style={{ gap: tokens.spacing.md }}>
        <SectionHeading
          title="Needs attention"
          actionLabel={attention.length > 0 ? "See all" : undefined}
          onAction={() => router.push("/(tabs)/reminders")}
        />

        {reminders.isLoading ? (
          <Skeleton height={68} style={{ borderRadius: tokens.radius.lg }} />
        ) : attention.length > 0 ? (
          <View
            style={[
              styles.cardContainer,
              {
                backgroundColor: tokens.colors.surface,
                borderColor: tokens.colors.border,
                borderRadius: tokens.radius.lg,
              },
            ]}
          >
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
                  chevron
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
        ) : (
          <View
            style={[
              styles.quietState,
              {
                backgroundColor: tokens.colors.successSoft,
                borderColor: tokens.colors.border,
                borderRadius: tokens.radius.lg,
              },
            ]}
          >
            <AppIcon name="check" size={20} color={tokens.colors.successText} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText role="headline" weight="700">
                All caught up
              </AppText>
              <AppText role="subheadline" tone="subtle">
                No return or warranty deadlines are coming up.
              </AppText>
            </View>
          </View>
        )}
      </View>

      <View style={{ gap: tokens.spacing.sm }}>
        <Button
          label="Add purchase"
          size="lg"
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

      {/* 4. Recent Purchases Section */}
      <View style={{ gap: tokens.spacing.md }}>
        <SectionHeading
          title="Recent purchases"
          actionLabel={purchases.length > 0 ? "See all" : undefined}
          onAction={() => router.push("/(tabs)/purchases")}
        />

        {recent.isLoading ? (
          <View style={{ gap: tokens.spacing.sm }}>
            <Skeleton height={68} style={{ borderRadius: tokens.radius.lg }} />
            <Skeleton height={68} style={{ borderRadius: tokens.radius.lg }} />
          </View>
        ) : purchases.length > 0 ? (
          <View
            style={[
              styles.cardContainer,
              {
                backgroundColor: tokens.colors.surface,
                borderColor: tokens.colors.border,
                borderRadius: tokens.radius.lg,
              },
            ]}
          >
            {purchases.map((purchase, index) => {
              const status = deliveryDisplay(purchase.deliveryStatus);
              const date = formatDate(purchase.purchaseDate);
              return (
                <ListItem
                  key={purchase.id}
                  title={purchase.title}
                  subtitle={[
                    purchase.merchant,
                    date ? `Purchased ${date}` : null,
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                  divider={index < purchases.length - 1}
                  leading={
                    <CategoryArtwork category={purchase.category} size="sm" />
                  }
                  trailing={
                    <View style={styles.purchaseTrailing}>
                      <StatusPill label={status.label} tone={status.tone} />
                      {purchase.amountMinor != null &&
                      purchase.amountMinor > 0 ? (
                        <Money
                          amountMinor={purchase.amountMinor}
                          currency={purchase.currency}
                          emphasis="strong"
                          style={{ fontSize: tokens.type.caption.fontSize }}
                        />
                      ) : null}
                    </View>
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
        ) : (
          <View
            style={[
              styles.emptyCardWrap,
              {
                backgroundColor: tokens.colors.surface,
                borderColor: tokens.colors.border,
                borderRadius: tokens.radius.lg,
              },
            ]}
          >
            <EmptyState
              compact
              icon="receipt-outline"
              title="No purchases yet"
              message="Your recent purchases will appear here after you add them."
            />
          </View>
        )}
      </View>
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
  return (
    <View style={styles.sectionHeading}>
      <AppText role="title" weight="700">
        {title}
      </AppText>
      {actionLabel ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.sectionAction,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <AppText role="subheadline" tone="accent" weight="600">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
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
  const { tokens, reducedMotion } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.secondaryAction,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.lg,
          opacity: pressed ? 0.82 : 1,
          transform: [{ scale: pressed && !reducedMotion ? 0.98 : 1 }],
        },
      ]}
    >
      <AppIcon name={icon} size={17} color={tokens.colors.primary} />
      <AppText role="subheadline" weight="600">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  secondaryActions: {
    flexDirection: "row",
  },
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
    minHeight: 32,
  },
  sectionAction: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  quietState: {
    minHeight: 64,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardContainer: {
    borderWidth: 1,
    overflow: "hidden",
  },
  emptyCardWrap: {
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  purchaseTrailing: {
    alignItems: "flex-end",
    gap: 4,
  },
  errorCard: {
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    gap: 12,
  },
});
