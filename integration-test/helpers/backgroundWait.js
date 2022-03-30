// Helpers that aid in waiting for the background page's state.
// Note: Puppeteer's `waitForFunction` uses `requestAnimationFrame` by default,
//       but that appears to be broken for extension background pages. Polling
//       every 10ms works however.

function forFunction (bgPage, func, ...args) {
    return bgPage.waitForFunction(func, { polling: 10 }, ...args)
}

function forSetting (bgPage, key) {
    return forFunction(
        bgPage, key => window.dbg?.settings?.getSetting(key), key
    )
}

// Note: This is likely incomplete. Please add further checks as they come up!
async function forAllConfiguration (bgPage) {
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
        Object.keys(window.dbg.tds.tds.entities).length > 0
    )

    await forFunction(bgPage, () => {
        const firstEntity = Object.keys(window.dbg.tds.tds.entities)[0]
        const { domains } = window.dbg.tds.tds.entities[firstEntity]
        return firstEntity &&
               domains && domains.length > 0 &&
               window.dbg.tds.tds.domains[domains[0]] === firstEntity
    })

    // This is a synchronous way to check that the Promise returned by
    // `settings.ready()` has resolved.
    await forSetting(bgPage, 'atb')
}

module.exports = {
    forFunction,
    forSetting,
    forAllConfiguration
}
