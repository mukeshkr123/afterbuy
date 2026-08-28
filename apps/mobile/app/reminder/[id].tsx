import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import {
  AppText,
  Button,
  CategoryArtwork,
  DeadlineCard,
  EmptyState,
  FormError,
  Money,
  ScreenHeader,
  ScreenScroll,
  SectionCard,
  SectionHeading,
  Skeleton,
  StatusPill,
} from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getPurchase } from "@/api/purchases";
import { dismissReminder } from "@/api/reminders";
import { fromCaught, type FormErrorState } from "@/hooks/useApiError";
import { categoryLabel } from "@/lib/purchaseDisplay";
import {
  isReminderUpcoming,
  REMINDER_KIND,
  reminderHistoryPresentation,
  reminderState,
} from "@/lib/reminders";
import { useTheme } from "@/theme/ThemeProvider";
import { useState } from "react";

export default function ReminderDetailScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const { tokens } = useTheme();
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

  if (purchase.isLoading) {
    return (
      <ScreenScroll gap={tokens.spacing.lg}>
        <ScreenHeader title="Reminder" />
        <Skeleton height={120} />
        <Skeleton height={96} />
        <Skeleton height={176} />
      </ScreenScroll>
    );
  }

  if (!purchaseId || !purchase.data) {
    return (
      <ScreenScroll gap={tokens.spacing.lg}>
        <ScreenHeader title="Reminder" />
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
      </ScreenScroll>
    );
  }

  const reminder = purchase.data.reminders.find((item) => item.id === id);
  if (!reminder) {
    return (
      <ScreenScroll gap={tokens.spacing.lg}>
        <ScreenHeader title="Reminder" />
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
      </ScreenScroll>
    );
  }

  const kind = REMINDER_KIND[reminder.kind];
  const state = reminderState(reminder);
  const isUpcoming = isReminderUpcoming(reminder);
  const historyState = reminderHistoryPresentation(reminder);

  const deadlineCards = [
    purchase.data.returnDeadlineAt
      ? {
          key: "return",
          title: "Return window",
          state: reminderState({
            ...reminder,
            fireOn: purchase.data.returnDeadlineAt,
            kind: "return_deadline",
          }),
          tone: "accent" as const,
        }
      : null,
    purchase.data.warrantyExpiresAt
      ? {
          key: "warranty",
          title: "Warranty",
          state: reminderState({
            ...reminder,
            fireOn: purchase.data.warrantyExpiresAt,
            kind: "warranty_expiry",
          }),
          tone: "success" as const,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <ScreenScroll gap={tokens.spacing.lg}>
      <ScreenHeader title="Reminder" />

      <SectionCard>
        <View style={[styles.summaryRow, { gap: tokens.spacing.lg }]}>
          <CategoryArtwork category={purchase.data.category} size="md" />
          <View style={styles.summaryCopy}>
            <AppText role="title" tone="strong">
              {purchase.data.title}
            </AppText>
            <AppText role="subheadline" tone="subtle">
              {[purchase.data.merchant, categoryLabel(purchase.data.category)]
                .filter(Boolean)
                .join(" · ")}
            </AppText>
            <AppText role="caption" tone="subtle">
              {kind.label} reminder
            </AppText>
            {purchase.data.amountMinor != null &&
            purchase.data.amountMinor > 0 ? (
              <Money
                amountMinor={purchase.data.amountMinor}
                currency={purchase.data.currency}
                emphasis="strong"
                style={{ fontSize: tokens.type.headline.fontSize }}
              />
            ) : null}
          </View>
          <StatusPill
            label={
              isUpcoming ? (state?.detail ?? "Upcoming") : historyState.label
            }
            tone={
              isUpcoming
                ? state?.urgent
                  ? "warning"
                  : "accent"
                : historyState.tone
            }
          />
        </View>

        <View
          style={[
            styles.reminderMeta,
            {
              marginTop: tokens.spacing.lg,
              paddingTop: tokens.spacing.lg,
              borderTopColor: tokens.colors.border,
            },
          ]}
        >
          <View style={styles.metaCopy}>
            <AppText role="caption" tone="muted">
              Reminder schedule
            </AppText>
            <AppText role="headline" tone="strong">
              {state?.label ?? reminder.fireOn}
            </AppText>
          </View>
          <AppText role="caption" tone="subtle" style={styles.metaDetail}>
            {isUpcoming ? (state?.detail ?? "Upcoming") : historyState.detail}
          </AppText>
        </View>
      </SectionCard>

      <View style={{ gap: tokens.spacing.md }}>
        <SectionHeading
          title="Deadlines"
          detail="Built from the purchase dates already on file."
        />
        {deadlineCards.length > 0 ? (
          <View style={{ gap: tokens.spacing.md }}>
            {deadlineCards.map((card) =>
              card.state ? (
                <DeadlineCard
                  key={card.key}
                  title={card.title}
                  dateLabel={card.state.label}
                  detail={card.state.detail}
                  tone={card.state.urgent ? "warning" : card.tone}
                />
              ) : null
            )}
          </View>
        ) : (
          <SectionCard tone="muted">
            <AppText role="subheadline" tone="subtle">
              This purchase does not have a return or warranty deadline on
              record.
            </AppText>
          </SectionCard>
        )}
      </View>

      <View style={{ gap: tokens.spacing.md }}>
        <SectionHeading
          title="Next steps"
          detail="Use the existing purchase actions without leaving context."
        />
        <Button
          label="View purchase"
          onPress={() =>
            router.push({
              pathname: "/purchase/[id]",
              params: { id: purchase.data.id },
            })
          }
        />
        <Button
          label="Start claim"
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: "/claim/new",
              params: { purchaseId: purchase.data.id },
            })
          }
        />
        <Button
          label="Reminder timing"
          variant="secondary"
          onPress={() => router.push("/settings/lead-days")}
        />
        {isUpcoming ? (
          <Button
            label="Dismiss reminder"
            variant="danger"
            busy={dismiss.isPending}
            onPress={() => dismiss.mutate()}
          />
        ) : null}
        <FormError message={error.message} />
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryCopy: {
    flex: 1,
    gap: 2,
  },
  reminderMeta: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  metaCopy: {
    gap: 2,
  },
  metaDetail: {
    maxWidth: "90%",
  },
});
