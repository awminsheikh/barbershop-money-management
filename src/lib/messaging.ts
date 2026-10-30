import { normalizeDigits } from "./date";
import type { MessageChannel } from "./types";

// 0912... / +98912... / 0098912... -> 98912...
export function intlPhone(phone: string) {
  const digits = normalizeDigits(phone).replace(/\D/g, "");
  if (digits.startsWith("0098")) return digits.slice(2);
  if (digits.startsWith("98")) return digits;
  if (digits.startsWith("0")) return `98${digits.slice(1)}`;
  return `98${digits}`;
}

export const fillTemplate = (template: string, vars: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (m, key) => vars[key] ?? m);

export async function sendMessage(channel: MessageChannel, phone: string, text: string) {
  const intl = intlPhone(phone);
  if (channel === "whatsapp") {
    window.location.href = `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
  } else if (channel === "telegram") {
    // Telegram cannot prefill text for a phone number, so copy it first and let him paste.
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard may be unavailable; the chat still opens
    }
    window.location.href = `https://t.me/+${intl}`;
  } else {
    window.location.href = `sms:+${intl}?body=${encodeURIComponent(text)}`;
  }
}
