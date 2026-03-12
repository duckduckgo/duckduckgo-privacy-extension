# AGENTS.md

## Cursor Cloud specific instructions

This is the **DuckDuckGo Privacy Browser Extension** — a single-product repo that builds for Chrome (MV3), Firefox (MV2), and an Embedded target. It uses npm workspaces with two local packages: `packages/privacy-grade` and `packages/ddg2dnr`.

### Prerequisites

- Node.js 22 (see `.nvmrc`), npm >=10
- System tools: `make`, `rsync`, `curl` (`rsync` is not pre-installed on all cloud VMs — install with `sudo apt-get install -y rsync` if missing)

### Key commands

Commands are documented in `CONTRIBUTING.md` and `package.json`. Quick reference:

| Task | Command |
|---|---|
| Install deps | `npm install` |
| Lint (all) | `npm run lint` |
| Unit tests | `npm test` |
| Build Chrome dev | `npm run dev-chrome` (watch mode) or `make dev browser=chrome type=dev` (one-shot) |
| Build Firefox dev | `npm run dev-firefox` |
| Integration tests | `npm run playwright` (MV3) / `npm run playwright-mv2` (MV2) |

### Non-obvious caveats

- After `npm install`, you must also install privacy-test-pages dependencies for integration tests: `cd node_modules/privacy-test-pages && npm install && cd -`.
- Playwright Chromium browser must be installed separately: `npx playwright install --with-deps chromium`.
- The `npm run dev-chrome` / `npm run dev-firefox` commands start a watch loop. For a one-shot dev build, use `make dev browser=chrome type=dev` directly.
- The dev build output goes to `build/chrome/dev/` (or `build/firefox/dev/`). Load this as an unpacked extension in Chrome via `chrome://extensions/` with Developer mode enabled.
- Unit tests (`npm test`) run Karma with headless Chromium (via Puppeteer) — no display server needed.
- Fonts are fetched from `duckduckgo.com` at build time via `curl`; builds will fail without network access.
- The Smarter Encryption data for Chrome builds is also fetched from `staticcdn.duckduckgo.com` at build time.
