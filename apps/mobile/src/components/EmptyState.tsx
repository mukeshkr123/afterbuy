import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export interface EmptyStateProps {
  title: string;
  message?: string | undefined;
}

export function EmptyState({ title, message }: EmptyStateProps) {
  const { tokens } = useTheme();
  return (
    <View
      style={[
        styles.container,
        {
          padding: tokens.spacing.xl,
          gap: tokens.spacing.sm,
        },
      ]}
    >
      <Text
        style={{
          color: tokens.colors.text,
          fontSize: tokens.type.title.fontSize,
          fontWeight: "700",
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      {message ? (
        <Text
          style={{
            color: tokens.colors.textMuted,
            fontSize: tokens.type.body.fontSize,
            textAlign: "center",
          }}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
