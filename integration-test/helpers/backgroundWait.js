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
            bgPage, pageKey => globalThis.dbg?.settings?.getSetting(pageKey), key
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

async function forAllConfiguration (bgPage) {
    try {
        await forFunction(bgPage, async () => {
            if (!globalThis.dbg?.https?.isReady ||
                !globalThis.dbg?.settings?.ready ||
                !globalThis.dbg?.startup?.ready ||
                !globalThis.dbg?.tds?.ready) {
                return false
            }

            await Promise.all([
                globalThis.dbg.settings.ready(),
                globalThis.dbg.startup.ready(),
                globalThis.dbg.tds.ready()
            ])

            return true
        })
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
