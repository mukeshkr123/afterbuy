import React from "react";
import { Image, StyleSheet, View } from "react-native";

export interface AuthHeroIllustrationProps {
  compact?: boolean;
}

export function AuthHeroIllustration({
  compact = false,
}: AuthHeroIllustrationProps) {
  return (
    <View
      style={[styles.container, compact && styles.containerCompact]}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        source={require("../../../assets/auth_hero.png")}
        style={styles.heroImage}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    height: 150,
    marginTop: -2,
    marginBottom: 6,
  },
  containerCompact: {
    height: 132,
    transform: [{ scale: 0.92 }],
  },
  heroImage: {
    width: 275,
    height: 150,
  },
});
