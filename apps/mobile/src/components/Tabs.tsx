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

export function SegmentedControl({ tabs, activeKey, onChange }: TabsProps) {
  const { tokens, reducedMotion } = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.container,
        {
          backgroundColor: tokens.colors.surfaceMuted,
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
                  ...tokens.shadow.raised,
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
                    ? tokens.colors.content.primary
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

/** @deprecated Prefer the behavior-named SegmentedControl export. */
export const Tabs = SegmentedControl;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    minHeight: 42,
    borderRadius: 12,
    padding: 3,
    alignItems: "center",
  },
  segment: {
    flex: 1,
    minHeight: 36,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedSegment: {
    overflow: "hidden",
  },
  label: {
    fontSize: 14,
    letterSpacing: -0.2,
  },
});
