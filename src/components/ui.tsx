"use client";

import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Icon } from "./Icon";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-brand-ink",
  secondary: "bg-card text-ink border border-line",
  danger: "bg-card text-bad border border-line",
  ghost: "text-muted",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`min-h-12 rounded-xl px-4 font-semibold active:opacity-70 disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
    />
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-card p-4 ${className}`}>{children}</div>;
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h1 className="text-xl font-bold">{title}</h1>
      {action}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full min-h-12 rounded-xl border border-line bg-card px-3 text-ink outline-none focus:border-brand";

export function Chip({
  active,
  children,
  onClick,
  disabled,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`min-h-11 rounded-full border px-4 text-sm active:opacity-70 disabled:opacity-35 ${
        active ? "border-brand bg-brand text-brand-ink font-semibold" : "border-line bg-card text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-xl border border-line bg-card p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`min-h-10 flex-1 rounded-lg px-2 text-sm ${
            value === o.value ? "bg-brand font-semibold text-brand-ink" : "text-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex min-h-12 w-full items-center justify-between gap-3 text-start"
    >
      <span>{label}</span>
      <span className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 ${checked ? "bg-brand" : "bg-line"}`}>
        <span
          className={`h-5 w-5 rounded-full bg-white transition-transform ${checked ? "-translate-x-5" : "translate-x-0"}`}
        />
      </span>
    </button>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-10 text-center text-muted">{children}</p>;
}

let openSheets = 0;

export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    // The page scrolls inside #app-scroll; globals.css stops it while any sheet is open.
    openSheets++;
    document.body.dataset.sheet = "open";
    return () => {
      if (--openSheets === 0) delete document.body.dataset.sheet;
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-bg p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="min-h-11 px-3 text-muted">
            بستن
          </button>
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 text-lg font-bold ${tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : ""}`}>
        {value}
      </div>
    </div>
  );
}

// Previous / next with a label between. In RTL "previous" sits on the right and points right, "next" on the left.
export function DateStepper({
  label,
  onPrev,
  onNext,
  onLabel,
  nextDisabled,
  prevDisabled,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onLabel?: () => void;
  nextDisabled?: boolean;
  prevDisabled?: boolean;
}) {
  const side = "flex min-h-12 min-w-12 items-center justify-center rounded-xl border border-line bg-card active:opacity-70 disabled:opacity-30";
  return (
    <div className="flex items-center justify-between gap-2">
      <button type="button" className={side} onClick={onPrev} disabled={prevDisabled} aria-label="قبلی">
        <Icon name="chevron" className="h-5 w-5 rotate-180" />
      </button>
      {onLabel ? (
        <button type="button" className="min-h-12 flex-1 rounded-xl border border-line bg-card px-2 font-semibold" onClick={onLabel}>
          {label}
        </button>
      ) : (
        <div className="flex min-h-12 flex-1 items-center justify-center font-semibold">{label}</div>
      )}
      <button type="button" className={side} onClick={onNext} disabled={nextDisabled} aria-label="بعدی">
        <Icon name="chevron" className="h-5 w-5" />
      </button>
    </div>
  );
}
