const Parent = window.DDG.base.Model
const httpsMessages = window.constants.httpsMessages
const parseUserAgent = require('./mixins/parse-user-agent.es6.js')

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
  attrs.browserInfo = this.parseUserAgentString()
  Parent.call(this, attrs)

  this.bindEvents([
    [this.store.subscribe, 'action:backgroundMessage', this.handleBackgroundMsg]
  ])
}

Site.prototype = window.$.extend({},
  Parent.prototype,
  parseUserAgent,
  {

    modelName: 'site',

    getBackgroundTabData: function () {
      // console.log('[site view] getBackgroundTabData()')
      return new Promise((resolve, reject) => {
        this.fetch({getCurrentTab: true}).then((tab) => {
          if (tab) {
            this.fetch({getTab: tab.id}).then((backgroundTabObj) => {
              if (backgroundTabObj) {
                this.set('tab', backgroundTabObj)
                this.domain = backgroundTabObj.site.domain
                this.fetchSiteRating()
                this.set('tosdr', backgroundTabObj.site.score.tosdr)
                this.set(
                  'isaMajorTrackingNetwork',
                  backgroundTabObj.site.score.isaMajorTrackingNetwork
                )
              }
              this.setSiteProperties()
              this.setHttpsMessage()
              this.update()
              resolve()
            })
          } else {
            console.debug('Site model: no tab')
            resolve()
          }
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
        if (ops && ops.siteRating &&
          (ops.siteRating.after !== this.siteRating.after)) {
          this.set({
            'siteRating': ops.siteRating,
            'isCalculatingSiteRating': false
          })

        // got site rating from background process,
        // but no change in 'after' rating
        } else if (ops && ops.siteRating) {
          if (this.isCalculatingSiteRating) {
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
        return this.tab.trackersBlocked[name].urls.length + total
      }, 0)

      return count
    },

    getUnknownTrackersCount: function () {
      // console.log('[model] getUnknownTrackersCount()')
      const unknownTrackers = this.tab.trackers ? this.tab.trackers.unknown : {}

      let count = 0
      if (unknownTrackers && unknownTrackers.urls) {
        count = unknownTrackers.urls.length
      }

      return count
    },

    getMajorTrackerNetworksCount: function () {
      // console.log('[model] getMajorTrackerNetworksCount()')
      const count = Object.keys(this.tab.trackers).reduce((total, name) => {
        let tempTracker = name.toLowerCase()
        const majorTrackingNetworks = Object.keys(window.constants.majorTrackingNetworks)
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
          window.constants.majorTrackingNetworks[tracker]
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
