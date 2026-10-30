"use client";

import { useState } from "react";
import { inputClass } from "./ui";

export function PasswordField({
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input
        className={`${inputClass} pe-20`}
        type={shown ? "text" : "password"}
        dir="ltr"
        style={{ textAlign: "right" }}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="button" className="absolute inset-y-0 end-3 text-sm text-accent" onClick={() => setShown(!shown)}>
        {shown ? "پنهان" : "نمایش"}
      </button>
    </div>
  );
}
