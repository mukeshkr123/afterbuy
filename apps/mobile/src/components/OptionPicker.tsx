import { SelectionField } from "./SelectionField";

export interface OptionPickerProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (next: T) => void;
  error?: string | undefined;
}

export function OptionPicker<T extends string>({
  label,
  value,
  options,
  onChange,
  error,
}: OptionPickerProps<T>) {
  return (
    <SelectionField
      label={label}
      value={value}
      options={options}
      onChange={onChange}
      error={error}
    />
  );
}
