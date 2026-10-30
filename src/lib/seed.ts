import { db, STARTER_CATEGORIES, STARTER_SERVICES } from "./db";
import { TABLES } from "./backup";
import { addDays, startOfDay, toJ, weekdayIndex } from "./date";
import type { Appointment, Customer, DayClose, Expense, PaymentMethod, Product, RecurringExpense, Sale, SaleItem, Service } from "./types";
import { saleTotal } from "./types";

// Sample data for trying every screen. All amounts are Rial (1 Toman = 10 Rial); dates are relative to today.
const T = (toman: number) => toman * 10;
const HISTORY_DAYS = 75;

// Small deterministic generator so the sample data looks the same every time.
function makeRng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SERVICES: Service[] = [
  { id: 1, name: "کوتاهی مو", price: T(250_000), durationMin: 30, active: true },
  { id: 2, name: "اصلاح صورت و ریش", price: T(150_000), durationMin: 30, active: true },
  { id: 3, name: "کوتاهی و ریش", price: T(380_000), durationMin: 60, active: true },
  { id: 4, name: "رنگ مو", price: T(600_000), durationMin: 90, active: true },
  { id: 5, name: "پک دامادی", price: T(3_500_000), durationMin: 120, active: true },
  { id: 6, name: "کوتاهی کودک", price: T(150_000), durationMin: 30, active: true },
  { id: 7, name: "مراقبت پوست", price: T(400_000), durationMin: 45, active: false },
];
const SERVICE_WEIGHT: Record<number, number> = { 1: 10, 2: 5, 3: 5, 4: 2, 5: 0.15, 6: 2 };

const PRODUCTS: Product[] = [
  { id: 1, name: "ژل مو", costPrice: T(90_000), price: T(150_000), stock: 2, lowStockAt: 3, active: true },
  { id: 2, name: "واکس مو", costPrice: T(110_000), price: T(180_000), stock: 12, lowStockAt: 4, active: true },
  { id: 3, name: "شامپو", costPrice: T(120_000), price: T(200_000), stock: 8, lowStockAt: 3, active: true },
  { id: 4, name: "افتر شیو", costPrice: T(80_000), price: T(130_000), stock: 5, lowStockAt: 3, active: true },
];

const CATEGORIES = [
  { id: 1, name: "اجاره" },
  { id: 2, name: "مواد مصرفی" },
  { id: 3, name: "قبوض" },
  { id: 4, name: "سایر" },
  { id: 5, name: "حقوق دستیار" },
];

// [name, phone, weight (how often he visits), vip, notes]
const PEOPLE: [string, string, number, boolean, string?][] = [
  ["علی محمدی", "09121110001", 8, true, "فید کوتاه، شماره ۲ طرفین"],
  ["رضا کریمی", "09121110002", 6, true],
  ["محمد حسینی", "09121110003", 5, false, "حساس به تیغ"],
  ["امیر احمدی", "09121110004", 4, false],
  ["حسین رضایی", "09121110005", 3, false],
  ["مهدی نوری", "09121110006", 3, false],
  ["سعید صادقی", "09121110007", 2, false, "ریش خط‌دار"],
  ["کیان جعفری", "09121110008", 2, false],
  ["پوریا موسوی", "09121110009", 1.5, false],
  ["آرش قاسمی", "09121110010", 1.5, false],
  ["نیما فتحی", "09121110011", 1, false],
  ["بهنام سلطانی", "09121110012", 1, false],
  ["فرهاد زارعی", "09121110013", 1.2, false],
  ["پیمان اکبری", "09121110014", 1, false],
];
// Customers who stopped coming a while ago (days since their last allowed visit), to fill the "away" list.
const AWAY_AFTER: Record<number, number> = { 13: 50, 14: 65 };
// Birthdays: customer id -> days from today.
const BIRTHDAYS: Record<number, number> = { 3: 0, 5: 4, 9: 18, 2: 120, 7: 200 };

const PAYMENT_MIX: [PaymentMethod, number][] = [
  ["cash", 45],
  ["card", 35],
  ["transfer", 20],
];

function pick<V>(rand: () => number, options: [V, number][]): V {
  const total = options.reduce((t, [, w]) => t + w, 0);
  let r = rand() * total;
  for (const [value, w] of options) {
    r -= w;
    if (r <= 0) return value;
  }
  return options[options.length - 1][0];
}

const PEAK_HOURS: [number, number][] = [
  [9, 1], [10, 3], [11, 4], [12, 3], [13, 1], [14, 1], [15, 2], [16, 3], [17, 4], [18, 4], [19, 3], [20, 1],
];

export interface SeedResult {
  customers: number;
  sales: number;
  expenses: number;
  appointments: number;
}

export async function loadDemoData(): Promise<SeedResult> {
  const rand = makeRng(20260101);
  const now = Date.now();
  const today = startOfDay(now);
  const open = (d: Date) => weekdayIndex(d) !== 6; // Friday is closed

  const customers: Customer[] = PEOPLE.map(([name, phone, , vip, notes], i) => {
    const id = i + 1;
    const birthday = BIRTHDAYS[id] !== undefined ? (({ jm, jd }) => ({ month: jm, day: jd }))(toJ(addDays(today, BIRTHDAYS[id]))) : undefined;
    return { id, name, phone, vip: vip || undefined, notes, birthday, createdAt: addDays(today, -HISTORY_DAYS).getTime() };
  });

  const serviceById = new Map(SERVICES.map((s) => [s.id as number, s]));
  const item = (id: number): SaleItem => {
    const s = serviceById.get(id)!;
    return { serviceId: id, name: s.name, price: s.price, qty: 1 };
  };

  // Sales, oldest first.
  const drafts: Omit<Sale, "id">[] = [];
  for (let back = HISTORY_DAYS; back >= 0; back--) {
    const day = addDays(today, -back);
    // Friday is closed, but today always gets data so the Today screen is never empty.
    if (!open(day) && back !== 0) continue;
    const thursdayBoost = weekdayIndex(day) === 5 ? 3 : 0;
    const visits = Math.min(10, 3 + Math.floor(rand() * 4) + thursdayBoost);
    for (let v = 0; v < visits; v++) {
      const hour = pick(rand, PEAK_HOURS);
      const when = new Date(day);
      when.setHours(hour, Math.floor(rand() * 4) * 15, 0, 0);
      let date = when.getTime();
      if (back === 0) date = Math.min(date, now - (v + 1) * 20 * 60_000);
      if (date < day.getTime()) continue;

      const customerId = pick<number | undefined>(rand, [
        [undefined, 6],
        ...PEOPLE.map(([, , w], i): [number | undefined, number] => [i + 1, w]),
      ]);
      // People who left stop appearing after their cut-off.
      if (customerId !== undefined && AWAY_AFTER[customerId] !== undefined && back < AWAY_AFTER[customerId]) continue;

      const main = pick(rand, Object.entries(SERVICE_WEIGHT).map(([id, w]): [number, number] => [Number(id), w]));
      const items = [item(main)];
      if ((main === 1 || main === 2) && rand() < 0.2) items.push(item(main === 1 ? 2 : 1));
      const subtotal = items.reduce((t, i) => t + i.price * i.qty, 0);
      const discount = rand() < 0.06 ? Math.round((subtotal * 0.1) / 100_000) * 100_000 : 0;
      const tip = rand() < 0.12 ? (rand() < 0.5 ? T(50_000) : T(100_000)) : 0;
      drafts.push({ date, kind: "service", customerId, items, discount, tip, deposit: 0, method: pick(rand, PAYMENT_MIX), voided: false });
    }
    // Product sales are separate records: now and then a customer (or a walk-in) buys something.
    if (rand() < 0.35) {
      const when = new Date(day);
      when.setHours(pick(rand, PEAK_HOURS), Math.floor(rand() * 4) * 15, 30, 0);
      const date = back === 0 ? Math.min(when.getTime(), now - 5 * 60_000) : when.getTime();
      if (date >= day.getTime()) {
        const first = PRODUCTS[Math.floor(rand() * PRODUCTS.length)];
        const items: SaleItem[] = [{ productId: first.id, name: first.name, price: first.price, qty: 1 + Math.floor(rand() * 2) }];
        if (rand() < 0.25) {
          const second = PRODUCTS[Math.floor(rand() * PRODUCTS.length)];
          if (second.id !== first.id) items.push({ productId: second.id, name: second.name, price: second.price, qty: 1 });
        }
        const customerId = rand() < 0.6 ? 1 + Math.floor(rand() * 8) : undefined;
        drafts.push({ date, kind: "product", customerId, items, discount: 0, tip: 0, deposit: 0, method: pick(rand, PAYMENT_MIX), voided: false });
      }
    }
  }
  // A groom package for the reports, and two voided sales to try the void flow.
  const groomDay = addDays(today, -12);
  const groomAt = new Date(groomDay);
  groomAt.setHours(10, 0, 0, 0);
  drafts.push({ date: groomAt.getTime(), kind: "service", customerId: 4, items: [item(5)], discount: T(200_000), tip: T(200_000), deposit: T(500_000), method: "transfer", voided: false });
  drafts.sort((a, b) => a.date - b.date);
  const sales: Sale[] = drafts.map((d, i) => ({ ...d, id: i + 1 }));
  for (const back of [1, 3]) {
    const target = sales.filter((s) => s.date >= addDays(today, -back).getTime() && s.date < addDays(today, -back + 1).getTime());
    if (target.length) target[0].voided = true;
  }

  // Bookings: a finished one linked to a sale today, the rest ahead, plus a cancelled and a no-show.
  const appointments: Appointment[] = [];
  const todaySale = sales.find((s) => s.date >= today.getTime() && s.kind === "service" && s.customerId !== undefined && !s.voided);
  if (todaySale) {
    const ids = todaySale.items.flatMap((i) => (i.serviceId !== undefined ? [i.serviceId] : []));
    if (ids.length) {
      const id = appointments.length + 1;
      appointments.push({ id, customerId: todaySale.customerId as number, serviceIds: ids, start: todaySale.date - 30 * 60_000, durationMin: 30, status: "done", saleId: todaySale.id });
      todaySale.appointmentId = id;
    }
  }
  const slots: [number, number, number, number, number[], number?][] = [
    // [days ahead, hour, minute, customer, services, deposit]
    [0, 17, 0, 2, [3]],
    [0, 18, 30, 5, [1], T(100_000)],
    [0, 20, 0, 8, [4]],
    [1, 10, 0, 1, [1, 2]],
    [1, 11, 30, 6, [1]],
    [1, 16, 0, 10, [6]],
    [2, 12, 0, 4, [5], T(1_000_000)],
    [3, 17, 30, 3, [3]],
  ];
  for (const [ahead, hour, minute, customerId, serviceIds, deposit] of slots) {
    const day = addDays(today, ahead);
    
    const start = new Date(day);
    start.setHours(hour, minute, 0, 0);
    if (start.getTime() < now) continue;
    const durationMin = serviceIds.reduce((t, id) => t + (serviceById.get(id)?.durationMin ?? 30), 0);
    appointments.push({ id: appointments.length + 1, customerId, serviceIds, start: start.getTime(), durationMin, status: "booked", deposit });
  }
  // A booking on a closed day (Friday), to show that is allowed.
  for (let ahead = 1; ahead <= 7; ahead++) {
    const day = addDays(today, ahead);
    if (weekdayIndex(day) !== 6) continue;
    day.setHours(11, 0, 0, 0);
    appointments.push({ id: appointments.length + 1, customerId: 7, serviceIds: [1], start: day.getTime(), durationMin: 30, status: "booked", note: "روز تعطیل، نوبت ویژه" });
    break;
  }
  const past = (back: number, hour: number, customerId: number, status: Appointment["status"]) => {
    const d = addDays(today, -back);
    d.setHours(hour, 0, 0, 0);
    appointments.push({ id: appointments.length + 1, customerId, serviceIds: [1], start: d.getTime(), durationMin: 30, status });
  };
  past(2, 15, 9, "cancelled");
  past(4, 12, 11, "noshow");

  // Expenses: monthly rules (already generated up to this month), supplies and small extras.
  const { jy, jm, jd } = toJ(today);
  const currentMonth = jy * 12 + jm - 1;
  const rules: RecurringExpense[] = [
    { id: 1, categoryId: 1, amount: T(4_000_000), note: "اجاره مغازه", day: 1, active: true, lastGenerated: jd >= 1 ? currentMonth : currentMonth - 1 },
    { id: 2, categoryId: 5, amount: T(3_500_000), note: "حقوق دستیار", day: 5, active: true, lastGenerated: jd >= 5 ? currentMonth : currentMonth - 1 },
    { id: 3, categoryId: 3, amount: T(800_000), note: "قبض برق و آب", day: 20, active: true, lastGenerated: jd >= 20 ? currentMonth : currentMonth - 1 },
  ];
  const expenses: Expense[] = [];
  const windowStart = addDays(today, -HISTORY_DAYS).getTime();
  for (const rule of rules) {
    for (let back = 0; back <= HISTORY_DAYS; back++) {
      const day = addDays(today, -back);
      const j = toJ(day);
      if (j.jd !== rule.day) continue;
      const at = new Date(day);
      at.setHours(12, 0, 0, 0);
      if (at.getTime() >= windowStart && at.getTime() <= now) {
        expenses.push({ date: at.getTime(), categoryId: rule.categoryId, amount: rule.amount, note: rule.note, recurringId: rule.id });
      }
    }
  }
  for (let back = HISTORY_DAYS - 3; back >= 0; back -= 11) {
    const at = addDays(today, -back);
    at.setHours(14, 0, 0, 0);
    if (at.getTime() <= now) expenses.push({ date: at.getTime(), categoryId: 2, amount: T(1_400_000 + Math.floor(rand() * 10) * 100_000), note: "خرید ژل و شامپو" });
  }
  for (let back = HISTORY_DAYS - 8; back >= 0; back -= 9) {
    const at = addDays(today, -back);
    at.setHours(15, 0, 0, 0);
    if (at.getTime() <= now) expenses.push({ date: at.getTime(), categoryId: 4, amount: T(80_000 + Math.floor(rand() * 8) * 20_000), note: "چای، تعمیرات کوچک" });
  }
  expenses.sort((a, b) => a.date - b.date).forEach((e, i) => (e.id = i + 1));

  // Cash count for the last two working days (one matches, one is a little short).
  const dayCloses: DayClose[] = [];
  let found = 0;
  for (let back = 1; back < 10 && found < 2; back++) {
    const day = addDays(today, -back);
    if (!open(day)) continue;
    const range = [day.getTime(), addDays(day, 1).getTime()];
    const expected = sales
      .filter((s) => !s.voided && s.method === "cash" && s.date >= range[0] && s.date < range[1])
      .reduce((t, s) => t + saleTotal(s), 0);
    dayCloses.push({ id: found + 1, day: day.getTime(), expected, counted: found === 0 ? expected : Math.max(0, expected - T(50_000)), createdAt: range[1] - 60_000 });
    found++;
  }

  const settings = [
    ["shopName", "آرایشگاه الماس"],
    ["ownerName", "حسین احمدی"],
    ["shopPhone", "02122334455"],
    ["shopAddress", "تهران، خیابان نمونه، پلاک ۱۲"],
    ["unit", "toman"],
    ["depositEnabled", true],
    ["loyaltyEnabled", true],
    ["loyaltyEvery", 10],
    ["inactiveDays", 30],
  ].map(([key, value]) => ({ key: key as string, value }));

  await db.transaction("rw", TABLES.map((t) => db.table(t)), async () => {
    for (const name of TABLES) await db.table(name).clear();
    await db.services.bulkAdd(SERVICES);
    await db.products.bulkAdd(PRODUCTS);
    await db.expenseCategories.bulkAdd(CATEGORIES);
    await db.customers.bulkAdd(customers);
    await db.sales.bulkAdd(sales);
    await db.appointments.bulkAdd(appointments);
    await db.recurringExpenses.bulkAdd(rules);
    await db.expenses.bulkAdd(expenses);
    await db.dayCloses.bulkAdd(dayCloses);
    await db.settings.bulkAdd(settings);
  });

  return { customers: customers.length, sales: sales.length, expenses: expenses.length, appointments: appointments.length };
}

// Back to a fresh install: empty data and the starter services and expense categories.
export async function resetAllData() {
  await db.transaction("rw", TABLES.map((t) => db.table(t)), async () => {
    for (const name of TABLES) await db.table(name).clear();
    await db.services.bulkAdd(STARTER_SERVICES.map((s) => ({ ...s })));
    await db.expenseCategories.bulkAdd(STARTER_CATEGORIES.map((c) => ({ ...c })));
  });
}
