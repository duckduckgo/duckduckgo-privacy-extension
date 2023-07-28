import fs from 'fs'
import path from 'path'

/**
 * @typedef {import('@playwright/test').Page} Page - Puppeteer Page
 * @typedef {import('@playwright/test').Worker} WebWorker - Puppeteer WebWorker
 */

function parsePath (pathString) {
    const pathParts = []

    // Split path by '.' but take escaping into account.
    let currentPart = ''
    let escaped = false
    for (const char of pathString) {
        if (escaped) {
            currentPart += char
            escaped = false
            continue
        }

        if (char === '\\') {
            escaped = true
            continue
        }

        if (char === '.') {
            pathParts.push(currentPart)
            currentPart = ''
            continue
        }

        currentPart += char
    }

    // Find the target Object from that path.
    const hostObject = pathParts.shift()
    if (!hostObject) {
        throw new Error(`Could not find host object for path: ${pathString}`)
    }
    // eslint-disable-next-line no-eval
    let currentObject = eval(hostObject)
    for (const pathPart of pathParts) {
        currentObject = currentObject[pathPart]
    }

    return [currentObject, currentPart]
}

/**
 * Override some part of the extension config temporarily for an integration
 * test.
 * Note: Avoid overriding same configuration multiple times. Also ensure
 *       unloadTestConfig() is called after your tests are done.
 * @param {Page | WebWorker} bgPage
 *   The extension's background page.
 * @param {string} testConfigFilename
 *   The file name of your JSON test configuration, in the
 *   /integration-test/data/configs/ directory.
 *    - the keys are a string containing the configuration's "path", for example
 *      "globalThis.dbg.tds.tds.trackers.duckduckgo\\.com".
 *    - the values should be your test configuration to set for that path, for
 *      the above example an Object containing the tracker entry.
 *   Note:
 *    - Paths containing '.' can  be escaped with a backslash.
 *    - Make sure to include the 'globalThis.' (or similar global Object) prefix.
 *    - There's no need to escape whitespace in paths.
 */
export async function loadTestConfig (bgPage, testConfigFilename) {
    const filePath = path.resolve(
        __dirname, '..', 'data', 'configs', testConfigFilename
    )
    const testConfig = JSON.parse(fs.readFileSync(filePath).toString())

    await bgPage.evaluate(({ pageTestConfig, parsePathString }) => {
        globalThis.configBackup = globalThis.configBackup || {}
        // eslint-disable-next-line no-eval
        eval(parsePathString)

        for (const pathString of Object.keys(pageTestConfig)) {
            const [target, lastPathPart] = parsePath(pathString)
            globalThis.configBackup[pathString] = target[lastPathPart]
            target[lastPathPart] = pageTestConfig[pathString]
        }
        return globalThis.dbg.tds._internalOnListUpdate('config', globalThis.dbg.tds.config)
    }, {
        pageTestConfig: testConfig,
        parsePathString: parsePath.toString()
    })
}

/**
 * Load a given TDS file in the extension
 * @param {Page | WebWorker} bgPage
 * @param {string} tdsFilePath path to TDS file to load (from integration-test/data)
 */
export async function loadTestTds (bgPage, tdsFilePath) {
    await bgPage.evaluate(async tds => {
        // Wait until the default list is loaded.
        await globalThis.dbg.tds.ready('tds')

        // Then load the test list and wait until the update listeners have
        // been called.
        return await new Promise(resolve => {
            globalThis.dbg.tds.onUpdate('tds', resolve)
            globalThis.dbg.setListContents({
                name: 'tds',
                value: tds
            })
        })
    }, JSON.parse(await fs.promises.readFile(path.join(__dirname, '..', 'data', tdsFilePath), 'utf-8')))
}
