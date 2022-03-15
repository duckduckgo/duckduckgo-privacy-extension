module.exports = function (category) {
    if (!this.tab) return

    const blockedTrackers = []
    const surrogates = []
    const upgradedHttps = this.tab.upgradedHttps
    // remove params and fragments from url to avoid including sensitive data
    const siteUrl = this.tab.url.split('?')[0].split('#')[0]
    const trackerObjects = this.tab.trackersBlocked
    const urlParametersRemoved = this.tab.urlParametersRemoved ? 'true' : 'false'
    const brokenSiteParams = [
        { category: category },
        { siteUrl: encodeURIComponent(siteUrl) },
        { upgradedHttps: upgradedHttps.toString() },
        { tds: this.tds },
        { urlParametersRemoved }
    ]

    for (const tracker in trackerObjects) {
        const trackerDomains = trackerObjects[tracker].urls
        Object.keys(trackerDomains).forEach((domain) => {
            if (trackerDomains[domain].isBlocked) {
                if (trackerDomains[domain].reason === 'matched rule - surrogate') {
                    surrogates.push(domain)
                } else {
                    blockedTrackers.push(domain)
                }
            }
        })
    }
    brokenSiteParams.push({ blockedTrackers: blockedTrackers }, { surrogates: surrogates })
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
