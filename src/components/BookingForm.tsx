"use client";

import { useState } from "react";
import { db } from "@/lib/db";
import { dayRange, formatDate, minutesOf, startOfDay, timeLabel, toFa, weekdayIndex } from "@/lib/date";
import { useAppointments, useById, useCustomers, useServices } from "@/lib/hooks";
import { appointmentEnd, findConflicts } from "@/lib/repo";
import { useSettings } from "@/lib/settings";
import type { Appointment } from "@/lib/types";
import { AmountInput } from "./AmountInput";
import { CustomerPicker } from "./CustomerPicker";
import { JalaliCalendar } from "./JalaliCalendar";
import { Button, Chip, Field, inputClass } from "./ui";

export function BookingForm({
  appointment,
  defaultDate,
  onDone,
}: {
  appointment?: Appointment;
  defaultDate: Date;
  onDone: () => void;
}) {
  const settings = useSettings();
  const services = useServices().filter((s) => s.active || appointment?.serviceIds.includes(s.id!));
  const customers = useById(useCustomers());

  const initialDate = appointment ? new Date(appointment.start) : defaultDate;
  const [date, setDate] = useState(startOfDay(initialDate));
  const [minutes, setMinutes] = useState<number | undefined>(
    appointment ? initialDate.getHours() * 60 + initialDate.getMinutes() : undefined,
  );
  const [customerId, setCustomerId] = useState(appointment?.customerId);
  const [serviceIds, setServiceIds] = useState<number[]>(appointment?.serviceIds ?? []);
  const [duration, setDuration] = useState(appointment?.durationMin ?? 30);
  const [deposit, setDeposit] = useState(appointment?.deposit ?? 0);
  const [note, setNote] = useState(appointment?.note ?? "");
  const [calendar, setCalendar] = useState(false);
  const [conflicts, setConflicts] = useState<string[] | null>(null);

  const { from, to } = dayRange(date);
  const dayAppointments = useAppointments(from, to).filter((a) => a.status === "booked" && a.id !== appointment?.id);

  // Duration follows the chosen services until he adjusts it by hand.
  const [durationTouched, setDurationTouched] = useState(!!appointment);
  const autoDuration = serviceIds.reduce((t, id) => t + (services.find((s) => s.id === id)?.durationMin ?? 0), 0);
  const shownDuration = durationTouched || autoDuration === 0 ? duration : autoDuration;

  const slots: number[] = [];
  const first = minutesOf(settings.workStart);
  const last = minutesOf(settings.workEnd);
  for (let m = first; m < last; m += settings.slotMinutes) slots.push(m);
  // When editing, keep an off-grid time selectable.
  if (minutes !== undefined && !slots.includes(minutes)) slots.push(minutes);
  slots.sort((a, b) => a - b);

  const slotTaken = (m: number) => {
    const t = from + m * 60_000;
    return dayAppointments.some((a) => a.start <= t && t < appointmentEnd(a));
  };

  const dayOff = !settings.workDays.includes(weekdayIndex(date));
  const valid = customerId !== undefined && minutes !== undefined && serviceIds.length > 0;

  const toggleService = (id: number) =>
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const persist = async () => {
    const start = from + (minutes as number) * 60_000;
    const data = {
      customerId: customerId as number,
      serviceIds,
      start,
      durationMin: shownDuration,
      deposit: settings.depositEnabled && deposit > 0 ? deposit : undefined,
      note: note.trim() || undefined,
    };
    if (appointment?.id) await db.appointments.update(appointment.id, data);
    else await db.appointments.add({ ...data, status: "booked" });
    onDone();
  };

  const save = async () => {
    if (!valid) return;
    const start = from + (minutes as number) * 60_000;
    const clash = await findConflicts(start, shownDuration, appointment?.id);
    if (clash.length > 0 && conflicts === null) {
      setConflicts(clash.map((a) => customers.get(a.customerId)?.name ?? "مشتری"));
      return;
    }
    await persist();
  };

  return (
    <div className="space-y-4">
      <Field label="مشتری">
        <CustomerPicker value={customerId} onChange={setCustomerId} />
      </Field>

      <Field label="تاریخ">
        <button type="button" className={`${inputClass} text-start`} onClick={() => setCalendar(true)}>
          {formatDate(date)}
        </button>
      </Field>
      <JalaliCalendar
        open={calendar}
        value={date}
        onClose={() => setCalendar(false)}
        onPick={(d) => {
          setDate(startOfDay(d));
          setConflicts(null);
          setCalendar(false);
        }}
      />
      {dayOff && <p className="text-sm text-bad">این روز جزو روزهای کاری شما نیست.</p>}

      <div>
        <div className="mb-1 text-sm text-muted">ساعت</div>
        <div className="grid grid-cols-4 gap-2">
          {slots.map((m) => (
            <Chip
              key={m}
              active={minutes === m}
              disabled={slotTaken(m) && minutes !== m}
              onClick={() => {
                setMinutes(m);
                setConflicts(null);
              }}
            >
              {timeLabel(m)}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 text-sm text-muted">خدمات</div>
        <div className="flex flex-wrap gap-2">
          {services.map((s) => (
            <Chip key={s.id} active={serviceIds.includes(s.id!)} onClick={() => toggleService(s.id!)}>
              {s.name}
            </Chip>
          ))}
        </div>
      </div>

      <Field label="مدت (دقیقه)">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-12 w-12 rounded-xl border border-line text-lg"
            onClick={() => {
              setDurationTouched(true);
              setDuration(Math.max(15, shownDuration - 15));
            }}
          >
            −
          </button>
          <span className="min-w-16 text-center font-semibold">{toFa(shownDuration)}</span>
          <button
            type="button"
            className="h-12 w-12 rounded-xl border border-line text-lg"
            onClick={() => {
              setDurationTouched(true);
              setDuration(shownDuration + 15);
            }}
          >
            +
          </button>
        </div>
      </Field>

      {settings.depositEnabled && (
        <Field label="بیعانه (اختیاری)">
          <AmountInput value={deposit} onChange={setDeposit} />
        </Field>
      )}

      <Field label="یادداشت (اختیاری)">
        <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      {conflicts && (
        <div className="rounded-xl border border-bad p-3 text-sm">
          این زمان با نوبت {conflicts.join("، ")} تداخل دارد.
        </div>
      )}
      <Button className="w-full" disabled={!valid} onClick={conflicts ? persist : save}>
        {conflicts ? "با این حال ثبت شود" : appointment ? "ذخیره تغییرات" : "ثبت نوبت"}
      </Button>
    </div>
  );
}
