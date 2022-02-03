function parsePath (path) {
    const pathParts = []

    // Split path by '.' but take escaping into account.
    let currentPart = ''
    let escaped = false
    for (const char of path) {
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
    let currentObject = window
    for (const path of pathParts) {
        currentObject = currentObject[path]
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
 * @param {Object} testConfig
 *   Your test configuration.
 *    - the keys are a string containing the configuration's "path", for example
 *      "dbg.tds.tds.trackers.duckduckgo\\.com".
 *    - the values should be your test configuration to set for that path, for
 *      the above example an Object containing the tracker entry.
 *   Note:
 *    - Paths containing '.' can  be escaped with a backslash.
 *    - Don't include the 'window.' prefix in paths.
 *    - There's no need to escape whitespace in paths.
 */
async function loadTestConfig (bgPage, testConfig) {
    await bgPage.evaluate((testConfig, parsePathString) => {
        window.configBackup = window.configBackup || {}
        // eslint-disable-next-line no-eval
        eval(parsePathString)

        for (const path of Object.keys(testConfig)) {
            const [target, lastPathPart] = parsePath(path)
            window.configBackup[path] = target[lastPathPart]
            target[lastPathPart] = testConfig[path]
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
        const { configBackup } = window || {}
        // eslint-disable-next-line no-eval
        eval(parsePathString)

        for (const path of Object.keys(configBackup)) {
            const [target, lastPathPart] = parsePath(path)
            target[lastPathPart] = configBackup[path]
        }
    }, parsePath.toString())
}

module.exports = {
    loadTestConfig,
    unloadTestConfig
}
