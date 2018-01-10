const statusList = require('./status-list.es6.js')

module.exports = function (site) {
  const grades = getGrades(site.siteRating)

  if (!grades || !grades.length) return

  return statusList(grades, 'status-list--right padded js-grade-scorecard-grades')
}

function getGrades (rating) {
  if (!rating || !rating.before || !rating.after) return

  // transform site ratings into grades
  // that the template can display more easily
  const before = rating.before
  const after = rating.after

  let grades = []

  grades.push({
    msg: 'Privacy Grade',
    modifier: before.toLowerCase()
  })

  if (before !== after && !this.site.isWhitelisted) {
    grades.push({
      msg: 'Enhanced Grade',
      modifier: after.toLowerCase(),
      highlight: true
    })
  }

  return grades
}
