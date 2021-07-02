const statusList = require('./status-list.es6.js')

module.exports = function (site) {
    const grades = getGrades(site.siteRating, site.isAllowlisted)

    if (!grades || !grades.length) return

    return statusList(grades, 'status-list--right padded js-grade-scorecard-grades')
}

function getGrades (rating, isAllowlisted) {
    if (!rating || !rating.before || !rating.after) return

    // transform site ratings into grades
    // that the template can display more easily
    const before = rating.cssBefore
    const after = rating.cssAfter

    const grades = []

    grades.push({
        msg: 'Privacy Grade',
        modifier: before.toLowerCase()
    })

    if (before !== after && !isAllowlisted) {
        grades.push({
            msg: 'Enhanced Grade',
            modifier: after.toLowerCase(),
            highlight: true
        })
    }

    return grades
}
