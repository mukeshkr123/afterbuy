import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function DashboardHeroIllustration() {
  return (
    <View
      style={styles.container}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    >
      {/* Soft pastel ambient background glow */}
      <View style={styles.glowOuter} />
      <View style={styles.glowInner} />

      {/* Left Card: Shield */}
      <View style={styles.shieldCard}>
        <Ionicons name="shield-checkmark" size={24} color="#10B981" />
      </View>

      {/* Center Card: Shopping bag with top rays */}
      <View style={styles.bagCard}>
        {/* Celebration burst rays */}
        <View style={styles.raysContainer}>
          <View style={[styles.ray, styles.rayLeft]} />
          <View style={[styles.ray, styles.rayCenter]} />
          <View style={[styles.ray, styles.rayRight]} />
        </View>

        <Ionicons name="bag-handle" size={28} color="#6366F1" />
      </View>

      {/* Right Card: Bell */}
      <View style={styles.bellCard}>
        <Ionicons name="notifications" size={22} color="#D97706" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 140,
    height: 110,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  glowOuter: {
    position: "absolute",
    width: 120,
    height: 95,
    borderRadius: 50,
    backgroundColor: "#E8EDFB",
    opacity: 0.85,
    top: 6,
    right: 4,
  },
  glowInner: {
    position: "absolute",
    width: 90,
    height: 80,
    borderRadius: 45,
    backgroundColor: "#F3E8FF",
    opacity: 0.6,
    top: 14,
    left: 20,
  },
  shieldCard: {
    position: "absolute",
    left: 4,
    top: 36,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-12deg" }],
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 1,
  },
  bagCard: {
    position: "absolute",
    left: 42,
    top: 18,
    width: 54,
    height: 58,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "4deg" }],
    borderWidth: 1,
    borderColor: "#EEF2FF",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 3,
  },
  raysContainer: {
    position: "absolute",
    top: -15,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    pointerEvents: "none",
  },
  ray: {
    backgroundColor: "#6366F1",
    borderRadius: 2,
  },
  rayLeft: {
    width: 2.5,
    height: 9,
    transform: [{ rotate: "-30deg" }],
    opacity: 0.8,
  },
  rayCenter: {
    width: 2.5,
    height: 12,
    marginBottom: 2,
  },
  rayRight: {
    width: 2.5,
    height: 9,
    transform: [{ rotate: "30deg" }],
    opacity: 0.8,
  },
  bellCard: {
    position: "absolute",
    right: 2,
    top: 35,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "14deg" }],
    borderWidth: 1,
    borderColor: "#FDE68A",
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 2,
  },
});
