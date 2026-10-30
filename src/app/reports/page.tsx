"use client";

import { useMemo, useState } from "react";
import { Button, Card, Empty, PageHeader, Segmented, Stat } from "@/components/ui";
import {
  addDays,
  dayRange,
  formatDate,
  formatDayMonth,
  formatMonth,
  formatTime,
  monthRange,
  startOfDay,
  toFa,
  toJ,
  weekRange,
} from "@/lib/date";
import { useById, useCustomers, useExpenseCategories, useExpenses, useSales } from "@/lib/hooks";
import { formatMoney } from "@/lib/money";
import { summarize, voidSale } from "@/lib/repo";
import { useSettings } from "@/lib/settings";
import { METHOD_LABEL, saleTotal, type PaymentMethod } from "@/lib/types";

type Mode = "day" | "week" | "month";

function usePeriod(mode: Mode, offset: number) {
  return useMemo(() => {
    const today = startOfDay(new Date());
    if (mode === "day") {
      const d = addDays(today, offset);
      return { ...dayRange(d), label: formatDate(d) };
    }
    if (mode === "week") {
      const w = weekRange(addDays(today, offset * 7));
      return { ...w, label: `هفته از ${formatDayMonth(w.from)}` };
    }
    const { jy, jm } = toJ(today);
    const idx = jy * 12 + (jm - 1) + offset;
    const y = Math.floor(idx / 12);
    const m = (idx % 12) + 1;
    return { ...monthRange(y, m), label: formatMonth(y, m) };
  }, [mode, offset]);
}

export default function ReportsPage() {
  const { unit } = useSettings();
  const [mode, setMode] = useState<Mode>("month");
  const [offset, setOffset] = useState(0);
  const { from, to, label } = usePeriod(mode, offset);

  const sales = useSales(from, to);
  const expenses = useExpenses(from, to);
  const customers = useById(useCustomers());
  const categories = useById(useExpenseCategories());
  const summary = useMemo(() => summarize(sales, expenses), [sales, expenses]);

  const byCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of expenses) {
      const name = categories.get(e.categoryId as number)?.name ?? "بدون دسته";
      totals.set(name, (totals.get(name) ?? 0) + e.amount);
    }
    return [...totals.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  }, [expenses, categories]);

  const maxService = Math.max(1, ...summary.byService.map((s) => s.amount));

  return (
    <>
      <PageHeader title="گزارش‌ها" />
      <Segmented
        value={mode}
        onChange={(m) => {
          setMode(m);
          setOffset(0);
        }}
        options={[
          { value: "day", label: "روز" },
          { value: "week", label: "هفته" },
          { value: "month", label: "ماه" },
        ]}
      />
      <div className="my-4 flex items-center justify-between">
        <button type="button" className="min-h-11 min-w-11 text-xl" onClick={() => setOffset(offset - 1)} aria-label="قبل">
          ›
        </button>
        <div className="font-semibold">{label}</div>
        <button type="button" className="min-h-11 min-w-11 text-xl disabled:opacity-30" disabled={offset >= 0} onClick={() => setOffset(offset + 1)} aria-label="بعد">
          ‹
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Stat label="تعداد مراجعه" value={toFa(summary.visits)} />
        <Stat label="درآمد" value={formatMoney(summary.income, unit)} tone="good" />
        <Stat label="هزینه" value={formatMoney(summary.expenses, unit)} tone="bad" />
        <Stat label="سود" value={formatMoney(summary.profit, unit)} tone={summary.profit < 0 ? "bad" : "good"} />
      </div>
      <p className="mb-6 text-sm text-muted">
        شامل انعام {formatMoney(summary.tips, unit)} و پس از کسر تخفیف {formatMoney(summary.discounts, unit)}
      </p>

      <Card className="mb-4 space-y-2">
        <h2 className="font-semibold">روش پرداخت</h2>
        {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => (
          <div key={m} className="flex justify-between">
            <span className="text-muted">{METHOD_LABEL[m]}</span>
            <span>{formatMoney(summary.byMethod[m], unit)}</span>
          </div>
        ))}
      </Card>

      {summary.byService.length > 0 && (
        <Card className="mb-4 space-y-3">
          <h2 className="font-semibold">درآمد به تفکیک خدمت</h2>
          {summary.byService.map((s) => (
            <div key={s.name}>
              <div className="flex justify-between text-sm">
                <span>{s.name}</span>
                <span>{formatMoney(s.amount, unit)}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-line">
                <div className="h-2 rounded-full bg-brand" style={{ width: `${(s.amount / maxService) * 100}%` }} />
              </div>
            </div>
          ))}
        </Card>
      )}

      {byCategory.length > 0 && (
        <Card className="mb-4 space-y-2">
          <h2 className="font-semibold">هزینه به تفکیک دسته</h2>
          {byCategory.map((c) => (
            <div key={c.name} className="flex justify-between">
              <span className="text-muted">{c.name}</span>
              <span>{formatMoney(c.amount, unit)}</span>
            </div>
          ))}
        </Card>
      )}

      <h2 className="mb-2 font-semibold">فروش‌ها</h2>
      {sales.length === 0 ? (
        <Empty>در این بازه فروشی ثبت نشده است.</Empty>
      ) : (
        <div className="space-y-2">
          {sales.map((s) => (
            <Card key={s.id} className={s.voided ? "opacity-50" : ""}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className={`truncate font-semibold ${s.voided ? "line-through" : ""}`}>
                    {customers.get(s.customerId as number)?.name ?? "بدون نام"}
                  </div>
                  <div className="truncate text-sm text-muted">
                    {formatDate(s.date, false)} · {formatTime(s.date)} · {METHOD_LABEL[s.method]}
                  </div>
                  <div className="truncate text-sm text-muted">{s.items.map((i) => i.name).join("، ")}</div>
                </div>
                <div className={s.voided ? "line-through" : "font-bold"}>{formatMoney(saleTotal(s), unit)}</div>
              </div>
              {!s.voided && (
                <Button
                  variant="ghost"
                  className="mt-1 w-full text-bad"
                  onClick={() => {
                    if (confirm("این فروش باطل شود؟ در حساب‌ها حساب نمی‌شود.")) voidSale(s.id!);
                  }}
                >
                  ابطال فروش
                </Button>
              )}
              {s.voided && <div className="mt-1 text-sm text-bad">باطل شده</div>}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
