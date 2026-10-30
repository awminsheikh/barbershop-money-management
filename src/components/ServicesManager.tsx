"use client";

import { useState } from "react";
import { db } from "@/lib/db";
import { toFa } from "@/lib/date";
import { useServices } from "@/lib/hooks";
import { formatMoney } from "@/lib/money";
import { useSettings } from "@/lib/settings";
import type { Service } from "@/lib/types";
import { AmountInput } from "./AmountInput";
import { Button, Card, Empty, Field, Sheet, Toggle, inputClass } from "./ui";

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
      <Field label="قیمت پیش‌فرض">
        <AmountInput value={price} onChange={setPrice} />
      </Field>
      <p className="-mt-2 text-sm text-muted">
        هنگام ثبت فروش همین قیمت خودکار زده می‌شود. اگر مشتری قیمت دیگری پرداخت کرد، همان لحظه فقط برای همان فروش تغییرش می‌دهید.
      </p>
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

// Service list with default prices; used on the profile page.
export function ServicesManager() {
  const { unit } = useSettings();
  const services = useServices();
  const [open, setOpen] = useState<Service | "new" | null>(null);
  const missingPrice = services.some((s) => s.active && s.price === 0);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-semibold">خدمات و قیمت پیش‌فرض</h2>
        <Button className="min-h-10" onClick={() => setOpen("new")}>
          + خدمت جدید
        </Button>
      </div>
      {missingPrice && (
        <div className="mb-3 rounded-xl border border-brand bg-brand-soft p-3 text-sm">
          قیمت بعضی خدمات هنوز صفر است. برای هر خدمت قیمت پیش‌فرض خودتان را وارد کنید.
        </div>
      )}
      {services.length === 0 ? (
        <Empty>خدمتی ثبت نشده است.</Empty>
      ) : (
        <div className="space-y-2">
          {services.map((s) => (
            <button key={s.id} type="button" className="block w-full text-start" onClick={() => setOpen(s)}>
              <Card className={`flex items-center justify-between gap-3 active:opacity-70 ${s.active ? "" : "opacity-50"}`}>
                <div className="min-w-0">
                  <div className="truncate font-semibold">{s.name}</div>
                  <div className="text-sm text-muted">
                    {toFa(s.durationMin)} دقیقه{s.active ? "" : " · غیرفعال"}
                  </div>
                </div>
                <div className="shrink-0 font-semibold text-accent">{s.price ? formatMoney(s.price, unit) : "قیمت وارد نشده"}</div>
              </Card>
            </button>
          ))}
        </div>
      )}
      <ServiceSheet key={open === null ? "closed" : open === "new" ? "new" : open.id} service={open} onClose={() => setOpen(null)} />
    </section>
  );
}
