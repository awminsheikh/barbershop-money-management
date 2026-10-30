"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import type { Unit } from "./money";
import type { MessageChannel } from "./types";

export interface Settings {
  unit: Unit;
  workStart: string;
  workEnd: string;
  // Weekday indexes, Saturday = 0 ... Friday = 6.
  workDays: number[];
  slotMinutes: number;
  depositEnabled: boolean;
  vatEnabled: boolean;
  vatPercent: number;
  channel: MessageChannel;
  template: string;
  pinHash?: string;
  lastBackupAt?: number;
}

export const DEFAULT_SETTINGS: Settings = {
  unit: "toman",
  workStart: "09:00",
  workEnd: "21:00",
  workDays: [0, 1, 2, 3, 4, 5],
  slotMinutes: 30,
  depositEnabled: false,
  vatEnabled: false,
  vatPercent: 10,
  channel: "sms",
  template: "سلام {name}، یادآوری نوبت شما: {date} ساعت {time}",
};

export function useSettings(): Settings & { ready: boolean } {
  const rows = useLiveQuery(() => db.settings.toArray(), []);
  const merged: Settings = { ...DEFAULT_SETTINGS };
  for (const row of rows ?? []) {
    (merged as unknown as Record<string, unknown>)[row.key] = row.value;
  }
  return { ...merged, ready: rows !== undefined };
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K] | undefined) {
  if (value === undefined) await db.settings.delete(key);
  else await db.settings.put({ key, value });
}
