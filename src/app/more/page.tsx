import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";

const ITEMS = [
  { href: "/reports/", title: "گزارش‌ها", hint: "درآمد، هزینه و سود؛ ابطال فروش" },
  { href: "/products/", title: "محصولات و موجودی", hint: "فروش محصول، موجودی و هشدار کمبود" },
  { href: "/expenses/", title: "هزینه‌ها", hint: "ثبت و مدیریت هزینه‌ها و دسته‌ها" },
  { href: "/services/", title: "خدمات و قیمت‌ها", hint: "فهرست خدمات، قیمت و مدت" },
  { href: "/settings/", title: "تنظیمات", hint: "واحد پول، ساعت کاری، پیام، رمز، پشتیبان" },
];

export default function MorePage() {
  return (
    <>
      <PageHeader title="بیشتر" />
      <div className="space-y-3">
        {ITEMS.map((i) => (
          <Link key={i.href} href={i.href} className="block">
            <Card className="active:opacity-70">
              <div className="font-semibold">{i.title}</div>
              <div className="text-sm text-muted">{i.hint}</div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
