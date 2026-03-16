# AGENTS.md

## Cursor Cloud specific instructions

This is the **DuckDuckGo Privacy Extension** — a browser extension for Firefox, Chrome, and Edge. It is a client-side project with no backend services or databases.

### Key commands

All standard dev commands are in `package.json` scripts and `CONTRIBUTING.md`. Quick reference:

- **Install deps:** `npm run install-ci` (runs `make npm` which does `npm ci --ignore-scripts && npm rebuild puppeteer` and installs privacy-test-pages)
- **Lint:** `npm run lint` (ESLint + Prettier + TypeScript + lockfile check)
- **Unit tests:** `npm test` (browser tests via Karma/ChromeHeadless + node tests via Jasmine)
- **Build Chrome dev:** `make dev browser=chrome type=dev` (one-shot build, output in `build/chrome/dev/`)
- **Build Firefox dev:** `make dev browser=firefox type=dev`
- **Watch mode:** `npm run dev-chrome` or `npm run dev-firefox` (rebuilds on file changes)
- **Integration tests:** `npm run playwright` (requires `npx playwright install --with-deps chromium` first)

### Non-obvious caveats

- `rsync` is a required system dependency for the Makefile build — it is not a Node package. Make sure it is installed (`apt-get install rsync`).
- The Karma unit tests use ChromeHeadless via Puppeteer's bundled Chromium (`puppeteer.executablePath()`). No separate Chrome install is needed for unit tests.
- Playwright integration tests require a separate Chromium install via `npx playwright install --with-deps chromium` and need `xvfb-run` on headless Linux (CI uses `xvfb-run --auto-servernum`).
- Font files are fetched from `duckduckgo.com` at build time via `curl`. Builds will still succeed without network access, but fonts will be missing.
- The project uses npm workspaces with two internal packages: `packages/ddg2dnr` and `packages/privacy-grade`.
- Node.js 22 is specified in `.nvmrc`; `engines` field requires `>=20`.
