export type PaymentMethod = "cash" | "card" | "transfer";
export type AppointmentStatus = "booked" | "done" | "cancelled" | "noshow";
export type MessageChannel = "sms" | "telegram" | "whatsapp";

// All money values are integers in Rial.
export interface Service {
  id?: number;
  name: string;
  price: number;
  durationMin: number;
  active: boolean;
}

export interface Customer {
  id?: number;
  name: string;
  phone?: string;
  notes?: string;
  // Jalali month (1-12) and day.
  birthday?: { month: number; day: number };
  vip?: boolean;
  createdAt: number;
}

export interface Appointment {
  id?: number;
  customerId: number;
  serviceIds: number[];
  start: number;
  durationMin: number;
  status: AppointmentStatus;
  deposit?: number;
  note?: string;
  saleId?: number;
}

export interface Product {
  id?: number;
  name: string;
  costPrice: number;
  price: number;
  stock: number;
  lowStockAt: number;
  active: boolean;
}

export interface SaleItem {
  serviceId?: number;
  productId?: number;
  name: string;
  price: number;
  qty: number;
}

export interface Sale {
  id?: number;
  date: number;
  customerId?: number;
  items: SaleItem[];
  discount: number;
  tip: number;
  deposit: number;
  // VAT charged on top of (services - discount); 0 when the option is off.
  vat?: number;
  method: PaymentMethod;
  appointmentId?: number;
  // True when this sale used the loyalty reward (one free service).
  loyaltyFree?: boolean;
  voided: boolean;
  note?: string;
}

export interface ExpenseCategory {
  id?: number;
  name: string;
}

export interface Expense {
  id?: number;
  date: number;
  categoryId?: number;
  amount: number;
  note?: string;
  recurringId?: number;
}

export interface RecurringExpense {
  id?: number;
  categoryId?: number;
  amount: number;
  note?: string;
  // Jalali day of month (1-31); short months use their last day.
  day: number;
  active: boolean;
  // Month index (jalali year * 12 + month - 1) up to which expenses were generated.
  lastGenerated: number;
}

export interface DayClose {
  id?: number;
  // Start of the day being closed.
  day: number;
  expected: number;
  counted: number;
  createdAt: number;
}

export interface SettingRow {
  key: string;
  value: unknown;
}

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "نقد",
  card: "کارت (پوز)",
  transfer: "کارت به کارت",
};

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  booked: "رزرو شده",
  done: "انجام شد",
  cancelled: "لغو شد",
  noshow: "نیامد",
};

export const saleSubtotal = (s: Pick<Sale, "items">) =>
  s.items.reduce((sum, i) => sum + i.price * i.qty, 0);

export const saleTotal = (s: Pick<Sale, "items" | "discount" | "tip"> & { vat?: number }) =>
  saleSubtotal(s) - s.discount + (s.vat ?? 0) + s.tip;
