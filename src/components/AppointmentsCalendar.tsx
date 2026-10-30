"use client";

import { jalaaliMonthLength } from "jalaali-js";
import { useMemo, useState } from "react";
import {
  addDays,
  dayRange,
  formatDayMonth,
  formatTime,
  fromJ,
  isSameDay,
  minutesOf,
  monthRange,
  startOfDay,
  timeLabel,
  toFa,
  toJ,
  weekdayIndex,
  weekRange,
  WEEKDAYS,
  WEEKDAYS_SHORT,
} from "@/lib/date";
import { useAppointments, useById, useCustomers, useServices } from "@/lib/hooks";
import { appointmentEnd } from "@/lib/repo";
import { useSettings } from "@/lib/settings";
import type { Appointment, AppointmentStatus } from "@/lib/types";
import { AppointmentSheets, type ApptMode } from "./AppointmentSheets";

export type CalendarSpan = "day" | "week" | "month";

const BLOCK: Record<AppointmentStatus, string> = {
  booked: "border-brand bg-brand-soft",
  done: "border-good bg-good/15",
  cancelled: "border-line bg-card text-muted line-through opacity-60",
  noshow: "border-bad bg-bad/10 text-muted",
};

const ROW = 56; // px per hour in the day view

export function AppointmentsCalendar({
  span,
  date,
  onPickDay,
}: {
  span: CalendarSpan;
  date: Date;
  onPickDay: (d: Date) => void;
}) {
  const settings = useSettings();
  const customers = useById(useCustomers());
  const services = useById(useServices());
  const [mode, setMode] = useState<ApptMode>(null);

  const range = useMemo(() => {
    if (span === "day") return dayRange(date);
    if (span === "week") return weekRange(date);
    const { jy, jm } = toJ(date);
    return monthRange(jy, jm);
  }, [span, date]);
  const appointments = useAppointments(range.from, range.to);
  const today = new Date();
  const isOff = (d: Date) => !settings.workDays.includes(weekdayIndex(d));
  const nameOf = (a: Appointment) => customers.get(a.customerId)?.name ?? "مشتری";
  const servicesOf = (a: Appointment) => a.serviceIds.map((id) => services.get(id)?.name).filter(Boolean).join("، ");

  const byDay = useMemo(() => {
    const map = new Map<number, Appointment[]>();
    for (const a of appointments) {
      const key = startOfDay(a.start).getTime();
      map.set(key, [...(map.get(key) ?? []), a]);
    }
    return map;
  }, [appointments]);

  let body;
  if (span === "day") {
    const day = appointments;
    const first = Math.floor(minutesOf(settings.workStart) / 60);
    const last = Math.ceil(minutesOf(settings.workEnd) / 60);
    const startH = Math.min(first, ...day.map((a) => new Date(a.start).getHours()));
    const endH = Math.max(last, ...day.map((a) => Math.ceil((new Date(appointmentEnd(a)).getHours() * 60 + new Date(appointmentEnd(a)).getMinutes()) / 60)));
    const hours = Array.from({ length: Math.max(1, endH - startH) }, (_, i) => startH + i);
    const base = dayRange(date).from + startH * 3_600_000;

    // Side-by-side lanes for bookings that overlap.
    const lanes: number[] = [];
    const placed = day.map((a) => {
      let lane = lanes.findIndex((end) => end <= a.start);
      if (lane === -1) lane = lanes.length;
      lanes[lane] = appointmentEnd(a);
      return { a, lane };
    });

    body = (
      <div className="flex gap-2">
        {/* One shift for the whole column (not per row), so every label stays on its row's top edge. */}
        <div className="-mt-2 w-12 shrink-0 text-xs leading-4 text-muted">
          {hours.map((h) => (
            <div key={h} style={{ height: ROW }}>
              {timeLabel(h * 60)}
            </div>
          ))}
        </div>
        <div className="relative flex-1 overflow-hidden rounded-xl border border-line bg-card" style={{ height: hours.length * ROW }}>
          {hours.map((h) => (
            <button
              key={h}
              type="button"
              aria-label={`نوبت جدید ساعت ${timeLabel(h * 60)}`}
              className="block w-full border-b border-line active:bg-line/50"
              style={{ height: ROW }}
              onClick={() => setMode({ kind: "new", date, minutes: h * 60 })}
            />
          ))}
          {placed.map(({ a, lane }) => {
            const top = ((a.start - base) / 3_600_000) * ROW;
            const height = Math.max(46, (a.durationMin / 60) * ROW - 3);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setMode({ kind: "view", appointment: a })}
                className={`absolute overflow-hidden rounded-lg border-s-4 p-1.5 text-start text-xs ${BLOCK[a.status]}`}
                style={{
                  top,
                  height,
                  insetInlineStart: `${(lane * 100) / Math.max(1, lanes.length)}%`,
                  width: `calc(${100 / Math.max(1, lanes.length)}% - 3px)`,
                }}
              >
                <div className="truncate font-semibold">{nameOf(a)}</div>
                <div className="truncate opacity-80">
                  {formatTime(a.start)} · {servicesOf(a)}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  } else if (span === "week") {
    body = (
      <div className="space-y-2">
        {Array.from({ length: 7 }, (_, i) => {
          const d = addDays(range.from, i);
          const list = byDay.get(d.getTime()) ?? [];
          return (
            <div key={i} className={`rounded-2xl border bg-card p-3 ${isSameDay(d, today) ? "border-accent" : "border-line"}`}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <button type="button" className="text-start" onClick={() => onPickDay(d)}>
                  <span className={`font-semibold ${isOff(d) ? "text-muted" : ""}`}>{WEEKDAYS[i]}</span>
                  <span className="ms-2 text-sm text-muted">{formatDayMonth(d)}</span>
                  {isOff(d) && <span className="ms-2 text-xs text-muted">تعطیل</span>}
                </button>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted active:opacity-70"
                  aria-label="نوبت جدید"
                  onClick={() => setMode({ kind: "new", date: d })}
                >
                  +
                </button>
              </div>
              {list.length === 0 ? (
                <div className="text-sm text-muted">—</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {list.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setMode({ kind: "view", appointment: a })}
                      className={`rounded-lg border-s-4 px-2 py-1 text-start text-xs ${BLOCK[a.status]}`}
                    >
                      <span className="font-semibold">{formatTime(a.start)}</span> {nameOf(a)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  } else {
    const { jy, jm } = toJ(date);
    const lead = weekdayIndex(fromJ(jy, jm, 1));
    const days = jalaaliMonthLength(jy, jm);
    body = (
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS_SHORT.map((w) => (
          <div key={w} className="py-1 text-xs text-muted">
            {w}
          </div>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <div key={`e${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const d = fromJ(jy, jm, i + 1);
          const list = (byDay.get(d.getTime()) ?? []).filter((a) => a.status === "booked" || a.status === "done");
          const booked = list.filter((a) => a.status === "booked").length;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPickDay(d)}
              className={`flex min-h-16 flex-col items-center justify-start gap-1 rounded-xl border p-1 text-sm active:opacity-70 ${
                isSameDay(d, today) ? "border-accent" : "border-line"
              } ${isOff(d) ? "bg-transparent text-muted" : "bg-card"}`}
            >
              <span>{toFa(i + 1)}</span>
              {list.length > 0 && (
                <span
                  className={`min-w-6 rounded-full px-1.5 text-xs font-semibold ${booked > 0 ? "bg-brand text-brand-ink" : "bg-good/20 text-good"}`}
                >
                  {toFa(list.length)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {span === "day" && isOff(date) && (
        <p className="mb-3 rounded-xl border border-line bg-card p-3 text-sm text-muted">
          این روز تعطیل است. با لمس یک ساعت می‌توانید نوبت ثبت کنید.
        </p>
      )}
      {span === "month" && <p className="mb-2 text-xs text-muted">عدد هر روز، تعداد نوبت‌هاست. برای دیدن جزئیات روی روز بزنید.</p>}
      {body}
      <AppointmentSheets mode={mode} setMode={setMode} date={date} />
    </>
  );
}
