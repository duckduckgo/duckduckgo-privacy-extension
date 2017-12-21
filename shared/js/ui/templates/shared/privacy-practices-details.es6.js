const bel = require('bel')

module.exports = function (tosdr) {
    if (!tosdr || !tosdr.reasons) {
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

    let good = tosdr.reasons.good || []
    let bad = tosdr.reasons.bad || []

    return bel`<ul>
        ${good.map(renderItem.bind(null, 'good'))}
        ${bad.map(renderItem.bind(null, 'bad'))}
    </ul>`
}

function renderItem (modifier, item) {
    return bel`<li class="privacy-practices__detail-item
        privacy-practices__detail-item--${modifier} bold">
        ${item}
    </li>`
}
