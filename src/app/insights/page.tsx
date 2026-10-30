"use client";

import { useMemo, useState } from "react";
import { Card, Empty, PageHeader, Segmented } from "@/components/ui";
import { addDays, startOfDay, toFa, weekdayIndex, WEEKDAYS } from "@/lib/date";
import { useById, useCustomers, useSales } from "@/lib/hooks";
import { formatMoney } from "@/lib/money";
import { useSettings } from "@/lib/settings";
import { saleTotal } from "@/lib/types";

type Span = "30" | "90" | "365";

function Bars({ rows, highlight }: { rows: { label: string; value: number }[]; highlight: number }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-1">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-16 shrink-0 text-muted">{r.label}</span>
          <div className="h-3 flex-1 rounded-full bg-line">
            <div
              className={`h-3 rounded-full ${i === highlight && r.value > 0 ? "bg-brand" : "bg-accent/60"}`}
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
          <span className="w-8 text-end">{toFa(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function InsightsPage() {
  const { unit } = useSettings();
  const [span, setSpan] = useState<Span>("30");
  const [now] = useState(() => Date.now());
  const from = addDays(startOfDay(now), -Number(span)).getTime();
  const sales = useSales(from, now + 1);
  const customers = useById(useCustomers());

  const data = useMemo(() => {
    const live = sales.filter((s) => !s.voided);
    const byHour = Array.from({ length: 24 }, () => 0);
    const byDay = Array.from({ length: 7 }, () => 0);
    const perCustomer = new Map<number, { visits: number; spent: number }>();
    let income = 0;
    for (const s of live) {
      const d = new Date(s.date);
      byHour[d.getHours()] += 1;
      byDay[weekdayIndex(d)] += 1;
      income += saleTotal(s) - (s.vat ?? 0);
      if (s.customerId !== undefined) {
        const cur = perCustomer.get(s.customerId) ?? { visits: 0, spent: 0 };
        cur.visits += 1;
        cur.spent += saleTotal(s);
        perCustomer.set(s.customerId, cur);
      }
    }
    const named = [...perCustomer.entries()];
    const returning = named.filter(([, v]) => v.visits >= 2).length;
    // Show only the hours that have bookings plus the neighbours, so the chart stays short.
    const active = byHour.flatMap((v, h) => (v > 0 ? [h] : []));
    const lo = active.length ? Math.max(0, Math.min(...active) - 1) : 8;
    const hi = active.length ? Math.min(23, Math.max(...active) + 1) : 20;
    return {
      visits: live.length,
      avg: live.length ? income / live.length : 0,
      hours: byHour.slice(lo, hi + 1).map((value, i) => ({ label: `${toFa(lo + i)}:۰۰`, value })),
      peakHour: byHour.slice(lo, hi + 1).indexOf(Math.max(...byHour.slice(lo, hi + 1))),
      days: byDay.map((value, i) => ({ label: WEEKDAYS[i], value })),
      peakDay: byDay.indexOf(Math.max(...byDay)),
      top: named.sort((a, b) => b[1].spent - a[1].spent).slice(0, 5),
      returningShare: named.length ? Math.round((returning / named.length) * 100) : 0,
      namedCount: named.length,
    };
  }, [sales]);

  return (
    <>
      <PageHeader title="تحلیل کسب‌وکار" />
      <Segmented<Span>
        value={span}
        onChange={setSpan}
        options={[
          { value: "30", label: "۳۰ روز" },
          { value: "90", label: "۹۰ روز" },
          { value: "365", label: "یک سال" },
        ]}
      />
      {data.visits === 0 ? (
        <Empty>در این بازه هنوز فروشی ثبت نشده است.</Empty>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <div className="text-xs text-muted">میانگین هر مراجعه</div>
              <div className="mt-1 text-lg font-bold">{formatMoney(data.avg, unit)}</div>
            </Card>
            <Card>
              <div className="text-xs text-muted">مشتری برگشتی</div>
              <div className="mt-1 text-lg font-bold">{data.namedCount ? `${toFa(data.returningShare)}٪` : "—"}</div>
            </Card>
          </div>

          <Card className="space-y-3">
            <h2 className="font-semibold">شلوغ‌ترین ساعت‌ها</h2>
            <Bars rows={data.hours} highlight={data.peakHour} />
          </Card>

          <Card className="space-y-3">
            <h2 className="font-semibold">شلوغ‌ترین روزها</h2>
            <Bars rows={data.days} highlight={data.peakDay} />
          </Card>

          {data.top.length > 0 && (
            <Card className="space-y-2">
              <h2 className="font-semibold">بهترین مشتری‌ها</h2>
              {data.top.map(([id, v]) => (
                <div key={id} className="flex items-center justify-between">
                  <div>
                    <div>{customers.get(id)?.name ?? "مشتری"}</div>
                    <div className="text-sm text-muted">{toFa(v.visits)} مراجعه</div>
                  </div>
                  <div>{formatMoney(v.spent, unit)}</div>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}
    </>
  );
}
