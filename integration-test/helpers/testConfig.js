const fs = require('fs')
const path = require('path')

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
    // eslint-disable-next-line no-eval
    let currentObject = eval(pathParts.shift())
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
 * @param {Page} bgPage
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
async function loadTestConfig (bgPage, testConfigFilename) {
    const filePath = path.resolve(
        __dirname, '..', 'data', 'configs', testConfigFilename
    )
    const testConfig = JSON.parse(fs.readFileSync(filePath).toString())

    await bgPage.evaluate((pageTestConfig, parsePathString) => {
        globalThis.configBackup = globalThis.configBackup || {}
        // eslint-disable-next-line no-eval
        eval(parsePathString)

        for (const pathString of Object.keys(pageTestConfig)) {
            const [target, lastPathPart] = parsePath(pathString)
            globalThis.configBackup[pathString] = target[lastPathPart]
            target[lastPathPart] = pageTestConfig[pathString]
        }
    }, testConfig, parsePath.toString())
}

/**
 * Undoes the configuration changes made by loadTestConfig.
 * @param {Page} bgPage
 *   The extension's background page.
 */
async function unloadTestConfig (bgPage) {
    await bgPage.evaluate(parsePathString => {
        const { configBackup } = globalThis
        if (!configBackup) {
            return
        }

        // eslint-disable-next-line no-eval
        eval(parsePathString)

        for (const pathString of Object.keys(configBackup)) {
            const [target, lastPathPart] = parsePath(pathString)
            target[lastPathPart] = configBackup[pathString]
        }
    }, parsePath.toString())
}

module.exports = {
    loadTestConfig,
    unloadTestConfig
}
