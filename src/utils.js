const entityMap = require('../data/generated/entity-map')

// pull off subdomains and look for parent companies
function findParent (url) {
    if (!entityMap || url.length < 2) return

    let joinURL = url.join('.')
    if (entityMap[joinURL]) {
        return entityMap[joinURL]
    } else {
        url.shift()
        return findParent(url)
    }
}

module.exports = {
    findParent
}
