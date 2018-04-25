const entityMap = require('../data/generated/entity-map')
const parseUrl = require('url-parse-lax')

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

const getDomain = (url) => {
    if (!url) return ''

    let parsed = parseUrl(url)
    let domainParts = parsed.hostname.split('.')

    while (domainParts.length > 2) {
        domainParts.shift()
    }

    return domainParts.join('.')
}

const extractHostFromURL = (url) => {
    if (!url) return ''

    let parsed = parseUrl(url)

    hostname = parsed.hostname
    hostname = hostname.replace(/^www\./,'')

    return hostname
}

module.exports = {
    findParent,
    getDomain,
    extractHostFromURL
}
