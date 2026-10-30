import { jalaaliMonthLength } from "jalaali-js";
import { fromJ, startOfDay, toJ } from "./date";
import type { Customer, Sale } from "./types";
import { saleTotal } from "./types";

export interface CustomerStats {
  visits: number;
  spent: number;
  lastVisit?: number;
  // Paid visits since the last free service.
  loyaltyCount: number;
}

export function customerStats(sales: Sale[]): Map<number, CustomerStats> {
  const stats = new Map<number, CustomerStats>();
  for (const s of [...sales].filter((x) => !x.voided && x.customerId !== undefined).sort((a, b) => a.date - b.date)) {
    const cur = stats.get(s.customerId as number) ?? { visits: 0, spent: 0, loyaltyCount: 0 };
    cur.visits += 1;
    cur.spent += saleTotal(s);
    cur.lastVisit = s.date;
    cur.loyaltyCount = s.loyaltyFree ? 0 : cur.loyaltyCount + 1;
    stats.set(s.customerId as number, cur);
  }
  return stats;
}

export const loyaltyEligible = (stats: CustomerStats | undefined, every: number) =>
  (stats?.loyaltyCount ?? 0) >= every;

export function daysSince(ts: number, now: number) {
  return Math.floor((startOfDay(now).getTime() - startOfDay(ts).getTime()) / 86_400_000);
}

// Days from `from` until the customer's next birthday (0 = today).
export function daysUntilBirthday(b: NonNullable<Customer["birthday"]>, from: Date) {
  const today = startOfDay(from);
  const { jy } = toJ(today);
  const on = (year: number) => fromJ(year, b.month, Math.min(b.day, jalaaliMonthLength(year, b.month)));
  let target = on(jy);
  if (target.getTime() < today.getTime()) target = on(jy + 1);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}
