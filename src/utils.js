const entityMap = require('../data/generated/entity-map')
const tldjs = require('tldjs')

// pull off subdomains and look for parent companies
const findParent = (url) => {
    if (!entityMap || url.length < 2) return

    let joinURL = url.join('.')
    if (entityMap[joinURL]) {
        return entityMap[joinURL]
    } else {
        url.shift()
        return findParent(url)
    }
}

const extractHostFromURL = (url) => {
    if (!url) return ''

    let urlObj = tldjs.parse(url)
    let hostname = urlObj.hostname

    if (!hostname) return ''

    hostname = hostname.replace(/^www\./,'')

    return hostname
}

module.exports = {
    findParent,
    extractHostFromURL
}
