const bel = require('bel')
const constants = require('../../../data/constants')
const normalizeCompanyName = require('./shared/normalize-company-icon-name.es6.js')
const majorTrackingNetworks = constants.majorTrackingNetworks

module.exports = function (companyListMap) {
  return companyListMap.map((data) => {
    return bel`<li class="top-blocked__li top-blocked__li--truncated">
      <div class="top-blocked__pill">
        <div class="top-blocked__pill-site__icon-container">
          <div class="top-blocked__pill-site__icon ${getScssClass(data.name.toLowerCase())}"></div>
        </div>
        <div class="top-blocked__pill__divider"></div>
        <div class="top-blocked__pill__blocker-pct js-top-blocked-pct">
          ${data.percent}%
        </div>
      </div>
    </li>`
  })

  function getScssClass (networkName) {
    var genericName = 'generic'

    if (majorTrackingNetworks[networkName]) {
      return normalizeCompanyName(networkName)
    } else {
      return genericName
    }
  }
}
