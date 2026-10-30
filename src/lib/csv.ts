import { toJ } from "./date";
import { fromRial, type Unit, unitLabel } from "./money";
import { KIND_LABEL, METHOD_LABEL, saleKind, saleTotal, type Customer, type Expense, type ExpenseCategory, type Sale } from "./types";

const cell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const jalaliText = (ts: number) => {
  const { jy, jm, jd } = toJ(ts);
  return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
};

const clock = (ts: number) => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// One ledger for an accountant: every sale and expense in date order, Jalali dates, amounts in the chosen unit.
export function buildLedgerCsv(
  sales: Sale[],
  expenses: Expense[],
  customers: Map<number, Customer>,
  categories: Map<number, ExpenseCategory>,
  unit: Unit,
) {
  const u = unitLabel(unit);
  const money = (rial: number) => (rial ? fromRial(rial, unit) : "");
  const rows: { at: number; cols: (string | number)[] }[] = [];

  for (const s of sales.filter((x) => !x.voided)) {
    const vat = s.vat ?? 0;
    rows.push({
      at: s.date,
      cols: [
        jalaliText(s.date),
        clock(s.date),
        `درآمد ${KIND_LABEL[saleKind(s)]}`,
        s.items.map((i) => (i.qty > 1 ? `${i.name} ×${i.qty}` : i.name)).join(" + "),
        customers.get(s.customerId as number)?.name ?? "",
        METHOD_LABEL[s.method],
        money(saleTotal(s) - vat),
        money(vat),
        "",
      ],
    });
  }
  for (const e of expenses) {
    rows.push({
      at: e.date,
      cols: [
        jalaliText(e.date),
        clock(e.date),
        "هزینه",
        e.note ?? "",
        categories.get(e.categoryId as number)?.name ?? "",
        "",
        "",
        "",
        money(e.amount),
      ],
    });
  }
  rows.sort((a, b) => a.at - b.at);

  const header = ["تاریخ", "ساعت", "نوع", "شرح", "مشتری / دسته", "روش پرداخت", `درآمد (${u})`, `مالیات (${u})`, `هزینه (${u})`];
  // BOM so Excel opens the Persian text correctly.
  return "﻿" + [header, ...rows.map((r) => r.cols)].map((r) => r.map(cell).join(",")).join("\r\n");
}
