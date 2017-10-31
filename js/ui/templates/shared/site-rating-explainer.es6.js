const bel = require('bel')

module.exports = function (rating) {
    let msg = ``
    if (rating) {
        msg = `This received a "${rating.toUpperCase()}" Privacy Grade
          for the reasons below.`
    }
    return bel`<p class="site-info--details__explainer
        js-rating-explainer border--bottom">
            ${msg}
    </p>`
}
