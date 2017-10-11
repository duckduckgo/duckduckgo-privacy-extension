// TODO: delete this file

const bel = require('bel')
const gradeDetails = require('./grade-details.es6.js')
const trackerListFull = require('./trackerlist-full.es6.js')

module.exports = function () {
    if (!this.model) {
        // fist pass thru render function - just render tab nav
        return bel`<section class="sliding-subview
            sliding-subview--tabbed
            sliding-subview--has-fixed-header">
            <nav class="sliding-subview__header card">
                <a href="#" class="sliding-subview__header__title sliding-subview__header__title--has-icon js-sliding-subview-close">
                    <span class="icon icon__arrow icon__arrow--left pull-left"></span>
                </a>
                <div class="sliding-subview__header__tabbed-nav">
                    <a href="#" class="js-nav-tab js-nav-tab-page">Grade Details</a>
                    <a href="#" class="js-nav-tab js-nav-tab-all">All Time</a>
                </div>
            </nav>
        </section>`

    } else if (this.model.modelName.indexOf('siteDetails') > -1) {
        // site level tracker list
        return bel`<div class="js-trackerlist-tab">
            ${gradeDetails(this.model)}
        </div>`

    } else if (this.model.modelName.indexOf('trackerListTop') > -1) {
        // all-time tracker list
        return bel`<div class="js-trackerlist-tab">
            ${trackerListFull(this.model)}
            <div class="top-blocked__reset-stats">
                <h3>Data Privacy</h3>
                <a href="#" class="js-reset-trackers-data">Reset stats</a>
                <p>These stats are only stored locally on your device,
                and are not sent anywhere, ever.</p>
            </div>
        </div>`
    }
}

