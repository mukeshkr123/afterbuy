import { useClerk } from "@clerk/clerk-expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
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
import { fromCaught, type FormErrorState } from "@/hooks/useApiError";
import { unregisterCurrentDevice } from "@/notifications/PushRegistration";
import { useAuth } from "@/auth/useAuth";
import { outbox } from "@/offline/outbox";
import {
  ACCOUNT_DELETION_URL,
  SUPPORT_EMAIL,
  mailtoSupport,
} from "@/lib/publicLinks";

const CONFIRM_WORD = "delete";

const DELETED_ITEMS = [
  {
    icon: "person-outline",
    label: "Account Profile & Credentials",
    desc: "Your email and login tokens are wiped immediately.",
  },
  {
    icon: "receipt-outline",
    label: "Purchases, Receipts & Items",
    desc: "All stored receipt images and records are removed.",
  },
  {
    icon: "alarm-outline",
    label: "Reminders & Warranties",
    desc: "Scheduled notifications and tracking dates will stop.",
  },
  {
    icon: "shield-checkmark-outline",
    label: "Claims & Support History",
    desc: "All active and completed claims are archived and deleted.",
  },
];

export default function DeleteAccountScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signOut } = useClerk();
  const { isSignedIn } = useAuth();

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
        // Proceed even if unregister fails
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
        // Best-effort sign out
      }
      router.replace("/welcome");
    },
    onError: (e) => setError(fromCaught(e)),
  });

  const canDelete = typedConfirm.trim().toLowerCase() === CONFIRM_WORD;

  if (!isSignedIn) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={[styles.header, { paddingTop: Math.max(insets.top + 8, 16) }]}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/welcome")
            }
            style={({ pressed }) => [
              styles.backBtn,
              pressed && styles.backBtnPressed,
            ]}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </Pressable>
          <Text style={styles.headerTitle}>Delete Account</Text>
          <View style={{ width: 42 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.bodyText}>
              If you cannot access your AfterBuy account, email {SUPPORT_EMAIL}{" "}
              from the address on the account to request permanent deletion.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                void Linking.openURL(
                  ACCOUNT_DELETION_URL ||
                    mailtoSupport("AfterBuy account deletion request")
                )
              }
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>
                {ACCOUNT_DELETION_URL
                  ? "Open deletion request"
                  : "Email deletion request"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Danger Ambient Glow */}
      <View style={styles.ambientGlowDanger} pointerEvents="none" />

      {/* Modern Header */}
      <View
        style={[styles.header, { paddingTop: Math.max(insets.top + 8, 16) }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/settings")
          }
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.backBtnPressed,
          ]}
        >
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle}>Delete Account</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 32, 40) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Warning Banner */}
        <View style={styles.warningBanner}>
          <View style={styles.warningIconBox}>
            <Ionicons name="trash-outline" size={22} color="#DC2626" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.warningTitle}>Permanent Deletion</Text>
            <Text style={styles.warningDesc}>
              This action cannot be undone. All data associated with your
              account will be deleted forever.
            </Text>
          </View>
        </View>

        {/* Impact List Card */}
        <View style={styles.impactCard}>
          <Text style={styles.impactHeading}>WHAT WILL BE ERASED</Text>
          <View style={styles.impactList}>
            {DELETED_ITEMS.map((item, idx) => (
              <View key={item.label} style={styles.impactRow}>
                <View style={styles.impactIconBox}>
                  <Ionicons
                    name={item.icon as keyof typeof Ionicons.glyphMap}
                    size={18}
                    color="#DC2626"
                  />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.impactRowTitle}>{item.label}</Text>
                  <Text style={styles.impactRowDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Action Steps */}
        {step === "intro" ? (
          <View style={styles.actionGroup}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setStep("confirm")}
              style={({ pressed }) => [
                styles.dangerBtn,
                pressed && styles.dangerBtnPressed,
              ]}
            >
              <Text style={styles.dangerBtnText}>
                I understand, continue to deletion
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/settings")
              }
              style={({ pressed }) => [
                styles.cancelBtn,
                pressed && styles.cancelBtnPressed,
              ]}
            >
              <Text style={styles.cancelBtnText}>Keep my account</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Type "delete" to proceed</Text>
            <Text style={styles.confirmSubtitle}>
              Please type{" "}
              <Text style={{ fontWeight: "800", color: "#DC2626" }}>
                {CONFIRM_WORD}
              </Text>{" "}
              in the box below to authorize deletion.
            </Text>

            <TextInput
              value={typedConfirm}
              onChangeText={setTypedConfirm}
              placeholder={CONFIRM_WORD}
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.confirmInput}
            />

            {error.message && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{error.message}</Text>
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              disabled={
                !canDelete ||
                deleteMutation.isPending ||
                deleteMutation.isSuccess
              }
              onPress={() => deleteMutation.mutate()}
              style={({ pressed }) => [
                styles.dangerBtn,
                (!canDelete || deleteMutation.isPending) && { opacity: 0.5 },
                pressed && styles.dangerBtnPressed,
              ]}
            >
              {deleteMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.dangerBtnText}>
                  Permanently Delete My Account
                </Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => setStep("intro")}
              style={styles.backStepBtn}
            >
              <Text style={styles.backStepText}>Back to options</Text>
            </Pressable>
          </View>
        )}

        {/* Support Card */}
        <View style={styles.supportCard}>
          <Text style={styles.supportHeading}>NEED ASSISTANCE?</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/support")}
            style={({ pressed }) => [
              styles.supportRow,
              pressed && styles.rowPressed,
            ]}
          >
            <View
              style={[styles.supportIconBox, { backgroundColor: "#EEF2FF" }]}
            >
              <Ionicons name="help-circle-outline" size={18} color="#6366F1" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.supportRowTitle}>Help Center</Text>
              <Text style={styles.supportRowDesc}>
                View FAQs and account management guides
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>
          <View style={styles.separator} />
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              void Linking.openURL(mailtoSupport("AfterBuy account support"))
            }
            style={({ pressed }) => [
              styles.supportRow,
              pressed && styles.rowPressed,
            ]}
          >
            <View
              style={[styles.supportIconBox, { backgroundColor: "#ECFDF5" }]}
            >
              <Ionicons name="mail-outline" size={18} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.supportRowTitle}>Contact Support</Text>
              <Text style={styles.supportRowDesc}>
                Get in touch with our team directly
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  ambientGlowDanger: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#FEE2E2",
    opacity: 0.7,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 20,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFF1F2",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FECDD3",
    padding: 16,
  },
  warningIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#9F1239",
  },
  warningDesc: {
    fontSize: 13,
    color: "#BE123C",
    lineHeight: 18,
  },
  impactCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 18,
    gap: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  impactHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  impactList: {
    gap: 14,
  },
  impactRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  impactIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  impactRowTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  impactRowDesc: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 16,
  },
  actionGroup: {
    gap: 12,
  },
  dangerBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  dangerBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  dangerBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelBtn: {
    height: 50,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnPressed: {
    backgroundColor: "#F8FAFC",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
  },
  confirmCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 20,
    gap: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  confirmSubtitle: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  confirmInput: {
    height: 50,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#0F172A",
    fontWeight: "600",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: 12,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "600",
  },
  backStepBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  backStepText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  supportCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  supportHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  supportRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowPressed: {
    backgroundColor: "#F8FAFC",
  },
  supportIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  supportRowTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  supportRowDesc: {
    fontSize: 12,
    color: "#64748B",
  },
  separator: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 64,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  bodyText: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#775DF5",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
