"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db } from "@/lib/db";
import { dayRange, formatDate } from "@/lib/date";
import { useExpenses, useSales } from "@/lib/hooks";
import { formatMoney } from "@/lib/money";
import { closeDay } from "@/lib/repo";
import { useSettings } from "@/lib/settings";
import { saleTotal } from "@/lib/types";
import { AmountInput } from "./AmountInput";
import { Button, Card, Sheet, Toggle } from "./ui";

// End-of-day cash count: what the till should hold from today's cash sales vs what he counted.
export function DayCloseSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { unit } = useSettings();
  const [{ from, to }] = useState(() => dayRange(Date.now()));
  const sales = useSales(from, to);
  const expenses = useExpenses(from, to);
  const closes = useLiveQuery(() => db.dayCloses.orderBy("day").reverse().limit(5).toArray(), []) ?? [];
  const [counted, setCounted] = useState(0);
  const [paidFromTill, setPaidFromTill] = useState(false);

  // A deposit was paid on an earlier day, so it is not in today's till.
  const cashIn = sales
    .filter((s) => !s.voided && s.method === "cash")
    .reduce((t, s) => t + Math.max(0, saleTotal(s) - s.deposit), 0);
  const spent = expenses.reduce((t, e) => t + e.amount, 0);
  const expected = cashIn - (paidFromTill ? spent : 0);
  const diff = counted - expected;
  const alreadyClosed = closes.some((c) => c.day === from);

  return (
    <Sheet open={open} title="بستن صندوق امروز" onClose={onClose}>
      <Card className="space-y-2">
        <div className="flex justify-between">
          <span className="text-muted">نقد دریافتی امروز</span>
          <span>{formatMoney(cashIn, unit)}</span>
        </div>
        <Toggle
          checked={paidFromTill}
          onChange={setPaidFromTill}
          label={`هزینه‌های امروز (${formatMoney(spent, unit)}) از صندوق پرداخت شد`}
        />
        <div className="flex justify-between border-t border-line pt-2 font-bold">
          <span>موجودی مورد انتظار</span>
          <span>{formatMoney(expected, unit)}</span>
        </div>
      </Card>
      <div>
        <div className="mb-1 text-sm text-muted">نقد شمارش‌شده</div>
        <AmountInput value={counted} onChange={setCounted} />
      </div>
      {counted > 0 && (
        <div className={`rounded-xl p-3 text-center font-semibold ${diff === 0 ? "text-good" : "text-bad"}`}>
          {diff === 0 ? "صندوق مطابقت دارد" : diff > 0 ? `${formatMoney(diff, unit)} اضافه` : `${formatMoney(-diff, unit)} کسری`}
        </div>
      )}
      <Button
        className="w-full"
        disabled={counted <= 0}
        onClick={async () => {
          await closeDay(from, expected, counted);
          setCounted(0);
          onClose();
        }}
      >
        {alreadyClosed ? "ثبت دوباره" : "ثبت بستن صندوق"}
      </Button>
      {closes.length > 0 && (
        <Card className="space-y-1 text-sm">
          <div className="font-semibold">آخرین بستن‌ها</div>
          {closes.map((c) => {
            const d = c.counted - c.expected;
            return (
              <div key={c.id} className="flex justify-between">
                <span className="text-muted">{formatDate(c.day, false)}</span>
                <span className={d === 0 ? "text-good" : "text-bad"}>
                  {d === 0 ? "مطابق" : `${d > 0 ? "+" : "−"}${formatMoney(Math.abs(d), unit)}`}
                </span>
              </div>
            );
          })}
        </Card>
      )}
    </Sheet>
  );
}
