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
  const { tokens } = useTheme();
  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: tokens.colors.border,
          paddingHorizontal: tokens.spacing.md,
        },
      ]}
    >
      {tabs.map((t) => {
        const active = t.key === activeKey;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.tab,
              {
                paddingVertical: tokens.spacing.md,
                borderBottomWidth: 2,
                borderBottomColor: active
                  ? tokens.colors.accent
                  : "transparent",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={{
                color: active ? tokens.colors.text : tokens.colors.textMuted,
                fontSize: tokens.type.body.fontSize,
                fontWeight: active ? "700" : "500",
              }}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { marginRight: 16 },
});
