import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ClaimType, PurchaseListResponse } from "@acme/shared";
import {
  Button,
  EmptyState,
  FormError,
  IconTile,
  Input,
  ListItem,
  ScreenHeader,
  ScreenScroll,
  SectionCard,
  SkeletonGroup,
  useAdaptiveLayout,
} from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { createClaim } from "@/api/claims";
import { getPurchase, listPurchases } from "@/api/purchases";
import { fromCaught, type FormErrorState } from "@/hooks/useApiError";
import { useTheme } from "@/theme/ThemeProvider";
import { categoryIcon, formatDate } from "@/lib/purchaseDisplay";

const CLAIM_TYPES: ReadonlyArray<{
  value: ClaimType;
  label: string;
  icon: "shield-checkmark-outline" | "repeat-outline" | "cash-outline";
}> = [
  { value: "warranty", label: "Warranty", icon: "shield-checkmark-outline" },
  { value: "return", label: "Return", icon: "repeat-outline" },
  { value: "refund", label: "Refund", icon: "cash-outline" },
];

export default function NewClaimScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const { tokens } = useTheme();

  const params = useLocalSearchParams<{ purchaseId?: string }>();
  // No default. Filing against the literal purchase "1" was how this screen
  // used to behave when opened from the home screen's "My Claims" tile.
  const purchaseId = params.purchaseId || null;

  const [type, setType] = useState<ClaimType>("warranty");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<FormErrorState>({
    message: null,
    fields: {},
  });

  const purchase = useQuery({
    queryKey: apiKeys.purchases.detail(purchaseId ?? ""),
    queryFn: () => getPurchase(api, purchaseId ?? ""),
    enabled: Boolean(purchaseId),
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (!purchaseId) throw new Error("Choose a purchase first.");
      return createClaim(api, {
        purchaseId,
        type,
        status: "submitted",
        notes: notes.trim() || null,
      });
    },
    onSuccess: (claim) => {
      void qc.invalidateQueries({ queryKey: ["claims"] });
      router.replace({ pathname: "/claim/[id]", params: { id: claim.id } });
    },
    onError: (e) => setError(fromCaught(e)),
  });

  if (!purchaseId) {
    return <ChooseOrder />;
  }

  return (
    <>
      <ScreenScroll gap={tokens.spacing.lg} safeTop={true}>
        <ScreenHeader title="File a Claim" />

        <SectionCard>
          {purchase.isLoading ? (
            <SkeletonGroup count={2} />
          ) : purchase.data ? (
            <View style={[styles.productRow, { gap: tokens.spacing.md + 2 }]}>
              <IconTile
                icon={categoryIcon(purchase.data.category)}
                tone="neutral"
              />
              <View style={{ flex: 1, gap: 3 }}>
                <Text
                  style={{
                    color: tokens.colors.text,
                    fontSize: tokens.type.body.fontSize,
                    fontWeight: "700",
                  }}
                >
                  {purchase.data.title}
                </Text>
                <Text
                  style={{
                    color: tokens.colors.textMuted,
                    fontSize: tokens.type.bodySmall.fontSize,
                  }}
                >
                  {[
                    purchase.data.merchant
                      ? `From ${purchase.data.merchant}`
                      : null,
                    formatDate(purchase.data.purchaseDate),
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={{ color: tokens.colors.textMuted }}>
              Could not load that purchase.
            </Text>
          )}
        </SectionCard>

        <View style={{ gap: tokens.spacing.md - 2 }}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: tokens.colors.text,
                fontSize: tokens.type.bodySmall.fontSize + 1,
              },
            ]}
          >
            Claim Type
          </Text>
          <View style={[styles.segmented, { gap: tokens.spacing.sm + 2 }]}>
            {CLAIM_TYPES.map((t) => {
              const active = type === t.value;
              return (
                <Pressable
                  key={t.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${t.label} claim`}
                  onPress={() => setType(t.value)}
                  style={({ pressed }) => [
                    styles.segment,
                    {
                      backgroundColor: active
                        ? tokens.colors.accentSoft
                        : tokens.colors.surface,
                      borderColor: active
                        ? tokens.colors.accent
                        : tokens.colors.border,
                      borderRadius: tokens.radius.lg,
                      paddingVertical: tokens.spacing.md + 2,
                      gap: tokens.spacing.xs + 2,
                    },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text
                    style={{
                      color: active
                        ? tokens.colors.accent
                        : tokens.colors.textMuted,
                      fontSize: tokens.type.bodySmall.fontSize,
                      fontWeight: active ? "700" : "600",
                    }}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <SectionCard>
          <Input
            label="What went wrong?"
            value={notes}
            onChangeText={setNotes}
            placeholder="Describe the issue or the reason for this claim."
            multiline
            numberOfLines={4}
            error={error.fields["notes"]}
          />
        </SectionCard>

        <FormError message={error.message} />

        <Button
          label={mutation.isPending ? "Submitting…" : "Submit Claim"}
          disabled={mutation.isPending}
          busy={mutation.isPending}
          onPress={() => mutation.mutate()}
        />
      </ScreenScroll>
    </>
  );
}

/**
 * Reached when the screen is opened without a purchaseId — a claim always
 * belongs to a purchase, so ask which one.
 */
function ChooseOrder() {
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
    <View style={{ flex: 1, backgroundColor: tokens.colors.canvas }}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          width: "100%",
          maxWidth: contentWidth,
          alignSelf: "center",
          paddingBottom: Math.max(insets.bottom + 24, 32),
          flexGrow: items.length === 0 ? 1 : undefined,
        }}
        ListHeaderComponent={
          <View
            style={{
              paddingTop: Math.max(
                insets.top + tokens.spacing.sm,
                tokens.spacing.md
              ),
              paddingHorizontal: tokens.spacing.xl - 4,
              paddingBottom: tokens.spacing.md,
              gap: tokens.spacing.sm,
            }}
          >
            <ScreenHeader title="Choose Purchase" />
            <Text
              style={{
                color: tokens.colors.textMuted,
                fontSize: tokens.type.body.fontSize,
                lineHeight: tokens.type.body.lineHeight,
              }}
            >
              Which purchase is this claim about?
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={{ padding: tokens.spacing.xl }}>
            {list.isLoading ? (
              <SkeletonGroup count={5} gap={tokens.spacing.md} />
            ) : (
              <EmptyState
                icon="receipt-outline"
                title="No purchases yet"
                message="Add a purchase before filing a claim against it."
                action={{
                  label: "Add a purchase",
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
            divider={false}
            leading={
              <IconTile icon={categoryIcon(item.category)} tone="neutral" />
            }
            chevron
            onPress={() =>
              router.replace({
                pathname: "/claim/new",
                params: { purchaseId: item.id },
              })
            }
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  productRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontWeight: "700",
  },
  segmented: {
    flexDirection: "row",
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    minHeight: 48,
  },
});
