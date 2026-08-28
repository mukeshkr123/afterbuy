import { useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import React, { useMemo } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import type { Claim, PurchaseListResponse, Reminder } from "@acme/shared";
import {
  AppText,
  Button,
  Money,
  ScreenScroll,
  ScreenTitle,
  SectionCard,
  SectionHeading,
  Skeleton,
  StatusPill,
  useAdaptiveLayout,
} from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getMe } from "@/api/auth";
import { listClaims } from "@/api/claims";
import { listPurchases } from "@/api/purchases";
import { getReminders } from "@/api/reminders";
import { useOnline } from "@/offline";
import { CLAIM_STATUS_LABEL, CLAIM_TYPE_LABEL, statusTone } from "@/lib/claims";
import {
  deadlineState,
  deliveryDisplay,
  formatDate,
} from "@/lib/purchaseDisplay";
import { REMINDER_KIND, reminderDetailHref } from "@/lib/reminders";
import { useTheme } from "@/theme/ThemeProvider";

type FeaturedState =
  | {
      kind: "return" | "warranty";
      title: string;
      body: string;
      detail: string;
      statusLabel: string;
      statusTone: React.ComponentProps<typeof StatusPill>["tone"];
      actionLabel: string;
      onPress: () => void;
    }
  | {
      kind: "claims";
      title: string;
      body: string;
      detail: string;
      statusLabel: string;
      statusTone: React.ComponentProps<typeof StatusPill>["tone"];
      actionLabel: string;
      onPress: () => void;
    }
  | {
      kind: "clear";
      title: string;
      body: string;
      detail: string;
      actionLabel: string;
      onPress: () => void;
    };

function titleCaseName(email: string | null | undefined) {
  const raw = email
    ?.split("@")[0]
    ?.replace(/[._-]+/g, " ")
    .trim();
  if (!raw) return null;
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isActiveClaim(claim: Claim) {
  return (
    claim.status === "draft" ||
    claim.status === "submitted" ||
    claim.status === "in_progress"
  );
}

function reminderUrgency(reminder: Reminder) {
  return deadlineState(reminder.fireOn, REMINDER_KIND[reminder.kind].prefix);
}

function sectionFailureMessage(online: boolean, label: string) {
  if (!online) {
    return `AfterBuy keeps working from its saved copy. Reconnect to refresh ${label}.`;
  }
  return `We couldn't load ${label}. Check your connection and try again.`;
}

export default function HomeScreen() {
  const api = useApi();
  const online = useOnline();
  const router = useRouter();
  const { tokens } = useTheme();
  const { expanded } = useAdaptiveLayout();
  const recentPreviewCount = expanded ? 4 : 3;

  const me = useQuery({ queryKey: apiKeys.me(), queryFn: () => getMe(api) });
  const recent = useQuery({
    queryKey: apiKeys.purchases.list({ sort: "createdAt", limit: 4 }),
    queryFn: () => listPurchases(api, { sort: "createdAt", limit: 4 }),
  });
  const reminders = useQuery({
    queryKey: apiKeys.reminders("upcoming"),
    queryFn: () => getReminders(api, "upcoming"),
  });
  const claims = useQuery({
    queryKey: apiKeys.claims.list({}),
    queryFn: () => listClaims(api),
  });

  const purchases: PurchaseListResponse["items"] = recent.data?.items ?? [];
  const reminderItems = reminders.data?.items ?? [];
  const claimItems = claims.data?.items ?? [];

  const purchaseTitles = useMemo(
    () => new Map(purchases.map((purchase) => [purchase.id, purchase.title])),
    [purchases]
  );
  const recentPreview = purchases.slice(0, recentPreviewCount);
  const welcomeName = titleCaseName(me.data?.email);

  const urgentReturn = useMemo(
    () =>
      [...reminderItems]
        .filter((item) => item.kind === "return_deadline")
        .sort((a, b) => a.fireOn.localeCompare(b.fireOn))
        .find((item) => {
          const state = reminderUrgency(item);
          return Boolean(state?.urgent || state?.expired);
        }) ?? null,
    [reminderItems]
  );
  const urgentWarranty = useMemo(
    () =>
      [...reminderItems]
        .filter((item) => item.kind === "warranty_expiry")
        .sort((a, b) => a.fireOn.localeCompare(b.fireOn))
        .find((item) => {
          const state = reminderUrgency(item);
          return Boolean(state?.urgent || state?.expired);
        }) ?? null,
    [reminderItems]
  );
  const activeClaims = useMemo(
    () => claimItems.filter((item) => isActiveClaim(item)),
    [claimItems]
  );

  const featured = useMemo<FeaturedState>(() => {
    if (urgentReturn) {
      const state = reminderUrgency(urgentReturn);
      return {
        kind: "return",
        title: "Return window needs attention",
        body:
          purchaseTitles.get(urgentReturn.purchaseId) ??
          REMINDER_KIND[urgentReturn.kind].title,
        detail: state ? `${state.label} · ${state.detail}` : "Open reminder",
        statusLabel: state?.expired ? "Expired" : "Soon",
        statusTone: state?.expired ? "danger" : "warning",
        actionLabel: "View reminder",
        onPress: () => router.push(reminderDetailHref(urgentReturn)),
      };
    }

    if (urgentWarranty) {
      const state = reminderUrgency(urgentWarranty);
      return {
        kind: "warranty",
        title: "Warranty coverage is nearly up",
        body:
          purchaseTitles.get(urgentWarranty.purchaseId) ??
          REMINDER_KIND[urgentWarranty.kind].title,
        detail: state ? `${state.label} · ${state.detail}` : "Open reminder",
        statusLabel: state?.expired ? "Expired" : "Soon",
        statusTone: state?.expired ? "danger" : "warning",
        actionLabel: "View reminder",
        onPress: () => router.push(reminderDetailHref(urgentWarranty)),
      };
    }

    if (activeClaims.length > 0) {
      const firstClaim = activeClaims[0]!;
      return {
        kind: "claims",
        title: "Claims still need follow-through",
        body:
          activeClaims.length === 1
            ? (purchaseTitles.get(firstClaim.purchaseId) ??
              CLAIM_TYPE_LABEL[firstClaim.type])
            : `${activeClaims.length} active claims need attention`,
        detail:
          activeClaims.length === 1
            ? `${CLAIM_TYPE_LABEL[firstClaim.type]} · ${CLAIM_STATUS_LABEL[firstClaim.status]}`
            : "Open claims to review the latest status updates.",
        statusLabel:
          activeClaims.length === 1
            ? CLAIM_STATUS_LABEL[firstClaim.status]
            : `${activeClaims.length} active`,
        statusTone:
          activeClaims.length === 1 ? statusTone(firstClaim.status) : "warning",
        actionLabel: "View claims",
        onPress: () => router.push("/claims" as Href),
      };
    }

    return {
      kind: "clear",
      title: "All caught up",
      body: "No urgent returns, warranties, or claims need attention today.",
      detail: "Your newest purchases stay below for quick reference.",
      actionLabel: "Review reminders",
      onPress: () => router.push("/(tabs)/reminders"),
    };
  }, [activeClaims, purchaseTitles, router, urgentReturn, urgentWarranty]);

  const isRefreshing =
    (me.isRefetching && !me.isLoading) ||
    (recent.isRefetching && !recent.isLoading) ||
    (reminders.isRefetching && !reminders.isLoading) ||
    (claims.isRefetching && !claims.isLoading);

  const showLoadingScaffold =
    (recent.isLoading || reminders.isLoading || claims.isLoading) &&
    purchases.length === 0 &&
    reminderItems.length === 0 &&
    claimItems.length === 0;

  const homeEmpty =
    !showLoadingScaffold &&
    recent.isSuccess &&
    purchases.length === 0 &&
    !recent.isError;

  const featuredFailed =
    !showLoadingScaffold &&
    ((reminders.isError && reminderItems.length === 0) ||
      (claims.isError && claimItems.length === 0));
  const recentFailed =
    !showLoadingScaffold && recent.isError && purchases.length === 0;

  return (
    <ScreenScroll
      gap={tokens.spacing.xl}
      refreshing={isRefreshing}
      onRefresh={() => {
        void Promise.all([
          me.refetch(),
          recent.refetch(),
          reminders.refetch(),
          claims.refetch(),
        ]);
      }}
    >
      <ScreenTitle
        title={welcomeName ? `Welcome back, ${welcomeName}` : "AfterBuy"}
        {...(homeEmpty
          ? {
              subtitle:
                "Keep purchases, receipts, and deadlines in one place." as const,
            }
          : {})}
      />

      {!online ? (
        <InlineNotice
          title="Offline"
          message="Using your saved copy until you reconnect."
        />
      ) : null}

      {homeEmpty ? (
        <EmptyHome onPress={(href) => router.push(href)} />
      ) : (
        <>
          <View style={{ gap: tokens.spacing.sm }}>
            {showLoadingScaffold ? (
              <>
                <Skeleton
                  height={148}
                  style={{ borderRadius: tokens.radius.xl }}
                />
                <Skeleton
                  height={54}
                  style={{ borderRadius: tokens.radius.lg }}
                />
              </>
            ) : featuredFailed ? (
              <InlineRetryCard
                title={
                  !online
                    ? "You're offline"
                    : "Couldn't load what needs attention"
                }
                message={sectionFailureMessage(
                  online,
                  "your reminders and claims"
                )}
                onPress={() => {
                  void reminders.refetch();
                  void claims.refetch();
                }}
              />
            ) : (
              <>
                <FeaturedCard card={featured} />
                <Button
                  label="Add purchase"
                  size="lg"
                  variant={featured.kind === "clear" ? "primary" : "secondary"}
                  onPress={() => router.push("/purchase/new")}
                />
              </>
            )}
          </View>

          <View style={{ gap: tokens.spacing.md }}>
            <SectionHeading
              title="Recent purchases"
              detail="Your latest saved items and their current status."
              action={
                purchases.length > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push("/(tabs)/purchases")}
                    style={({ pressed }) => [
                      styles.seeAllAction,
                      { opacity: pressed ? 0.72 : 1 },
                    ]}
                  >
                    <AppText role="label" tone="accent" weight="700">
                      See all
                    </AppText>
                  </Pressable>
                ) : undefined
              }
            />
            {showLoadingScaffold ? (
              <View style={{ gap: tokens.spacing.sm }}>
                <Skeleton
                  height={72}
                  style={{ borderRadius: tokens.radius.lg }}
                />
                <Skeleton
                  height={72}
                  style={{ borderRadius: tokens.radius.lg }}
                />
                <Skeleton
                  height={72}
                  style={{ borderRadius: tokens.radius.lg }}
                />
              </View>
            ) : recentFailed ? (
              <InlineRetryCard
                title={
                  !online ? "You're offline" : "Couldn't load recent purchases"
                }
                message={sectionFailureMessage(online, "your recent purchases")}
                onPress={() => void recent.refetch()}
              />
            ) : purchases.length === 0 ? (
              <SectionCard>
                <AppText role="body" tone="subtle">
                  Add your first purchase to keep receipts, reminders, and
                  claims in one place.
                </AppText>
              </SectionCard>
            ) : (
              <SectionCard flush>
                {recentPreview.map((purchase, index) => {
                  const status = deliveryDisplay(purchase.deliveryStatus);
                  const date = formatDate(purchase.purchaseDate);
                  return (
                    <CompactPurchaseRow
                      key={purchase.id}
                      purchase={purchase}
                      statusLabel={status.label}
                      date={date}
                      divider={index < recentPreview.length - 1}
                      onPress={() =>
                        router.push({
                          pathname: "/purchase/[id]",
                          params: { id: purchase.id },
                        })
                      }
                    />
                  );
                })}
              </SectionCard>
            )}
          </View>
        </>
      )}
    </ScreenScroll>
  );
}

function FeaturedCard({ card }: { card: FeaturedState }) {
  const { tokens } = useTheme();
  const calmSurface =
    card.kind === "clear" ? tokens.colors.successSoft : tokens.colors.surface;
  const accentTone =
    card.kind === "clear" ? tokens.colors.successText : tokens.colors.primary;

  return (
    <SectionCard style={{ backgroundColor: calmSurface }}>
      <View style={{ gap: tokens.spacing.md }}>
        <View style={styles.featuredHeader}>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText role="caption" weight="700" style={{ color: accentTone }}>
              {card.title}
            </AppText>
            <AppText role="title" weight="700">
              {card.body}
            </AppText>
            <AppText role="body" tone="subtle">
              {card.detail}
            </AppText>
          </View>
          {"statusLabel" in card ? (
            <StatusPill
              label={card.statusLabel}
              tone={card.statusTone ?? "neutral"}
            />
          ) : null}
        </View>
        <Button
          label={card.actionLabel}
          variant={card.kind === "clear" ? "secondary" : "primary"}
          onPress={card.onPress}
        />
      </View>
    </SectionCard>
  );
}

function EmptyHome({ onPress }: { onPress: (href: Href) => void }) {
  const { tokens } = useTheme();

  return (
    <SectionCard style={{ paddingVertical: tokens.spacing.xl }}>
      <View style={{ gap: tokens.spacing.lg }}>
        <View style={{ gap: tokens.spacing.sm }}>
          <AppText role="title">Start with your first purchase</AppText>
          <AppText role="body" tone="subtle">
            Add one purchase to keep the receipt close and track the deadlines
            that matter.
          </AppText>
        </View>
        <Button
          label="Add purchase"
          size="lg"
          onPress={() => onPress("/purchase/new")}
        />
      </View>
    </SectionCard>
  );
}

function InlineNotice({ title, message }: { title: string; message: string }) {
  const { tokens } = useTheme();

  return (
    <SectionCard tone="muted" surface="grouped">
      <View style={styles.noticeRow}>
        <AppText role="label" weight="700">
          {title}
        </AppText>
        <AppText role="subheadline" tone="subtle" style={{ flex: 1 }}>
          {message}
        </AppText>
      </View>
    </SectionCard>
  );
}

function InlineRetryCard({
  title,
  message,
  onPress,
}: {
  title: string;
  message: string;
  onPress: () => void;
}) {
  const { tokens } = useTheme();

  return (
    <SectionCard>
      <View style={{ gap: tokens.spacing.sm }}>
        <View style={{ gap: 4 }}>
          <AppText role="headline">{title}</AppText>
          <AppText role="body" tone="subtle">
            {message}
          </AppText>
        </View>
        <Button label="Try again" variant="secondary" onPress={onPress} />
      </View>
    </SectionCard>
  );
}

function CompactPurchaseRow({
  purchase,
  statusLabel,
  date,
  divider,
  onPress,
}: {
  purchase: PurchaseListResponse["items"][number];
  statusLabel: string;
  date: string | null;
  divider: boolean;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  const subtitle = [purchase.merchant, date].filter(Boolean).join(" • ");

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.purchaseRow,
        {
          minHeight: Platform.select({
            ios: tokens.target.ios,
            android: tokens.target.android,
            default: tokens.target.web,
          }),
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm + 2,
          borderBottomWidth: divider ? StyleSheet.hairlineWidth : 0,
          borderBottomColor: tokens.colors.border,
          opacity: pressed ? 0.84 : 1,
        },
      ]}
    >
      <View style={styles.purchaseCopy}>
        <AppText role="headline" weight="600" style={{ flexShrink: 1 }}>
          {purchase.title}
        </AppText>
        <AppText role="caption" tone="subtle">
          {subtitle}
        </AppText>
      </View>
      <View style={styles.purchaseTrailing}>
        <AppText role="caption" tone="subtle" weight="700">
          {statusLabel}
        </AppText>
        {purchase.amountMinor != null ? (
          <Money
            amountMinor={purchase.amountMinor}
            currency={purchase.currency}
            emphasis="strong"
            style={{ fontSize: tokens.type.caption.fontSize }}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  seeAllAction: {
    minHeight: 44,
    justifyContent: "center",
  },
  featuredHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  noticeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  purchaseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  purchaseCopy: {
    flex: 1,
    gap: 2,
  },
  purchaseTrailing: {
    alignItems: "flex-end",
    gap: 4,
    minWidth: 76,
  },
});
