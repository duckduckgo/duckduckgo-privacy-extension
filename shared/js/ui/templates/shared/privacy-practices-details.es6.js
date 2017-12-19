const bel = require('bel')

module.exports = function (tosdr) {
    if (!tosdr || !tosdr.reasons) {
        return bel`<div class="privacy-practices__detail__no-details">
            <img>
            <h1>No Privacy Practices Found</h1>
            The Privacy practices of this website have not been reviewed
        </div>`
    }

    let good = tosdr.reasons.good || [],
        bad = tosdr.reasons.bad || []

    return bel`<ul>
        ${good.map(renderItem.bind(null, 'good'))}
        ${bad.map(renderItem.bind(null, 'bad'))}
    </ul>`
}

function renderItem (modifier, item) {
    return bel`<li class="privacy-practices__detail-item
        privacy-practices__detail-item--${modifier}">
        ${item}
    </li>`
}
