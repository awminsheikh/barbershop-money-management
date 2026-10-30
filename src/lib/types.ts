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

export interface SaleItem {
  serviceId?: number;
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
  method: PaymentMethod;
  appointmentId?: number;
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

export const saleTotal = (s: Pick<Sale, "items" | "discount" | "tip">) =>
  saleSubtotal(s) - s.discount + s.tip;
