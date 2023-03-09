import { startup } from './startup-mv3'
import * as settings from './settings'

async function registerContentScripts () {
    chrome.webNavigation.onCommitted.addListener(async ({ tabId, frameId }) => {
        // 1-script-injection-isolated-world
        await chrome.scripting.executeScript({
            target: {
                tabId,
                frameIds: [frameId]
            },
            world: 'ISOLATED',
            files: ['public/js/content-scripts/content-scope-messaging.js'],
            injectImmediately: true
        })
        // 2-script-injection-main-world
        await chrome.scripting.executeScript({
            target: {
                tabId,
                frameIds: [frameId]
            },
            world: 'MAIN',
            files: ['public/js/inject.js'],
            injectImmediately: true
        })
    })
}

async function setupCTLAllowingRules () {
    const allowingRulesByClickToLoadAction = await (await fetch('/data/bundled/ctl-allow-rules.json')).json()
    settings.updateSetting('allowingDnrRulesByClickToLoadRuleAction', allowingRulesByClickToLoadAction)
}

(async () => {
    globalThis.dbg = await startup()
    await registerContentScripts()
    await setupCTLAllowingRules()
})()

// show rule counter badge
if (chrome.declarativeNetRequest.setExtensionActionOptions) {
    chrome.declarativeNetRequest.setExtensionActionOptions({
        displayActionCountAsBadgeText: true
    })
}
