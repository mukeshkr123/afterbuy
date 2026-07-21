import { Text, type TextStyle } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

/** Rendered when an amount is genuinely absent. Never a placeholder number. */
export const NO_AMOUNT = "—";

/**
 * Formats a minor-unit amount for display.
 *
 * Returns `NO_AMOUNT` when the amount is null/undefined — callers must not
 * substitute a sample figure, which is how "₹79,900" ended up on screens with
 * no purchase data.
 */
export function formatMoney(
  amountMinor: number | null | undefined,
  currency: string | null | undefined
): string {
  if (amountMinor === null || amountMinor === undefined) return NO_AMOUNT;
  const code = currency && currency.length === 3 ? currency : null;
  if (!code) return String(amountMinor / 100);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
    }).format(amountMinor / 100);
  } catch {
    // Unknown ISO code — Intl throws rather than degrading.
    return `${code} ${(amountMinor / 100).toFixed(2)}`;
  }
}

export interface MoneyProps {
  amountMinor: number | null | undefined;
  currency: string | null | undefined;
  emphasis?: "normal" | "strong";
  style?: TextStyle | undefined;
}

export function Money({
  amountMinor,
  currency,
  emphasis = "normal",
  style,
}: MoneyProps) {
  const { tokens } = useTheme();
  const text = formatMoney(amountMinor, currency);
  const absent = text === NO_AMOUNT;
  return (
    <Text
      style={[
        {
          color: absent ? tokens.colors.textMuted : tokens.colors.text,
          fontSize: tokens.type.body.fontSize,
          fontWeight: emphasis === "strong" ? "700" : "400",
        },
        style,
      ]}
    >
      {text}
    </Text>
  );
}
