"use client";

import { useMemo, useState } from "react";
import { Donut, HBars, TrendChart, type Bucket } from "@/components/charts";
import { Card, Empty, PageHeader, Segmented } from "@/components/ui";
import { addDays, startOfDay, toFa, weekdayIndex, WEEKDAYS } from "@/lib/date";
import { useById, useCustomers, useExpenses, useSales } from "@/lib/hooks";
import { formatMoney } from "@/lib/money";
import { summarize } from "@/lib/repo";
import { useSettings } from "@/lib/settings";
import { saleKind, saleTotal } from "@/lib/types";

type Span = "30" | "90" | "365";
type TopN = "5" | "10" | "20";
const WEEK_MS = 7 * 86_400_000;

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
  const expenses = useExpenses(from, now + 1);
  const customers = useById(useCustomers());
  const [topN, setTopN] = useState<TopN>("5");

  const data = useMemo(() => {
    // Hours, days, averages and repeat visits are about service visits; product sales only add to what a customer spent.
    const all = sales.filter((s) => !s.voided);
    const live = all.filter((s) => saleKind(s) === "service");
    const byHour = Array.from({ length: 24 }, () => 0);
    const byDay = Array.from({ length: 7 }, () => 0);
    const perCustomer = new Map<number, { visits: number; spent: number }>();
    for (const s of live) {
      const d = new Date(s.date);
      byHour[d.getHours()] += 1;
      byDay[weekdayIndex(d)] += 1;
    }
    for (const s of all) {
      if (s.customerId === undefined) continue;
      const cur = perCustomer.get(s.customerId) ?? { visits: 0, spent: 0 };
      if (saleKind(s) === "service") cur.visits += 1;
      cur.spent += saleTotal(s);
      perCustomer.set(s.customerId, cur);
    }
    const summary = summarize(sales, []);
    const weeks = Math.ceil((now + 1 - from) / WEEK_MS);
    const trend: Bucket[] = Array.from({ length: weeks }, (_, i) => ({ label: toFa(i + 1), income: 0, expenses: 0 }));
    for (const s of all) trend[Math.min(weeks - 1, Math.floor((s.date - from) / WEEK_MS))].income += saleTotal(s) - (s.vat ?? 0);
    for (const e of expenses) trend[Math.min(weeks - 1, Math.floor((e.date - from) / WEEK_MS))].expenses += e.amount;
    const named = [...perCustomer.entries()].filter(([, v]) => v.visits > 0);
    const returning = named.filter(([, v]) => v.visits >= 2).length;
    const bySpent = [...perCustomer.entries()].sort((a, b) => b[1].spent - a[1].spent);
    // Show only the hours that have bookings plus the neighbours, so the chart stays short.
    const active = byHour.flatMap((v, h) => (v > 0 ? [h] : []));
    const lo = active.length ? Math.max(0, Math.min(...active) - 1) : 8;
    const hi = active.length ? Math.min(23, Math.max(...active) + 1) : 20;
    return {
      visits: live.length,
      avg: live.length ? summary.serviceIncome / live.length : 0,
      trend,
      services: summary.byService,
      returning,
      once: named.length - returning,
      hours: byHour.slice(lo, hi + 1).map((value, i) => ({ label: `${toFa(lo + i)}:۰۰`, value })),
      peakHour: byHour.slice(lo, hi + 1).indexOf(Math.max(...byHour.slice(lo, hi + 1))),
      days: byDay.map((value, i) => ({ label: WEEKDAYS[i], value })),
      peakDay: byDay.indexOf(Math.max(...byDay)),
      top: bySpent,
      returningShare: named.length ? Math.round((returning / named.length) * 100) : 0,
      namedCount: named.length,
    };
  }, [sales, expenses, from, now]);

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

          <Card className="space-y-3">
            <h2 className="font-semibold">روند هفتگی درآمد و هزینه</h2>
            <TrendChart buckets={data.trend} unit={unit} />
            <p className="text-xs text-muted">هر ستون یک هفته است (از ابتدای بازه).</p>
          </Card>

          <Card className="space-y-3">
            <h2 className="font-semibold">سهم هر خدمت از درآمد</h2>
            <Donut unit={unit} slices={data.services.map((s) => ({ label: s.name, value: s.amount }))} />
          </Card>

          {data.namedCount > 0 && (
            <Card className="space-y-3">
              <h2 className="font-semibold">مشتریان ثبت‌شده: برگشتی یا یک‌بار</h2>
              <Donut
                unit={unit}
                money={false}
                slices={[
                  { label: "برگشتی (۲ مراجعه یا بیشتر)", value: data.returning },
                  { label: "یک‌بار", value: data.once },
                ]}
              />
            </Card>
          )}

          {data.top.length > 0 && (
            <Card className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">بهترین مشتری‌ها</h2>
                <span className="text-xs text-muted">{toFa(Math.min(Number(topN), data.top.length))} نفر</span>
              </div>
              <Segmented<TopN>
                value={topN}
                onChange={setTopN}
                options={[
                  { value: "5", label: "۵ نفر" },
                  { value: "10", label: "۱۰ نفر" },
                  { value: "20", label: "۲۰ نفر" },
                ]}
              />
              <HBars
                color="var(--accent)"
                rows={data.top.slice(0, Number(topN)).map(([id, v], i) => ({
                  label: `${toFa(i + 1)}. ${customers.get(id)?.name ?? "مشتری"} · ${toFa(v.visits)} مراجعه`,
                  value: v.spent,
                  text: formatMoney(v.spent, unit),
                }))}
              />
            </Card>
          )}
        </div>
      )}
    </>
  );
}
