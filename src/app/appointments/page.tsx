"use client";

import { useState } from "react";
import { AppointmentsPanel } from "@/components/AppointmentsPanel";
import { JalaliCalendar } from "@/components/JalaliCalendar";
import { PageHeader } from "@/components/ui";
import { addDays, dayRange, formatDate, isSameDay, startOfDay } from "@/lib/date";

export default function AppointmentsPage() {
  const [date, setDate] = useState(() => startOfDay(new Date()));
  const [calendar, setCalendar] = useState(false);
  const { from, to } = dayRange(date);

  return (
    <>
      <PageHeader title="نوبت‌ها" />
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          className="min-h-12 min-w-12 rounded-xl border border-line bg-card text-xl"
          onClick={() => setDate(addDays(date, -1))}
          aria-label="روز قبل"
        >
          ›
        </button>
        <button type="button" className="min-h-12 flex-1 rounded-xl border border-line bg-card font-semibold" onClick={() => setCalendar(true)}>
          {isSameDay(date, new Date()) ? "امروز · " : ""}
          {formatDate(date)}
        </button>
        <button
          type="button"
          className="min-h-12 min-w-12 rounded-xl border border-line bg-card text-xl"
          onClick={() => setDate(addDays(date, 1))}
          aria-label="روز بعد"
        >
          ‹
        </button>
      </div>
      <JalaliCalendar
        key={date.getTime()}
        open={calendar}
        value={date}
        onClose={() => setCalendar(false)}
        onPick={(d) => {
          setDate(startOfDay(d));
          setCalendar(false);
        }}
      />
      <AppointmentsPanel from={from} to={to} date={date} empty="برای این روز نوبتی ثبت نشده است." />
    </>
  );
}
