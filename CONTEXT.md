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
A club person who checks in; identified by a stable server-side UUID (`memberId`) assigned by the server on registration (`crypto.randomUUID()`); separate from their display name. Each `POST` registration without a link creates a new row (no name-based dedup in v1); the onboarding UI prevents double-submit. Registration accepts trimmed non-empty `firstName` and `lastName` only (no max length or character rules in v1). Reusing an existing `memberId` on a new phone is **Member link** (slice #6), not an ad-hoc id on create.
_Avoid_: User, account, profile (when meaning the person), assuming the server merges duplicate name submissions automatically, coaches fixing typos in the spreadsheet, client-generated ids on create

**Member link**:
Onboarding confirmation that an existing **Member** row is the same person on this phone; `POST /api/members` with body `{ memberId }` only (no `firstName` / `lastName` on link) verifies the row exists, returns `memberId` plus sheet `firstName` and `lastName`, and does not append a **Members sheet** row. **On-device member identity** after link uses those response names (not the spelling typed on the name form); the sheet is not updated on link.
_Avoid_: Auto-link from match score alone, a separate link-only route in v1, rewriting the **Members sheet** on link, keeping typed onboarding spelling in localStorage when they picked a candidate

**Match candidate**:
One existing **Member** returned by `POST /api/members/match` for the **Fuzzy match confirm** UI: `memberId`, sheet `firstName` / `lastName`, `displayName` (trimmed sheet `firstName` + space + trimmed sheet `lastName`, for the list only), and **Year check-in count** (`yearCount` from the current year **Check-ins sheet** at match time, same counting rules as status); ranked, at most three per request.
_Avoid_: Treating the list as auto-selected, omitting sheet names when the client needs them for **Member link**, denormalized counts on the **Members sheet**, deferring `yearCount` until after link

**Fuzzy name match**:
Server-side similarity search when onboarding without **On-device member identity**: compare normalized full names (trim, lowercase, fold å/ä→a and ö→o, single `firstName + " " + lastName` string) against every **Members sheet** row using **Levenshtein ratio** `1 - distance / max(len(a), len(b))`; include **Match candidates** with similarity **≥ 0.85**, ranked by score descending then **Members sheet** `createdAt` ascending on ties, max three; never link without **Fuzzy match confirm**.
_Avoid_: Separate first/last thresholds, auto-link on high score, client-side-only matching, treating exactly 85% as below threshold, unpinned string-similarity libraries in tests

**Fuzzy match confirm**:
The onboarding step after name entry when `POST /api/members/match` returns one or more **Match candidates**; one screen lists every candidate (display name and **Year check-in count**). The user selects exactly one row, then confirms with a primary control (*Det är jag* / equivalent) to **Member link** — that control stays disabled until a row is selected. A separate control (*Ingen av dessa* / equivalent) creates a new **Member**. Link does not run on row tap alone. User may go back to the name form; resubmit re-runs **Fuzzy name match** with updated names.
_Avoid_: Auto-picking the top match, showing candidates one-at-a-time in v1, immediate link on row tap, separate confirm routes, trapping the user on confirm with no way to fix a typo, skipping confirm when there is only one high-scoring candidate

**On-device member identity**:
The browser’s stored `memberId`, `firstName`, and `lastName` (three separate `localStorage` keys) for whoever is using the app on this phone; not validated against Sheets on app load in v1.
_Avoid_: Login session, server-side member session, assuming localStorage implies the row still exists in Sheets, a single JSON blob for member fields

**Switch member on device**:
Settings control that clears **On-device member identity** after a destructive confirm, then returns to onboarding. Trigger: *Byt person på telefonen*; confirm dialog explains that PIN and **Data processing consent** stay and the next person must onboard or link. **Club unlock** and consent are unchanged (same browser). Does not delete the **Member** row or check-ins in Sheets.
_Avoid_: Logout, sign out, clearing GDPR or PIN, implying the previous **Member** is removed from the club

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
How many **Check-in** rows a **Member** has in the current calendar year’s **Check-ins sheet** (`checkins_YYYY`); one row per day at most, counted only when `memberId` exists on the **Members sheet** (orphan check-in rows are ignored). Exposed as `yearCount` on status and check-in responses; increases by one on first check-in that day, unchanged on `already_checked_in`.
_Avoid_: Counting across years, counting orphan rows toward unknown ids, counting before the row exists (client-only guess), including today in a separate field

**Shared rank**:
Competition-style placement when **Year check-in count** ties: same count → same rank number; the next lower count skips intervening places (two at #3 → next distinct count is #5).
_Avoid_: Dense rank (1,2,2,3), average rank, re-ranking only the public list differently from personal rank

**Personal year rank**:
Where the requester stands this calendar year by **Year check-in count** among every **Member** on the **Members sheet** (including **Ranking opt-out** and members with zero check-ins this year), using **Shared rank**; exposed as `rank` on `GET /api/me/status` only, not on `GET /api/leaderboard`. Resets with the calendar year in **Club calendar timezone** (new `checkins_YYYY` tab — prior-year rows do not affect count or rank).
_Avoid_: Rank among topplista-visible members only, rank only after first **Check-in**, carrying last year’s count into January, rank on the public leaderboard response, hiding rank when opted out

**Topplista**:
The public leaderboard screen at `/leaderboard` (bottom nav label *Topplista*); non-opt-out **Members sheet** rows with **Year check-in count** ≥ 1 whose **Shared rank** (same global ranking as **Personal year rank**) is ≤ 10 — may be more than ten rows when ties share rank 10; full name from the **Members sheet**; ordered by count descending then `createdAt` ascending within ties. Each **Leaderboard entry** row: rank as a left badge (e.g. `#3`), primary line full name, subtitle `{yearCount} träningar`. When `GET /api/leaderboard` returns no entries, show a Swedish empty state (e.g. no one has checked in this year yet), not placeholder rows; keep the nav item enabled in slice #8.
_Avoid_: Personal rank on this screen, **Check-in display name** on the list, opted-out or zero-count members, a separate renumbered rank for the list only, hiding the tab until data exists, capping at exactly ten rows and splitting a tie at the cutoff

**Leaderboard entry**:
One row on **Topplista**: global **Shared rank** (same number as **Personal year rank** for that **Member**), **Members sheet** `firstName` / `lastName`, and **Year check-in count** for a visible member.
_Avoid_: `memberId` in the public response, a list-only renumbered rank, opted-out members, historical check-in names

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
- `POST /api/members` without `memberId`: body `{ firstName, lastName }` creates a **Member** row; with `memberId` only: **Member link** (no new row). Both return `memberId` plus `firstName` and `lastName` for **On-device member identity** (from sheet on link, from body on create; not `optOutRanking` or `createdAt`); invalid or unknown `memberId` on link → `404` `member_not_found`
- `POST /api/members/match` body: `{ firstName, lastName }`; response: `{ candidates: [] }` in #4; in #6 **Fuzzy name match** loads **Members sheet** plus current-year **Check-ins sheet** to build ranked **Match candidates** (max 3)
- **Club unlock** is required before member-facing flows (check-in, leaderboard, settings APIs); it is separate from **Member** identity stored in the browser
- After **Data processing consent**, the client shows onboarding until **On-device member identity** exists (`memberId`, `firstName`, `lastName` all present), then home; no server round-trip to verify the member row on load (stale ids surface when a member API runs, e.g. check-in)
- Onboarding is a fourth client gate in `GatedApp` (after PIN and consent, before member routes); not a separate route or overlay on home in v1
- Member app routes (slice #7+): behind the same gate stack, `react-router-dom` paths `/` (Hem), `/settings` (Inställningar); shared shell with bottom nav (`RouterLink`, active `aria-current`). `/privacy` stays public outside gates; Topplista adds `/leaderboard` in slice #8 the same way
- Slice #4 ships `POST /api/members/match` as a stub returning no candidates (`[]`); slice #6 replaces it with fuzzy logic and **Fuzzy match confirm** (“Är det här du?”) — #4 does not show that screen. Onboarding submit runs **match then create** when `candidates` is empty; when non-empty, show **Fuzzy match confirm** then **Member link** (sheet names on device) or `POST /api/members` create with the same trimmed names as the onboarding form (*Ingen av dessa* — unchanged from slice #5)
- **Member** display name and `memberId` in browser storage are not cleared when **Club unlock** expires or **Club PIN** changes — only the unlock cookie is dropped; the person re-enters **Club PIN** and continues with the same stored identity
- A **Member** has at most one **Check-in** per calendar day
- **Check-in** rows are stored per calendar year on a **Check-ins sheet** (`checkins_YYYY`); **Member** identity persists across years on the **Members sheet**
- Each **Check-in** row stores **Check-in date**, **Check-in display name**, and `memberId`; changing the name in settings (#7) does not rewrite past rows in slice #5
- Duplicate **Check-in** for the same **Member** on the same **Check-in date** returns HTTP `200` with `status: "already_checked_in"` (not an error status); first check-in that day returns `200` with `status: "checked_in"`
- `POST /api/checkin` body: `memberId`, `firstName`, `lastName` (for **Check-in display name**); `GET /api/me/status` query `memberId` — both require **Club unlock**, no member session cookie
- `GET /api/me/status` in slice #5 returns `checkedInToday` and **Year check-in count** (`yearCount`) only; from settings slice #7 it also returns sheet-backed `firstName`, `lastName`, and `optOutRanking` for the requested `memberId` (same query param as today). Slice #8 adds **Personal year rank** as `rank` on the same call; home shows *Du ligger på plats {rank} i år* (or equivalent) using `rank` and `yearCount` from status only
- `GET /api/leaderboard` (slice #8) returns public **Leaderboard entry** rows: non-opt-out, **Year check-in count** ≥ 1, global **Shared rank** ≤ 10 (no requester fields, no `memberId`); **Club unlock** required; client passes no identity on this route in v1
- Settings slice #7 does not add a separate GET member endpoint — one status read avoids duplicate Sheets lookups
- `PATCH /api/members/me` (slice #7): body requires `memberId` (no server-side **Member** session; path `/me` means the client-asserted identity, not cookie-derived). Optional `firstName`, `lastName`, `optOutRanking` — any subset; if either name field is sent, both are required and validated like registration. Response returns updated `memberId`, `firstName`, `lastName`, `optOutRanking`. Opt-out toggle may PATCH only `optOutRanking`; name save sends both names
- After a successful `GET /api/me/status`, if sheet `firstName` / `lastName` differ from **On-device member identity**, the client updates localStorage to match the sheet (silent sync; home greeting stays accurate after **Member link** or another device’s name edit)
- **Switch member on device** (settings #7): destructive confirm in Swedish, then `clearMemberIdentity` and onboarding gate; PIN and `gdprAccepted` remain
- Settings UI (slice #7): **Ranking opt-out** toggle PATCHes on change (revert toggle + show error if request fails); name fields use an explicit *Spara* control, enabled only when values differ from the last loaded sheet names; successful name PATCH updates **On-device member identity**. Swedish: opt-out label *Dölj mig från topplistan* with helper *Du syns inte i den offentliga listan. Din egen statistik på hem skärmen påverkas inte.*; **Switch member on device** trigger *Byt person på telefonen* (full meaning in confirm)
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

> **Dev:** "Anna taps Ja on the confirm screen — new API route?"
> **Domain expert:** "Same `POST /api/members` with her chosen `memberId` from the candidate. Server checks the row exists, no duplicate member row. localStorage gets first/last from the sheet row she picked — if she typed Carl but chose Karl’s row, home says Karl."

> **Dev:** "Does link POST need the typo names in the body?"
> **Domain expert:** "No — only `memberId`. Response carries sheet first/last; client stores that. Create still sends both names."

> **Dev:** "Three fuzzy hits — three screens or one?"
> **Domain expert:** "One screen, all candidates listed. She taps the row that is her, or one control for 'none of these' which creates a new member. No wizard through each name."

> **Dev:** "Match on first and last separately?"
> **Domain expert:** "No — one normalized full-name string per person, one similarity score, rank and take up to three above the threshold."

> **Dev:** "Where does yearCount on the confirm list come from?"
> **Domain expert:** "Same live count as status — read this year's check-ins tab when match runs, count rows per candidate memberId. No extra column on members."

> **Dev:** "Tap a row and we link immediately?"
> **Domain expert:** "No — select a row, then press the confirm button. Bottom button for none of these → new member. Two deliberate steps before link."

> **Dev:** "They reject all candidates — which names hit the new row?"
> **Domain expert:** "What they typed on the first onboarding form, same as slice #5. Match was only to offer link, not to change the create payload."

> **Dev:** "Two members score 0.92 — who is listed first?"
> **Domain expert:** "Higher score wins; if tied, the member row with the earlier createdAt on the sheet. Same rule anywhere we cap at three."

> **Dev:** "Wrong spelling on the confirm list — stuck?"
> **Domain expert:** "Back to the name step and Fortsätt again. Match runs fresh; we don't lock them into the first query."

> **Dev:** "One candidate at 0.98 — skip the confirm screen?"
> **Domain expert:** "No — still one row, still select plus Det är jag. High score never auto-links."

> **Dev:** "Anna taps check-in twice the same day — 409?"
> **Domain expert:** "No — `200` both times with `already_checked_in` on the second. Home disables the button and shows Redan incheckad; no error toast."

> **Dev:** "Erik linked on a new phone but opted out years ago — settings toggle wrong until he flips it?"
> **Domain expert:** "No — `GET /api/me/status` returns `optOutRanking` from the **Members sheet**. Settings reads that on open; we don't guess from localStorage."

> **Dev:** "Do we need a separate GET just for settings?"
> **Domain expert:** "No — extend status in #7. Leaderboard adds `rank` in #8 on the same call."

> **Dev:** "Can she toggle topplista without resubmitting her name?"
> **Domain expert:** "Yes — PATCH with only `memberId` and `optOutRanking`. Name save sends both names; same validation as onboarding."

> **Dev:** "Personal rank on leaderboard GET or status?"
> **Domain expert:** "Status only — home already loads it. Leaderboard endpoint is just the public top list."

> **Dev:** "Erik opted out with 12 trainings — is he still #2 on home?"
> **Domain expert:** "Yes — personal rank is against everyone on the members sheet, opt-out or not. He just doesn't appear on Topplista."

> **Dev:** "Anna registered but never checked in — plats?"
> **Domain expert:** "She's in the pool with yearCount 0, shared rank with everyone else at zero. Home can show plats and noll träningar."

> **Dev:** "Four people tie for 10th on count — three rows or thirteen?"
> **Domain expert:** "All four — topplista is everyone at rank 10 or better, not a hard row cap. Ties at the boundary stay fair."

> **Dev:** "Thirty members at zero trainings — on Topplista?"
> **Domain expert:** "No — public list only includes people with at least one check-in this year. Home rank still counts everyone on the members sheet."

> **Dev:** "Plats on Hem doesn't match Topplista rank column?"
> **Domain expert:** "Same global rank everywhere — topplista just hides opt-out and zero-count rows, it doesn't renumber."

> **Dev:** "Check-in row for a deleted memberId — skew the board?"
> **Domain expert:** "Ignore it — only members sheet rows get counts and ranks. Junk rows don't move anyone else's plats."

> **Dev:** "Plats line above or below träningar i år?"
> **Domain expert:** "Below, inside the same card — one stats block, one skeleton."

> **Dev:** "1 January, no 2027 rows yet — rank from 2026?"
> **Domain expert:** "No — new year tab, everyone at zero count, fresh ranks. Topplista empty until someone checks in."

> **Dev:** "She linked on a new phone — home still says the typo she typed?"
> **Domain expert:** "Status returns sheet names; client overwrites localStorage when they differ. Greeting matches the **Members sheet** after the next status load."

> **Dev:** "Ben taps 'someone else' by mistake on Anna's phone — instant onboarding?"
> **Domain expert:** "No — confirm first after *Byt person på telefonen*. Dialog says PIN and consent stay; he must onboard or link. Sheets row untouched."

> **Dev:** "Is that logout?"
> **Domain expert:** "No — **Switch member on device**. Only the three member keys clear, not unlock or GDPR."

> **Dev:** "She fixes a typo — PATCH on every keystroke?"
> **Domain expert:** "No — *Spara* when both names are ready. Opt-out is different: toggle PATCHes immediately; failed request rolls the toggle back."

> **Dev:** "Inställningar — new route or just swap the main card?"
> **Domain expert:** "`/settings` with the same bottom nav as Hem. Browser back works. Leaderboard gets its own path in #8."

## Implementation notes (scaffold)

- Monorepo: npm workspaces, packages `api/` and `web/` at repo root
- Language: JavaScript only (no TypeScript)
- Local dev: Vite on its port; `/api` proxied to Express (browser hits Vite origin only)
- Production (slice #9): **Host Caddy** (already on VPS with other sites) — repo ships a **snippet** to paste into the existing Caddyfile, not a full replacement config. Snippet: dedicated subdomain site block (placeholder `checkin.YOUR_CLUB_DOMAIN` — app at `/`, API at `/api`; no path-prefix deploy in v1), `root` `/var/www/checkin`, SPA fallback, `reverse_proxy /api/*` to API on `127.0.0.1:3001` (host port 3000 in use by another project). SPA from dedicated web root (e.g. `/var/www/checkin`), not the clone path. Deploy: `scripts/deploy.sh` from the git clone (VPS default `~/git/checkin`, overridable via `CHECKIN_REPO`) runs `npm ci` (if needed), `npm run build`, copies `web/dist` → `/var/www/checkin` (`CHECKIN_WEB_ROOT`), then `docker compose up -d --build` for the API (does not edit Caddy). API container: Express for `/api` only; config via repo-root `.env` and `api-key.json` mount (container `checkin-api`, `GOOGLE_SERVICE_ACCOUNT=/app/api-key.json`); compose sets `NODE_ENV=production`; API Docker publish `127.0.0.1:3001:3000` (container listens on 3000; host 3001). Slice #09 acceptance: production path verified for HTTPS, **Club unlock** cookie (`Secure` + httpOnly on real domain), and check-in → Sheets; leaderboard step in manual test plan applies after slice #8, not a blocker for closing #09
- Add to home screen (slice #9): ship `manifest.webmanifest` + home-screen icon(s) and link from `index.html` (no service worker / offline in v1); README documents iOS/Android “add to home screen” steps for the production URL
- Tests (scaffold): no automated test suite beyond manual `GET /api/health`; root `npm test` is a no-op until E2E slice
- Placeholder UI (scaffold): single page, Swedish copy, Chakra mobile layout, stub bottom nav (Hem / Topplista / Inställningar); product heading **Check-in** (loanword)
- Client routing (slice #3): `react-router-dom`; `/privacy` is a public route outside PIN/consent gates; other paths use the gate stack; **Integritet** link to `/privacy` lives on Inställningar only (consent/decline screens keep their own policy links)
- Config docs (scaffold): README + `.env.example` list all PRD env vars with purpose; mark which are required per slice (none required for health-only local run except optional `PORT`)
- Health check: `GET /api/health` → `200` JSON `{ "status": "ok" }`
- Session cookie signing: env var `SESSION_SECRET` (required from PIN slice #2 onward)
- Club unlock cookie: `Secure` when `NODE_ENV=production` (or `COOKIE_SECURE=true`); omitted in local development. Production deploy must set `NODE_ENV=production` on the Node process (documented start command / systemd) — `npm start` alone does not set it
- API auth: default-deny middleware on `/api/*` except explicit allowlist (unlock, session, health)
- GDPR slice (#3): client-only gate; `localStorage.gdprAccepted` on Accept; static **Privacy policy page**; `react-router-dom` with `/privacy` public; no `GDPR_POLICY_VERSION` or config API; gate UI manual until a later slice
- Home (slice #5): greeting `Hej, {firstName}!`; stat card with incheckad status, **Year check-in count**, then **Personal year rank** copy *Du ligger på plats {rank} i år* directly under *träningar i år* (same card, same status load/skeleton); check-in CTA below; enabled **Checka in idag** / disabled **Redan incheckad**; rank always shown when status succeeds (including rank > 10 and **Ranking opt-out**)
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
