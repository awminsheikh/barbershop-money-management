"use client";

import { useState, type FormEvent } from "react";
import { login, setupAccounts } from "@/lib/auth";
import { toFa } from "@/lib/date";
import type { User } from "@/lib/types";
import { Logo } from "./Logo";
import { PasswordField } from "./PasswordField";
import { Button, Field, Toggle, inputClass } from "./ui";

const textInput = { dir: "ltr" as const, style: { textAlign: "right" as const }, autoCapitalize: "none", autoCorrect: "off" };

function Frame({ title, children, onSubmit }: { title: string; children: React.ReactNode; onSubmit: (e: FormEvent) => void }) {
  return (
    <form onSubmit={onSubmit} className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-4 p-6">
      <Logo className="mx-auto h-28 w-auto" />
      <h1 className="text-center text-xl font-bold">{title}</h1>
      {children}
    </form>
  );
}

export function LoginScreen({ onLogin }: { onLogin: (user: User, remember: boolean) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const result = await login(username, password);
    if (result.ok) onLogin(result.user, remember);
    else {
      setError(
        result.reason === "locked"
          ? `تلاش‌های ناموفق زیاد بود. ${toFa(result.waitSeconds ?? 30)} ثانیه صبر کنید.`
          : "نام کاربری یا رمز اشتباه است.",
      );
      setPassword("");
    }
    setBusy(false);
  };

  return (
    <Frame title="ورود به برنامه" onSubmit={submit}>
      <Field label="نام کاربری">
        <input className={inputClass} {...textInput} autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
      </Field>
      <Field label="رمز">
        <PasswordField value={password} onChange={setPassword} autoComplete="current-password" />
      </Field>
      <Toggle checked={remember} onChange={setRemember} label="مرا در این گوشی به خاطر بسپار" />
      {error && <p className="text-sm text-bad">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy || !username || !password}>
        {busy ? "در حال بررسی…" : "ورود"}
      </Button>
    </Frame>
  );
}

// First run only: whoever installs the app creates both accounts, then hands the phone over.
export function SetupScreen() {
  const [admin, setAdmin] = useState({ username: "", password: "", repeat: "" });
  const [owner, setOwner] = useState({ username: "", password: "", repeat: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (admin.password !== admin.repeat || owner.password !== owner.repeat) {
      setError("تکرار رمز با رمز یکسان نیست.");
      return;
    }
    setBusy(true);
    setError((await setupAccounts(admin, owner)) ?? "");
    setBusy(false);
  };

  const block = (title: string, v: typeof admin, set: (v: typeof admin) => void, prefix: string) => (
    <fieldset className="space-y-3 rounded-2xl border border-line bg-card p-4">
      <legend className="px-2 font-semibold">{title}</legend>
      <Field label="نام کاربری">
        <input className={inputClass} {...textInput} autoComplete={`${prefix}-username`} value={v.username} onChange={(e) => set({ ...v, username: e.target.value })} />
      </Field>
      <Field label="رمز (حداقل ۶ کاراکتر)">
        <PasswordField value={v.password} onChange={(password) => set({ ...v, password })} autoComplete="new-password" />
      </Field>
      <Field label="تکرار رمز">
        <PasswordField value={v.repeat} onChange={(repeat) => set({ ...v, repeat })} autoComplete="new-password" />
      </Field>
    </fieldset>
  );

  return (
    <Frame title="راه‌اندازی اولیه" onSubmit={submit}>
      <p className="text-center text-sm text-muted">
        این اطلاعات فقط روی همین گوشی ذخیره می‌شود. بعد از ساخت حساب‌ها، گوشی را به صاحب آرایشگاه تحویل دهید.
      </p>
      {block("حساب مدیر", admin, setAdmin, "admin")}
      {block("حساب صاحب آرایشگاه", owner, setOwner, "owner")}
      {error && <p className="text-sm text-bad">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "در حال ساخت…" : "ساخت حساب‌ها"}
      </Button>
    </Frame>
  );
}
