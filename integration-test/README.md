# Integration tests

These integration tests verify extension features by running a full copy of the extension in an instrumented
browser. Most tests work by loading a [test page](https://privacy-test-pages.site/) which will check
that a protection is active.

We use [Playwright](https://playwright.dev/) as a test runner. Tests are defined in the `.spec.js` files in the `integration-tests` folder.

## Running tests

### Playwright

Playwright tests can be run with the following npm commands:
 - `npm run playwright` to test the Chrome MV3 extension
 - `npm run playwright-mv2` to test the Chrome MV2 extension
 - `npm run playwright-firefox` to test the Firefox MV2 extension (experimental)

If you want to re-run tests without rebuilding the extension, you can subsequently run:
 - `npx playwright test` to run all tests
 - `npx playwright test integration-test/<file>.spec.js` to just run tests in a single file.
 - `npx playwright test --config=playwright.firefox.config.js` to run Firefox tests

### Firefox Testing (Experimental)

Firefox extension testing uses Firefox's Remote Debugging Protocol (RDP) to install the extension
as a temporary addon at runtime. This approach has some limitations:

1. **No background page access**: Playwright's Firefox doesn't expose extension background pages,
   so `backgroundPage` will be `null` for Firefox tests. Tests that rely on `backgroundPage.evaluate()`
   will need Firefox-specific handling.

2. **Content script limitations**: Some content script features may not work as expected in
   Playwright's patched Firefox (Juggler).

3. **Requires headed mode**: Firefox extension testing requires a display (or xvfb on CI).

To write Firefox-compatible tests, check the browser type:

```js
import { test, expect, isFirefoxTest } from './helpers/playwrightHarness'

test('my test', async ({ backgroundPage, context }) => {
    if (isFirefoxTest()) {
        // Firefox-specific test logic
        // backgroundPage is null, use context instead
    } else {
        // Chrome test logic
        await backgroundPage.evaluate(() => { /* ... */ })
    }
})
```

## Writing tests

Our Playwright tests wrap the loading of the extension and mock blocklists/config for you, so the
following steps are sufficient to get started:

 1. Create a new file in this folder, with the extension `.spec.js`.
 2. Start with the following boilerplate:

```js
import { test, expect } from './helpers/playwrightHarness'
import { forExtensionLoaded } from './helpers/backgroundWait'

test('my test', async ({ manifestVersion, page, backgroundPage, backgroundNetworkContext, context }) => {
    // wait for the extension to be fully loaded
    await forExtensionLoaded(context)
    expect(false).toBe(true)
})
```

The arguments to the test function are:
 - `manifestVersion`: `2` or `3`. Allows you to check which version of the extension is being tested.
 - `page`: A [Page](https://playwright.dev/docs/api/class-page) instance for loading web pages.
 - `backgroundPage`: The extension's background page, which is a `Page` for MV2, `Worker` for MV3, or `null` for Firefox. Use `backgroundPage.evaluate` to run code in the extension's background context (not available for Firefox).
 - `backgroundNetworkContext`: A context for listening to and intercepting requests from the extension's background context with Playwright's [Network](https://playwright.dev/docs/network) APIs. 
 - `context`: The [BrowserContext](https://playwright.dev/docs/api/class-browsercontext) for the test run.

Static files for tests are in the `data` directory:
 - `har` - [HAR files](./data/har/README.md) for offline tests.
 - `staticcdn` - Mocked CDN resources to used when the extension loads.