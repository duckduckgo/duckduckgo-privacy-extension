const Parent = require('./sliding-subview.es6.js')

function GradeScorecard (ops) {
  this.model = ops.model
  this.template = ops.template

  Parent.call(this, ops)

  this.setupClose()
}

GradeScorecard.prototype = window.$.extend({},
  Parent.prototype,
  {
    _render: function (ops) {
      // doing this so the template can get access to the reasons
      // TODO put them on a model? allow them to be passed via the arguments
      // to _render like we do in core?
      this.reasons = this._getReasons()

      Parent.prototype._render.call(this, ops)
    },

    _getReasons: function () {
      let reasons = []

      // grab all the data from the model to create
      // a list of reasons behind the grade

      // encryption status
      let httpsStatusText = this.model.httpsStatusText
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
      let numTrackerNetworks = this.model.trackerNetworks.length
      if (numTrackerNetworks) {
        reasons.push({
          modifier: 'bad',
          msg: `${numTrackerNetworks} Tracker Networks Blocked`
        })
      }

      // major tracking networks,
      // only show a message if it's bad
      let majorTrackers = this.model.trackerNetworks.filter((tracker) => {
        return window.constants.majorTrackingNetworks[tracker]
      })
      if (majorTrackers.length) {
        reasons.push({
          modifier: 'bad',
          msg: `${majorTrackers.length} Major Tracker Networks Blocked`
        })
      }

      if (this.model.isaMajorTrackingNetwork) {
        reasons.push({
          modifier: 'bad',
          msg: `Site Is Part Of A Major Tracker Network`
        })
      }

      // privacy practices from tosdr
      let privacyMessage = this.model.tosdr && this.model.tosdr.message
      if (privacyMessage && privacyMessage !== 'Unknown') {
        reasons.push({
          modifier: privacyMessage.toLowerCase(),
          msg: `${privacyMessage} Privacy Practices`
        })
      }

      return reasons
    }
  }
)

module.exports = GradeScorecard
