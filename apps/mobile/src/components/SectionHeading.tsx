import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { useTheme } from "../theme/ThemeProvider";

export function SectionHeading({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string | null;
  action?: ReactNode;
}) {
  const { tokens } = useTheme();
  return (
    <View style={[styles.row, { gap: tokens.spacing.md }]}>
      <View style={styles.copy}>
        <AppText role="sectionTitle" tone="strong">
          {title}
        </AppText>
        {detail ? (
          <AppText role="caption" tone="subtle">
            {detail}
          </AppText>
        ) : null}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  copy: { flex: 1 },
});
