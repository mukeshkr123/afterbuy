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
        gap={tokens.spacing.lg}
        safeTop={false}
        contentStyle={{ paddingTop: tokens.spacing.lg }}
      >
        <View style={{ gap: tokens.spacing.sm }}>
          <SectionHeading title="Receipt" detail="Optional" />

          {receipt ? (
            <View
              style={[
                styles.receiptRow,
                {
                  gap: tokens.spacing.md,
                  backgroundColor: tokens.colors.surface,
                  borderColor: tokens.colors.border,
                  borderRadius: tokens.radius.lg,
                  padding: tokens.spacing.md,
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
              <View style={{ flex: 1, gap: 2 }}>
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
              </View>
              <Pressable
                onPress={() => setReceipt(null)}
                accessibilityRole="button"
                accessibilityLabel="Remove receipt image"
                hitSlop={10}
                style={({ pressed }) => [
                  styles.removeButton,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Ionicons
                  name="close-circle"
                  size={22}
                  color={tokens.colors.icon}
                />
              </Pressable>
            </View>
          ) : (
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

const styles = StyleSheet.create({
  receiptRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },
  thumb: {
    width: 48,
    height: 48,
  },
  removeButton: {
    width: 44,
    height: 44,
    alignItems: "flex-end",
    justifyContent: "center",
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
});
