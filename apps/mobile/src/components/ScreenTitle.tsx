import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { useTheme } from "../theme/ThemeProvider";

export interface ScreenTitleProps {
  title: string;
  subtitle?: string | null;
  action?: ReactNode;
}

export function ScreenTitle({ title, subtitle, action }: ScreenTitleProps) {
  const { tokens } = useTheme();
  return (
    <View style={[styles.row, { gap: tokens.spacing.lg }]}>
      <View style={[styles.copy, { gap: 2 }]}>
        <AppText role="screenTitle" tone="strong" numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText role="subheadline" tone="subtle">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  copy: { flex: 1 },
});
