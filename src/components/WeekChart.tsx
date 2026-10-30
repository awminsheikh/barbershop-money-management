"use client";

import Link from "next/link";
import { useMemo } from "react";
import { addDays, dayRange, startOfDay, WEEKDAYS_SHORT, weekdayIndex } from "@/lib/date";
import { useExpenses, useSales } from "@/lib/hooks";
import { formatMoney } from "@/lib/money";
import { summarize } from "@/lib/repo";
import { useSettings } from "@/lib/settings";
import { Icon } from "./Icon";

const DAYS = 7;
const BAR_AREA = 88;

// Income and expenses for the last seven days, as paired bars. Newest day is on the left (RTL time flow).
export function WeekChart({ now }: { now: Date }) {
  const { unit } = useSettings();
  const first = addDays(startOfDay(now), -(DAYS - 1));
  const from = first.getTime();
  const to = dayRange(now).to;
  const sales = useSales(from, to);
  const expenses = useExpenses(from, to);

  const days = useMemo(
    () =>
      Array.from({ length: DAYS }, (_, i) => {
        const day = addDays(from, i);
        const range = dayRange(day);
        const inDay = <T extends { date: number }>(rows: T[]) => rows.filter((r) => r.date >= range.from && r.date < range.to);
        const s = summarize(inDay(sales), inDay(expenses));
        return { day, income: s.income, expenses: s.expenses };
      }),
    [from, sales, expenses],
  );

  const max = Math.max(1, ...days.flatMap((d) => [d.income, d.expenses]));
  const totalIncome = days.reduce((t, d) => t + d.income, 0);
  const totalExpenses = days.reduce((t, d) => t + d.expenses, 0);
  const height = (v: number) => (v > 0 ? Math.max(3, Math.round((v / max) * BAR_AREA)) : 0);

  return (
    <Link href="/reports/" className="block rounded-2xl border border-line bg-card p-4 active:opacity-80">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">هفت روز اخیر</h2>
        <span className="flex items-center gap-1 text-xs text-muted">
          گزارش کامل
          <Icon name="chevron" className="h-3.5 w-3.5" />
        </span>
      </div>

      <div
        className="flex items-end justify-between gap-1"
        role="img"
        aria-label={`درآمد هفت روز اخیر ${formatMoney(totalIncome, unit)}، هزینه ${formatMoney(totalExpenses, unit)}`}
      >
        {days.map((d, i) => {
          const today = i === DAYS - 1;
          return (
            <div key={d.day.getTime()} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex items-end gap-[3px]" style={{ height: BAR_AREA }}>
                <div className="w-2.5 rounded-t-full bg-accent" style={{ height: height(d.income) }} />
                <div className="w-2.5 rounded-t-full bg-brand" style={{ height: height(d.expenses) }} />
              </div>
              <span className={`text-xs ${today ? "font-bold text-ink" : "text-muted"}`}>
                {WEEKDAYS_SHORT[weekdayIndex(d.day)]}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="text-muted">درآمد</span>
          {formatMoney(totalIncome, unit)}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-brand" />
          <span className="text-muted">هزینه</span>
          {formatMoney(totalExpenses, unit)}
        </span>
      </div>
    </Link>
  );
}
