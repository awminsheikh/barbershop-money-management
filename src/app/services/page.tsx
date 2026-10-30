"use client";

import { useState } from "react";
import { AmountInput } from "@/components/AmountInput";
import { Button, Card, Empty, Field, PageHeader, Sheet, Toggle, inputClass } from "@/components/ui";
import { db } from "@/lib/db";
import { toFa } from "@/lib/date";
import { useServices } from "@/lib/hooks";
import { formatMoney } from "@/lib/money";
import { useSettings } from "@/lib/settings";
import type { Service } from "@/lib/types";

function ServiceSheet({ service, onClose }: { service: Service | "new" | null; onClose: () => void }) {
  const existing = service && service !== "new" ? service : null;
  const [name, setName] = useState(existing?.name ?? "");
  const [price, setPrice] = useState(existing?.price ?? 0);
  const [duration, setDuration] = useState(existing?.durationMin ?? 30);
  const [active, setActive] = useState(existing?.active ?? true);

  const save = async () => {
    if (!name.trim()) return;
    const data = { name: name.trim(), price, durationMin: duration, active };
    if (existing?.id) await db.services.update(existing.id, data);
    else await db.services.add(data);
    onClose();
  };

  return (
    <Sheet open={service !== null} title={existing ? "ویرایش خدمت" : "خدمت جدید"} onClose={onClose}>
      <Field label="نام">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="قیمت">
        <AmountInput value={price} onChange={setPrice} />
      </Field>
      <Field label="مدت (دقیقه)">
        <div className="flex items-center gap-2">
          <button type="button" className="h-12 w-12 rounded-xl border border-line text-lg" onClick={() => setDuration(Math.max(15, duration - 15))}>
            −
          </button>
          <span className="min-w-16 text-center font-semibold">{toFa(duration)}</span>
          <button type="button" className="h-12 w-12 rounded-xl border border-line text-lg" onClick={() => setDuration(duration + 15)}>
            +
          </button>
        </div>
      </Field>
      <Toggle checked={active} onChange={setActive} label="فعال (نمایش در فروش و نوبت‌دهی)" />
      <Button className="w-full" disabled={!name.trim()} onClick={save}>
        ذخیره
      </Button>
    </Sheet>
  );
}

export default function ServicesPage() {
  const { unit } = useSettings();
  const services = useServices();
  const [open, setOpen] = useState<Service | "new" | null>(null);
  const missingPrice = services.some((s) => s.active && s.price === 0);

  return (
    <>
      <PageHeader title="خدمات و قیمت‌ها" action={<Button onClick={() => setOpen("new")}>+ جدید</Button>} />
      {missingPrice && (
        <div className="mb-4 rounded-xl border border-brand bg-brand-soft p-3 text-sm">
          قیمت بعضی خدمات هنوز صفر است. برای هر خدمت قیمت خودتان را وارد کنید.
        </div>
      )}
      {services.length === 0 ? (
        <Empty>خدمتی ثبت نشده است.</Empty>
      ) : (
        <div className="space-y-2">
          {services.map((s) => (
            <button key={s.id} type="button" className="block w-full text-start" onClick={() => setOpen(s)}>
              <Card className={`flex items-center justify-between active:opacity-70 ${s.active ? "" : "opacity-50"}`}>
                <div>
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-sm text-muted">{toFa(s.durationMin)} دقیقه</div>
                </div>
                <div>{formatMoney(s.price, unit)}</div>
              </Card>
            </button>
          ))}
        </div>
      )}
      <ServiceSheet key={open === null ? "closed" : open === "new" ? "new" : open.id} service={open} onClose={() => setOpen(null)} />
    </>
  );
}
