import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import type { CreatePurchaseRequest } from "@acme/shared";
import {
  AppText,
  Dialog,
  FormError,
  IconTile,
  ScreenHeader,
  ScreenScroll,
  SectionHeading,
} from "@/components";
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
  const { tokens } = useTheme();
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
    <View style={{ flex: 1, backgroundColor: tokens.colors.canvas }}>
      <View
        style={{
          paddingTop: Math.max(insets.top, 12),
          paddingHorizontal: tokens.spacing.xl - 4,
          backgroundColor: tokens.colors.canvas,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: tokens.colors.border,
        }}
      >
        <ScreenHeader title="Add Purchase" onBack={handleBack} />
      </View>

      <ScreenScroll
        density="compact"
        gap={tokens.spacing.lg}
        safeTop={false}
        contentStyle={{ paddingTop: tokens.spacing.md }}
      >
        <View style={{ gap: tokens.spacing.sm }}>
          <SectionHeading title="Receipt" detail="Optional" />

          {receipt ? (
            <View
              style={[
                styles.receiptSelected,
                {
                  gap: tokens.spacing.md,
                  backgroundColor: tokens.colors.surface,
                  borderColor: tokens.colors.border,
                  borderRadius: tokens.radius.lg,
                  padding: tokens.spacing.sm + 2,
                },
              ]}
            >
              <Image
                source={{ uri: receipt.uri }}
                style={[
                  styles.thumb,
                  {
                    borderRadius: tokens.radius.sm,
                    backgroundColor: tokens.colors.neutralSoft,
                  },
                ]}
                resizeMode="cover"
                accessibilityLabel="Selected receipt image"
              />
              <View style={{ flex: 1, gap: tokens.spacing.sm }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: tokens.colors.text,
                    fontSize: tokens.type.bodySmall.fontSize,
                    fontWeight: "600",
                  }}
                >
                  {receipt.name}
                </Text>
                <Text
                  style={{
                    color: tokens.colors.textMuted,
                    fontSize: tokens.type.caption.fontSize,
                  }}
                >
                  Attaches when you save
                </Text>
                <View style={styles.receiptActions}>
                  <ReceiptAction
                    label="Retake"
                    icon="camera-outline"
                    disabled={pick.isPending}
                    onPress={() => pick.mutate("camera")}
                  />
                  <ReceiptAction
                    label="Replace"
                    icon="image-outline"
                    disabled={pick.isPending}
                    onPress={() => pick.mutate("library")}
                  />
                  <ReceiptAction
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
            <View
              style={[
                styles.receiptEmpty,
                {
                  backgroundColor: tokens.colors.surface,
                  borderColor: tokens.colors.border,
                  borderRadius: tokens.radius.lg,
                  padding: tokens.spacing.sm + 2,
                  gap: tokens.spacing.sm + 2,
                },
              ]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <AppText role="subheadline" weight="700">
                  Add a receipt
                </AppText>
                <AppText role="caption" tone="subtle">
                  Keep proof of purchase attached to this record.
                </AppText>
              </View>
              <View style={[styles.pickRow, { gap: tokens.spacing.md }]}>
                <PickButton
                  icon="camera-outline"
                  label="Take photo"
                  disabled={pick.isPending}
                  onPress={() => pick.mutate("camera")}
                />
                <PickButton
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

        <View style={{ gap: tokens.spacing.sm }}>
          <SectionHeading title="Purchase details" />
          <PurchaseForm
            embedded
            onDirtyChange={setIsDirty}
            onSubmit={handleSubmit}
            submitLabel="Save purchase"
          />
        </View>
      </ScreenScroll>

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

function PickButton({
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
  const { tokens } = useTheme();
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
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.lg,
          paddingVertical: tokens.spacing.md - 2,
          gap: tokens.spacing.xs,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <IconTile icon={icon} tone="accent" />
      <Text
        style={{
          color: tokens.colors.text,
          fontSize: tokens.type.bodySmall.fontSize,
          fontWeight: "600",
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ReceiptAction({
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
  const { tokens } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.receiptAction,
        {
          borderColor: tokens.colors.border,
          backgroundColor: tokens.colors.surfaceMuted,
          opacity: disabled ? 0.5 : pressed ? 0.78 : 1,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={destructive ? tokens.colors.dangerText : tokens.colors.icon}
      />
      <Text
        style={{
          color: destructive ? tokens.colors.dangerText : tokens.colors.text,
          fontSize: tokens.type.caption.fontSize,
          fontWeight: "700",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  receiptSelected: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
  },
  receiptEmpty: {
    borderWidth: 1,
  },
  thumb: {
    width: 88,
    height: 110,
  },
  pickRow: {
    flexDirection: "row",
  },
  pickButton: {
    flex: 1,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    minHeight: 66,
  },
  receiptActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  receiptAction: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
});
