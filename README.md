# Barbershop money management

An offline-first Persian (RTL, Jalali calendar) app for a solo barber: appointments, quick sales,
customers, expenses and reports. It is a static Next.js site; all data stays on his iPhone in
IndexedDB. There is no server or database to host.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run lint
```

## Build and deploy (free)

`npm run build` exports plain files to `out/` and generates the offline service worker and web manifest.

For a GitHub Pages project site, the base path is the repository name. The workflow in
`.github/workflows/deploy.yml` sets it automatically on every push to `main`. To build by hand:

```bash
NEXT_PUBLIC_BASE_PATH=/repo-name npm run build
```

Enable it once under Settings, Pages, Source: GitHub Actions.

**The site address must never change.** The browser ties his data to the address, so renaming the repo
or moving hosts makes the data look lost (restore from a backup file if that ever happens).

## Install on the iPhone

- Open the site in Safari, tap Share, then Add to Home Screen. Always open the app from the Home Screen icon.
- Or generate a Web Clip profile and send it to him (AirDrop, WhatsApp):

```bash
node scripts/make-webclip.mjs https://yourname.github.io/barbershop/
```

## Branding

The logo lives in `design/almas-logo.jpg`. `node scripts/make-icons.mjs` (macOS, uses `sips`) cuts the black background out of it into
`src/assets/logo.png` (in-app header) and builds the PWA / Home Screen icons in `public/`. The dark theme colors
in `src/app/globals.css` are taken from the logo.

## Features

Appointments, quick sales, customers, a profile page (shop details and services with a default price that
sales use automatically; the price can still be changed per sale), products with stock (low-stock warning, restock logged as an
expense), recurring expenses (rent, salaries; generated when the app opens), optional VAT (kept out of
income), reports by day/week/month/year, Excel-friendly CSV ledger export and print/PDF, backup and restore.
CRM: birthdays with one-tap greetings, "away" customers list, VIP flag, optional loyalty (free service after N
visits), editable message templates (SMS / Telegram / WhatsApp). Also an end-of-day cash count and an insights
page (busiest hours and days, best customers, repeat rate).

## Sample data

Settings, Sample data, fills every screen with a few months of made-up customers, bookings, sales and expenses
(`src/lib/seed.ts`); the same page can wipe everything back to a fresh install. Both ask for confirmation.

## Login

The first time the app opens it asks for two accounts: an admin and the barbershop owner. Both are created on the
phone by whoever installs it, then the phone goes to the owner. Each user can change their own username and password
under More, Account. Only the admin sees the Users page, where the owner's login can be reset if it is forgotten. The
owner's screens never mention the admin account, and the accounts are kept out of backups so backup files do not reveal it.

This is a lock on the app, not server security: everything lives on the phone, so it keeps customers and staff out of
the books but would not stop someone who can open the phone's browser storage. Passwords are stored only as salted
hashes. After 5 wrong tries login waits 30 seconds.

In development (`npm run dev`) the accounts `admin` / `admin123` and `owner` / `owner123` are created automatically,
together with the sample data. This never runs in a production build.

## Data and backups

- Money is stored as integer Rial. The Toman/Rial switch only changes how amounts are shown and typed.
- Dates are stored as timestamps and shown in the Jalali calendar.
- Settings, Backup exports one JSON file through the iPhone share sheet (save to Files or iCloud Drive)
  and can restore from it. The Today screen reminds him weekly.
- All reads and writes go through `src/lib/db.ts` and `src/lib/repo.ts`, so the storage can later move to
  SQLite under Capacitor without touching the screens.
