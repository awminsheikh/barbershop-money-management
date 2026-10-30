"use client";

import Link from "next/link";
import { formatDate, formatTime, toFa } from "@/lib/date";
import { formatMoney, type Unit } from "@/lib/money";
import { voidSale } from "@/lib/repo";
import { METHOD_LABEL, saleSubtotal, saleTotal, type Sale } from "@/lib/types";
import { Button, Card } from "./ui";

// One sale or service use. With `href` the whole card is a link (reports); with `expanded` it shows the details
// and the void button (the full lists).
export function SaleCard({
  sale,
  customer,
  unit,
  href,
  expanded,
  onToggle,
}: {
  sale: Sale;
  customer?: string;
  unit: Unit;
  href?: string;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const head = (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className={`truncate font-semibold ${sale.voided ? "line-through" : ""}`}>{customer ?? "بدون نام"}</div>
        <div className="truncate text-sm text-muted">
          {formatDate(sale.date, false)} · {formatTime(sale.date)} · {METHOD_LABEL[sale.method]}
        </div>
        <div className="truncate text-sm text-muted">{sale.items.map((i) => i.name).join("، ")}</div>
      </div>
      <div className={`shrink-0 ${sale.voided ? "line-through" : "font-bold"}`}>{formatMoney(saleTotal(sale), unit)}</div>
    </div>
  );

  const card = (
    <Card className={`${sale.voided ? "opacity-60" : ""}`}>
      {onToggle ? (
        <button type="button" className="block w-full text-start active:opacity-70" onClick={onToggle}>
          {head}
        </button>
      ) : (
        head
      )}
      {sale.voided && <div className="mt-1 text-sm text-bad">باطل شده</div>}
      {expanded && (
        <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
          {sale.items.map((i, idx) => (
            <div key={idx} className="flex justify-between gap-2">
              <span>
                {i.name}
                {i.qty > 1 && <span className="text-muted"> × {toFa(i.qty)}</span>}
              </span>
              <span>{formatMoney(i.price * i.qty, unit)}</span>
            </div>
          ))}
          <div className="space-y-1 pt-1 text-muted">
            {sale.discount > 0 && (
              <div className="flex justify-between">
                <span>تخفیف</span>
                <span>{formatMoney(sale.discount, unit)}</span>
              </div>
            )}
            {(sale.vat ?? 0) > 0 && (
              <div className="flex justify-between">
                <span>مالیات</span>
                <span>{formatMoney(sale.vat ?? 0, unit)}</span>
              </div>
            )}
            {sale.tip > 0 && (
              <div className="flex justify-between">
                <span>انعام</span>
                <span>{formatMoney(sale.tip, unit)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>جمع اقلام</span>
              <span>{formatMoney(saleSubtotal(sale), unit)}</span>
            </div>
          </div>
          {!sale.voided && (
            <Button
              variant="ghost"
              className="no-print mt-1 w-full text-bad"
              onClick={() => {
                if (confirm("این مورد باطل شود؟ در حساب‌ها حساب نمی‌شود.")) voidSale(sale.id!);
              }}
            >
              ابطال
            </Button>
          )}
        </div>
      )}
    </Card>
  );

  if (href)
    return (
      <Link href={href} className="block active:opacity-80">
        {card}
      </Link>
    );
  return card;
}
