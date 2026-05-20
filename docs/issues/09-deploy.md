## Parent

https://github.com/MiloBarai/checkin/issues/1

## What to build

Production deployment path for VPS + Caddy: build artifacts, example Caddyfile proxying `/api` to Node and serving SPA, HTTPS, environment checklist (`CLUB_PIN`, `SPREADSHEET_ID`, service account, cookie secret, `TZ=Europe/Stockholm`). Verify httpOnly cookies work on the production domain. Document adding the site to phone home screen.

## Acceptance criteria

- [ ] Production start script or documented `node` invocation
- [ ] Example Caddyfile in repo (or README) for single-domain setup
- [ ] Env var checklist matches all slices
- [ ] Manual test plan: PIN cookie persists, check-in writes to sheet, leaderboard loads
- [ ] README deployment section for Stockholm club VPS

## Blocked by

- #2
- #9
