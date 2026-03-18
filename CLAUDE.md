# DuckDuckGo Privacy Extension

Browser extension providing privacy protections for Chrome (MV3) and Firefox. Uses esbuild for bundling, Jasmine + Karma for unit tests, and Playwright for integration tests.

## Architecture

| Component | Location | Notes |
|-----------|----------|-------|
| Background / Service Worker | `shared/js/background/` | Entry: `background.js` → `build/<browser>/*/js/background.js` |
| Components | `shared/js/background/components/` | Modular, DI-based; see `components/README.md` |
| Content scripts | `shared/js/content-scripts/` | C-S-S injection + autofill |
| UI (options, feedback) | `shared/js/ui/` | jQuery + nanohtml templates |
| New Tab tracker stats | `shared/js/newtab/` | Zod-validated schemas |
| Fire button | `shared/js/fire/` | Chrome only |
| DevTools panel | `shared/js/devtools/` | Config inspector, rollouts |
| Popup | `@duckduckgo/privacy-dashboard` | External package; pre-built assets copied at build time |
| Browser manifests | `browsers/<browser>/` | `chrome/`, `chrome-mv2/`, `firefox/` |
| Workspace packages | `packages/ddg2dnr/`, `packages/privacy-grade/` | DNR ruleset generation + privacy grading |
| Styles | `shared/scss/` | SASS → CSS |
| Bundled config | `shared/data/` | Constants, default settings, bundled remote config |
| Locales | `shared/locales/` | i18next ICU |

## Commands

Use `nvm use` to set Node 22 before running commands.

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies (first time) |
| `npm run dev-firefox` | Dev build + watch (Firefox) |
| `npm run dev-chrome` | Dev build + watch (Chrome MV3) |
| `npm run release-firefox` | Release build (Firefox) |
| `npm run release-chrome` | Release build (Chrome) |
| `npm run bundle-config` | Fetch + bundle extension config and tracker lookup |
| `npm run lint` | ESLint + Prettier + TypeScript + lockfile check |
| `npm run lint-fix` | Auto-fix ESLint + Prettier |
| `npm run tsc` | TypeScript check (JSDoc types, `checkJs: true`, `noEmit`) |
| `npm test` | Unit tests (Karma + Node) |
| `npm run test.unit` | Browser unit tests only (Karma + headless Chrome) |
| `npm run test.node` | Node unit tests only |
| `npm run playwright` | Integration tests (Chrome MV3) |
| `npm run playwright-mv2` | Integration tests (Chrome MV2) |
| `npm run validate-pixel-defs` | Validate pixel definition schemas |

## Build System

- **Bundler:** esbuild (orchestrated via `Makefile`)
- **Targets:** `firefox91`, `chrome92`
- **Build defines:** `BUILD_TARGET` (`chrome` / `firefox` / `chrome-mv2`), `DEBUG`, `RELOADER`
- **Dev builds:** Include `dbg` debug object on background, open shadowRoots for CTL, `test=1` param on config requests
- **One-off build (no watch):** `make dev browser=chrome type=dev`
- **Disable auto-reload:** append `reloader=0` (e.g. `npm run dev-chrome reloader=0`)

## Tech Stack

- **Types:** JSDoc annotations checked by TypeScript (`checkJs: true`, `noEmit: true`) — no `.ts` source files
- **UI:** jQuery + custom model/view pattern + nanohtml templates
- **Browser APIs:** `webextension-polyfill`
- **i18n:** i18next with ICU message format
- **Validation:** Zod (newtab schemas)
- **CSS:** SASS

## Key Conventions

### Components pattern

Background features use a component architecture (`shared/js/background/components/`). Components are class-based, receive dependencies via constructor injection, and register message handlers. See `components/README.md` for the full pattern.

### Messaging

- Background message routing via `registerMessageHandler(name, handler)` in `message-handlers.js`
- Popup communicates via `browser.runtime.connect` on port `privacy-dashboard`
- Content script ↔ background: standard `browser.runtime.sendMessage` / `onMessage`

### Remote config + feature flags

`RemoteConfig` component loads `extension-config.json`. Feature flags, rollouts, and cohorts come from `@duckduckgo/privacy-configuration`. Bundled fallback config is in `shared/data/bundled/`.

### External DuckDuckGo packages

| Package | Purpose |
|---------|---------|
| `@duckduckgo/content-scope-scripts` | Injected privacy protections |
| `@duckduckgo/privacy-dashboard` | Popup UI |
| `@duckduckgo/autofill` | Credential autofill |
| `@duckduckgo/privacy-configuration` | Remote config schemas |
| `@duckduckgo/tracker-surrogates` | Tracker surrogate scripts |
| `@duckduckgo/privacy-reference-tests` | Shared privacy reference tests |

To test local changes to any of these, use `npm link` (see `CONTRIBUTING.md`).

### Pixel definitions

Pixel event schemas live in `pixel-definitions/`. Validate with `npm run validate-pixel-defs`.

## Testing

### Unit tests

- **Browser tests** (`unit-test/background/`, `unit-test/ui/`, `unit-test/shared-utils/`): esbuild bundles into `build/test/`, Karma runs in headless Chrome.
- **Node tests** (`unit-test/node/`): esbuild bundles for Node, run with Jasmine.
- Docs: `unit-test/README.md`

### Integration tests

- Playwright loads a dev build of the extension and tests against `privacy-test-pages`.
- MV3: `npm run playwright` — MV2: `npm run playwright-mv2`
- Use `--reporter list` to prevent shell hangs.
- Docs: `integration-test/README.md`

## Notes

- Use `.github/PULL_REQUEST_TEMPLATE.md` when creating pull requests.
- Platform differences (MV2 vs MV3) are handled via `BUILD_TARGET` defines and conditional component inclusion in `background.js`.
- Content Scope Scripts are injected via the messaging content script (MV2) or `chrome.scripting.registerContentScripts` (MV3).
