"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { ServicesManager } from "@/components/ServicesManager";
import { Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { setSetting, useSettings, type Settings } from "@/lib/settings";

type Info = Pick<Settings, "shopName" | "ownerName" | "shopPhone" | "shopAddress">;

function ShopInfo({ initial }: { initial: Info }) {
  const [info, setInfo] = useState(initial);
  const [saved, setSaved] = useState(false);
  const set = (key: keyof Info) => (value: string) => {
    setInfo((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    for (const key of Object.keys(info) as (keyof Info)[]) await setSetting(key, info[key].trim());
    setSaved(true);
  };

  return (
    <Card className="mb-6 space-y-4">
      <div className="flex items-center gap-3">
        <Logo className="h-14 w-auto shrink-0" />
        <div className="min-w-0">
          <div className="truncate text-lg font-bold">{info.shopName.trim() || "الماس"}</div>
          <div className="truncate text-sm text-muted">{info.ownerName.trim() || "نام صاحب آرایشگاه را وارد کنید"}</div>
        </div>
      </div>
      <Field label="نام آرایشگاه">
        <input className={inputClass} value={info.shopName} onChange={(e) => set("shopName")(e.target.value)} />
      </Field>
      <Field label="نام صاحب آرایشگاه">
        <input className={inputClass} value={info.ownerName} onChange={(e) => set("ownerName")(e.target.value)} />
      </Field>
      <Field label="تلفن">
        <input
          className={inputClass}
          dir="ltr"
          style={{ textAlign: "right" }}
          inputMode="tel"
          value={info.shopPhone}
          onChange={(e) => set("shopPhone")(e.target.value)}
        />
      </Field>
      <Field label="آدرس">
        <textarea className={`${inputClass} py-2`} rows={2} value={info.shopAddress} onChange={(e) => set("shopAddress")(e.target.value)} />
      </Field>
      <Button className="w-full" onClick={save}>
        {saved ? "ذخیره شد" : "ذخیره"}
      </Button>
    </Card>
  );
}

const LINKS: { href: string; title: string; icon: IconName }[] = [
  { href: "/products/", title: "محصولات و موجودی", icon: "box" },
  { href: "/expenses/", title: "دسته‌ها و هزینه‌های ثابت", icon: "wallet" },
  { href: "/settings/", title: "تنظیمات و پشتیبان", icon: "sliders" },
];

export default function ProfilePage() {
  const s = useSettings();
  return (
    <>
      <PageHeader title="پروفایل" />
      {s.ready && (
        <ShopInfo
          initial={{ shopName: s.shopName, ownerName: s.ownerName, shopPhone: s.shopPhone, shopAddress: s.shopAddress }}
        />
      )}
      <div className="mb-6">
        <ServicesManager />
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center gap-3 border-b border-line p-4 last:border-0 active:bg-line/50"
          >
            <Icon name={l.icon} className="h-5 w-5 shrink-0 text-accent" />
            <span className="flex-1">{l.title}</span>
            <Icon name="chevron" className="h-4 w-4 shrink-0 text-muted" />
          </Link>
        ))}
      </div>
    </>
  );
}
