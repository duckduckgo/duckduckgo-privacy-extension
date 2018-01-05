const Parent = window.DDG.base.Model

function GradeScorecard (attrs) {
  Parent.call(this, attrs)

  if (!this.site) {
    throw new Error('The GradeScorecard model needs a Site model to be passed in')
  }

  this._updateReasons()

  this.bindEvents([
    [this.store.subscribe, 'site:change', this._updateReasons]
  ])
}

GradeScorecard.prototype = window.$.extend({},
  Parent.prototype,
  {
    modelName: 'gradeScorecard',

    _updateReasons: function () {
      let reasons = []

      // grab all the data from the site to create
      // a list of reasons behind the grade

      // encryption status
      let httpsStatusText = this.site.httpsStatusText
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
      let numTrackerNetworks = this.site.trackerNetworks.length
      if (numTrackerNetworks) {
        reasons.push({
          modifier: 'bad',
          msg: `${numTrackerNetworks} Tracker Networks Blocked`
        })
      }

      // major tracking networks,
      // only show a message if it's bad
      let isPartOfMajorTrackingNetwork = this.site.isaMajorTrackingNetwork ||
        this.site.trackerNetworks.some((tracker) =>
          window.constants.majorTrackingNetworks[tracker]
        )

      if (isPartOfMajorTrackingNetwork) {
        reasons.push({
          modifier: 'bad',
          msg: `Site Is Part of a Major Tracker Network`
        })
      }

      // privacy practices from tosdr
      let privacyMessage = this.site.tosdr && this.site.tosdr.message
      if (privacyMessage && privacyMessage !== 'Unknown') {
        reasons.push({
          modifier: privacyMessage.toLowerCase(),
          msg: `${privacyMessage} Privacy Practices`
        })
      }

      this.set('reasons', reasons)
    }
  }
)

module.exports = GradeScorecard
