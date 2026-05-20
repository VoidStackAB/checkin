# PRD: Club Training Check-In Application

## Problem Statement

A sports club in Stockholm needs a simple way for members to record attendance when they train, without paper lists or technical friction. Coaches want reliable statistics (who showed up, how often, daily attendance) stored in a familiar tool (Google Sheets) and members want a quick mobile experience. Some members want privacy around public rankings while still seeing their own progress. The club must comply with GDPR with clear consent and minimal tracking.

## Solution

A mobile-first web application (Swedish UI) protected by a shared club PIN. After one-time GDPR consent, members onboard with their name (stored on the device), optionally reclaiming an existing identity via fuzzy name matching on a new phone. A single tap checks them in for today (Stockholm calendar day), with duplicate same-day check-ins prevented. Attendance is appended to a yearly Google Sheets log; member profiles and ranking preferences live in a persistent members sheet. Members see a personal yearly rank, a top-10 leaderboard (full names, excluding those who opted out), and settings to change name, opt out of the public list, or reset identity on the device. Deployment is a VPS behind Caddy with Express API and React + Chakra UI frontend on one domain.

## User Stories

1. As a club member, I want to enter a 4-digit club PIN once on my phone, so that I can access the app without entering it every visit.
2. As a club member, I want the PIN to be validated securely on the server, so that the PIN is not exposed in the client bundle.
3. As a club member, I want my successful PIN entry remembered via a secure cookie, so that returning visits are frictionless.
4. As a club member, I want to see a GDPR consent screen on first use, so that I understand what data is collected before checking in.
5. As a club member, I want to accept or decline GDPR terms, so that I can make an informed choice (decline prevents check-in).
6. As a club member, I want the consent screen to state there is no marketing analytics in v1, so that I am not confused by unnecessary cookie categories.
7. As a club member, I want to read a privacy page explaining Google Sheets storage and contact information, so that I know who controls my data.
8. As a new member, I want to enter my first and last name once during onboarding, so that I do not retype it every training day.
9. As a returning member, I want my name prefilled from local storage, so that check-in stays fast.
10. As a member, I want to change my displayed name in settings, so that typos can be corrected without losing my training history.
11. As a member, I want a stable internal identity (UUID) separate from my display name, so that name changes do not split my statistics.
12. As a member on a new phone, I want the app to suggest existing profiles similar to the name I entered, so that I can reconnect to my history.
13. As a member on a new phone, I want to confirm “Is this you?” before linking to an existing profile, so that I do not accidentally take someone else’s record.
14. As a member on a new phone, I want to decline a suggested match and create a new profile, so that genuinely new members are not blocked.
15. As a member, I want to reset “I am someone else on this phone”, so that a shared or handed-off phone can onboard a different person.
16. As a member, I want a large “Check in today” button on the home screen, so that check-in requires minimal effort.
17. As a member, I want to see a greeting with my first name, so that the app feels personal and confirms the right profile.
18. As a member, I want the check-in button disabled after I have already checked in today, so that I do not accidentally duplicate attendance.
19. As a member, I want clear feedback when already checked in (e.g. “Redan incheckad”), so that I understand the state without error popups.
20. As a member, I want “today” defined by the club timezone (Europe/Stockholm), so that late-evening sessions count on the correct day.
21. As a coach, I want each check-in stored as a row in Google Sheets, so that data is easy to audit and export.
22. As a coach, I want check-ins partitioned by calendar year tabs, so that yearly statistics reset naturally and sheets stay manageable.
23. As a coach, I want a persistent members tab across years, so that member identity and preferences are not duplicated yearly.
24. As a coach, I want at most one check-in per member per calendar day, so that statistics are not inflated by mistakes.
25. As a member, I want to view the top 10 training counts for the current year, so that I can see friendly club competition.
26. As a member, I want full names on the public leaderboard, so that I can recognize people in our small club.
27. As a member who opted out of rankings, I want my name hidden from the public top 10, so that my name is not visible to everyone.
28. As a member who opted out of rankings, I want to still see my personal yearly rank, so that I can track my own progress privately.
29. As a member, I want to toggle ranking opt-out in settings, so that I control visibility without asking a coach.
30. As a member, I want to see “You are ranked X this year” on the home or stats area, so that I understand my standing.
31. As a member, I want tied training counts to share the same rank (competition-standard), so that the leaderboard feels fair.
32. As a member, I want all UI text in Swedish, so that non-technical Swedish-speaking members can use the app confidently.
33. As a club admin, I want the club PIN configured via server environment variables, so that rotation does not require code changes.
34. As a club admin, I want Google Sheets credentials only on the server, so that the spreadsheet is not writable from the browser.
35. As a club admin, I want to share the spreadsheet with a service account, so that the API can read and write attendance.
36. As a deployer, I want Express and the React build served behind Caddy on one domain, so that cookies and HTTPS work reliably on phones.
37. As a member, I want to add the site to my phone home screen, so that opening the app is one tap from the home screen.
38. As a coach, I want optional derived matrix views later from the log data, so that spreadsheet visualization can be added without changing the write model.
39. As a member entering the wrong PIN, I want a clear Swedish error message, so that I know to try again or ask a coach.
40. As a member without GDPR acceptance, I want to be blocked from check-in, so that the club respects consent requirements.

## Implementation Decisions

### Architecture

- Monorepo with two packages: Node/Express API and React (Vite) SPA with Chakra UI.
- Single production domain on VPS; Caddy terminates TLS and routes `/api` to Express and static assets to the SPA build.
- Mobile-first responsive layout; Swedish copy throughout.

### Deep modules (encapsulated, testable interfaces)

1. **Club access (PIN unlock)**  
   - Validates `CLUB_PIN` from environment.  
   - Issues httpOnly, Secure, SameSite=Lax (or Strict) session cookie on success.  
   - Middleware guards all member/check-in/leaderboard routes except unlock, health, and static privacy content.

2. **Stockholm calendar**  
   - Single module exposing “today’s date” (YYYY-MM-DD) and “current year” in `Europe/Stockholm`.  
   - Used by check-in idempotency and year-tab selection.  
   - Rarely changes; high test value.

3. **Member registry**  
   - Create member (new UUID), update display name, update `optOutRanking`, fuzzy search by normalized full name.  
   - Fuzzy matching: normalize (trim, lowercase, fold Swedish characters), return up to 3 candidates above ~85% similarity; never auto-link without client confirmation.  
   - Backed by `members` sheet columns: memberId, firstName, lastName, optOutRanking, createdAt (optional).

4. **Check-in log**  
   - Append row to `checkins_{year}` tab: memberId, date (Stockholm), displayName, checkedInAt (ISO optional).  
   - Before append: reject if row exists for same memberId + date in current year tab.  
   - Auto-create year tab if missing (or document manual pre-creation—pick one behavior at implementation).

5. **Leaderboard & ranking**  
   - Input: all check-in rows for current year + members with optOut flags.  
   - Output: top 10 by count (exclude opt-out from public list), user’s rank and count with shared-rank rules for ties.  
   - Personal rank computed even when opted out of public list.

6. **Google Sheets adapter**  
   - Thin repository: read/write members, append/check duplicate check-ins, list check-ins for year.  
   - Service account JSON from env; spreadsheet ID from env.  
   - All Sheets API errors mapped to stable API error types for the client.

### API contract (behavioral)

| Operation | Behavior |
|-----------|----------|
| Unlock | Body: PIN → Set cookie or 401 |
| Session status | Cookie → whether unlocked |
| Member match | Body: firstName, lastName → candidate list with id, display, yearCount |
| Register / link | Body: names, optional linked memberId → memberId |
| Update member | Cookie + memberId header/body → patch name or optOut |
| Check in | memberId → success or already-checked-in |
| Me status | memberId → today status, year count, rank |
| Leaderboard | top 10 + requester rank (memberId query or header) |

Client stores `memberId`, `firstName`, `lastName`, `gdprAccepted` (and version) in localStorage. Server does not store PIN in localStorage.

### Frontend screens

1. PIN entry (skipped if unlock cookie valid)  
2. GDPR consent (skipped if accepted version stored)  
3. Onboarding / fuzzy confirm  
4. Home (check-in CTA, rank snippet)  
5. Leaderboard  
6. Settings (name, opt-out, reset identity, privacy link)

### Google Sheets schema

- **members**: one row per memberId; persistent across years.  
- **checkins_YYYY**: append-only attendance log per calendar year.  
- Matrix/pivot views: out of scope for v1 (derive later from log).

### Environment configuration

- `CLUB_PIN`, `SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT` (JSON or path), `TZ=Europe/Stockholm`, cookie secret, optional `GDPR_POLICY_VERSION`.

### Security & privacy

- No analytics cookies in v1.  
- Rate-limit PIN attempts (optional v1—document if deferred).  
- CORS not required if same-origin via Caddy.

## Testing Decisions

**What makes a good test:** Assert observable inputs and outputs—HTTP status codes, response shapes, idempotent check-in behavior, rank ordering with ties and opt-outs—without asserting internal Sheets API call order unless testing the adapter with mocks.

**Modules recommended for automated tests:**

| Module | Rationale |
|--------|-----------|
| Stockholm calendar | Pure date logic; edge cases around midnight |
| Fuzzy member matcher | Pure string/normalization logic |
| Leaderboard & ranking | Pure aggregation; ties, opt-out exclusion, shared ranks |
| Check-in service | Idempotency rules with mocked repository |
| PIN unlock middleware | Cookie set/clear, guard behavior |

**Lower priority for unit tests (integration/manual):** Google Sheets adapter against a test spreadsheet or recorded fixtures; full E2E on VPS.

**Prior art:** Greenfield repository—no existing test patterns; establish Vitest (or Jest) for API pure modules and optionally React Testing Library for critical flows (consent gate, disabled check-in button).

**Suggested default (unless triage overrides):** Unit tests for calendar, fuzzy matcher, leaderboard, and check-in service; smoke integration test for API routes with mocked Sheets adapter.

## Out of Scope

- English (or other) UI localization  
- Marketing/analytics cookies (Plausible, GA, etc.)  
- Per-member passwords or OAuth login  
- Coach admin UI for member management (sheet edited manually)  
- Attendance matrix grid tab (derive later from log)  
- Multiple clubs / multi-tenancy  
- Native iOS/Android apps  
- Kiosk/shared-tablet optimized mode  
- Automatic PIN rotation UI  
- Email/SMS notifications  
- Streaks, badges, or training goals beyond yearly count and rank  
- Merging duplicate member records in-app (coach handles in sheet if needed)  
- GDPR consent audit log on server (optional future; v1 client-only flag acceptable if documented)

## Further Notes

- Repository is greenfield (README only); no domain glossary or ADRs yet.  
- GitHub repo: `MiloBarai/checkin`. Label `needs-triage` applied on publish for triage workflow.  
- Coaches should pre-create the spreadsheet, share with service account, and distribute PIN verbally.  
- Recommend documenting Caddy snippet, env vars, and sheet setup in project README during implementation.  
- Home screen leaderboard shows full names; opted-out users omitted from top 10 only.
