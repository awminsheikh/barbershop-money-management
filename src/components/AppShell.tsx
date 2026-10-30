"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { generateRecurring } from "@/lib/recurring";
import { hashPin } from "@/lib/pin";
import { useSettings } from "@/lib/settings";
import { toFa } from "@/lib/date";
import { Logo } from "./Logo";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const NAV = [
  { href: "/", label: "امروز", icon: "🏠" },
  { href: "/appointments/", label: "نوبت‌ها", icon: "📅" },
  { href: "/sale/", label: "فروش", icon: "✂️" },
  { href: "/customers/", label: "مشتریان", icon: "👥" },
  { href: "/more/", label: "بیشتر", icon: "☰" },
];

function PinScreen({ pinHash, onUnlock }: { pinHash: string; onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const press = async (d: string) => {
    const next = (pin + d).slice(0, 4);
    setPin(next);
    setError(false);
    if (next.length === 4) {
      if ((await hashPin(next)) === pinHash) {
        sessionStorage.setItem("unlocked", "1");
        onUnlock();
      } else {
        setError(true);
        setPin("");
      }
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <Logo className="h-28 w-auto" />
      <h1 className="text-xl font-bold">رمز ورود را وارد کنید</h1>
      <div className="flex gap-3" aria-label="رمز">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-4 w-4 rounded-full border border-brand ${i < pin.length ? "bg-brand" : ""}`} />
        ))}
      </div>
      <p className={`h-5 text-sm text-bad ${error ? "" : "invisible"}`}>رمز اشتباه است</p>
      <div className="grid grid-cols-3 gap-3" dir="ltr">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((d) =>
          d === "" ? (
            <span key="blank" />
          ) : (
            <button
              key={d}
              type="button"
              className="h-16 w-16 rounded-full border border-line bg-card text-xl active:opacity-60"
              onClick={() => (d === "⌫" ? setPin(pin.slice(0, -1)) : press(d))}
            >
              {d === "⌫" ? d : toFa(d)}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const settings = useSettings();
  const [unlocked, setUnlocked] = useState(() => typeof window !== "undefined" && sessionStorage.getItem("unlocked") === "1");

  useEffect(() => {
    // Ask the browser not to evict his data when storage is tight.
    navigator.storage?.persist?.().catch(() => {});
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register(`${basePath}/sw.js`, { scope: `${basePath}/` }).catch(() => {});
    }
  }, []);

  const locked = !settings.ready || (!!settings.pinHash && !unlocked);
  useEffect(() => {
    if (!locked) generateRecurring().catch(() => {});
  }, [locked]);

  if (!settings.ready) return <div className="min-h-dvh" />;
  if (settings.pinHash && !unlocked) {
    return <PinScreen pinHash={settings.pinHash} onUnlock={() => setUnlocked(true)} />;
  }

  const path = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return (
    <>
      <main className="mx-auto min-h-dvh w-full max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-28">
        {children}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto flex max-w-xl">
          {NAV.map((n) => {
            const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
            return (
              <li key={n.href} className="flex-1">
                <Link
                  href={n.href}
                  className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs ${
                    active ? "font-bold text-accent" : "text-muted"
                  }`}
                >
                  <span className="text-xl leading-none">{n.icon}</span>
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
