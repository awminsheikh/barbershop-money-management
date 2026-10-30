"use client";

import { useState } from "react";
import { Button, Card, Chip, Field, PageHeader, Segmented, Toggle, inputClass } from "@/components/ui";
import { exportBackup, importBackup } from "@/lib/backup";
import { formatDate, formatTime, normalizeDigits, toFa, WEEKDAYS } from "@/lib/date";
import { loadDemoData, resetAllData } from "@/lib/seed";
import { setSetting, useSettings } from "@/lib/settings";
import type { MessageChannel } from "@/lib/types";
import type { Unit } from "@/lib/money";

const pad = (n: number) => String(n).padStart(2, "0");

// Two selects instead of <input type="time">: iOS sizes that input by its content and spills it out of its column.
function TimeSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [h, m] = value.split(":").map(Number);
  const minutes = [...new Set([...Array.from({ length: 12 }, (_, i) => i * 5), m])].sort((a, b) => a - b);
  const select = `${inputClass} min-w-0 flex-1 appearance-none px-1 text-center`;
  return (
    <div className="min-w-0">
      <div className="mb-1 text-sm text-muted">{label}</div>
      {/* ltr so it reads 09:00 like a clock, hours on the left. */}
      <div dir="ltr" className="flex items-center gap-1">
        <select className={select} aria-label={`${label}، ساعت`} value={h} onChange={(e) => onChange(`${pad(Number(e.target.value))}:${pad(m)}`)}>
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i} value={i}>
              {toFa(pad(i))}
            </option>
          ))}
        </select>
        <span className="text-muted">:</span>
        <select className={select} aria-label={`${label}، دقیقه`} value={m} onChange={(e) => onChange(`${pad(h)}:${pad(Number(e.target.value))}`)}>
          {minutes.map((n) => (
            <option key={n} value={n}>
              {toFa(pad(n))}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-4 space-y-4">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </Card>
  );
}

function BackupSection() {
  const { lastBackupAt } = useSettings();
  const [message, setMessage] = useState("");

  return (
    <Section title="پشتیبان‌گیری">
      <p className="text-sm text-muted">
        اطلاعات فقط روی همین گوشی ذخیره می‌شود. هفته‌ای یک بار پشتیبان بگیرید و فایل را در Files یا iCloud Drive نگه دارید.
      </p>
      <p className="text-sm">
        آخرین پشتیبان: {lastBackupAt ? `${formatDate(lastBackupAt, false)} ${formatTime(lastBackupAt)}` : "هنوز گرفته نشده"}
      </p>
      <Button className="w-full" onClick={exportBackup}>
        گرفتن پشتیبان
      </Button>
      <label className="flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl border border-line bg-card font-semibold">
        بازیابی از فایل پشتیبان
        <input
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (!confirm("تمام اطلاعات فعلی با فایل پشتیبان جایگزین می‌شود. ادامه می‌دهید؟")) return;
            try {
              await importBackup(await file.text());
              setMessage("اطلاعات با موفقیت بازیابی شد.");
            } catch (err) {
              setMessage((err as Error).message || "بازیابی انجام نشد.");
            }
          }}
        />
      </label>
      {message && <p className="text-sm">{message}</p>}
    </Section>
  );
}

function DemoSection() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (confirmText: string, action: () => Promise<string>) => {
    if (busy || !confirm(confirmText)) return;
    setBusy(true);
    try {
      setMessage(await action());
    } catch {
      setMessage("انجام نشد.");
    }
    setBusy(false);
  };

  return (
    <Section title="داده‌های نمونه">
      <p className="text-sm text-muted">
        برای امتحان کردن برنامه: مشتری، نوبت، فروش و هزینه‌ی چند ماه اخیر را به‌صورت نمونه می‌سازد. مالیات را از بخش بالا
        روشن کنید تا در فروش‌های جدید هم امتحان شود.
      </p>
      <Button
        variant="secondary"
        className="w-full"
        disabled={busy}
        onClick={() =>
          run("تمام اطلاعات فعلی پاک و با داده‌های نمونه جایگزین می‌شود. ادامه می‌دهید؟", async () => {
            const r = await loadDemoData();
            return `${toFa(r.customers)} مشتری، ${toFa(r.sales)} فروش، ${toFa(r.expenses)} هزینه و ${toFa(r.appointments)} نوبت ساخته شد.`;
          })
        }
      >
        بارگذاری داده‌های نمونه
      </Button>
      <Button
        variant="danger"
        className="w-full"
        disabled={busy}
        onClick={() =>
          run("تمام مشتری‌ها، فروش‌ها و هزینه‌ها برای همیشه پاک می‌شود. ادامه می‌دهید؟", async () => {
            await resetAllData();
            return "همه اطلاعات پاک شد.";
          })
        }
      >
        پاک کردن همه اطلاعات
      </Button>
      {message && <p className="text-sm">{message}</p>}
    </Section>
  );
}

export default function SettingsPage() {
  const s = useSettings();

  const toggleDay = (i: number) => {
    const next = s.workDays.includes(i) ? s.workDays.filter((d) => d !== i) : [...s.workDays, i];
    setSetting("workDays", next.sort((a, b) => a - b));
  };

  return (
    <>
      <PageHeader title="تنظیمات" />

      <Section title="واحد پول">
        <Segmented<Unit>
          value={s.unit}
          onChange={(v) => setSetting("unit", v)}
          options={[
            { value: "toman", label: "تومان" },
            { value: "rial", label: "ریال" },
          ]}
        />
        <p className="text-sm text-muted">فقط نحوه نمایش و ورود مبلغ‌ها عوض می‌شود؛ اطلاعات ثبت‌شده تغییر نمی‌کند.</p>
      </Section>

      <Section title="ساعت و روزهای کاری">
        <div className="grid grid-cols-2 gap-3">
          <TimeSelect label="شروع" value={s.workStart} onChange={(v) => setSetting("workStart", v)} />
          <TimeSelect label="پایان" value={s.workEnd} onChange={(v) => setSetting("workEnd", v)} />
        </div>
        <div>
          <div className="mb-1 text-sm text-muted">روزهای کاری</div>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((name, i) => (
              <Chip key={name} active={s.workDays.includes(i)} onClick={() => toggleDay(i)}>
                {name}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 text-sm text-muted">فاصله بین نوبت‌ها (دقیقه)</div>
          <Segmented
            value={String(s.slotMinutes)}
            onChange={(v) => setSetting("slotMinutes", Number(v))}
            options={["15", "30", "45", "60"].map((v) => ({ value: v, label: v.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]) }))}
          />
        </div>
      </Section>

      <Section title="نوبت‌دهی">
        <Toggle checked={s.depositEnabled} onChange={(v) => setSetting("depositEnabled", v)} label="ثبت بیعانه برای نوبت" />
      </Section>

      <Section title="مالیات بر ارزش افزوده">
        <Toggle checked={s.vatEnabled} onChange={(v) => setSetting("vatEnabled", v)} label="افزودن مالیات به فروش‌ها" />
        {s.vatEnabled && (
          <Field label="درصد مالیات">
            <input
              className={inputClass}
              inputMode="numeric"
              value={toFa(s.vatPercent)}
              onChange={(e) =>
                setSetting("vatPercent", Math.min(100, Number(normalizeDigits(e.target.value).replace(/\D/g, "")) || 0))
              }
            />
          </Field>
        )}
        <p className="text-sm text-muted">
          با فعال بودن، مالیات روی هر فروش (بعد از تخفیف) اضافه و در گزارش جدا نشان داده می‌شود و جزو درآمد حساب نمی‌شود.
        </p>
      </Section>

      <Section title="باشگاه مشتریان">
        <Toggle checked={s.loyaltyEnabled} onChange={(v) => setSetting("loyaltyEnabled", v)} label="خدمت رایگان بعد از چند مراجعه" />
        {s.loyaltyEnabled && (
          <Field label="تعداد مراجعه برای یک خدمت رایگان">
            <input
              className={inputClass}
              inputMode="numeric"
              value={toFa(s.loyaltyEvery)}
              onChange={(e) => setSetting("loyaltyEvery", Math.max(1, Number(normalizeDigits(e.target.value).replace(/\D/g, "")) || 1))}
            />
          </Field>
        )}
        <Field label="مشتری غایب: بیش از چند روز بدون مراجعه">
          <input
            className={inputClass}
            inputMode="numeric"
            value={toFa(s.inactiveDays)}
            onChange={(e) => setSetting("inactiveDays", Math.max(1, Number(normalizeDigits(e.target.value).replace(/\D/g, "")) || 1))}
          />
        </Field>
      </Section>

      <Section title="پیام یادآوری به مشتری">
        <Segmented<MessageChannel>
          value={s.channel}
          onChange={(v) => setSetting("channel", v)}
          options={[
            { value: "sms", label: "پیامک" },
            { value: "telegram", label: "تلگرام" },
            { value: "whatsapp", label: "واتس‌اپ" },
          ]}
        />
        <Field label="متن یادآوری نوبت">
          <textarea className={`${inputClass} py-2`} rows={3} value={s.template} onChange={(e) => setSetting("template", e.target.value)} />
        </Field>
        <Field label="متن تبریک تولد">
          <textarea className={`${inputClass} py-2`} rows={2} value={s.templateBirthday} onChange={(e) => setSetting("templateBirthday", e.target.value)} />
        </Field>
        <Field label="متن دعوت مشتریان غایب">
          <textarea className={`${inputClass} py-2`} rows={2} value={s.templateComeback} onChange={(e) => setSetting("templateComeback", e.target.value)} />
        </Field>
        <p className="text-sm text-muted">در متن‌ها از {"{name}"} برای نام مشتری، و در یادآوری نوبت از {"{date}"} و {"{time}"} برای تاریخ و ساعت استفاده کنید.</p>
        {s.channel === "telegram" && (
          <p className="text-sm text-muted">در تلگرام، متن کپی می‌شود و فقط باید آن را در گفتگو بچسبانید.</p>
        )}
      </Section>

      <BackupSection />
      <DemoSection />
    </>
  );
}
