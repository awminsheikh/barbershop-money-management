"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/money";
import { loyaltyEligible } from "@/lib/crm";
import { useById, useCustomerStats, useProducts, useServices } from "@/lib/hooks";
import { createSale } from "@/lib/repo";
import { useSettings } from "@/lib/settings";
import { METHOD_LABEL, saleSubtotal, saleTotal, type PaymentMethod, type SaleItem } from "@/lib/types";
import { toFa } from "@/lib/date";
import { AmountInput } from "./AmountInput";
import { CustomerPicker } from "./CustomerPicker";
import { Button, Card, Chip, Field, Segmented, inputClass } from "./ui";

export interface SaleInitial {
  customerId?: number;
  items?: SaleItem[];
  appointmentId?: number;
  deposit?: number;
}

export function SaleForm({ initial, onDone }: { initial?: SaleInitial; onDone: () => void }) {
  const { unit, vatEnabled, vatPercent, loyaltyEnabled, loyaltyEvery } = useSettings();
  const services = useServices().filter((s) => s.active);
  const products = useProducts().filter((p) => p.active);
  const productById = useById(useProducts());
  const [customerId, setCustomerId] = useState(initial?.customerId);
  const [items, setItems] = useState<SaleItem[]>(initial?.items ?? []);
  const [discount, setDiscount] = useState(0);
  const [tip, setTip] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState(0);
  const [saving, setSaving] = useState(false);
  const [freeApplied, setFreeApplied] = useState(false);
  const customerStats = useCustomerStats();
  const eligible =
    loyaltyEnabled && customerId !== undefined && loyaltyEligible(customerStats.get(customerId), loyaltyEvery);

  const deposit = initial?.deposit ?? 0;
  const subtotal = saleSubtotal({ items });
  const vat = vatEnabled ? Math.round(((subtotal - discount) * vatPercent) / 100) : 0;
  const total = saleTotal({ items, discount, tip, vat });
  const payNow = Math.max(0, total - deposit);

  const addService = (id: number) => {
    const s = services.find((x) => x.id === id);
    if (!s) return;
    setItems((prev) => {
      const i = prev.findIndex((p) => p.serviceId === id);
      if (i >= 0) return prev.map((p, idx) => (idx === i ? { ...p, qty: p.qty + 1 } : p));
      return [...prev, { serviceId: id, name: s.name, price: s.price, qty: 1 }];
    });
  };

  const inCart = (productId: number) =>
    items.filter((i) => i.productId === productId).reduce((t, i) => t + i.qty, 0);

  const addProduct = (id: number) => {
    const p = products.find((x) => x.id === id);
    if (!p || inCart(id) >= p.stock) return;
    setItems((prev) => {
      const i = prev.findIndex((x) => x.productId === id);
      if (i >= 0) return prev.map((x, idx) => (idx === i ? { ...x, qty: x.qty + 1 } : x));
      return [...prev, { productId: id, name: p.name, price: p.price, qty: 1 }];
    });
  };

  const patchItem = (index: number, patch: Partial<SaleItem>) =>
    setItems((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));

  const addCustom = () => {
    if (!customName.trim()) return;
    setItems((prev) => [...prev, { name: customName.trim(), price: customPrice, qty: 1 }]);
    setCustomName("");
    setCustomPrice(0);
  };

  const valid = items.length > 0 && discount <= subtotal;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    await createSale({
      customerId,
      items,
      discount,
      tip,
      deposit,
      vat,
      loyaltyFree: freeApplied || undefined,
      method,
      appointmentId: initial?.appointmentId,
    });
    onDone();
  };

  return (
    <div className="space-y-4">
      <Field label="مشتری">
        <CustomerPicker
          optional
          value={customerId}
          onChange={(id) => {
            setCustomerId(id);
            setFreeApplied(false);
          }}
        />
      </Field>

      {eligible && (
        <div className="rounded-xl border border-accent p-3 text-sm">
          <div className="mb-2 text-accent">این مشتری خدمت رایگان باشگاه را دارد.</div>
          <Button
            variant="secondary"
            className="w-full"
            disabled={items.length === 0 || freeApplied}
            onClick={() => {
              setDiscount(items[0].price);
              setFreeApplied(true);
            }}
          >
            {freeApplied ? "اعمال شد" : "اعمال خدمت رایگان (اولین خدمت)"}
          </Button>
        </div>
      )}

      <div>
        <div className="mb-1 text-sm text-muted">خدمات</div>
        <div className="flex flex-wrap gap-2">
          {services.map((s) => (
            <Chip key={s.id} onClick={() => addService(s.id!)}>
              {s.name}
            </Chip>
          ))}
        </div>
      </div>

      {products.length > 0 && (
        <div>
          <div className="mb-1 text-sm text-muted">محصولات</div>
          <div className="flex flex-wrap gap-2">
            {products.map((p) => (
              <Chip key={p.id} disabled={inCart(p.id!) >= p.stock} onClick={() => addProduct(p.id!)}>
                {p.name} · {toFa(p.stock - inCart(p.id!))}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <Card className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="space-y-2 border-b border-line pb-3 last:border-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{item.name}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="h-10 w-10 rounded-lg border border-line text-lg"
                    onClick={() => (item.qty > 1 ? patchItem(i, { qty: item.qty - 1 }) : setItems(items.filter((_, j) => j !== i)))}
                    aria-label="کم کردن"
                  >
                    −
                  </button>
                  <span className="w-8 text-center">{toFa(item.qty)}</span>
                  <button
                    type="button"
                    className="h-10 w-10 rounded-lg border border-line text-lg disabled:opacity-30"
                    disabled={item.productId !== undefined && item.qty >= (productById.get(item.productId)?.stock ?? 0)}
                    onClick={() => patchItem(i, { qty: item.qty + 1 })}
                    aria-label="اضافه کردن"
                  >
                    +
                  </button>
                </div>
              </div>
              <AmountInput value={item.price} onChange={(price) => patchItem(i, { price })} />
            </div>
          ))}
        </Card>
      )}

      <Card className="space-y-2">
        <div className="text-sm text-muted">آیتم دلخواه (مثلاً محصول)</div>
        <input className={inputClass} placeholder="نام" value={customName} onChange={(e) => setCustomName(e.target.value)} />
        <AmountInput value={customPrice} onChange={setCustomPrice} />
        <Button variant="secondary" className="w-full" disabled={!customName.trim()} onClick={addCustom}>
          افزودن
        </Button>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Field label="تخفیف">
          <AmountInput value={discount} onChange={setDiscount} />
        </Field>
        <Field label="انعام">
          <AmountInput value={tip} onChange={setTip} />
        </Field>
      </div>

      <Segmented
        value={method}
        onChange={setMethod}
        options={(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => ({ value: m, label: METHOD_LABEL[m] }))}
      />

      <Card className="space-y-1">
        <div className="flex justify-between text-muted">
          <span>جمع خدمات</span>
          <span>{formatMoney(subtotal, unit)}</span>
        </div>
        {vat > 0 && (
          <div className="flex justify-between text-muted">
            <span>مالیات بر ارزش افزوده ({toFa(vatPercent)}٪)</span>
            <span>{formatMoney(vat, unit)}</span>
          </div>
        )}
        {deposit > 0 && (
          <div className="flex justify-between text-muted">
            <span>بیعانه پرداخت‌شده</span>
            <span>{formatMoney(deposit, unit)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold">
          <span>{deposit > 0 ? "مبلغ دریافتی اکنون" : "مبلغ کل"}</span>
          <span>{formatMoney(deposit > 0 ? payNow : total, unit)}</span>
        </div>
      </Card>

      {discount > subtotal && <p className="text-sm text-bad">تخفیف بیشتر از جمع خدمات است.</p>}
      <Button className="w-full" disabled={!valid || saving} onClick={save}>
        ثبت فروش
      </Button>
    </div>
  );
}
