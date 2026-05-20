## Parent

https://github.com/MiloBarai/checkin/issues/1

## What to build

End-to-end club PIN gate: member enters a 4-digit PIN on a Swedish mobile screen; server validates against `CLUB_PIN` env var (never exposed to client); on success sets an httpOnly, Secure cookie; protected API routes return 401 without it; returning visitors with a valid cookie skip the PIN screen. Wrong PIN shows a clear Swedish error.

## Acceptance criteria

- [ ] `POST /api/unlock` accepts PIN, sets session cookie on success, 401 on failure
- [ ] `GET /api/session` reports whether the club session cookie is valid
- [ ] Middleware blocks member/check-in/leaderboard routes until unlocked (unlock + health + static privacy exempt)
- [ ] PIN entry UI (Chakra, mobile-first, Swedish)
- [ ] App skips PIN screen when cookie already valid
- [ ] Unit tests for unlock middleware / cookie behavior
- [ ] PIN not stored in localStorage

## Blocked by

- #2
