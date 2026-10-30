"use client";

import { useState } from "react";
import { AmountInput } from "@/components/AmountInput";
import { Button, Card, Empty, Field, PageHeader, Sheet, Toggle, inputClass } from "@/components/ui";
import { db } from "@/lib/db";
import { normalizeDigits, toFa } from "@/lib/date";
import { useProducts } from "@/lib/hooks";
import { formatMoney } from "@/lib/money";
import { useSettings } from "@/lib/settings";
import type { Product } from "@/lib/types";

const RESTOCK_CATEGORY = "خرید کالا";

const toCount = (text: string) => Number(normalizeDigits(text).replace(/\D/g, "")) || 0;

function NumberField({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <input
      className={inputClass}
      inputMode="numeric"
      value={value ? toFa(value) : ""}
      placeholder="۰"
      onChange={(e) => onChange(toCount(e.target.value))}
    />
  );
}

function ProductSheet({ product, onClose }: { product: Product | "new" | null; onClose: () => void }) {
  const existing = product && product !== "new" ? product : null;
  const [name, setName] = useState(existing?.name ?? "");
  const [costPrice, setCostPrice] = useState(existing?.costPrice ?? 0);
  const [price, setPrice] = useState(existing?.price ?? 0);
  const [stock, setStock] = useState(existing?.stock ?? 0);
  const [lowStockAt, setLowStockAt] = useState(existing?.lowStockAt ?? 2);
  const [active, setActive] = useState(existing?.active ?? true);

  const save = async () => {
    if (!name.trim()) return;
    const data = { name: name.trim(), costPrice, price, stock, lowStockAt, active };
    if (existing?.id) await db.products.update(existing.id, data);
    else await db.products.add(data);
    onClose();
  };

  return (
    <Sheet open={product !== null} title={existing ? "ویرایش محصول" : "محصول جدید"} onClose={onClose}>
      <Field label="نام">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="قیمت خرید">
          <AmountInput value={costPrice} onChange={setCostPrice} />
        </Field>
        <Field label="قیمت فروش">
          <AmountInput value={price} onChange={setPrice} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="موجودی">
          <NumberField value={stock} onChange={setStock} />
        </Field>
        <Field label="هشدار کمبود در">
          <NumberField value={lowStockAt} onChange={setLowStockAt} />
        </Field>
      </div>
      <Toggle checked={active} onChange={setActive} label="فعال (نمایش در فروش)" />
      <Button className="w-full" disabled={!name.trim()} onClick={save}>
        ذخیره
      </Button>
    </Sheet>
  );
}

function RestockSheet({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { unit } = useSettings();
  const [qty, setQty] = useState(0);
  const [paid, setPaid] = useState(0);

  const save = async () => {
    if (!product?.id || qty <= 0) return;
    await db.transaction("rw", db.products, db.expenses, db.expenseCategories, async () => {
      await db.products.update(product.id!, { stock: product.stock + qty });
      if (paid > 0) {
        // The purchase counts as an expense so the profit report stays honest.
        const all = await db.expenseCategories.toArray();
        const categoryId =
          all.find((c) => c.name === RESTOCK_CATEGORY)?.id ?? (await db.expenseCategories.add({ name: RESTOCK_CATEGORY }));
        await db.expenses.add({ date: Date.now(), categoryId, amount: paid, note: `${product.name} × ${toFa(qty)}` });
      }
    });
    onClose();
  };

  return (
    <Sheet open={product !== null} title={`افزایش موجودی ${product?.name ?? ""}`} onClose={onClose}>
      <Field label="تعداد خریداری‌شده">
        <NumberField value={qty} onChange={setQty} />
      </Field>
      <Field label="مبلغ پرداختی (اختیاری، به‌عنوان هزینه ثبت می‌شود)">
        <AmountInput value={paid} onChange={setPaid} />
      </Field>
      {product && qty > 0 && paid === 0 && product.costPrice > 0 && (
        <Button variant="ghost" className="w-full" onClick={() => setPaid(product.costPrice * qty)}>
          پر کردن با قیمت خرید: {formatMoney(product.costPrice * qty, unit)}
        </Button>
      )}
      <Button className="w-full" disabled={qty <= 0} onClick={save}>
        ثبت خرید
      </Button>
    </Sheet>
  );
}

export default function ProductsPage() {
  const { unit } = useSettings();
  const products = useProducts();
  const [open, setOpen] = useState<Product | "new" | null>(null);
  const [restock, setRestock] = useState<Product | null>(null);

  return (
    <>
      <PageHeader title="محصولات و موجودی" action={<Button onClick={() => setOpen("new")}>+ جدید</Button>} />
      {products.length === 0 ? (
        <Empty>محصولی ثبت نشده است. محصولاتی که در آرایشگاه می‌فروشید را اضافه کنید.</Empty>
      ) : (
        <div className="space-y-2">
          {products.map((p) => {
            const low = p.stock <= p.lowStockAt;
            return (
              <Card key={p.id} className={p.active ? "" : "opacity-50"}>
                <button type="button" className="block w-full text-start" onClick={() => setOpen(p)}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold">{p.name}</div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${low ? "bg-bad/15 text-bad" : "bg-line text-muted"}`}
                    >
                      موجودی {toFa(p.stock)}
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between text-sm text-muted">
                    <span>فروش {formatMoney(p.price, unit)}</span>
                    <span>سود هر عدد {formatMoney(p.price - p.costPrice, unit)}</span>
                  </div>
                </button>
                <Button variant="secondary" className="mt-3 w-full" onClick={() => setRestock(p)}>
                  + افزایش موجودی
                </Button>
              </Card>
            );
          })}
        </div>
      )}
      <ProductSheet key={open === null ? "closed" : open === "new" ? "new" : open.id} product={open} onClose={() => setOpen(null)} />
      <RestockSheet key={restock?.id ?? "none"} product={restock} onClose={() => setRestock(null)} />
    </>
  );
}
