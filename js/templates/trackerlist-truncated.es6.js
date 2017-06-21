const bel = require('bel');
const trackerListItems = require('./shared/trackerlist-items.es6.js');

module.exports = function () {

    return bel`<section class="top-blocked card">
        <h3 class="menu-title">Top blocked over time</h3>
        <ul class="menu-list top-blocked__list">
            ${trackerListItems(this.model.companyListMap)}
            <li class="top-blocked__li top-blocked__li--see-all border--top">
                <a href="#" class="link-secondary js-top-blocked-see-all">See all</a></li>
        </ul>
    </section>`
}

