import { useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Button, Card, FormError, Input } from "@/components";
import { OptionPicker } from "@/components/OptionPicker";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getMe } from "@/api/auth";
import { useQuery } from "@tanstack/react-query";
import { fromCaught } from "@/hooks/useApiError";
import { useTheme } from "@/theme/ThemeProvider";
import { useEnqueueMutation } from "@/offline";

const PRESETS: Array<{ value: string; label: string }> = [
  { value: "1", label: "1 day" },
  { value: "3", label: "3 days" },
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
];

export default function LeadDaysScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const { tokens } = useTheme();
  const me = useQuery({ queryKey: apiKeys.me(), queryFn: () => getMe(api) });
  const [value, setValue] = useState<string>(
    me.data ? String(me.data.reminderLeadDays) : "7"
  );
  const [error, setError] = useState<{ message: string | null | undefined }>({
    message: null,
  });

  const save = useEnqueueMutation<{ reminderLeadDays: number }, unknown>({
    build: (input) => ({
      method: "PATCH",
      endpoint: "/v1/me",
      body: input,
      label: `Set lead time to ${input.reminderLeadDays} days`,
      optimisticPatch: {
        queryKey: apiKeys.me(),
        updater: (prev) =>
          prev && typeof prev === "object"
            ? {
                ...(prev as Record<string, unknown>),
                reminderLeadDays: input.reminderLeadDays,
              }
            : prev,
        rollback: () => undefined,
      },
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: apiKeys.me() });
      router.back();
    },
    onError: (e) => setError({ message: fromCaught(e).message }),
  });

  return (
    <>
      <Stack.Screen options={{ title: "Reminder lead time" }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: tokens.colors.bg }}
        contentContainerStyle={{
          padding: tokens.spacing.lg,
          gap: tokens.spacing.md,
        }}
      >
        <Card>
          <View style={{ gap: tokens.spacing.md }}>
            <Input
              label="Days before deadline"
              value={value}
              onChangeText={setValue}
              keyboardType="number-pad"
            />
            <OptionPicker
              label="Quick presets"
              value={
                (PRESETS.find((p) => p.value === value)?.value ?? "7") as never
              }
              options={PRESETS}
              onChange={(v) => setValue(v)}
            />
            <FormError message={error.message} />
            <Button
              label={save.isPending ? "Saving…" : "Save"}
              onPress={() => save.mutate({ reminderLeadDays: Number(value) })}
              disabled={save.isPending}
            />
          </View>
        </Card>
      </ScrollView>
    </>
  );
}
