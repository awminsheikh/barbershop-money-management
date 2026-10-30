"use client";

import Link from "next/link";
import { useState } from "react";
import { SaleForm } from "@/components/SaleForm";
import { PageHeader } from "@/components/ui";
import { useProducts } from "@/lib/hooks";

// Product sales only. A service (a visit) is added from the "+ نوبت" button in the header.
export default function SalePage() {
  // Remounting the form after a save gives him a clean sheet for the next customer.
  const [round, setRound] = useState(0);
  const [saved, setSaved] = useState(false);
  const products = useProducts();
  return (
    <>
      <PageHeader title="فروش محصول" />
      {saved && <div className="mb-4 rounded-xl bg-good/15 p-3 text-good">فروش ثبت شد.</div>}
      {products.length === 0 && (
        <div className="mb-4 rounded-xl border border-brand bg-brand-soft p-3 text-sm">
          هنوز محصولی ثبت نشده است. <Link href="/products/" className="font-semibold underline">محصول اضافه کنید</Link> یا پایین یک محصول دلخواه وارد کنید.
        </div>
      )}
      <SaleForm
        key={round}
        kind="product"
        onDone={() => {
          setSaved(true);
          setRound((r) => r + 1);
          window.scrollTo({ top: 0 });
        }}
      />
    </>
  );
}
