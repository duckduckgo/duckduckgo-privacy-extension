const statusList = require('./status-list.es6.js')

module.exports = function (site) {
    const grades = getGrades(site.siteRating, site.isWhitelisted)

    if (!grades || !grades.length) return

    return statusList(grades, 'status-list--right padded js-grade-scorecard-grades')
}

function getGrades (rating, isWhitelisted) {
    if (!rating || !rating.before || !rating.after) return

    // transform site ratings into grades
    // that the template can display more easily
    const before = rating.cssBefore
    const after = rating.cssAfter

    let grades = []

    grades.push({
        msg: 'Privacy Grade',
        modifier: before.toLowerCase()
    })

    if (before !== after && !isWhitelisted) {
        grades.push({
            msg: 'Enhanced Grade',
            modifier: after.toLowerCase(),
            highlight: true
        })
    }

    return grades
}
