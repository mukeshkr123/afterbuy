import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { PurchaseCategory } from "@acme/shared";

interface PurchaseArtworkTileProps {
  title: string;
  category?: PurchaseCategory;
  size?: number;
}

export function PurchaseArtworkTile({
  title,
  category = "other",
  size = 54,
}: PurchaseArtworkTileProps) {
  const normalized = title.toLowerCase();

  // 1. Specific product visual match to reference design:
  if (
    normalized.includes("doorbell") ||
    normalized.includes("ring") ||
    normalized.includes("chime")
  ) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.28),
            backgroundColor: "#EEF2FF",
          },
        ]}
      >
        <MaterialCommunityIcons
          name="doorbell-video"
          size={Math.round(size * 0.52)}
          color="#6366F1"
        />
      </View>
    );
  }

  if (
    normalized.includes("patio") ||
    normalized.includes("heater") ||
    normalized.includes("cover") ||
    normalized.includes("package")
  ) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.28),
            backgroundColor: "#EEF2FF",
          },
        ]}
      >
        <Ionicons
          name="cube-outline"
          size={Math.round(size * 0.5)}
          color="#6366F1"
        />
      </View>
    );
  }

  if (
    normalized.includes("breville") ||
    normalized.includes("barista") ||
    normalized.includes("espresso") ||
    normalized.includes("coffee")
  ) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.28),
            backgroundColor: "#EEF2FF",
          },
        ]}
      >
        <Ionicons
          name="cafe-outline"
          size={Math.round(size * 0.52)}
          color="#6366F1"
        />
      </View>
    );
  }

  if (
    normalized.includes("headphone") ||
    normalized.includes("sony") ||
    normalized.includes("wh-1000") ||
    normalized.includes("audio") ||
    normalized.includes("earbuds")
  ) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.28),
            backgroundColor: "#EEF2FF",
          },
        ]}
      >
        <Ionicons
          name="headset-outline"
          size={Math.round(size * 0.52)}
          color="#6366F1"
        />
      </View>
    );
  }

  if (
    normalized.includes("pack") ||
    normalized.includes("trail") ||
    normalized.includes("backpack") ||
    normalized.includes("rei") ||
    normalized.includes("luggage")
  ) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.28),
            backgroundColor: "#ECFDF5",
          },
        ]}
      >
        <MaterialCommunityIcons
          name="bag-personal-outline"
          size={Math.round(size * 0.52)}
          color="#059669"
        />
      </View>
    );
  }

  if (
    normalized.includes("dock") ||
    normalized.includes("usb") ||
    normalized.includes("anker") ||
    normalized.includes("charger") ||
    normalized.includes("hub")
  ) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.28),
            backgroundColor: "#F3E8FF",
          },
        ]}
      >
        <MaterialCommunityIcons
          name="usb-flash-drive-outline"
          size={Math.round(size * 0.52)}
          color="#7C3AED"
        />
      </View>
    );
  }

  if (
    normalized.includes("desk") ||
    normalized.includes("culla") ||
    normalized.includes("table") ||
    normalized.includes("chair") ||
    category === "furniture"
  ) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.28),
            backgroundColor: "#FEF3C7",
          },
        ]}
      >
        <MaterialCommunityIcons
          name="table-furniture"
          size={Math.round(size * 0.52)}
          color="#D97706"
        />
      </View>
    );
  }

  if (
    normalized.includes("shoe") ||
    normalized.includes("pegasus") ||
    normalized.includes("nike") ||
    category === "clothing"
  ) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.28),
            backgroundColor: "#FEE2E2",
          },
        ]}
      >
        <MaterialCommunityIcons
          name="shoe-sneaker"
          size={Math.round(size * 0.52)}
          color="#DC2626"
        />
      </View>
    );
  }

  if (
    normalized.includes("figma") ||
    normalized.includes("plan") ||
    normalized.includes("software") ||
    category === "services"
  ) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.28),
            backgroundColor: "#F3E8FF",
          },
        ]}
      >
        <Ionicons
          name="shapes-outline"
          size={Math.round(size * 0.52)}
          color="#7C3AED"
        />
      </View>
    );
  }

  if (
    normalized.includes("tire") ||
    normalized.includes("michelin") ||
    category === "vehicle"
  ) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.28),
            backgroundColor: "#F1F5F9",
          },
        ]}
      >
        <Ionicons
          name="car-outline"
          size={Math.round(size * 0.52)}
          color="#475569"
        />
      </View>
    );
  }

  // Fallbacks based on category
  switch (category) {
    case "electronics":
      return (
        <View
          style={[
            styles.container,
            {
              width: size,
              height: size,
              borderRadius: Math.round(size * 0.28),
              backgroundColor: "#EEF2FF",
            },
          ]}
        >
          <Ionicons
            name="hardware-chip-outline"
            size={Math.round(size * 0.52)}
            color="#6366F1"
          />
        </View>
      );
    case "appliances":
      return (
        <View
          style={[
            styles.container,
            {
              width: size,
              height: size,
              borderRadius: Math.round(size * 0.28),
              backgroundColor: "#EEF2FF",
            },
          ]}
        >
          <Ionicons
            name="cafe-outline"
            size={Math.round(size * 0.52)}
            color="#6366F1"
          />
        </View>
      );
    case "home_improvement":
      return (
        <View
          style={[
            styles.container,
            {
              width: size,
              height: size,
              borderRadius: Math.round(size * 0.28),
              backgroundColor: "#EEF2FF",
            },
          ]}
        >
          <Ionicons
            name="hammer-outline"
            size={Math.round(size * 0.52)}
            color="#6366F1"
          />
        </View>
      );
    default:
      return (
        <View
          style={[
            styles.container,
            {
              width: size,
              height: size,
              borderRadius: Math.round(size * 0.28),
              backgroundColor: "#EEF2FF",
            },
          ]}
        >
          <Ionicons
            name="cube-outline"
            size={Math.round(size * 0.52)}
            color="#6366F1"
          />
        </View>
      );
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
