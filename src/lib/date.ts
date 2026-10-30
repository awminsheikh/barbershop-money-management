import { toGregorian, toJalaali } from "jalaali-js";

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

// Iranian week starts on Saturday (index 0).
export const WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
export const WEEKDAYS_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export const toFa = (v: string | number) => String(v).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);

export const normalizeDigits = (s: string) =>
  s
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));

export const weekdayIndex = (d: Date) => (d.getDay() + 1) % 7;

export const startOfDay = (d: Date | number) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const addDays = (d: Date | number, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export interface JDate {
  jy: number;
  jm: number;
  jd: number;
}

export const toJ = (d: Date | number): JDate => {
  const x = new Date(d);
  const { jy, jm, jd } = toJalaali(x.getFullYear(), x.getMonth() + 1, x.getDate());
  return { jy, jm, jd };
};

export const fromJ = (jy: number, jm: number, jd: number, h = 0, min = 0) => {
  const { gy, gm, gd } = toGregorian(jy, jm, jd);
  return new Date(gy, gm - 1, gd, h, min);
};

export const formatDate = (ts: Date | number, withWeekday = true) => {
  const d = new Date(ts);
  const { jy, jm, jd } = toJ(d);
  const base = `${toFa(jd)} ${JALALI_MONTHS[jm - 1]} ${toFa(jy)}`;
  return withWeekday ? `${WEEKDAYS[weekdayIndex(d)]} ${base}` : base;
};

export const formatDayMonth = (ts: Date | number) => {
  const { jm, jd } = toJ(ts);
  return `${toFa(jd)} ${JALALI_MONTHS[jm - 1]}`;
};

export const formatMonth = (jy: number, jm: number) => `${JALALI_MONTHS[jm - 1]} ${toFa(jy)}`;

export const hhmm = (ts: Date | number) => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export const formatTime = (ts: Date | number) => toFa(hhmm(ts));

export const minutesOf = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export const timeLabel = (minutes: number) =>
  toFa(`${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`);

export const dayRange = (d: Date | number) => {
  const s = startOfDay(d);
  return { from: s.getTime(), to: addDays(s, 1).getTime() };
};

export const weekRange = (d: Date | number) => {
  const s = startOfDay(d);
  const from = addDays(s, -weekdayIndex(s));
  return { from: from.getTime(), to: addDays(from, 7).getTime() };
};

// [from, to) for a Jalali month.
export const monthRange = (jy: number, jm: number) => ({
  from: fromJ(jy, jm, 1).getTime(),
  to: fromJ(jm === 12 ? jy + 1 : jy, jm === 12 ? 1 : jm + 1, 1).getTime(),
});

export const isSameDay = (a: Date | number, b: Date | number) =>
  startOfDay(a).getTime() === startOfDay(b).getTime();
