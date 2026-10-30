"use client";

import { useMemo, useState } from "react";
import { toFa } from "@/lib/date";
import { useById, useCustomers, useSales } from "@/lib/hooks";
import { formatMoney } from "@/lib/money";
import { usePeriod, type PeriodMode } from "@/lib/period";
import { useSettings } from "@/lib/settings";
import { KIND_LABEL, METHOD_LABEL, saleKind, saleTotal, type PaymentMethod, type SaleKind } from "@/lib/types";
import { SaleCard } from "./SaleCard";
import { Card, Chip, DateStepper, Empty, PageHeader, Segmented, inputClass } from "./ui";

const PAGE_SIZE = 15;

type Range = PeriodMode | "all";
type Status = "all" | "active" | "voided";

// Every service use (or every product sale) with filters and pages. `?open=ID` opens that one on arrival.
export function SalesList({ kind }: { kind: SaleKind }) {
  const { unit } = useSettings();
  const customers = useById(useCustomers());
  const [range, setRange] = useState<Range>("all");
  const [offset, setOffset] = useState(0);
  const [method, setMethod] = useState<PaymentMethod | "all">("all");
  const [status, setStatus] = useState<Status>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState<number>();
  const [openId, setOpenId] = useState<number | undefined>(() =>
    typeof window === "undefined" ? undefined : Number(new URLSearchParams(window.location.search).get("open")) || undefined,
  );

  const { from, to, label } = usePeriod(range, offset);
  const sales = useSales(from, to);

  // Changing a filter goes back to the first page.
  const filter = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
    setOpenId(undefined);
  };

  const list = useMemo(() => {
    const q = query.trim();
    return sales
      .filter((s) => saleKind(s) === kind)
      .filter((s) => method === "all" || s.method === method)
      .filter((s) => status === "all" || (status === "voided" ? s.voided : !s.voided))
      .filter(
        (s) =>
          !q ||
          (customers.get(s.customerId as number)?.name ?? "").includes(q) ||
          s.items.some((i) => i.name.includes(q)),
      );
  }, [sales, kind, method, status, query, customers]);

  const live = list.filter((s) => !s.voided);
  const total = live.reduce((t, s) => t + saleTotal(s), 0);
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const openIndex = openId !== undefined ? list.findIndex((s) => s.id === openId) : -1;
  const current = Math.min(pages, Math.max(1, page ?? (openIndex >= 0 ? Math.floor(openIndex / PAGE_SIZE) + 1 : 1)));
  const shown = list.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <>
      <PageHeader title={kind === "service" ? "همه خدمات انجام‌شده" : "همه فروش‌های محصول"} />

      <div className="space-y-3">
        <Segmented<Range>
          value={range}
          onChange={(r) => {
            filter(setRange)(r);
            setOffset(0);
          }}
          options={[
            { value: "all", label: "همه" },
            { value: "day", label: "روز" },
            { value: "week", label: "هفته" },
            { value: "month", label: "ماه" },
            { value: "year", label: "سال" },
          ]}
        />
        {range !== "all" && (
          <DateStepper
            label={label}
            onPrev={() => filter(setOffset)(offset - 1)}
            onNext={() => filter(setOffset)(offset + 1)}
            nextDisabled={offset >= 0}
          />
        )}
        <input
          className={inputClass}
          placeholder={kind === "service" ? "جستجوی مشتری یا خدمت" : "جستجوی مشتری یا محصول"}
          value={query}
          onChange={(e) => filter(setQuery)(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Chip active={method === "all"} onClick={() => filter(setMethod)("all")}>
            همه روش‌ها
          </Chip>
          {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => (
            <Chip key={m} active={method === m} onClick={() => filter(setMethod)(m)}>
              {METHOD_LABEL[m]}
            </Chip>
          ))}
        </div>
        <Segmented<Status>
          value={status}
          onChange={filter(setStatus)}
          options={[
            { value: "all", label: "همه" },
            { value: "active", label: "معتبر" },
            { value: "voided", label: "باطل‌شده" },
          ]}
        />
      </div>

      <Card className="my-4 flex justify-between">
        <div>
          <div className="text-xs text-muted">تعداد ({KIND_LABEL[kind]})</div>
          <div className="text-lg font-bold">{toFa(live.length)}</div>
        </div>
        <div className="text-end">
          <div className="text-xs text-muted">مجموع دریافتی</div>
          <div className="text-lg font-bold text-good">{formatMoney(total, unit)}</div>
        </div>
      </Card>

      {list.length === 0 ? (
        <Empty>موردی با این فیلترها پیدا نشد.</Empty>
      ) : (
        <div className="space-y-2">
          {shown.map((s) => (
            <SaleCard
              key={s.id}
              sale={s}
              customer={customers.get(s.customerId as number)?.name}
              unit={unit}
              expanded={openId === s.id}
              onToggle={() => setOpenId(openId === s.id ? undefined : s.id)}
            />
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-4">
          <DateStepper
            label={`صفحه ${toFa(current)} از ${toFa(pages)}`}
            onPrev={() => setPage(current - 1)}
            onNext={() => setPage(current + 1)}
            prevDisabled={current <= 1}
            nextDisabled={current >= pages}
          />
        </div>
      )}
    </>
  );
}
