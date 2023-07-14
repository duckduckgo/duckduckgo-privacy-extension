/**
 * Reloads the extension when changes are detected. Only included for developer
 * builds. (Pass the reloader=0 build parameter to disable.)
 */

import browser from 'webextension-polyfill'
import { createAlarm, getFromSessionStorage, setToSessionStorage } from './wrapper'

export default function initReloader () {
    function createAlarmTimer () {
        createAlarm('checkBuildTime', { when: Date.now() + 5000 })
    }

    browser.alarms.onAlarm.addListener(async alarmEvent => {
        if (alarmEvent.name !== 'checkBuildTime') {
            return
        }

        let buildTime = null

        try {
            const response = await fetch('/buildtime.txt', { cache: 'no-store' })
            buildTime = await response.text()
        } catch (e) { }

        if (buildTime) {
            const previousBuildTime = await getFromSessionStorage('buildTime')
            if (!previousBuildTime) {
                await setToSessionStorage('buildTime', buildTime)
            } else if (buildTime !== previousBuildTime) {
                browser.runtime.reload()
            }
        }

        createAlarmTimer()
    })

    createAlarmTimer()
}
