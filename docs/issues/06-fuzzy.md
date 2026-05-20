## Parent

https://github.com/MiloBarai/checkin/issues/1

## What to build

On onboarding when localStorage has no memberId, after name entry the server fuzzy-searches existing members (normalized Swedish names, ~85% threshold, up to 3 candidates). UI shows “Är det här du?” with match name and year training count; Yes links existing memberId to localStorage; No creates a new member. Never auto-links without confirmation.

## Acceptance criteria

- [ ] `POST /api/members/match` returns ranked candidates with memberId, display name, yearCount
- [ ] Fuzzy matcher unit tests (normalization, threshold, max 3 results)
- [ ] Confirm screen in Swedish with Yes / No paths
- [ ] Link path calls register/link API reusing existing memberId
- [ ] New member path unchanged from slice 5 behavior
- [ ] No auto-link on high similarity alone

## Blocked by

- #6
