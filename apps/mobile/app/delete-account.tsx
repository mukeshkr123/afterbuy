import { useClerk } from "@clerk/clerk-expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Button, Card, FormError, Input } from "@/components";
import { useApi } from "@/api/ApiProvider";
import { deleteMe } from "@/api/auth";
import { fromCaught } from "@/hooks/useApiError";
import { useTheme } from "@/theme/ThemeProvider";

export default function DeleteAccountScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const { signOut } = useClerk();
  const { tokens } = useTheme();
  const [step, setStep] = useState<"intro" | "confirm">("intro");
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<{
    message: string | null | undefined;
  }>({ message: null });

  const submit = useMutation({
    mutationFn: () => deleteMe(api),
    onSuccess: async () => {
      try {
        await signOut();
      } catch {
        // best-effort
      }
      qc.clear();
      router.replace("/");
    },
    onError: (e) => setError({ message: fromCaught(e).message }),
  });

  const canDelete = typed.trim() === "delete";

  return (
    <>
      <Stack.Screen options={{ title: "Delete account" }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1, backgroundColor: tokens.colors.bg }}
          contentContainerStyle={{
            padding: tokens.spacing.lg,
            gap: tokens.spacing.md,
          }}
        >
          <Card>
            {step === "intro" ? (
              <View style={{ gap: tokens.spacing.md }}>
                <Text
                  style={{
                    fontSize: tokens.type.title.fontSize,
                    fontWeight: "700",
                    color: tokens.colors.text,
                  }}
                >
                  Delete your account?
                </Text>
                <Text style={{ color: tokens.colors.textMuted }}>
                  This permanently deletes your purchases, reminders, and
                  receipts. After deletion, the receipts.purge job removes any
                  uploaded files. This cannot be undone.
                </Text>
                <Button
                  label="Continue"
                  variant="danger"
                  onPress={() => setStep("confirm")}
                />
                <Button
                  label="Cancel"
                  variant="secondary"
                  onPress={() => router.back()}
                />
              </View>
            ) : (
              <View style={{ gap: tokens.spacing.md }}>
                <Text
                  style={{
                    fontSize: tokens.type.title.fontSize,
                    fontWeight: "700",
                    color: tokens.colors.text,
                  }}
                >
                  Type "delete" to confirm
                </Text>
                <Input
                  label='Type "delete" to confirm'
                  value={typed}
                  onChangeText={setTyped}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <FormError message={error.message} />
                <Button
                  label={submit.isPending ? "Deleting…" : "Delete account"}
                  variant="danger"
                  disabled={!canDelete || submit.isPending}
                  onPress={() => submit.mutate()}
                />
                <Button
                  label="Cancel"
                  variant="secondary"
                  onPress={() => router.back()}
                />
              </View>
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
