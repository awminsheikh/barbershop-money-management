"use client";

import { useMemo, useState } from "react";
import { db } from "@/lib/db";
import { useCustomers } from "@/lib/hooks";
import { normalizeDigits } from "@/lib/date";
import { Button, Chip, inputClass } from "./ui";

// Search an existing customer by name/phone, or create one with just a name.
export function CustomerPicker({
  value,
  onChange,
  optional = false,
}: {
  value?: number;
  onChange: (id: number | undefined) => void;
  optional?: boolean;
}) {
  const customers = useCustomers();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [phone, setPhone] = useState("");
  const selected = customers.find((c) => c.id === value);

  const matches = useMemo(() => {
    const q = normalizeDigits(query.trim());
    if (!q) return [];
    return customers
      .filter((c) => c.name.includes(q) || normalizeDigits(c.phone ?? "").includes(q))
      .slice(0, 6);
  }, [customers, query]);

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-line bg-card px-3 py-2">
        <span className="font-semibold">{selected.name}</span>
        <button type="button" className="min-h-10 px-2 text-sm text-brand" onClick={() => onChange(undefined)}>
          تغییر
        </button>
      </div>
    );
  }

  const create = async () => {
    const name = query.trim();
    if (!name) return;
    const id = await db.customers.add({
      name,
      phone: normalizeDigits(phone).trim() || undefined,
      createdAt: Date.now(),
    });
    setQuery("");
    setPhone("");
    setAdding(false);
    onChange(id);
  };

  return (
    <div className="space-y-2">
      <input
        className={inputClass}
        placeholder={optional ? "نام مشتری (اختیاری)" : "نام مشتری"}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setAdding(false);
        }}
      />
      {matches.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {matches.map((c) => (
            <Chip key={c.id} onClick={() => onChange(c.id)}>
              {c.name}
            </Chip>
          ))}
        </div>
      )}
      {query.trim() && !matches.some((c) => c.name === query.trim()) && (
        <>
          {adding ? (
            <div className="space-y-2">
              <input
                className={inputClass}
                dir="ltr"
                style={{ textAlign: "right" }}
                inputMode="tel"
                placeholder="شماره موبایل (اختیاری)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Button className="w-full" onClick={create}>
                ذخیره «{query.trim()}»
              </Button>
            </div>
          ) : (
            <Button variant="secondary" className="w-full" onClick={() => setAdding(true)}>
              + مشتری جدید «{query.trim()}»
            </Button>
          )}
        </>
      )}
    </div>
  );
}
