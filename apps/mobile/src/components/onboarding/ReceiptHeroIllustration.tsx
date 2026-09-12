import React from "react";
import { Image, StyleSheet, View } from "react-native";

export interface ReceiptHeroIllustrationProps {
  compact?: boolean;
}

export function ReceiptHeroIllustration({
  compact = false,
}: ReceiptHeroIllustrationProps) {
  return (
    <View
      style={[styles.container, compact && styles.containerCompact]}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        source={require("../../../assets/welcome_slide3_hero.png")}
        style={styles.heroImage}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 350,
    height: 385,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginTop: -10,
  },
  containerCompact: {
    width: 310,
    height: 340,
    transform: [{ scale: 0.92 }],
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
});
