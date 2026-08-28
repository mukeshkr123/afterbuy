import { useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { Claim, PurchaseListResponse, Reminder } from "@acme/shared";
import {
  AppIcon,
  AppText,
  Button,
  CategoryArtwork,
  ListItem,
  Money,
  ScreenScroll,
  ScreenTitle,
  SectionCard,
  SectionHeading,
  Skeleton,
  StatusPill,
  useAdaptiveLayout,
} from "@/components";
import { OnboardingHubIllustration } from "@/components/onboarding/OnboardingHubIllustration";
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

  const purchaseTitles = useMemo(
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
        subtitle="What needs attention, what to capture next, and your newest purchases."
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open reminders"
            onPress={() => router.push("/(tabs)/reminders")}
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
            <AppIcon name="reminders" size={20} color={tokens.colors.primary} />
          </Pressable>
        }
      />

      {!online ? (
        <InlineNotice
          title="You're offline"
          message="AfterBuy keeps working from its saved copy. Changes you make will sync once you reconnect."
        />
      ) : null}

      {homeEmpty ? (
        <EmptyHome expanded={expanded} onPress={(href) => router.push(href)} />
      ) : (
        <>
          <View style={{ gap: tokens.spacing.md }}>
            <SectionHeading
              title="Start here"
              detail="Capture a purchase or continue protection work."
            />
            {showLoadingScaffold ? (
              <CtaSkeleton />
            ) : (
              <View style={{ gap: tokens.spacing.sm }}>
                <Button
                  label="Add purchase"
                  size="lg"
                  onPress={() => router.push("/purchase/new")}
                />
                <View
                  style={[styles.secondaryActions, { gap: tokens.spacing.sm }]}
                >
                  <Button
                    label="Scan receipt"
                    variant="secondary"
                    onPress={() =>
                      router.push({
                        pathname: "/purchase/new",
                        params: { capture: "camera" },
                      })
                    }
                    style={styles.secondaryButton}
                  />
                  <Button
                    label="View claims"
                    variant="secondary"
                    onPress={() => router.push("/claims")}
                    style={styles.secondaryButton}
                  />
                </View>
              </View>
            )}
          </View>

          <View style={{ gap: tokens.spacing.md }}>
            <SectionHeading
              title="Needs attention"
              detail="One real next step, surfaced first."
            />
            {showLoadingScaffold ? (
              <Skeleton
                height={170}
                style={{ borderRadius: tokens.radius.xl }}
              />
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
              <FeaturedCard card={featured} />
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
                      leading={
                        <CategoryArtwork
                          category={purchase.category}
                          size="sm"
                        />
                      }
                      trailing={
                        <View style={styles.purchaseTrailing}>
                          <StatusPill label={status.label} tone={status.tone} />
                          {purchase.amountMinor != null ? (
                            <Money
                              amountMinor={purchase.amountMinor}
                              currency={purchase.currency}
                              emphasis="strong"
                              style={{ fontSize: tokens.type.caption.fontSize }}
                            />
                          ) : null}
                        </View>
                      }
                      divider={index < purchases.length - 1}
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

  return (
    <SectionCard style={{ backgroundColor: calmSurface }}>
      <View style={{ gap: tokens.spacing.lg }}>
        <View style={styles.featuredHeader}>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText role="headline">{card.title}</AppText>
            <AppText role="body" weight="600">
              {card.body}
            </AppText>
            <AppText role="subheadline" tone="subtle">
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

function EmptyHome({
  expanded,
  onPress,
}: {
  expanded: boolean;
  onPress: (href: Href) => void;
}) {
  const { tokens } = useTheme();

  return (
    <SectionCard style={{ paddingVertical: tokens.spacing.xl }}>
      <View
        style={[
          styles.emptyHome,
          {
            gap: expanded ? tokens.spacing.xl : tokens.spacing.lg,
            flexDirection: expanded ? "row" : "column",
            alignItems: expanded ? "center" : "stretch",
          },
        ]}
      >
        <View style={styles.emptyArtwork}>
          <OnboardingHubIllustration />
        </View>
        <View style={{ flex: 1, gap: tokens.spacing.lg }}>
          <View style={{ gap: tokens.spacing.sm }}>
            <AppText role="title">Keep every purchase protected</AppText>
            <AppText role="body" tone="subtle">
              Save a purchase, keep the receipt close, and let AfterBuy track
              the deadlines that matter.
            </AppText>
          </View>
          <View style={{ gap: tokens.spacing.sm }}>
            <StepCopy
              title="1. Add a purchase"
              detail="Record the item, merchant, and date so the timeline starts in the right place."
            />
            <StepCopy
              title="2. Scan the receipt"
              detail="Keep proof ready for returns and warranty claims."
            />
            <StepCopy
              title="3. Review claims"
              detail="When something goes wrong, start from a saved purchase instead of rebuilding the context."
            />
          </View>
          <View style={{ gap: tokens.spacing.sm }}>
            <Button
              label="Add purchase"
              size="lg"
              onPress={() => onPress("/purchase/new")}
            />
            <View style={[styles.secondaryActions, { gap: tokens.spacing.sm }]}>
              <Button
                label="Scan receipt"
                variant="secondary"
                onPress={() =>
                  onPress({
                    pathname: "/purchase/new",
                    params: { capture: "camera" },
                  })
                }
                style={styles.secondaryButton}
              />
              <Button
                label="View claims"
                variant="secondary"
                onPress={() => onPress("/claims")}
                style={styles.secondaryButton}
              />
            </View>
          </View>
        </View>
      </View>
    </SectionCard>
  );
}

function StepCopy({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={{ gap: 2 }}>
      <AppText role="label" weight="700">
        {title}
      </AppText>
      <AppText role="subheadline" tone="subtle">
        {detail}
      </AppText>
    </View>
  );
}

function InlineNotice({ title, message }: { title: string; message: string }) {
  const { tokens } = useTheme();

  return (
    <SectionCard tone="muted">
      <View style={{ gap: tokens.spacing.xs }}>
        <AppText role="headline">{title}</AppText>
        <AppText role="subheadline" tone="subtle">
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
      <View style={{ gap: tokens.spacing.md }}>
        <View style={{ gap: 4 }}>
          <AppText role="headline">{title}</AppText>
          <AppText role="subheadline" tone="subtle">
            {message}
          </AppText>
        </View>
        <Button label="Try again" variant="secondary" onPress={onPress} />
      </View>
    </SectionCard>
  );
}

function CtaSkeleton() {
  const { tokens } = useTheme();

  return (
    <View style={{ gap: tokens.spacing.sm }}>
      <Skeleton height={54} style={{ borderRadius: tokens.radius.lg }} />
      <View style={[styles.secondaryActions, { gap: tokens.spacing.sm }]}>
        <Skeleton
          height={48}
          style={{ flex: 1, borderRadius: tokens.radius.lg }}
        />
        <Skeleton
          height={48}
          style={{ flex: 1, borderRadius: tokens.radius.lg }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerAction: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryActions: {
    flexDirection: "row",
  },
  secondaryButton: {
    flex: 1,
  },
  featuredHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  purchaseTrailing: {
    alignItems: "flex-end",
    gap: 6,
  },
  emptyHome: {
    width: "100%",
  },
  emptyArtwork: {
    minWidth: 220,
    maxWidth: 280,
    alignSelf: "center",
  },
});
