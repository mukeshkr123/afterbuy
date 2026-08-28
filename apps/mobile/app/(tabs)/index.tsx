import { useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  AppIcon,
  AppText,
  Button,
  CategoryArtwork,
  IconTile,
  ListItem,
  Money,
  ScreenScroll,
  ScreenTitle,
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
import { OnboardingHubIllustration } from "@/components/onboarding/OnboardingHubIllustration";
import type { Claim, PurchaseListResponse, Reminder } from "@acme/shared";

type TileTone = "accent" | "success" | "warning" | "info" | "neutral";

type SummaryTileData = {
  title: string;
  value: string;
  detail: string;
  icon: React.ComponentProps<typeof IconTile>["icon"];
  tone: TileTone;
  onPress: () => void;
};

type AttentionCardData =
  | {
      kind: "reminder";
      title: string;
      body: string;
      detail: string;
      icon: React.ComponentProps<typeof IconTile>["icon"];
      tone: TileTone;
      actionLabel: string;
      onPress: () => void;
      statusLabel?: string;
      statusTone?: React.ComponentProps<typeof StatusPill>["tone"];
    }
  | {
      kind: "claims";
      title: string;
      body: string;
      detail: string;
      icon: React.ComponentProps<typeof IconTile>["icon"];
      tone: TileTone;
      actionLabel: string;
      onPress: () => void;
      statusLabel?: string;
      statusTone?: React.ComponentProps<typeof StatusPill>["tone"];
    }
  | {
      kind: "clear";
      title: string;
      body: string;
      detail: string;
      icon: React.ComponentProps<typeof IconTile>["icon"];
      tone: TileTone;
      actionLabel: string;
      onPress: () => void;
    };

type QuerySectionState = {
  loading: boolean;
  failed: boolean;
};

const INACTIVE_CLAIM_STATUSES = new Set(["completed", "cancelled", "rejected"]);

const STARTER_CHECKLIST = [
  "Add a purchase to save the item, merchant, and date.",
  "Scan a receipt to keep proof ready for returns or claims.",
  "Open reminders when you want to review upcoming deadlines.",
] as const;

const QUICK_ACTIONS = [
  {
    label: "Add purchase",
    icon: "add" as const,
    href: "/purchase/new" as Href,
  },
  {
    label: "Scan receipt",
    icon: "camera" as const,
    href: {
      pathname: "/purchase/new",
      params: { capture: "camera" },
    } as Href,
  },
  {
    label: "View claims",
    icon: "claims" as const,
    href: "/claims" as Href,
  },
  {
    label: "View reminders",
    icon: "reminders" as const,
    href: "/(tabs)/reminders" as Href,
  },
] as const;

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
  return !INACTIVE_CLAIM_STATUSES.has(claim.status);
}

function formatReminderDetail(reminder: Reminder) {
  const state = deadlineState(
    reminder.fireOn,
    REMINDER_KIND[reminder.kind].prefix
  );
  if (!state) return "Upcoming";
  return state.expired ? state.detail : `${state.detail} · ${state.label}`;
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
  const { tokens, reducedMotion } = useTheme();
  const { expanded } = useAdaptiveLayout();

  const me = useQuery({ queryKey: apiKeys.me(), queryFn: () => getMe(api) });
  const recent = useQuery({
    queryKey: apiKeys.purchases.list({ sort: "createdAt", limit: 5 }),
    queryFn: () => listPurchases(api, { sort: "createdAt", limit: 5 }),
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

  const purchaseTitle = useMemo(
    () => new Map(purchases.map((purchase) => [purchase.id, purchase.title])),
    [purchases]
  );

  const welcomeName = titleCaseName(me.data?.email);
  const urgentReturn = useMemo(
    () =>
      [...reminderItems]
        .filter((item) => item.kind === "return_deadline")
        .sort((a, b) => a.fireOn.localeCompare(b.fireOn))
        .find((item) => {
          const state = deadlineState(
            item.fireOn,
            REMINDER_KIND[item.kind].prefix
          );
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
          const state = deadlineState(
            item.fireOn,
            REMINDER_KIND[item.kind].prefix
          );
          return Boolean(state?.urgent || state?.expired);
        }) ?? null,
    [reminderItems]
  );
  const nextReturn = useMemo(
    () =>
      [...reminderItems]
        .filter((item) => item.kind === "return_deadline")
        .sort((a, b) => a.fireOn.localeCompare(b.fireOn))[0] ?? null,
    [reminderItems]
  );
  const nextWarranty = useMemo(
    () =>
      [...reminderItems]
        .filter((item) => item.kind === "warranty_expiry")
        .sort((a, b) => a.fireOn.localeCompare(b.fireOn))[0] ?? null,
    [reminderItems]
  );
  const activeClaims = useMemo(
    () => claimItems.filter((item) => isActiveClaim(item)),
    [claimItems]
  );

  const activeClaimSummary = useMemo(() => {
    if (activeClaims.length === 0) {
      return { value: "All clear", detail: "No active claims" };
    }

    const byStatus = new Map<string, number>();
    activeClaims.forEach((claim) => {
      byStatus.set(claim.status, (byStatus.get(claim.status) ?? 0) + 1);
    });

    const dominantStatus = [...byStatus.entries()].sort(
      (a, b) => b[1] - a[1]
    )[0];
    const firstClaim = activeClaims[0]!;

    return {
      value:
        activeClaims.length === 1
          ? "1 active"
          : `${activeClaims.length} active`,
      detail:
        activeClaims.length === 1
          ? `${CLAIM_TYPE_LABEL[firstClaim.type]} · ${CLAIM_STATUS_LABEL[firstClaim.status]}`
          : `${dominantStatus?.[1] ?? activeClaims.length} ${CLAIM_STATUS_LABEL[dominantStatus?.[0] as Claim["status"]] ?? "active"}`,
    };
  }, [activeClaims]);

  const summaryTiles = useMemo<SummaryTileData[]>(
    () => [
      {
        title: "Upcoming reminders",
        value:
          reminderItems.length === 0
            ? "All clear"
            : reminderItems.length === 1
              ? "1 reminder"
              : `${reminderItems.length} reminders`,
        detail:
          reminderItems.length === 0
            ? "No return or warranty reminders queued"
            : "Returns and warranties scheduled ahead",
        icon: "notifications-outline",
        tone: reminderItems.length > 0 ? "accent" : "neutral",
        onPress: () => router.push("/(tabs)/reminders"),
      },
      {
        title: "Returns",
        value: nextReturn ? formatReminderDetail(nextReturn) : "All clear",
        detail: nextReturn
          ? (purchaseTitle.get(nextReturn.purchaseId) ??
            REMINDER_KIND[nextReturn.kind].title)
          : "No return deadlines coming up",
        icon: REMINDER_KIND.return_deadline.icon,
        tone:
          nextReturn &&
          deadlineState(nextReturn.fireOn, REMINDER_KIND.return_deadline.prefix)
            ?.urgent
            ? "warning"
            : "accent",
        onPress: () =>
          nextReturn
            ? router.push(reminderDetailHref(nextReturn))
            : router.push("/(tabs)/reminders"),
      },
      {
        title: "Warranty",
        value: nextWarranty ? formatReminderDetail(nextWarranty) : "All clear",
        detail: nextWarranty
          ? (purchaseTitle.get(nextWarranty.purchaseId) ??
            REMINDER_KIND[nextWarranty.kind].title)
          : "No warranty deadlines coming up",
        icon: REMINDER_KIND.warranty_expiry.icon,
        tone:
          nextWarranty &&
          deadlineState(
            nextWarranty.fireOn,
            REMINDER_KIND.warranty_expiry.prefix
          )?.urgent
            ? "warning"
            : "success",
        onPress: () =>
          nextWarranty
            ? router.push(reminderDetailHref(nextWarranty))
            : router.push("/(tabs)/reminders"),
      },
      {
        title: "Claims",
        value: activeClaimSummary.value,
        detail: activeClaimSummary.detail,
        icon: "shield-checkmark-outline",
        tone: activeClaims.length > 0 ? "warning" : "neutral",
        onPress: () => router.push("/claims" as Href),
      },
    ],
    [
      activeClaimSummary,
      activeClaims.length,
      nextReturn,
      nextWarranty,
      purchaseTitle,
      reminderItems.length,
      router,
    ]
  );

  const featuredAttention = useMemo<AttentionCardData>(() => {
    if (urgentReturn) {
      const state = deadlineState(
        urgentReturn.fireOn,
        REMINDER_KIND[urgentReturn.kind].prefix
      );
      return {
        kind: "reminder",
        title: "Return window needs attention",
        body:
          purchaseTitle.get(urgentReturn.purchaseId) ??
          REMINDER_KIND[urgentReturn.kind].title,
        detail: state ? `${state.label} · ${state.detail}` : "Open reminder",
        icon: REMINDER_KIND[urgentReturn.kind].icon,
        tone: "warning",
        actionLabel: "View reminder",
        onPress: () => router.push(reminderDetailHref(urgentReturn)),
        statusLabel: state?.expired ? "Expired" : "Soon",
        statusTone: state?.expired ? "danger" : "warning",
      };
    }

    if (urgentWarranty) {
      const state = deadlineState(
        urgentWarranty.fireOn,
        REMINDER_KIND[urgentWarranty.kind].prefix
      );
      return {
        kind: "reminder",
        title: "Warranty deadline coming up",
        body:
          purchaseTitle.get(urgentWarranty.purchaseId) ??
          REMINDER_KIND[urgentWarranty.kind].title,
        detail: state ? `${state.label} · ${state.detail}` : "Open reminder",
        icon: REMINDER_KIND[urgentWarranty.kind].icon,
        tone: "warning",
        actionLabel: "View reminder",
        onPress: () => router.push(reminderDetailHref(urgentWarranty)),
        statusLabel: state?.expired ? "Expired" : "Soon",
        statusTone: state?.expired ? "danger" : "warning",
      };
    }

    if (activeClaims.length > 0) {
      const firstClaim = activeClaims[0]!;
      return {
        kind: "claims",
        title: "Claims still in progress",
        body:
          activeClaims.length === 1
            ? (purchaseTitle.get(firstClaim.purchaseId) ??
              CLAIM_TYPE_LABEL[firstClaim.type])
            : `${activeClaims.length} claims need follow-through`,
        detail:
          activeClaims.length === 1
            ? `${CLAIM_TYPE_LABEL[firstClaim.type]} · ${CLAIM_STATUS_LABEL[firstClaim.status]}`
            : activeClaimSummary.detail,
        icon: "shield-checkmark-outline",
        tone: "accent",
        actionLabel: "View claims",
        onPress: () => router.push("/claims" as Href),
        statusLabel: CLAIM_STATUS_LABEL[firstClaim.status],
        statusTone: statusTone(firstClaim.status),
      };
    }

    return {
      kind: "clear",
      title: "All caught up",
      body: "No urgent returns, warranties, or claims need attention.",
      detail: "Recent purchases stay below for quick reference.",
      icon: "checkmark-circle-outline",
      tone: "success",
      actionLabel: "View reminders",
      onPress: () => router.push("/(tabs)/reminders"),
    };
  }, [
    activeClaimSummary.detail,
    activeClaims,
    purchaseTitle,
    router,
    urgentReturn,
    urgentWarranty,
  ]);

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

  const isEmptyHome =
    !showLoadingScaffold &&
    recent.isSuccess &&
    purchases.length === 0 &&
    !recent.isError;

  const summaryState: QuerySectionState = {
    loading: showLoadingScaffold,
    failed:
      !showLoadingScaffold &&
      (reminders.isError || claims.isError) &&
      reminderItems.length === 0 &&
      claimItems.length === 0,
  };
  const attentionState: QuerySectionState = {
    loading: showLoadingScaffold,
    failed:
      !showLoadingScaffold &&
      ((reminders.isError && reminderItems.length === 0) ||
        (claims.isError && claimItems.length === 0)),
  };
  const recentState: QuerySectionState = {
    loading: showLoadingScaffold,
    failed: !showLoadingScaffold && recent.isError && purchases.length === 0,
  };

  const handleRefresh = () => {
    void Promise.all([
      me.refetch(),
      recent.refetch(),
      reminders.refetch(),
      claims.refetch(),
    ]);
  };

  return (
    <ScreenScroll
      gap={tokens.spacing.xl}
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
    >
      <ScreenTitle
        title={welcomeName ? `Welcome back, ${welcomeName}` : "AfterBuy"}
        subtitle="Protection, reminders, and recent purchases in one place."
        action={
          <Pressable
            onPress={() => router.push("/(tabs)/reminders")}
            accessibilityRole="button"
            accessibilityLabel="Open reminders"
            style={({ pressed }) => [
              styles.headerAction,
              {
                minHeight: tokens.target.ios,
                minWidth: tokens.target.ios,
                backgroundColor: tokens.colors.surface,
                borderColor: tokens.colors.border,
                borderRadius: tokens.radius.pill,
                opacity: pressed ? 0.84 : 1,
                transform: [{ scale: pressed && !reducedMotion ? 0.97 : 1 }],
              },
            ]}
          >
            <AppIcon
              name="reminders"
              size={20}
              color={tokens.colors.primary}
              accessibilityLabel="Reminders"
            />
          </Pressable>
        }
      />

      {!online ? (
        <InlineNotice
          icon="wifi-outline"
          tone="warning"
          title="You're offline"
          message="AfterBuy keeps working from its saved copy. Changes you make will sync once you reconnect."
        />
      ) : null}

      {isEmptyHome ? (
        <EmptyHome expanded={expanded} onPress={(href) => router.push(href)} />
      ) : (
        <>
          <View style={{ gap: tokens.spacing.md }}>
            <SectionHeading
              title="At a glance"
              detail="Real reminders and claims, summarized without guesswork."
            />
            {summaryState.loading ? (
              <SummaryTileSkeleton />
            ) : summaryState.failed ? (
              <InlineRetryCard
                title={
                  !online ? "You're offline" : "Couldn't load your summary"
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
              <View style={[styles.summaryGrid, { gap: tokens.spacing.sm }]}>
                {summaryTiles.map((tile) => (
                  <SummaryTile key={tile.title} tile={tile} />
                ))}
              </View>
            )}
          </View>

          <View style={{ gap: tokens.spacing.md }}>
            <SectionHeading
              title="Quick actions"
              detail="Jump straight into the next task."
            />
            {showLoadingScaffold ? (
              <QuickActionsSkeleton />
            ) : (
              <View
                style={[styles.quickActionsGrid, { gap: tokens.spacing.sm }]}
              >
                {QUICK_ACTIONS.map((action) => (
                  <QuickAction
                    key={action.label}
                    icon={action.icon}
                    label={action.label}
                    onPress={() => router.push(action.href)}
                  />
                ))}
              </View>
            )}
          </View>

          <View style={{ gap: tokens.spacing.md }}>
            <SectionHeading
              title="Needs attention"
              detail="The most important next step, surfaced first."
            />
            {attentionState.loading ? (
              <Skeleton
                height={148}
                style={{ borderRadius: tokens.radius.lg }}
              />
            ) : attentionState.failed ? (
              <InlineRetryCard
                title={
                  !online ? "You're offline" : "Couldn't load attention items"
                }
                message={sectionFailureMessage(online, "what needs attention")}
                onPress={() => {
                  void reminders.refetch();
                  void claims.refetch();
                }}
              />
            ) : (
              <AttentionCard card={featuredAttention} />
            )}
          </View>

          <View style={{ gap: tokens.spacing.md }}>
            <SectionHeading
              title="Recent purchases"
              detail="Your newest saved items and their protection status."
              action={
                purchases.length > 0 ? (
                  <SectionLinkAction
                    label="See all"
                    onPress={() => router.push("/(tabs)/purchases")}
                  />
                ) : undefined
              }
            />
            {recentState.loading ? (
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
            ) : recentState.failed ? (
              <InlineRetryCard
                title={
                  !online ? "You're offline" : "Couldn't load recent purchases"
                }
                message={sectionFailureMessage(online, "your recent purchases")}
                onPress={() => void recent.refetch()}
              />
            ) : (
              <View
                style={[
                  styles.listSurface,
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
                        <CategoryArtwork
                          category={purchase.category}
                          size="sm"
                        />
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
            )}
          </View>
        </>
      )}
    </ScreenScroll>
  );
}

function SummaryTile({ tile }: { tile: SummaryTileData }) {
  const { tokens, reducedMotion } = useTheme();

  return (
    <Pressable
      onPress={tile.onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.summaryTile,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.lg,
          opacity: pressed ? 0.86 : 1,
          transform: [{ scale: pressed && !reducedMotion ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={styles.summaryTileHeader}>
        <IconTile icon={tile.icon} tone={tile.tone} />
      </View>
      <View style={{ gap: 4 }}>
        <AppText role="caption" tone="subtle" weight="600">
          {tile.title}
        </AppText>
        <AppText role="headline" weight="700">
          {tile.value}
        </AppText>
        <AppText role="caption" tone="subtle">
          {tile.detail}
        </AppText>
      </View>
    </Pressable>
  );
}

function SummaryTileSkeleton() {
  const { tokens } = useTheme();

  return (
    <View style={[styles.summaryGrid, { gap: tokens.spacing.sm }]}>
      {Array.from({ length: 4 }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.summaryTile,
            {
              backgroundColor: tokens.colors.surface,
              borderColor: tokens.colors.border,
              borderRadius: tokens.radius.lg,
            },
          ]}
        >
          <Skeleton
            width={44}
            height={44}
            style={{ borderRadius: tokens.radius.lg }}
          />
          <View style={{ gap: tokens.spacing.sm }}>
            <Skeleton width="45%" height={12} />
            <Skeleton width="72%" height={18} />
            <Skeleton width="88%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof AppIcon>["name"];
  label: string;
  onPress: () => void;
}) {
  const { tokens, reducedMotion } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.quickAction,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.lg,
          opacity: pressed ? 0.84 : 1,
          transform: [{ scale: pressed && !reducedMotion ? 0.98 : 1 }],
        },
      ]}
    >
      <View
        style={[
          styles.quickActionIcon,
          {
            backgroundColor: tokens.colors.accentSoft,
            borderRadius: tokens.radius.md,
          },
        ]}
      >
        <AppIcon name={icon} size={18} color={tokens.colors.primary} />
      </View>
      <AppText role="subheadline" weight="700">
        {label}
      </AppText>
    </Pressable>
  );
}

function QuickActionsSkeleton() {
  const { tokens } = useTheme();

  return (
    <View style={[styles.quickActionsGrid, { gap: tokens.spacing.sm }]}>
      {Array.from({ length: 4 }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.quickAction,
            {
              backgroundColor: tokens.colors.surface,
              borderColor: tokens.colors.border,
              borderRadius: tokens.radius.lg,
            },
          ]}
        >
          <Skeleton
            width={40}
            height={40}
            style={{ borderRadius: tokens.radius.md }}
          />
          <Skeleton width="70%" height={14} />
        </View>
      ))}
    </View>
  );
}

function AttentionCard({ card }: { card: AttentionCardData }) {
  const { tokens } = useTheme();
  const isClear = card.kind === "clear";

  return (
    <View
      style={[
        styles.attentionCard,
        {
          backgroundColor: isClear
            ? tokens.colors.successSoft
            : tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.lg,
        },
      ]}
    >
      <View style={styles.attentionTopRow}>
        <IconTile icon={card.icon} tone={card.tone} />
        {"statusLabel" in card && card.statusLabel ? (
          <StatusPill
            label={card.statusLabel}
            tone={card.statusTone ?? "neutral"}
          />
        ) : null}
      </View>
      <View style={{ gap: 4 }}>
        <AppText role="headline" weight="700">
          {card.title}
        </AppText>
        <AppText role="body" weight="600">
          {card.body}
        </AppText>
        <AppText role="subheadline" tone="subtle">
          {card.detail}
        </AppText>
      </View>
      <View style={styles.attentionFooter}>
        <Button
          label={card.actionLabel}
          variant={isClear ? "secondary" : "primary"}
          onPress={card.onPress}
        />
      </View>
    </View>
  );
}

function InlineNotice({
  icon,
  tone,
  title,
  message,
}: {
  icon: React.ComponentProps<typeof IconTile>["icon"];
  tone: TileTone;
  title: string;
  message: string;
}) {
  const { tokens } = useTheme();

  return (
    <View
      style={[
        styles.noticeCard,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.lg,
        },
      ]}
    >
      <IconTile icon={icon} tone={tone} />
      <View style={styles.noticeCopy}>
        <AppText role="headline" weight="700">
          {title}
        </AppText>
        <AppText role="subheadline" tone="subtle">
          {message}
        </AppText>
      </View>
    </View>
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
    <View
      style={[
        styles.retryCard,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.lg,
        },
      ]}
    >
      <View style={styles.retryCopy}>
        <AppText role="headline" weight="700">
          {title}
        </AppText>
        <AppText role="subheadline" tone="subtle">
          {message}
        </AppText>
      </View>
      <Button label="Try again" variant="secondary" onPress={onPress} />
    </View>
  );
}

function SectionLinkAction({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const { tokens } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.sectionAction,
        { opacity: pressed ? 0.72 : 1 },
      ]}
    >
      <AppText role="subheadline" tone="accent" weight="600">
        {label}
      </AppText>
    </Pressable>
  );
}

function EmptyHome({
  expanded,
  onPress,
}: {
  expanded: boolean;
  onPress: (href: Href) => void;
}) {
  const { tokens } = useTheme();

  return (
    <View style={{ gap: tokens.spacing.xl }}>
      <View
        style={[
          styles.emptyHero,
          {
            backgroundColor: tokens.colors.surface,
            borderColor: tokens.colors.border,
            borderRadius: tokens.radius.xl,
          },
        ]}
      >
        <OnboardingHubIllustration compact={!expanded} />
        <View style={styles.emptyHeroCopy}>
          <AppText role="title" weight="700">
            Start tracking a purchase
          </AppText>
          <AppText role="body" tone="subtle">
            Save a purchase once, then keep returns, warranties, reminders, and
            claims attached to the same record.
          </AppText>
        </View>
      </View>

      <View style={{ gap: tokens.spacing.md }}>
        <SectionHeading
          title="Get started"
          detail="Everything on home fills in from the purchases you save."
        />
        <View style={[styles.quickActionsGrid, { gap: tokens.spacing.sm }]}>
          {QUICK_ACTIONS.map((action) => (
            <QuickAction
              key={action.label}
              icon={action.icon}
              label={action.label}
              onPress={() => onPress(action.href)}
            />
          ))}
        </View>
      </View>

      <View
        style={[
          styles.checklistCard,
          {
            backgroundColor: tokens.colors.surface,
            borderColor: tokens.colors.border,
            borderRadius: tokens.radius.lg,
          },
        ]}
      >
        <SectionHeading
          title="What to do first"
          detail="A short setup path so the dashboard has something real to show."
        />
        <View style={{ gap: tokens.spacing.md }}>
          {STARTER_CHECKLIST.map((item) => (
            <View key={item} style={styles.checklistRow}>
              <IconTile icon="checkmark-circle-outline" tone="accent" />
              <AppText role="subheadline" style={styles.checklistText}>
                {item}
              </AppText>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerAction: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  summaryTile: {
    width: "48%",
    minHeight: 156,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  summaryTileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  quickAction: {
    width: "48%",
    minHeight: 104,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 16,
    justifyContent: "space-between",
    gap: 12,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  attentionCard: {
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  attentionTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  attentionFooter: {
    alignItems: "flex-start",
  },
  listSurface: {
    borderWidth: 1,
    overflow: "hidden",
  },
  purchaseTrailing: {
    alignItems: "flex-end",
    gap: 4,
  },
  noticeCard: {
    borderWidth: 1,
    padding: 16,
    gap: 14,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  noticeCopy: {
    flex: 1,
    gap: 4,
  },
  retryCard: {
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  retryCopy: {
    gap: 4,
  },
  sectionAction: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  emptyHero: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 12,
  },
  emptyHeroCopy: {
    gap: 6,
  },
  checklistCard: {
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  checklistRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  checklistText: {
    flex: 1,
  },
});
