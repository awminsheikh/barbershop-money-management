"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { db } from "./db";
import { summarize } from "./repo";
import type { Customer, Service } from "./types";

export const useServices = () => useLiveQuery(() => db.services.toArray(), []) ?? [];

export const useCustomers = () => useLiveQuery(() => db.customers.toArray(), []) ?? [];

export const useExpenseCategories = () => useLiveQuery(() => db.expenseCategories.toArray(), []) ?? [];

export function useAppointments(from: number, to: number) {
  const rows = useLiveQuery(() => db.appointments.where("start").between(from, to).toArray(), [from, to]);
  return useMemo(() => (rows ?? []).sort((a, b) => a.start - b.start), [rows]);
}

export function useSales(from: number, to: number) {
  const rows = useLiveQuery(() => db.sales.where("date").between(from, to).toArray(), [from, to]);
  return useMemo(() => (rows ?? []).sort((a, b) => b.date - a.date), [rows]);
}

export function useExpenses(from: number, to: number) {
  const rows = useLiveQuery(() => db.expenses.where("date").between(from, to).toArray(), [from, to]);
  return useMemo(() => (rows ?? []).sort((a, b) => b.date - a.date), [rows]);
}

export function useSummary(from: number, to: number) {
  const sales = useSales(from, to);
  const expenses = useExpenses(from, to);
  return useMemo(() => summarize(sales, expenses), [sales, expenses]);
}

export function useById<T extends { id?: number }>(rows: T[]) {
  return useMemo(() => new Map(rows.map((r) => [r.id as number, r])), [rows]);
}

export type CustomerMap = Map<number, Customer>;
export type ServiceMap = Map<number, Service>;
