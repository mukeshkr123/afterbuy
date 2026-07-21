import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  EmptyState,
  ScreenHeader,
  ScreenScroll,
  SectionCard,
  Skeleton,
} from "@/components";
import { PurchaseForm } from "@/components/PurchaseForm";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getPurchase, patchPurchase } from "@/api/purchases";
import { useTheme } from "@/theme/ThemeProvider";

export default function EditPurchaseScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const { tokens } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const detail = useQuery({
    queryKey: apiKeys.purchases.detail(id ?? ""),
    queryFn: () => getPurchase(api, id ?? ""),
    enabled: Boolean(id),
  });

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof patchPurchase>[2]) =>
      patchPurchase(api, id ?? "", data),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: apiKeys.purchases.detail(id ?? ""),
      });
      void qc.invalidateQueries({ queryKey: ["purchases"] });
      router.back();
    },
  });

  const p = detail.data;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenScroll gap={tokens.spacing.lg + 2}>
        <ScreenHeader title="Edit Order" />

        {detail.isLoading ? (
          // This screen used to render `null` while loading, so it looked
          // like a blank page rather than a page that was still arriving.
          <>
            <Skeleton height={72} />
            <Skeleton height={72} />
            <Skeleton height={72} />
          </>
        ) : !p ? (
          <SectionCard>
            <EmptyState
              icon="alert-circle-outline"
              title="Order not available"
              message="We couldn't load this order. Check your connection and try again."
              action={{
                label: "Try again",
                onPress: () => void detail.refetch(),
              }}
            />
          </SectionCard>
        ) : (
          <SectionCard title="Order details">
            <PurchaseForm
              embedded
              initial={{
                title: p.title,
                merchant: p.merchant ?? undefined,
                category: p.category,
                purchaseDate: p.purchaseDate,
                amountMinor: p.amountMinor ?? undefined,
                currency: p.currency,
                notes: p.notes ?? undefined,
                deliveryStatus: p.deliveryStatus,
                trackingNumber: p.trackingNumber ?? undefined,
                carrier: p.carrier ?? undefined,
                warrantyExpiresAt: p.warrantyExpiresAt ?? undefined,
                returnDeadlineAt: p.returnDeadlineAt ?? undefined,
              }}
              onSubmit={(d) => mutation.mutateAsync(d)}
              submitLabel="Save changes"
            />
          </SectionCard>
        )}
      </ScreenScroll>
    </>
  );
}
