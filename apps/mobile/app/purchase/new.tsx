import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import type { CreatePurchaseRequest } from "@acme/shared";
import {
  FormError,
  IconTile,
  ScreenHeader,
  ScreenScroll,
  SectionCard,
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
  const { tokens } = useTheme();

  // A receipt can only be uploaded against an existing purchase, so the chosen
  // image is held here and sent immediately after the purchase is created.
  const [receipt, setReceipt] = useState<ReceiptUpload | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);

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
            ? "Camera access is off. Enable it in Settings to photograph a bill."
            : "Photo access is off. Enable it in Settings to attach a bill."
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
      if (picked) setReceipt(picked);
    },
    onError: (e) =>
      setPickerError(e instanceof Error ? e.message : "Could not open picker."),
  });

  const handleSubmit = async (data: CreatePurchaseRequest) => {
    const created = await createPurchase(api, data);

    // A failed upload must not discard the purchase the user just entered —
    // surface it and let them retry from the receipts screen.
    if (receipt) {
      try {
        await uploadReceipt(api, created.id, receipt);
      } catch {
        setPickerError(
          "Order saved, but the bill image did not upload. Add it from the order's Bill & Documents."
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
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenScroll gap={tokens.spacing.lg + 2}>
        <ScreenHeader title="Add Order" />

        <SectionCard title="Bill">
          {receipt ? (
            <View style={[styles.receiptRow, { gap: tokens.spacing.md }]}>
              <Image
                source={{ uri: receipt.uri }}
                style={[
                  styles.thumb,
                  {
                    borderRadius: tokens.radius.md,
                    backgroundColor: tokens.colors.neutralSoft,
                  },
                ]}
                resizeMode="cover"
                accessibilityLabel="Selected bill image"
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
                    fontSize: tokens.type.bodySmall.fontSize,
                  }}
                >
                  Attaches when you save
                </Text>
              </View>
              <Pressable
                onPress={() => setReceipt(null)}
                accessibilityRole="button"
                accessibilityLabel="Remove bill image"
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
                label="Photograph bill"
                disabled={pick.isPending}
                onPress={() => pick.mutate("camera")}
              />
              <PickButton
                icon="image-outline"
                label="Choose from library"
                disabled={pick.isPending}
                onPress={() => pick.mutate("library")}
              />
            </View>
          )}
          <View style={{ marginTop: tokens.spacing.sm }}>
            <FormError message={pickerError} />
          </View>
        </SectionCard>

        <SectionCard title="Order details">
          <PurchaseForm
            embedded
            onSubmit={handleSubmit}
            submitLabel="Save order"
          />
        </SectionCard>
      </ScreenScroll>
    </>
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
          backgroundColor: tokens.colors.surfaceMuted,
          borderRadius: tokens.radius.lg,
          paddingVertical: tokens.spacing.lg,
          gap: tokens.spacing.sm,
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
  },
  thumb: {
    width: 56,
    height: 56,
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
    alignItems: "center",
    paddingHorizontal: 8,
    minHeight: 44,
  },
});
