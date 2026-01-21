# Firefox Integration Testing (Experimental)

This document describes Firefox integration testing support for the DuckDuckGo Privacy Extension.

## Overview

Firefox integration tests use the Firefox Remote Debugging Protocol (RDP) to install the extension and communicate with its background page. This is necessary because Playwright's native Firefox extension support is limited.

## Running Firefox Tests

```bash
npm run playwright-firefox
```

Or to run specific tests:

```bash
npx playwright test --config=playwright.firefox.config.js integration-test/firefox-background-eval.spec.js
```

## Architecture

The Firefox test harness consists of:

- **`helpers/firefoxHarness.js`**: Firefox-specific code including the RDP client, extension installation, and `FirefoxBackgroundPage` wrapper class
- **`helpers/playwrightHarness.js`**: Main harness that conditionally uses Firefox or Chrome code
- **`playwright.firefox.config.js`**: Playwright config that lists which test files are compatible with Firefox

## Which Tests Run on Firefox

The Firefox test configuration currently includes:

- `firefox-background-eval.spec.js` - Tests for Firefox background page evaluation via RDP
- `fingerprint-randomization.spec.js` - Tests fingerprint randomization via content scripts
- `gpc.spec.js` - Tests Global Privacy Control injection via content scripts
- `navigator-interface.spec.js` - Tests navigator.duckduckgo interface injection
- `facebook-sdk-schema.spec.js` - Facebook SDK schema tests
- `youtube-sdk-schema.spec.js` - YouTube SDK schema tests

## Known Limitations

### 1. Request Interception for Extension Background Requests

**Issue**: Extension background page requests do not go through Playwright's route interception in Firefox.

**Impact**: This is the primary limitation. Tests that rely on `overridePrivacyConfig()` or `overrideTds()` to mock/intercept requests to `staticcdn.duckduckgo.com` will not work correctly because the extension loads its TDS and config before test routes can be established.

**Affected tests**: Request blocking, storage blocking, AMP protection, click-to-load, GPC, and any test that needs to modify extension behavior via config/TDS overrides.

### 2. Content Script Timing

**Issue**: Content script injection timing differs between Firefox and Chrome.

**Impact**: Tests that rely on specific content script injection timing may be flaky.

### 3. Extension URL Format

**Issue**: Firefox uses `moz-extension://` URLs instead of Chrome's `chrome-extension://` URLs.

**Impact**: Tests that navigate to extension pages (like privacy dashboard) will fail due to Firefox security restrictions.

### 4. Features Not Available on Firefox

The following features are not available on Firefox:
- Fire Button

## Adding New Firefox-Compatible Tests

Tests are compatible with Firefox if they:

1. Don't use `overridePrivacyConfig()` or `overrideTds()` (which require request interception)
2. Don't rely on Chrome-specific content script timing
3. Don't navigate to extension pages
4. Don't use features unavailable on Firefox (Fire Button)

To add a new test:

1. Add the test file path to `firefoxTestFiles` in `playwright.firefox.config.js`
2. Verify it passes: `npx playwright test --config=playwright.firefox.config.js integration-test/your-test.spec.js`

## Removing Firefox Support

If Firefox testing is no longer needed:

1. Delete `helpers/firefoxHarness.js`
2. Remove Firefox-specific code from `helpers/playwrightHarness.js` (search for `isFirefoxTest`)
3. Delete `playwright.firefox.config.js`
4. Delete this file (`FIREFOX.md`)
