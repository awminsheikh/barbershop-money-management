"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { Button, Card, Empty, Field, PageHeader, Sheet, inputClass } from "@/components/ui";
import { db } from "@/lib/db";
import { formatDate, normalizeDigits, toFa } from "@/lib/date";
import { useCustomers } from "@/lib/hooks";
import { formatMoney } from "@/lib/money";
import { intlPhone } from "@/lib/messaging";
import { useSettings } from "@/lib/settings";
import { saleTotal, type Customer } from "@/lib/types";

function CustomerSheet({ customer, onClose }: { customer: Customer | "new" | null; onClose: () => void }) {
  const { unit } = useSettings();
  const existing = customer && customer !== "new" ? customer : null;
  const [name, setName] = useState(existing?.name ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");

  const sales = useLiveQuery(
    async () => (existing?.id ? db.sales.where("customerId").equals(existing.id).toArray() : []),
    [existing?.id],
  );
  const appointmentCount = useLiveQuery(
    async () => (existing?.id ? db.appointments.where("customerId").equals(existing.id).count() : 0),
    [existing?.id],
  );
  const live = (sales ?? []).filter((s) => !s.voided).sort((a, b) => b.date - a.date);
  const spent = live.reduce((t, s) => t + saleTotal(s), 0);

  const save = async () => {
    if (!name.trim()) return;
    const data = { name: name.trim(), phone: normalizeDigits(phone).trim() || undefined, notes: notes.trim() || undefined };
    if (existing?.id) await db.customers.update(existing.id, data);
    else await db.customers.add({ ...data, createdAt: Date.now() });
    onClose();
  };

  const canDelete = existing?.id && (sales?.length ?? 0) === 0 && (appointmentCount ?? 0) === 0;

  return (
    <Sheet open={customer !== null} title={existing ? "مشتری" : "مشتری جدید"} onClose={onClose}>
      <Field label="نام">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="شماره موبایل">
        <input
          className={inputClass}
          dir="ltr"
          style={{ textAlign: "right" }}
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </Field>
      <Field label="یادداشت (مثلاً مدل مو)">
        <textarea className={`${inputClass} py-2`} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <Button className="w-full" disabled={!name.trim()} onClick={save}>
        ذخیره
      </Button>

      {existing && (
        <>
          {existing.phone && (
            <div className="grid grid-cols-2 gap-3">
              <a href={`tel:+${intlPhone(existing.phone)}`} className="flex min-h-12 items-center justify-center rounded-xl border border-line bg-card font-semibold">
                تماس
              </a>
              <a href={`sms:+${intlPhone(existing.phone)}`} className="flex min-h-12 items-center justify-center rounded-xl border border-line bg-card font-semibold">
                پیامک
              </a>
            </div>
          )}
          <Card className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted">تعداد مراجعه</span>
              <span>{toFa(live.length)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">مجموع پرداخت</span>
              <span>{formatMoney(spent, unit)}</span>
            </div>
            {live.length > 0 && (
              <div className="border-t border-line pt-2 text-sm">
                {live.slice(0, 8).map((s) => (
                  <div key={s.id} className="flex justify-between py-1">
                    <span className="text-muted">{formatDate(s.date, false)}</span>
                    <span>{s.items.map((i) => i.name).join("، ")}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          {canDelete && (
            <Button
              variant="danger"
              className="w-full"
              onClick={async () => {
                if (confirm("این مشتری حذف شود؟")) {
                  await db.customers.delete(existing.id!);
                  onClose();
                }
              }}
            >
              حذف مشتری
            </Button>
          )}
        </>
      )}
    </Sheet>
  );
}

export default function CustomersPage() {
  const customers = useCustomers();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Customer | "new" | null>(null);

  const list = useMemo(() => {
    const q = normalizeDigits(query.trim());
    return customers
      .filter((c) => !q || c.name.includes(q) || normalizeDigits(c.phone ?? "").includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, "fa"));
  }, [customers, query]);

  return (
    <>
      <PageHeader title="مشتریان" action={<Button onClick={() => setOpen("new")}>+ جدید</Button>} />
      <input className={`${inputClass} mb-4`} placeholder="جستجوی نام یا شماره" value={query} onChange={(e) => setQuery(e.target.value)} />
      {list.length === 0 ? (
        <Empty>{customers.length === 0 ? "هنوز مشتری ثبت نشده است." : "نتیجه‌ای پیدا نشد."}</Empty>
      ) : (
        <div className="space-y-2">
          {list.map((c) => (
            <button key={c.id} type="button" className="block w-full text-start" onClick={() => setOpen(c)}>
              <Card className="flex items-center justify-between active:opacity-70">
                <span className="font-semibold">{c.name}</span>
                <span className="text-sm text-muted" dir="ltr">
                  {c.phone ? toFa(c.phone) : ""}
                </span>
              </Card>
            </button>
          ))}
        </div>
      )}
      <CustomerSheet key={open === null ? "closed" : open === "new" ? "new" : open.id} customer={open} onClose={() => setOpen(null)} />
    </>
  );
}
