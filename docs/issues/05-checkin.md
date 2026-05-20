## Parent

https://github.com/MiloBarai/checkin/issues/1

## What to build

Deliver the core check-in tracer bullet: Stockholm timezone module, yearly `checkins_YYYY` tab writes, idempotent one check-in per member per calendar day, and home screen with greeting + large “Checka in idag” button. Second tap same day shows disabled state / “Redan incheckad” without scary errors. Rows appear in the correct year tab in Google Sheets.

## Acceptance criteria

- [ ] `Europe/Stockholm` used for “today” and current year tab name
- [ ] `POST /api/checkin` appends row (memberId, date, displayName, checkedInAt) or returns already-checked-in
- [ ] Duplicate memberId + date in current year tab rejected idempotently
- [ ] Year tab created automatically if missing (or documented single approach implemented)
- [ ] Home: “Hej, {förnamn}!”, check-in CTA, disabled + Swedish message when done
- [ ] `GET /api/me/status` returns today checked-in flag and year count
- [ ] Unit tests for Stockholm calendar and check-in idempotency (mocked repository)

## Blocked by

- #5
