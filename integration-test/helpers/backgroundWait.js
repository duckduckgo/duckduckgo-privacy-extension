// Helpers that aid in waiting for the background page's state.
// Notes:
//   - Puppeteer's `waitForFunction` uses `requestAnimationFrame` by default,
//     but that appears to be broken for extension background pages. Polling
//     every 10ms works however.
//   - Jasmine's timeout is 20 seconds, so go with a timeout of 15 seconds
//     (rather than the default of 30 seconds) to improve the error output on
//     timeout.
function forFunction (bgPage, func, ...args) {
    return bgPage.waitForFunction(func, { polling: 10, timeout: 15000 }, ...args)
}

function forSetting (bgPage, key) {
    return forFunction(
        bgPage, key => window.dbg?.settings?.getSetting(key), key
    )
}

// Note: This is likely incomplete. Please add further checks as they come up!
async function forAllConfiguration (bgPage) {
    try {
        await forFunction(bgPage, () =>
            // Expected configuration Objects/properties exist.
            window.dbg?.https &&
            window.dbg?.tds?.ClickToLoadConfig &&
            window.dbg?.tds?.config?.features?.clickToPlay?.state &&
            window.dbg?.tds?.tds?.domains &&
            window.dbg?.tds?.tds?.entities &&
            window.dbg?.tds?.tds?.trackers &&

            // Expected configuration state.
            window.dbg.tds.isInstalling === false &&
            window.dbg.https.isReady === true &&
            Object.keys(window.dbg.tds.ClickToLoadConfig).length > 0 &&
            Object.keys(window.dbg.tds.tds.domains).length > 0 &&
            Object.keys(window.dbg.tds.tds.entities).length > 0)

        await Promise.all([
            forFunction(bgPage, () => {
                const firstEntity = Object.keys(window.dbg.tds.tds.entities)[0]
                const { domains } = window.dbg.tds.tds.entities[firstEntity]
                return firstEntity &&
                    domains && domains.length > 0 &&
                    window.dbg.tds.tds.domains[domains[0]] === firstEntity
            }),

            // Ensures that `settings.ready()` has resolved.
            forSetting(bgPage, 'atb')
        ])
    } catch (e) {
        throw new Error('Failed to load extension configuration.')
    }
}

module.exports = {
    forFunction,
    forSetting,
    forAllConfiguration
}
