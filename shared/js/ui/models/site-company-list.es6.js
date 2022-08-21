const Parent = window.DDG.base.Model
const { getTrackerAggregationStats } = require('./mixins/calculate-aggregation-stats')
const normalizeCompanyName = require('./mixins/normalize-company-name.es6')
const browserUIWrapper = require('./../base/ui-wrapper.es6.js')

function SiteCompanyList (attrs) {
    attrs = attrs || {}
    attrs.tab = null
    this.aggregationStats = getTrackerAggregationStats([])
    Parent.call(this, attrs)
}

SiteCompanyList.prototype = window.$.extend({},
    Parent.prototype,
    normalizeCompanyName,
    {

        modelName: 'siteCompanyList',

        fetchAsyncData: function () {
            return new Promise((resolve, reject) => {
                browserUIWrapper.getBackgroundTabData().then((bkgTab) => {
                    if (bkgTab) {
                        /** @type {import('../../background/classes/tab')} */
                        this.tab = bkgTab
                        this.domain = this.tab && this.tab.site ? this.tab.site.domain : ''
                        this.aggregationStats = getTrackerAggregationStats(this.tab.trackers)
                    } else {
                        console.debug('SiteDetails model: no tab')
                    }
                    resolve()
                }).catch(() => {
                    console.debug('SiteDetails model: no tab')
                    resolve()
                })
            })
        }
    }
)

module.exports = SiteCompanyList
