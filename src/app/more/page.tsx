"use client";

import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { Button, PageHeader } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

const ITEMS: { href: string; title: string; hint: string; icon: IconName }[] = [
  { href: "/profile/", title: "پروفایل و خدمات", hint: "اطلاعات آرایشگاه، خدمات و قیمت پیش‌فرض", icon: "user" },
  { href: "/reports/", title: "گزارش‌ها", hint: "درآمد، هزینه و سود؛ ابطال فروش", icon: "chart" },
  { href: "/insights/", title: "تحلیل کسب‌وکار", hint: "ساعت‌ها و روزهای شلوغ، بهترین مشتری‌ها", icon: "trend" },
  { href: "/products/", title: "محصولات و موجودی", hint: "فروش محصول، موجودی و هشدار کمبود", icon: "box" },
  { href: "/expenses/", title: "هزینه‌ها", hint: "ثبت و مدیریت هزینه‌ها و دسته‌ها", icon: "wallet" },
  { href: "/settings/", title: "تنظیمات", hint: "واحد پول، ساعت کاری، پیام، پشتیبان", icon: "sliders" },
  { href: "/account/", title: "حساب کاربری", hint: "تغییر نام کاربری و رمز، خروج", icon: "user" },
];

const ADMIN_ITEMS: typeof ITEMS = [
  { href: "/users/", title: "مدیریت کاربران", hint: "بازنشانی ورود صاحب آرایشگاه", icon: "users" },
];

export default function MorePage() {
  const { user, logout } = useAuth();
  const items = user.role === "admin" ? [...ITEMS, ...ADMIN_ITEMS] : ITEMS;
  return (
    <>
      <PageHeader title="بیشتر" />
      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className="flex items-center gap-3 border-b border-line p-4 last:border-0 active:bg-line/50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-accent">
              <Icon name={i.icon} className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{i.title}</span>
              <span className="block truncate text-sm text-muted">{i.hint}</span>
            </span>
            <Icon name="chevron" className="h-4 w-4 shrink-0 text-muted" />
          </Link>
        ))}
      </div>
      <Button variant="danger" className="mt-6 w-full" onClick={logout}>
        خروج از حساب
      </Button>
    </>
  );
}
