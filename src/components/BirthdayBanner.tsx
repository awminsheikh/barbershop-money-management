"use client";

import { useState } from "react";
import { daysUntilBirthday } from "@/lib/crm";
import { toFa } from "@/lib/date";
import { useCustomers } from "@/lib/hooks";
import { fillTemplate, sendMessage } from "@/lib/messaging";
import { useSettings } from "@/lib/settings";
import { Icon } from "./Icon";
import { Button, Card } from "./ui";

// Birthdays today and in the coming week, with a one-tap greeting.
export function BirthdayBanner() {
  const settings = useSettings();
  const customers = useCustomers();
  const [now] = useState(() => new Date());

  const upcoming = customers
    .flatMap((c) => (c.birthday ? [{ c, days: daysUntilBirthday(c.birthday, now) }] : []))
    .filter((x) => x.days <= 7)
    .sort((a, b) => a.days - b.days);
  if (upcoming.length === 0) return null;

  return (
    <Card className="mb-4 space-y-2">
      <h2 className="flex items-center gap-2 font-semibold">
        <Icon name="gift" className="h-5 w-5 text-brand" />
        تولدهای نزدیک
      </h2>
      {upcoming.map(({ c, days }) => (
        <div key={c.id} className="flex items-center justify-between gap-2">
          <div>
            <div>{c.name}</div>
            <div className="text-sm text-muted">{days === 0 ? "امروز" : `${toFa(days)} روز دیگر`}</div>
          </div>
          {c.phone && (
            <Button
              variant="secondary"
              onClick={() => sendMessage(settings.channel, c.phone!, fillTemplate(settings.templateBirthday, { name: c.name }))}
            >
              تبریک
            </Button>
          )}
        </div>
      ))}
    </Card>
  );
}
