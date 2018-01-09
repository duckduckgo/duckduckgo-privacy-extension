const statusList = require('./status-list.es6.js')

module.exports = function (grades) {
  if (!grades || !grades.length) return

  return statusList(grades, 'status-list--right padded js-grade-scorecard-grades')
}
