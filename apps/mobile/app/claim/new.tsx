import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEnqueueMutation } from "@/offline";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type {
  Claim,
  ClaimType,
  PurchaseDetailResponse,
  PurchaseListResponse,
} from "@acme/shared";
import {
  EmptyState,
  FormError,
  Skeleton,
  SkeletonGroup,
  useAdaptiveLayout,
} from "@/components";
import { PurchaseArtworkTile } from "@/components/PurchaseArtworkTile";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { createClaim } from "@/api/claims";
import { getPurchase, listPurchases } from "@/api/purchases";
import { fromCaught, type FormErrorState } from "@/hooks/useApiError";
import { CLAIM_TYPE_LABEL } from "@/lib/claims";
import { deliveryDisplay, formatDate } from "@/lib/purchaseDisplay";

const CLAIM_TYPES: Array<{
  value: ClaimType;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    value: "return",
    title: "Return request",
    description: "Send an item back before the return window closes.",
    icon: "sync-outline",
  },
  {
    value: "refund",
    title: "Refund request",
    description: "Request a refund because the order was wrong or incomplete.",
    icon: "card-outline",
  },
  {
    value: "warranty",
    title: "Warranty claim",
    description: "Item is faulty and still covered by the recorded warranty.",
    icon: "shield-checkmark-outline",
  },
];

const FLOW_STEPS = [
  { key: "purchase", label: "1. Purchase" },
  { key: "type", label: "2. Claim type" },
  { key: "details", label: "3. Details" },
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
  const insets = useSafeAreaInsets();
  const { contentWidth } = useAdaptiveLayout();
  const params = useLocalSearchParams<{
    purchaseId?: string;
    type?: ClaimType;
  }>();

  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(
    params.purchaseId ?? null
  );
  const [selectedType, setSelectedType] = useState<ClaimType | null>(
    params.type ?? null
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<FormErrorState>({
    message: null,
    fields: {},
  });
  const [submittedClaim, setSubmittedClaim] = useState<Claim | null>(null);

  const purchase = useQuery({
    queryKey: apiKeys.purchases.detail(selectedPurchaseId ?? ""),
    queryFn: () => getPurchase(api, selectedPurchaseId ?? ""),
    enabled: Boolean(selectedPurchaseId),
  });

  const create = useEnqueueMutation<
    { purchaseId: string; type: ClaimType; notes?: string },
    Claim
  >({
    build: (variables) => ({
      method: "POST",
      endpoint: "/v1/claims",
      body: variables,
      label: `File ${variables.type} claim for purchase`,
      optimisticPatch: {
        queryKey: apiKeys.claims.list({}),
        updater: (prev) => prev,
        rollback: () => undefined,
      },
    }),
    onSuccess: async (created) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["claims"] }),
        selectedPurchaseId
          ? qc.invalidateQueries({
              queryKey: apiKeys.purchases.detail(selectedPurchaseId),
            })
          : Promise.resolve(),
      ]);
      setError({ message: null, fields: {} });
      setSubmittedClaim(created);
    },
    onError: (caught) => setError(fromCaught(caught)),
  });

  const step = currentStep({
    purchaseId: selectedPurchaseId,
    claimType: selectedType,
    submittedClaim,
  });

  const handleBack = () => {
    if (step === "details") {
      setSelectedType(null);
    } else if (step === "type" && !params.purchaseId) {
      setSelectedPurchaseId(null);
    } else {
      if (router.canGoBack()) router.back();
      else router.replace("/claims");
    }
  };

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
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
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

          <Text style={styles.navTitle}>New Claim</Text>

          <View style={styles.navSpacer} />
        </View>

        {/* Step Indicator */}
        {step !== "submitted" ? (
          <View style={styles.stepIndicatorRow}>
            {FLOW_STEPS.map((s, idx) => {
              const active = step === s.key;
              const completed =
                (s.key === "purchase" && Boolean(selectedPurchaseId)) ||
                (s.key === "type" && Boolean(selectedType));

              return (
                <View
                  key={s.key}
                  style={[
                    styles.stepPill,
                    active && styles.stepPillActive,
                    completed && !active && styles.stepPillCompleted,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepPillText,
                      active && styles.stepPillTextActive,
                      completed && !active && styles.stepPillTextCompleted,
                    ]}
                  >
                    {s.label}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}

        {step === "purchase" ? (
          <ChoosePurchaseStep
            onSelect={(id) => {
              setSelectedPurchaseId(id);
              setError({ message: null, fields: {} });
            }}
          />
        ) : null}

        {step === "type" ? (
          <ChooseClaimTypeStep
            purchase={purchase.data}
            purchaseLoading={purchase.isLoading}
            onBackToPurchase={
              params.purchaseId ? undefined : () => setSelectedPurchaseId(null)
            }
            onSelect={(type) => {
              setSelectedType(type);
              setError({ message: null, fields: {} });
            }}
          />
        ) : null}

        {step === "details" && selectedPurchaseId && selectedType ? (
          <ClaimDetailsStep
            purchase={purchase.data}
            purchaseLoading={purchase.isLoading}
            claimType={selectedType}
            notes={notes}
            error={error}
            pending={create.isPending}
            onChangeNotes={setNotes}
            onChangeType={() => setSelectedType(null)}
            onSubmit={() =>
              create.mutate({
                purchaseId: selectedPurchaseId,
                type: selectedType,
                ...(notes.trim() ? { notes: notes.trim() } : {}),
              })
            }
          />
        ) : null}

        {step === "submitted" && submittedClaim ? (
          <SubmittedClaimStep
            claim={submittedClaim}
            purchaseTitle={purchase.data?.title}
            onViewClaims={() => router.replace("/claims")}
            onBackHome={() => router.replace("/")}
          />
        ) : null}
      </ScrollView>
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

  const list = useQuery({
    queryKey: apiKeys.purchases.list({ sort: "createdAt", limit: 50 }),
    queryFn: () => listPurchases(api, { sort: "createdAt", limit: 50 }),
  });

  const items: PurchaseListResponse["items"] = list.data?.items ?? [];

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.sectionHeaderStack}>
        <Text style={styles.sectionTitle}>Choose purchase</Text>
        <Text style={styles.sectionSubtitle}>
          Claims belong to a saved purchase. Pick the right order.
        </Text>
      </View>

      {list.isLoading ? (
        <SkeletonGroup count={3} gap={12} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="No purchases yet"
          message="Add a purchase before filing a claim against it."
          action={{
            label: "Add purchase",
            onPress: () => router.push("/purchase/new"),
          }}
        />
      ) : (
        <View style={{ gap: 10 }}>
          {items.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`Select ${item.title}`}
              onPress={() => onSelect(item.id)}
              style={({ pressed }) => [
                styles.purchaseOptionCard,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <PurchaseArtworkTile
                title={item.title}
                category={item.category}
                size={46}
              />
              <View style={styles.purchaseOptionCopy}>
                <Text numberOfLines={1} style={styles.purchaseOptionTitle}>
                  {item.title}
                </Text>
                <Text numberOfLines={1} style={styles.purchaseOptionSubtitle}>
                  {[item.merchant, formatDate(item.purchaseDate)]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </Pressable>
          ))}
        </View>
      )}
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
  return (
    <View style={{ gap: 18 }}>
      <View style={styles.sectionHeaderStack}>
        <Text style={styles.sectionTitle}>Choose claim type</Text>
        <Text style={styles.sectionSubtitle}>
          Pick the path that best matches what went wrong.
        </Text>
      </View>

      {/* Selected purchase banner */}
      {purchase ? (
        <View style={styles.selectedPurchaseBanner}>
          <PurchaseArtworkTile
            title={purchase.title}
            category={purchase.category}
            size={44}
          />
          <View style={{ flex: 1, gap: 1 }}>
            <Text numberOfLines={1} style={styles.selectedPurchaseTitle}>
              {purchase.title}
            </Text>
            <Text numberOfLines={1} style={styles.selectedPurchaseSubtitle}>
              {purchase.merchant ?? "Saved purchase"}
            </Text>
          </View>
          {onBackToPurchase ? (
            <Pressable onPress={onBackToPurchase} style={styles.changePill}>
              <Text style={styles.changePillText}>Change</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={{ gap: 12 }}>
        {CLAIM_TYPES.map((item) => (
          <Pressable
            key={item.value}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            onPress={() => onSelect(item.value)}
            style={({ pressed }) => [
              styles.claimTypeCard,
              { opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <View style={styles.claimTypeIconBox}>
              <Ionicons name={item.icon} size={22} color="#6366F1" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.claimTypeTitle}>{item.title}</Text>
              <Text style={styles.claimTypeDescription}>
                {item.description}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
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
  claimType: ClaimType;
  notes: string;
  error: FormErrorState;
  pending: boolean;
  onChangeNotes: (text: string) => void;
  onChangeType: () => void;
  onSubmit: () => void;
}) {
  return (
    <View style={{ gap: 18 }}>
      <View style={styles.sectionHeaderStack}>
        <Text style={styles.sectionTitle}>Claim details</Text>
        <Text style={styles.sectionSubtitle}>
          Provide additional context about the claim.
        </Text>
      </View>

      {/* Summary card */}
      <View style={styles.detailsSummaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.typeBadgePill}>
            <Text style={styles.typeBadgeText}>
              {CLAIM_TYPE_LABEL[claimType]}
            </Text>
          </View>
          <Pressable onPress={onChangeType}>
            <Text style={styles.changePillText}>Change type</Text>
          </Pressable>
        </View>

        {purchase ? (
          <View style={styles.purchaseRowMini}>
            <PurchaseArtworkTile
              title={purchase.title}
              category={purchase.category}
              size={40}
            />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={styles.miniTitle}>
                {purchase.title}
              </Text>
              <Text style={styles.miniSubtitle}>
                {purchase.merchant ?? "Saved purchase"}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* Notes Input */}
      <View style={{ gap: 8 }}>
        <Text style={styles.inputLabel}>Reason or notes</Text>
        <TextInput
          value={notes}
          onChangeText={onChangeNotes}
          placeholder="Describe what went wrong or why you need to file this claim..."
          placeholderTextColor="#94A3B8"
          multiline
          numberOfLines={4}
          style={styles.notesInput}
        />
      </View>

      <FormError message={error.message} />

      {/* Submit Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Submit claim"
        onPress={onSubmit}
        disabled={pending}
        style={({ pressed }) => [
          styles.submitButton,
          {
            opacity: pending ? 0.6 : pressed ? 0.88 : 1,
            transform: [{ scale: pressed ? 0.985 : 1 }],
          },
        ]}
      >
        <Text style={styles.submitButtonText}>
          {pending ? "Submitting claim..." : "Submit claim"}
        </Text>
      </Pressable>
    </View>
  );
}

function SubmittedClaimStep({
  claim,
  purchaseTitle,
  onViewClaims,
  onBackHome,
}: {
  claim: Claim;
  purchaseTitle?: string | undefined;
  onViewClaims: () => void;
  onBackHome: () => void;
}) {
  return (
    <View style={{ alignItems: "center", gap: 20, paddingTop: 16 }}>
      {/* Green Checkmark Badge */}
      <View style={styles.checkCircle}>
        <Ionicons name="checkmark" size={44} color="#16A34A" />
      </View>

      <View style={{ alignItems: "center", gap: 6 }}>
        <Text style={styles.submittedTitle}>Claim filed</Text>
        <Text style={styles.submittedSubtitle}>
          Your {CLAIM_TYPE_LABEL[claim.type].toLowerCase()} has been recorded.
        </Text>
      </View>

      {/* Reference Card */}
      <View style={styles.submittedCard}>
        <View style={styles.submittedRow}>
          <Text style={styles.submittedLabel}>Purchase</Text>
          <Text numberOfLines={1} style={styles.submittedValue}>
            {purchaseTitle ?? "Saved purchase"}
          </Text>
        </View>
        {claim.reference ? (
          <>
            <View style={styles.cardDivider} />
            <View style={styles.submittedRow}>
              <Text style={styles.submittedLabel}>Reference</Text>
              <Text style={styles.submittedValue}>{claim.reference}</Text>
            </View>
          </>
        ) : null}
        <View style={styles.cardDivider} />
        <View style={styles.submittedRow}>
          <Text style={styles.submittedLabel}>Status</Text>
          <View style={styles.statusPillSubmitted}>
            <Text style={styles.statusPillTextSubmitted}>Submitted</Text>
          </View>
        </View>
      </View>

      <View style={styles.submittedButtons}>
        <Pressable
          accessibilityRole="button"
          onPress={onViewClaims}
          style={styles.submitButton}
        >
          <Text style={styles.submitButtonText}>View claims</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onBackHome}
          style={styles.backHomeButton}
        >
          <Text style={styles.backHomeText}>Back to home</Text>
        </Pressable>
      </View>
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
  stepIndicatorRow: {
    flexDirection: "row",
    gap: 8,
  },
  stepPill: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepPillActive: {
    backgroundColor: "#775DF5",
    borderColor: "#775DF5",
  },
  stepPillCompleted: {
    backgroundColor: "#EEF2FF",
    borderColor: "#E0E7FF",
  },
  stepPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  stepPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  stepPillTextCompleted: {
    color: "#5B4DF5",
    fontWeight: "600",
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
  purchaseOptionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  purchaseOptionCopy: {
    flex: 1,
    gap: 2,
  },
  purchaseOptionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  purchaseOptionSubtitle: {
    fontSize: 12,
    color: "#64748B",
  },
  selectedPurchaseBanner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  selectedPurchaseTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  selectedPurchaseSubtitle: {
    fontSize: 12,
    color: "#64748B",
  },
  changePill: {
    backgroundColor: "#EEF2FF",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  changePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5B4DF5",
  },
  claimTypeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  claimTypeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  claimTypeTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  claimTypeDescription: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 16,
  },
  detailsSummaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 16,
    gap: 12,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  typeBadgePill: {
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5B4DF5",
  },
  purchaseRowMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#F1F5F9",
  },
  miniTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  miniSubtitle: {
    fontSize: 12,
    color: "#64748B",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  notesInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0F172A",
    minHeight: 96,
    textAlignVertical: "top",
  },
  submitButton: {
    height: 52,
    backgroundColor: "#775DF5",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    shadowColor: "#775DF5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  checkCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  submittedTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
  },
  submittedSubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
  submittedCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: "100%",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  submittedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  submittedLabel: {
    fontSize: 14,
    color: "#64748B",
  },
  submittedValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    maxWidth: 200,
    textAlign: "right",
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#F1F5F9",
  },
  statusPillSubmitted: {
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPillTextSubmitted: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B45309",
  },
  submittedButtons: {
    width: "100%",
    gap: 10,
    marginTop: 8,
  },
  backHomeButton: {
    height: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  backHomeText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
});
