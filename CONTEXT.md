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
A shared secret code that unlocks the app; length is defined only in server config (`CLUB_PIN`), not fixed to four digits. Validated only on the server.
_Avoid_: Password, login code; implying a fixed digit count in the UI (no `maxLength`, no “four digits” hint)

**Club unlock**:
The app is past the PIN gate for this browser; not a **Member** login. Represented by a signed httpOnly cookie that lasts until the browser clears it. The server rejects the cookie if **Club PIN** in config no longer matches the PIN that was used to issue it (e.g. deploy/restart with a new PIN).
_Avoid_: Club session, login, authenticated user

**Check-in app** (product name in UI):
The member-facing product labeled “Check-in” in Swedish UI (loanword in headings).
_Avoid_: Using “Incheckning” as the app title (use for action copy later, e.g. check-in button)

## Relationships

- **Club unlock** is required before member-facing flows (check-in, leaderboard, settings APIs); it is separate from **Member** identity stored in the browser
- **Member** display name and `memberId` in browser storage are not cleared when **Club unlock** expires or **Club PIN** changes — only the unlock cookie is dropped; the person re-enters **Club PIN** and continues with the same stored identity
- A **Member** has at most one **Check-in** per calendar day
- **Check-in** rows are stored per calendar year; **Member** identity persists across years

## Example dialogue

> **Dev:** "When a **Member** changes their display name, does their **Check-in** history stay linked?"
> **Domain expert:** "Yes — the UUID is the identity; the name on old rows can stay as it was or we update display going forward — that's a later slice decision."

> **Dev:** "If we change **Club PIN** on the server, do old **Club unlock** cookies still work?"
> **Domain expert:** "No — everyone must enter the new PIN. Same PIN after restart is fine; a new PIN invalidates old unlocks."

> **Dev:** "Does a new PIN wipe the member's saved name?"
> **Domain expert:** "No — names and member id live in browser storage for the **Member**, not in the unlock cookie. PIN only gates the app."

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
- Club unlock cookie: `Secure` in production; omitted in local development (optional `COOKIE_SECURE=true` to force)
- API auth: default-deny middleware on `/api/*` except explicit allowlist (unlock, session, health, and later privacy-related API if any)
- Unlock API: `POST /api/unlock` body `{ "pin": "<string>" }`; wrong PIN `401` `{ "error": "invalid_pin" }`; missing/empty pin `400` `{ "error": "invalid_format" }`; Swedish copy on client
- `GET /api/session` → `{ "unlocked": true | false }` only
- PIN UI (slice #2): single `App.jsx` gate — session check on mount; PIN screen OR main shell, no client router yet; one numeric-friendly input, no `maxLength`; compare length-agnostic on server
- Unlock rate limit: in-memory cap on `POST /api/unlock` only (e.g. 10 failures / IP / 15 min) → `429` `{ "error": "rate_limited" }`
- Tests (slice #2): `node --test` in `api/`; root `npm test` runs `npm test -w api`
- Web API calls: shared `apiFetch` with `credentials: 'include'`. Unlock cookie name `checkin_unlock`: `SameSite=Lax`, `httpOnly`, `Path=/`
- PIN slice boot: API refuses to start without `CLUB_PIN` and `SESSION_SECRET`
- Protected `/api/*` without unlock: `401` `{ "error": "unlock_required" }`
- Modules: ESM in both `api` and `web` (`"type": "module"`)
- Google credentials: `GOOGLE_SERVICE_ACCOUNT` is a filesystem path to service-account JSON (not inline JSON in v1)
- Node: `engines.node` `>=20.11 <21` (document same in README)
- SPA build: Vite outputs to `web/dist`; Express serves `../web/dist` relative to the API package
- Timezone: API sets `process.env.TZ` to `Europe/Stockholm` by default at boot; `TZ` still documented in `.env.example`
- Production-like local run: `npm start` serves API + `web/dist` only; README documents `npm run build` first; default `PORT` 3000
