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

## Data and backups

- Money is stored as integer Rial. The Toman/Rial switch only changes how amounts are shown and typed.
- Dates are stored as timestamps and shown in the Jalali calendar.
- Settings, Backup exports one JSON file through the iPhone share sheet (save to Files or iCloud Drive)
  and can restore from it. The Today screen reminds him weekly.
- All reads and writes go through `src/lib/db.ts` and `src/lib/repo.ts`, so the storage can later move to
  SQLite under Capacitor without touching the screens.
