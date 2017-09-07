const Parent = window.DDG.base.Model;

const whitelistStates = {
    'isWhitelisted': 'Off',
    'notWhitelisted': 'On',
}

const httpsStates = {
    'default': 'Secure',
    'upgraded': 'Upgraded',
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
    attrs.disabled = true; // disabled by default
    attrs.httpsState = 'none';
    attrs.httpsStatusText = httpsStates[attrs.httpsState];
    attrs.isUserPrivacyUpgraded = false;
    Parent.call(this, attrs);
};


Site.prototype = $.extend({},
  Parent.prototype,
  {

      modelName: 'site',

      setSiteObj: function() {
          if (!this.tab) {
              this.domain = 'new tab'; // tab can be null for firefox new tabs
              this.siteRating = '';
          }
          else {
              this.isWhitelisted = this.tab.site.whitelisted;
              this.setWhitelistStatusText();
              if (this.tab.site.isSpecialDomain) {
                  this.domain = this.tab.site.isSpecialDomain; // eg "extensions", "options", "new tab"
              }
              else {
                  this.disabled = false;
              }
          }
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

      update: function (updatedSiteRating) {
          console.log('[model] update()')
          let rerenderFlag = false

          if (this.tab) {
              const updatedTrackersCount = this._getUniqueTrackersCount()
              const updatedTrackersBlockedCount = this._getUniqueTrackersBlockedCount()
              const updatedTrackerNetworks = this._getTrackerNetworksOnPage()
              const updatedUserPrivacy = this._getIsUserPrivacyUpgraded() 

              if (updatedSiteRating !== this.siteRating) {
                    this.siteRating = updatedSiteRating
                    rerenderFlag = true
                }

              if (updatedTrackersCount !== this.trackersCount) {
                  this.trackersCount = updatedTrackersCount
                  rerenderFlag = true
              }

              if (updatedTrackersBlockedCount !== this.trackersBlockedCount) {
                  this.trackersBlockedCount = updatedTrackersBlockedCount
                  rerenderFlag = true
              }

              if (!this.trackerNetworks || 
                  (updatedTrackerNetworks.major.length !== this.trackerNetworks.major.length) ||
                  (updatedTrackerNetworks.numOthers !== this.trackerNetworks.numOthers)) {
                this.trackerNetworks = updatedTrackerNetworks
                rerenderFlag = true
              }

              if (updatedUserPrivacy !== this.isUserPrivacyUpgraded) {
                this.isUserPrivacyUpgraded = updatedUserPrivacy
                rerenderFlag = true
              }
          }

          return rerenderFlag
      },

      toggleWhitelist: function () {
          if (this.tab && this.tab.site) {
              this.isWhitelisted = !this.isWhitelisted;

              this.fetch({'whitelisted': {
                  list: 'whitelisted',
                  domain: this.tab.site.domain,
                  value: this.isWhitelisted
              }
              });
              this.setWhitelistStatusText();
          }
      },

      _getUniqueTrackersCount: function () {
          console.log('[model] _getUniqueTrackersCount()')
          return Object.keys(this.tab.trackers).reduce((total, name) => {
              return this.tab.trackers[name].urls.length + total
          }, 0)
      },

      _getUniqueTrackersBlockedCount: function () {
          console.log('[model] _getUniqueTrackersBlockedCount()')
          return Object.keys(this.tab.trackersBlocked).reduce((total, name) => {
              return this.tab.trackersBlocked[name].urls.length + total
          }, 0)
      },

      _getTrackerNetworksOnPage: function () {
          console.log('[model] _getMajorTrackerNetworksOnPage()')

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
          console.log('setIsUserPrivacyUpgraded()')
          if (!this.tab) return false

          if (this.tab.upgradedHttps || 
              Object.keys(this.tab.trackersBlocked).length > 0) {
              return true
          } 

          return false
      }


  }
);

module.exports = Site;
