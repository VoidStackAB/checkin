## Parent

https://github.com/MiloBarai/checkin/issues/1

## What to build

Connect the API to Google Sheets via a service account (credentials server-only). Implement a `members` tab repository and the first onboarding path: after PIN + GDPR, user enters first/last name, server creates a new `memberId` (UUID), persists row in `members`, client stores id + names in localStorage. Document coach steps to create the spreadsheet, share with the service account, and configure env vars (HITL setup by club admin).

## Acceptance criteria

- [ ] Google Sheets adapter reads/writes `members` tab (memberId, firstName, lastName, optOutRanking default false, createdAt)
- [ ] `POST /api/members` creates a new member; returns memberId
- [ ] Onboarding UI collects names, calls API, saves to localStorage
- [ ] Returning user with localStorage skips onboarding to home (home can be stub until check-in slice)
- [ ] README: spreadsheet setup, service account sharing, required env vars
- [ ] Adapter errors map to stable API error responses
- [ ] Tests use mocked adapter or fixture (no live sheet required in CI)

## Blocked by

- #4
