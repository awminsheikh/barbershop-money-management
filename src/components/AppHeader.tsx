"use client";

import Link from "next/link";
import { formatDate } from "@/lib/date";
import { useSettings } from "@/lib/settings";
import { Icon } from "./Icon";
import { Logo } from "./Logo";

// Sticky top bar on every page: shop, quick "+ نوبت" and profile.
export function AppHeader({ onAdd }: { onAdd: () => void }) {
  const { shopName } = useSettings();
  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-bg/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-2">
        <Link href="/" className="flex min-w-0 flex-1 items-center gap-2.5" aria-label="صفحه اصلی">
          <Logo className="h-10 w-auto shrink-0" />
          <span className="min-w-0">
            <span className="block truncate font-bold leading-tight">{shopName || "الماس"}</span>
            <span className="block truncate text-xs text-muted">{formatDate(new Date())}</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={onAdd}
          className="flex h-11 shrink-0 items-center gap-1 rounded-full bg-brand px-4 font-semibold text-brand-ink active:opacity-70"
        >
          <Icon name="plus" className="h-5 w-5" />
          نوبت
        </button>
        <Link
          href="/profile/"
          aria-label="پروفایل"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-card text-accent active:opacity-70"
        >
          <Icon name="user" className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
