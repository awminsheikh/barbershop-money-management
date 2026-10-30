"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { crumbsFor } from "@/lib/nav";
import { Icon } from "./Icon";

// Where he is and a way back, at the top of the page content (not part of the header).
export function Breadcrumb({ path }: { path: string }) {
  const { user } = useAuth();
  const crumbs = crumbsFor(path, user.role === "admin");
  if (crumbs.length === 0) return null;
  return (
    <nav aria-label="مسیر" className="no-print mb-3 flex flex-wrap items-center gap-1 text-sm text-muted">
      <Link href="/" className="flex items-center gap-1 active:opacity-70">
        <Icon name="home" className="h-4 w-4" />
        خانه
      </Link>
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex items-center gap-1">
          <Icon name="chevron" className="h-3.5 w-3.5" />
          {i === crumbs.length - 1 ? (
            <span className="font-semibold text-ink" aria-current="page">
              {c.label}
            </span>
          ) : (
            <Link href={c.href} className="active:opacity-70">
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
