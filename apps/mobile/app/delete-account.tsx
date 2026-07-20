import { useClerk } from "@clerk/clerk-expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "@/api/ApiProvider";
import { deleteMe } from "@/api/auth";
import { useTheme } from "@/theme/ThemeProvider";

export default function DeleteAccountScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const { signOut } = useClerk();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();

  const [step, setStep] = useState<"intro" | "confirm">("intro");
  const [typedConfirm, setTypedConfirm] = useState("");
  const [focused, setFocused] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => deleteMe(api),
    onSuccess: async () => {
      try {
        await signOut();
      } catch {
        // best-effort
      }
      qc.clear();
      router.replace("/welcome");
    },
  });

  const isDark = tokens.colors.bg !== "#FFFFFF";
  const bgColor = isDark ? tokens.colors.bg : "#FAFAFA";
  const cardBg = isDark ? tokens.colors.surface : "#FFFFFF";
  const textColor = tokens.colors.text ?? "#0F172A";
  const textMuted = tokens.colors.textMuted ?? "#6B7280";
  const borderColor = isDark ? tokens.colors.border : "#E2E8F0";
  const inputBg = isDark ? tokens.colors.surface : "#F8FAFC";

  const canDelete = typedConfirm.trim().toLowerCase() === "delete";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top + 8, 20),
              paddingBottom: Math.max(insets.bottom + 20, 28),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Bar */}
          <View style={styles.headerRow}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={24} color={textColor} />
            </Pressable>

            <Text style={[styles.headerTitle, { color: textColor }]}>
              Delete Account
            </Text>

            <View style={{ width: 38 }} />
          </View>

          {/* Warning Header Card */}
          <View style={styles.warningCard}>
            <View style={styles.warningIconBox}>
              <Ionicons name="warning-outline" size={32} color="#EF4444" />
            </View>
            <Text style={styles.warningTitle}>Permanent Action</Text>
            <Text style={styles.warningDescription}>
              Deleting your account will permanently remove all your tracked
              purchases, warranty reminders, receipt invoices, and claims
              history. This action cannot be undone.
            </Text>
          </View>

          {step === "intro" ? (
            <View style={styles.actionsContainer}>
              <Pressable
                style={styles.deleteDangerButton}
                onPress={() => setStep("confirm")}
              >
                <Text style={styles.deleteDangerButtonText}>
                  I Want to Delete My Account
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.cancelButton,
                  { backgroundColor: cardBg, borderColor },
                ]}
                onPress={() => router.back()}
              >
                <Text style={[styles.cancelButtonText, { color: textColor }]}>
                  Keep My Account
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.confirmCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.confirmTitle, { color: textColor }]}>
                Type "delete" to confirm
              </Text>
              <Text style={[styles.confirmSubtitle, { color: textMuted }]}>
                Please type{" "}
                <Text style={{ fontWeight: "700", color: textColor }}>
                  delete
                </Text>{" "}
                in the input box below to confirm account deletion.
              </Text>

              <TextInput
                value={typedConfirm}
                onChangeText={setTypedConfirm}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder='Type "delete"'
                placeholderTextColor={textMuted}
                autoCapitalize="none"
                style={[
                  styles.textInput,
                  { color: textColor, backgroundColor: inputBg, borderColor },
                  focused && { borderColor: "#EF4444", borderWidth: 1.5 },
                ]}
              />

              <Pressable
                style={[
                  styles.deleteDangerButton,
                  !canDelete && { opacity: 0.5 },
                ]}
                disabled={!canDelete || deleteMutation.isPending}
                onPress={() => deleteMutation.mutate()}
              >
                {deleteMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.deleteDangerButtonText}>
                    Permanently Delete Account
                  </Text>
                )}
              </Pressable>
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    gap: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 38,
    height: 38,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  warningCard: {
    backgroundColor: "#FEE2E2",
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  warningIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  warningTitle: {
    color: "#991B1B",
    fontSize: 18,
    fontWeight: "800",
  },
  warningDescription: {
    color: "#B91C1C",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  actionsContainer: {
    gap: 12,
    marginTop: 10,
  },
  deleteDangerButton: {
    backgroundColor: "#EF4444",
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  deleteDangerButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  confirmCard: {
    padding: 20,
    borderRadius: 20,
    gap: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 6,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  confirmSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  textInput: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
    marginVertical: 4,
  },
});
