import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export interface TabDescriptor {
  key: string;
  label: string;
}

export interface TabsProps {
  tabs: TabDescriptor[];
  activeKey: string;
  onChange: (key: string) => void;
}

export function Tabs({ tabs, activeKey, onChange }: TabsProps) {
  const { tokens, reducedMotion } = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.container,
        {
          backgroundColor: tokens.colors.surfaceMuted,
          borderColor: tokens.colors.border,
        },
      ]}
    >
      {tabs.map((tab) => {
        const isSelected = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={tab.label}
            onPress={() => onChange(tab.key)}
            style={({ pressed }) => [
              styles.segment,
              isSelected && [
                styles.selectedSegment,
                {
                  backgroundColor: tokens.colors.surface,
                  borderColor: tokens.colors.border,
                },
              ],
              pressed && !reducedMotion && { opacity: 0.8 },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: isSelected
                    ? tokens.colors.text
                    : tokens.colors.textMuted,
                  fontWeight: isSelected ? "600" : "500",
                },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
    alignItems: "center",
  },
  segment: {
    flex: 1,
    height: "100%",
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedSegment: {
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  label: {
    fontSize: 15,
    letterSpacing: -0.2,
  },
});
