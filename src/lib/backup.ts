import { db } from "./db";
import { hhmm } from "./date";
import { saveFile } from "./files";
import { setSetting } from "./settings";

export const TABLES = [
  "services",
  "customers",
  "appointments",
  "sales",
  "expenseCategories",
  "expenses",
  "settings",
  "products",
  "recurringExpenses",
  "dayCloses",
] as const;

export async function exportBackup() {
  const data: Record<string, unknown[]> = {};
  for (const name of TABLES) data[name] = await db.table(name).toArray();
  const payload = { app: "barbershop", version: 1, exportedAt: Date.now(), data };
  const json = JSON.stringify(payload);
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${hhmm(now).replace(":", "")}`;
  const file = new File([json], `barbershop-backup-${stamp}.json`, { type: "application/json" });

  if (await saveFile(file, "پشتیبان آرایشگاه")) await setSetting("lastBackupAt", Date.now());
}

export async function importBackup(json: string) {
  const parsed = JSON.parse(json);
  if (parsed?.app !== "barbershop" || typeof parsed.data !== "object") {
    throw new Error("فایل پشتیبان معتبر نیست");
  }
  await db.transaction("rw", TABLES.map((t) => db.table(t)), async () => {
    for (const name of TABLES) {
      await db.table(name).clear();
      const rows = parsed.data[name];
      if (Array.isArray(rows) && rows.length) await db.table(name).bulkAdd(rows);
    }
  });
}
