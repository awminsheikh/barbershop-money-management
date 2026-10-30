"use client";

import { useState } from "react";
import { PasswordField } from "@/components/PasswordField";
import { Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { changeOwnAccount } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";
import type { User } from "@/lib/types";

const textInput = { dir: "ltr" as const, style: { textAlign: "right" as const }, autoCapitalize: "none", autoCorrect: "off" };

function AccountForm({ user }: { user: User }) {
  const [username, setUsername] = useState(user.username);
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (password && password !== repeat) {
      setMessage({ ok: false, text: "تکرار رمز با رمز جدید یکسان نیست." });
      return;
    }
    setBusy(true);
    const error = await changeOwnAccount(user.id as number, current, {
      username: username !== user.username ? username : undefined,
      newPassword: password || undefined,
    });
    setBusy(false);
    setMessage(error ? { ok: false, text: error } : { ok: true, text: "تغییرات ذخیره شد." });
    if (!error) {
      setCurrent("");
      setPassword("");
      setRepeat("");
    }
  };

  return (
    <Card className="mb-4 space-y-4">
      <h2 className="font-semibold">تغییر نام کاربری و رمز</h2>
      <Field label="نام کاربری">
        <input className={inputClass} {...textInput} autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
      </Field>
      <Field label="رمز جدید (اگر نمی‌خواهید عوض شود، خالی بگذارید)">
        <PasswordField value={password} onChange={setPassword} autoComplete="new-password" />
      </Field>
      {password && (
        <Field label="تکرار رمز جدید">
          <PasswordField value={repeat} onChange={setRepeat} autoComplete="new-password" />
        </Field>
      )}
      <Field label="رمز فعلی (برای تأیید)">
        <PasswordField value={current} onChange={setCurrent} autoComplete="current-password" />
      </Field>
      {message && <p className={`text-sm ${message.ok ? "text-good" : "text-bad"}`}>{message.text}</p>}
      <Button className="w-full" disabled={busy || !current} onClick={save}>
        ذخیره
      </Button>
    </Card>
  );
}

export default function AccountPage() {
  const { user, logout } = useAuth();
  return (
    <>
      <PageHeader title="حساب کاربری" />
      {/* Keyed so a changed username re-reads the fresh values. */}
      <AccountForm key={user.username} user={user} />
      <Button variant="danger" className="w-full" onClick={logout}>
        خروج از حساب
      </Button>
    </>
  );
}
