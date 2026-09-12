import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function RemindersBellIllustration() {
  return (
    <View
      style={styles.container}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    >
      {/* Ambient background glow */}
      <View style={styles.glow} />

      {/* Top right ringing rays */}
      <View style={styles.raysContainer}>
        <View style={[styles.ray, styles.rayShort]} />
        <View style={[styles.ray, styles.rayLong]} />
      </View>

      {/* 3D Tilted white card with purple bell */}
      <View style={styles.card}>
        <Ionicons name="notifications" size={28} color="#6366F1" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 80,
    height: 80,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#EDE9FE",
    opacity: 0.7,
    top: -5,
    right: -10,
  },
  raysContainer: {
    position: "absolute",
    top: 4,
    right: 6,
    zIndex: 2,
    flexDirection: "row",
    gap: 4,
    alignItems: "flex-end",
  },
  ray: {
    width: 2.5,
    backgroundColor: "#6366F1",
    borderRadius: 1.5,
  },
  rayShort: {
    height: 8,
    transform: [{ rotate: "35deg" }],
  },
  rayLong: {
    height: 11,
    transform: [{ rotate: "65deg" }],
  },
  card: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "10deg" }],
    shadowColor: "#5B4DF5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
});
