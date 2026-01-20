import fs from 'fs';
import path from 'path';

/**
 * Override TDS data for Firefox by directly setting the data via background page evaluation.
 * This bypasses the network entirely since Firefox extension requests don't go through Playwright routing.
 * @param {import('./playwrightHarness').FirefoxBackgroundPage} backgroundPage
 * @param {string} tdsFilePath - Path to the TDS JSON file (relative to data directory)
 */
export async function overrideTdsViaBackground(backgroundPage, tdsFilePath) {
    const tdsData = JSON.parse(await fs.promises.readFile(path.join(__dirname, '..', 'data', tdsFilePath), 'utf-8'));

    // Use modify() to merge the test TDS data into the existing data.
    // This is more reliable than overrideDataValue with large data.
    await backgroundPage.evaluate(async (newData) => {
        const tdsLoader = globalThis.components.tds.tds;
        await tdsLoader.modify((currentData) => {
            // Merge trackers, entities, domains from newData into currentData
            return {
                ...currentData,
                trackers: { ...currentData.trackers, ...newData.trackers },
                entities: { ...currentData.entities, ...newData.entities },
                domains: { ...currentData.domains, ...newData.domains },
                cnames: [...(currentData.cnames || []), ...(newData.cnames || [])],
            };
        });
    }, tdsData);
}

/**
 * Override privacy config for Firefox by directly modifying the config via background page evaluation.
 * @param {import('./playwrightHarness').FirefoxBackgroundPage} backgroundPage
 * @param {string} testConfigFilename - Config file with patches to apply
 */
export async function overridePrivacyConfigViaBackground(backgroundPage, testConfigFilename) {
    const filePath = path.resolve(__dirname, '..', 'data', 'configs', testConfigFilename);
    const testConfig = JSON.parse(fs.readFileSync(filePath).toString());

    // Build a patch object from the test config
    // The testConfig has paths like "globalThis.dbg.tds.config.features.X" = value
    const patches = {};
    for (const pathString of Object.keys(testConfig)) {
        const pathParts = pathString.split('.');
        if (pathParts[0] !== 'globalThis' || pathParts[1] !== 'dbg' || pathParts[2] !== 'tds' || pathParts[3] !== 'config') {
            throw new Error(`unknown config patch path: ${pathString}`);
        }
        // Convert path to nested object structure
        const configPath = pathParts.slice(4); // e.g., ['features', 'trackerAllowlist', 'state']
        patches[configPath.join('.')] = testConfig[pathString];
    }

    // Use modify() to apply patches to existing config
    await backgroundPage.evaluate(async (patchObj) => {
        const configLoader = globalThis.components.tds.remoteConfig;
        await configLoader.modify((config) => {
            // Apply each patch
            for (const [patchPath, value] of Object.entries(patchObj)) {
                const parts = patchPath.split('.');
                let target = config;
                for (let i = 0; i < parts.length - 1; i++) {
                    if (!target[parts[i]]) {
                        target[parts[i]] = {};
                    }
                    target = target[parts[i]];
                }
                target[parts[parts.length - 1]] = value;
            }
            return config;
        });
    }, patches);
}

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
        route.fulfill({
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
        route.fulfill({
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
        route.fulfill({
            status: 200,
            body: tds,
            headers: {
                etag: 'test',
            },
        });
    });
}
