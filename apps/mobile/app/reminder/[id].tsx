import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  EmptyState,
  FormError,
  Skeleton,
  useAdaptiveLayout,
} from "@/components";
import { PurchaseArtworkTile } from "@/components/PurchaseArtworkTile";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getPurchase } from "@/api/purchases";
import { dismissReminder } from "@/api/reminders";
import { fromCaught, type FormErrorState } from "@/hooks/useApiError";
import { categoryLabel, formatDate } from "@/lib/purchaseDisplay";
import {
  isReminderUpcoming,
  REMINDER_KIND,
  reminderHistoryPresentation,
  reminderState,
} from "@/lib/reminders";
import { formatMoney } from "@/components/Money";

export default function ReminderDetailScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentWidth } = useAdaptiveLayout();
  const { id, purchaseId } = useLocalSearchParams<{
    id: string;
    purchaseId?: string;
  }>();
  const [error, setError] = useState<FormErrorState>({
    message: null,
    fields: {},
  });

  const purchase = useQuery({
    queryKey: apiKeys.purchases.detail(purchaseId ?? ""),
    queryFn: () => getPurchase(api, purchaseId ?? ""),
    enabled: Boolean(purchaseId),
  });

  const dismiss = useMutation({
    mutationFn: () => dismissReminder(api, id ?? ""),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["reminders"] }),
        qc.invalidateQueries({
          queryKey: apiKeys.purchases.detail(purchaseId ?? ""),
        }),
      ]);
      router.replace("/(tabs)/reminders");
    },
    onError: (caught) => setError(fromCaught(caught)),
  });

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/reminders");
  };

  if (purchase.isLoading) {
    return (
      <View
        style={[
          styles.screen,
          { paddingTop: insets.top + 10, paddingHorizontal: 16 },
        ]}
      >
        <View style={styles.navBar}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </Pressable>
          <Text style={styles.navTitle}>Reminder</Text>
          <View style={styles.navSpacer} />
        </View>
        <View style={{ gap: 16, marginTop: 16 }}>
          <Skeleton height={140} />
          <Skeleton height={180} />
        </View>
      </View>
    );
  }

  if (!purchaseId || !purchase.data) {
    return (
      <View
        style={[
          styles.screen,
          { paddingTop: insets.top + 10, paddingHorizontal: 16 },
        ]}
      >
        <View style={styles.navBar}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </Pressable>
          <Text style={styles.navTitle}>Reminder</Text>
          <View style={styles.navSpacer} />
        </View>
        <EmptyState
          icon="alert-circle-outline"
          title="Reminder not available"
          message={
            purchase.isError
              ? "We couldn't load the purchase behind this reminder. Check your connection and try again."
              : "This reminder link is missing its purchase context."
          }
          action={{
            label: "Try again",
            onPress: () => void purchase.refetch(),
          }}
        />
      </View>
    );
  }

  const reminder = purchase.data.reminders.find((item) => item.id === id);
  if (!reminder) {
    return (
      <View
        style={[
          styles.screen,
          { paddingTop: insets.top + 10, paddingHorizontal: 16 },
        ]}
      >
        <View style={styles.navBar}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </Pressable>
          <Text style={styles.navTitle}>Reminder</Text>
          <View style={styles.navSpacer} />
        </View>
        <EmptyState
          icon="notifications-outline"
          title="Reminder not available"
          message="This reminder is no longer attached to the purchase."
          action={{
            label: "View purchase",
            onPress: () =>
              router.replace({
                pathname: "/purchase/[id]",
                params: { id: purchase.data.id },
              }),
          }}
        />
      </View>
    );
  }

  const kind = REMINDER_KIND[reminder.kind];
  const state = reminderState(reminder);
  const isUpcoming = isReminderUpcoming(reminder);
  const historyState = reminderHistoryPresentation(reminder);
  const p = purchase.data;
  const formattedAmount = p ? formatMoney(p.amountMinor, p.currency) : null;

  return (
    <View style={styles.screen}>
      {/* Top ambient glow */}
      <View style={styles.ambientGlowTopRight} pointerEvents="none" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          width: "100%",
          maxWidth: contentWidth,
          alignSelf: "center",
          paddingHorizontal: 16,
          paddingTop: Math.max(insets.top + 6, 16),
          paddingBottom: Math.max(insets.bottom + 36, 44),
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </Pressable>

          <Text style={styles.navTitle}>Reminder</Text>

          <View style={styles.navSpacer} />
        </View>

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <PurchaseArtworkTile
              title={p.title}
              category={p.category}
              size={52}
            />

            <View style={styles.heroCopy}>
              <Text numberOfLines={2} style={styles.heroTitle}>
                {p.title}
              </Text>
              <Text numberOfLines={1} style={styles.heroSubtitle}>
                {[p.merchant, categoryLabel(p.category)]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              <Text style={styles.reminderKindLabel}>
                {kind.label} reminder
              </Text>
              {formattedAmount ? (
                <Text style={styles.heroPrice}>{formattedAmount}</Text>
              ) : null}
            </View>

            <View
              style={[
                styles.badgePill,
                isUpcoming
                  ? state?.urgent
                    ? styles.badgeAmber
                    : styles.badgeLavender
                  : styles.badgeGray,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  isUpcoming
                    ? state?.urgent
                      ? styles.badgeTextAmber
                      : styles.badgeTextLavender
                    : styles.badgeTextGray,
                ]}
              >
                {isUpcoming
                  ? (state?.detail ?? "Upcoming")
                  : historyState.label}
              </Text>
            </View>
          </View>

          {/* Schedule box */}
          <View style={styles.scheduleBox}>
            <View style={styles.scheduleIconBox}>
              <Ionicons name="time-outline" size={20} color="#6366F1" />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={styles.scheduleCaption}>Reminder schedule</Text>
              <Text style={styles.scheduleDate}>
                {state?.label ?? formatDate(reminder.fireOn) ?? reminder.fireOn}
              </Text>
            </View>
            <Text style={styles.scheduleTimeRemaining}>
              {isUpcoming ? (state?.detail ?? "Upcoming") : historyState.detail}
            </Text>
          </View>
        </View>

        {/* Deadlines Section */}
        <View style={{ gap: 8 }}>
          <View style={styles.sectionHeaderStack}>
            <Text style={styles.sectionTitle}>Deadlines</Text>
            <Text style={styles.sectionSubtitle}>
              Built from the purchase dates already on file.
            </Text>
          </View>

          <View style={styles.groupedCard}>
            {p.returnDeadlineAt ? (
              <View style={styles.deadlineRow}>
                <View style={[styles.deadlineIconBox, styles.peachBox]}>
                  <Ionicons name="sync-outline" size={18} color="#E11D48" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.deadlineRowTitle}>Return window</Text>
                  <Text style={styles.deadlineRowSubtitle}>
                    {formatDate(p.returnDeadlineAt)}
                  </Text>
                </View>
                <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
              </View>
            ) : null}

            {p.returnDeadlineAt && p.warrantyExpiresAt ? (
              <View style={styles.cardDivider} />
            ) : null}

            {p.warrantyExpiresAt ? (
              <View style={styles.deadlineRow}>
                <View style={[styles.deadlineIconBox, styles.mintBox]}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={18}
                    color="#059669"
                  />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.deadlineRowTitle}>Warranty</Text>
                  <Text style={styles.deadlineRowSubtitle}>
                    {formatDate(p.warrantyExpiresAt)}
                  </Text>
                </View>
                <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
              </View>
            ) : null}
          </View>
        </View>

        <FormError message={error.message} />

        {/* Action Buttons */}
        <View style={styles.buttonGroup}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View purchase"
            onPress={() =>
              router.push({
                pathname: "/purchase/[id]",
                params: { id: p.id },
              })
            }
            style={({ pressed }) => [
              styles.primaryButton,
              {
                opacity: pressed ? 0.88 : 1,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              },
            ]}
          >
            <Text style={styles.primaryButtonText}>View purchase</Text>
          </Pressable>

          {isUpcoming ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss reminder"
              onPress={() => dismiss.mutate()}
              disabled={dismiss.isPending}
              style={({ pressed }) => [
                styles.dismissButton,
                { opacity: dismiss.isPending ? 0.5 : pressed ? 0.82 : 1 },
              ]}
            >
              <Text style={styles.dismissButtonText}>
                {dismiss.isPending ? "Dismissing..." : "Dismiss reminder"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
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
    height: 220,
    borderRadius: 130,
    backgroundColor: "#EDE9FE",
    opacity: 0.6,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  navSpacer: {
    width: 42,
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 16,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  heroCopy: {
    flex: 1,
    gap: 2,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 20,
  },
  heroSubtitle: {
    fontSize: 12,
    color: "#64748B",
  },
  reminderKindLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6366F1",
    marginTop: 2,
  },
  heroPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  badgePill: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  badgeLavender: {
    backgroundColor: "#EEF2FF",
  },
  badgeAmber: {
    backgroundColor: "#FEF3C7",
  },
  badgeGray: {
    backgroundColor: "#F1F5F9",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  badgeTextLavender: {
    color: "#6366F1",
  },
  badgeTextAmber: {
    color: "#B45309",
  },
  badgeTextGray: {
    color: "#64748B",
  },
  scheduleBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  scheduleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleCaption: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  scheduleDate: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  scheduleTimeRemaining: {
    fontSize: 12,
    fontWeight: "600",
    color: "#5B4DF5",
  },
  sectionHeaderStack: {
    gap: 2,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#64748B",
  },
  groupedCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#F1F5F9",
  },
  deadlineRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  deadlineIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  peachBox: {
    backgroundColor: "#FFF1F2",
  },
  mintBox: {
    backgroundColor: "#ECFDF5",
  },
  deadlineRowTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  deadlineRowSubtitle: {
    fontSize: 12,
    color: "#64748B",
  },
  buttonGroup: {
    gap: 10,
    marginTop: 8,
  },
  primaryButton: {
    height: 52,
    backgroundColor: "#775DF5",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#775DF5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  dismissButton: {
    height: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  dismissButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748B",
  },
});
