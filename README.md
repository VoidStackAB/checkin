# Check-in

Mobile-first training check-in for a sports club (Swedish UI). Monorepo: Express API + React (Vite) SPA.

## Requirements

- Node.js `>=20.11 <21` (see `package.json` `engines`)

## Quick start

```bash
npm install
cp .env.example .env   # set CLUB_PIN and SESSION_SECRET for PIN slice
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

Copy `.env.example` to `.env`. PIN slice (#2) requires `CLUB_PIN` and `SESSION_SECRET` — the API exits on startup if either is missing.

| Variable | Required when | Purpose |
|----------|---------------|---------|
| `PORT` | Optional | API port (default `3000`) |
| `TZ` | Optional | Process timezone (API defaults to `Europe/Stockholm`) |
| `SESSION_SECRET` | PIN slice (#2) | Signs the club-unlock session cookie |
| `CLUB_PIN` | PIN slice (#2) | Club PIN (server only; length not fixed) |
| `COOKIE_SECURE` | Optional | Set `true` to force `Secure` cookies in development |
| `SPREADSHEET_ID` | Sheets slice (#4) | Google Spreadsheet ID |
| `GOOGLE_SERVICE_ACCOUNT` | Sheets slice (#4) | Path to service-account JSON file |
| `GDPR_POLICY_VERSION` | GDPR slice (#3) | Consent version string clients must accept |

## Repository layout

```
api/          Express API (/api/*, serves web/dist in production)
web/          React + Chakra UI (Vite)
docs/         PRD and implementation issue slices
CONTEXT.md    Domain glossary and scaffold decisions
```
## Setting up Google

- Create a [Service account](https://console.cloud.google.com/iam-admin/serviceaccounts) without any permissions.
- Create a API Key for service account and donwload, insert API key location in .env
- Enable google [sheets API](https://console.cloud.google.com/apis/api/sheets.googleapis.com)

## Deployment note

Production targets a single origin behind Caddy: `/api` → Node, static assets → SPA build. See `docs/issues/09-deploy.md` (later slice).
