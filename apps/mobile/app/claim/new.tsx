import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEnqueueMutation } from "@/offline";
import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type {
  Claim,
  ClaimType,
  PurchaseDetailResponse,
  PurchaseListResponse,
} from "@acme/shared";
import {
  AppText,
  Button,
  EmptyState,
  FormError,
  IconTile,
  Input,
  ListItem,
  ScreenHeader,
  ScreenScroll,
  SectionCard,
  SegmentedControl,
  Skeleton,
  SkeletonGroup,
  StatusPill,
  useAdaptiveLayout,
} from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { createClaim } from "@/api/claims";
import { getPurchase, listPurchases } from "@/api/purchases";
import { fromCaught, type FormErrorState } from "@/hooks/useApiError";
import { CLAIM_TYPE_LABEL } from "@/lib/claims";
import {
  categoryIcon,
  deliveryDisplay,
  formatDate,
} from "@/lib/purchaseDisplay";
import { useTheme } from "@/theme/ThemeProvider";

const CLAIM_TYPES: Array<{
  value: ClaimType;
  title: string;
  description: string;
  icon: "repeat-outline" | "cash-outline" | "shield-checkmark-outline";
}> = [
  {
    value: "return",
    title: "Return request",
    description:
      "Use this when you need to send an item back before the return window closes.",
    icon: "repeat-outline",
  },
  {
    value: "refund",
    title: "Refund request",
    description:
      "Use this when the purchase should be refunded because the order was wrong or incomplete.",
    icon: "cash-outline",
  },
  {
    value: "warranty",
    title: "Warranty claim",
    description:
      "Use this when the item is faulty and still covered by the recorded warranty.",
    icon: "shield-checkmark-outline",
  },
];

const FLOW_STEPS = [
  { key: "purchase", label: "Choose purchase" },
  { key: "type", label: "Choose claim type" },
  { key: "details", label: "Claim details" },
] as const;

type ClaimStep = (typeof FLOW_STEPS)[number]["key"] | "submitted";

function currentStep({
  purchaseId,
  claimType,
  submittedClaim,
}: {
  purchaseId: string | null;
  claimType: ClaimType | null;
  submittedClaim: Claim | null;
}): ClaimStep {
  if (submittedClaim) return "submitted";
  if (!purchaseId) return "purchase";
  if (!claimType) return "type";
  return "details";
}

export default function NewClaimScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const { tokens } = useTheme();
  const params = useLocalSearchParams<{
    purchaseId?: string;
    claimType?: ClaimType;
  }>();

  const [purchaseId, setPurchaseId] = useState(params.purchaseId ?? null);
  const [claimType, setClaimType] = useState<ClaimType | null>(
    params.claimType ?? null
  );
  const [notes, setNotes] = useState("");
  const [submittedClaim, setSubmittedClaim] = useState<Claim | null>(null);
  const [error, setError] = useState<FormErrorState>({
    message: null,
    fields: {},
  });

  const purchase = useQuery({
    queryKey: apiKeys.purchases.detail(purchaseId ?? ""),
    queryFn: () => getPurchase(api, purchaseId ?? ""),
    enabled: Boolean(purchaseId),
  });

  const mutation = useEnqueueMutation<void, Claim>({
    build: () => {
      if (!purchaseId) throw new Error("Choose a purchase first.");
      if (!claimType) throw new Error("Choose a claim type first.");
      return {
        method: "POST",
        endpoint: "/v1/claims",
        body: {
          purchaseId,
          type: claimType,
          status: "submitted",
          notes: notes.trim() || null,
        },
        label: `Create claim for ${purchase.data?.title || purchaseId}`,
      };
    },
    onSuccess: (claim) => {
      void qc.invalidateQueries({ queryKey: ["claims"] });
      void qc.invalidateQueries({ queryKey: ["purchases"] });

      const finalClaim: Claim = {
        ...claim,
        id: claim.id || "",
        purchaseId: claim.purchaseId || purchaseId || "",
        userId: claim.userId || purchase.data?.userId || "",
        type: claim.type || claimType || "other",
        status: claim.status || "submitted",
        openedAt: claim.openedAt || new Date().toISOString(),
        resolvedAt: claim.resolvedAt || null,
        refundAmountMinor: claim.refundAmountMinor || null,
        reference: claim.reference || null,
        notes: claim.notes || notes.trim() || null,
        createdAt: claim.createdAt || new Date().toISOString(),
        updatedAt: claim.updatedAt || new Date().toISOString(),
      };
      setSubmittedClaim(finalClaim);
      setError({ message: null, fields: {} });
    },
    onError: (caught) => setError(fromCaught(caught)),
  });

  const step = currentStep({ purchaseId, claimType, submittedClaim });

  return (
    <ScreenScroll gap={tokens.spacing.xl} safeTop={step !== "purchase"}>
      <ScreenHeader
        title={step === "submitted" ? "Claim submitted" : "New claim"}
        onBack={() => {
          if (step === "submitted") {
            router.replace("/claims");
            return;
          }
          if (step === "details") {
            setClaimType(null);
            return;
          }
          if (step === "type") {
            if (params.purchaseId) router.back();
            else setPurchaseId(null);
            return;
          }
          router.back();
        }}
      />

      {step !== "submitted" ? <FlowHeader step={step} /> : null}

      {step === "purchase" ? (
        <ChoosePurchaseStep
          onSelect={(nextPurchaseId) => {
            setPurchaseId(nextPurchaseId);
            setError({ message: null, fields: {} });
          }}
        />
      ) : null}

      {step === "type" ? (
        <ChooseClaimTypeStep
          purchase={purchase.data}
          purchaseLoading={purchase.isLoading}
          onBackToPurchase={
            params.purchaseId ? undefined : () => setPurchaseId(null)
          }
          onSelect={(nextType) => {
            setClaimType(nextType);
            setError({ message: null, fields: {} });
          }}
        />
      ) : null}

      {step === "details" ? (
        <ClaimDetailsStep
          purchase={purchase.data}
          purchaseLoading={purchase.isLoading}
          claimType={claimType}
          notes={notes}
          error={error}
          pending={mutation.isPending}
          onChangeNotes={setNotes}
          onChangeType={() => setClaimType(null)}
          onSubmit={() => mutation.mutate()}
        />
      ) : null}

      {step === "submitted" && submittedClaim ? (
        <SubmittedStep
          claim={submittedClaim}
          purchase={purchase.data}
          onViewClaims={() => router.replace("/claims")}
          onBackHome={() => router.replace("/(tabs)")}
        />
      ) : null}
    </ScreenScroll>
  );
}

function FlowHeader({ step }: { step: ClaimStep }) {
  const { tokens } = useTheme();
  const activeIndex = FLOW_STEPS.findIndex((item) => item.key === step);

  return (
    <View style={{ gap: tokens.spacing.md }}>
      <AppText role="caption" tone="subtle" weight="700">
        Step {activeIndex + 1} of {FLOW_STEPS.length}
      </AppText>
      <SegmentedControl
        tabs={FLOW_STEPS.map((item) => ({ key: item.key, label: item.label }))}
        activeKey={step}
        onChange={() => {}}
      />
    </View>
  );
}

function ChoosePurchaseStep({
  onSelect,
}: {
  onSelect: (purchaseId: string) => void;
}) {
  const api = useApi();
  const router = useRouter();
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { contentWidth } = useAdaptiveLayout();

  const list = useQuery({
    queryKey: apiKeys.purchases.list({ sort: "createdAt", limit: 50 }),
    queryFn: () => listPurchases(api, { sort: "createdAt", limit: 50 }),
  });

  const items: PurchaseListResponse["items"] = list.data?.items ?? [];

  return (
    <View style={{ marginHorizontal: -(tokens.spacing.xl - 4) }}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={{
          width: "100%",
          maxWidth: contentWidth,
          alignSelf: "center",
          paddingBottom: Math.max(insets.bottom + 12, 16),
          flexGrow: items.length === 0 ? 1 : undefined,
        }}
        ListHeaderComponent={
          <View
            style={{
              paddingHorizontal: tokens.spacing.xl - 4,
              paddingBottom: tokens.spacing.md,
              gap: tokens.spacing.xs,
            }}
          >
            <AppText role="title">Choose purchase</AppText>
            <AppText role="subheadline" tone="subtle">
              Claims always belong to a saved purchase. Start by picking the
              right order.
            </AppText>
          </View>
        }
        ListEmptyComponent={
          <View
            style={{
              paddingHorizontal: tokens.spacing.xl - 4,
              paddingTop: tokens.spacing.lg,
            }}
          >
            {list.isLoading ? (
              <SkeletonGroup count={5} gap={tokens.spacing.md} />
            ) : list.isError ? (
              <SectionCard>
                <View style={{ gap: tokens.spacing.md }}>
                  <View style={{ gap: 4 }}>
                    <AppText role="headline">Couldn't load purchases</AppText>
                    <AppText role="subheadline" tone="subtle">
                      Check your connection and try again.
                    </AppText>
                  </View>
                  <Button
                    label="Try again"
                    variant="secondary"
                    onPress={() => void list.refetch()}
                  />
                </View>
              </SectionCard>
            ) : (
              <EmptyState
                icon="receipt-outline"
                title="No purchases yet"
                message="Add a purchase before filing a claim against it."
                action={{
                  label: "Add purchase",
                  onPress: () => router.push("/purchase/new"),
                }}
              />
            )}
          </View>
        }
        ItemSeparatorComponent={() => (
          <View
            style={{
              height: StyleSheet.hairlineWidth,
              marginLeft: 76,
              backgroundColor: tokens.colors.border,
            }}
          />
        )}
        renderItem={({ item }) => (
          <ListItem
            title={item.title}
            subtitle={
              [item.merchant, formatDate(item.purchaseDate)]
                .filter(Boolean)
                .join(" • ") || null
            }
            detail={deliveryDisplay(item.deliveryStatus).label}
            divider={false}
            leading={
              <IconTile icon={categoryIcon(item.category)} tone="neutral" />
            }
            chevron
            onPress={() => onSelect(item.id)}
          />
        )}
      />
    </View>
  );
}

function ChooseClaimTypeStep({
  purchase,
  purchaseLoading,
  onBackToPurchase,
  onSelect,
}: {
  purchase: PurchaseDetailResponse | undefined;
  purchaseLoading: boolean;
  onBackToPurchase?: (() => void) | undefined;
  onSelect: (claimType: ClaimType) => void;
}) {
  const { tokens } = useTheme();

  return (
    <View style={{ gap: tokens.spacing.lg }}>
      <View style={{ gap: tokens.spacing.xs }}>
        <AppText role="title">Choose claim type</AppText>
        <AppText role="subheadline" tone="subtle">
          Pick the path that best matches what went wrong.
        </AppText>
      </View>

      <PurchaseSummaryCard
        purchase={purchase}
        loading={purchaseLoading}
        actionLabel={onBackToPurchase ? "Change purchase" : undefined}
        onAction={onBackToPurchase}
      />

      <View style={{ gap: tokens.spacing.sm }}>
        {CLAIM_TYPES.map((item) => (
          <Pressable
            key={item.value}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            onPress={() => onSelect(item.value)}
            style={({ pressed }) => [
              styles.optionCard,
              {
                backgroundColor: tokens.colors.surface,
                borderColor: tokens.colors.border,
                borderRadius: tokens.radius.xl,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <View style={styles.optionHeader}>
              <IconTile icon={item.icon} tone="accent" />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText role="headline">{item.title}</AppText>
                <AppText role="subheadline" tone="subtle">
                  {item.description}
                </AppText>
              </View>
              <AppText role="label" tone="accent" weight="700">
                Select
              </AppText>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ClaimDetailsStep({
  purchase,
  purchaseLoading,
  claimType,
  notes,
  error,
  pending,
  onChangeNotes,
  onChangeType,
  onSubmit,
}: {
  purchase: PurchaseDetailResponse | undefined;
  purchaseLoading: boolean;
  claimType: ClaimType | null;
  notes: string;
  error: FormErrorState;
  pending: boolean;
  onChangeNotes: (value: string) => void;
  onChangeType: () => void;
  onSubmit: () => void;
}) {
  const { tokens } = useTheme();

  return (
    <View style={{ gap: tokens.spacing.lg }}>
      <View style={{ gap: tokens.spacing.xs }}>
        <AppText role="title">Claim details</AppText>
        <AppText role="subheadline" tone="subtle">
          Summarize the issue clearly so the claim starts with the right
          context.
        </AppText>
      </View>

      <PurchaseSummaryCard purchase={purchase} loading={purchaseLoading} />

      <SectionCard>
        <View style={{ gap: tokens.spacing.md }}>
          <View style={styles.claimTypeRow}>
            <View style={{ gap: 2 }}>
              <AppText role="label" tone="subtle" weight="700">
                Claim type
              </AppText>
              <AppText role="headline">
                {claimType
                  ? CLAIM_TYPE_LABEL[claimType]
                  : "Choose a claim type"}
              </AppText>
            </View>
            <Pressable accessibilityRole="button" onPress={onChangeType}>
              <AppText role="label" tone="accent" weight="700">
                Change
              </AppText>
            </Pressable>
          </View>
        </View>
      </SectionCard>

      <SectionCard>
        <Input
          label="What went wrong?"
          value={notes}
          onChangeText={onChangeNotes}
          placeholder="Describe the issue, what you expected, and any important timing or condition details."
          multiline
          numberOfLines={6}
          error={error.fields.notes}
        />
      </SectionCard>

      <FormError message={error.message} />

      <Button
        label={pending ? "Submitting..." : "Submit claim"}
        busy={pending}
        disabled={pending}
        size="lg"
        onPress={onSubmit}
      />
    </View>
  );
}

function SubmittedStep({
  claim,
  purchase,
  onViewClaims,
  onBackHome,
}: {
  claim: Claim;
  purchase: PurchaseDetailResponse | undefined;
  onViewClaims: () => void;
  onBackHome: () => void;
}) {
  const { tokens } = useTheme();

  return (
    <View style={{ gap: tokens.spacing.lg }}>
      <SectionCard>
        <View style={{ gap: tokens.spacing.lg }}>
          <IconTile icon="checkmark-circle-outline" tone="success" />
          <View style={{ gap: tokens.spacing.xs }}>
            <AppText role="title">Claim submitted</AppText>
            <AppText role="body" tone="subtle">
              {purchase?.title
                ? `Your ${CLAIM_TYPE_LABEL[claim.type].toLowerCase()} for ${purchase.title} is now in the queue.`
                : "Your claim is now in the queue."}
            </AppText>
          </View>
          <View style={{ gap: tokens.spacing.sm }}>
            <Row label="Type" value={CLAIM_TYPE_LABEL[claim.type]} />
            <Row
              label="Status"
              valueNode={<StatusPill label="Submitted" tone="warning" />}
            />
            <Row
              label="Opened"
              value={
                formatDate(claim.openedAt.slice(0, 10)) ??
                claim.openedAt.slice(0, 10)
              }
            />
          </View>
        </View>
      </SectionCard>

      <View style={{ gap: tokens.spacing.sm }}>
        <Button label="View claims" size="lg" onPress={onViewClaims} />
        <Button label="Back home" variant="secondary" onPress={onBackHome} />
      </View>
    </View>
  );
}

function PurchaseSummaryCard({
  purchase,
  loading,
  actionLabel,
  onAction,
}: {
  purchase: PurchaseDetailResponse | undefined;
  loading: boolean;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
}) {
  const { tokens } = useTheme();

  return (
    <SectionCard>
      {loading ? (
        <View style={{ gap: tokens.spacing.sm }}>
          <Skeleton height={18} width="50%" />
          <Skeleton height={14} width="80%" />
        </View>
      ) : purchase ? (
        <View style={{ gap: tokens.spacing.md }}>
          <View style={styles.optionHeader}>
            <IconTile icon={categoryIcon(purchase.category)} tone="neutral" />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText role="headline">{purchase.title}</AppText>
              <AppText role="subheadline" tone="subtle">
                {[purchase.merchant, formatDate(purchase.purchaseDate)]
                  .filter(Boolean)
                  .join(" • ")}
              </AppText>
            </View>
            {onAction && actionLabel ? (
              <Pressable accessibilityRole="button" onPress={onAction}>
                <AppText role="label" tone="accent" weight="700">
                  {actionLabel}
                </AppText>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.metaRow}>
            <StatusPill
              label={deliveryDisplay(purchase.deliveryStatus).label}
              tone={deliveryDisplay(purchase.deliveryStatus).tone}
            />
            {purchase.returnDeadlineAt ? (
              <AppText role="caption" tone="subtle">
                Return by {formatDate(purchase.returnDeadlineAt)}
              </AppText>
            ) : null}
            {purchase.warrantyExpiresAt ? (
              <AppText role="caption" tone="subtle">
                Warranty until {formatDate(purchase.warrantyExpiresAt)}
              </AppText>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={{ gap: 4 }}>
          <AppText role="headline">Purchase unavailable</AppText>
          <AppText role="subheadline" tone="subtle">
            We couldn't load the purchase you selected.
          </AppText>
        </View>
      )}
    </SectionCard>
  );
}

function Row({
  label,
  value,
  valueNode,
}: {
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <AppText role="subheadline" tone="subtle">
        {label}
      </AppText>
      {valueNode ?? (
        <AppText role="subheadline" weight="600" style={styles.rowValue}>
          {value}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  optionCard: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  metaRow: {
    gap: 6,
  },
  claimTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
  },
  rowValue: {
    flex: 1,
    textAlign: "right",
  },
});
