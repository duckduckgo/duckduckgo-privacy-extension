// import * as settings from './settings'
import { getPrivacyDashboardData } from './features/dashboard'


chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log('Received request: ', message)

    if (message.messageType === 'getPrivacyDashboardData') {
        try {
            sendResponse(await getPrivacyDashboardData(message.options))
        } catch (e) {
            console.error(e)
        }
    }
})

// show rule counter badge
if (chrome.declarativeNetRequest.setExtensionActionOptions) {
    chrome.declarativeNetRequest.setExtensionActionOptions({
        displayActionCountAsBadgeText: true
    })
}
