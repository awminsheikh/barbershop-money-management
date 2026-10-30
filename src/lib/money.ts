import { normalizeDigits } from "./date";

export type Unit = "toman" | "rial";

const faNumber = new Intl.NumberFormat("fa-IR");

export const unitLabel = (u: Unit) => (u === "toman" ? "تومان" : "ریال");

export const fromRial = (rial: number, u: Unit) => (u === "toman" ? rial / 10 : rial);

export const toRial = (value: number, u: Unit) => Math.round(u === "toman" ? value * 10 : value);

export const formatNumber = (n: number) => faNumber.format(Math.round(n));

export const formatMoney = (rial: number, u: Unit, withUnit = true) =>
  formatNumber(fromRial(rial, u)) + (withUnit ? ` ${unitLabel(u)}` : "");

// Parses what the user typed (Persian or Latin digits, any separators) into a number.
export const parseAmount = (text: string) => {
  const cleaned = normalizeDigits(text).replace(/[^\d]/g, "");
  return cleaned ? Number(cleaned) : 0;
};
