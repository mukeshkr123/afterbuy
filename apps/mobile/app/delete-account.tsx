import { useClerk } from "@clerk/clerk-expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Button,
  FormError,
  Input,
  ScreenHeader,
  ScreenScroll,
  SectionCard,
} from "@/components";
import { useApi } from "@/api/ApiProvider";
import { deleteMe } from "@/api/auth";
import { fromCaught, type FormErrorState } from "@/hooks/useApiError";
import { useTheme } from "@/theme/ThemeProvider";
import { unregisterCurrentDevice } from "@/notifications/PushRegistration";
import { useAuth } from "@/auth/useAuth";

const CONFIRM_WORD = "delete";
const SUPPORT_EMAIL =
  process.env["EXPO_PUBLIC_SUPPORT_EMAIL"] ?? "support@afterbuy.app";

export default function DeleteAccountScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const { signOut } = useClerk();
  const { isSignedIn } = useAuth();
  const { tokens } = useTheme();

  const [step, setStep] = useState<"intro" | "confirm">("intro");
  const [typedConfirm, setTypedConfirm] = useState("");
  const [error, setError] = useState<FormErrorState>({
    message: null,
    fields: {},
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteMe(api),
    onSuccess: async () => {
      try {
        await unregisterCurrentDevice(api);
      } catch {
        // The server may have already revoked this account; local cleanup
        // still happens inside unregisterCurrentDevice.
      }
      try {
        await signOut();
      } catch {
        // Best-effort: the server-side account is already gone.
      }
      qc.clear();
      router.replace("/welcome");
    },
    // A failed deletion used to leave the button spinning with no explanation.
    onError: (e) => setError(fromCaught(e)),
  });

  const canDelete = typedConfirm.trim().toLowerCase() === CONFIRM_WORD;

  if (!isSignedIn) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenScroll gap={tokens.spacing.lg + 2}>
          <ScreenHeader title="Delete Account" />
          <SectionCard>
            <View style={{ gap: tokens.spacing.md }}>
              <Text
                style={{
                  color: tokens.colors.textSubtle,
                  fontSize: tokens.type.body.fontSize,
                  lineHeight: tokens.type.body.lineHeight,
                }}
              >
                If you cannot access your AfterBuy account, email{" "}
                {SUPPORT_EMAIL} from the address on the account and ask for
                permanent deletion. Deletion removes purchases, receipts,
                reminders, claims, and account data.
              </Text>
              <Button
                label="Email deletion request"
                onPress={() =>
                  void Linking.openURL(
                    `mailto:${SUPPORT_EMAIL}?subject=AfterBuy%20account%20deletion%20request`
                  )
                }
              />
            </View>
          </SectionCard>
        </ScreenScroll>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenScroll gap={tokens.spacing.lg + 2}>
        <ScreenHeader title="Delete Account" />

        <SectionCard tone="danger">
          <View style={[styles.warningBody, { gap: tokens.spacing.md }]}>
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              // The card is already `dangerSurface`; the ring needs to sit
              // above it, not blend into it.
              style={[
                styles.warningIcon,
                { backgroundColor: tokens.colors.surface },
              ]}
            >
              <Ionicons
                name="warning-outline"
                size={32}
                color={tokens.colors.danger}
              />
            </View>
            <Text
              accessibilityRole="header"
              style={{
                color: tokens.colors.text,
                fontSize: tokens.type.title.fontSize,
                fontWeight: "800",
                textAlign: "center",
              }}
            >
              Permanent action
            </Text>
            <Text
              style={{
                color: tokens.colors.textSubtle,
                fontSize: tokens.type.body.fontSize,
                lineHeight: tokens.type.body.lineHeight,
                textAlign: "center",
              }}
            >
              Deleting your account permanently removes every tracked purchase,
              warranty reminder, receipt and claim. This cannot be undone.
            </Text>
          </View>
        </SectionCard>

        {step === "intro" ? (
          <View style={{ gap: tokens.spacing.md }}>
            <Button
              label="I want to delete my account"
              variant="danger"
              onPress={() => setStep("confirm")}
            />
            <Button
              label="Keep my account"
              variant="secondary"
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/settings")
              }
            />
          </View>
        ) : (
          <SectionCard>
            <View style={{ gap: tokens.spacing.lg }}>
              <Text
                style={{
                  color: tokens.colors.textSubtle,
                  fontSize: tokens.type.body.fontSize,
                  lineHeight: tokens.type.body.lineHeight,
                }}
              >
                Type{" "}
                <Text style={{ fontWeight: "700", color: tokens.colors.text }}>
                  {CONFIRM_WORD}
                </Text>{" "}
                below to confirm.
              </Text>

              <Input
                label="Confirmation"
                value={typedConfirm}
                onChangeText={setTypedConfirm}
                placeholder={CONFIRM_WORD}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <FormError message={error.message} />

              <Button
                label={
                  deleteMutation.isPending
                    ? "Deleting…"
                    : "Permanently delete account"
                }
                variant="danger"
                disabled={!canDelete || deleteMutation.isPending}
                onPress={() => deleteMutation.mutate()}
              />
            </View>
          </SectionCard>
        )}
      </ScreenScroll>
    </>
  );
}

const styles = StyleSheet.create({
  warningBody: {
    alignItems: "center",
  },
  warningIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
