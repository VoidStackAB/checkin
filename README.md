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

Copy `.env.example` to `.env`. The API exits on startup if required variables are missing (`CLUB_PIN`, `SESSION_SECRET`, `SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT`).

| Variable | Required when | Purpose |
|----------|---------------|---------|
| `PORT` | Optional | API port (default `3000`) |
| `TZ` | Optional | Process timezone (API defaults to `Europe/Stockholm`) |
| `SESSION_SECRET` | PIN slice (#2) | Signs the club-unlock session cookie |
| `CLUB_PIN` | PIN slice (#2) | Club PIN (server only; length not fixed) |
| `COOKIE_SECURE` | Optional | Set `true` to force `Secure` cookies in development |
| `SPREADSHEET_ID` | Sheets slice (#4)+ | Google Spreadsheet ID |
| `GOOGLE_SERVICE_ACCOUNT` | Sheets slice (#4)+ | Path to service-account JSON file |

GDPR slice (#3) uses client-only `localStorage.gdprAccepted` and a static `/privacy` page — no extra env vars.

## Repository layout

```
api/          Express API (/api/*, serves web/dist in production)
web/          React + Chakra UI (Vite)
docs/         PRD and implementation issue slices
CONTEXT.md    Domain glossary and scaffold decisions
```
## Setting up Google Sheets

1. Create a [service account](https://console.cloud.google.com/iam-admin/serviceaccounts) (no GCP project roles required for Sheets-only access).
2. Create a JSON key for that account and save it locally (e.g. `./secrets/service-account.json`). Set `GOOGLE_SERVICE_ACCOUNT` in `.env` to that path.
3. Enable the [Google Sheets API](https://console.cloud.google.com/apis/api/sheets.googleapis.com) for your project.
4. Create an empty spreadsheet in Google Drive and copy its ID into `SPREADSHEET_ID` (from the spreadsheet URL).
5. Share the spreadsheet with the service account email (from the JSON `client_email`) as **Editor**.

On first member registration the API creates a `members` tab with headers (`memberId`, `firstName`, `lastName`, `optOutRanking`, `createdAt`). Do not rename those headers manually — fix or delete the tab and register again if the sheet was misconfigured.

CI and local unit tests use an in-memory adapter (no live Google call).

## Deployment note

Production targets a single origin behind Caddy: `/api` → Node, static assets → SPA build. See `docs/issues/09-deploy.md` (later slice).
