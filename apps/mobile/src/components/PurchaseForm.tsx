import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  PURCHASE_CATEGORIES,
  PURCHASE_DELIVERY_STATUSES,
  createPurchaseRequestSchema,
  type CategoryMetaListResponse,
  type CreatePurchaseRequest,
  type PurchaseCategory,
  type PurchaseDeliveryStatus,
  type PurchaseDetailResponse,
} from "@acme/shared";
import { AppText, Button, Card, CategoryArtwork, Sheet } from "@/components";
import { FormError } from "./FormError";
import { Input } from "./Input";
import { useApi } from "@/api/ApiProvider";
import { getCategories } from "@/api/categories";
import { fromCaught } from "@/hooks/useApiError";
import { deriveReturnDeadline, todayIso } from "@/lib/date";
import {
  categoryLabel,
  deliveryDisplay,
  formatDate,
} from "@/lib/purchaseDisplay";
import { useTheme } from "../theme/ThemeProvider";

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month, 1)));
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function parseIsoParts(value: string | null | undefined) {
  const source = value || todayIso();
  const [year = 2000, month = 1, day = 1] = source.split("-").map(Number);
  return { year, month: month - 1, day };
}

/**
 * Amount input in major units.
 *
 * The API stores minor units, but asking a user for "1499" when they paid
 * $14.99 is a data-entry trap. The typed string is kept locally so partial
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
      density="compact"
      labelAccessory={
        <AppText role="caption" tone="subtle">
          Optional
        </AppText>
      }
      value={text}
      placeholder="0.00"
      keyboardType="decimal-pad"
      onChangeText={(next) => {
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

function FormTrigger({
  label,
  value,
  placeholder,
  icon,
  error,
  onPress,
}: {
  label: string;
  value: string | null | undefined;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  error?: string | undefined;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  const display = value || placeholder;
  return (
    <View style={{ gap: tokens.spacing.xs }}>
      <AppText role="label" weight="600">
        {label}
      </AppText>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${display}`}
        style={({ pressed }) => [
          styles.trigger,
          {
            borderColor: error ? tokens.colors.danger : tokens.colors.border,
            backgroundColor: tokens.colors.surface,
            borderRadius: tokens.radius.lg,
            paddingHorizontal: tokens.spacing.md,
            opacity: pressed ? 0.82 : 1,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color: value ? tokens.colors.text : tokens.colors.textMuted,
            fontSize: tokens.type.body.fontSize,
          }}
        >
          {display}
        </Text>
        <Ionicons name={icon} size={19} color={tokens.colors.icon} />
      </Pressable>
      {error ? (
        <AppText role="label" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

function CategoryPicker({
  value,
  onChange,
  error,
}: {
  value: PurchaseCategory;
  onChange: (next: PurchaseCategory) => void;
  error?: string | undefined;
}) {
  const { tokens } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const options = useMemo(
    () =>
      PURCHASE_CATEGORIES.filter((category) =>
        categoryLabel(category)
          .toLowerCase()
          .includes(query.trim().toLowerCase())
      ),
    [query]
  );

  return (
    <>
      <FormTrigger
        label="Category"
        value={categoryLabel(value)}
        placeholder="Choose category"
        icon="chevron-forward"
        error={error}
        onPress={() => setOpen(true)}
      />
      <Sheet visible={open} onRequestClose={() => setOpen(false)}>
        <View style={{ gap: tokens.spacing.md }}>
          <SheetHeader title="Choose category" onClose={() => setOpen(false)} />
          <Input
            label="Search"
            density="compact"
            value={query}
            placeholder="Search categories"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setQuery}
          />
          <FlatList
            data={options}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 390 }}
            ItemSeparatorComponent={() => (
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: tokens.colors.border,
                }}
              />
            )}
            ListEmptyComponent={
              <View style={{ paddingVertical: tokens.spacing.xl }}>
                <AppText
                  role="body"
                  tone="subtle"
                  style={{ textAlign: "center" }}
                >
                  No categories match that search.
                </AppText>
              </View>
            }
            renderItem={({ item }) => {
              const selected = item === value;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.categoryRow,
                    {
                      backgroundColor: selected
                        ? tokens.colors.accentSoft
                        : "transparent",
                      opacity: pressed ? 0.78 : 1,
                    },
                  ]}
                >
                  <CategoryArtwork category={item} size="sm" />
                  <AppText
                    role="body"
                    weight={selected ? "700" : "500"}
                    tone={selected ? "accent" : "default"}
                    style={{ flex: 1 }}
                  >
                    {categoryLabel(item)}
                  </AppText>
                  {selected ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={tokens.colors.primary}
                    />
                  ) : null}
                </Pressable>
              );
            }}
          />
        </View>
      </Sheet>
    </>
  );
}

function PurchaseDatePicker({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  error?: string | undefined;
}) {
  const { tokens } = useTheme();
  const [open, setOpen] = useState(false);
  const initial = parseIsoParts(value);
  const [viewMonth, setViewMonth] = useState(initial.month);
  const [viewYear, setViewYear] = useState(initial.year);
  const [draft, setDraft] = useState(value || todayIso());

  useEffect(() => {
    if (!open) return;
    const next = parseIsoParts(value);
    setViewYear(next.year);
    setViewMonth(next.month);
    setDraft(value || todayIso());
  }, [open, value]);

  const cells = useMemo(() => {
    const firstWeekday = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay();
    const count = daysInMonth(viewYear, viewMonth);
    return [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from({ length: count }, (_, index) => index + 1),
    ];
  }, [viewMonth, viewYear]);

  const display = formatDate(value);

  const setQuickDate = (next: string) => {
    const parsed = parseIsoParts(next);
    setDraft(next);
    setViewYear(parsed.year);
    setViewMonth(parsed.month);
  };

  return (
    <>
      <FormTrigger
        label={label}
        value={display}
        placeholder="Choose date"
        icon="calendar-outline"
        error={error}
        onPress={() => setOpen(true)}
      />
      <Sheet visible={open} onRequestClose={() => setOpen(false)}>
        <View style={{ gap: tokens.spacing.md }}>
          <SheetHeader title={label} onClose={() => setOpen(false)} />
          <View style={styles.quickRow}>
            {(
              [
                ["Today", todayIso()],
                ["Yesterday", addDays(todayIso(), -1)],
                ["Last 7 days", addDays(todayIso(), -6)],
              ] satisfies ReadonlyArray<readonly [string, string]>
            ).map(([quickLabel, quickValue]) => (
              <Pressable
                key={quickLabel}
                onPress={() => setQuickDate(quickValue)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.quickChip,
                  {
                    borderColor: tokens.colors.border,
                    backgroundColor:
                      draft === quickValue
                        ? tokens.colors.accentSoft
                        : tokens.colors.surfaceMuted,
                    opacity: pressed ? 0.78 : 1,
                  },
                ]}
              >
                <AppText
                  role="label"
                  weight="700"
                  tone={draft === quickValue ? "accent" : "default"}
                >
                  {quickLabel}
                </AppText>
              </Pressable>
            ))}
          </View>

          <View style={styles.monthHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              onPress={() => {
                if (viewMonth === 0) {
                  setViewMonth(11);
                  setViewYear((current) => current - 1);
                } else {
                  setViewMonth((current) => current - 1);
                }
              }}
              style={styles.iconButton}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={tokens.colors.icon}
              />
            </Pressable>
            <AppText role="headline" weight="800">
              {monthLabel(viewYear, viewMonth)}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              onPress={() => {
                if (viewMonth === 11) {
                  setViewMonth(0);
                  setViewYear((current) => current + 1);
                } else {
                  setViewMonth((current) => current + 1);
                }
              }}
              style={styles.iconButton}
            >
              <Ionicons
                name="chevron-forward"
                size={22}
                color={tokens.colors.icon}
              />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
              <AppText
                key={`${day}-${index}`}
                role="caption"
                tone="subtle"
                weight="700"
                style={styles.weekLabel}
              >
                {day}
              </AppText>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {cells.map((day, index) => {
              const iso = day
                ? `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                : null;
              const selected = iso === draft;
              return (
                <Pressable
                  key={`${viewYear}-${viewMonth}-${index}`}
                  disabled={!day}
                  accessibilityRole={day ? "button" : undefined}
                  accessibilityState={{ selected }}
                  accessibilityLabel={
                    iso ? (formatDate(iso) ?? iso) : undefined
                  }
                  onPress={() => iso && setDraft(iso)}
                  style={({ pressed }) => [
                    styles.dayCell,
                    {
                      backgroundColor: selected
                        ? tokens.colors.primary
                        : "transparent",
                      opacity: pressed ? 0.75 : day ? 1 : 0,
                    },
                  ]}
                >
                  {day ? (
                    <AppText
                      role="label"
                      weight={selected ? "800" : "600"}
                      style={{
                        color: selected
                          ? tokens.colors.onPrimary
                          : tokens.colors.text,
                      }}
                    >
                      {day}
                    </AppText>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <View style={{ gap: tokens.spacing.sm }}>
            <Button
              label="Done"
              size="lg"
              onPress={() => {
                onChange(draft);
                setOpen(false);
              }}
            />
          </View>
        </View>
      </Sheet>
    </>
  );
}

function SheetHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <View style={styles.sheetHeader}>
      <AppText role="headline" weight="800">
        {title}
      </AppText>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
        hitSlop={8}
        style={({ pressed }) => [
          styles.iconButton,
          { opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Ionicons name="close" size={22} color={tokens.colors.icon} />
      </Pressable>
    </View>
  );
}

export interface PurchaseFormProps {
  initial?: Partial<CreatePurchaseRequest>;
  onSubmit: (data: CreatePurchaseRequest) => Promise<PurchaseDetailResponse>;
  submitLabel: string;
  onDirtyChange?: (isDirty: boolean) => void;
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

  const [serverError, setServerError] = useState<{
    message: string | null | undefined;
    fields: Record<string, string>;
  }>({ message: null, fields: {} });

  useEffect(() => {
    onDirtyChange?.(formState.isDirty);
  }, [formState.isDirty, onDirtyChange]);

  const category = watch("category");
  const returnDeadlineAt = watch("returnDeadlineAt");
  useEffect(() => {
    if (!returnDeadlineAt && category) {
      const iso = deriveReturnDeadline(category, defaults);
      if (iso) setValue("returnDeadlineAt", iso);
    }
  }, [category, returnDeadlineAt, defaults, setValue]);

  const submit = handleSubmit(async (data) => {
    setServerError({ message: null, fields: {} });
    try {
      await onSubmit(data);
    } catch (e) {
      setServerError(fromCaught(e));
    }
  });

  const fields = (
    <View style={{ gap: tokens.spacing.md }}>
      <View style={{ gap: tokens.spacing.md }}>
        <Controller
          control={control}
          name="title"
          render={({ field, fieldState }) => (
            <Input
              label="Title"
              density="compact"
              value={field.value ?? ""}
              placeholder="Wireless headphones"
              onChangeText={field.onChange}
              error={fieldState.error?.message ?? serverError.fields.title}
            />
          )}
        />
        <Controller
          control={control}
          name="merchant"
          render={({ field, fieldState }) => (
            <Input
              label="Merchant"
              density="compact"
              labelAccessory={
                <AppText role="caption" tone="subtle">
                  Optional
                </AppText>
              }
              value={field.value ?? ""}
              placeholder="Best Buy"
              onChangeText={field.onChange}
              error={fieldState.error?.message ?? serverError.fields.merchant}
            />
          )}
        />
        <Controller
          control={control}
          name="category"
          render={({ field, fieldState }) => (
            <CategoryPicker
              value={(field.value ?? "other") as PurchaseCategory}
              onChange={field.onChange}
              error={fieldState.error?.message ?? serverError.fields.category}
            />
          )}
        />
        <Controller
          control={control}
          name="purchaseDate"
          render={({ field, fieldState }) => (
            <PurchaseDatePicker
              label="Purchase date"
              value={field.value ?? ""}
              onChange={field.onChange}
              error={
                fieldState.error?.message ?? serverError.fields.purchaseDate
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
                fieldState.error?.message ?? serverError.fields.amountMinor
              }
            />
          )}
        />
      </View>

      <Pressable
        onPress={() => setShowOptional((current) => !current)}
        accessibilityRole="button"
        accessibilityState={{ expanded: showOptional }}
        style={({ pressed }) => [
          styles.sectionToggle,
          {
            backgroundColor: tokens.colors.surface,
            borderColor: tokens.colors.border,
            borderRadius: tokens.radius.lg,
            paddingHorizontal: tokens.spacing.md,
            paddingVertical: tokens.spacing.md,
            opacity: pressed ? 0.84 : 1,
          },
        ]}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <AppText role="subheadline" weight="700">
            Protection & delivery
          </AppText>
          <AppText role="caption" tone="subtle">
            Advanced details for tracking, returns, warranty, and notes
          </AppText>
        </View>
        <Ionicons
          name={showOptional ? "chevron-up" : "chevron-down"}
          size={21}
          color={tokens.colors.icon}
        />
      </Pressable>

      {showOptional ? (
        <View style={{ gap: tokens.spacing.md }}>
          <Controller
            control={control}
            name="deliveryStatus"
            render={({ field, fieldState }) => (
              <DeliveryStatusPicker
                value={(field.value ?? "ordered") as PurchaseDeliveryStatus}
                onChange={field.onChange}
                error={
                  fieldState.error?.message ?? serverError.fields.deliveryStatus
                }
              />
            )}
          />
          <Controller
            control={control}
            name="carrier"
            render={({ field, fieldState }) => (
              <Input
                label="Carrier"
                density="compact"
                labelAccessory={
                  <AppText role="caption" tone="subtle">
                    Optional
                  </AppText>
                }
                value={field.value ?? ""}
                placeholder="UPS, FedEx, DHL"
                onChangeText={field.onChange}
                error={fieldState.error?.message ?? serverError.fields.carrier}
              />
            )}
          />
          <Controller
            control={control}
            name="trackingNumber"
            render={({ field, fieldState }) => (
              <Input
                label="Tracking number"
                density="compact"
                labelAccessory={
                  <AppText role="caption" tone="subtle">
                    Optional
                  </AppText>
                }
                value={field.value ?? ""}
                placeholder="1Z..."
                autoCapitalize="characters"
                onChangeText={field.onChange}
                error={
                  fieldState.error?.message ?? serverError.fields.trackingNumber
                }
              />
            )}
          />
          <Controller
            control={control}
            name="returnDeadlineAt"
            render={({ field, fieldState }) => (
              <PurchaseDatePicker
                label="Return deadline"
                value={field.value ?? ""}
                onChange={field.onChange}
                error={
                  fieldState.error?.message ??
                  serverError.fields.returnDeadlineAt
                }
              />
            )}
          />
          <Controller
            control={control}
            name="warrantyExpiresAt"
            render={({ field, fieldState }) => (
              <PurchaseDatePicker
                label="Warranty expires"
                value={field.value ?? ""}
                onChange={field.onChange}
                error={
                  fieldState.error?.message ??
                  serverError.fields.warrantyExpiresAt
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
                density="compact"
                labelAccessory={
                  <AppText role="caption" tone="subtle">
                    Optional
                  </AppText>
                }
                value={field.value ?? ""}
                placeholder="Serial number, return policy, warranty notes"
                onChangeText={field.onChange}
                multiline
                numberOfLines={3}
                error={fieldState.error?.message ?? serverError.fields.notes}
              />
            )}
          />
        </View>
      ) : null}

      <FormError message={serverError.message} />

      <View style={{ height: tokens.spacing.xxl }} />

      <View
        style={[
          styles.submitBar,
          {
            backgroundColor: tokens.colors.canvas,
            borderTopColor: tokens.colors.border,
            paddingTop: tokens.spacing.sm,
          },
        ]}
      >
        <Button
          label={formState.isSubmitting ? "Saving..." : submitLabel}
          size="lg"
          onPress={submit}
          disabled={formState.isSubmitting}
          busy={formState.isSubmitting}
        />
      </View>
    </View>
  );

  if (embedded) return fields;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.colors.canvas }}
      contentContainerStyle={{
        padding: tokens.spacing.md,
        gap: tokens.spacing.md,
      }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Card>{fields}</Card>
    </ScrollView>
  );
}

function DeliveryStatusPicker({
  value,
  onChange,
  error,
}: {
  value: PurchaseDeliveryStatus;
  onChange: (next: PurchaseDeliveryStatus) => void;
  error?: string | undefined;
}) {
  const { tokens } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <FormTrigger
        label="Delivery status"
        value={deliveryDisplay(value).label}
        placeholder="Choose status"
        icon="chevron-forward"
        error={error}
        onPress={() => setOpen(true)}
      />
      <Sheet visible={open} onRequestClose={() => setOpen(false)}>
        <View style={{ gap: tokens.spacing.md }}>
          <SheetHeader title="Delivery status" onClose={() => setOpen(false)} />
          {PURCHASE_DELIVERY_STATUSES.map((status) => {
            const selected = status === value;
            return (
              <Pressable
                key={status}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => {
                  onChange(status);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  styles.statusRow,
                  {
                    backgroundColor: selected
                      ? tokens.colors.accentSoft
                      : tokens.colors.surface,
                    borderColor: tokens.colors.border,
                    opacity: pressed ? 0.78 : 1,
                  },
                ]}
              >
                <AppText
                  role="body"
                  weight={selected ? "800" : "600"}
                  tone={selected ? "accent" : "default"}
                  style={{ flex: 1 }}
                >
                  {deliveryDisplay(status).label}
                </AppText>
                {selected ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={tokens.colors.primary}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 48,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sheetHeader: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickChip: {
    minHeight: 36,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  monthHeader: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  weekRow: {
    flexDirection: "row",
  },
  weekLabel: {
    flex: 1,
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  sectionToggle: {
    minHeight: 56,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusRow: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  submitBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
