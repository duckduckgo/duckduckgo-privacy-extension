# Integration tests

These integration tests verify extension features by running a full copy of the extension in an instrumented
browser. Most tests work by loading a [test page](https://privacy-test-pages.glitch.me/) which will check
that a protection is active.

We currently have two test runners for integration tests:
 1. [Playwright](https://playwright.dev/) - recommended for new tests. These tests are defined in the `.spec.js` files in this folder.
 2. Jasmime + puppeteer - legacy tests. Jasmine config is in `config.json` and `config-mv3.json`, and the tests are in the `background` folder.

## Running tests

### Playwright

Playwright tests can be run with the following npm commands:
 - `npm run playwright` to test the MV2 extension
 - `npm run playwright-mv3` for MV3.

If you want to re-run tests without rebuilding the extension, you can subsequently run:
 - `npx playwright test` to run all tests
 - `npx playright test integration-test/<file>.spec.js` to just run tests in a single file.

### Legacy

Legacy integration tests can be run with the following npm commands:
 - `npm run test-int`
 - `npm run test-int-mv3`

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
 - `backgroundPage`: The extension's background page, which is a `Page` for MV3, or `Worker` for MV3. Use `backgroundPage.evaluate` to run code in the extension's background context.
- `backgroundNetworkContext`: A context for listening to and intercepting requests from the extension's background context with Playwright's [Network](https://playwright.dev/docs/network) APIs.
- `context`: The [BrowserContext](https://playwright.dev/docs/api/class-browsercontext) for the test run.
