import fs from 'fs';
import path from 'path';

/**
 * Rewrites the config received from the server with the changes specified in testConfigFilename
 * @param {import('@playwright/test').Page | import('@playwright/test').BrowserContext} networkContext
 * @param {string} testConfigFilename
 */
export async function overridePrivacyConfig(networkContext, testConfigFilename) {
    const filePath = path.resolve(__dirname, '..', 'data', 'configs', testConfigFilename);
    const testConfig = JSON.parse(fs.readFileSync(filePath).toString());

    await networkContext.route('https://staticcdn.duckduckgo.com/trackerblocking/config/**/*', async (route) => {
        const url = new URL(route.request().url());
        const localPath = path.join(__dirname, '..', 'data', 'staticcdn', url.pathname);
        const localConfig = JSON.parse(fs.readFileSync(localPath));
        for (const pathString of Object.keys(testConfig)) {
            const pathParts = pathString.split('.');
            if (pathParts[0] !== 'globalThis' || pathParts[1] !== 'dbg' || pathParts[2] !== 'tds' || pathParts[3] !== 'config') {
                throw new Error(`unknown config patch path: ${pathString}`);
            }
            let target = localConfig;
            const lastPart = pathParts.pop();
            for (const p of pathParts.slice(4)) {
                target = target[p];
            }
            target[lastPart] = testConfig[pathString];
        }
        return route.fulfill({
            status: 200,
            body: JSON.stringify(localConfig),
            headers: {
                etag: 'test',
            },
        });
    });
}

/**
 * Rewrites the config received from the server with the changes specified in testConfig
 * @param {import('@playwright/test').Page | import('@playwright/test').BrowserContext} networkContext
 * @param {object} testConfig
 */
export async function overridePrivacyConfigFromContent(networkContext, testConfig) {
    await networkContext.route('https://staticcdn.duckduckgo.com/trackerblocking/config/**/*', async (route) => {
        return route.fulfill({
            status: 200,
            body: JSON.stringify(testConfig),
            headers: {
                etag: 'test',
            },
        });
    });
}

/**
 * Rewrites the TDS received from the server with the changes specified in tdsFilePath
 * @param {import('@playwright/test').Page | import('@playwright/test').BrowserContext} networkContext
 * @param {string} tdsFilePath
 */
export async function overrideTds(networkContext, tdsFilePath) {
    await networkContext.route('https://staticcdn.duckduckgo.com/trackerblocking/v6/**/*', async (route) => {
        const tds = await fs.promises.readFile(path.join(__dirname, '..', 'data', tdsFilePath), 'utf-8');
        return route.fulfill({
            status: 200,
            body: tds,
            headers: {
                etag: 'test',
            },
        });
    });
}
