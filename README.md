# Check-in

Mobile-first training check-in for a sports club (Swedish UI). Monorepo: Express API + React (Vite) SPA.

## Requirements

- Node.js `>=20.11 <21` (see `package.json` `engines`)

## Quick start

```bash
npm install
cp .env.example .env   # set CLUB_PIN, SESSION_SECRET, SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT
npm run dev
```

- Web UI: http://localhost:5173 (Vite proxies `/api` to the API)
- API only: http://localhost:3000/api/health

## Scripts

| Script | Description |
|--------|-------------|
| `npm install` | Install all workspace dependencies |
| `npm run dev` | API (watch) + Vite dev server |
| `npm run build` | Production build of the web app (`web/dist`) |
| `npm start` | Run API serving `web/dist` — run `npm run build` first |
| `npm test` | API unit tests (`node --test` in `api/`) |

### Production-like local run

```bash
npm run build
npm start
# open http://localhost:3000
curl http://localhost:3000/api/health
```

## Environment variables

Copy `.env.example` to `.env`. The API exits on startup if required variables are missing (`CLUB_PIN`, `TRAINER_PIN`, `SESSION_SECRET`, `SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT`).

| Variable | Required when | Purpose |
|----------|---------------|---------|
| `PORT` | Optional | API port (default `3000`) |
| `TZ` | Optional | Process timezone (API defaults to `Europe/Stockholm`) |
| `SESSION_SECRET` | PIN slice (#2) | Signs the club-unlock and trainer session cookies |
| `CLUB_PIN` | PIN slice (#2) | Club PIN (server only; length not fixed) |
| `TRAINER_PIN` | Always | Trainer-only password gating the `/report` page (use a value different from `CLUB_PIN`) |
| `COOKIE_SECURE` | Optional | Set `true` to force `Secure` cookies in development |
| `SPREADSHEET_ID` | Sheets slice (#4)+ | Google Spreadsheet ID |
| `GOOGLE_SERVICE_ACCOUNT` | Sheets slice (#4)+ | Path to service-account JSON file |
| `DEFAULT_GROUP_NAME` | Optional | Display name of the default group (default `Standard`) |

GDPR slice (#3) uses client-only `localStorage.gdprAccepted` and a static `/privacy` page — no extra env vars.

## Repository layout

```
api/          Express API (/api/*; serves web/dist for local npm start only)
web/          React + Chakra UI (Vite)
deploy/       Docker, Caddy snippet, production env example
scripts/      deploy.sh (build + publish static + restart API)
docs/         PRD and implementation issue slices
CONTEXT.md    Domain glossary and scaffold decisions
```
## Setting up Google Sheets

1. Create a [service account](https://console.cloud.google.com/iam-admin/serviceaccounts) (no GCP project roles required for Sheets-only access).
2. Create a JSON key for that account and save it at the repo root as `api-key.json` (next to `.env`, gitignored). Set `GOOGLE_SERVICE_ACCOUNT=../api-key.json` in `.env` (see [.env.example](.env.example)).
3. Enable the [Google Sheets API](https://console.cloud.google.com/apis/api/sheets.googleapis.com) for your project.
4. Create an empty spreadsheet in Google Drive and copy its ID into `SPREADSHEET_ID` (from the spreadsheet URL).
5. Share the spreadsheet with the service account email (from the JSON `client_email`) as **Editor**.

On first member registration the API creates a `members` tab with headers (`memberId`, `firstName`, `lastName`, `optOutRanking`, `createdAt`). Do not rename those headers manually — fix or delete the tab and register again if the sheet was misconfigured.

### Groups

New members start in the **default group** (name from `DEFAULT_GROUP_NAME`, default `Standard`), whose check-ins land in the regular `checkins_YYYY` tab. In **Inställningar** every group — including the default one — is a toggle: members can join extra groups and may also leave the default group. On **Hem** you see the groups you're in and pick which one to check into (a single group checks in directly; multiple groups show a picker). The **Topplista** has a group selector so you can view any group's leaderboard, defaulting to the default group.

Coaches define extra groups by adding rows to the `groups` tab (auto-created with headers `groupId`, `name`, `createdAt` on first use):

| groupId | name | createdAt |
|---------|------|-----------|
| `1` | Måndagsträning | (optional) |
| `2` | Tävlingsgrupp | (optional) |

- Use **incremental integer** ids (`1`, `2`, `3`, …). Tabs and labels show as `Group1`, `Group2`, … independent of the `name`; the `name` is what members see when checking in.
- Each extra group's check-ins go to a per-year tab `groupN_YYYY` (e.g. group `1` in 2026 → `group1_2026`), auto-created on first check-in with the same headers as `checkins_YYYY`.
- Membership is stored in an auto-created `member_groups` tab (`memberId`, `groupIds`); do not edit it manually.

CI and local unit tests use an in-memory adapter (no live Google call).

### Trainer report

`/report` is a separate, trainer-only page (outside the member app and its club PIN). It is gated by its own `TRAINER_PIN` password and its own session cookie, so a member who knows the club PIN cannot see who attended. After unlocking, the coach picks a **date** and a **group** to list everyone who checked in that day in that group.

- The report endpoint (`GET /api/trainer/report?date=YYYY-MM-DD&groupId=`) reads the relevant `groupN_YYYY` (or `checkins_YYYY` for the default group) tab and filters by date; names are resolved live from the `members` tab.
- Rotate access by changing `TRAINER_PIN` (existing trainer sessions are invalidated, same as `CLUB_PIN` rotation).

## Deployment (VPS + Caddy + Docker)

Production uses a **dedicated subdomain**, **host Caddy** (you append a snippet to your existing config), static files in **`/var/www/checkin`**, and the **API in Docker** on `127.0.0.1:3001`. Local `npm start` remains valid for production-like testing on one port.

### First-time server setup

1. **DNS** — Point `checkin.your-club-domain` at the VPS.
2. **Directories**
   ```bash
   sudo mkdir -p /var/www/checkin
   sudo chown "$USER:$USER" /var/www/checkin   # or a dedicated deploy user
   ```
3. **Env** — In the clone: `cp .env.example .env` and fill in values. Place the Google service-account JSON as `api-key.json` next to `.env` (gitignored; Docker mounts it as `checkin-api`).
4. **Clone** — e.g. `~/git/checkin` (see [Google Sheets](#setting-up-google-sheets) on the VPS).
5. **Caddy** — Append `deploy/Caddyfile.snippet` to your Caddyfile, replace `checkin.YOUR_CLUB_DOMAIN`, then validate and reload Caddy.
6. **Deploy** — From the clone: `./scripts/deploy.sh` (builds web, copies to `/var/www/checkin`, starts API). Override paths with `CHECKIN_REPO` / `CHECKIN_WEB_ROOT` if needed.

### Environment checklist (production)

| Variable | Required | Notes |
|----------|----------|--------|
| `NODE_ENV` | In Docker | Compose sets `production` on the container (**Secure** cookie). Optional in `.env` for `npm start` on the VPS |
| `SESSION_SECRET` | Yes | Long random string |
| `CLUB_PIN` | Yes | Club PIN (server only) |
| `TRAINER_PIN` | Yes | Trainer-only password for `/report` (different from `CLUB_PIN`) |
| `SPREADSHEET_ID` | Yes | Google Spreadsheet ID |
| `GOOGLE_SERVICE_ACCOUNT` | Yes | `../api-key.json` in `.env` (file at repo root; container `checkin-api` uses `/app/api-key.json`) |
| `TZ` | Recommended | `Europe/Stockholm` (**Club calendar timezone**) |
| `PORT` | In container | Leave `3000` (host maps **3001** → 3000 in `deploy/docker-compose.yml`) |

Local dev and production Docker both use the same repo-root `.env` (see [.env.example](.env.example)); do not commit it.

### Manual test plan

**When closing deploy slice (#09)**

1. `curl -sS https://checkin.your-club-domain/api/health` → `{"status":"ok"}`.
2. Open the site on a phone, enter **Club PIN**, open DevTools (or remote inspect) → Application → Cookies → `checkin_unlock` has **Secure**, **HttpOnly**, **SameSite=Lax**.
3. Complete consent + onboarding, **Checka in** → new row in the current year’s `checkins_YYYY` tab in Sheets.

**After leaderboard slice (#8)**

4. Open **Topplista** — list loads (or empty state) without API errors.

### Add to home screen

After deploy, members can install the app as a shortcut (online-only; no offline cache):

- **iPhone (Safari):** Share → **Lägg till på hemskärmen**.
- **Android (Chrome):** Menu → **Lägg till på startskärmen** / **Installera app**.

The build includes `manifest.webmanifest` and `icon.svg` so the shortcut shows the name **Check-in** and the teal icon.

### Files

| Path | Purpose |
|------|---------|
| `deploy/Caddyfile.snippet` | Paste into existing Caddy config |
| `deploy/docker-compose.yml` | `checkin-api` container (`127.0.0.1:3001`) |
| `scripts/deploy.sh` | Build web, publish static to `/var/www/checkin`, restart API container |

Deploy slice tracked as [GitHub issue #10](https://github.com/MiloBarai/checkin/issues/10) (closed).
