const bel = require('bel')

module.exports = function () {
    return bel`<ul>
        <li class="privacy-practices__detail-item
            privacy-practices__detail-item--bad">
            You must provide your legal name
        </li>
        <li class="privacy-practices__detail-item
            privacy-practices__detail-item--good">
            Your personal information is used for limited purposes
        </li>
    </ul>`
}
