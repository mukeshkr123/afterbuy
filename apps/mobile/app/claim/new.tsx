import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import { createClaim } from "@/api/claims";
import { useTheme } from "@/theme/ThemeProvider";

export default function NewClaimScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();

  const params = useLocalSearchParams<{ purchaseId?: string }>();
  const purchaseId = params.purchaseId || "1";

  const [claimType, setClaimType] = useState<"warranty" | "return">("warranty");
  const [resolution, setResolution] = useState<
    "replacement" | "refund" | "repair"
  >("replacement");
  const [description, setDescription] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      createClaim(api, {
        purchaseId,
        type: claimType === "warranty" ? "warranty" : "return",
        notes: description || "Warranty claim request for iPhone 15",
        status: "submitted",
      }),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["claims"] });
      router.replace({
        pathname: "/claim/[id]",
        params: { id: data?.id || "1" },
      });
    },
  });

  const isDark = tokens.colors.bg !== "#FFFFFF";
  const bgColor = isDark ? tokens.colors.bg : "#FAFAFA";
  const cardBg = isDark ? tokens.colors.surface : "#FFFFFF";
  const textColor = tokens.colors.text ?? "#0F172A";
  const textMuted = tokens.colors.textMuted ?? "#6B7280";
  const borderColor = isDark ? tokens.colors.border : "#E2E8F0";
  const inputBg = isDark ? tokens.colors.surface : "#F8FAFC";
  const accentColor = tokens.colors.accent ?? "#4F46E5";

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
              File a Claim
            </Text>

            <View style={{ width: 38 }} />
          </View>

          {/* Product Header Card */}
          <View style={[styles.productCard, { backgroundColor: cardBg }]}>
            <View style={styles.productLeft}>
              <View
                style={[styles.productThumb, { backgroundColor: "#F3F4F6" }]}
              >
                <Image
                  source={require("../../assets/iphone_thumb.png")}
                  style={styles.thumbImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.productMeta}>
                <Text style={[styles.productTitle, { color: textColor }]}>
                  iPhone 15 (128GB)
                </Text>
                <Text style={[styles.merchantText, { color: textMuted }]}>
                  Purchased from Reliance Digital
                </Text>
              </View>
            </View>
          </View>

          {/* Claim Type Selection */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Claim Type
            </Text>
            <View style={styles.segmentedControl}>
              <Pressable
                style={[
                  styles.segmentOption,
                  claimType === "warranty" && styles.segmentActive,
                ]}
                onPress={() => setClaimType("warranty")}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={claimType === "warranty" ? "#4F46E5" : "#64748B"}
                />
                <Text
                  style={[
                    styles.segmentText,
                    claimType === "warranty" && styles.segmentActiveText,
                  ]}
                >
                  Warranty Claim
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.segmentOption,
                  claimType === "return" && styles.segmentActive,
                ]}
                onPress={() => setClaimType("return")}
              >
                <Ionicons
                  name="repeat-outline"
                  size={18}
                  color={claimType === "return" ? "#4F46E5" : "#64748B"}
                />
                <Text
                  style={[
                    styles.segmentText,
                    claimType === "return" && styles.segmentActiveText,
                  ]}
                >
                  Return Request
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Issue Description Card */}
          <View style={[styles.formCard, { backgroundColor: cardBg }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textColor }]}>
                Issue Description
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                onFocus={() => setFocusedField("desc")}
                onBlur={() => setFocusedField(null)}
                placeholder="Describe the issue or reason for claim..."
                placeholderTextColor={textMuted}
                multiline
                numberOfLines={4}
                style={[
                  styles.textAreaInput,
                  { color: textColor, backgroundColor: inputBg, borderColor },
                  focusedField === "desc" && {
                    borderColor: accentColor,
                    borderWidth: 1.5,
                  },
                ]}
              />
            </View>

            {/* Preferred Resolution */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textColor }]}>
                Preferred Resolution
              </Text>

              <View style={styles.resolutionContainer}>
                {(["replacement", "repair", "refund"] as const).map((r) => {
                  const active = resolution === r;
                  return (
                    <Pressable
                      key={r}
                      style={[
                        styles.resolutionOption,
                        {
                          backgroundColor: active ? "#EEF2FF" : inputBg,
                          borderColor: active ? accentColor : borderColor,
                        },
                      ]}
                      onPress={() => setResolution(r)}
                    >
                      <Text
                        style={[
                          styles.resolutionText,
                          { color: active ? accentColor : textColor },
                        ]}
                      >
                        {r[0]?.toUpperCase() + r.slice(1)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Submit Claim Button */}
          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
            ]}
            onPress={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Claim</Text>
            )}
          </Pressable>
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
  productCard: {
    padding: 16,
    borderRadius: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  productLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  productThumb: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  productMeta: {
    gap: 3,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  merchantText: {
    fontSize: 13,
  },
  sectionContainer: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  segmentedControl: {
    flexDirection: "row",
    gap: 10,
  },
  segmentOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  segmentActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#4F46E5",
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  segmentActiveText: {
    color: "#4F46E5",
    fontWeight: "700",
  },
  formCard: {
    padding: 20,
    borderRadius: 18,
    gap: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  textAreaInput: {
    height: 100,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    textAlignVertical: "top",
  },
  resolutionContainer: {
    flexDirection: "row",
    gap: 10,
  },
  resolutionOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  resolutionText: {
    fontSize: 13,
    fontWeight: "700",
  },
  submitButton: {
    backgroundColor: "#4F46E5",
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
