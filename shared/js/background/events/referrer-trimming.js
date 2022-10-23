const tabManager = require('../tab-manager.es6')
const trackerutils = require('../tracker-utils')
const utils = require('../utils.es6')
const browserName = utils.getBrowserName()

export class Referrer {
    /**
     * @property {string} site The referrer URL.
     * @property {string} referrerHost The referrer host.
     * @property {string} referrer The truncated referrer.
     */
    constructor (site, referrerHost, referrer) {
        this.site = site
        this.referrerHost = referrerHost
        this.referrer = referrer
    }
}

/**
 * @param {{tabId: number, url: string, requestHeaders: Array<{name: string, value:string}>}} e
 *
 * @returns {{requestHeaders: Array<{name: string, value:string}>} | { redirectUrl: URL } | undefined}
 */
export function limitReferrerData (e) {
    const referrer = e.requestHeaders.find(header => header.name.toLowerCase() === 'referer')?.value
    if (!referrer) return

    const tab = tabManager.get({ tabId: e.tabId })

    // Firefox only - Check if this tab had a surrogate redirect request and if it will
    // likely be blocked by CORS (Origin header). Chrome surrogate redirects happen in onBeforeRequest.
    if (browserName === 'moz' && tab && tab.surrogates && tab.surrogates[e.url]) {
        const hasOrigin = e.requestHeaders.filter(h => h.name.match(/^origin$/i))
        if (!hasOrigin.length) {
            const redirectUrl = tab.surrogates[e.url]
            // remove redirect entry for the tab
            delete tab.surrogates[e.url]

            return { redirectUrl }
        }
    }

    if (!tab || !tab.site.isFeatureEnabled('referrer')) {
        return
    }

    // Additional safe list and broken site list checks are included in the referrer evaluation
    const modifiedReferrer = trackerutils.truncateReferrer(referrer, e.url)
    if (!modifiedReferrer) {
        return
    }

    const requestHeaders = e.requestHeaders.filter(header => header.name.toLowerCase() !== 'referer')
    if (!!tab && (!tab.referrer || tab.referrer.site !== tab.site.url)) {
        tab.referrer = new Referrer(tab.site.url, new URL(referrer).hostname, modifiedReferrer)
    }
    requestHeaders.push({
        name: 'referer',
        value: modifiedReferrer
    })
    return { requestHeaders }
}
