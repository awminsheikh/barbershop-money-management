"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AuthContext } from "@/lib/auth-context";
import { clearSession, ensureDemoUsers, hasBuildAccounts, readSession, saveSession, seedBuildAccounts } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateRecurring } from "@/lib/recurring";
import { loadDemoData } from "@/lib/seed";
import { useSettings } from "@/lib/settings";
import { AddServiceSheet } from "./AddServiceSheet";
import { AppHeader } from "./AppHeader";
import { LoginScreen, SetupScreen } from "./AuthScreens";
import { Breadcrumb } from "./Breadcrumb";
import { Icon, type IconName } from "./Icon";
import { Logo } from "./Logo";

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
  const scroller = useRef<HTMLDivElement>(null);
  // The logo stays up at least this long so a fast start shows it instead of flashing.
  const [splashDone, setSplashDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), 700);
    return () => clearTimeout(t);
  }, []);
  const [userId, setUserId] = useState<number | null>(readSession);
  const userCount = useLiveQuery(() => db.users.count(), []);
  // null = no such account any more (removed or reset), undefined = still loading.
  const user = useLiveQuery(async () => (userId === null ? null : ((await db.users.get(userId)) ?? null)), [userId]);

  useEffect(() => {
    // Ask the browser not to evict his data when storage is tight.
    navigator.storage?.persist?.().catch(() => {});
    // The accounts that came with the build; a phone that has none yet gets them silently.
    if (hasBuildAccounts()) seedBuildAccounts();
    // Development only: the first time a browser opens the app it gets sample data. A flag in localStorage
    // (which "wipe everything" leaves alone) keeps it from coming back after he deletes it.
    if (process.env.NODE_ENV !== "production") {
      if (!localStorage.getItem("demoSeeded")) {
        localStorage.setItem("demoSeeded", "1");
        loadDemoData();
      }
      // Development accounts: admin / admin123 and owner / owner123.
      if (!hasBuildAccounts() && !localStorage.getItem("demoUsers")) {
        localStorage.setItem("demoUsers", "1");
        ensureDemoUsers();
      }
    }
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register(`${basePath}/sw.js`, { scope: `${basePath}/` }).catch(() => {});
    }
  }, []);

  // iPhone home-screen apps can be given a window one status-bar short at launch (the layout height stops above the
  // bottom of the screen and the tab bar floats). There the screen height is the truth, so the frame uses it.
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const ios = (navigator as Navigator & { standalone?: boolean }).standalone === true;
      const portrait = window.matchMedia("(orientation: portrait)").matches;
      if (ios && portrait && screen.height > window.innerHeight) root.style.setProperty("--app-h", `${screen.height}px`);
      else root.style.removeProperty("--app-h");
    };
    apply();
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    return () => {
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
    };
  }, []);

  // The page scrolls inside the frame, so a new page has to be scrolled back to the top by hand.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [pathname]);

  const signedIn = !!user;
  useEffect(() => {
    if (signedIn) generateRecurring().catch(() => {});
  }, [signedIn]);

  const developing = process.env.NODE_ENV !== "production";
  const waitingForAccounts =
    userCount === 0 &&
    typeof window !== "undefined" &&
    (hasBuildAccounts() || (developing && !localStorage.getItem("demoUsers")));
  if (!splashDone || !settings.ready || userCount === undefined || user === undefined || waitingForAccounts) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-bg" role="status" aria-label="در حال بارگذاری">
        <Logo className="h-28 w-auto animate-pulse" />
      </div>
    );
  }
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
      {/* Header, page and tab bar are three rows of one full-screen column. Only the middle row scrolls, so the
          bars never move with the page (no sticky/fixed bars to drift when the phone's browser bars change). */}
      <div className="app-frame fixed inset-x-0 top-0 flex flex-col" style={{ height: "var(--app-h, 100%)" }}>
        <AppHeader onAdd={() => setAdding(true)} />
        <div id="app-scroll" ref={scroller} className="app-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <main className="mx-auto w-full max-w-xl px-4 pt-4 pb-8">
            <Breadcrumb path={path} />
            {children}
          </main>
        </div>
        <nav className="shrink-0 border-t border-line bg-card pb-[env(safe-area-inset-bottom)]">
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
      </div>
      <AddServiceSheet open={adding} onClose={() => setAdding(false)} />
    </AuthContext>
  );
}
