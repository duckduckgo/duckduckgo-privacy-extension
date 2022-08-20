
import { getTrackerAggregationStats } from './mixins/calculate-aggregation-stats'

// @ts-nocheck
module.exports = function (category) {
    if (!this.tab) return

    /**
     * Returns a list of tracker URLs after looping through all the entities.
     * @param {import('./mixins/calculate-aggregation-stats').AggregateCompanyData[]} list
     * @returns {string[]}
     */
    function collectAllUrls (list) {
        const urls = []
        list.forEach(item => {
            item.urlsList.forEach(url => urls.push(url))
        })
        return urls
    }

    const upgradedHttps = this.tab.upgradedHttps
    // remove params and fragments from url to avoid including sensitive data
    const siteUrl = this.tab.url.split('?')[0].split('#')[0]
    const aggregationStats = getTrackerAggregationStats(this.tab.trackers)
    const blockedTrackers = collectAllUrls(aggregationStats.blockAction.list)
    const surrogates = collectAllUrls(aggregationStats.redirectAction.list)
    const urlParametersRemoved = this.tab.urlParametersRemoved ? 'true' : 'false'
    const ampUrl = this.tab.ampUrl || null
    const brokenSiteParams = [
        { category },
        { siteUrl: encodeURIComponent(siteUrl) },
        { upgradedHttps: upgradedHttps.toString() },
        { tds: this.tds },
        { urlParametersRemoved },
        { ampUrl },
        { blockedTrackers },
        { surrogates }
    ]
    this.submitBrokenSiteReport(brokenSiteParams)

    // remember that user opted into sharing site breakage data
    // for this domain, so that we can attach domain when they
    // remove site from allowlist
    this.set('allowlistOptIn', true)
    this.sendMessage('allowlistOptIn',
        {
            list: 'allowlistOptIn',
            domain: this.tab.site.domain,
            value: true
        }
    )
}
