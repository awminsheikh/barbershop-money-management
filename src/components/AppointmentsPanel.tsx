"use client";

import { useState } from "react";
import { formatTime } from "@/lib/date";
import { useAppointments, useById, useCustomers, useServices } from "@/lib/hooks";
import { STATUS_LABEL, type Appointment } from "@/lib/types";
import { AppointmentSheets, BADGE, type ApptMode } from "./AppointmentSheets";
import { Button, Card, Empty } from "./ui";

export function AppointmentsPanel({ from, to, date, empty }: { from: number; to: number; date: Date; empty: string }) {
  const appointments = useAppointments(from, to);
  const customers = useById(useCustomers());
  const services = useById(useServices());
  const [mode, setMode] = useState<ApptMode>(null);

  const names = (a: Appointment) =>
    a.serviceIds.map((id) => services.get(id)?.name).filter(Boolean).join("، ");

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

      <AppointmentSheets mode={mode} setMode={setMode} date={date} />
    </div>
  );
}
