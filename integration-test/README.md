# Integration tests

These integration tests verify extension features by running a full copy of the extension in an instrumented
browser. Most tests work by loading a [test page](https://privacy-test-pages.site/) which will check
that a protection is active.

We use [Playwright](https://playwright.dev/) as a test runner. Tests are defined in the `.spec.js` files in the `integration-tests` folder.

## Running tests

### Playwright

Playwright tests can be run with the following npm commands:
 - `npm run playwright` to test the Chrome MV3 extension
 - `npm run playwright-mv2` to test the Chrome MV2 extension (closest thing to testing Firefox MV2 extension we have until Playwright adds support for testing Firefox extensions)

To run a specific test file, the commands can be called like this:
 - `npm run playwright -- integration-test/example.spec.js`
 - `npm run playwright-mv2 -- integration-test/example.spec.js`

To check a test's reliability, it can be run repeatedly like this:
 - `npm run playwright -- integration-test/example.spec.js --repeat-each=100`
 - `npm run playwright-mv2 -- integration-test/example.spec.js --repeat-each=100`

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
 - `backgroundPage`: The extension's background page, which is a `Page` for MV2, or `Worker` for MV3. Use `backgroundPage.evaluate` to run code in the extension's background context.
 - `backgroundNetworkContext`: A context for listening to and intercepting requests from the extension's background context with Playwright's [Network](https://playwright.dev/docs/network) APIs. 
 - `context`: The [BrowserContext](https://playwright.dev/docs/api/class-browsercontext) for the test run.

Static files for tests are in the `data` directory:
 - `har` - [HAR files](./data/har/README.md) for offline tests.
 - `staticcdn` - Mocked CDN resources to used when the extension loads.