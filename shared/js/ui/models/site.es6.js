const Parent = window.DDG.base.Model
const constants = require('../../../data/constants')
const httpsMessages = constants.httpsMessages
const browserUIWrapper = require('./../base/ui-wrapper.es6.js')
const submitBreakageForm = require('./submit-breakage-form.es6')

// for now we consider tracker networks found on more than 7% of sites
// as "major"
const MAJOR_TRACKER_THRESHOLD_PCT = 7

function Site (attrs) {
    attrs = attrs || {}
    attrs.disabled = true // disabled by default
    attrs.tab = null
    attrs.domain = '-'
    attrs.protectionsEnabled = false
    attrs.isBroken = false
    attrs.displayBrokenUI = false

    attrs.isAllowlisted = false
    attrs.allowlistOptIn = false
    attrs.isCalculatingSiteRating = true
    attrs.siteRating = {}
    attrs.httpsState = 'none'
    attrs.httpsStatusText = ''
    attrs.trackersCount = 0 // unique trackers count
    attrs.majorTrackerNetworksCount = 0
    attrs.totalTrackerNetworksCount = 0
    attrs.trackerNetworks = []
    attrs.tosdr = {}
    attrs.isaMajorTrackingNetwork = false
    Parent.call(this, attrs)

    this.bindEvents([
        [this.store.subscribe, 'action:backgroundMessage', this.handleBackgroundMsg]
    ])
}

Site.prototype = window.$.extend({},
    Parent.prototype,
    {

        modelName: 'site',

        getBackgroundTabData: function () {
            return new Promise((resolve) => {
                browserUIWrapper.getBackgroundTabData().then((tab) => {
                    if (tab) {
                        this.set('tab', tab)
                        this.domain = tab.site.domain
                        this.fetchSiteRating()
                        this.set('tosdr', tab.site.tosdr)
                        this.set('isaMajorTrackingNetwork', tab.site.parentPrevalence >= MAJOR_TRACKER_THRESHOLD_PCT)

                        this.sendMessage('getSetting', { name: 'tds-etag' }).then(etag => this.set('tds', etag))
                    } else {
                        console.debug('Site model: no tab')
                    }

                    this.setSiteProperties()
                    this.setHttpsMessage()
                    this.update()
                    resolve()
                })
            })
        },

        fetchSiteRating: function () {
            // console.log('[model] fetchSiteRating()')
            if (this.tab) {
                this.sendMessage('getSiteGrade', this.tab.id).then((rating) => {
                    console.log('fetchSiteRating: ', rating)
                    if (rating) this.update({ siteRating: rating })
                })
            }
        },

        setSiteProperties: function () {
            if (!this.tab) {
                this.domain = 'new tab' // tab can be null for firefox new tabs
                this.set({ isCalculatingSiteRating: false })
            } else {
                this.initAllowlisted(this.tab.site.allowlisted, this.tab.site.denylisted)
                this.allowlistOptIn = this.tab.site.allowlistOptIn
                if (this.tab.site.specialDomainName) {
                    this.domain = this.tab.site.specialDomainName // eg "extensions", "options", "new tab"
                    this.set({ isCalculatingSiteRating: false })
                } else {
                    this.set({ disabled: false })
                }
            }

            if (this.domain && this.domain === '-') this.set('disabled', true)
        },

        setHttpsMessage: function () {
            if (!this.tab) return

            if (this.tab.upgradedHttps) {
                this.httpsState = 'upgraded'
            } else if (/^https/.exec(this.tab.url)) {
                this.httpsState = 'secure'
            } else {
                this.httpsState = 'none'
            }

            this.httpsStatusText = httpsMessages[this.httpsState]
        },

        handleBackgroundMsg: function (message) {
            // console.log('[model] handleBackgroundMsg()')
            if (!this.tab) return
            if (message.action && message.action === 'updateTabData') {
                this.sendMessage('getTab', this.tab.id).then((backgroundTabObj) => {
                    this.tab = backgroundTabObj
                    this.update()
                    this.fetchSiteRating()
                })
            }
        },

        // calls `this.set()` to trigger view re-rendering
        update: function (ops) {
            // console.log('[model] update()')
            if (this.tab) {
                // got siteRating back from background process
                if (ops &&
                        ops.siteRating &&
                        ops.siteRating.site &&
                        ops.siteRating.enhanced) {
                    let before = ops.siteRating.site.grade
                    let after = ops.siteRating.enhanced.grade

                    // we don't currently show D- grades
                    if (before === 'D-') before = 'D'
                    if (after === 'D-') after = 'D'

                    if (before !== this.siteRating.before ||
                        after !== this.siteRating.after) {
                        const newSiteRating = {
                            cssBefore: before.replace('+', '-plus').toLowerCase(),
                            cssAfter: after.replace('+', '-plus').toLowerCase(),
                            before,
                            after
                        }

                        this.set({
                            siteRating: newSiteRating,
                            isCalculatingSiteRating: false
                        })
                    } else if (this.isCalculatingSiteRating) {
                        // got site rating from background process
                        this.set('isCalculatingSiteRating', false)
                    }
                }

                const newTrackersCount = this.getUniqueTrackersCount()
                if (newTrackersCount !== this.trackersCount) {
                    this.set('trackersCount', newTrackersCount)
                }

                const newTrackersBlockedCount = this.getUniqueTrackersBlockedCount()
                if (newTrackersBlockedCount !== this.trackersBlockedCount) {
                    this.set('trackersBlockedCount', newTrackersBlockedCount)
                }

                const newTrackerNetworks = this.getTrackerNetworksOnPage()
                if (this.trackerNetworks.length === 0 ||
                        (newTrackerNetworks.length !== this.trackerNetworks.length)) {
                    this.set('trackerNetworks', newTrackerNetworks)
                }

                const newUnknownTrackersCount = this.getUnknownTrackersCount()
                const newTotalTrackerNetworksCount = newUnknownTrackersCount + newTrackerNetworks.length
                if (newTotalTrackerNetworksCount !== this.totalTrackerNetworksCount) {
                    this.set('totalTrackerNetworksCount', newTotalTrackerNetworksCount)
                }

                const newMajorTrackerNetworksCount = this.getMajorTrackerNetworksCount()
                if (newMajorTrackerNetworksCount !== this.majorTrackerNetworksCount) {
                    this.set('majorTrackerNetworksCount', newMajorTrackerNetworksCount)
                }
            }
        },

        getUniqueTrackersCount: function () {
            // console.log('[model] getUniqueTrackersCount()')
            const count = Object.keys(this.tab.trackers).reduce((total, name) => {
                return this.tab.trackers[name].count + total
            }, 0)

            return count
        },

        getUniqueTrackersBlockedCount: function () {
            // console.log('[model] getUniqueTrackersBlockedCount()')
            const count = Object.keys(this.tab.trackersBlocked).reduce((total, name) => {
                const companyBlocked = this.tab.trackersBlocked[name]

                // Don't throw a TypeError if urls are not there
                const trackersBlocked = companyBlocked.urls ? Object.keys(companyBlocked.urls) : null

                // Counting unique URLs instead of using the count
                // because the count refers to all requests rather than unique number of trackers
                const trackersBlockedCount = trackersBlocked ? trackersBlocked.length : 0
                return trackersBlockedCount + total
            }, 0)

            return count
        },

        getUnknownTrackersCount: function () {
            // console.log('[model] getUnknownTrackersCount()')
            const unknownTrackers = this.tab.trackers ? this.tab.trackers.unknown : {}

            let count = 0
            if (unknownTrackers && unknownTrackers.urls) {
                const unknownTrackersUrls = Object.keys(unknownTrackers.urls)
                count = unknownTrackersUrls ? unknownTrackersUrls.length : 0
            }

            return count
        },

        getMajorTrackerNetworksCount: function () {
            // console.log('[model] getMajorTrackerNetworksCount()')
            // Show only blocked major trackers count, unless site is allowlisted
            const trackers = this.protectionsEnabled ? this.tab.trackersBlocked : this.tab.trackers
            const count = Object.values(trackers).reduce((total, t) => {
                const isMajor = t.prevalence > MAJOR_TRACKER_THRESHOLD_PCT
                total += isMajor ? 1 : 0
                return total
            }, 0)

            return count
        },

        getTrackerNetworksOnPage: function () {
            // console.log('[model] getMajorTrackerNetworksOnPage()')
            // all tracker networks found on this page/tab
            const networks = Object.keys(this.tab.trackers)
                .map((t) => t.toLowerCase())
                .filter((t) => t !== 'unknown')
            return networks
        },

        initAllowlisted: function (allowListValue, denyListValue) {
            this.isAllowlisted = allowListValue
            this.isDenylisted = denyListValue

            this.isBroken = this.tab.site.isBroken || !this.tab.site.enabledFeatures.includes('contentBlocking')
            this.displayBrokenUI = this.isBroken

            if (denyListValue) {
                this.displayBrokenUI = false
                this.protectionsEnabled = true
            } else {
                this.protectionsEnabled = !(this.isAllowlisted || this.isBroken)
            }
            this.set('protectionsEnabled', this.protectionsEnabled)
        },

        setList (list, domain, value) {
            this.sendMessage('setList', {
                list,
                domain,
                value
            })
        },

        toggleAllowlist: function () {
            if (this.tab && this.tab.site) {
                if (this.isBroken) {
                    this.initAllowlisted(this.isAllowlisted, !this.isDenylisted)
                    this.setList('denylisted', this.tab.site.domain, this.isDenylisted)
                } else {
                    // Explicitly remove all denylisting if the site is broken. This covers the case when the site has been removed from the list.
                    this.setList('denylisted', this.tab.site.domain, false)
                    this.initAllowlisted(!this.isAllowlisted)

                    if (this.isAllowlisted && this.allowlistOptIn) {
                        this.set('allowlistOptIn', false)
                        this.setList('allowlistOptIn', this.tab.site.domain, false)
                    }

                    this.setList('allowlisted', this.tab.site.domain, this.isAllowlisted)
                }
            }
        },

        submitBreakageForm: submitBreakageForm
    }
)

module.exports = Site
