const bel = require('bel');
const trackerListItems = require('./shared/trackerlist-items.es6.js');

module.exports = function () {

    if (this.doRenderListOnly) {
        return renderList(this.model);
    }

    return bel`<section class="sliding-subview sliding-subview--trackers-blocked sliding-subview--has-fixed-header">
        <nav class="sliding-subview__header card">
          <a href="#" class="sliding-subview__header__title js-sliding-subview-close">
            Trackers
          </a>
          <ol class="sliding-subview__header__tabbed-nav">
            <a href="#">Page</a>
            <a href="#" class="active">All Time</a>
          </ol>
        </nav>
        ${renderList(this.model)}
    </section>`;

    function renderList (model) {
        if (model && model.companyListMap) {
            return bel`<ol class="menu-list top-blocked__list card">
                ${trackerListItems(model.companyListMap)}
            </ol>`;
        }
    }
}

