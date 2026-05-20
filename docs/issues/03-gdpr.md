## Parent

https://github.com/MiloBarai/checkin/issues/1

## What to build

After PIN unlock, first-time users see a Swedish GDPR consent screen (no marketing analytics in v1). Accept stores consent version in localStorage and allows progression; Decline blocks check-in and shows exit messaging. A `/privacy` page explains Google Sheets storage and club contact info. App routes users through PIN → GDPR → rest of app.

## Acceptance criteria

- [ ] Consent screen in Swedish with Accept / Decline
- [ ] Accept persists `gdprAccepted` + policy version in localStorage; Decline prevents onboarding/check-in
- [ ] Users with current consent version skip the screen
- [ ] Privacy page reachable from consent and later from settings placeholder or footer
- [ ] Navigation guard: no onboarding/home without PIN + GDPR accept
- [ ] No analytics/third-party tracking scripts added

## Blocked by

- #3
