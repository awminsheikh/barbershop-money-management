"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { Button, Card, Empty, Field, PageHeader, Segmented, Sheet, Toggle, inputClass } from "@/components/ui";
import { db } from "@/lib/db";
import { daysSince, loyaltyEligible } from "@/lib/crm";
import { formatDate, JALALI_MONTHS, normalizeDigits, toFa } from "@/lib/date";
import { useCustomers, useCustomerStats } from "@/lib/hooks";
import { formatMoney } from "@/lib/money";
import { fillTemplate, intlPhone, sendMessage } from "@/lib/messaging";
import { useSettings } from "@/lib/settings";
import { saleTotal, type Customer } from "@/lib/types";

function CustomerSheet({ customer, onClose }: { customer: Customer | "new" | null; onClose: () => void }) {
  const { unit, loyaltyEnabled, loyaltyEvery } = useSettings();
  const stats = useCustomerStats();
  const existing = customer && customer !== "new" ? customer : null;
  const [name, setName] = useState(existing?.name ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [vip, setVip] = useState(existing?.vip ?? false);
  const [bMonth, setBMonth] = useState(existing?.birthday?.month ?? 0);
  const [bDay, setBDay] = useState(existing?.birthday?.day ?? 0);

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
  const mine = existing?.id !== undefined ? stats.get(existing.id) : undefined;

  const save = async () => {
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      phone: normalizeDigits(phone).trim() || undefined,
      notes: notes.trim() || undefined,
      vip: vip || undefined,
      birthday: bMonth > 0 && bDay > 0 ? { month: bMonth, day: bDay } : undefined,
    };
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
      <Field label="تاریخ تولد (اختیاری)">
        <div className="grid grid-cols-2 gap-3">
          <select className={inputClass} value={bMonth} onChange={(e) => setBMonth(Number(e.target.value))}>
            <option value={0}>ماه</option>
            {JALALI_MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <input
            className={inputClass}
            inputMode="numeric"
            placeholder="روز"
            value={bDay ? toFa(bDay) : ""}
            onChange={(e) => setBDay(Math.min(31, Number(normalizeDigits(e.target.value).replace(/\D/g, "")) || 0))}
          />
        </div>
      </Field>
      <Field label="یادداشت (مثلاً مدل مو)">
        <textarea className={`${inputClass} py-2`} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <Toggle checked={vip} onChange={setVip} label="مشتری ویژه (VIP)" />
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
            {loyaltyEnabled && (
              <div className="flex justify-between">
                <span className="text-muted">باشگاه مشتریان</span>
                <span className={loyaltyEligible(mine, loyaltyEvery) ? "font-semibold text-accent" : ""}>
                  {loyaltyEligible(mine, loyaltyEvery)
                    ? "خدمت رایگان آماده است"
                    : `${toFa(mine?.loyaltyCount ?? 0)} از ${toFa(loyaltyEvery)}`}
                </span>
              </div>
            )}
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

type Filter = "all" | "away" | "vip";

export default function CustomersPage() {
  const settings = useSettings();
  const customers = useCustomers();
  const stats = useCustomerStats();
  const [now] = useState(() => Date.now());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<Customer | "new" | null>(null);

  const list = useMemo(() => {
    const q = normalizeDigits(query.trim());
    return customers
      .filter((c) => !q || c.name.includes(q) || normalizeDigits(c.phone ?? "").includes(q))
      .filter((c) => {
        if (filter === "vip") return c.vip;
        if (filter === "away") {
          const last = stats.get(c.id as number)?.lastVisit;
          return last !== undefined && daysSince(last, now) >= settings.inactiveDays;
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name, "fa"));
  }, [customers, query, filter, stats, now, settings.inactiveDays]);

  return (
    <>
      <PageHeader title="مشتریان" action={<Button onClick={() => setOpen("new")}>+ جدید</Button>} />
      <input className={`${inputClass} mb-3`} placeholder="جستجوی نام یا شماره" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="mb-4">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "همه" },
            { value: "away", label: `غایب (${toFa(settings.inactiveDays)}+ روز)` },
            { value: "vip", label: "ویژه" },
          ]}
        />
      </div>
      {list.length === 0 ? (
        <Empty>{customers.length === 0 ? "هنوز مشتری ثبت نشده است." : "موردی پیدا نشد."}</Empty>
      ) : (
        <div className="space-y-2">
          {list.map((c) => {
            const last = stats.get(c.id as number)?.lastVisit;
            return (
              <Card key={c.id} className="flex items-center justify-between gap-2">
                <button type="button" className="min-w-0 flex-1 text-start" onClick={() => setOpen(c)}>
                  <div className="truncate font-semibold">
                    {c.vip ? "⭐ " : ""}
                    {c.name}
                  </div>
                  <div className="text-sm text-muted">
                    {last !== undefined ? `${toFa(daysSince(last, now))} روز از آخرین مراجعه` : "هنوز مراجعه نداشته"}
                  </div>
                </button>
                {filter === "away" && c.phone && (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      sendMessage(settings.channel, c.phone!, fillTemplate(settings.templateComeback, { name: c.name }))
                    }
                  >
                    پیام
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
      <CustomerSheet key={open === null ? "closed" : open === "new" ? "new" : open.id} customer={open} onClose={() => setOpen(null)} />
    </>
  );
}
