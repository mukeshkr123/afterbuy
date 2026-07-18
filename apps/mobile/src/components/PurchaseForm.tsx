import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { ScrollView, View } from "react-native";
import {
  PURCHASE_CATEGORIES,
  PURCHASE_DELIVERY_STATUSES,
  createPurchaseRequestSchema,
  type CreatePurchaseRequest,
  type PurchaseDetailResponse,
} from "@acme/shared";
import { Button, Card } from "@/components";
import { DateField } from "./DateField";
import { FormError } from "./FormError";
import { Input } from "./Input";
import { OptionPicker } from "./OptionPicker";
import { useApi } from "@/api/ApiProvider";
import { getCategories } from "@/api/categories";
import { fromCaught } from "@/hooks/useApiError";
import { deriveReturnDeadline, todayIso } from "@/lib/date";
import { useTheme } from "../theme/ThemeProvider";

export interface PurchaseFormProps {
  initial?: Partial<CreatePurchaseRequest>;
  onSubmit: (data: CreatePurchaseRequest) => Promise<PurchaseDetailResponse>;
  submitLabel: string;
}

export function PurchaseForm({
  initial,
  onSubmit,
  submitLabel,
}: PurchaseFormProps) {
  const api = useApi();
  const { tokens } = useTheme();
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(api),
  });
  const defaults = useMemo(
    () =>
      Object.fromEntries(
        (categories.data?.items ?? []).map((c) => [c.category, c])
      ),
    [categories.data]
  );

  const { control, handleSubmit, watch, setValue, formState } =
    useForm<CreatePurchaseRequest>({
      resolver: zodResolver(createPurchaseRequestSchema),
      defaultValues: {
        title: initial?.title ?? "",
        merchant: initial?.merchant,
        category:
          (initial?.category as CreatePurchaseRequest["category"]) ?? "other",
        purchaseDate: initial?.purchaseDate ?? todayIso(),
        amountMinor: initial?.amountMinor,
        currency: initial?.currency ?? "USD",
        notes: initial?.notes,
        deliveryStatus:
          (initial?.deliveryStatus as CreatePurchaseRequest["deliveryStatus"]) ??
          "ordered",
        trackingNumber: initial?.trackingNumber,
        carrier: initial?.carrier,
        warrantyExpiresAt: initial?.warrantyExpiresAt,
        returnDeadlineAt: initial?.returnDeadlineAt,
      },
    });

  // Category-default date prefill: when category changes and the user has
  // not touched returnDeadlineAt, populate it from the server defaults.
  const category = watch("category");
  const returnDeadlineAt = watch("returnDeadlineAt");
  useEffect(() => {
    if (!returnDeadlineAt && category) {
      const iso = deriveReturnDeadline(category, defaults);
      if (iso) setValue("returnDeadlineAt", iso);
    }
  }, [category, returnDeadlineAt, defaults, setValue]);

  const [serverError, setServerError] = useState<{
    message: string | null | undefined;
    fields: Record<string, string>;
  }>({ message: null, fields: {} });

  return (
    <ScrollView
      contentContainerStyle={{
        padding: tokens.spacing.lg,
        gap: tokens.spacing.md,
      }}
    >
      <Card>
        <View style={{ gap: tokens.spacing.md }}>
          <Controller
            control={control}
            name="title"
            render={({ field, fieldState }) => (
              <Input
                label="Title"
                value={field.value ?? ""}
                onChangeText={field.onChange}
                error={fieldState.error?.message ?? serverError.fields["title"]}
              />
            )}
          />
          <Controller
            control={control}
            name="merchant"
            render={({ field, fieldState }) => (
              <Input
                label="Merchant"
                value={field.value ?? ""}
                onChangeText={field.onChange}
                error={
                  fieldState.error?.message ?? serverError.fields["merchant"]
                }
              />
            )}
          />
          <Controller
            control={control}
            name="category"
            render={({ field, fieldState }) => (
              <OptionPicker
                label="Category"
                value={
                  (field.value ??
                    "other") as (typeof PURCHASE_CATEGORIES)[number]
                }
                options={PURCHASE_CATEGORIES.map((c) => ({
                  value: c,
                  label: c,
                }))}
                onChange={field.onChange}
                error={
                  fieldState.error?.message ?? serverError.fields["category"]
                }
              />
            )}
          />
          <Controller
            control={control}
            name="purchaseDate"
            render={({ field, fieldState }) => (
              <DateField
                label="Purchase date"
                value={field.value ?? ""}
                onChange={field.onChange}
                error={
                  fieldState.error?.message ??
                  serverError.fields["purchaseDate"]
                }
              />
            )}
          />
          <Controller
            control={control}
            name="amountMinor"
            render={({ field, fieldState }) => (
              <Input
                label="Amount (minor units, optional)"
                value={
                  field.value !== undefined && field.value !== null
                    ? String(field.value)
                    : ""
                }
                onChangeText={(v) => field.onChange(v ? Number(v) : undefined)}
                keyboardType="number-pad"
                error={
                  fieldState.error?.message ?? serverError.fields["amountMinor"]
                }
              />
            )}
          />
          <Controller
            control={control}
            name="deliveryStatus"
            render={({ field, fieldState }) => (
              <OptionPicker
                label="Delivery status"
                value={
                  (field.value ??
                    "ordered") as (typeof PURCHASE_DELIVERY_STATUSES)[number]
                }
                options={PURCHASE_DELIVERY_STATUSES.map((s) => ({
                  value: s,
                  label: s,
                }))}
                onChange={field.onChange}
                error={
                  fieldState.error?.message ??
                  serverError.fields["deliveryStatus"]
                }
              />
            )}
          />
          <Controller
            control={control}
            name="returnDeadlineAt"
            render={({ field, fieldState }) => (
              <DateField
                label="Return deadline"
                value={field.value ?? ""}
                onChange={field.onChange}
                error={
                  fieldState.error?.message ??
                  serverError.fields["returnDeadlineAt"]
                }
              />
            )}
          />
          <Controller
            control={control}
            name="warrantyExpiresAt"
            render={({ field, fieldState }) => (
              <DateField
                label="Warranty expires"
                value={field.value ?? ""}
                onChange={field.onChange}
                error={
                  fieldState.error?.message ??
                  serverError.fields["warrantyExpiresAt"]
                }
              />
            )}
          />
          <Controller
            control={control}
            name="notes"
            render={({ field, fieldState }) => (
              <Input
                label="Notes (optional)"
                value={field.value ?? ""}
                onChangeText={field.onChange}
                error={fieldState.error?.message ?? serverError.fields["notes"]}
              />
            )}
          />
          <FormError message={serverError.message} />
          <Button
            label={formState.isSubmitting ? "Saving…" : submitLabel}
            onPress={handleSubmit(async (data) => {
              try {
                await onSubmit(data);
              } catch (e) {
                setServerError(fromCaught(e));
              }
            })}
            disabled={formState.isSubmitting}
          />
        </View>
      </Card>
    </ScrollView>
  );
}
