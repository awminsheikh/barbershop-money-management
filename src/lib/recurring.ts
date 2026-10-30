import { jalaaliMonthLength } from "jalaali-js";
import { db } from "./db";
import { fromJ, toJ } from "./date";

// Adds the expenses that have come due since the app was last opened (rent, salaries, ...).
export async function generateRecurring(now = new Date()) {
  const { jy, jm, jd } = toJ(now);
  const current = jy * 12 + jm - 1;
  await db.transaction("rw", db.recurringExpenses, db.expenses, async () => {
    for (const rule of await db.recurringExpenses.toArray()) {
      if (!rule.active || rule.id === undefined) continue;
      let last = rule.lastGenerated;
      for (let m = last + 1; m <= current; m++) {
        const year = Math.floor(m / 12);
        const month = (m % 12) + 1;
        const day = Math.min(rule.day, jalaaliMonthLength(year, month));
        if (m === current && jd < day) break;
        await db.expenses.add({
          date: fromJ(year, month, day, 12).getTime(),
          categoryId: rule.categoryId,
          amount: rule.amount,
          note: rule.note,
          recurringId: rule.id,
        });
        last = m;
      }
      if (last !== rule.lastGenerated) await db.recurringExpenses.update(rule.id, { lastGenerated: last });
    }
  });
}
