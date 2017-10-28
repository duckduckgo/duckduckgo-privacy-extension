const Parent = window.DDG.base.Model

const httpsStates = {
    'secure': 'Secure',
    'upgraded': 'Secure', // was 'Upgraded'
    'none': 'Insecure'
}

const majorTrackerNetworks = [
    'amazon.com',
    'appnexus',
    'facebook',
    'google',
    'oracle',
    'twitter'
]

function Site (attrs) {
    attrs = attrs || {}
    attrs.disabled = true // disabled by default
    attrs.tab = null
    attrs.domain = '-'
    attrs.isWhitelisted = false
    attrs.siteRating = ''
    attrs.httpsState = 'none'
    attrs.httpsStatusText = ''
    attrs.isUserPrivacyUpgraded = false
    attrs.trackerCount = 0
    attrs.trackerNetworks
    attrs.numTrackerIconsToDisplay = 4
    Parent.call(this, attrs)

    this.bindEvents([
        [this.store.subscribe, 'action:backgroundMessage', this.handleBackgroundMsg]
    ])
}


Site.prototype = $.extend({},
  Parent.prototype,
  {

      modelName: 'site',

      getBackgroundTabData: function () {
          // console.log('[view] getBackgroundTabData()')
          return new Promise((resolve, reject) => {
              this.fetch({getCurrentTab: true}).then((tab) => {
                  if (tab) {
                      this.fetch({getTab: tab.id}).then((backgroundTabObj) => {
                          if (backgroundTabObj) {
                              this.tab = backgroundTabObj
                              this.domain = backgroundTabObj.site.domain
                              this.fetchSiteRating()
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
                  console.log('fetchSiteRating: ' + rating)
                  if (rating) this.update({siteRating: rating})
              })
          }
      },

      setSiteProperties: function() {
          if (!this.tab) {
              this.domain = 'new tab' // tab can be null for firefox new tabs
              this.siteRating = ''
          }
          else {
              this.isWhitelisted = this.tab.site.whitelisted
              if (this.tab.site.isSpecialDomain) {
                  this.domain = this.tab.site.isSpecialDomain; // eg "extensions", "options", "new tab"
              } else {
                  this.set('disabled', false)
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

          this.httpsStatusText = httpsStates[this.httpsState]
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

      update: function (ops) {
          // console.log('[model] update()')
          if (this.tab) {

              if (ops && ops.siteRating && (ops.siteRating !== this.siteRating)) {
                  this.set('siteRating', ops.siteRating)
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
              if (!this.trackerNetworks ||
                  (newTrackerNetworks.major.length !== this.trackerNetworks.major.length) ||
                  (newTrackerNetworks.numOthers !== this.trackerNetworks.numOthers)) {
                  this.set('trackerNetworks', newTrackerNetworks)
              }

              const newUserPrivacy = this.getIsUserPrivacyUpgraded()
              if (newUserPrivacy !== this.isUserPrivacyUpgraded) {
                  this.set('isUserPrivacyUpgraded', newUserPrivacy)
              }
          }
      },

      getUniqueTrackersCount: function () {
          // console.log('[model] getUniqueTrackersCount()')
          return Object.keys(this.tab.trackers).reduce((total, name) => {
              return this.tab.trackers[name].urls.length + total
          }, 0)
      },

      getUniqueTrackersBlockedCount: function () {
          // console.log('[model] getUniqueTrackersBlockedCount()')
          return Object.keys(this.tab.trackersBlocked).reduce((total, name) => {
              return this.tab.trackersBlocked[name].urls.length + total
          }, 0)
      },

      getTrackerNetworksOnPage: function () {
          // console.log('[model] getMajorTrackerNetworksOnPage()')
          // all tracker networks found on this page/tab
          const networks = Object.keys(this.tab.trackers)
                              .map((t) => t.toLowerCase())
                              .filter((t) => t !== 'unknown')


          // major tracker networks found on this page/tab
          const major = networks.filter((t) => majorTrackerNetworks.includes(t))

          return {
              major: major,
              numOthers: networks.length - major.length
          }
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

              this.fetch({'whitelisted': {
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
