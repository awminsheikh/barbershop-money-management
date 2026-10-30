import { db } from "./db";
import { dayRange } from "./date";
import type { Appointment, Expense, PaymentMethod, Sale } from "./types";
import { saleSubtotal, saleTotal } from "./types";

// Moves stock for every product line of a sale: sign -1 when selling, +1 when voiding.
async function moveStock(items: Sale["items"], sign: 1 | -1) {
  for (const item of items) {
    if (item.productId === undefined) continue;
    const product = await db.products.get(item.productId);
    if (product) await db.products.update(item.productId, { stock: product.stock + sign * item.qty });
  }
}

export async function createSale(input: Omit<Sale, "id" | "voided" | "date">) {
  const sale = { ...input, date: Date.now() };
  return db.transaction("rw", db.sales, db.appointments, db.products, async () => {
    const id = await db.sales.add({ ...sale, voided: false });
    await moveStock(sale.items, -1);
    if (sale.appointmentId) {
      await db.appointments.update(sale.appointmentId, { status: "done", saleId: id });
    }
    return id;
  });
}

// Voiding keeps the record (shown as voided) and reopens the booking it came from.
export async function voidSale(id: number) {
  await db.transaction("rw", db.sales, db.appointments, db.products, async () => {
    const sale = await db.sales.get(id);
    if (!sale || sale.voided) return;
    await db.sales.update(id, { voided: true });
    await moveStock(sale.items, 1);
    if (sale.appointmentId) {
      await db.appointments.update(sale.appointmentId, { status: "booked", saleId: undefined });
    }
  });
}

export async function findConflicts(start: number, durationMin: number, excludeId?: number) {
  const { from, to } = dayRange(start);
  const end = start + durationMin * 60_000;
  const sameDay = await db.appointments.where("start").between(from, to).toArray();
  return sameDay.filter(
    (a) =>
      a.id !== excludeId &&
      a.status === "booked" &&
      a.start < end &&
      start < a.start + a.durationMin * 60_000,
  );
}

export interface Summary {
  visits: number;
  income: number;
  vat: number;
  tips: number;
  discounts: number;
  expenses: number;
  profit: number;
  byMethod: Record<PaymentMethod, number>;
  byService: { name: string; amount: number }[];
}

export function summarize(sales: Sale[], expenses: Expense[]): Summary {
  const live = sales.filter((s) => !s.voided);
  const byMethod: Record<PaymentMethod, number> = { cash: 0, card: 0, transfer: 0 };
  const services = new Map<string, number>();
  let income = 0;
  let vat = 0;
  let tips = 0;
  let discounts = 0;
  for (const s of live) {
    const total = saleTotal(s);
    // VAT is collected for the state, so it is not part of income; it still moves through the till.
    income += total - (s.vat ?? 0);
    vat += s.vat ?? 0;
    tips += s.tip;
    discounts += s.discount;
    byMethod[s.method] += total;
    // Discount is spread over items proportionally so per-service totals add up to income minus tips.
    const subtotal = saleSubtotal(s);
    for (const item of s.items) {
      const gross = item.price * item.qty;
      const share = subtotal > 0 ? gross - (s.discount * gross) / subtotal : gross;
      services.set(item.name, (services.get(item.name) ?? 0) + share);
    }
  }
  const spent = expenses.reduce((sum, e) => sum + e.amount, 0);
  return {
    visits: live.length,
    income,
    vat,
    tips,
    discounts,
    expenses: spent,
    profit: income - spent,
    byMethod,
    byService: [...services.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount),
  };
}

export const appointmentEnd = (a: Pick<Appointment, "start" | "durationMin">) =>
  a.start + a.durationMin * 60_000;
