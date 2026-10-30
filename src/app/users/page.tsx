"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { PasswordField } from "@/components/PasswordField";
import { Button, Card, Empty, Field, PageHeader, inputClass } from "@/components/ui";
import { adminUpdateOwner, listAccounts } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";
import type { User } from "@/lib/types";

const textInput = { dir: "ltr" as const, style: { textAlign: "right" as const }, autoCapitalize: "none", autoCorrect: "off" };

function OwnerReset({ actor, owner }: { actor: User; owner: User }) {
  const [username, setUsername] = useState(owner.username);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();

  const save = async () => {
    const error = await adminUpdateOwner(actor, {
      username: username !== owner.username ? username : undefined,
      newPassword: password || undefined,
    });
    setMessage(error ? { ok: false, text: error } : { ok: true, text: "ذخیره شد." });
    if (!error) setPassword("");
  };

  return (
    <div className="space-y-3">
      <Field label="نام کاربری">
        <input className={inputClass} {...textInput} autoComplete="off" value={username} onChange={(e) => setUsername(e.target.value)} />
      </Field>
      <Field label="رمز جدید (خالی = بدون تغییر)">
        <PasswordField value={password} onChange={setPassword} autoComplete="new-password" />
      </Field>
      {message && <p className={`text-sm ${message.ok ? "text-good" : "text-bad"}`}>{message.text}</p>}
      <Button className="w-full" onClick={save}>
        ذخیره تغییرات صاحب آرایشگاه
      </Button>
    </div>
  );
}

// Admin only. The owner's account never shows anything about other accounts.
export default function UsersPage() {
  const { user } = useAuth();
  const accounts = useLiveQuery(() => listAccounts(user), [user]);
  if (user.role !== "admin") return <Empty>صفحه‌ای پیدا نشد.</Empty>;
  const owner = accounts?.find((a) => a.role === "owner");
  return (
    <>
      <PageHeader title="مدیریت کاربران" />
      <Card className="mb-4 space-y-1">
        <div className="text-sm text-muted">مدیر</div>
        <div className="font-semibold" dir="ltr" style={{ textAlign: "right" }}>
          {user.username}
        </div>
        <p className="pt-1 text-sm text-muted">رمز و نام کاربری خودتان را از «حساب کاربری» تغییر دهید.</p>
      </Card>
      <Card className="space-y-3">
        <div className="text-sm text-muted">صاحب آرایشگاه</div>
        {owner ? <OwnerReset key={owner.username} actor={user} owner={owner} /> : <Empty>حسابی پیدا نشد.</Empty>}
      </Card>
    </>
  );
}
