import { useClerk } from "@clerk/clerk-expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Button,
  FormError,
  IconTile,
  Input,
  ListItem,
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
import { outbox } from "@/offline/outbox";

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
    mutationFn: async () => {
      try {
        await unregisterCurrentDevice(api);
      } catch {
        // The server may be unreachable or user unregistered; proceed with deletion.
      }
      return await deleteMe(api);
    },
    onSuccess: async () => {
      try {
        await outbox.reset();
      } catch {
        // Best-effort outbox reset
      }
      qc.clear();
      try {
        await signOut();
      } catch {
        // Best-effort: the server-side account is already gone.
      }
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
              style={[
                styles.warningIcon,
                { backgroundColor: tokens.colors.surface },
              ]}
            >
              <Ionicons
                name="trash-outline"
                size={24}
                color={tokens.colors.danger}
              />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                accessibilityRole="header"
                style={{
                  color: tokens.colors.dangerText,
                  fontSize: tokens.type.headline.fontSize,
                  fontWeight: "800",
                }}
              >
                Delete your account
              </Text>
              <Text
                style={{
                  color: tokens.colors.dangerText,
                  fontSize: tokens.type.bodySmall.fontSize,
                  lineHeight: tokens.type.bodySmall.lineHeight,
                }}
              >
                This action cannot be undone.
              </Text>
            </View>
          </View>
        </SectionCard>

        {step === "intro" ? (
          <View style={{ gap: tokens.spacing.md }}>
            <SectionCard>
              <View style={{ gap: tokens.spacing.md }}>
                <Text
                  style={{
                    color: tokens.colors.text,
                    fontSize: tokens.type.body.fontSize,
                    fontWeight: "700",
                  }}
                >
                  What will be deleted
                </Text>
                <DeletionItem label="Your account and profile" />
                <DeletionItem label="All purchases and receipts" />
                <DeletionItem label="All claims and reminders" />
                <DeletionItem label="App preferences and settings" />
              </View>
            </SectionCard>
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
              <View style={{ gap: tokens.spacing.sm }}>
                <Text
                  style={{
                    color: tokens.colors.text,
                    fontSize: tokens.type.body.fontSize,
                    fontWeight: "700",
                  }}
                >
                  What will be deleted
                </Text>
                <DeletionItem label="Your account and profile" />
                <DeletionItem label="All purchases and receipts" />
                <DeletionItem label="All claims and reminders" />
                <DeletionItem label="App preferences and settings" />
              </View>
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
                disabled={
                  !canDelete ||
                  deleteMutation.isPending ||
                  deleteMutation.isSuccess
                }
                busy={deleteMutation.isPending}
                onPress={() => deleteMutation.mutate()}
              />
            </View>
          </SectionCard>
        )}

        <View style={{ gap: tokens.spacing.md - 2 }}>
          <Text
            style={{
              color: tokens.colors.text,
              fontSize: tokens.type.bodySmall.fontSize + 1,
              fontWeight: "700",
            }}
          >
            Need help?
          </Text>
          <Text
            style={{
              color: tokens.colors.textSubtle,
              fontSize: tokens.type.bodySmall.fontSize,
              lineHeight: tokens.type.bodySmall.lineHeight,
            }}
          >
            Visit support for guides and answers.
          </Text>
          <SectionCard flush>
            <ListItem
              title="Help Center"
              leading={<IconTile icon="help-circle-outline" tone="neutral" />}
              chevron
              onPress={() => router.push("/support")}
            />
            <ListItem
              title="Contact Support"
              subtitle="We typically respond within 24 hours."
              divider={false}
              leading={<IconTile icon="mail-outline" tone="neutral" />}
              chevron
              onPress={() =>
                void Linking.openURL(
                  `mailto:${SUPPORT_EMAIL}?subject=AfterBuy%20support`
                )
              }
            />
          </SectionCard>
        </View>
      </ScreenScroll>
    </>
  );
}

function DeletionItem({ label }: { label: string }) {
  const { tokens } = useTheme();
  return (
    <View style={styles.deletionItem}>
      <View style={[styles.bullet, { backgroundColor: tokens.colors.icon }]} />
      <Text
        style={{
          color: tokens.colors.textSubtle,
          fontSize: tokens.type.bodySmall.fontSize,
          lineHeight: tokens.type.bodySmall.lineHeight,
          flex: 1,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  warningBody: {
    flexDirection: "row",
    alignItems: "center",
  },
  warningIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  deletionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
