import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import {
  Button,
  Card,
  EmptyState,
  FormError,
  Input,
  ListItem,
  SkeletonGroup,
} from "@/components";
import { OptionPicker } from "@/components/OptionPicker";
import {
  claimTypeSchema,
  createClaimRequestSchema,
  type ClaimType,
} from "@acme/shared";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { createClaim } from "@/api/claims";
import { listPurchases } from "@/api/purchases";
import { fromCaught } from "@/hooks/useApiError";
import { useTheme } from "@/theme/ThemeProvider";

const TYPE_OPTIONS = claimTypeSchema.options.map((t) => ({
  value: t,
  label: t,
}));

export default function NewClaimScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const { tokens } = useTheme();
  const params = useLocalSearchParams<{ purchaseId?: string }>();
  const purchaseId = params.purchaseId;
  const [type, setType] = useState<ClaimType>("return");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<{
    message: string | null | undefined;
    fields: Record<string, string>;
  }>({ message: null, fields: {} });

  const purchaseList = useQuery({
    queryKey: apiKeys.purchases.list({ sort: "createdAt", limit: 50 }),
    queryFn: () => listPurchases(api, { sort: "createdAt", limit: 50 }),
    enabled: !purchaseId,
  });

  const create = useMutation({
    mutationFn: () => {
      if (!purchaseId) throw new Error("Pick a purchase first");
      createClaimRequestSchema.parse({
        purchaseId,
        type,
        reference: reference || undefined,
        notes: notes || undefined,
      });
      return createClaim(api, {
        purchaseId,
        type,
        reference: reference || null,
        notes: notes || null,
        status: "draft",
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["claims"] });
      router.replace("/(tabs)/profile");
    },
    onError: (e) => setError(fromCaught(e)),
  });

  if (!purchaseId) {
    return (
      <>
        <Stack.Screen options={{ title: "New claim" }} />
        <ScrollView
          style={{ flex: 1, backgroundColor: tokens.colors.bg }}
          contentContainerStyle={{
            padding: tokens.spacing.lg,
            gap: tokens.spacing.md,
          }}
        >
          <Card title="Pick a purchase">
            {purchaseList.isLoading ? (
              <SkeletonGroup count={4} />
            ) : (purchaseList.data?.items.length ?? 0) === 0 ? (
              <EmptyState title="No purchases" />
            ) : (
              <View style={{ gap: tokens.spacing.sm }}>
                {(purchaseList.data?.items ?? []).map((p) => (
                  <ListItem
                    key={p.id}
                    title={p.title}
                    subtitle={p.merchant ?? p.category}
                    onPress={() =>
                      router.replace({
                        pathname: "/claim/new",
                        params: { purchaseId: p.id },
                      })
                    }
                  />
                ))}
              </View>
            )}
          </Card>
        </ScrollView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "New claim" }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: tokens.colors.bg }}
        contentContainerStyle={{
          padding: tokens.spacing.lg,
          gap: tokens.spacing.md,
        }}
      >
        <Card>
          <View style={{ gap: tokens.spacing.md }}>
            <Text style={{ color: tokens.colors.textMuted }}>
              Purchase: {purchaseId}
            </Text>
            <OptionPicker
              label="Type"
              value={type}
              options={TYPE_OPTIONS}
              onChange={(v) => setType(v as ClaimType)}
              error={error.fields["type"]}
            />
            <Input
              label="Reference (order #, case #, etc.)"
              value={reference}
              onChangeText={setReference}
              error={error.fields["reference"]}
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
              label={create.isPending ? "Creating…" : "Open claim"}
              onPress={() => create.mutate()}
              disabled={create.isPending}
            />
          </View>
        </Card>
      </ScrollView>
    </>
  );
}
