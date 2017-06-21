const bel = require('bel');
const trackerListItems = require('./shared/trackerlist-items.es6.js');

module.exports = function () {

    let renderData;
    let ulClass;
    if (this.selectedTab === 'all') {
        renderData = this.model.companyListMap;
        ulClass = 'top-blocked__list';
    } else if (this.selectedTab === 'page') {
       renderData = this.model.trackerListMap;
       ulClass = 'page-blocked__list';
    }

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

        <ul class="menu-list ${ulClass}">
            ${trackerListItems(renderData)}
        </ul>
    </section>`

}

