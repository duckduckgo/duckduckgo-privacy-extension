const bel = require('bel');
const trackerListItems = require('./shared/trackerlist-items.es6.js');

module.exports = function () {

    return bel`<section class="sliding-subview sliding-subview--has-fixed-header">
        <nav class="sliding-subview__header card">
          <a href="#" class="sliding-subview__header__title js-sliding-subview-close">
            Trackers
          </a>
          <ol class="sliding-subview__header__tabbed-nav">
            <a href="#">Page</a>
            <a href="#" class="active">All Time</a>
          </ol>
        </nav>
        ${renderList(this.selectedTab, this.model)}
    </section>`

    function renderList (selectedTab, model) {
        let olClass;
        if (selectedTab === 'all') {
            olClass = 'top-blocked__list';
        } else if (selectedTab === 'page') {
           olClass = 'page-blocked__list';
        }

        if (model && model.companyListMap) {
            return bel`<ol class="menu-list ${olClass}">
                ${trackerListItems(model.companyListMap)}
            </ol>`;
        }
    }
}

