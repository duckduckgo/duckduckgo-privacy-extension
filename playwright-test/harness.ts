import {
    test as base,
    chromium,
    type BrowserContext,
    type Worker,
    type Route,
    type Page,
    type Request,
} from "@playwright/test";
import path from "path";
import fs from "fs/promises";

function getManifestVersion() {
    return process.env.npm_lifecycle_event === "playwright-mv3" ? 3 : 2;
}

async function routeLocalResources(route: Route) {
    const url = new URL(route.request().url());
    const localPath = path.join(__dirname, "data", url.pathname);
    try {
        const body = await fs.readFile(localPath);
        console.log("request served from disk", route.request().url());
        route.fulfill({ status: 200, body });
    } catch (e) {
        console.log("request served from network", route.request().url());
        route.continue();
    }
}

// based off example at https://playwright.dev/docs/chrome-extensions#testing
export const test = base.extend<{
    manifestVersion: 2 | 3;
    context: BrowserContext;
    backgroundPage: Page | Worker;
    routeExtensionRequests: (url: string | RegExp, handler: (route: Route, request: Request) => any) => Promise<void>
}>({
    manifestVersion: getManifestVersion(),
    context: async ({ manifestVersion }, use) => {
        const extensionPath =
            manifestVersion === 3 ? "build/chrome-mv3/dev" : "build/chrome/dev";
        const pathToExtension = path.join(__dirname, "..", extensionPath);
        const context = await chromium.launchPersistentContext("", {
            headless: false,
            args: [
                `--disable-extensions-except=${pathToExtension}`,
                `--load-extension=${pathToExtension}`,
            ],
        });
        // intercept extension install page and use HAR
        context.on("page", (page) => {
            console.log("page", page.url());
            if (page.url().includes("duckduckgo.com/extension-success")) {
                page.routeFromHAR(path.join(__dirname, "data", "postinstall.har"), {
                    notFound: "abort",
                });
            }
        });
        //
        await use(context);
        await context.close();
    },
    backgroundPage: async ({ context, manifestVersion }, use) => {
        // let background: Page | Worker
        if (manifestVersion === 3) {
            let [background] = context.serviceWorkers();
            if (!background) background = await context.waitForEvent("serviceworker");
            // SW request routing is experimental: https://playwright.dev/docs/service-workers-experimental
            context.route(
                "https://staticcdn.duckduckgo.com/**/*",
                routeLocalResources
            );
            await use(background);
        } else {
            let [background] = context.backgroundPages();
            if (!background)
                background = await context.waitForEvent("backgroundpage");

            // Serve extension background requests from local cache
            background.route(
                "https://staticcdn.duckduckgo.com/**/*",
                routeLocalResources
            );
            await use(background);
        }
    }, 
    // wraps the 'route' function in a manifest agnostic way
    routeExtensionRequests: async ({ manifestVersion, backgroundPage, context}, use) => {
        if (manifestVersion === 3) {
            await use(context.route.bind(context))
        } else {
            const page = (backgroundPage as Page)
            await use(page.route.bind(page))
        }
    }
});

export const expect = test.expect;
