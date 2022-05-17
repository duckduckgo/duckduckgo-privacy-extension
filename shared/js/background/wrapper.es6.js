import browser from 'webextension-polyfill'

export function getExtensionURL (path) {
    return browser.runtime.getURL(path)
}

export function getExtensionVersion () {
    const manifest = browser.runtime.getManifest()
    return manifest.version
}

export async function setBadgeIcon (badgeData) {
    if (typeof browser.action === 'undefined') {
        return await browser.browserAction.setIcon(badgeData)
    }

    return await browser.action.setIcon(badgeData)
}

export function getManifestVersion () {
    const manifest = browser.runtime.getManifest()
    return manifest.manifest_version
}

export function syncToStorage (data) {
    browser.storage.local.set(data)
}

export async function getFromStorage (key, cb) {
    const result = await browser.storage.local.get(key)
    return result[key]
}

export async function getFromManagedStorage (keys, cb) {
    try {
        return await browser.storage.managed.get(keys)
    } catch (e) {
        console.log('get managed failed', e)
    }
    return {}
}

export function getExtensionId () {
    return browser.runtime.id
}

export async function notifyPopup (message) {
    try {
        await browser.runtime.sendMessage(message)
    } catch {
        // Ignore this as can throw an error message when the popup is not open.
    }
}

export function normalizeTabData (tabData) {
    return tabData
}

export function mergeSavedSettings (settings, results) {
    return Object.assign(settings, results)
}

export async function getDDGTabUrls () {
    const tabs = await browser.tabs.query({ url: 'https://*.duckduckgo.com/*' }) || []

    tabs.forEach(tab => {
        insertCSS({
            target: { tabId: tab.id },
            files: ['/public/css/noatb.css']
        })
    })

    return tabs.map(tab => tab.url)
}

export function setUninstallURL (url) {
    browser.runtime.setUninstallURL(url)
}

export function changeTabURL (tabId, url) {
    return browser.tabs.update(tabId, { url })
}

function convertScriptingAPIOptionsForTabsAPI (options) {
    if (typeof options !== 'object') {
        throw new Error(
            'Missing/invalid options Object.'
        )
    }

    if (typeof options.file !== 'undefined' ||
        typeof options.frameId !== 'undefined' ||
        typeof options.runAt !== 'undefined' ||
        typeof options.allFrames !== 'undefined' ||
        typeof options.code !== 'undefined') {
        throw new Error(
            'Please provide options compatible with the (MV3) scripting API, ' +
            'instead of the (MV2) tabs API.'
        )
    }

    if (typeof options.world !== 'undefined') {
        throw new Error(
            'World targetting not supported by MV2.'
        )
    }

    const { allFrames, frameIds, tabId } = options.target
    delete options.target

    if (Array.isArray(frameIds) && frameIds.length > 0) {
        if (frameIds.length > 1) {
            throw new Error(
                'Targetting multiple frames by ID not supported by MV2.'
            )
        }

        options.frameId = frameIds[0]
    }

    if (typeof options.files !== 'undefined') {
        if (Array.isArray(options.files) && options.files.length > 0) {
            if (options.files.length > 1) {
                throw new Error(
                    'Inserting multiple stylesheets/scripts in one go not supported by MV2.'
                )
            }
            options.file = options.files[0]
        }
        delete options.files
    }

    if (typeof allFrames !== 'undefined') {
        options.allFrames = allFrames
    }

    if (typeof options.injectImmediately !== 'undefined') {
        if (options.injectImmediately) {
            options.runAt = 'document_start'
        }
        delete options.injectImmediately
    }

    let stringifiedArgs = ''
    if (typeof options.args !== 'undefined') {
        if (Array.isArray(options.args)) {
            stringifiedArgs = '...' + JSON.stringify(options.args)
        }
        delete options.args
    }

    if (typeof options.func !== 'undefined') {
        if (typeof options.func === 'function') {
            options.code = '(' + options.func.toString() + ')(' + stringifiedArgs + ')'
        }
        delete options.func
    }

    return [tabId, options]
}

/**
 * Execute a script/function in the target tab.
 * This is a wrapper around tabs.executeScript (MV2) and
 * scripting.executeScript (MV3). Arguments are expected in the
 * scripting.executeScript[1] format.
 * Notes:
 *   - Instead of passing the `code` option (JavaScript string to execute), pass
 *     the `func` option (JavaScript function to execute).
 *   - Some features are not supported in MV2, including targetting multiple
 *     specific frames and targetting execution 'world'.
 * 1 - https://developer.chrome.com/docs/extensions/reference/scripting/#method-executeScript
 * @param {object} options
 *   Script injection options.
 * @param {*} result
 *   The result of executing the script.
 */
export async function executeScript (options) {
    if (typeof browser.scripting === 'undefined') {
        return await browser.tabs.executeScript(
            ...convertScriptingAPIOptionsForTabsAPI(options)
        )
    }

    return await browser.scripting.executeScript(options)
}

/**
 * Insert CSS in the target tab.
 * This is a wrapper around tabs.insertCSS (MV2) and scripting.insertCSS (MV3).
 * Arguments are expected in the scripting.insertCSS[1] format.
 * Notes:
 *   - Some features are not supported in MV2, including targetting multiple
 *     specific frames and targetting execution 'world'.
 * 1 - https://developer.chrome.com/docs/extensions/reference/scripting/#method-insertCSS
 * @param {object} options
 *   CSS insertion options.
 */
export async function insertCSS (options) {
    if (typeof browser.scripting === 'undefined') {
        return await browser.tabs.insertCSS(
            ...convertScriptingAPIOptionsForTabsAPI(options)
        )
    }

    return await browser.scripting.insertCSS(options)
}
