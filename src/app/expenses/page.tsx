"use client";

import { useState } from "react";
import { AmountInput } from "@/components/AmountInput";
import { JalaliCalendar } from "@/components/JalaliCalendar";
import { Button, Card, Chip, Empty, Field, PageHeader, Sheet, inputClass } from "@/components/ui";
import { db } from "@/lib/db";
import { formatDate, formatMonth, monthRange, normalizeDigits, startOfDay, toFa, toJ } from "@/lib/date";
import { useById, useExpenseCategories, useExpenses } from "@/lib/hooks";
import { useLiveQuery } from "dexie-react-hooks";
import { formatMoney } from "@/lib/money";
import { useSettings } from "@/lib/settings";
import type { Expense } from "@/lib/types";
import { Toggle } from "@/components/ui";

function ExpenseSheet({ expense, onClose }: { expense: Expense | "new" | null; onClose: () => void }) {
  const categories = useExpenseCategories();
  const existing = expense && expense !== "new" ? expense : null;
  const [amount, setAmount] = useState(existing?.amount ?? 0);
  const [categoryId, setCategoryId] = useState(existing?.categoryId);
  const [date, setDate] = useState(() => startOfDay(existing?.date ?? new Date()));
  const [note, setNote] = useState(existing?.note ?? "");
  const [calendar, setCalendar] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const addCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    setCategoryId(await db.expenseCategories.add({ name }));
    setNewCategory("");
  };

  const save = async () => {
    if (amount <= 0) return;
    // Keep the original time of day when the date is unchanged; today uses "now", other days noon.
    const sameDay = existing && startOfDay(existing.date).getTime() === date.getTime();
    const isToday = date.getTime() === startOfDay(Date.now()).getTime();
    const stamp = sameDay ? existing.date : isToday ? Date.now() : date.getTime() + 12 * 3600_000;
    const data = { date: stamp, amount, categoryId, note: note.trim() || undefined };
    if (existing?.id) await db.expenses.update(existing.id, data);
    else await db.expenses.add(data);
    onClose();
  };

  return (
    <Sheet open={expense !== null} title={existing ? "ویرایش هزینه" : "هزینه جدید"} onClose={onClose}>
      <Field label="مبلغ">
        <AmountInput value={amount} onChange={setAmount} />
      </Field>
      <div>
        <div className="mb-1 text-sm text-muted">دسته</div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Chip key={c.id} active={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
              {c.name}
            </Chip>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input className={inputClass} placeholder="دسته جدید" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
          <Button variant="secondary" disabled={!newCategory.trim()} onClick={addCategory}>
            افزودن
          </Button>
        </div>
      </div>
      <Field label="تاریخ">
        <button type="button" className={`${inputClass} text-start`} onClick={() => setCalendar(true)}>
          {formatDate(date)}
        </button>
      </Field>
      <JalaliCalendar
        open={calendar}
        value={date}
        onClose={() => setCalendar(false)}
        onPick={(d) => {
          setDate(startOfDay(d));
          setCalendar(false);
        }}
      />
      <Field label="یادداشت (اختیاری)">
        <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Button className="w-full" disabled={amount <= 0} onClick={save}>
        ذخیره
      </Button>
      {existing?.id && (
        <Button
          variant="danger"
          className="w-full"
          onClick={async () => {
            if (confirm("این هزینه حذف شود؟")) {
              await db.expenses.delete(existing.id!);
              onClose();
            }
          }}
        >
          حذف هزینه
        </Button>
      )}
    </Sheet>
  );
}

function RecurringSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { unit } = useSettings();
  const rules = useLiveQuery(() => db.recurringExpenses.toArray(), []) ?? [];
  const categories = useExpenseCategories();
  const names = useById(categories);
  const [amount, setAmount] = useState(0);
  const [categoryId, setCategoryId] = useState<number>();
  const [day, setDay] = useState(1);
  const [note, setNote] = useState("");

  const add = async () => {
    if (amount <= 0) return;
    const { jy, jm, jd } = toJ(new Date());
    const current = jy * 12 + jm - 1;
    // If this month's due day has not come yet, it should still be generated this month.
    await db.recurringExpenses.add({
      amount,
      categoryId,
      day,
      note: note.trim() || undefined,
      active: true,
      lastGenerated: day <= jd ? current : current - 1,
    });
    setAmount(0);
    setNote("");
  };

  return (
    <Sheet open={open} title="هزینه‌های تکراری" onClose={onClose}>
      <p className="text-sm text-muted">
        مثل اجاره یا حقوق: هر ماه در روز مشخص‌شده خودکار به هزینه‌ها اضافه می‌شود.
      </p>
      {rules.map((r) => (
        <Card key={r.id} className="space-y-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{names.get(r.categoryId as number)?.name ?? "بدون دسته"}</div>
              <div className="text-sm text-muted">
                {formatMoney(r.amount, unit)} · روز {toFa(r.day)} هر ماه{r.note ? ` · ${r.note}` : ""}
              </div>
            </div>
          </div>
          <Toggle checked={r.active} onChange={(v) => db.recurringExpenses.update(r.id!, { active: v })} label="فعال" />
          <Button
            variant="danger"
            className="w-full"
            onClick={() => {
              if (confirm("این هزینه تکراری حذف شود؟ هزینه‌های ثبت‌شده باقی می‌مانند.")) db.recurringExpenses.delete(r.id!);
            }}
          >
            حذف
          </Button>
        </Card>
      ))}
      <Card className="space-y-3">
        <div className="font-semibold">هزینه تکراری جدید</div>
        <AmountInput value={amount} onChange={setAmount} />
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Chip key={c.id} active={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
              {c.name}
            </Chip>
          ))}
        </div>
        <Field label="روز ماه (۱ تا ۳۱)">
          <input
            className={inputClass}
            inputMode="numeric"
            value={toFa(day)}
            onChange={(e) => setDay(Math.min(31, Math.max(1, Number(normalizeDigits(e.target.value).replace(/\D/g, "")) || 1)))}
          />
        </Field>
        <input className={inputClass} placeholder="یادداشت (اختیاری)" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button className="w-full" disabled={amount <= 0} onClick={add}>
          افزودن
        </Button>
      </Card>
    </Sheet>
  );
}

export default function ExpensesPage() {
  const { unit } = useSettings();
  const [view, setView] = useState(() => {
    const { jy, jm } = toJ(new Date());
    return { jy, jm };
  });
  const { from, to } = monthRange(view.jy, view.jm);
  const expenses = useExpenses(from, to);
  const categories = useById(useExpenseCategories());
  const [open, setOpen] = useState<Expense | "new" | null>(null);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const total = expenses.reduce((t, e) => t + e.amount, 0);

  const shift = (delta: number) => {
    const idx = view.jy * 12 + (view.jm - 1) + delta;
    setView({ jy: Math.floor(idx / 12), jm: (idx % 12) + 1 });
  };

  return (
    <>
      <PageHeader title="هزینه‌ها" action={<Button onClick={() => setOpen("new")}>+ جدید</Button>} />
      <div className="mb-4 flex items-center justify-between">
        <button type="button" className="min-h-11 min-w-11 text-xl" onClick={() => shift(-1)} aria-label="ماه قبل">
          ›
        </button>
        <div className="text-center">
          <div className="font-semibold">{formatMonth(view.jy, view.jm)}</div>
          <div className="text-sm text-muted">مجموع: {formatMoney(total, unit)}</div>
        </div>
        <button type="button" className="min-h-11 min-w-11 text-xl" onClick={() => shift(1)} aria-label="ماه بعد">
          ‹
        </button>
      </div>
      <Button variant="secondary" className="mb-4 w-full" onClick={() => setRecurringOpen(true)}>
        هزینه‌های تکراری (اجاره، حقوق، ...)
      </Button>
      <RecurringSheet open={recurringOpen} onClose={() => setRecurringOpen(false)} />
      {expenses.length === 0 ? (
        <Empty>در این ماه هزینه‌ای ثبت نشده است.</Empty>
      ) : (
        <div className="space-y-2">
          {expenses.map((e) => (
            <button key={e.id} type="button" className="block w-full text-start" onClick={() => setOpen(e)}>
              <Card className="flex items-center justify-between active:opacity-70">
                <div>
                  <div className="font-semibold">{categories.get(e.categoryId as number)?.name ?? "بدون دسته"}</div>
                  <div className="text-sm text-muted">
                    {formatDate(e.date, false)}
                    {e.note ? ` · ${e.note}` : ""}
                  </div>
                </div>
                <div className="text-bad">{formatMoney(e.amount, unit)}</div>
              </Card>
            </button>
          ))}
        </div>
      )}
      <ExpenseSheet key={open === null ? "closed" : open === "new" ? "new" : open.id} expense={open} onClose={() => setOpen(null)} />
    </>
  );
}
