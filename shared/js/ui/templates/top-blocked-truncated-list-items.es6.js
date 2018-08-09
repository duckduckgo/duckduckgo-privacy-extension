const bel = require('bel')
const constants = require('../../../data/constants')
const majorTrackingNetworks = constants.majorTrackingNetworks

module.exports = function (companyListMap) {
    return companyListMap.map((data) => {
        return bel`<li class="top-blocked__li top-blocked__li--truncated">
    <div class="top-blocked__pill" aria-label="${data.name} found on ${data.percent}% of sites">
        <div class="top-blocked__pill-site__icon-container">
            <div class="top-blocked__pill-site__icon ${getScssClass(data.normalizedName)}"></div>
        </div>
        <div class="top-blocked__pill__divider"></div>
        <div class="top-blocked__pill__blocker-pct js-top-blocked-pct">
            ${data.percent}%
        </div>
    </div>
</li>`
    })

    function getScssClass (companyName) {
        var genericName = 'generic'

        // TODO: remove Oath special case when we have an icon for it
        if ((companyName !== 'oath') && majorTrackingNetworks[companyName]) {
            return companyName
        } else {
            return genericName
        }
    }
}
