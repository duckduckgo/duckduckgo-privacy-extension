const Parent = window.DDG.base.Model

const whitelistStates = {
    'isWhitelisted': 'Off',
    'notWhitelisted': 'On',
}

const httpsStates = {
    'default': 'Secure',
    'upgraded': 'Secure', // was 'Upgraded'
    'none': 'Insecure'
};

const majorTrackerNetworks = [
    'amazon.com',
    'appnexus',
    'facebook',
    'google',
    'oracle',
    'twitter'
]

function Site (attrs) {
    this.disabled = true // disabled by default
    this.domain = '-'
    this.isWhitelisted = false
    this.siteRating = ''
    this.httpsState = 'none'
    this.httpsStatusText = ''
    this.isUserPrivacyUpgraded = false
    this.trackerCount = 0
    this.trackerNetworks
    this.numTrackerIconsToDisplay = 4
    Parent.call(this, attrs);

    this.bindEvents([
        [this.store.subscribe, 'change:backgroundMessage', this.updateTrackerCount]
    ])
}


Site.prototype = $.extend({},
  Parent.prototype,
  {

      modelName: 'site',

      getBackgroundTabData: function () {
          // console.log('[view] getBackgroundTabData()')
          let self = this;

          this.fetch({getCurrentTab: true}).then((tab) => {
              if (tab) {
                  this.fetch({getTab: tab.id}).then((backgroundTabObj) => {
                      if (backgroundTabObj) {
                          self.tab = backgroundTabObj
                          self.domain = backgroundTabObj.site.domain
                          self._getSiteRating()
                      }
                      self.setSiteProperties();
                      self.setHttpsMessage();
                      self.update();
                  });

              } else {
                  console.debug('Site view: no tab');
              }
          });
      },

      setSiteProperties: function() {
          if (!this.tab) {
              this.domain = 'new tab'; // tab can be null for firefox new tabs
              this.siteRating = '';
          }
          else {
              this.isWhitelisted = this.tab.site.whitelisted;
              this.setWhitelistStatusText();
              if (this.tab.site.isSpecialDomain) {
                  this.domain = this.tab.site.isSpecialDomain; // eg "extensions", "options", "new tab"
              } else {
                  this.set('disabled', false);
              }
          }

          if (this.domain && this.domain === '-') this.set('disabled', true);
      },

      setHttpsMessage: function () {
          if (!this.tab) return

          if (this.tab.upgradedHttps) {
              this.httpsState = 'upgraded';
          }
          else if (/^https/.exec(this.tab.url)) {
              this.httpsState = 'default';
          }

          this.httpsStatusText = httpsStates[this.httpsState];
      },

      setWhitelistStatusText: function () {
          if (this.isWhitelisted) {
              this.whitelistStatusText = whitelistStates['isWhitelisted'];
          } else {
              this.whitelistStatusText = whitelistStates['notWhitelisted'];
          }
      },

      update: function (ops) {
          // console.log('[model] update()')
          if (this.tab) {
              const newTrackersCount = this._getUniqueTrackersCount()
              const newTrackersBlockedCount = this._getUniqueTrackersBlockedCount()
              const newTrackerNetworks = this._getTrackerNetworksOnPage()
              const newUserPrivacy = this._getIsUserPrivacyUpgraded()

              if (ops && ops.siteRating && (ops.siteRating !== this.siteRating)) {
                  this.set('siteRating', ops.siteRating)
              }

              if (newTrackersCount !== this.trackersCount) {
                  this.set('trackersCount', newTrackersCount)
              }

              if (newTrackersBlockedCount !== this.trackersBlockedCount) {
                  this.set('trackersBlockedCount', newTrackersBlockedCount)
              }

              if (!this.trackerNetworks ||
                  (newTrackerNetworks.major.length !== this.trackerNetworks.major.length) ||
                  (newTrackerNetworks.numOthers !== this.trackerNetworks.numOthers)) {
                  this.set('trackerNetworks', newTrackerNetworks)
              }

              if (newUserPrivacy !== this.isUserPrivacyUpgraded) {
                  this.set('isUserPrivacyUpgraded', newUserPrivacy)
              }
          }
      },

      _getUniqueTrackersCount: function () {
          // console.log('[model] _getUniqueTrackersCount()')
          return Object.keys(this.tab.trackers).reduce((total, name) => {
              return this.tab.trackers[name].urls.length + total
          }, 0)
      },

      _getUniqueTrackersBlockedCount: function () {
          // console.log('[model] _getUniqueTrackersBlockedCount()')
          return Object.keys(this.tab.trackersBlocked).reduce((total, name) => {
              return this.tab.trackersBlocked[name].urls.length + total
          }, 0)
      },

      _getTrackerNetworksOnPage: function () {
          // console.log('[model] _getMajorTrackerNetworksOnPage()')
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

      _getIsUserPrivacyUpgraded: function () {
          // console.log('setIsUserPrivacyUpgraded()')
          if (!this.tab) return false

          if (this.tab.upgradedHttps ||
              Object.keys(this.tab.trackersBlocked).length > 0) {
              return true
          }

          return false
      },

      _getSiteRating: function () {
          // console.log('[model] _getSiteRating()')
          if (this.tab) {
            this.fetch({getSiteScore: this.tab.id}).then((rating) => {
                if (rating) this.update({siteRating: rating})
            })
          }
      },

      updateTrackerCount: function (message) {
          // console.log('[model] updateTrackerCount()')
          let self = this
          if (message.change.attribute === 'updateTrackerCount') {
              if (!this.tab) return
              let tabID = this.tab.id

              this.fetch({getTab: tabID}).then((backgroundTabObj) => {
                  self.tab = backgroundTabObj
                  self._getSiteRating()
              })
          }
      },

      toggleWhitelist: function () {
          if (this.tab && this.tab.site) {
              this.isWhitelisted = !this.isWhitelisted;
              this.set('whitelisted', this.isWhitelisted);

              this.fetch({'whitelisted': {
                  list: 'whitelisted',
                  domain: this.tab.site.domain,
                  value: this.isWhitelisted
              }
              });

              this.setWhitelistStatusText();
          }
      }

  }
);

module.exports = Site;
