const bel = require('bel')
const header = require('./shared/sliding-subview-header.es6.js')
const trackerListItems = require('./shared/trackerlist-items.es6.js')
const trackerListNoData = require('./shared/trackerlist-no-data.es6.js')

module.exports = function () {

    if (!this.model) {
        return bel`<section class="sliding-subview
            sliding-subview--has-fixed-header">
            ${header('All Trackers')}
        </section>`
    } else {
        return bel`<div class="js-top-blocked-content">
            ${renderList(this.model)}
            <div class="top-blocked__reset-stats">
                <h3>Data Privacy</h3>
                <a href="#" class="js-reset-trackers-data">Reset stats</a>
                <p>These stats are only stored locally on your device,
                and are not sent anywhere, ever.</p>
            </div>
        </div>`
    }
}

function renderList (model) {
    if (model.companyListMap.length > 0) {
        return bel`<ol class="default-list top-blocked__list card">
            ${trackerListItems(model.companyListMap)}
        </ol>`
    } else {
        return bel`<ol class="default-list top-blocked__list">
            <li class="top-blocked__li top-blocked__li--no-data">
                ${trackerListNoData()}
            </li>
        </ol>`
    }
}

