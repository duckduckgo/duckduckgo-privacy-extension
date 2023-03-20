/**
 * Reloads the extension when changes are detected. Only included for developer
 * builds. (Pass the reloader=0 build parameter to disable.)
 */

import browser from 'webextension-polyfill'
const browserWrapper = require('./wrapper')

function createAlarm () {
    browserWrapper.createAlarm('checkBuildTime', { when: Date.now() + 5000 })
}

browser.alarms.onAlarm.addListener(async alarmEvent => {
    if (alarmEvent.name !== 'checkBuildTime') {
        return
    }

    const response = await fetch('/buildtime.txt', { cache: 'no-store' })
    const buildTime = await response.text()

    if (buildTime) {
        const previousBuildTime = await browserWrapper.getFromSessionStorage('buildTime')
        if (!previousBuildTime) {
            await browserWrapper.setToSessionStorage('buildTime', buildTime)
        } else if (buildTime !== previousBuildTime) {
            browser.runtime.reload()
        }
    }

    createAlarm()
})

createAlarm()
