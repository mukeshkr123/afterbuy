import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, View } from "react-native";
import {
  PURCHASE_CATEGORIES,
  PURCHASE_DELIVERY_STATUSES,
  createPurchaseRequestSchema,
  type CreatePurchaseRequest,
  type CategoryMetaListResponse,
  type PurchaseDetailResponse,
} from "@acme/shared";
import { AppText, Button, Card } from "@/components";
import { DateField } from "./DateField";
import { FormError } from "./FormError";
import { Input } from "./Input";
import { OptionPicker } from "./OptionPicker";
import { useApi } from "@/api/ApiProvider";
import { getCategories } from "@/api/categories";
import { fromCaught } from "@/hooks/useApiError";
import { deriveReturnDeadline, todayIso } from "@/lib/date";
import { categoryLabel, deliveryDisplay } from "@/lib/purchaseDisplay";
import { useTheme } from "../theme/ThemeProvider";

/**
 * Amount input in major units.
 *
 * The API stores minor units, but asking a user for "1499" when they paid
 * ₹14.99 is a data-entry trap. The typed string is kept locally so partial
 * input like "14." survives a re-render.
 */
function AmountField({
  initialMinor,
  onChangeMinor,
  error,
}: {
  initialMinor: number | null | undefined;
  onChangeMinor: (next: number | undefined) => void;
  error?: string | undefined;
}) {
  const [text, setText] = useState(
    initialMinor === null || initialMinor === undefined
      ? ""
      : String(initialMinor / 100)
  );

  return (
    <Input
      label="Amount paid"
      labelAccessory={
        <AppText role="caption" tone="subtle">
          Optional
        </AppText>
      }
      value={text}
      placeholder="0.00"
      keyboardType="decimal-pad"
      onChangeText={(next) => {
        // One optional decimal point, at most two decimals.
        const cleaned = next
          .replace(/[^0-9.]/g, "")
          .replace(/(\..*)\./g, "$1")
          .replace(/^(\d*\.\d{2}).+$/, "$1");
        setText(cleaned);
        const major = Number.parseFloat(cleaned);
        onChangeMinor(
          cleaned === "" || Number.isNaN(major)
            ? undefined
            : Math.round(major * 100)
        );
      }}
      error={error}
    />
  );
}

export interface PurchaseFormProps {
  initial?: Partial<CreatePurchaseRequest>;
  onSubmit: (data: CreatePurchaseRequest) => Promise<PurchaseDetailResponse>;
  submitLabel: string;
  onDirtyChange?: (isDirty: boolean) => void;
  /**
   * Render the fields bare, without the surrounding ScrollView and Card. Use
   * when the caller already provides a scrolling page — nesting two scroll
   * views breaks momentum and keyboard avoidance.
   */
  embedded?: boolean | undefined;
}

export function PurchaseForm({
  initial,
  onSubmit,
  submitLabel,
  onDirtyChange,
  embedded = false,
}: PurchaseFormProps) {
  const api = useApi();
  const { tokens } = useTheme();
  const [showOptional, setShowOptional] = useState(
    Boolean(
      initial?.trackingNumber ||
      initial?.carrier ||
      initial?.returnDeadlineAt ||
      initial?.warrantyExpiresAt ||
      initial?.notes
    )
  );
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(api),
  });
  const defaults = useMemo(
    () =>
      Object.fromEntries(
        (
          (categories.data?.items ?? []) as CategoryMetaListResponse["items"]
        ).map((c) => [c.category, c])
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

  useEffect(() => {
    onDirtyChange?.(formState.isDirty);
  }, [formState.isDirty, onDirtyChange]);

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

  const fields = (
    <View style={{ gap: tokens.spacing.md }}>
      <Controller
        control={control}
        name="title"
        render={({ field, fieldState }) => (
          <Input
            label="Title"
            value={field.value ?? ""}
            placeholder="e.g. Wireless Headphones"
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
            placeholder="e.g. Best Buy"
            onChangeText={field.onChange}
            error={fieldState.error?.message ?? serverError.fields["merchant"]}
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
              (field.value ?? "other") as (typeof PURCHASE_CATEGORIES)[number]
            }
            options={PURCHASE_CATEGORIES.map((c) => ({
              value: c,
              label: categoryLabel(c),
            }))}
            onChange={field.onChange}
            error={fieldState.error?.message ?? serverError.fields["category"]}
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
              fieldState.error?.message ?? serverError.fields["purchaseDate"]
            }
          />
        )}
      />
      <Controller
        control={control}
        name="amountMinor"
        render={({ field, fieldState }) => (
          <AmountField
            initialMinor={field.value}
            onChangeMinor={field.onChange}
            error={
              fieldState.error?.message ?? serverError.fields["amountMinor"]
            }
          />
        )}
      />

      <Pressable
        onPress={() => setShowOptional((current) => !current)}
        accessibilityRole="button"
        accessibilityState={{ expanded: showOptional }}
        style={({ pressed }) => [
          {
            minHeight: 52,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: tokens.colors.surface,
            borderColor: tokens.colors.border,
            borderWidth: 1,
            borderRadius: 14,
            paddingHorizontal: tokens.spacing.lg,
            paddingVertical: tokens.spacing.md,
            marginTop: 4,
          },
          pressed && { opacity: 0.8 },
        ]}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <AppText role="headline" weight="600">
            Protection & delivery
          </AppText>
          <AppText role="caption" tone="subtle">
            Return deadline, warranty, delivery and notes
          </AppText>
        </View>
        <AppText role="subheadline" tone="accent" weight="600">
          {showOptional ? "Hide" : "Add details"}
        </AppText>
      </Pressable>

      {showOptional ? (
        <View style={{ gap: tokens.spacing.md, marginTop: 4 }}>
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
                  label: deliveryDisplay(s).label,
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
                label="Notes"
                value={field.value ?? ""}
                placeholder="Serial number, order notes, return policy, etc."
                onChangeText={field.onChange}
                multiline
                numberOfLines={3}
                error={fieldState.error?.message ?? serverError.fields["notes"]}
              />
            )}
          />
        </View>
      ) : null}

      <FormError message={serverError.message} />

      <View style={{ marginTop: 8 }}>
        <Button
          label={formState.isSubmitting ? "Saving…" : submitLabel}
          size="lg"
          onPress={handleSubmit(async (data) => {
            try {
              await onSubmit(data);
            } catch (e) {
              setServerError(fromCaught(e));
            }
          })}
          disabled={formState.isSubmitting}
          busy={formState.isSubmitting}
        />
      </View>
    </View>
  );

  if (embedded) return fields;

  return (
    <ScrollView
      contentContainerStyle={{
        padding: tokens.spacing.lg,
        gap: tokens.spacing.md,
      }}
    >
      <Card>{fields}</Card>
    </ScrollView>
  );
}
