const Parent = window.DDG.base.Model
const normalizeCompanyName = require('./mixins/normalize-company-name.es6')

function unblockedFilter (company, url) {
    const urlObj = company.urls[url]
    return urlObj.action === 'ignore' && urlObj.isFirstParty === true
}

function SiteCompanyList (attrs) {
    attrs = attrs || {}
    attrs.tab = null
    attrs.companyListMap = []
    Parent.call(this, attrs)
}

SiteCompanyList.prototype = window.$.extend({},
    Parent.prototype,
    normalizeCompanyName,
    {

        modelName: 'siteCompanyList',

        fetchAsyncData: function () {
            return new Promise((resolve, reject) => {
                this.sendMessage('getCurrentTab').then((tab) => {
                    if (tab) {
                        this.sendMessage('getTab', tab.id).then((bkgTab) => {
                            this.tab = bkgTab
                            this.domain = this.tab && this.tab.site ? this.tab.site.domain : ''
                            this._updateCompaniesList()
                            resolve()
                        })
                    } else {
                        console.debug('SiteDetails model: no tab')
                        resolve()
                    }
                })
            })
        },

        _updateCompaniesList: function () {
            // list of all trackers on page (whether we blocked them or not)
            this.trackers = this.tab.trackers || {}
            const companyNames = Object.keys(this.trackers)
            let unknownSameDomainCompany = null

            // set trackerlist metadata for list display by company:
            this.companyListMap = companyNames
                .filter((companyName) => {
                    const company = this.trackers[companyName]
                    const urlsList = company.urls ? Object.keys(company.urls) : []
                    return urlsList.some((url) => {
                        const urlObj = company.urls[url]
                        return ['block', 'redirect'].includes(urlObj.action)
                    })
                })
                .map((companyName) => {
                    const company = this.trackers[companyName]
                    const urlsList = company.urls ? Object.keys(company.urls) : []
                    // Unknown same domain trackers need to be individually fetched and put
                    // in the unblocked list
                    if (companyName === 'unknown' && this.hasUnblockedTrackers(company, urlsList)) {
                        unknownSameDomainCompany = this.createUnblockedList(company, urlsList)
                    }

                    // calc max using pixels instead of % to make margins easier
                    // max width: 300 - (horizontal padding in css) = 260
                    return {
                        name: companyName,
                        displayName: company.displayName || companyName,
                        normalizedName: this.normalizeCompanyName(companyName),
                        count: this._setCount(company, companyName, urlsList),
                        urls: company.urls,
                        urlsList: urlsList
                    }
                }, this)
                .sort((a, b) => {
                    return b.count - a.count
                })

            if (unknownSameDomainCompany) {
                this.companyListMap.push(unknownSameDomainCompany)
            }
        },

        // Make ad-hoc unblocked list
        // used to cherry pick unblocked trackers from unknown companies
        // the name is the site domain, count is -2 to show the list at the bottom
        createUnblockedList: function (company, urlsList) {
            const unblockedTrackers = this.spliceUnblockedTrackers(company, urlsList)
            return {
                name: this.domain,
                iconName: '', // we won't have an icon for unknown first party trackers
                count: -2,
                urls: unblockedTrackers,
                urlsList: Object.keys(unblockedTrackers)
            }
        },

        // Return an array of unblocked trackers
        // and remove those entries from the specified company
        // only needed for unknown trackers, so far
        spliceUnblockedTrackers: function (company, urlsList) {
            if (!company || !company.urls || !urlsList) return null

            return urlsList.filter((url) => unblockedFilter(company, url))
                .reduce((unblockedTrackers, url) => {
                    unblockedTrackers[url] = company.urls[url]

                    // Update the company urls and urlsList
                    delete company.urls[url]
                    urlsList.splice(urlsList.indexOf(url), 1)

                    return unblockedTrackers
                }, {})
        },

        // Return true if company has unblocked trackers in the current tab
        hasUnblockedTrackers: function (company, urlsList) {
            if (!company || !company.urls || !urlsList) return false

            return urlsList.some((url) => unblockedFilter(company, url))
        },

        // Determines sorting order of the company list
        _setCount: function (company, companyName, urlsList) {
            let count = company.count
            // Unknown trackers, followed by unblocked first party,
            // should be at the bottom of the list
            if (companyName === 'unknown') {
                count = -1
            } else if (this.hasUnblockedTrackers(company, urlsList)) {
                count = -2
            }

            return count
        }
    }
)

module.exports = SiteCompanyList
