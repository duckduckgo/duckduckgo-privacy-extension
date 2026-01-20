import fs from 'fs';
import path from 'path';

/**
 * Override TDS data for Firefox by directly setting the data via background page evaluation.
 * This bypasses the network entirely since Firefox extension requests don't go through Playwright routing.
 * Uses chunked RDP transfer for large data.
 * @param {import('./playwrightHarness').FirefoxBackgroundPage} backgroundPage
 * @param {string} tdsFilePath - Path to the TDS JSON file (relative to data directory)
 * @param {Object} options - Options
 * @param {boolean} options.replace - If true, replace TDS entirely instead of merging
 */
export async function overrideTdsViaBackground(backgroundPage, tdsFilePath, options = {}) {
    const tdsData = JSON.parse(await fs.promises.readFile(path.join(__dirname, '..', 'data', tdsFilePath), 'utf-8'));
    const { replace = false } = options;

    // Use overrideDataValue() to set the test TDS data directly
    // The chunked RDP mechanism handles large function arguments automatically
    // Note: This function is synchronous, not async, to avoid callback handling complexity
    await backgroundPage.evaluate(
        ({ newData, shouldReplace }) => {
            const tdsLoader = globalThis.components.tds.tds;

            // If replacing, just use the new data directly
            if (shouldReplace) {
                tdsLoader.overrideDataValue(newData);
                return true;
            }

            // Get current data and merge with new data
            const currentData = tdsLoader.data || {};

            // Merge cnames - handle both array and object formats carefully
            // The extension may transform cnames internally, so we need to handle mixed types
            let mergedCnames;
            const currentCnames = currentData.cnames;
            const newCnames = newData.cnames;
            const currentIsArray = Array.isArray(currentCnames);
            const newIsArray = Array.isArray(newCnames);

            if (!currentCnames && !newCnames) {
                mergedCnames = undefined;
            } else if (!currentCnames) {
                mergedCnames = newCnames;
            } else if (!newCnames) {
                mergedCnames = currentCnames;
            } else if (currentIsArray && newIsArray) {
                // Both arrays - concatenate
                mergedCnames = [...currentCnames, ...newCnames];
            } else if (!currentIsArray && !newIsArray) {
                // Both objects - spread merge
                mergedCnames = { ...currentCnames, ...newCnames };
            } else if (currentIsArray && !newIsArray) {
                // Current is array, new is object - convert object to entries and add
                mergedCnames = [...currentCnames];
                for (const [key, value] of Object.entries(newCnames)) {
                    mergedCnames.push({ host: key, cname: value });
                }
            } else {
                // Current is object, new is array - convert to object format and merge
                mergedCnames = { ...currentCnames };
                for (const entry of newCnames) {
                    if (entry.host && entry.cname) {
                        mergedCnames[entry.host] = entry.cname;
                    }
                }
            }

            const mergedData = {
                ...currentData,
                trackers: { ...currentData.trackers, ...newData.trackers },
                entities: { ...currentData.entities, ...newData.entities },
                domains: { ...currentData.domains, ...newData.domains },
                cnames: mergedCnames,
            };
            // Use overrideDataValue which sets the data synchronously
            tdsLoader.overrideDataValue(mergedData);
            return true; // Return a value to indicate success
        },
        { newData: tdsData, shouldReplace: replace },
    );
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

    // Use overrideDataValue() to apply patches to existing config
    // The chunked RDP mechanism handles large function arguments automatically
    await backgroundPage.evaluate((patchObj) => {
        const configLoader = globalThis.components.tds.remoteConfig;
        // Get current config and apply patches
        const config = JSON.parse(JSON.stringify(configLoader.data || {}));
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
        // Use overrideDataValue which sets the data synchronously
        configLoader.overrideDataValue(config);
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
