"use client";

import Link from "next/link";
import { useState } from "react";
import { AmountInput } from "@/components/AmountInput";
import { BirthdayBanner } from "@/components/BirthdayBanner";
import { DayCloseSheet } from "@/components/DayCloseSheet";
import { Icon } from "@/components/Icon";
import { WeekChart } from "@/components/WeekChart";
import { AppointmentsPanel } from "@/components/AppointmentsPanel";
import { SaleForm } from "@/components/SaleForm";
import { Button, Sheet, Stat } from "@/components/ui";
import { db } from "@/lib/db";
import { dayRange, toFa } from "@/lib/date";
import { useExpenseCategories, useProducts, useSummary } from "@/lib/hooks";
import { formatMoney } from "@/lib/money";
import { useSettings } from "@/lib/settings";
import { useLiveQuery } from "dexie-react-hooks";

const WEEK_MS = 7 * 24 * 3600 * 1000;

function BackupBanner() {
  const { lastBackupAt, ready } = useSettings();
  const [now] = useState(() => Date.now());
  const hasData = useLiveQuery(async () => (await db.sales.count()) > 0, []);
  if (!ready || !hasData) return null;
  if (lastBackupAt && now - lastBackupAt < WEEK_MS) return null;
  return (
    <Link href="/settings/" className="mb-4 flex items-center gap-2 rounded-xl border border-brand bg-brand-soft p-3 text-sm">
      <span className="flex-1">
        {lastBackupAt ? "بیش از یک هفته از آخرین پشتیبان‌گیری گذشته است." : "هنوز پشتیبان نگرفته‌اید."} برای محافظت از اطلاعات، پشتیبان بگیرید.
      </span>
      <Icon name="chevron" className="h-4 w-4 shrink-0 text-muted" />
    </Link>
  );
}

function LowStockBanner() {
  const low = useProducts().filter((p) => p.active && p.stock <= p.lowStockAt);
  if (low.length === 0) return null;
  return (
    <Link href="/products/" className="mb-4 flex items-center gap-2 rounded-xl border border-bad p-3 text-sm">
      <Icon name="alert" className="h-5 w-5 shrink-0 text-bad" />
      <span className="flex-1">موجودی کم: {low.map((p) => p.name).join("، ")}</span>
      <Icon name="chevron" className="h-4 w-4 shrink-0 text-muted" />
    </Link>
  );
}

function QuickExpense({ onDone }: { onDone: () => void }) {
  const categories = useExpenseCategories();
  const [amount, setAmount] = useState(0);
  const [categoryId, setCategoryId] = useState<number>();
  return (
    <div className="space-y-4">
      <AmountInput value={amount} onChange={setAmount} />
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategoryId(c.id)}
            className={`min-h-11 rounded-full border px-4 text-sm ${
              categoryId === c.id ? "border-brand bg-brand font-semibold text-brand-ink" : "border-line bg-card"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>
      <Button
        className="w-full"
        disabled={amount <= 0}
        onClick={async () => {
          await db.expenses.add({ date: Date.now(), amount, categoryId });
          onDone();
        }}
      >
        ثبت هزینه
      </Button>
    </div>
  );
}

export default function HomePage() {
  const { unit } = useSettings();
  const now = new Date();
  const { from, to } = dayRange(now);
  const summary = useSummary(from, to);
  const [sheet, setSheet] = useState<"sale" | "expense" | "close" | null>(null);

  return (
    <>
      <BackupBanner />
      <LowStockBanner />
      <BirthdayBanner />

      <section className="mb-6">
        <h2 className="mb-2 font-semibold">نوبت‌های امروز</h2>
        <AppointmentsPanel from={from} to={to} date={now} empty="امروز نوبتی ثبت نشده است." />
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold">حساب امروز</h2>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="مشتری امروز (خدمات)" value={toFa(summary.visits)} />
          <Stat label="درآمد" value={formatMoney(summary.income, unit)} tone="good" />
          <Stat label="هزینه" value={formatMoney(summary.expenses, unit)} tone="bad" />
          <Stat label="سود" value={formatMoney(summary.profit, unit)} tone={summary.profit < 0 ? "bad" : "good"} />
        </div>
        <p className="mt-2 text-sm text-muted">
          درآمد خدمات {formatMoney(summary.serviceIncome, unit)} · فروش محصول {formatMoney(summary.productIncome, unit)} ({toFa(summary.productSales)} فروش)
        </p>
      </section>

      <section className="mb-6">
        <WeekChart now={now} />
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Button onClick={() => setSheet("sale")}>+ فروش محصول</Button>
        <Button variant="secondary" onClick={() => setSheet("expense")}>
          + هزینه
        </Button>
      </div>

      <Button variant="secondary" className="mt-3 w-full" onClick={() => setSheet("close")}>
        بستن صندوق امروز
      </Button>

      <DayCloseSheet open={sheet === "close"} onClose={() => setSheet(null)} />
      <Sheet open={sheet === "sale"} title="فروش محصول" onClose={() => setSheet(null)}>
        <SaleForm kind="product" onDone={() => setSheet(null)} />
      </Sheet>
      <Sheet open={sheet === "expense"} title="هزینه جدید" onClose={() => setSheet(null)}>
        <QuickExpense onDone={() => setSheet(null)} />
      </Sheet>
    </>
  );
}
