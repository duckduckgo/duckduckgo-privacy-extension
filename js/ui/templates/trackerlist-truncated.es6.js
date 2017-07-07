const bel = require('bel');
const trackerListItems = require('./shared/trackerlist-items.es6.js');

module.exports = function () {

    if (this.model.companyListMap && this.model.companyListMap.length > 0) {

        return bel`<section class="top-blocked card">
            <h3 class="menu-title border--bottom">Top blocked companies over time</h3>
            <ul class="menu-list top-blocked__list">
                ${trackerListItems(this.model.companyListMap)}
                <li class="top-blocked__li top-blocked__li--see-all border--top">
                    <a href="#" class="link-secondary js-top-blocked-see-all">
                        <span class="icon icon__arrow pull-right"></span>
                        See all
                    </a>
                </li>
            </ul>
        </section>`;

    } else {

        return bel`<section class="top-blocked card">
                    <h3 class="menu-title">Top blocked over time</h3>
                    <ul class="menu-list top-blocked__list">
                        <li class="top-blocked__li top-blocked__li--no-trackers">
                            No data collected yet... <br />
                            Start browsing the web and check back in a bit!
                        </li>
                    </ul>
            </section>`;

    }
}

