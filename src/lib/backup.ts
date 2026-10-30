import { db } from "./db";
import { hhmm } from "./date";
import { setSetting } from "./settings";

const TABLES = ["services", "customers", "appointments", "sales", "expenseCategories", "expenses", "settings"] as const;

export async function exportBackup() {
  const data: Record<string, unknown[]> = {};
  for (const name of TABLES) data[name] = await db.table(name).toArray();
  const payload = { app: "barbershop", version: 1, exportedAt: Date.now(), data };
  const json = JSON.stringify(payload);
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${hhmm(now).replace(":", "")}`;
  const file = new File([json], `barbershop-backup-${stamp}.json`, { type: "application/json" });

  // On iPhone the share sheet lets him save to Files or iCloud Drive.
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "پشتیبان آرایشگاه" });
      await setSetting("lastBackupAt", Date.now());
      return;
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
  await setSetting("lastBackupAt", Date.now());
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
