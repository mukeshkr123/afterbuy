import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
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
import { createPurchase } from "@/api/purchases";
import { useTheme } from "@/theme/ThemeProvider";

export default function NewPurchaseScreen() {
  const api = useApi();
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();

  // Mode step: "scan" | "review" | "manual"
  const [step, setStep] = useState<"scan" | "review" | "manual">("scan");
  const [flashOn, setFlashOn] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Extracted/Editable form values
  const [title, setTitle] = useState("iPhone 15 (128GB)");
  const [merchant, setMerchant] = useState("Reliance Digital");
  const [purchaseDate, setPurchaseDate] = useState("06 May 2024");
  const [priceFormatted, setPriceFormatted] = useState("79900");
  const [invoiceName, setInvoiceName] = useState("RD123456789.pdf");

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof createPurchase>[1]) =>
      createPurchase(api, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["purchases"] });
      router.replace("/(tabs)/purchases");
    },
  });

  const handleCapture = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setStep("review");
    }, 500);
  };

  const handleSaveOrder = () => {
    const amountVal =
      parseFloat(priceFormatted.replace(/[^0-9.]/g, "")) || 79900;
    mutation.mutate({
      title: title || "iPhone 15 (128GB)",
      merchant: merchant || "Reliance Digital",
      category: "electronics",
      amountMinor: Math.round(amountVal * 100),
      currency: "INR",
      purchaseDate: "2024-05-06",
      deliveryStatus: "delivered",
      warrantyExpiresAt: "2025-05-05",
      returnDeadlineAt: "2024-05-20",
    });
  };

  const isDark = tokens.colors.bg !== "#FFFFFF";
  const bgColor = isDark ? tokens.colors.bg : "#FAFAFA";
  const cardBg = isDark ? tokens.colors.surface : "#FFFFFF";
  const textColor = tokens.colors.text ?? "#0F172A";
  const textMuted = tokens.colors.textMuted ?? "#6B7280";
  const borderColor = isDark ? tokens.colors.border : "#E2E8F0";
  const inputBg = isDark ? tokens.colors.surface : "#F8FAFC";
  const accentColor = tokens.colors.accent ?? "#4F46E5";

  // Step 1: Camera Scanner View
  if (step === "scan") {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.cameraContainer}>
          {/* Top Bar Overlay */}
          <View
            style={[
              styles.cameraTopBar,
              { paddingTop: Math.max(insets.top + 8, 20) },
            ]}
          >
            <Pressable
              style={styles.cameraIconButton}
              onPress={() => router.back()}
              hitSlop={12}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </Pressable>

            <Pressable
              style={styles.cameraIconButton}
              onPress={() => setFlashOn(!flashOn)}
              hitSlop={12}
            >
              <Ionicons
                name={flashOn ? "flash" : "flash-outline"}
                size={22}
                color={flashOn ? "#FBBF24" : "#FFFFFF"}
              />
            </Pressable>

            <Pressable
              style={styles.cameraIconButton}
              onPress={() => setStep("review")}
              hitSlop={12}
            >
              <Ionicons name="images-outline" size={22} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Viewfinder Bounding Box & Receipt Overlay */}
          <View style={styles.viewfinderContainer}>
            <View style={styles.receiptFrame}>
              <View style={styles.receiptContent}>
                <Text style={styles.receiptStoreTitle}>RELIANCE DIGITAL</Text>
                <Text style={styles.receiptStoreSub}>OFFLINE STORE</Text>
                <Text style={styles.receiptMetaText}>Bill No: RD123456789</Text>
                <Text style={styles.receiptMetaText}>
                  Date: 06/05/2024, 04:25 PM
                </Text>

                <View style={styles.receiptDivider} />

                <View style={styles.receiptItemRow}>
                  <Text style={styles.receiptItemName}>Item</Text>
                  <Text style={styles.receiptItemQty}>Qty</Text>
                  <Text style={styles.receiptItemPrice}>Price</Text>
                </View>

                <View style={styles.receiptItemRow}>
                  <Text style={styles.receiptItemName}>iPhone 15 128GB</Text>
                  <Text style={styles.receiptItemQty}>1</Text>
                  <Text style={styles.receiptItemPrice}>79900.00</Text>
                </View>

                <View style={styles.receiptDivider} />

                <View style={styles.receiptTotalRow}>
                  <Text style={styles.receiptTotalLabel}>Total</Text>
                  <Text style={styles.receiptTotalAmount}>₹79,900.00</Text>
                </View>

                <Text style={styles.receiptFooterText}>
                  Thank you! Visit Again.
                </Text>
              </View>
            </View>
          </View>

          {/* Bottom Shutter Controls */}
          <View
            style={[
              styles.cameraBottomBar,
              { paddingBottom: Math.max(insets.bottom + 16, 24) },
            ]}
          >
            <Pressable
              style={styles.galleryThumbButton}
              onPress={() => setStep("review")}
            >
              <Ionicons name="image-outline" size={20} color="#FFFFFF" />
            </Pressable>

            {/* Shutter Button */}
            <Pressable style={styles.shutterOuterRing} onPress={handleCapture}>
              <View style={styles.shutterInnerCircle}>
                {scanning ? (
                  <ActivityIndicator color="#4F46E5" size="small" />
                ) : null}
              </View>
            </Pressable>

            <View style={styles.autoCaptureBadge}>
              <Ionicons name="sparkles" size={12} color="#FFFFFF" />
              <Text style={styles.autoCaptureText}>Auto-capture ON</Text>
            </View>
          </View>
        </View>
      </>
    );
  }

  // Step 3: Edit Extracted Details Form Mode (Polished to match design system)
  if (step === "manual") {
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
                onPress={() => setStep("review")}
                hitSlop={12}
              >
                <Ionicons name="chevron-back" size={24} color={textColor} />
              </Pressable>

              <View style={styles.headerCenter}>
                <Text style={[styles.headerTitle, { color: textColor }]}>
                  Edit Details
                </Text>
                <Text style={[styles.headerSubtitle, { color: textMuted }]}>
                  Update extracted order details
                </Text>
              </View>

              <View style={{ width: 38 }} />
            </View>

            {/* Form Fields Card */}
            <View style={[styles.formCard, { backgroundColor: cardBg }]}>
              {/* Product Title */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: textColor }]}>
                  Product Name
                </Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  onFocus={() => setFocusedField("title")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="e.g. iPhone 15 (128GB)"
                  placeholderTextColor={textMuted}
                  style={[
                    styles.textInput,
                    { color: textColor, backgroundColor: inputBg, borderColor },
                    focusedField === "title" && {
                      borderColor: accentColor,
                      borderWidth: 1.5,
                    },
                  ]}
                />
              </View>

              {/* Merchant */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: textColor }]}>
                  Store / Merchant
                </Text>
                <TextInput
                  value={merchant}
                  onChangeText={setMerchant}
                  onFocus={() => setFocusedField("merchant")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="e.g. Reliance Digital"
                  placeholderTextColor={textMuted}
                  style={[
                    styles.textInput,
                    { color: textColor, backgroundColor: inputBg, borderColor },
                    focusedField === "merchant" && {
                      borderColor: accentColor,
                      borderWidth: 1.5,
                    },
                  ]}
                />
              </View>

              {/* Purchase Date */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: textColor }]}>
                  Date of Purchase
                </Text>
                <TextInput
                  value={purchaseDate}
                  onChangeText={setPurchaseDate}
                  onFocus={() => setFocusedField("purchaseDate")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="06 May 2024"
                  placeholderTextColor={textMuted}
                  style={[
                    styles.textInput,
                    { color: textColor, backgroundColor: inputBg, borderColor },
                    focusedField === "purchaseDate" && {
                      borderColor: accentColor,
                      borderWidth: 1.5,
                    },
                  ]}
                />
              </View>

              {/* Price Paid */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: textColor }]}>
                  Price Paid (₹)
                </Text>
                <TextInput
                  value={priceFormatted}
                  onChangeText={setPriceFormatted}
                  onFocus={() => setFocusedField("price")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="79900"
                  keyboardType="numeric"
                  placeholderTextColor={textMuted}
                  style={[
                    styles.textInput,
                    { color: textColor, backgroundColor: inputBg, borderColor },
                    focusedField === "price" && {
                      borderColor: accentColor,
                      borderWidth: 1.5,
                    },
                  ]}
                />
              </View>

              {/* Invoice Name */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: textColor }]}>
                  Invoice Filename
                </Text>
                <TextInput
                  value={invoiceName}
                  onChangeText={setInvoiceName}
                  onFocus={() => setFocusedField("invoice")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="RD123456789.pdf"
                  placeholderTextColor={textMuted}
                  style={[
                    styles.textInput,
                    { color: textColor, backgroundColor: inputBg, borderColor },
                    focusedField === "invoice" && {
                      borderColor: accentColor,
                      borderWidth: 1.5,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Save Action Button */}
            <Pressable
              style={({ pressed }) => [
                styles.saveOrderButton,
                pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
              ]}
              onPress={() => {
                setStep("review");
              }}
            >
              <Text style={styles.saveOrderText}>Save Changes</Text>
            </Pressable>
          </ScrollView>
        </View>
      </>
    );
  }

  // Step 2: Review Extracted Details Screen
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
              onPress={() => setStep("scan")}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={24} color={textColor} />
            </Pressable>

            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: textColor }]}>
                Review Details
              </Text>
              <Text style={[styles.headerSubtitle, { color: textMuted }]}>
                We've extracted the details
              </Text>
            </View>

            <View style={{ width: 38 }} />
          </View>

          {/* Product Header Card */}
          <View style={[styles.reviewProductCard, { backgroundColor: cardBg }]}>
            <View style={styles.reviewProductLeft}>
              <View
                style={[
                  styles.reviewProductThumb,
                  { backgroundColor: "#F3F4F6" },
                ]}
              >
                <Image
                  source={require("../../assets/iphone_thumb.png")}
                  style={styles.reviewThumbImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.reviewProductMeta}>
                <Text style={[styles.reviewProductTitle, { color: textColor }]}>
                  {title}
                </Text>
                <Text
                  style={[styles.reviewProductVariant, { color: textMuted }]}
                >
                  Blue
                </Text>
              </View>
            </View>
          </View>

          {/* Extracted Details Table Card */}
          <View style={[styles.detailsTableCard, { backgroundColor: cardBg }]}>
            {/* Store Row */}
            <View
              style={[
                styles.tableRow,
                { borderBottomColor: borderColor, borderBottomWidth: 1 },
              ]}
            >
              <Text style={[styles.tableLabel, { color: textMuted }]}>
                Store
              </Text>
              <Text style={[styles.tableValue, { color: textColor }]}>
                {merchant}
              </Text>
            </View>

            {/* Date of Purchase Row */}
            <View
              style={[
                styles.tableRow,
                { borderBottomColor: borderColor, borderBottomWidth: 1 },
              ]}
            >
              <Text style={[styles.tableLabel, { color: textMuted }]}>
                Date of Purchase
              </Text>
              <Text style={[styles.tableValue, { color: textColor }]}>
                {purchaseDate}
              </Text>
            </View>

            {/* Price Paid Row */}
            <View
              style={[
                styles.tableRow,
                { borderBottomColor: borderColor, borderBottomWidth: 1 },
              ]}
            >
              <Text style={[styles.tableLabel, { color: textMuted }]}>
                Price Paid
              </Text>
              <Text style={[styles.tableValueBold, { color: textColor }]}>
                ₹
                {parseInt(priceFormatted || "79900", 10).toLocaleString(
                  "en-IN"
                )}
              </Text>
            </View>

            {/* Invoice Row */}
            <View style={styles.tableRow}>
              <Text style={[styles.tableLabel, { color: textMuted }]}>
                Invoice
              </Text>
              <Text style={[styles.tableValue, { color: textColor }]}>
                {invoiceName}
              </Text>
            </View>
          </View>

          {/* Edit Details Action Button */}
          <Pressable
            style={styles.editDetailsButton}
            onPress={() => setStep("manual")}
          >
            <Text style={styles.editDetailsText}>Edit Details</Text>
          </Pressable>

          {/* Save Order Primary CTA Button */}
          <Pressable
            style={({ pressed }) => [
              styles.saveOrderButton,
              pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
            ]}
            onPress={handleSaveOrder}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveOrderText}>Save Order</Text>
            )}
          </Pressable>

          {mutation.isError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : "Failed to save order"}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // Camera Scanner Styles
  cameraContainer: {
    flex: 1,
    backgroundColor: "#111827",
    justifyContent: "space-between",
  },
  cameraTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  cameraIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewfinderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  receiptFrame: {
    width: "100%",
    backgroundColor: "#FDFBF7",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  receiptContent: {
    alignItems: "center",
    gap: 4,
  },
  receiptStoreTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1E293B",
    letterSpacing: 1,
  },
  receiptStoreSub: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 8,
  },
  receiptMetaText: {
    fontSize: 12,
    color: "#475569",
    fontFamily: "monospace",
  },
  receiptDivider: {
    width: "100%",
    height: 1,
    backgroundColor: "#CBD5E1",
    marginVertical: 10,
  },
  receiptItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  receiptItemName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    flex: 2,
  },
  receiptItemQty: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
    textAlign: "center",
  },
  receiptItemPrice: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    flex: 2,
    textAlign: "right",
  },
  receiptTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  receiptTotalLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  receiptTotalAmount: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  receiptFooterText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 12,
  },
  cameraBottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 28,
  },
  galleryThumbButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterOuterRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
  },
  shutterInnerCircle: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  autoCaptureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  autoCaptureText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },

  // Review Details & Edit Form Styles
  scrollContent: {
    paddingHorizontal: 20,
    gap: 18,
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
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  reviewProductCard: {
    padding: 16,
    borderRadius: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewProductLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  reviewProductThumb: {
    width: 60,
    height: 60,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  reviewThumbImage: {
    width: "100%",
    height: "100%",
  },
  reviewProductMeta: {
    gap: 3,
  },
  reviewProductTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  reviewProductVariant: {
    fontSize: 14,
  },
  detailsTableCard: {
    borderRadius: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  tableLabel: {
    fontSize: 14,
  },
  tableValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  tableValueBold: {
    fontSize: 16,
    fontWeight: "800",
  },
  editDetailsButton: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  editDetailsText: {
    color: "#4F46E5",
    fontSize: 15,
    fontWeight: "700",
  },
  saveOrderButton: {
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
  saveOrderText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  formCard: {
    padding: 20,
    borderRadius: 18,
    gap: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  textInput: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  errorContainer: {
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
    textAlign: "center",
  },
});
