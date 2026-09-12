import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Claim, PurchaseListResponse, Reminder } from "@acme/shared";
import {
  AppText,
  Button,
  DashboardHeroIllustration,
  ScreenScroll,
  SectionCard,
  Skeleton,
  StatusPill,
} from "@/components";
import { PurchaseArtworkTile } from "@/components/PurchaseArtworkTile";
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

function extractFirstName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/\d+$/, "").trim();
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens[0]) {
    return tokens[0].charAt(0).toUpperCase() + tokens[0].slice(1);
  }
  return null;
}

function extractInitials(
  first: string | null | undefined,
  second: string | null | undefined
): string {
  if (first && second) {
    return `${first[0]}${second[0]}`.toUpperCase();
  }
  if (first && first.length >= 2) {
    return first.slice(0, 2).toUpperCase();
  }
  return "AB";
}

function getUserDisplay(
  clerkUser: ReturnType<typeof useUser>["user"],
  apiUserEmail: string | null | undefined
) {
  const clerkFirstName = clerkUser?.firstName?.trim();
  const clerkLastName = clerkUser?.lastName?.trim();

  if (clerkFirstName) {
    return {
      firstName: clerkFirstName,
      initials: extractInitials(clerkFirstName, clerkLastName),
    };
  }

  const rawEmail =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses?.[0]?.emailAddress ??
    apiUserEmail;

  if (rawEmail) {
    const handle =
      rawEmail
        .split("@")[0]
        ?.replace(/[._-]+/g, " ")
        .trim() ?? "";
    const parts = handle
      .replace(/\d+$/, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const firstName = extractFirstName(parts[0]) || "there";
    const secondName = extractFirstName(parts[1]);
    return {
      firstName,
      initials: extractInitials(parts[0], secondName),
    };
  }

  return {
    firstName: "there",
    initials: "AB",
  };
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

function formatMoneyAmount(amountMinor: number, currency = "USD") {
  const amount = amountMinor / 100;
  if (currency === "USD") {
    return `$${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `${currency} ${amount.toFixed(2)}`;
}

export default function HomeScreen() {
  const api = useApi();
  const online = useOnline();
  const router = useRouter();
  const { tokens } = useTheme();
  const { user: clerkUser } = useUser();

  const me = useQuery({ queryKey: apiKeys.me(), queryFn: () => getMe(api) });
  const recent = useQuery({
    queryKey: apiKeys.purchases.list({ sort: "createdAt", limit: 3 }),
    queryFn: () => listPurchases(api, { sort: "createdAt", limit: 3 }),
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
  const recentPreview = purchases.slice(0, 3);
  const userDisplay = getUserDisplay(clerkUser, me.data?.email);

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
      gap={tokens.spacing.lg}
      refreshing={isRefreshing}
      contentStyle={{ backgroundColor: "#F8F9FD" }}
      onRefresh={() => {
        void Promise.all([
          me.refetch(),
          recent.refetch(),
          reminders.refetch(),
          claims.refetch(),
        ]);
      }}
    >
      {/* Decorative ambient pastel mesh glow */}
      <View style={styles.bgAmbientTopRight} pointerEvents="none" />
      <View style={styles.bgAmbientBottomRight} pointerEvents="none" />

      {/* 1. Top Brand & Profile Bar */}
      <View style={styles.topBrandRow}>
        <View style={styles.brandContainer}>
          <View style={styles.logoRow}>
            <Text style={styles.logoTextDark}>After</Text>
            <Text style={styles.logoTextPurple}>Buy</Text>
          </View>
          <Text style={styles.brandTagline}>
            Everything you buy, organized beautifully.
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => router.push("/settings/permissions")}
            style={({ pressed }) => [
              styles.bellButton,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Ionicons name="notifications-outline" size={20} color="#0F172A" />
            <View style={styles.bellDot} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Account profile"
            onPress={() => router.push("/(tabs)/profile")}
            style={({ pressed }) => [
              styles.avatarCircle,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={styles.avatarInitials}>{userDisplay.initials}</Text>
          </Pressable>
        </View>
      </View>

      {/* 2. Welcome Greeting & 3D Hero Illustration */}
      <View style={styles.heroRow}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>
            Welcome back,{"\n"}
            {userDisplay.firstName === "there"
              ? "there! 👋"
              : `${userDisplay.firstName}! 👋`}
          </Text>
          <Text style={styles.heroSubtitle}>
            Here's what's happening with your purchases.
          </Text>
        </View>

        <DashboardHeroIllustration />
      </View>

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
          {/* 3. Attention / Reminder Card */}
          <View style={{ gap: tokens.spacing.md }}>
            {showLoadingScaffold ? (
              <>
                <Skeleton
                  height={150}
                  style={{ borderRadius: tokens.radius.xl }}
                />
                <Skeleton
                  height={60}
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

                {/* 4. Add Purchase Interactive Card */}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/purchase/new")}
                  style={({ pressed }) => [
                    styles.addPurchaseCard,
                    { opacity: pressed ? 0.88 : 1 },
                  ]}
                >
                  <View style={styles.addIconDashedBox}>
                    <Ionicons name="add" size={24} color="#5B4DF5" />
                  </View>

                  <View style={styles.addPurchaseCopy}>
                    <Text style={styles.addPurchaseTitle}>Add purchase</Text>
                    <Text style={styles.addPurchaseSubtitle}>
                      Track a new item, warranty, or receipt.
                    </Text>
                  </View>

                  <View style={styles.addArrowCircle}>
                    <Ionicons name="arrow-forward" size={16} color="#64748B" />
                  </View>
                </Pressable>
              </>
            )}
          </View>

          {/* 5. Recent Purchases Section */}
          <View style={{ gap: tokens.spacing.sm }}>
            <View style={styles.recentHeaderRow}>
              <Text style={styles.recentTitle}>Recent purchases</Text>
              {purchases.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/(tabs)/purchases")}
                  style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}
                >
                  <Text style={styles.seeAllText}>See all</Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.recentSubtitle}>
              Your latest saved items and their current status.
            </Text>

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
              <View style={styles.purchasesCardContainer}>
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
              </View>
            )}
          </View>
        </>
      )}
    </ScreenScroll>
  );
}

function FeaturedCard({ card }: { card: FeaturedState }) {
  const isReturn = card.kind === "return";
  const isWarranty = card.kind === "warranty";
  const isClear = card.kind === "clear";

  const cardBg = isReturn
    ? "#FFF7F7"
    : isWarranty
      ? "#FFFDF5"
      : isClear
        ? "#F0FDF4"
        : "#F8FAFC";

  const borderColor = isReturn
    ? "#FEE2E2"
    : isWarranty
      ? "#FEF3C7"
      : isClear
        ? "#DCFCE7"
        : "#E2E8F0";

  const iconBg = isReturn
    ? "#FEE2E2"
    : isWarranty
      ? "#FEF3C7"
      : isClear
        ? "#DCFCE7"
        : "#EEF2FF";

  const iconColor = isReturn
    ? "#EF4444"
    : isWarranty
      ? "#D97706"
      : isClear
        ? "#16A34A"
        : "#5B4DF5";

  const iconName: keyof typeof Ionicons.glyphMap = isReturn
    ? "repeat"
    : isWarranty
      ? "shield-checkmark-outline"
      : isClear
        ? "checkmark-circle"
        : "document-text-outline";

  const headerNoticeColor = isReturn
    ? "#DC2626"
    : isWarranty
      ? "#D97706"
      : isClear
        ? "#16A34A"
        : "#4F46E5";

  return (
    <View
      style={[
        styles.featuredContainer,
        { backgroundColor: cardBg, borderColor },
      ]}
    >
      <View style={styles.featuredTopRow}>
        {/* Left Icon Badge */}
        <View style={[styles.featuredIconBox, { backgroundColor: iconBg }]}>
          <Ionicons name={iconName} size={24} color={iconColor} />
        </View>

        {/* Middle Copy */}
        <View style={styles.featuredCopy}>
          <Text
            style={[styles.featuredHeaderNotice, { color: headerNoticeColor }]}
          >
            {card.title}
          </Text>
          <Text style={styles.featuredTitle}>{card.body}</Text>
          <Text style={styles.featuredDetail}>{card.detail}</Text>
        </View>

        {/* Right Status Pill Badge */}
        {"statusLabel" in card ? (
          <View
            style={[
              styles.featuredBadgePill,
              {
                backgroundColor:
                  card.statusTone === "danger"
                    ? "#FEE2E2"
                    : card.statusTone === "warning"
                      ? "#FEF3C7"
                      : "#F1F5F9",
              },
            ]}
          >
            <Text
              style={[
                styles.featuredBadgeText,
                {
                  color:
                    card.statusTone === "danger"
                      ? "#DC2626"
                      : card.statusTone === "warning"
                        ? "#B45309"
                        : "#475569",
                },
              ]}
            >
              {card.statusLabel}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Action Button: Full width with arrow */}
      <Pressable
        accessibilityRole="button"
        onPress={card.onPress}
        style={({ pressed }) => [
          styles.featuredActionButton,
          { opacity: pressed ? 0.88 : 1 },
        ]}
      >
        <Text style={styles.featuredActionText}>{card.actionLabel}</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
      </Pressable>
    </View>
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
  const subtitle = [purchase.merchant, date].filter(Boolean).join(" · ");
  const isOrdered = statusLabel.toLowerCase() === "ordered";
  const isShipped = statusLabel.toLowerCase() === "shipped";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.purchaseRow,
        {
          borderBottomWidth: divider ? 1 : 0,
          borderBottomColor: "#F1F5F9",
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {/* Product Artwork Tile */}
      <PurchaseArtworkTile
        title={purchase.title}
        category={purchase.category}
        size={52}
      />

      {/* Copy */}
      <View style={styles.purchaseCopy}>
        <Text style={styles.purchaseTitle} numberOfLines={1}>
          {purchase.title}
        </Text>
        <Text style={styles.purchaseDate} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      {/* Trailing: Status + Price */}
      <View style={styles.purchaseTrailing}>
        <View
          style={[
            styles.statusPill,
            isOrdered
              ? styles.statusOrdered
              : isShipped
                ? styles.statusShipped
                : styles.statusDelivered,
          ]}
        >
          <Text
            style={[
              styles.statusPillText,
              isOrdered
                ? styles.statusTextOrdered
                : isShipped
                  ? styles.statusTextShipped
                  : styles.statusTextDelivered,
            ]}
          >
            {statusLabel}
          </Text>
        </View>

        {purchase.amountMinor != null ? (
          <Text style={styles.purchasePrice}>
            {formatMoneyAmount(purchase.amountMinor, purchase.currency)}
          </Text>
        ) : null}
      </View>

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bgAmbientTopRight: {
    position: "absolute",
    top: -20,
    right: -30,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "#EDE9FE",
    opacity: 0.5,
  },
  bgAmbientBottomRight: {
    position: "absolute",
    bottom: 60,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#F3E8FF",
    opacity: 0.4,
  },
  topBrandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 2,
  },
  brandContainer: {
    flex: 1,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoTextDark: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  logoTextPurple: {
    fontSize: 26,
    fontWeight: "900",
    color: "#5B4DF5",
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 2,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: "700",
    color: "#5B4DF5",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 4,
  },
  heroCopy: {
    flex: 1,
    paddingRight: 6,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13.5,
    lineHeight: 18,
    color: "#64748B",
    marginTop: 6,
  },
  featuredContainer: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  featuredTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  featuredIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  featuredCopy: {
    flex: 1,
    gap: 2,
  },
  featuredHeaderNotice: {
    fontSize: 13,
    fontWeight: "600",
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  featuredDetail: {
    fontSize: 13,
    color: "#64748B",
  },
  featuredBadgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  featuredBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  featuredActionButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#5B4DF5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  featuredActionText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  addPurchaseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  addIconDashedBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F5F3FF",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#C7D2FE",
    alignItems: "center",
    justifyContent: "center",
  },
  addPurchaseCopy: {
    flex: 1,
    marginLeft: 14,
    gap: 2,
  },
  addPurchaseTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4F46E5",
  },
  addPurchaseSubtitle: {
    fontSize: 13,
    color: "#64748B",
  },
  addArrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  recentHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  recentTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4F46E5",
  },
  recentSubtitle: {
    fontSize: 13.5,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 8,
  },
  purchasesCardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  purchaseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  purchaseCopy: {
    flex: 1,
    gap: 2,
  },
  purchaseTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  purchaseDate: {
    fontSize: 13,
    color: "#64748B",
  },
  purchaseTrailing: {
    alignItems: "flex-end",
    gap: 4,
    minWidth: 78,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusOrdered: {
    backgroundColor: "#F1F5F9",
  },
  statusShipped: {
    backgroundColor: "#EEF2FF",
  },
  statusDelivered: {
    backgroundColor: "#ECFDF5",
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusTextOrdered: {
    color: "#475569",
  },
  statusTextShipped: {
    color: "#6366F1",
  },
  statusTextDelivered: {
    color: "#059669",
  },
  purchasePrice: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  noticeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  bellDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#5B4DF5",
  },
});
