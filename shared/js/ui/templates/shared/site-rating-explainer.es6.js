const bel = require('bel')

module.exports = function (isCalculating, rating, isWhitelisted) {
    let msg = ``

    if (isCalculating) {
        msg = `Calculating...`
    } else if (rating && (rating.before || rating.after)) {
        const _rating = isWhitelisted ? rating.before : rating.after
        msg = `This received a "${_rating.toUpperCase()}" Privacy Grade
          for the reasons below.`
    }

    return bel`<p class="site-info--details__explainer
        js-rating-explainer border--bottom">
            ${msg}
        </p>`
}
