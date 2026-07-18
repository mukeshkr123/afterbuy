import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  FormError,
  ListItem,
  SkeletonGroup,
  StatusPill,
} from "@/components";
import { OptionPicker } from "@/components/OptionPicker";
import { UndoableToast } from "@/components/UndoableToast";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import {
  deletePurchase,
  getPurchase,
  patchPurchase,
  restorePurchase,
} from "@/api/purchases";
import { PURCHASE_DELIVERY_STATUSES } from "@acme/shared";
import { fromCaught, type FormErrorState } from "@/hooks/useApiError";
import { useTheme } from "@/theme/ThemeProvider";

interface ReceiptLike {
  id: string;
  filename?: string;
}
interface ClaimLike {
  id: string;
  kind: string;
  status: string;
}

export default function PurchaseDetailScreen() {
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
  const [error, setError] = useState<FormErrorState>({
    message: null as string | null | undefined,
    fields: {},
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [undoState, setUndoState] = useState<{
    id: string;
    visible: boolean;
  } | null>(null);

  const setStatus = useMutation({
    mutationFn: (status: string) =>
      patchPurchase(api, id ?? "", {
        deliveryStatus: status as never,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: apiKeys.purchases.detail(id ?? ""),
      });
      void qc.invalidateQueries({ queryKey: ["purchases"] });
      setError({ message: null, fields: {} });
    },
    onError: (e) => setError(fromCaught(e)),
  });

  const softDelete = useMutation({
    mutationFn: () => deletePurchase(api, id ?? ""),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["purchases"] });
      setConfirmDelete(false);
      setUndoState({ id: id ?? "", visible: true });
    },
    onError: (e) => {
      setError(fromCaught(e));
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
      setUndoState(null);
    },
    onError: (e) => setError(fromCaught(e)),
  });

  if (detail.isLoading) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: tokens.colors.bg }}
        contentContainerStyle={{
          padding: tokens.spacing.lg,
          gap: tokens.spacing.md,
        }}
      >
        <SkeletonGroup count={4} />
      </ScrollView>
    );
  }
  if (detail.isError) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: tokens.colors.bg,
          padding: tokens.spacing.lg,
          gap: tokens.spacing.md,
        }}
      >
        <FormError message={fromCaught(detail.error).message} />
        <Button
          label="Back"
          variant="secondary"
          onPress={() => router.back()}
        />
      </View>
    );
  }
  if (!detail.data) return null;
  const p = detail.data;

  return (
    <>
      <Stack.Screen options={{ title: p.title }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: tokens.colors.bg }}
        contentContainerStyle={{
          padding: tokens.spacing.lg,
          gap: tokens.spacing.md,
        }}
      >
        <Card title={p.title}>
          <View style={{ gap: tokens.spacing.xs }}>
            <Text
              style={{
                color: tokens.colors.textMuted,
                fontSize: tokens.type.bodySmall.fontSize,
              }}
            >
              {p.merchant ?? "No merchant"}
            </Text>
            <View style={{ flexDirection: "row", gap: tokens.spacing.sm }}>
              <Badge label={p.category} tone="neutral" />
              <StatusPill
                label={p.deliveryStatus}
                tone={p.deliveryStatus === "delivered" ? "success" : "neutral"}
              />
            </View>
            {p.amountMinor !== null ? (
              <Text
                style={{
                  color: tokens.colors.text,
                  fontSize: tokens.type.body.fontSize,
                }}
              >
                {(p.amountMinor / 100).toLocaleString(undefined, {
                  style: "currency",
                  currency: p.currency,
                })}
              </Text>
            ) : null}
            {p.returnDeadlineAt ? (
              <Text
                style={{
                  color: tokens.colors.text,
                  fontSize: tokens.type.body.fontSize,
                }}
              >
                Return by {p.returnDeadlineAt}
              </Text>
            ) : null}
            {p.warrantyExpiresAt ? (
              <Text
                style={{
                  color: tokens.colors.text,
                  fontSize: tokens.type.body.fontSize,
                }}
              >
                Warranty until {p.warrantyExpiresAt}
              </Text>
            ) : null}
            {p.notes ? (
              <Text
                style={{
                  color: tokens.colors.textMuted,
                  fontSize: tokens.type.bodySmall.fontSize,
                }}
              >
                {p.notes}
              </Text>
            ) : null}
          </View>
        </Card>

        <Card title="Delivery">
          <OptionPicker
            label="Status"
            value={p.deliveryStatus}
            options={PURCHASE_DELIVERY_STATUSES.map((s) => ({
              value: s,
              label: s,
            }))}
            onChange={(v) => setStatus.mutate(v)}
            error={error.fields["deliveryStatus"]}
          />
          <FormError message={error.message} />
        </Card>

        <Card title="Receipts">
          {(p.receipts ?? []).length === 0 ? (
            <EmptyState
              title="No receipts"
              message="Capture one from the camera or gallery."
            />
          ) : (
            <View style={{ gap: tokens.spacing.sm }}>
              {(p.receipts as unknown as ReceiptLike[]).map((r) => (
                <ListItem
                  key={r.id}
                  title={r.filename ?? "Receipt"}
                  subtitle="Tap to view"
                />
              ))}
            </View>
          )}
          <Button
            label="Add receipt"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: "/purchase/[id]/receipts",
                params: { id: p.id },
              })
            }
          />
        </Card>

        <Card title="Claims">
          {(p.claims ?? []).length === 0 ? (
            <EmptyState
              title="No claims"
              message="Open a return or warranty claim (Phase 7)."
            />
          ) : (
            <View style={{ gap: tokens.spacing.sm }}>
              {(p.claims as unknown as ClaimLike[]).map((c) => (
                <ListItem
                  key={c.id}
                  title={c.type}
                  subtitle={`Status: ${c.status}`}
                />
              ))}
            </View>
          )}
          <Button
            label="Open a claim"
            variant="ghost"
            disabled
            onPress={() =>
              router.push({
                pathname: "/purchase/[id]/claims",
                params: { id: p.id },
              })
            }
          />
        </Card>

        <Card title="Actions">
          <View style={{ gap: tokens.spacing.sm }}>
            <Button
              label="Edit"
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: "/purchase/[id]/edit",
                  params: { id: p.id },
                })
              }
            />
            <Button
              label="Delete"
              variant="danger"
              onPress={() => setConfirmDelete(true)}
            />
          </View>
        </Card>
      </ScrollView>

      <Dialog
        visible={confirmDelete}
        title="Delete this purchase?"
        description="Returns and warranties will pause. You can undo this for 5 seconds."
        primaryLabel="Delete"
        destructive
        onPrimary={() => softDelete.mutate()}
        secondaryLabel="Cancel"
        onDismiss={() => setConfirmDelete(false)}
      />
      <UndoableToast
        message={undoState?.visible ? "Purchase deleted" : null}
        actionLabel="Undo"
        onAction={() => undoDelete.mutate()}
        onDismiss={() => setUndoState(null)}
      />
    </>
  );
}
