const bel = require('bel')
// TODO/FIXME: this is a hack:
const _constants = require('./../../../data/constants.js')
const majorTrackingNetworks = window.constants.majorTrackingNetworks

module.exports = function (companyListMap) {
   function getScssTrackerName(trackerName) {
        var genericName = 'generic'

        if (majorTrackingNetworks[trackerName]) {
            return trackerName
        } else {
            return genericName
        }
    }

    return companyListMap.map((data) => {
        return bel`<li class="top-blocked__li top-blocked__li--truncated">
            <div class="top-blocked__pill">
                <div class="top-blocked__li-site__icon ${getScssTrackerName(data.name.toLowerCase())}"></div>
                <div class="top-blocked__li__blocker-pct js-top-blocked-pct">
                    ${data.percent}%
                </div>
            </div>
      </li>`
    })
}

