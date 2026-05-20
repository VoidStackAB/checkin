## Parent

https://github.com/MiloBarai/checkin/issues/1

## What to build

Establish the monorepo skeleton so a developer can run the full stack locally: Express API package, React (Vite) SPA with Chakra UI (mobile-first base theme), shared scripts, health endpoint, and Express serving the production SPA build. Include a minimal Swedish placeholder shell and README sections for required environment variables (without production secrets).

## Acceptance criteria

- [ ] Monorepo layout with `api` and `web` packages (or equivalent) and root scripts to install, dev, build, and test
- [ ] `GET /api/health` returns OK
- [ ] React app renders a mobile-friendly Chakra layout in Swedish
- [ ] Production build: API serves static frontend assets from one process (matching future Caddy single-origin setup)
- [ ] README documents local dev commands and env var names stubbed for later slices

## Blocked by

None — can start immediately
