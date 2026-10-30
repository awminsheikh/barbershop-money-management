"use client";

import { useState } from "react";
import { Button, Card, Chip, Field, PageHeader, Segmented, Toggle, inputClass } from "@/components/ui";
import { exportBackup, importBackup } from "@/lib/backup";
import { formatDate, formatTime, normalizeDigits, toFa, WEEKDAYS } from "@/lib/date";
import { hashPin } from "@/lib/pin";
import { setSetting, useSettings } from "@/lib/settings";
import type { MessageChannel } from "@/lib/types";
import type { Unit } from "@/lib/money";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-4 space-y-4">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </Card>
  );
}

function PinSection() {
  const { pinHash } = useSettings();
  const [pin, setPin] = useState("");
  const valid = /^\d{4}$/.test(normalizeDigits(pin));

  return (
    <Section title="رمز ورود">
      <p className="text-sm text-muted">
        {pinHash ? "رمز ۴ رقمی فعال است. هر بار باز کردن برنامه رمز پرسیده می‌شود." : "با یک رمز ۴ رقمی، اطلاعات حساب شما محافظت می‌شود."}
      </p>
      <input
        className={inputClass}
        inputMode="numeric"
        maxLength={4}
        placeholder={pinHash ? "رمز جدید (۴ رقم)" : "رمز ۴ رقمی"}
        value={pin}
        onChange={(e) => setPin(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Button
          disabled={!valid}
          onClick={async () => {
            await setSetting("pinHash", await hashPin(normalizeDigits(pin)));
            sessionStorage.setItem("unlocked", "1");
            setPin("");
          }}
        >
          {pinHash ? "تغییر رمز" : "فعال‌سازی"}
        </Button>
        {pinHash && (
          <Button variant="danger" onClick={() => setSetting("pinHash", undefined)}>
            حذف رمز
          </Button>
        )}
      </div>
    </Section>
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
          <Field label="شروع">
            <input type="time" className={inputClass} value={s.workStart} onChange={(e) => e.target.value && setSetting("workStart", e.target.value)} />
          </Field>
          <Field label="پایان">
            <input type="time" className={inputClass} value={s.workEnd} onChange={(e) => e.target.value && setSetting("workEnd", e.target.value)} />
          </Field>
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
        <Field label="متن پیام">
          <textarea className={`${inputClass} py-2`} rows={3} value={s.template} onChange={(e) => setSetting("template", e.target.value)} />
        </Field>
        <p className="text-sm text-muted">از {"{name}"}، {"{date}"} و {"{time}"} برای نام، تاریخ و ساعت نوبت استفاده کنید.</p>
        {s.channel === "telegram" && (
          <p className="text-sm text-muted">در تلگرام، متن کپی می‌شود و فقط باید آن را در گفتگو بچسبانید.</p>
        )}
      </Section>

      <PinSection />
      <BackupSection />
    </>
  );
}
