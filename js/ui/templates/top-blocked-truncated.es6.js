const bel = require('bel')
const listItems = require('./shared/top-blocked-list-items.es6.js')
const noData = require('./shared/top-blocked-no-data.es6.js')

module.exports = function () {

    if (this.model.companyListMap && this.model.companyListMap.length > 0) {
        return bel`<section class="top-blocked card">
            <h3 class="padded uppercase text--center">
                Tracker Network Hall of Shame
            </h3>
            <ol class="default-list top-blocked__list">
                ${listItems(this.model.companyListMap)}
                <li class="top-blocked__li top-blocked__li--see-all">
                    <a href="#" class="link-secondary js-top-blocked-see-all">
                        <span class="icon icon__arrow pull-right"></span>
                        All trackers
                    </a>
                </li>
            </ol>
        </section>`
    } else {
        return bel`<section class="top-blocked card card--transparent">
            <ol class="default-list top-blocked__list">
                <li class="top-blocked__li top-blocked__li--no-data">
                    ${noData()}
                </li>
            </ol>
        </section>`
    }
}

