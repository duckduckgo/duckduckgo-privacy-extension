const tabManager = require('./tab-manager')

/**
 *
 * @param {{tabId: number, requestId: number, url: string, initiator: URL, type: string, requestHeaders: Array<{name: string, value:string}>}} requestData
 */
function handleOpenerContext (requestData) {
    const thisTab = tabManager.get(requestData)

    for (const header of requestData.requestHeaders) {
        if (header.name !== 'referrer') continue

        if (header.value.includes('duckduckgo.com')) {
            thisTab.openerContext = 'serp'
        } else if (header.value !== '') {
            thisTab.openerContext = 'navigation'
        }
    }
}

export {
    handleOpenerContext
}
