import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PurchaseCategory } from "@acme/shared";
import { categoryIcon } from "../lib/purchaseDisplay";

interface ProductThumbnailProps {
  title: string;
  category?: PurchaseCategory;
  size?: number;
}

export function ProductThumbnail({
  title,
  category = "other",
  size = 52,
}: ProductThumbnailProps) {
  const normalized = title.toLowerCase();

  let imageSource: any = null;

  if (normalized.includes("doorbell") || normalized.includes("ring")) {
    imageSource = require("../../assets/ring_doorbell.jpg");
  } else if (normalized.includes("patio") || normalized.includes("heater")) {
    imageSource = require("../../assets/patio_heater_cover.jpg");
  } else if (
    normalized.includes("breville") ||
    normalized.includes("barista")
  ) {
    imageSource = require("../../assets/breville_barista.jpg");
  } else if (normalized.includes("airpods")) {
    imageSource = require("../../assets/airpods_pro.png");
  } else if (normalized.includes("iphone")) {
    imageSource = require("../../assets/iphone_thumb.png");
  }

  const innerSize = Math.round(size * 0.85);

  if (imageSource) {
    return (
      <View
        style={[
          styles.container,
          { width: size, height: size, borderRadius: Math.round(size * 0.28) },
        ]}
      >
        <Image
          source={imageSource}
          style={{ width: innerSize, height: innerSize }}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: Math.round(size * 0.28) },
      ]}
    >
      <Ionicons
        name={categoryIcon(category)}
        size={Math.round(size * 0.48)}
        color="#5B4DF5"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
});
