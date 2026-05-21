## Parent

https://github.com/MiloBarai/checkin/issues/1

## What to build

Leaderboard vertical slice: compute current-year training counts from `checkins_YYYY`, exclude opted-out members from public top 10 (full names shown), shared ranks for ties, personal rank always shown to the requester (including when opted out). Home shows “Du ligger på plats X i år”; separate Topplista screen shows top 10.

## Acceptance criteria

- [ ] `GET /api/leaderboard` returns top 10 (full name, count, rank with tie handling) excluding opt-out
- [ ] Same endpoint or `GET /api/me/status` includes requester’s year rank and count when memberId provided
- [ ] Opted-out member absent from top 10 but sees personal rank on home
- [ ] Tie-breaking uses competition-standard shared ranks (e.g. two at #3 → next is #5)
- [ ] Leaderboard module unit tests: ties, opt-out exclusion, year boundary
- [ ] Topplista + home rank snippet in Swedish, mobile-first

## Blocked by