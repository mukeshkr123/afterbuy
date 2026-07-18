import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import {
  Button,
  Card,
  EmptyState,
  FormError,
  Input,
  SkeletonGroup,
  StatusPill,
} from "@/components";
import { OptionPicker } from "@/components/OptionPicker";
import { claimStatusSchema, type ClaimStatus } from "@acme/shared";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getClaim, patchClaim } from "@/api/claims";
import { nextStatuses, statusTone } from "@/lib/claims";
import { fromCaught } from "@/hooks/useApiError";
import { useTheme } from "@/theme/ThemeProvider";

export default function ClaimDetailScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const { tokens } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const claim = useQuery({
    queryKey: apiKeys.claims.detail(id ?? ""),
    queryFn: () => getClaim(api, id ?? ""),
    enabled: Boolean(id),
  });
  const [status, setStatus] = useState<ClaimStatus | null>(null);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [refund, setRefund] = useState("");
  const [error, setError] = useState<{
    message: string | null | undefined;
    fields: Record<string, string>;
  }>({ message: null, fields: {} });

  useEffect(() => {
    if (claim.data) {
      setStatus(claim.data.status);
      setReference(claim.data.reference ?? "");
      setNotes(claim.data.notes ?? "");
      setRefund(
        claim.data.refundAmountMinor !== null
          ? String(claim.data.refundAmountMinor)
          : ""
      );
    }
  }, [claim.data]);

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {};
      if (status && status !== claim.data?.status) body["status"] = status;
      if (reference !== (claim.data?.reference ?? ""))
        body["reference"] = reference || null;
      if (notes !== (claim.data?.notes ?? "")) body["notes"] = notes || null;
      const refundValue = refund
        ? Number(refund)
        : (claim.data?.refundAmountMinor ?? null);
      if (refundValue !== claim.data?.refundAmountMinor)
        body["refundAmountMinor"] = refundValue;
      return patchClaim(api, id ?? "", body as never);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["claims"] });
      void qc.invalidateQueries({ queryKey: ["purchases"] });
      router.back();
    },
    onError: (e) => setError(fromCaught(e)),
  });

  if (claim.isLoading) {
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
  if (claim.isError || !claim.data) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: tokens.colors.bg,
          padding: tokens.spacing.lg,
          gap: tokens.spacing.md,
        }}
      >
        <EmptyState
          title="Couldn't load claim"
          message={fromCaught(claim.error).message ?? "Not found."}
        />
        <Button
          label="Back"
          variant="secondary"
          onPress={() => router.back()}
        />
      </View>
    );
  }

  const c = claim.data;
  const legal = status ? nextStatuses(status) : nextStatuses(c.status);
  const statusOptions = legal.map((s) => ({ value: s, label: s }));

  return (
    <>
      <Stack.Screen options={{ title: c.type }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: tokens.colors.bg }}
        contentContainerStyle={{
          padding: tokens.spacing.lg,
          gap: tokens.spacing.md,
        }}
      >
        <Card title={`${c.type}`}>
          <View style={{ gap: tokens.spacing.sm }}>
            <StatusPill label={c.status} tone={statusTone(c.status)} />
            <Text
              style={{
                color: tokens.colors.textMuted,
                fontSize: tokens.type.bodySmall.fontSize,
              }}
            >
              Opened: {c.openedAt}
            </Text>
            {c.resolvedAt ? (
              <Text
                style={{
                  color: tokens.colors.textMuted,
                  fontSize: tokens.type.bodySmall.fontSize,
                }}
              >
                Resolved: {c.resolvedAt}
              </Text>
            ) : null}
          </View>
        </Card>

        <Card title="Update">
          <View style={{ gap: tokens.spacing.md }}>
            <OptionPicker
              label="Status"
              value={(status ?? c.status) as ClaimStatus}
              options={[
                ...statusOptions,
                { value: c.status, label: `${c.status} (current)` },
              ]}
              onChange={(v) => setStatus(v as ClaimStatus)}
              error={error.fields["status"]}
            />
            <Input
              label="Reference"
              value={reference}
              onChangeText={setReference}
              error={error.fields["reference"]}
            />
            <Input
              label="Refund amount (minor units)"
              value={refund}
              onChangeText={setRefund}
              keyboardType="number-pad"
              error={error.fields["refundAmountMinor"]}
            />
            <Input
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              error={error.fields["notes"]}
            />
            <FormError message={error.message} />
            <Button
              label={save.isPending ? "Saving…" : "Save changes"}
              onPress={() => save.mutate()}
              disabled={save.isPending || legal.length === 0}
            />
          </View>
        </Card>
      </ScrollView>
    </>
  );
}
