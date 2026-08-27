import { NativeDateField } from "./NativeDateField";

export interface DateFieldProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  error?: string | undefined;
}

export function DateField({ label, value, onChange, error }: DateFieldProps) {
  return (
    <NativeDateField
      label={label}
      value={value}
      onChange={onChange}
      error={error}
    />
  );
}
