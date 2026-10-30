"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { SaleCard } from "@/components/SaleCard";
import { Donut, HBars, TrendChart, type Bucket } from "@/components/charts";
import { Button, Card, DateStepper, Empty, PageHeader, Segmented, Stat } from "@/components/ui";
import { JALALI_MONTHS, toFa, toJ, weekdayIndex, WEEKDAYS_SHORT } from "@/lib/date";
import { useById, useCustomers, useExpenseCategories, useExpenses, useSales } from "@/lib/hooks";
import { formatMoney, unitLabel } from "@/lib/money";
import { buildLedgerCsv } from "@/lib/csv";
import { saveFile } from "@/lib/files";
import { usePeriod, type PeriodMode } from "@/lib/period";
import { summarize } from "@/lib/repo";
import { useSettings } from "@/lib/settings";
import { METHOD_LABEL, saleKind, saleTotal, type Expense, type PaymentMethod, type Sale } from "@/lib/types";

const DAY_MS = 86_400_000;

// Income (without VAT) and expenses per hour / weekday / day of month / month, depending on the period.
function buildBuckets(mode: PeriodMode, from: number, to: number, sales: Sale[], expenses: Expense[]): Bucket[] {
  let size: number;
  let index: (ts: number) => number;
  let label: (i: number) => string;
  if (mode === "day") {
    size = 24;
    index = (ts) => new Date(ts).getHours();
    label = (i) => toFa(i);
  } else if (mode === "week") {
    size = 7;
    index = (ts) => weekdayIndex(new Date(ts));
    label = (i) => WEEKDAYS_SHORT[i];
  } else if (mode === "month") {
    size = Math.round((to - from) / DAY_MS);
    index = (ts) => toJ(ts).jd - 1;
    label = (i) => toFa(i + 1);
  } else {
    size = 12;
    index = (ts) => toJ(ts).jm - 1;
    label = (i) => toFa(i + 1);
  }
  const buckets = Array.from({ length: size }, (_, i) => ({ label: label(i), income: 0, expenses: 0 }));
  for (const s of sales) if (!s.voided) buckets[index(s.date)].income += saleTotal(s) - (s.vat ?? 0);
  for (const e of expenses) buckets[index(e.date)].expenses += e.amount;
  if (mode !== "day") return buckets;
  // A day only needs the hours around the ones that have something.
  const used = buckets.flatMap((b, i) => (b.income || b.expenses ? [i] : []));
  const lo = used.length ? Math.max(0, Math.min(...used) - 1) : 8;
  const hi = used.length ? Math.min(23, Math.max(...used) + 1) : 20;
  return buckets.slice(lo, hi + 1);
}

function SeeMore({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="mt-2 flex min-h-12 items-center justify-center gap-1 rounded-xl border border-line bg-card font-semibold active:opacity-70">
      {children}
      <Icon name="chevron" className="h-4 w-4" />
    </Link>
  );
}

export default function ReportsPage() {
  const { unit } = useSettings();
  const [mode, setMode] = useState<PeriodMode>("month");
  const [offset, setOffset] = useState(0);
  const { from, to, label } = usePeriod(mode, offset);

  const sales = useSales(from, to);
  const expenses = useExpenses(from, to);
  const customers = useById(useCustomers());
  const categories = useById(useExpenseCategories());
  const summary = useMemo(() => summarize(sales, expenses), [sales, expenses]);
  const buckets = useMemo(() => buildBuckets(mode, from, to, sales, expenses), [mode, from, to, sales, expenses]);

  const byCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of expenses) {
      const name = categories.get(e.categoryId as number)?.name ?? "بدون دسته";
      totals.set(name, (totals.get(name) ?? 0) + e.amount);
    }
    return [...totals.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  }, [expenses, categories]);

  const byMonth = useMemo(() => {
    const months = Array.from({ length: 12 }, () => ({ income: 0, expenses: 0 }));
    for (const s of sales) if (!s.voided) months[toJ(s.date).jm - 1].income += saleTotal(s) - (s.vat ?? 0);
    for (const e of expenses) months[toJ(e.date).jm - 1].expenses += e.amount;
    return months;
  }, [sales, expenses]);

  const latestServices = useMemo(() => sales.filter((s) => !s.voided && saleKind(s) === "service").slice(0, 5), [sales]);
  const latestProducts = useMemo(() => sales.filter((s) => !s.voided && saleKind(s) === "product").slice(0, 5), [sales]);

  const exportCsv = () => {
    const csv = buildLedgerCsv(sales, expenses, customers, categories, unit);
    saveFile(new File([csv], `ledger-${label.replace(/\s+/g, "-")}.csv`, { type: "text/csv" }), "گزارش حسابداری");
  };

  const money = (v: number) => formatMoney(v, unit);

  return (
    <>
      <PageHeader title="گزارش‌ها" />
      <h2 className="mb-2 hidden text-lg font-bold print:block">گزارش الماس · {label}</h2>
      <div className="no-print space-y-4">
        <Segmented<PeriodMode>
          value={mode}
          onChange={(m) => {
            setMode(m);
            setOffset(0);
          }}
          options={[
            { value: "day", label: "روز" },
            { value: "week", label: "هفته" },
            { value: "month", label: "ماه" },
            { value: "year", label: "سال" },
          ]}
        />
        <DateStepper label={label} onPrev={() => setOffset(offset - 1)} onNext={() => setOffset(offset + 1)} nextDisabled={offset >= 0} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="درآمد کل" value={money(summary.income)} tone="good" />
        <Stat label="هزینه" value={money(summary.expenses)} tone="bad" />
        <div className="col-span-2">
          <Stat label="سود" value={money(summary.profit)} tone={summary.profit < 0 ? "bad" : "good"} />
        </div>
        <Link href="/reports/services/" className="block active:opacity-70">
          <Stat label={`خدمات · ${toFa(summary.visits)} مراجعه`} value={money(summary.serviceIncome)} />
        </Link>
        <Link href="/reports/products/" className="block active:opacity-70">
          <Stat label={`محصولات · ${toFa(summary.productSales)} فروش`} value={money(summary.productIncome)} />
        </Link>
      </div>
      <p className="mb-6 mt-3 text-sm text-muted">
        شامل انعام {money(summary.tips)} و پس از کسر تخفیف {money(summary.discounts)}
        {summary.vat > 0 && ` · مالیات دریافتی ${money(summary.vat)} (جدا از درآمد)`}
      </p>

      <div className="no-print mb-6 grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={exportCsv}>
          خروجی اکسل (CSV)
        </Button>
        <Button variant="secondary" onClick={() => window.print()}>
          چاپ / PDF
        </Button>
      </div>

      <Card className="mb-4 space-y-2">
        <h2 className="font-semibold">درآمد و هزینه{mode === "day" ? " به تفکیک ساعت" : mode === "year" ? " به تفکیک ماه" : " به تفکیک روز"}</h2>
        <TrendChart buckets={buckets} unit={unit} />
      </Card>

      {mode === "year" && (
        <Card className="mb-4 space-y-2">
          <h2 className="font-semibold">جدول ماهانه ({unitLabel(unit)})</h2>
          <div className="grid grid-cols-[4.5rem_1fr_1fr_1fr] gap-x-2 gap-y-1 text-sm">
            <span />
            <span className="text-xs text-muted">درآمد</span>
            <span className="text-xs text-muted">هزینه</span>
            <span className="text-xs text-muted">سود</span>
            {byMonth.map((m, i) => {
              const profit = m.income - m.expenses;
              const quiet = (v: number) => (v === 0 ? "text-muted" : "");
              return (
                <Fragment key={i}>
                  <span>{JALALI_MONTHS[i]}</span>
                  <span className={quiet(m.income)}>{m.income ? formatMoney(m.income, unit, false) : "—"}</span>
                  <span className={quiet(m.expenses)}>{m.expenses ? formatMoney(m.expenses, unit, false) : "—"}</span>
                  <span className={profit < 0 ? "text-bad" : quiet(profit)}>{profit ? formatMoney(profit, unit, false) : "—"}</span>
                </Fragment>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="mb-4 space-y-3">
        <h2 className="font-semibold">سهم خدمات و محصولات از درآمد</h2>
        <Donut
          unit={unit}
          slices={[
            { label: "خدمات", value: summary.serviceIncome },
            { label: "محصولات", value: summary.productIncome },
          ]}
        />
      </Card>

      <Card className="mb-4 space-y-3">
        <h2 className="font-semibold">روش پرداخت</h2>
        <Donut
          unit={unit}
          slices={(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => ({ label: METHOD_LABEL[m], value: summary.byMethod[m] }))}
        />
      </Card>

      {summary.byService.length > 0 && (
        <Card className="mb-4 space-y-3">
          <h2 className="font-semibold">درآمد به تفکیک خدمت</h2>
          <HBars rows={summary.byService.map((s) => ({ label: s.name, value: s.amount, text: money(s.amount) }))} />
        </Card>
      )}

      {summary.byProduct.length > 0 && (
        <Card className="mb-4 space-y-3">
          <h2 className="font-semibold">درآمد به تفکیک محصول</h2>
          <HBars color="var(--accent)" rows={summary.byProduct.map((s) => ({ label: s.name, value: s.amount, text: money(s.amount) }))} />
        </Card>
      )}

      {byCategory.length > 0 && (
        <Card className="mb-4 space-y-3">
          <h2 className="font-semibold">هزینه به تفکیک دسته</h2>
          <Donut unit={unit} slices={byCategory.map((c) => ({ label: c.name, value: c.amount }))} />
        </Card>
      )}

      <section className="mb-6">
        <h2 className="mb-2 font-semibold">آخرین خدمات</h2>
        {latestServices.length === 0 ? (
          <Empty>در این بازه خدمتی ثبت نشده است.</Empty>
        ) : (
          <div className="space-y-2">
            {latestServices.map((s) => (
              <SaleCard key={s.id} sale={s} customer={customers.get(s.customerId as number)?.name} unit={unit} href={`/reports/services/?open=${s.id}`} />
            ))}
          </div>
        )}
        <SeeMore href="/reports/services/">مشاهده همه خدمات</SeeMore>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">آخرین فروش‌های محصول</h2>
        {latestProducts.length === 0 ? (
          <Empty>در این بازه محصولی فروخته نشده است.</Empty>
        ) : (
          <div className="space-y-2">
            {latestProducts.map((s) => (
              <SaleCard key={s.id} sale={s} customer={customers.get(s.customerId as number)?.name} unit={unit} href={`/reports/products/?open=${s.id}`} />
            ))}
          </div>
        )}
        <SeeMore href="/reports/products/">مشاهده همه فروش‌های محصول</SeeMore>
      </section>
    </>
  );
}
