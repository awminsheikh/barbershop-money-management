"use client";

import { useMemo } from "react";
import { addDays, dayRange, formatDate, formatDayMonth, formatMonth, fromJ, monthRange, startOfDay, toFa, toJ, weekRange } from "./date";

export type PeriodMode = "day" | "week" | "month" | "year";

// [from, to) for the day / week / month / year `offset` steps from today, with a label to show.
export function usePeriod(mode: PeriodMode | "all", offset: number) {
  return useMemo(() => {
    const today = startOfDay(new Date());
    if (mode === "all") return { from: 0, to: addDays(today, 1).getTime() * 2, label: "همه" };
    if (mode === "day") {
      const d = addDays(today, offset);
      return { ...dayRange(d), label: formatDate(d) };
    }
    if (mode === "week") {
      const w = weekRange(addDays(today, offset * 7));
      return { ...w, label: `هفته از ${formatDayMonth(w.from)}` };
    }
    const { jy, jm } = toJ(today);
    if (mode === "year") {
      const y = jy + offset;
      return { from: fromJ(y, 1, 1).getTime(), to: fromJ(y + 1, 1, 1).getTime(), label: `سال ${toFa(y)}` };
    }
    const idx = jy * 12 + (jm - 1) + offset;
    const y = Math.floor(idx / 12);
    const m = (idx % 12) + 1;
    return { ...monthRange(y, m), label: formatMonth(y, m) };
  }, [mode, offset]);
}
