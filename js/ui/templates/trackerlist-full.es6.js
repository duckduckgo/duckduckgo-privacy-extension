const bel = require('bel')
const trackerListItems = require('./shared/trackerlist-items.es6.js')
const trackerListNoData = require('./shared/trackerlist-no-data.es6.js')

module.exports = function (model) {
    if (!model || !model.companyListMap) return

    if (model.companyListMap.length > 0) {
        return bel`<ol class="default-list top-blocked__list card">
            ${trackerListItems(model.companyListMap)}
        </ol>`
    } else {
        return bel`<ol class="default-list top-blocked__list">
            <li class="top-blocked__li top-blocked__li--no-data">
                ${trackerListNoData()}
            </li>
        </ol>`
    }
}


