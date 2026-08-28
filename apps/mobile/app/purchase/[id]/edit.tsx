import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import {
  Button,
  Dialog,
  EmptyState,
  FormError,
  ScreenHeader,
  ScreenScroll,
  SectionCard,
  Skeleton,
  UndoableToast,
} from "@/components";
import { PurchaseForm } from "@/components/PurchaseForm";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import {
  deletePurchase,
  getPurchase,
  patchPurchase,
  restorePurchase,
} from "@/api/purchases";
import { fromCaught, type FormErrorState } from "@/hooks/useApiError";
import { useTheme } from "@/theme/ThemeProvider";

export default function EditPurchaseScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const { tokens } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState<FormErrorState>({
    message: null,
    fields: {},
  });

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
      if (router.canGoBack()) router.back();
      else
        router.replace({
          pathname: "/purchase/[id]",
          params: { id: id ?? "" },
        });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePurchase(api, id ?? ""),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["purchases"] });
      setConfirmDelete(false);
      setDeleted(true);
    },
    onError: (caught) => {
      setError(fromCaught(caught));
      setConfirmDelete(false);
    },
  });

  const undoDelete = useMutation({
    mutationFn: () => restorePurchase(api, id ?? ""),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: apiKeys.purchases.detail(id ?? ""),
      });
      void qc.invalidateQueries({ queryKey: ["purchases"] });
      setDeleted(false);
    },
    onError: (caught) => setError(fromCaught(caught)),
  });

  const p = detail.data;

  return (
    <>
      <ScreenScroll gap={tokens.spacing.lg} safeTop={true}>
        <ScreenHeader title="Edit Purchase" />
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
              title="Purchase not available"
              message="We couldn't load this purchase. Check your connection and try again."
              action={{
                label: "Try again",
                onPress: () => void detail.refetch(),
              }}
            />
          </SectionCard>
        ) : (
          <View style={{ gap: tokens.spacing.lg }}>
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
            <Button
              label={
                deleteMutation.isPending ? "Deleting..." : "Delete purchase"
              }
              variant="danger"
              size="lg"
              busy={deleteMutation.isPending}
              disabled={deleteMutation.isPending}
              onPress={() => setConfirmDelete(true)}
            />
            <FormError message={error.message} />
          </View>
        )}
      </ScreenScroll>
      <Dialog
        visible={confirmDelete}
        title="Delete this purchase?"
        description="This removes the purchase from your active list. You can restore it from undo flows where available."
        primaryLabel={deleteMutation.isPending ? "Deleting..." : "Delete"}
        destructive
        onPrimary={() => deleteMutation.mutate()}
        secondaryLabel="Cancel"
        onDismiss={() => setConfirmDelete(false)}
      />
      <UndoableToast
        message={deleted ? "Purchase deleted" : null}
        actionLabel="Undo"
        onAction={() => undoDelete.mutate()}
        onDismiss={() => {
          setDeleted(false);
          router.replace("/(tabs)/purchases");
        }}
      />
    </>
  );
}
