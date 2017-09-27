const bel = require('bel')
const trackerListItems = require('./shared/trackerlist-items.es6.js')
const trackerListNoData = require('./shared/trackerlist-no-data.es6.js')

module.exports = function () {

    if (this.model.companyListMap && this.model.companyListMap.length > 0) {
        return bel`<section class="top-blocked card">
            <h3 class="menu-title padded border--bottom">
                Top trackers across all sites
            </h3>
            <ul class="default-list top-blocked__list">
                ${trackerListItems(this.model.companyListMap)}
                <li class="top-blocked__li top-blocked__li--see-all border--top">
                    <a href="#" class="link-secondary js-top-blocked-see-all">
                        <span class="icon icon__arrow pull-right"></span>
                        All trackers
                    </a>
                </li>
            </ul>
        </section>`
    } else {
        return bel`<section class="top-blocked">
            <ol class="default-list top-blocked__list">
                <li class="top-blocked__li top-blocked__li--no-data">
                    ${trackerListNoData()}
                </li>
            </ol>
        </section>`
    }
}

