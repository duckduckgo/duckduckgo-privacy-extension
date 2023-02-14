import {
    test as base,
    chromium
} from '@playwright/test'
import path from 'path'
import fs from 'fs/promises'

function getManifestVersion () {
    return process.env.npm_lifecycle_event === 'playwright-mv3' ? 3 : 2
}

async function routeLocalResources (route) {
    const url = new URL(route.request().url())
    const localPath = path.join(__dirname, 'data', url.pathname)
    try {
        const body = await fs.readFile(localPath)
        console.log('request served from disk', route.request().url())
        route.fulfill({ status: 200, body })
    } catch (e) {
        console.log('request served from network', route.request().url())
        route.continue()
    }
}

export const mockAtb = {
    majorVersion: 364,
    minorVersion: 2,
    version: 'v364-2'
}

// based off example at https://playwright.dev/docs/chrome-extensions#testing
export const test = base.extend({
    manifestVersion: getManifestVersion(),
    context: async ({ manifestVersion }, use) => {
        const extensionPath =
            manifestVersion === 3 ? 'build/chrome-mv3/dev' : 'build/chrome/dev'
        const pathToExtension = path.join(__dirname, '..', extensionPath)
        const context = await chromium.launchPersistentContext('', {
            headless: false,
            args: [
                `--disable-extensions-except=${pathToExtension}`,
                `--load-extension=${pathToExtension}`
            ]
        })
        // intercept extension install page and use HAR
        context.on('page', (page) => {
            console.log('page', page.url())
            if (page.url().includes('duckduckgo.com/extension-success')) {
                // HAR file generated with the following command:
                // npx playwright open --save-har=data/har/duckduckgo.com/extension-success.har https://duckduckgo.com/extension-success
                page.routeFromHAR(path.join(__dirname, 'data', 'duckduckgo.com', 'extension-success.har'), {
                    notFound: 'abort'
                })
            }
        })
        //
        await use(context)
        await context.close()
    },
    backgroundPage: async ({ context, manifestVersion }, use) => {
        // let background: Page | Worker
        const routeHandler = (route) => {
            const url = route.request().url()
            if (url.startsWith('https://staticcdn.duckduckgo.com/')) {
                return routeLocalResources(route)
            }
            if (url.startsWith('https://duckduckgo.com/atb.js')) {
                return route.fulfill({
                    body: JSON.stringify(mockAtb)
                })
            }
            if (url.startsWith('https://duckduckgo.com/exti')) {
                return route.fulfill({
                    status: 200,
                    body: ''
                })
            }
            route.continue()
        }
        if (manifestVersion === 3) {
            let [background] = context.serviceWorkers()
            if (!background) background = await context.waitForEvent('serviceworker')
            // SW request routing is experimental: https://playwright.dev/docs/service-workers-experimental
            context.route('**/*', routeHandler)
            await use(background)
        } else {
            let [background] = context.backgroundPages()
            if (!background) {
                background = await context.waitForEvent('backgroundpage')
            }

            // Serve extension background requests from local cache
            background.route('**/*', routeHandler)
            await use(background)
        }
    },
    // wraps the 'route' function in a manifest agnostic way
    routeExtensionRequests: async ({ manifestVersion, backgroundPage, context }, use) => {
        if (manifestVersion === 3) {
            await use(context.route.bind(context))
        } else {
            await use(backgroundPage.route.bind(backgroundPage))
        }
    },
    // Use this for listening and modifying network events for both MV2 and MV3
    backgroundNetworkContext: async ({ manifestVersion, backgroundPage, context }, use) => {
        if (manifestVersion === 3) {
            await use(context)
        } else {
            await use(backgroundPage)
        }
    }
})

export const expect = test.expect
