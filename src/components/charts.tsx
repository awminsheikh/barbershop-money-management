"use client";

import { useState } from "react";
import { toFa } from "@/lib/date";
import { formatMoney, type Unit } from "@/lib/money";

// Categorical slots in fixed order (validated on the card surface; see the dataviz palette). Income and expense
// keep the app's own accent / brand colors everywhere so they mean the same thing on every screen.
export const SERIES = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"];
const OTHER = "#8f9bab";

export interface Bucket {
  label: string;
  income: number;
  expenses: number;
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

// Income and expenses side by side per hour / day / month. Tap a column to read its amounts.
export function TrendChart({ buckets, unit, height = 112 }: { buckets: Bucket[]; unit: Unit; height?: number }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...buckets.flatMap((b) => [b.income, b.expenses]));
  const h = (v: number) => (v > 0 ? Math.max(3, Math.round((v / max) * height)) : 0);
  const step = Math.max(1, Math.ceil(buckets.length / 8));
  const shown = active !== null ? buckets[active] : undefined;
  return (
    <div>
      <div className="mb-2 min-h-5 text-sm">
        {shown ? (
          <>
            <span className="font-semibold">{shown.label}</span>
            <span className="text-muted"> · درآمد </span>
            {formatMoney(shown.income, unit)}
            <span className="text-muted"> · هزینه </span>
            {formatMoney(shown.expenses, unit)}
          </>
        ) : (
          <span className="text-xs text-muted">برای دیدن مبلغ، روی یک ستون بزنید</span>
        )}
      </div>
      <div className="flex items-end gap-[2px]" style={{ height }}>
        {buckets.map((b, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${b.label}: درآمد ${formatMoney(b.income, unit)}، هزینه ${formatMoney(b.expenses, unit)}`}
            onClick={() => setActive(active === i ? null : i)}
            className={`flex h-full flex-1 items-end justify-center gap-px rounded-t ${active === i ? "bg-line/60" : ""}`}
          >
            <span className="w-full max-w-2 rounded-t-sm bg-accent" style={{ height: h(b.income) }} />
            <span className="w-full max-w-2 rounded-t-sm bg-brand" style={{ height: h(b.expenses) }} />
          </button>
        ))}
      </div>
      <div className="mt-1 flex gap-[2px] text-[10px] text-muted">
        {buckets.map((b, i) => (
          <span key={i} className="flex-1 overflow-visible whitespace-nowrap text-center">
            {i % step === 0 ? b.label : ""}
          </span>
        ))}
      </div>
      <Legend
        items={[
          { color: "var(--accent)", label: "درآمد" },
          { color: "var(--brand)", label: "هزینه" },
        ]}
      />
    </div>
  );
}

export interface Slice {
  label: string;
  value: number;
}

// Share of a total. At most five named slices; the rest fold into "سایر". `money` shows amounts, otherwise counts.
export function Donut({ slices, unit, money = true }: { slices: Slice[]; unit: Unit; money?: boolean }) {
  const sorted = slices.filter((s) => s.value > 0).sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, SERIES.length);
  const rest = sorted.slice(SERIES.length).reduce((t, s) => t + s.value, 0);
  const parts = [...head.map((s, i) => ({ ...s, color: SERIES[i] })), ...(rest > 0 ? [{ label: "سایر", value: rest, color: OTHER }] : [])];
  const total = parts.reduce((t, s) => t + s.value, 0);
  if (total === 0) return <p className="py-4 text-center text-sm text-muted">داده‌ای نیست.</p>;

  let acc = 0;
  const gap = parts.length > 1 ? 1 : 0;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 42 42" className="h-28 w-28 shrink-0 -rotate-90" role="img" aria-label="نمودار سهم">
        <circle cx="21" cy="21" r="15.915" fill="none" stroke="var(--line)" strokeWidth="6" />
        {parts.map((p) => {
          const pct = (p.value / total) * 100;
          const el = (
            <circle
              key={p.label}
              cx="21"
              cy="21"
              r="15.915"
              fill="none"
              stroke={p.color}
              strokeWidth="6"
              strokeDasharray={`${Math.max(0, pct - gap)} ${100 - Math.max(0, pct - gap)}`}
              strokeDashoffset={-acc}
            />
          );
          acc += pct;
          return el;
        })}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
            <span className="min-w-0 flex-1 truncate">{p.label}</span>
            <span className="shrink-0 text-muted">{toFa(Math.round((p.value / total) * 100))}٪</span>
            <span className="hidden shrink-0 min-[380px]:inline">{money ? formatMoney(p.value, unit, false) : toFa(p.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Horizontal bars for a ranked list (services, products, customers).
export function HBars({ rows, color = "var(--brand)" }: { rows: { label: string; value: number; text: string }[]; color?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex justify-between gap-2 text-sm">
            <span className="truncate">{r.label}</span>
            <span className="shrink-0">{r.text}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-line">
            <div className="h-2 rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}
