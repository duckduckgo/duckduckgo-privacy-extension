const bel = require('bel')
const gradeDetails = require('./grade-details.es6.js')
const trackerListItems = require('./shared/trackerlist-items.es6.js')
const trackerListNoData = require('./shared/trackerlist-no-data.es6.js')

module.exports = function () {

    if (!this.model) {
        // fist pass thru render function - just render tab nav
        return bel`<section class="sliding-subview
            sliding-subview--trackers-blocked
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
            <div class="sliding-subview__reset-stats">
                <h3>Data Privacy</h3>
                <a href="#" class="js-reset-trackers-data">Reset stats</a>
                <p>These stats are only stored locally on your device,
                and are not sent anywhere, ever.</p>
            </div>
        </section>`

    } else if (this.model.modelName.indexOf('siteTrackerList') > -1) {
        // site level tracker list
        return bel`<div class="js-trackerlist-tab card">
            ${gradeDetails(this.model)}
        </div>`

    } else if (this.model && this.model.companyListMap) {
        // all-time tracker list
        if (this.model.companyListMap.length > 0) {
            return bel`<ol class="default-list top-blocked__list card js-trackerlist-tab">
                ${trackerListItems(this.model.companyListMap)}
            </ol>`
        } else {
            return bel`<ol class="default-list top-blocked__list js-trackerlist-tab">
                <li class="top-blocked__li top-blocked__li--no-data">
                    ${trackerListNoData()}
                </li>
            </ol>`
        }
    }


}

