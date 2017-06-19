const bel = require('bel');

module.exports = function () {

    return bel`<section class="sliding-subview sliding-subview--has-fixed-header">
        <nav class="sliding-subview__header card">
          <a href="#" class="js-sliding-subview-close">Trackers</a>
        </nav>
    </section>`
}

