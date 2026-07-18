import { Switch as RNSwitch } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export interface SwitchProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean | undefined;
  accessibilityLabel?: string | undefined;
}

export function Switch({
  value,
  onValueChange,
  disabled,
  accessibilityLabel,
}: SwitchProps) {
  const { tokens } = useTheme();
  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ false: tokens.colors.border, true: tokens.colors.accent }}
      thumbColor={value ? tokens.colors.accentText : tokens.colors.surface}
    />
  );
}
