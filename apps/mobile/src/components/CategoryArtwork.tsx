import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import type { PurchaseCategory } from "@acme/shared";
import { categoryIcon } from "../lib/purchaseDisplay";
import { useTheme } from "../theme/ThemeProvider";

export function CategoryArtwork({
  category,
  size = "md",
}: {
  category: PurchaseCategory;
  size?: "sm" | "md" | "lg";
}) {
  const { tokens } = useTheme();
  const box = size === "lg" ? 88 : size === "sm" ? 40 : 52;
  const glyph = size === "lg" ? 40 : size === "sm" ? 19 : 24;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.box,
        {
          width: box,
          height: box,
          borderRadius: size === "lg" ? tokens.radius.xl : tokens.radius.lg,
          backgroundColor: tokens.colors.accentSoft,
        },
      ]}
    >
      <Ionicons
        name={categoryIcon(category)}
        size={glyph}
        color={tokens.colors.accent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center" },
});
