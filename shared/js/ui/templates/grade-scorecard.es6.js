const bel = require('bel')
const reasons = require('./shared/grade-scorecard-reasons.es6.js')
const grades = require('./shared/grade-scorecard-grades.es6.js')
const ratingHero = require('./shared/rating-hero.es6.js')

module.exports = function () {
    return bel`<section class="sliding-subview sliding-subview--has-fixed-header">
    <div class="site-info site-info--full-height card">
        ${ratingHero(this.model, { showClose: true })}
        ${reasons(this.model)}
        ${grades(this.model)}
    </div>
</section>`
}
