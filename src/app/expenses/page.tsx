"use client";

import { useState } from "react";
import { AmountInput } from "@/components/AmountInput";
import { JalaliCalendar } from "@/components/JalaliCalendar";
import { Button, Card, Chip, Empty, Field, PageHeader, Sheet, inputClass } from "@/components/ui";
import { db } from "@/lib/db";
import { formatDate, formatMonth, monthRange, startOfDay, toJ } from "@/lib/date";
import { useById, useExpenseCategories, useExpenses } from "@/lib/hooks";
import { formatMoney } from "@/lib/money";
import { useSettings } from "@/lib/settings";
import type { Expense } from "@/lib/types";

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
