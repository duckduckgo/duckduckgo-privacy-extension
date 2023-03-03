import { startup } from './startup-mv3'

(async () => {
    globalThis.dbg = await startup()
})()

// show rule counter badge
if (chrome.declarativeNetRequest.setExtensionActionOptions) {
    chrome.declarativeNetRequest.setExtensionActionOptions({
        displayActionCountAsBadgeText: true
    })
}
