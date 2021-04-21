const bel = require('bel')
const constants = require('../../../data/constants')
const entityIconMapping = constants.entityIconMapping

module.exports = function (companyListMap) {
    return companyListMap.map((data) => {
        return bel`<span class="top-blocked__pill-site__icon ${getScssClass(data.name)}"></span>`
    })

    function getScssClass (companyName) {
        const iconClassName = entityIconMapping[companyName] || 'generic'
        return iconClassName
    }
}
