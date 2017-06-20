const bel = require('bel');

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
    </section>`
}

