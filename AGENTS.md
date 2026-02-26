# AGENTS.md

## Cursor Cloud specific instructions

### Overview

**Banana Padel Tour** — a Next.js 14 full-stack web app for managing padel tournaments. Uses embedded SQLite (better-sqlite3), so no external database is needed.

### Key commands

See `package.json` scripts and `README.md` for full details. Quick reference:

| Task | Command |
|------|---------|
| Dev server | `npm run dev` (port 3000) |
| Dev + WebSocket | `npm run dev:ws` (uses `server.js`) |
| Lint | `npm run lint` |
| Unit tests | `npm run test` (Vitest) |
| E2E tests | `npm run test:e2e` (Playwright) |
| Build | `npm run build` |

### Non-obvious caveats

- **First build race condition**: The very first `npm run build` on a fresh checkout may fail with `SQLITE_BUSY` / "database is locked" because Next.js static page generation triggers concurrent DB initialization. Simply run `npm run build` again and it succeeds. Alternatively, start the dev server first (`npm run dev`, hit `http://localhost:3000` once to initialize the DB), then build.
- **Vitest test failure (pre-existing)**: `npm run test` fails with `TypeError: cache is not a function` in `tests/chat-queries.test.ts`. This is a known issue — React's `cache()` function is only available inside the Next.js server runtime, not in Vitest. The tests themselves are skipped; the suite fails during module import. This is not caused by environment setup.
- **Default credentials**: username `admin`, password `admin123`. Created automatically on first DB initialization.
- **SQLite DB location**: `data/padel.db` (auto-created). Configurable via `DATABASE_PATH` env var.
- **No `.env` file needed**: All environment variables have sensible defaults for development.
- **Playwright**: If running E2E tests, ensure Playwright browsers are installed: `npx playwright install --with-deps chromium`.
