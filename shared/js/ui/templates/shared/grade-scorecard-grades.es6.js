const statusList = require('./status-list.es6.js')

module.exports = function (rating) {
  const before = rating.before
  const after = rating.after

  if (!before || !after) return

  let detailItems = []

  detailItems.push({
    msg: 'Privacy Grade',
    modifier: before.toLowerCase()
  })

  if (before !== after) {
    detailItems.push({
      msg: 'Enhanced Grade',
      modifier: after.toLowerCase(),
      highlight: true
    })
  }

  return statusList(detailItems, 'status-list--right padded js-grade-scorecard-grades')
}
