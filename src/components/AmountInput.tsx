"use client";

import { fromRial, formatNumber, parseAmount, toRial, unitLabel } from "@/lib/money";
import { useSettings } from "@/lib/settings";
import { inputClass } from "./ui";

// Value is always Rial; the field shows and accepts the unit he picked in settings.
export function AmountInput({
  value,
  onChange,
  placeholder = "۰",
}: {
  value: number;
  onChange: (rial: number) => void;
  placeholder?: string;
}) {
  const { unit } = useSettings();
  const shown = value ? formatNumber(fromRial(value, unit)) : "";
  return (
    <div className="relative">
      <input
        className={`${inputClass} pe-16`}
        inputMode="numeric"
        value={shown}
        placeholder={placeholder}
        onChange={(e) => onChange(toRial(parseAmount(e.target.value), unit))}
      />
      <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm text-muted">
        {unitLabel(unit)}
      </span>
    </div>
  );
}
