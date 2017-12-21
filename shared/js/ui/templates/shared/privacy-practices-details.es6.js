const bel = require('bel')
const utils = require('utils')

module.exports = function (tosdr) {
    if (tosdr && tosdr.reasons) {
        let good = tosdr.reasons.good || []
        let bad = tosdr.reasons.bad || []

        if (good.length || bad.length) {
            return bel`<ul>
                ${good.map(renderItem.bind(null, 'good'))}
                ${bad.map(renderItem.bind(null, 'bad'))}
            </ul>`
        }
    }

    return renderNoDetails()
}

function renderItem (modifier, item) {
    return bel`<li class="privacy-practices__detail-item
        privacy-practices__detail-item--${modifier} bold">
        ${utils.capitalizeFirstLetter(item)}
    </li>`
}

function renderNoDetails () {
    return bel`<div class="text--center">
        <div class="privacy-practices__details__no-detail-icon"></div>
        <h1 class="privacy-practices__details__title">
            No Privacy Practices Found
        </h1>
        <div class="privacy-practices__details__msg">
            The Privacy practices of this website have not been reviewed
        </div>
    </div>`
}
