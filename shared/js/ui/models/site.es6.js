const Parent = window.DDG.base.Model
const constants = require('../../../data/constants')
const httpsMessages = constants.httpsMessages
const browserUIWrapper = require('./../base/$BROWSER-ui-wrapper.es6.js')

function Site (attrs) {
    attrs = attrs || {}
    attrs.disabled = true // disabled by default
    attrs.tab = null
    attrs.domain = '-'
    attrs.isWhitelisted = false
    attrs.isCalculatingSiteRating = true
    attrs.siteRating = {}
    attrs.httpsState = 'none'
    attrs.httpsStatusText = ''
    attrs.isUserPrivacyUpgraded = false
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
                        this.set('isaMajorTrackingNetwork', tab.site.score.isaMajorTrackingNetwork)
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
                this.fetch({getSiteScore: this.tab.id}).then((rating) => {
                    console.log('fetchSiteRating: ', rating)
                    if (rating) this.update({siteRating: rating})
                })
            }
        },

        setSiteProperties: function () {
            if (!this.tab) {
                this.domain = 'new tab' // tab can be null for firefox new tabs
                this.set({isCalculatingSiteRating: false})
            } else {
                this.isWhitelisted = this.tab.site.whitelisted
                if (this.tab.site.isSpecialDomain) {
                    this.domain = this.tab.site.isSpecialDomain // eg "extensions", "options", "new tab"
                    this.set({isCalculatingSiteRating: false})
                } else {
                    this.set({'disabled': false})
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
                this.fetch({getTab: this.tab.id}).then((backgroundTabObj) => {
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
                // got siteRating back fr/ background process,
                // 'after' rating changed, template needs re-render
                if (ops && ops.siteRating) {
                    const before = ops.siteRating.site.grade
                    const after = ops.siteRating.enhanced.grade

                    if (after !== this.siteRating.after) {
                        const newSiteRating = {
                            displayBefore: before.replace('+', '-plus').toLowerCase(),
                            displayAfter: after.replace('+', '-plus').toLowerCase(),
                            before,
                            after
                        }

                        this.set({
                            'siteRating': newSiteRating,
                            'isCalculatingSiteRating': false
                        })
                    } else if (this.isCalculatingSiteRating) {
                        // got site rating from background process,
                        // but no change in 'after' rating
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
                this.set('isPartOfMajorTrackingNetwork', this.getIsPartOfMajorTrackingNetwork())

                const newUserPrivacy = this.getIsUserPrivacyUpgraded()
                if (newUserPrivacy !== this.isUserPrivacyUpgraded) {
                    this.set('isUserPrivacyUpgraded', newUserPrivacy)
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
            // Show only blocked major trackers count, unless site is whitelisted
            const trackers = this.isWhitelisted ? this.tab.trackers : this.tab.trackersBlocked
            const count = Object.keys(trackers).reduce((total, name) => {
                let tempTracker = name.toLowerCase()
                const majorTrackingNetworks = Object.keys(constants.majorTrackingNetworks)
                    .filter((t) => t.toLowerCase() === tempTracker)
                // in case a major tracking network is in the list more than once somehow
                total += majorTrackingNetworks.length ? 1 : 0
                return total
            }, 0)

            return count
        },

        getIsPartOfMajorTrackingNetwork: function () {
            return this.isaMajorTrackingNetwork ||
                this.trackerNetworks.some((tracker) =>
                    constants.majorTrackingNetworks[tracker]
                )
        },

        getTrackerNetworksOnPage: function () {
            // console.log('[model] getMajorTrackerNetworksOnPage()')
            // all tracker networks found on this page/tab
            const networks = Object.keys(this.tab.trackers)
                .map((t) => t.toLowerCase())
                .filter((t) => t !== 'unknown')
            return networks
        },

        getIsUserPrivacyUpgraded: function () {
            // console.log('getIsUserPrivacyUpgraded()')
            if (!this.tab) return false

            if (this.tab.upgradedHttps ||
                    Object.keys(this.tab.trackersBlocked).length > 0) {
                return true
            }

            return false
        },

        toggleWhitelist: function () {
            if (this.tab && this.tab.site) {
                this.isWhitelisted = !this.isWhitelisted
                this.set('whitelisted', this.isWhitelisted)
                const whitelistOnOrOff = this.isWhitelisted ? 'off' : 'on'
                this.fetch({ firePixel: ['ept', whitelistOnOrOff] })

                this.fetch({'whitelisted':
                    {
                        list: 'whitelisted',
                        domain: this.tab.site.domain,
                        value: this.isWhitelisted
                    }
                })
            }
        }
    }
)

module.exports = Site
