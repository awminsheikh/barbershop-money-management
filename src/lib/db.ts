import Dexie, { type EntityTable } from "dexie";
import type {
  Appointment,
  Customer,
  DayClose,
  Expense,
  ExpenseCategory,
  Product,
  RecurringExpense,
  Sale,
  Service,
  SettingRow,
} from "./types";

class AppDB extends Dexie {
  services!: EntityTable<Service, "id">;
  customers!: EntityTable<Customer, "id">;
  appointments!: EntityTable<Appointment, "id">;
  sales!: EntityTable<Sale, "id">;
  expenseCategories!: EntityTable<ExpenseCategory, "id">;
  expenses!: EntityTable<Expense, "id">;
  settings!: EntityTable<SettingRow, "key">;
  products!: EntityTable<Product, "id">;
  recurringExpenses!: EntityTable<RecurringExpense, "id">;
  dayCloses!: EntityTable<DayClose, "id">;

  constructor() {
    super("barbershop");
    this.version(1).stores({
      services: "++id, active",
      customers: "++id, name, phone",
      appointments: "++id, start, status, customerId",
      sales: "++id, date, customerId, appointmentId",
      expenseCategories: "++id",
      expenses: "++id, date, categoryId",
      settings: "key",
    });
    // v2: inventory and recurring expenses.
    this.version(2).stores({
      products: "++id",
      recurringExpenses: "++id",
    });
    // v3: cash count at the end of the day.
    this.version(3).stores({
      dayCloses: "++id, day",
    });

    // Starter data the owner can edit. Prices start at 0 so he enters his own.
    this.on("populate", (tx) => {
      tx.table("services").bulkAdd([
        { name: "کوتاهی مو", price: 0, durationMin: 30, active: true },
        { name: "اصلاح صورت و ریش", price: 0, durationMin: 30, active: true },
        { name: "پک دامادی", price: 0, durationMin: 120, active: true },
      ]);
      tx.table("expenseCategories").bulkAdd([
        { name: "اجاره" },
        { name: "مواد مصرفی" },
        { name: "قبوض" },
        { name: "سایر" },
      ]);
    });
  }
}

// The data layer is only used in the browser; during the static build there is no IndexedDB.
export const db: AppDB = typeof window !== "undefined" ? new AppDB() : (null as unknown as AppDB);
