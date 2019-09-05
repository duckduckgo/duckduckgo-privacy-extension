const bel = require('bel')
const constants = require('../../../data/constants')
const entityIconMapping = constants.entityIconMapping

module.exports = function (companyListMap) {
    return companyListMap.map((data) => {
        return bel`<li class="top-blocked__li top-blocked__li--truncated">
    <div class="top-blocked__pill" aria-label="${data.name} found on ${data.percent}% of sites">
        <div class="top-blocked__pill-site__icon-container">
            <div class="top-blocked__pill-site__icon ${getScssClass(data.name)}"></div>
        </div>
        <div class="top-blocked__pill__divider"></div>
        <div class="top-blocked__pill__blocker-pct js-top-blocked-pct">
            ${data.percent}%
        </div>
    </div>
</li>`
    })

    function getScssClass (companyName) {
        const iconClassName = entityIconMapping[companyName] || 'generic'
        return iconClassName
    }
}
