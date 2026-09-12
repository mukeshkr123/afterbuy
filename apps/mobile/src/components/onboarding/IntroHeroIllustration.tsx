import React from "react";
import { Image, StyleSheet, View } from "react-native";

export interface IntroHeroIllustrationProps {
  compact?: boolean;
}

export function IntroHeroIllustration({
  compact = false,
}: IntroHeroIllustrationProps) {
  return (
    <View
      style={[styles.container, compact && styles.containerCompact]}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        source={require("../../../assets/welcome_slide2_hero.png")}
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
    height: 138,
    marginTop: -8,
    marginBottom: 0,
  },
  containerCompact: {
    height: 124,
    transform: [{ scale: 0.92 }],
  },
  heroImage: {
    width: 295,
    height: 155,
  },
});
