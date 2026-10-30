"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AuthContext } from "@/lib/auth-context";
import { clearSession, ensureDemoUsers, readSession, saveSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateRecurring } from "@/lib/recurring";
import { loadDemoData } from "@/lib/seed";
import { useSettings } from "@/lib/settings";
import { AddServiceSheet } from "./AddServiceSheet";
import { AppHeader } from "./AppHeader";
import { LoginScreen, SetupScreen } from "./AuthScreens";
import { Breadcrumb } from "./Breadcrumb";
import { Icon, type IconName } from "./Icon";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "امروز", icon: "home" },
  { href: "/appointments/", label: "نوبت‌ها", icon: "calendar" },
  { href: "/sale/", label: "فروش محصول", icon: "box" },
  { href: "/customers/", label: "مشتریان", icon: "users" },
  { href: "/more/", label: "بیشتر", icon: "grid" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const settings = useSettings();
  const [adding, setAdding] = useState(false);
  const [userId, setUserId] = useState<number | null>(readSession);
  const userCount = useLiveQuery(() => db.users.count(), []);
  // null = no such account any more (removed or reset), undefined = still loading.
  const user = useLiveQuery(async () => (userId === null ? null : ((await db.users.get(userId)) ?? null)), [userId]);

  useEffect(() => {
    // Ask the browser not to evict his data when storage is tight.
    navigator.storage?.persist?.().catch(() => {});
    // Development only: the first time a browser opens the app it gets sample data. A flag in localStorage
    // (which "wipe everything" leaves alone) keeps it from coming back after he deletes it.
    if (process.env.NODE_ENV !== "production") {
      if (!localStorage.getItem("demoSeeded")) {
        localStorage.setItem("demoSeeded", "1");
        loadDemoData();
      }
      // Development accounts: admin / admin123 and owner / owner123.
      if (!localStorage.getItem("demoUsers")) {
        localStorage.setItem("demoUsers", "1");
        ensureDemoUsers();
      }
    }
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register(`${basePath}/sw.js`, { scope: `${basePath}/` }).catch(() => {});
    }
  }, []);

  const signedIn = !!user;
  useEffect(() => {
    if (signedIn) generateRecurring().catch(() => {});
  }, [signedIn]);

  const developing = process.env.NODE_ENV !== "production";
  const waitingForDemoUsers = developing && userCount === 0 && typeof window !== "undefined" && !localStorage.getItem("demoUsers");
  if (!settings.ready || userCount === undefined || user === undefined || waitingForDemoUsers) return <div className="min-h-dvh" />;
  if (userCount === 0) return <SetupScreen />;
  if (!user) {
    return (
      <LoginScreen
        onLogin={(u, remember) => {
          saveSession(u.id as number, remember);
          setUserId(u.id as number);
        }}
      />
    );
  }

  const logout = () => {
    clearSession();
    setUserId(null);
  };

  const path = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return (
    <AuthContext value={{ user, logout }}>
      <AppHeader onAdd={() => setAdding(true)} />
      <main className="mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-xl px-4 pt-4 pb-28">
        <Breadcrumb path={path} />
        {children}
      </main>
      <AddServiceSheet open={adding} onClose={() => setAdding(false)} />
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
                  <span
                    className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                      active ? "bg-accent/15" : ""
                    }`}
                  >
                    <Icon name={n.icon} className="h-6 w-6" />
                  </span>
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </AuthContext>
  );
}
