# Club Check-In

A mobile-first web app for a Stockholm sports club: members check in to training, attendance is logged in Google Sheets, and rankings respect privacy opt-out.

## Language

**Member**:
A club person who checks in; identified by a stable server-side UUID separate from their display name.
_Avoid_: User, account, profile (when meaning the person)

**Check-in**:
One attendance record for a member on a single calendar day (Europe/Stockholm).
_Avoid_: Sign-in, registration

**Club PIN**:
A shared 4-digit code that unlocks the app; validated only on the server.
_Avoid_: Password, login code

**Check-in app** (product name in UI):
The member-facing product labeled “Check-in” in Swedish UI (loanword in headings).
_Avoid_: Using “Incheckning” as the app title (use for action copy later, e.g. check-in button)

## Relationships

- A **Member** has at most one **Check-in** per calendar day
- **Check-in** rows are stored per calendar year; **Member** identity persists across years

## Example dialogue

> **Dev:** "When a **Member** changes their display name, does their **Check-in** history stay linked?"
> **Domain expert:** "Yes — the UUID is the identity; the name on old rows can stay as it was or we update display going forward — that's a later slice decision."

## Implementation notes (scaffold)

- Monorepo: npm workspaces, packages `api/` and `web/` at repo root
- Language: JavaScript only (no TypeScript)
- Local dev: Vite on its port; `/api` proxied to Express (browser hits Vite origin only)
- Production: Express serves `web` build at `/`; all HTTP API under `/api/*`; SPA `index.html` fallback for non-API GETs
- Tests (scaffold): no automated test suite beyond manual `GET /api/health`; root `npm test` is a no-op until E2E slice
- Placeholder UI (scaffold): single page, Swedish copy, Chakra mobile layout, stub bottom nav (Hem / Topplista / Inställningar); no client router yet; product heading **Check-in** (loanword)
- Config docs (scaffold): README + `.env.example` list all PRD env vars with purpose; mark which are required per slice (none required for health-only local run except optional `PORT`)
- Health check: `GET /api/health` → `200` JSON `{ "status": "ok" }`
- Session cookie signing: env var `SESSION_SECRET` (required from PIN slice #2 onward)
- Modules: ESM in both `api` and `web` (`"type": "module"`)
- Google credentials: `GOOGLE_SERVICE_ACCOUNT` is a filesystem path to service-account JSON (not inline JSON in v1)
- Node: `engines.node` `>=20.11 <21` (document same in README)
- SPA build: Vite outputs to `web/dist`; Express serves `../web/dist` relative to the API package
- Timezone: API sets `process.env.TZ` to `Europe/Stockholm` by default at boot; `TZ` still documented in `.env.example`
- Production-like local run: `npm start` serves API + `web/dist` only; README documents `npm run build` first; default `PORT` 3000
