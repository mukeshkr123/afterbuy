import { Text, type TextProps, type TextStyle } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export type AppTextRole =
  "largeTitle" | "title" | "headline" | "body" | "subheadline" | "caption";

export interface AppTextProps extends Omit<TextProps, "role"> {
  role?: AppTextRole;
  tone?: "strong" | "default" | "subtle" | "muted" | "accent" | "danger";
  weight?: TextStyle["fontWeight"];
}

export function AppText({
  role = "body",
  tone = "default",
  weight,
  style,
  ...props
}: AppTextProps) {
  const { tokens } = useTheme();
  const color =
    tone === "strong"
      ? tokens.colors.textStrong
      : tone === "subtle"
        ? tokens.colors.textSubtle
        : tone === "muted"
          ? tokens.colors.textMuted
          : tone === "accent"
            ? tokens.colors.primary
            : tone === "danger"
              ? tokens.colors.dangerText
              : tokens.colors.text;

  return (
    <Text
      maxFontSizeMultiplier={2}
      {...props}
      style={[
        {
          color,
          fontSize: tokens.type[role].fontSize,
          lineHeight: tokens.type[role].lineHeight,
          fontWeight:
            weight ??
            (role === "largeTitle"
              ? "800"
              : role === "title" || role === "headline"
                ? "700"
                : "400"),
        },
        style,
      ]}
    />
  );
}
