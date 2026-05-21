# Club Check-In

A mobile-first web app for a Stockholm sports club: members check in to training, attendance is logged in Google Sheets, and the public leaderboard respects **Ranking opt-out**.

## Language

**Data processing consent**:
A one-time acknowledgment on this browser (not per **Member** identity) that the club may process name and attendance in Google Sheets before onboarding or check-in. The consent screen states there is no marketing analytics in v1 (also spelled out on the **Privacy policy page**).
_Avoid_: Privacy policy (the document), cookie banner, bundling with **Ranking opt-out**, re-asking on every identity switch

**Consent decline**:
The member refuses **Data processing consent**; the app shows exit messaging only (no onboarding, home, or check-in) but may still link to the privacy policy page. Refusal is not stored in the browser — a later visit shows the consent screen again after **Club unlock**.
_Avoid_: Soft decline that still allows check-in, treating decline as **Ranking opt-out**, persisting a decline flag

**Privacy policy page**:
The Swedish `/privacy` page describing Google Sheets storage and club contact details; readable without **Club unlock** or **Data processing consent**. Static copy in the web app (change via deploy when the club updates text).
_Avoid_: Consent screen (shorter summary + link), **Ranking opt-out** explanation as the main topic, policy version tracking

**Ranking opt-out**:
A **Member** preference to hide their name from the public top-10 list while still seeing their own rank; not part of **Data processing consent**. Stored on the **Members sheet** as `optOutRanking` (`FALSE` = visible on topplista, `TRUE` = hidden); new members default to `FALSE`.
_Avoid_: GDPR consent, privacy toggle (ambiguous), yes/no text in the sheet

**Member**:
A club person who checks in; identified by a stable server-side UUID (`memberId`) assigned by the server on registration (`crypto.randomUUID()`); separate from their display name. Each `POST` registration creates a new row (no name-based dedup in v1); the onboarding UI prevents double-submit. Registration accepts trimmed non-empty `firstName` and `lastName` only (no max length or character rules in v1). Reusing an existing `memberId` on a new phone is explicit in slice #6 (link), not client-supplied on create.
_Avoid_: User, account, profile (when meaning the person), assuming the server merges duplicate name submissions automatically, coaches fixing typos in the spreadsheet, client-generated ids on create

**On-device member identity**:
The browser’s stored `memberId`, `firstName`, and `lastName` (three separate `localStorage` keys) for whoever is using the app on this phone; not validated against Sheets on app load in v1.
_Avoid_: Login session, server-side member session, assuming localStorage implies the row still exists in Sheets, a single JSON blob for member fields

**Members sheet**:
The persistent Google Sheets tab listing every **Member** (one row per `memberId`); if the tab is missing on first registration, the app creates the tab and header row—coaches only need an empty spreadsheet shared with the service account. If the tab exists but row 1 is not the canonical headers, the API refuses read/write until a coach fixes or deletes the tab (no silent header overwrite or column guessing). `createdAt` is set by the server at registration as a wall-clock timestamp in the **Club calendar timezone** (same zone as **Check-in**).
_Avoid_: Yearly attendance tabs (`checkins_YYYY`), assuming coaches hand-type every column header before first use, renaming headers for readability without updating the app, UTC-only timestamps on member rows

**Check-ins sheet** (year tab):
The Google Sheets tab `checkins_YYYY` for one calendar year’s **Check-in** rows (append-only). If missing on first write that year, the app creates the tab and canonical header row (`memberId`, `date`, `displayName`); if the tab exists with wrong headers, the API refuses read/write until a coach fixes or deletes the tab (same strictness as **Members sheet**).
_Avoid_: Coaches pre-creating every future year tab, silent header overwrite, mixing multiple years in one tab, a separate time-of-day column (attendance is per calendar day only)

**Club calendar timezone**:
The IANA timezone for “today”, year tab selection, and row timestamps — from env `TZ` (API default `Europe/Stockholm` if unset). Code reads the configured zone; no hardcoded `Europe/Stockholm` in helpers or `stockholm*` function names.
_Avoid_: Hardcoding Stockholm in `Intl` formatters, assuming the server OS timezone, naming helpers after a city when they use `TZ`

**Check-in date**:
The club-calendar day on a **Check-in** row, stored as `YYYY-MM-DD` in the `date` column; used for “today” and duplicate detection (no time-of-day stored).
_Avoid_: UTC date, ISO timestamps in the `date` column, a separate time-of-day column on the row

**Year check-in count**:
How many **Check-in** rows a **Member** has in the current calendar year’s **Check-ins sheet** (`checkins_YYYY`); one row per day at most. Exposed as `yearCount` on status and check-in responses; increases by one on first check-in that day, unchanged on `already_checked_in`.
_Avoid_: Counting across years, counting before the row exists (client-only guess), including today in a separate field

**Check-in**:
One attendance record for a member on a single calendar day in the **Club calendar timezone**.
_Avoid_: Sign-in, registration

**Check-in display name**:
The full name stored on a **Check-in** row (`displayName` column): trimmed `firstName` + space + `lastName` as sent at check-in time from **On-device member identity**, not re-read from the **Members sheet** when the row is written.
_Avoid_: First-name-only in the log, live lookup from Sheets on every check-in in slice #5, assuming coaches edit names on old attendance rows

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

- **Data processing consent** is required after **Club unlock** and before onboarding or check-in; it is stored on the browser (not on the **Member** row in Sheets in v1) and is not cleared when someone chooses a different **Member** on the same phone; v1 enforcement is client-side only (API does not validate consent)
- **Consent decline** blocks all member-facing routes except the privacy policy page linked from the decline screen
- **Privacy policy page** is public; **Data processing consent** and **Club unlock** gates do not apply to that route
- Accept stores only `gdprAccepted` in the browser (no policy version); if the club changes policy text, coaches ask members to clear site data or accept again manually — no automatic re-prompt in v1
- **Ranking opt-out** is stored on the **Member** record and changed in settings, not on the consent screen
- Display names are corrected by the **Member** in settings (#7), not by coaches editing the **Members sheet** manually
- `POST /api/members` returns `memberId` plus trimmed `firstName` and `lastName` for the client to persist in **On-device member identity** (not `optOutRanking` or `createdAt` in the response)
- `POST /api/members/match` body: `{ firstName, lastName }`; response: `{ candidates: [] }` in #4; in #6 each candidate includes `memberId`, `displayName`, `yearCount` (max 3)
- **Club unlock** is required before member-facing flows (check-in, leaderboard, settings APIs); it is separate from **Member** identity stored in the browser
- After **Data processing consent**, the client shows onboarding until **On-device member identity** exists (`memberId`, `firstName`, `lastName` all present), then home; no server round-trip to verify the member row on load (stale ids surface when a member API runs, e.g. check-in)
- Onboarding is a fourth client gate in `GatedApp` (after PIN and consent, before `AppShell`); not a separate route or overlay on home in v1
- Slice #4 ships `POST /api/members/match` as a stub returning no candidates (`[]`); slice #6 replaces it with fuzzy logic and the “Är det här du?” UI — #4 does not show the confirm screen. Onboarding submit runs **match then create** (skip confirm when `candidates` is empty); same pipeline in #6 when matches exist
- **Member** display name and `memberId` in browser storage are not cleared when **Club unlock** expires or **Club PIN** changes — only the unlock cookie is dropped; the person re-enters **Club PIN** and continues with the same stored identity
- A **Member** has at most one **Check-in** per calendar day
- **Check-in** rows are stored per calendar year on a **Check-ins sheet** (`checkins_YYYY`); **Member** identity persists across years on the **Members sheet**
- Each **Check-in** row stores **Check-in date**, **Check-in display name**, and `memberId`; changing the name in settings (#7) does not rewrite past rows in slice #5
- Duplicate **Check-in** for the same **Member** on the same **Check-in date** returns HTTP `200` with `status: "already_checked_in"` (not an error status); first check-in that day returns `200` with `status: "checked_in"`
- `POST /api/checkin` body: `memberId`, `firstName`, `lastName` (for **Check-in display name**); `GET /api/me/status` query `memberId` — both require **Club unlock**, no member session cookie
- `GET /api/me/status` in slice #5 returns `checkedInToday` and **Year check-in count** (`yearCount`) only (no `rank` until leaderboard slice #8); home loads status on mount to set the check-in button state
- `memberId` missing on the **Members sheet** → `404` `{ "error": "member_not_found" }` on member APIs (check-in, status); client shows Swedish re-onboard messaging, does not auto-create a **Member** on check-in
- `POST /api/checkin` verifies the **Member** row exists before appending to the **Check-ins sheet**; body names are not required to match the **Members sheet** in slice #5 (snapshot only)
- `POST /api/checkin` applies the same trimmed non-empty `firstName` / `lastName` rules as registration (`400` on invalid)

## Example dialogue

> **Dev:** "When a **Member** changes their display name, does their **Check-in** history stay linked?"
> **Domain expert:** "Yes — the UUID is the identity. Old rows keep the **Check-in display name** from that day; new check-ins use the updated name. Typos are fixed by the **Member** in settings, not by coaches editing the sheet."

> **Dev:** "If we change **Club PIN** on the server, do old **Club unlock** cookies still work?"
> **Domain expert:** "No — everyone must enter the new PIN. Same PIN after restart is fine; a new PIN invalidates old unlocks."

> **Dev:** "Does a new PIN wipe the member's saved name?"
> **Domain expert:** "No — names and member id live in browser storage for the **Member**, not in the unlock cookie. PIN only gates the app."

> **Dev:** "Does **Ranking opt-out** belong on the GDPR consent screen?"
> **Domain expert:** "No — consent is only for processing name and attendance in Sheets. Leaderboard visibility is a separate setting later."

> **Dev:** "Ben uses 'I am someone else' on Anna's phone — does Ben see consent again?"
> **Domain expert:** "No — consent is per browser. Anna's accept covers the device; Ben only re-onboards as a **Member**."

> **Dev:** "They tap Decline — can they still read `/privacy`?"
> **Domain expert:** "Yes — exit screen plus policy link. No onboarding or check-in until they accept on a later visit."

> **Dev:** "Can someone open `/privacy` cold, without the club PIN?"
> **Domain expert:** "Yes — it’s public information. PIN and consent still gate check-in and onboarding."

> **Dev:** "Do we remember Decline in localStorage?"
> **Domain expert:** "No — only Accept writes storage. Come back another day and you can accept then."

> **Dev:** "Do we version the policy and re-prompt everyone on change?"
> **Domain expert:** "No — policy rarely changes. Client-only `gdprAccepted`; static `/privacy` copy. Re-consent is a manual edge case if needed."

> **Dev:** "Onboarding isn’t built yet — after Accept in slice #3, where do they go?"
> **Domain expert:** "The existing stub home — proves the gate. Onboarding slots in behind the same guard in #4."

> **Dev:** "Anna still has memberId in localStorage but her row was deleted in Sheets — does she get home on open?"
> **Domain expert:** "Yes in v1 — we only check localStorage for the onboarding gate. Check-in or status returns `member_not_found`; she sees Swedish copy to register again, not a generic 500."

> **Dev:** "Can check-in create a members row if the id is missing?"
> **Domain expert:** "No — only explicit registration or link (#6). Check-in only appends to the year log when the **Member** exists."

> **Dev:** "Coach renamed a column on the members tab — do we map by label?"
> **Domain expert:** "No — fail until headers match what the app created, or delete the tab and let first registration recreate it."

> **Dev:** "Erik double-taps Fortsätt — one or two members?"
> **Domain expert:** "Two rows if both requests succeed — we disable the button instead. Same-name dedup is fuzzy match in #6, not silent merge on create."

> **Dev:** "Do we build fuzzy in #4?"
> **Domain expert:** "No — match endpoint exists but returns empty in #4; real matcher and confirm UI land in #6."

> **Dev:** "Anna taps check-in twice the same day — 409?"
> **Domain expert:** "No — `200` both times with `already_checked_in` on the second. Home disables the button and shows Redan incheckad; no error toast."

## Implementation notes (scaffold)

- Monorepo: npm workspaces, packages `api/` and `web/` at repo root
- Language: JavaScript only (no TypeScript)
- Local dev: Vite on its port; `/api` proxied to Express (browser hits Vite origin only)
- Production (slice #9): **Host Caddy** (already on VPS with other sites) — repo ships a **snippet** to paste into the existing Caddyfile, not a full replacement config. Snippet: dedicated subdomain site block (placeholder `checkin.YOUR_CLUB_DOMAIN` — app at `/`, API at `/api`; no path-prefix deploy in v1), `root` `/var/www/checkin`, SPA fallback, `reverse_proxy /api/*` to API on `127.0.0.1:3001` (host port 3000 in use by another project). SPA from dedicated web root (e.g. `/var/www/checkin`), not the clone path. Deploy: `scripts/deploy.sh` from the git clone (VPS default `~/git/checkin`, overridable via `CHECKIN_REPO`) runs `npm ci` (if needed), `npm run build`, copies `web/dist` → `/var/www/checkin` (`CHECKIN_WEB_ROOT`), then `docker compose up -d --build` for the API (does not edit Caddy). API container: Express for `/api` only; config via repo-root `.env` and `secrets/` mount (`GOOGLE_SERVICE_ACCOUNT=./secrets/service-account.json`); compose sets `NODE_ENV=production`; API Docker publish `127.0.0.1:3001:3000` (container listens on 3000; host 3001). Slice #09 acceptance: production path verified for HTTPS, **Club unlock** cookie (`Secure` + httpOnly on real domain), and check-in → Sheets; leaderboard step in manual test plan applies after slice #8, not a blocker for closing #09
- Add to home screen (slice #9): ship `manifest.webmanifest` + home-screen icon(s) and link from `index.html` (no service worker / offline in v1); README documents iOS/Android “add to home screen” steps for the production URL
- Tests (scaffold): no automated test suite beyond manual `GET /api/health`; root `npm test` is a no-op until E2E slice
- Placeholder UI (scaffold): single page, Swedish copy, Chakra mobile layout, stub bottom nav (Hem / Topplista / Inställningar); product heading **Check-in** (loanword)
- Client routing (slice #3): `react-router-dom`; `/privacy` is a public route outside PIN/consent gates; other paths use the gate stack; stub home includes a footer **Integritet** link to `/privacy` before settings (#7) exists
- Config docs (scaffold): README + `.env.example` list all PRD env vars with purpose; mark which are required per slice (none required for health-only local run except optional `PORT`)
- Health check: `GET /api/health` → `200` JSON `{ "status": "ok" }`
- Session cookie signing: env var `SESSION_SECRET` (required from PIN slice #2 onward)
- Club unlock cookie: `Secure` when `NODE_ENV=production` (or `COOKIE_SECURE=true`); omitted in local development. Production deploy must set `NODE_ENV=production` on the Node process (documented start command / systemd) — `npm start` alone does not set it
- API auth: default-deny middleware on `/api/*` except explicit allowlist (unlock, session, health)
- GDPR slice (#3): client-only gate; `localStorage.gdprAccepted` on Accept; static **Privacy policy page**; `react-router-dom` with `/privacy` public; no `GDPR_POLICY_VERSION` or config API; gate UI manual until a later slice
- Home (slice #5): greeting `Hej, {firstName}!`; then **Year check-in count** as `{yearCount} träningar i år` (between greeting and CTA); enabled **Checka in idag**; after today’s **Check-in**, disabled **Redan incheckad**; status on mount; check-in button `isLoading` until response; personal rank (“plats X”) waits for slice #8
- Slice #5 (check-in): `POST /api/checkin`, `GET /api/me/status`; **Check-ins sheet** auto-create; `api/src/time/clubCalendar.js` uses `TZ`
- Unlock API: `POST /api/unlock` body `{ "pin": "<string>" }`; wrong PIN `401` `{ "error": "invalid_pin" }`; missing/empty pin `400` `{ "error": "invalid_format" }`; Swedish copy on client
- `GET /api/session` → `{ "unlocked": true | false }` only
- PIN UI (slice #2): session check on mount; PIN screen; one numeric-friendly input, no `maxLength`; compare length-agnostic on server
- Unlock rate limit: in-memory cap on `POST /api/unlock` only (e.g. 10 failures / IP / 15 min) → `429` `{ "error": "rate_limited" }`
- Tests (slice #2+): `node --test` in `api/`; root `npm test` runs `npm test -w api`; Sheets tests inject `sheetsAdapter` (in-memory), no live sheet in CI
- Web API calls: shared `apiFetch` with `credentials: 'include'`. Unlock cookie name `checkin_unlock`: `SameSite=Lax`, `httpOnly`, `Path=/`
- PIN slice boot: API refuses to start without `CLUB_PIN` and `SESSION_SECRET`
- Protected `/api/*` without unlock: `401` `{ "error": "unlock_required" }`
- Modules: ESM in both `api` and `web` (`"type": "module"`)
- Google credentials: `GOOGLE_SERVICE_ACCOUNT` is a filesystem path to service-account JSON (not inline JSON in v1)
- Sheets slice (#4): API refuses to start without `SPREADSHEET_ID` and `GOOGLE_SERVICE_ACCOUNT` (same strictness as `CLUB_PIN` / `SESSION_SECRET`)
- Sheets adapter errors (slice #4+, JSON `{ "error": "<code>" }` only): `sheets_unavailable` (503), `sheets_forbidden` (503), `sheet_setup_invalid` (503), `member_create_failed` (500); onboarding and check-in/home reuse the same codes and Swedish mapping (no new codes in slice #5)
- Node: `engines.node` `>=20.11 <21` (document same in README)
- SPA build: Vite outputs to `web/dist`; Express serves `../web/dist` relative to the API package
- **Club calendar timezone**: API sets `process.env.TZ` to `Europe/Stockholm` by default at boot if unset; shared `api/src/time/` helpers (`calendarDateString`, `calendarYear`, `formatTimestamp`) read `TZ` via `Intl` — no hardcoded zone in function names; members/check-in import from there (replace `stockholmTimestamp.js`)
- Production-like local run: `npm start` serves API + `web/dist` only; README documents `npm run build` first; default `PORT` 3000
