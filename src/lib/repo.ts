import { db } from "./db";
import { dayRange } from "./date";
import type { Appointment, Expense, PaymentMethod, Sale } from "./types";
import { isProductItem, saleKind, saleSubtotal, saleTotal } from "./types";

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
  // Service visits (a product-only sale is not a visit).
  visits: number;
  productSales: number;
  income: number;
  serviceIncome: number;
  productIncome: number;
  vat: number;
  tips: number;
  discounts: number;
  expenses: number;
  profit: number;
  byMethod: Record<PaymentMethod, number>;
  byService: { name: string; amount: number }[];
  byProduct: { name: string; amount: number }[];
}

const ranked = (m: Map<string, number>) =>
  [...m.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);

export function summarize(sales: Sale[], expenses: Expense[]): Summary {
  const live = sales.filter((s) => !s.voided);
  const byMethod: Record<PaymentMethod, number> = { cash: 0, card: 0, transfer: 0 };
  const services = new Map<string, number>();
  const products = new Map<string, number>();
  let visits = 0;
  let productSales = 0;
  let serviceIncome = 0;
  let productIncome = 0;
  let vat = 0;
  let tips = 0;
  let discounts = 0;
  for (const s of live) {
    const total = saleTotal(s);
    const kind = saleKind(s);
    if (kind === "service") visits += 1;
    else productSales += 1;
    // VAT is collected for the state, so it is not part of income; it still moves through the till.
    vat += s.vat ?? 0;
    tips += s.tip;
    discounts += s.discount;
    byMethod[s.method] += total;
    // Discount is spread over items proportionally so per-item totals add up to income minus tips.
    // A tip belongs to the kind of sale it was given on.
    if (kind === "product") productIncome += s.tip;
    else serviceIncome += s.tip;
    const subtotal = saleSubtotal(s);
    for (const item of s.items) {
      const gross = item.price * item.qty;
      const share = subtotal > 0 ? gross - (s.discount * gross) / subtotal : gross;
      if (kind === "product" || isProductItem(item)) {
        productIncome += share;
        products.set(item.name, (products.get(item.name) ?? 0) + share);
      } else {
        serviceIncome += share;
        services.set(item.name, (services.get(item.name) ?? 0) + share);
      }
    }
  }
  const income = serviceIncome + productIncome;
  const spent = expenses.reduce((sum, e) => sum + e.amount, 0);
  return {
    visits,
    productSales,
    income,
    serviceIncome,
    productIncome,
    vat,
    tips,
    discounts,
    expenses: spent,
    profit: income - spent,
    byMethod,
    byService: ranked(services),
    byProduct: ranked(products),
  };
}

export const appointmentEnd = (a: Pick<Appointment, "start" | "durationMin">) =>
  a.start + a.durationMin * 60_000;

export async function closeDay(day: number, expected: number, counted: number) {
  return db.dayCloses.add({ day, expected, counted, createdAt: Date.now() });
}
