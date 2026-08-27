import SegmentedControl from "@expo/ui/community/segmented-control";
import { Platform, View } from "react-native";
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
    <View accessibilityRole="tablist">
      <SegmentedControl
        values={tabs.map((tab) => tab.label)}
        selectedIndex={Math.max(
          0,
          tabs.findIndex((tab) => tab.key === activeKey)
        )}
        onValueChange={(label) => {
          const selected = tabs.find((tab) => tab.label === label);
          if (selected) onChange(selected.key);
        }}
        appearance={tokens.name}
        tintColor={tokens.colors.primary}
        style={{
          minHeight: Platform.select({ ios: 44, android: 48, default: 44 }),
        }}
      />
    </View>
  );
}
