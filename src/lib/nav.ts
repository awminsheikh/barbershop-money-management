// Where each page sits, for the breadcrumb. Top-level tabs have no parent; everything else hangs off one.
const PAGES: Record<string, { label: string; parent?: string; adminOnly?: boolean }> = {
  "/appointments/": { label: "نوبت‌ها" },
  "/sale/": { label: "فروش محصول" },
  "/customers/": { label: "مشتریان" },
  "/more/": { label: "بیشتر" },
  "/reports/": { label: "گزارش‌ها", parent: "/more/" },
  "/reports/services/": { label: "همه خدمات", parent: "/reports/" },
  "/reports/products/": { label: "همه فروش‌های محصول", parent: "/reports/" },
  "/insights/": { label: "تحلیل کسب‌وکار", parent: "/more/" },
  "/products/": { label: "محصولات و موجودی", parent: "/more/" },
  "/expenses/": { label: "هزینه‌ها", parent: "/more/" },
  "/profile/": { label: "پروفایل", parent: "/more/" },
  "/account/": { label: "حساب کاربری", parent: "/more/" },
  "/users/": { label: "مدیریت کاربران", parent: "/more/", adminOnly: true },
  "/settings/": { label: "تنظیمات", parent: "/more/" },
};

export function crumbsFor(path: string, isAdmin: boolean): { href: string; label: string }[] {
  // Admin-only pages look like they do not exist to anyone else.
  if (PAGES[path]?.adminOnly && !isAdmin) return [];
  const trail: { href: string; label: string }[] = [];
  let cur: string | undefined = path;
  while (cur && PAGES[cur]) {
    trail.unshift({ href: cur, label: PAGES[cur].label });
    cur = PAGES[cur].parent;
  }
  return trail;
}
