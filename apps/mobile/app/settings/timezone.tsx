import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Button, Card, FormError, Input } from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getMe, patchMe } from "@/api/auth";
import { useQuery } from "@tanstack/react-query";
import { fromCaught } from "@/hooks/useApiError";
import { useTheme } from "@/theme/ThemeProvider";

export default function TimezoneScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const { tokens } = useTheme();
  const me = useQuery({ queryKey: apiKeys.me(), queryFn: () => getMe(api) });
  const [value, setValue] = useState<string>(me.data?.timezone ?? "UTC");
  const [error, setError] = useState<{ message: string | null | undefined }>({
    message: null,
  });

  const save = useMutation({
    mutationFn: () => patchMe(api, { timezone: value }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: apiKeys.me() });
      router.back();
    },
    onError: (e) => setError({ message: fromCaught(e).message }),
  });

  return (
    <>
      <Stack.Screen options={{ title: "Timezone" }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: tokens.colors.bg }}
        contentContainerStyle={{
          padding: tokens.spacing.lg,
          gap: tokens.spacing.md,
        }}
      >
        <Card>
          <View style={{ gap: tokens.spacing.md }}>
            <Text
              style={{
                color: tokens.colors.textMuted,
                fontSize: tokens.type.bodySmall.fontSize,
              }}
            >
              Detected: {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </Text>
            <Input label="Timezone" value={value} onChangeText={setValue} />
            <FormError message={error.message} />
            <Button
              label={save.isPending ? "Saving…" : "Save"}
              onPress={() => save.mutate()}
              disabled={save.isPending}
            />
            <Button
              label="Use detected"
              variant="secondary"
              onPress={() =>
                setValue(Intl.DateTimeFormat().resolvedOptions().timeZone)
              }
            />
          </View>
        </Card>
      </ScrollView>
    </>
  );
}
