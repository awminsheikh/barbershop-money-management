"use client";

import { useState } from "react";
import { AppointmentsCalendar, type CalendarSpan } from "@/components/AppointmentsCalendar";
import { AppointmentsPanel } from "@/components/AppointmentsPanel";
import { JalaliCalendar } from "@/components/JalaliCalendar";
import { DateStepper, PageHeader, Segmented } from "@/components/ui";
import { addDays, addJMonths, dayRange, formatDate, formatDayMonth, formatMonth, isSameDay, startOfDay, toJ, weekRange } from "@/lib/date";

type View = "list" | "calendar";

export default function AppointmentsPage() {
  const [date, setDate] = useState(() => startOfDay(new Date()));
  const [view, setView] = useState<View>("list");
  const [span, setSpan] = useState<CalendarSpan>("day");
  const [picker, setPicker] = useState(false);
  const { from, to } = dayRange(date);
  const unit = view === "list" ? "day" : span;

  const step = (dir: 1 | -1) =>
    setDate(unit === "month" ? addJMonths(date, dir) : addDays(date, dir * (unit === "week" ? 7 : 1)));

  let label = (isSameDay(date, new Date()) ? "امروز · " : "") + formatDate(date);
  if (unit === "week") {
    const w = weekRange(date);
    label = `${formatDayMonth(w.from)} تا ${formatDayMonth(addDays(w.from, 6))}`;
  } else if (unit === "month") {
    const { jy, jm } = toJ(date);
    label = formatMonth(jy, jm);
  }

  return (
    <>
      <PageHeader title="نوبت‌ها" />
      <div className="mb-3 space-y-2">
        <Segmented<View>
          value={view}
          onChange={setView}
          options={[
            { value: "list", label: "فهرست" },
            { value: "calendar", label: "تقویم" },
          ]}
        />
        {view === "calendar" && (
          <Segmented<CalendarSpan>
            value={span}
            onChange={setSpan}
            options={[
              { value: "day", label: "روز" },
              { value: "week", label: "هفته" },
              { value: "month", label: "ماه" },
            ]}
          />
        )}
      </div>
      <div className="mb-4">
        <DateStepper label={label} onPrev={() => step(-1)} onNext={() => step(1)} onLabel={() => setPicker(true)} />
      </div>
      <JalaliCalendar
        key={date.getTime()}
        open={picker}
        value={date}
        onClose={() => setPicker(false)}
        onPick={(d) => {
          setDate(startOfDay(d));
          setPicker(false);
        }}
      />
      {view === "list" ? (
        <AppointmentsPanel from={from} to={to} date={date} empty="برای این روز نوبتی ثبت نشده است." />
      ) : (
        <AppointmentsCalendar
          span={span}
          date={date}
          onPickDay={(d) => {
            setDate(startOfDay(d));
            setSpan("day");
          }}
        />
      )}
    </>
  );
}
