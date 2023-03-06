import { startup } from './startup-mv3'

const contentScripts = [
    {
        id: '1-script-injection-isolated-world',
        allFrames: true,
        js: ['public/js/content-scripts/content-scope-messaging.js'],
        runAt: 'document_start',
        world: 'ISOLATED',
        matches: ['<all_urls>']
    },
    {
        id: '2-script-injection-main-world',
        allFrames: true,
        js: ['public/js/inject.js'],
        runAt: 'document_start',
        world: 'MAIN',
        matches: ['<all_urls>']
    },
    {
        id: '3-noatb',
        matches: ['<all_urls>'],
        allFrames: true,
        css: ['public/css/noatb.css'],
        runAt: 'document_start'
    },
    {
        id: '4-autofill-324edb',
        js: ['public/js/content-scripts/autofill.js'],
        css: ['public/css/autofill-host-styles.css'],
        matches: ['<all_urls>'],
        allFrames: true,
        runAt: 'document_start'
    }
]

async function registerContentScripts () {
    const registeredScripts = (await chrome.scripting.getRegisteredContentScripts()).map(s => s.id)
    const expectedScripts = contentScripts.map(s => s.id)
    if (registeredScripts.every(r => expectedScripts.includes(r.id)) && registeredScripts.length === expectedScripts.length) {
        // registered scripts hasn't changed
        return
    }
    await chrome.scripting.unregisterContentScripts()
    await chrome.scripting.registerContentScripts(contentScripts)
    console.log('content-scripts', registeredScripts, await chrome.scripting.getRegisteredContentScripts())
}

(async () => {
    globalThis.dbg = await startup()
    await registerContentScripts()
})()

// show rule counter badge
if (chrome.declarativeNetRequest.setExtensionActionOptions) {
    chrome.declarativeNetRequest.setExtensionActionOptions({
        displayActionCountAsBadgeText: true
    })
}
