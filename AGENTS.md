# AGENTS.md

## Cursor Cloud specific instructions

This is the **DuckDuckGo Privacy Extension** — a client-side browser extension for Chrome (MV3), Chrome (MV2), Firefox, and an embedded variant. There are no backend services, databases, or Docker containers to run.

### Key commands

| Task | Command |
|---|---|
| Install deps | `npm install` |
| Lint (all) | `npm run lint` |
| Unit tests | `npm test` |
| Dev build (Chrome) | `npm run dev-chrome` (or `make dev browser=chrome type=dev` for one-shot) |
| Dev build (Firefox) | `npm run dev-firefox` |
| Integration tests | `npm run playwright` |
| TypeScript check | `npm run tsc` |

See `CONTRIBUTING.md` for full documentation on building, linting, and testing.

### Gotchas

- **`rsync` is required** for the build (`make` copy step). It is not installed by default in the Cloud Agent VM — ensure it is available before building.
- The `npm run dev-chrome` / `npm run dev-firefox` commands start a **watch loop** that rebuilds on file changes. For one-shot builds (e.g., before running tests), use `make dev browser=chrome type=dev` instead.
- Build output goes to `build/<browser>/dev/` (dev) or `build/<browser>/release/` (release).
- Fonts are fetched from `duckduckgo.com` at build time via `curl`, so network access is needed for the first build.
- Unit tests use **Karma + headless Chrome** (browser tests) and **Jasmine** (Node tests). Headless Chrome must be available for `npm test` to work.
- Integration tests require **Playwright** browsers. Install them with `npx playwright install chromium` before running `npm run playwright`.
- The project requires **Node.js 22** (see `.nvmrc`). The `engines` field in `package.json` requires `>=20.0.0`.
