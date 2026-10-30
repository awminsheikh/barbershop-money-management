"use client";

import { db } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/date";
import { useById, useCustomers, useServices } from "@/lib/hooks";
import { formatMoney } from "@/lib/money";
import { fillTemplate, sendMessage } from "@/lib/messaging";
import { useSettings } from "@/lib/settings";
import { STATUS_LABEL, type Appointment, type AppointmentStatus } from "@/lib/types";
import { BookingForm } from "./BookingForm";
import { SaleForm } from "./SaleForm";
import { Button, Card, Sheet } from "./ui";

export const BADGE: Record<AppointmentStatus, string> = {
  booked: "bg-brand-soft text-brand",
  done: "bg-good/15 text-good",
  cancelled: "bg-line text-muted",
  noshow: "bg-bad/15 text-bad",
};

export type ApptMode =
  | { kind: "view" | "edit" | "sale"; appointment: Appointment }
  | { kind: "new"; date?: Date; minutes?: number }
  | null;

// The new / edit / view / pay sheets for appointments, shared by the list and the calendar.
export function AppointmentSheets({
  mode,
  setMode,
  date,
}: {
  mode: ApptMode;
  setMode: (m: ApptMode) => void;
  date: Date;
}) {
  const settings = useSettings();
  const customers = useById(useCustomers());
  const services = useById(useServices());
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
  const fresh = mode?.kind === "new" ? mode : null;

  return (
    <>
      <Sheet open={mode?.kind === "new"} title="نوبت جدید" onClose={close}>
        {fresh && <BookingForm defaultDate={fresh.date ?? date} defaultMinutes={fresh.minutes} onDone={close} />}
      </Sheet>

      <Sheet open={mode?.kind === "edit"} title="ویرایش نوبت" onClose={close}>
        {active && <BookingForm appointment={active} defaultDate={date} onDone={close} />}
      </Sheet>

      <Sheet open={mode?.kind === "sale"} title="ثبت خدمت انجام‌شده" onClose={close}>
        {active && (
          <SaleForm
            kind="service"
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
                  انجام شد — ثبت خدمت و پرداخت
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="secondary" onClick={() => setMode({ kind: "edit", appointment: active })}>
                    ویرایش
                  </Button>
                  <Button variant="secondary" disabled={!customers.get(active.customerId)?.phone} onClick={() => remind(active)}>
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
              <p className="text-sm text-muted">خدمت این نوبت ثبت شده است. برای اصلاح، آن را از بخش گزارش‌ها باطل کنید.</p>
            )}
          </>
        )}
      </Sheet>
    </>
  );
}
