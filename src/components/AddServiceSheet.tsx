"use client";

import { useState } from "react";
import { startOfDay } from "@/lib/date";
import { BookingForm } from "./BookingForm";
import { SaleForm } from "./SaleForm";
import { Segmented, Sheet } from "./ui";

type Tab = "reserve" | "now";

// The header "+" button: a new reservation, or a service for a customer who is already in the chair.
export function AddServiceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("reserve");
  return (
    <Sheet open={open} title="نوبت یا خدمت جدید" onClose={onClose}>
      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: "reserve", label: "رزرو نوبت" },
          { value: "now", label: "ثبت خدمت انجام‌شده" },
        ]}
      />
      {tab === "reserve" ? (
        <BookingForm defaultDate={startOfDay(new Date())} onDone={onClose} />
      ) : (
        <SaleForm kind="service" onDone={onClose} />
      )}
    </Sheet>
  );
}
