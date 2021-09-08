const Parent = window.DDG.base.Model
const browserUIWrapper = require('./../base/ui-wrapper.es6.js')

function BrokenSiteFooterModel (attrs) {
    attrs = attrs || {}
    attrs.tab = null
    attrs.isAllowlisted = false
    attrs.allowlistOptIn = false
    Parent.call(this, attrs)
}

BrokenSiteFooterModel.prototype = window.$.extend({},
    Parent.prototype,
    {
        modelName: 'brokenSiteFooter',

        getBackgroundTabData: function () {
            return new Promise((resolve) => {
                browserUIWrapper.getBackgroundTabData().then((tab) => {
                    if (tab) {
                        this.set('tab', tab)
                    } else {
                        console.debug('Broken site footer model: no tab')
                    }

                    resolve()
                })
            })
        },

        submitBreakageForm: function (category) {
            if (!this.tab) return

            const blockedTrackers = []
            const surrogates = []
            const upgradedHttps = this.tab.upgradedHttps
            // remove params and fragments from url to avoid including sensitive data
            const siteUrl = this.tab.url.split('?')[0].split('#')[0]
            const trackerObjects = this.tab.trackersBlocked
            const pixelParams = ['epbf',
                { category: category },
                { siteUrl: encodeURIComponent(siteUrl) },
                { upgradedHttps: upgradedHttps.toString() },
                { tds: this.tds }
            ]

            for (const tracker in trackerObjects) {
                const trackerDomains = trackerObjects[tracker].urls
                Object.keys(trackerDomains).forEach((domain) => {
                    if (trackerDomains[domain].isBlocked) {
                        blockedTrackers.push(domain)
                        if (trackerDomains[domain].reason === 'matched rule - surrogate') {
                            surrogates.push(domain)
                        }
                    }
                })
            }
            pixelParams.push({ blockedTrackers: blockedTrackers }, { surrogates: surrogates })
            this.fetch({ firePixel: pixelParams })

            // remember that user opted into sharing site breakage data
            // for this domain, so that we can attach domain when they
            // remove site from allowlist
            this.set('allowlistOptIn', true)
            this.fetch({
                allowlistOptIn:
                {
                    list: 'allowlistOptIn',
                    domain: this.tab.site.domain,
                    value: true
                }
            })
        },

        initAllowlisted: function (allowListValue, denyListValue) {
            this.isAllowlisted = allowListValue
            this.isDenylisted = denyListValue
        },

        setList (list, domain, value) {
            this.fetch({
                setList: {
                    list,
                    domain,
                    value
                }
            })
        },

        toggleAllowlist: function () {
            if (this.tab && this.tab.site) {
                // Explic{itly remove all denylisting if the site is broken. This covers the case when the site has been removed from the list.
                this.setList('denylisted', this.tab.site.domain, false)
                this.initAllowlisted(!this.isAllowlisted)

                // fire ept.on pixel if just turned privacy protection on,
                // fire ept.off pixel if just turned privacy protection off.
                if (this.isAllowlisted && this.allowlistOptIn) {
                    this.set('allowlistOptIn', false)
                    this.setList('allowlistOptIn', this.tab.site.domain, false)
                } else {
                    this.fetch({ firePixel: ['ept', 'off'] })
                }

                this.setList('allowlisted', this.tab.site.domain, this.isAllowlisted)
            }
        }
    }
)

module.exports = BrokenSiteFooterModel
