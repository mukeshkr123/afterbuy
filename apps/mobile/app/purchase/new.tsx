import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import type { CreatePurchaseRequest } from "@acme/shared";
import { Dialog, FormError, useAdaptiveLayout } from "@/components";
import { PurchaseForm } from "@/components/PurchaseForm";
import { useApi } from "@/api/ApiProvider";
import { createPurchase } from "@/api/purchases";
import { uploadReceipt, type ReceiptUpload } from "@/api/receipts";
import { useTheme } from "@/theme/ThemeProvider";

export default function NewPurchaseScreen() {
  const api = useApi();
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { tokens, reducedMotion } = useTheme();
  const { contentWidth } = useAdaptiveLayout();
  const { capture } = useLocalSearchParams<{ capture?: string }>();
  const didAutoCapture = useRef(false);

  const [receipt, setReceipt] = useState<ReceiptUpload | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const pick = useMutation({
    mutationFn: async (source: "camera" | "library") => {
      setPickerError(null);
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error(
          source === "camera"
            ? "Camera access is off. Enable it in Settings to photograph a receipt."
            : "Photo access is off. Enable it in Settings to attach a receipt."
        );
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        quality: 0.7,
        allowsEditing: false,
      };
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return null;
      const asset = result.assets[0];
      if (!asset) return null;
      return {
        uri: asset.uri,
        contentType: asset.mimeType ?? "image/jpeg",
        name: asset.fileName ?? `receipt-${Date.now()}.jpg`,
      } satisfies ReceiptUpload;
    },
    onSuccess: (picked) => {
      if (picked) {
        setReceipt(picked);
        setIsDirty(true);
      }
    },
    onError: (e) =>
      setPickerError(e instanceof Error ? e.message : "Could not open picker."),
  });

  useEffect(() => {
    if (capture === "camera" && !didAutoCapture.current) {
      didAutoCapture.current = true;
      pick.mutate("camera");
    }
  }, [capture, pick]);

  const handleBack = () => {
    if (isDirty || receipt) {
      setConfirmDiscard(true);
    } else {
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/purchases");
    }
  };

  const handleSubmit = async (data: CreatePurchaseRequest) => {
    const created = await createPurchase(api, data);

    if (receipt) {
      try {
        await uploadReceipt(api, created.id, receipt);
      } catch {
        setPickerError(
          "Purchase saved, but the receipt did not upload. You can retry from Receipts."
        );
      }
    }

    await qc.invalidateQueries({ queryKey: ["purchases"] });
    router.replace({
      pathname: "/order-success",
      params: { id: created.id },
    });
    return created;
  };

  return (
    <View style={styles.screen}>
      {/* Ambient top right pastel background glow */}
      <View style={styles.ambientGlowTopRight} pointerEvents="none" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          width: "100%",
          maxWidth: contentWidth,
          alignSelf: "center",
          paddingHorizontal: 16,
          paddingTop: Math.max(insets.top + 6, 16),
          paddingBottom: Math.max(insets.bottom + 36, 44),
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {/* Navigation Bar: Back button + Centered Title */}
        <View style={styles.navBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </Pressable>

          <Text style={styles.navTitle}>Add Purchase</Text>

          <View style={styles.navSpacer} />
        </View>

        {/* Section 1: Receipt */}
        <View style={{ gap: 8 }}>
          <View style={styles.sectionHeaderStack}>
            <Text style={styles.sectionTitle}>Receipt</Text>
            <Text style={styles.sectionSubtitle}>Optional</Text>
          </View>

          {receipt ? (
            <View style={styles.receiptSelectedCard}>
              <Image
                source={{ uri: receipt.uri }}
                style={styles.receiptThumb}
                resizeMode="cover"
                accessibilityLabel="Selected receipt image"
              />
              <View style={{ flex: 1, gap: 6 }}>
                <Text numberOfLines={1} style={styles.receiptFileName}>
                  {receipt.name}
                </Text>
                <Text style={styles.receiptNote}>Attaches when you save</Text>
                <View style={styles.receiptActionsRow}>
                  <ReceiptActionButton
                    label="Retake"
                    icon="camera-outline"
                    disabled={pick.isPending}
                    onPress={() => pick.mutate("camera")}
                  />
                  <ReceiptActionButton
                    label="Replace"
                    icon="image-outline"
                    disabled={pick.isPending}
                    onPress={() => pick.mutate("library")}
                  />
                  <ReceiptActionButton
                    label="Remove"
                    icon="trash-outline"
                    destructive
                    disabled={pick.isPending}
                    onPress={() => setReceipt(null)}
                  />
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.receiptCard}>
              <View style={{ gap: 4 }}>
                <Text style={styles.receiptCardTitle}>Add a receipt</Text>
                <Text style={styles.receiptCardSubtitle}>
                  Keep proof of purchase attached to this record.
                </Text>
              </View>

              <View style={styles.pickButtonsRow}>
                <PickActionButton
                  icon="camera-outline"
                  label="Take photo"
                  disabled={pick.isPending}
                  onPress={() => pick.mutate("camera")}
                />
                <PickActionButton
                  icon="image-outline"
                  label="Choose photo"
                  disabled={pick.isPending}
                  onPress={() => pick.mutate("library")}
                />
              </View>
            </View>
          )}

          <FormError message={pickerError} />
        </View>

        {/* Section 2: Purchase details Form */}
        <View style={{ gap: 14 }}>
          <Text style={styles.sectionTitle}>Purchase details</Text>
          <PurchaseForm
            embedded
            onDirtyChange={setIsDirty}
            onSubmit={handleSubmit}
            submitLabel="Save purchase"
          />
        </View>
      </ScrollView>

      <Dialog
        visible={confirmDiscard}
        title="Discard purchase?"
        description="Your entered details will be lost."
        primaryLabel="Discard"
        destructive
        onPrimary={() => {
          setConfirmDiscard(false);
          if (router.canGoBack()) router.back();
          else router.replace("/(tabs)/purchases");
        }}
        secondaryLabel="Keep editing"
        onDismiss={() => setConfirmDiscard(false)}
      />
    </View>
  );
}

function PickActionButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.pickButton,
        {
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.pickIconBox}>
        <Ionicons name={icon} size={22} color="#6366F1" />
      </View>
      <Text style={styles.pickButtonText}>{label}</Text>
    </Pressable>
  );
}

function ReceiptActionButton({
  icon,
  label,
  disabled,
  destructive = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  disabled: boolean;
  destructive?: boolean | undefined;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.receiptActionButton,
        destructive && styles.receiptActionDestructive,
        { opacity: disabled ? 0.5 : pressed ? 0.78 : 1 },
      ]}
    >
      <Ionicons
        name={icon}
        size={15}
        color={destructive ? "#DC2626" : "#64748B"}
      />
      <Text
        style={[
          styles.receiptActionText,
          destructive && { color: "#DC2626" },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    position: "relative",
  },
  ambientGlowTopRight: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 260,
    height: 220,
    borderRadius: 130,
    backgroundColor: "#EDE9FE",
    opacity: 0.6,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    marginBottom: 4,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  navSpacer: {
    width: 42,
  },
  sectionHeaderStack: {
    gap: 2,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "400",
  },
  receiptCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 18,
    gap: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  receiptCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  receiptCardSubtitle: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
  pickButtonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  pickButton: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pickIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  pickButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 10,
    textAlign: "center",
  },
  receiptSelectedCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 16,
    gap: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  receiptThumb: {
    width: 88,
    height: 110,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  receiptFileName: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "700",
  },
  receiptNote: {
    color: "#64748B",
    fontSize: 13,
  },
  receiptActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  receiptActionButton: {
    height: 34,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    borderRadius: 999,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  receiptActionDestructive: {
    borderColor: "#FEE2E2",
    backgroundColor: "#FEF2F2",
  },
  receiptActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
});
