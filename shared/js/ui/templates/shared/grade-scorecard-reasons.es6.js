const bel = require('bel')
const statusList = require('./status-list.es6.js')

module.exports = function (reasons) {
  if (!reasons || !reasons.length) return

  return statusList(reasons, 'status-list--right padded border--bottom--inner js-grade-scorecard-reasons')
}
