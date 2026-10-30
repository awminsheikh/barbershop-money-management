"use client";

import { useState } from "react";
import { db } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/date";
import { useAppointments, useById, useCustomers, useServices } from "@/lib/hooks";
import { formatMoney } from "@/lib/money";
import { fillTemplate, sendMessage } from "@/lib/messaging";
import { useSettings } from "@/lib/settings";
import { STATUS_LABEL, type Appointment, type AppointmentStatus } from "@/lib/types";
import { BookingForm } from "./BookingForm";
import { SaleForm } from "./SaleForm";
import { Button, Card, Empty, Sheet } from "./ui";

const BADGE: Record<AppointmentStatus, string> = {
  booked: "bg-brand-soft text-brand",
  done: "bg-good/15 text-good",
  cancelled: "bg-line text-muted",
  noshow: "bg-bad/15 text-bad",
};

type Mode = { kind: "view" | "edit" | "sale"; appointment: Appointment } | { kind: "new" } | null;

export function AppointmentsPanel({ from, to, date, empty }: { from: number; to: number; date: Date; empty: string }) {
  const settings = useSettings();
  const appointments = useAppointments(from, to);
  const customers = useById(useCustomers());
  const services = useById(useServices());
  const [mode, setMode] = useState<Mode>(null);
  const close = () => setMode(null);

  const setStatus = async (a: Appointment, status: AppointmentStatus) => {
    await db.appointments.update(a.id!, { status });
    close();
  };

  const remind = (a: Appointment) => {
    const customer = customers.get(a.customerId);
    if (!customer?.phone) return;
    const text = fillTemplate(settings.template, {
      name: customer.name,
      date: formatDate(a.start),
      time: formatTime(a.start),
    });
    sendMessage(settings.channel, customer.phone, text);
  };

  const names = (a: Appointment) =>
    a.serviceIds.map((id) => services.get(id)?.name).filter(Boolean).join("، ");

  const active = mode && mode.kind !== "new" ? mode.appointment : null;

  return (
    <div className="space-y-3">
      {appointments.length === 0 ? (
        <Empty>{empty}</Empty>
      ) : (
        appointments.map((a) => (
          <button key={a.id} type="button" className="block w-full text-start" onClick={() => setMode({ kind: "view", appointment: a })}>
            <Card className="flex items-center gap-3 active:opacity-70">
              <div className="w-14 text-center text-lg font-bold">{formatTime(a.start)}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{customers.get(a.customerId)?.name ?? "مشتری"}</div>
                <div className="truncate text-sm text-muted">{names(a)}</div>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs ${BADGE[a.status]}`}>{STATUS_LABEL[a.status]}</span>
            </Card>
          </button>
        ))
      )}

      <Button className="w-full" variant="secondary" onClick={() => setMode({ kind: "new" })}>
        + نوبت جدید
      </Button>

      <Sheet open={mode?.kind === "new"} title="نوبت جدید" onClose={close}>
        <BookingForm defaultDate={date} onDone={close} />
      </Sheet>

      <Sheet open={mode?.kind === "edit"} title="ویرایش نوبت" onClose={close}>
        {active && <BookingForm appointment={active} defaultDate={date} onDone={close} />}
      </Sheet>

      <Sheet open={mode?.kind === "sale"} title="ثبت فروش نوبت" onClose={close}>
        {active && (
          <SaleForm
            onDone={close}
            initial={{
              customerId: active.customerId,
              appointmentId: active.id,
              deposit: active.deposit,
              items: active.serviceIds.flatMap((id) => {
                const s = services.get(id);
                return s ? [{ serviceId: id, name: s.name, price: s.price, qty: 1 }] : [];
              }),
            }}
          />
        )}
      </Sheet>

      <Sheet open={mode?.kind === "view"} title="جزئیات نوبت" onClose={close}>
        {active && (
          <>
            <Card className="space-y-1">
              <div className="text-lg font-bold">{customers.get(active.customerId)?.name ?? "مشتری"}</div>
              <div className="text-muted">
                {formatDate(active.start)} · {formatTime(active.start)}
              </div>
              <div>{names(active)}</div>
              {active.deposit ? <div className="text-muted">بیعانه: {formatMoney(active.deposit, settings.unit)}</div> : null}
              {active.note ? <div className="text-muted">{active.note}</div> : null}
              <span className={`inline-block rounded-full px-3 py-1 text-xs ${BADGE[active.status]}`}>
                {STATUS_LABEL[active.status]}
              </span>
            </Card>

            {active.status === "booked" && (
              <>
                <Button className="w-full" onClick={() => setMode({ kind: "sale", appointment: active })}>
                  انجام شد — ثبت فروش
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="secondary" onClick={() => setMode({ kind: "edit", appointment: active })}>
                    ویرایش
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={!customers.get(active.customerId)?.phone}
                    onClick={() => remind(active)}
                  >
                    یادآوری به مشتری
                  </Button>
                  <Button variant="danger" onClick={() => setStatus(active, "cancelled")}>
                    لغو نوبت
                  </Button>
                  <Button variant="danger" onClick={() => setStatus(active, "noshow")}>
                    مشتری نیامد
                  </Button>
                </div>
              </>
            )}
            {(active.status === "cancelled" || active.status === "noshow") && (
              <Button className="w-full" variant="secondary" onClick={() => setStatus(active, "booked")}>
                بازگرداندن به رزرو
              </Button>
            )}
            {active.status === "done" && (
              <p className="text-sm text-muted">فروش این نوبت ثبت شده است. برای اصلاح، فروش را از بخش گزارش‌ها باطل کنید.</p>
            )}
          </>
        )}
      </Sheet>
    </div>
  );
}
