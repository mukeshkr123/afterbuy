import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getPurchase, patchPurchase } from "@/api/purchases";
import { PurchaseForm } from "@/components/PurchaseForm";

export default function EditPurchaseScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
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

  if (detail.isLoading) return null;
  if (!detail.data) return null;
  const p = detail.data;
  return (
    <>
      <Stack.Screen options={{ title: "Edit" }} />
      <PurchaseForm
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
    </>
  );
}
