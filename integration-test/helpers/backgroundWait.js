const puppeteer = require('puppeteer')

// Puppeteer does not yet (as of 14) provide a waitForTimeout method for
// WebWorkers.
function manuallyWaitForTimeout (timeout) {
    return new Promise(resolve => {
        setTimeout(resolve, timeout)
    })
}

function forTimeout (bgPage, timeout) {
    if (bgPage.waitForTimeout) {
        return bgPage.waitForTimeout(timeout)
    }

    return manuallyWaitForTimeout(timeout)
}

// Puppeteer does not yet (as of 14) provide a waitForFunction method for
// WebWorkers. The evaluate method is available though.
function manuallyWaitForFunction (bgPage, func, { polling, timeout }, ...args) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now()
        const waitForFunction = async () => {
            let result
            try {
                result = await bgPage.evaluate(func, ...args)
            } catch (e) {
                reject(e)
            }
            if (result) {
                resolve(result)
            } else {
                if (Date.now() - startTime > timeout) {
                    reject(
                        new puppeteer.errors.TimeoutError(
                            'Manually waiting for function timed out: ' +
                            func.toString()
                        )
                    )
                } else {
                    setTimeout(waitForFunction, polling)
                }
            }
        }
        waitForFunction()
    })
}

// Helpers that aid in waiting for the background page's state.
// Notes:
//   - Puppeteer's `waitForFunction` uses `requestAnimationFrame` by default,
//     but that appears to be broken for extension background pages. Polling
//     every 10ms works however.
//   - Jasmine's timeout is 20 seconds, so go with a timeout of 15 seconds
//     (rather than the default of 30 seconds) to improve the error output on
//     timeout.
function forFunction (bgPage, func, ...args) {
    const waitForFunction = bgPage.waitForFunction
        ? bgPage.waitForFunction.bind(bgPage)
        : manuallyWaitForFunction.bind(null, bgPage)
    return waitForFunction(func, { polling: 10, timeout: 15000 }, ...args)
}

async function forSetting (bgPage, key) {
    try {
        return await forFunction(
            bgPage, key => self.dbg?.settings?.getSetting(key), key
        )
    } catch (e) {
        if (e instanceof puppeteer.errors.TimeoutError) {
            throw new puppeteer.errors.TimeoutError(
                'Timed out waiting for setting: ' + key
            )
        } else {
            throw e
        }
    }
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
    forTimeout,
    forFunction,
    forSetting,
    forAllConfiguration
}
