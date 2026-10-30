"use client";

import { useState } from "react";
import { SaleForm } from "@/components/SaleForm";
import { PageHeader } from "@/components/ui";

export default function SalePage() {
  // Remounting the form after a save gives him a clean sheet for the next customer.
  const [round, setRound] = useState(0);
  const [saved, setSaved] = useState(false);
  return (
    <>
      <PageHeader title="فروش سریع" />
      {saved && <div className="mb-4 rounded-xl bg-good/15 p-3 text-good">فروش ثبت شد.</div>}
      <SaleForm
        key={round}
        onDone={() => {
          setSaved(true);
          setRound((r) => r + 1);
          window.scrollTo({ top: 0 });
        }}
      />
    </>
  );
}
