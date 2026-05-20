## Parent

https://github.com/MiloBarai/checkin/issues/1

## What to build

Settings screen: change first/last name (same memberId, updates `members` sheet + localStorage), toggle “hide me from topplista” (`optOutRanking`), and “Jag är någon annan på den här telefonen” clearing localStorage member data and returning to onboarding. Privacy page link included.

## Acceptance criteria

- [ ] `PATCH /api/members/me` updates name and/or optOutRanking in Sheets + returns updated member
- [ ] Name change does not change memberId or lose check-in history
- [ ] Opt-out persists in `members` tab
- [ ] Reset clears member localStorage and routes to onboarding (PIN/GDPR remain)
- [ ] Settings UI mobile-first, Swedish
- [ ] Tests cover PATCH behavior with mocked repository

## Blocked by

- #6
