import { Text } from "react-native";
import { Card } from "./Card";
import { useTheme } from "../theme/ThemeProvider";

export function FormError({ message }: { message: string | null | undefined }) {
  const { tokens } = useTheme();
  if (!message) return null;
  return (
    <Card tone="danger">
      <Text
        style={{
          color: tokens.colors.danger,
          fontSize: tokens.type.bodySmall.fontSize,
        }}
      >
        {message}
      </Text>
    </Card>
  );
}
