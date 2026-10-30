"use client";

import { jalaaliMonthLength } from "jalaali-js";
import { useState } from "react";
import { fromJ, formatMonth, isSameDay, toFa, toJ, weekdayIndex, WEEKDAYS_SHORT } from "@/lib/date";
import { DateStepper, Sheet } from "./ui";

// Month grid in the Jalali calendar, weeks starting on Saturday.
export function JalaliCalendar({
  open,
  value,
  onPick,
  onClose,
}: {
  open: boolean;
  value: Date;
  onPick: (d: Date) => void;
  onClose: () => void;
}) {
  const start = toJ(value);
  const [view, setView] = useState({ jy: start.jy, jm: start.jm });

  const shift = (delta: number) => {
    const idx = view.jy * 12 + (view.jm - 1) + delta;
    setView({ jy: Math.floor(idx / 12), jm: (idx % 12) + 1 });
  };

  const first = fromJ(view.jy, view.jm, 1);
  const lead = weekdayIndex(first);
  const days = jalaaliMonthLength(view.jy, view.jm);
  const today = new Date();

  return (
    <Sheet open={open} title="انتخاب تاریخ" onClose={onClose}>
      <DateStepper label={formatMonth(view.jy, view.jm)} onPrev={() => shift(-1)} onNext={() => shift(1)} />
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {WEEKDAYS_SHORT.map((w) => (
          <div key={w} className="py-1 text-muted">
            {w}
          </div>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <div key={`e${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const date = fromJ(view.jy, view.jm, i + 1);
          const selected = isSameDay(date, value);
          const isToday = isSameDay(date, today);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPick(date)}
              className={`min-h-11 rounded-xl ${
                selected
                  ? "bg-brand font-bold text-brand-ink"
                  : isToday
                    ? "border border-brand"
                    : "border border-transparent"
              }`}
            >
              {toFa(i + 1)}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="min-h-11 w-full text-brand"
        onClick={() => {
          onPick(new Date());
        }}
      >
        امروز
      </button>
    </Sheet>
  );
}
