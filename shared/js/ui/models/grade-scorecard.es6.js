const Parent = window.DDG.base.Model

function GradeScorecard (attrs) {
  Parent.call(this, attrs)

  this.reasons = this._getReasons()
}

GradeScorecard.prototype = window.$.extend({},
  Parent.prototype,
  {
    modelName: 'gradeScorecard',

    _getReasons: function () {
      const site = this.site
      let reasons = []

      // grab all the data from the site to create
      // a list of reasons behind the grade

      // encryption status
      let httpsStatusText = site.httpsStatusText
      if (httpsStatusText) {
        let connectionMsg = 'Unencrypted'
        let modifier = 'bad'

        if (httpsStatusText === 'Secure') {
          connectionMsg = 'Encrypted'
          modifier = 'good'
        }

        reasons.push({
          modifier,
          msg: `${connectionMsg} Connection`
        })
      }

      // tracking networks blocked,
      // only show a message if there's any blocked
      let numTrackerNetworks = site.trackerNetworks.length
      if (numTrackerNetworks) {
        reasons.push({
          modifier: 'bad',
          msg: `${numTrackerNetworks} Tracker Networks Blocked`
        })
      }

      // major tracking networks,
      // only show a message if it's bad
      let isPartOfMajorTrackingNetwork = site.isaMajorTrackingNetwork ||
        site.trackerNetworks.some((tracker) => {
          return window.constants.majorTrackingNetworks[tracker]
        })

      if (isPartOfMajorTrackingNetwork) {
        reasons.push({
          modifier: 'bad',
          msg: `Site Is Part of a Major Tracker Network`
        })
      }

      // privacy practices from tosdr
      let privacyMessage = site.tosdr && site.tosdr.message
      if (privacyMessage && privacyMessage !== 'Unknown') {
        reasons.push({
          modifier: privacyMessage.toLowerCase(),
          msg: `${privacyMessage} Privacy Practices`
        })
      }

      return reasons
    }
})

module.exports = GradeScorecard
