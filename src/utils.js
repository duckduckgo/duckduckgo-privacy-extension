const entityMap = require('../data/generated/entity-map')
const tldjs = require('tldjs')
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

    let domain = tldjs.getDomain(url)

    if (!domain) {
        // handle e.g. underscore URLs which tldjs normally chokes on
        // note this is really slow and we don't want to do it unless necessary
        let hostname = parseUrl(url).hostname || ''
        let hostnameParts = hostname.split('.')

        while (!domain && hostnameParts.length > 2) {
            hostnameParts.shift()

            domain = tldjs.getDomain(hostnameParts.join('.'))
        }
    }

    return domain || ''
}

const extractHostFromURL = (url) => {
    if (!url) return ''

    let hostname = parseUrl(url).hostname || ''
    hostname = hostname.replace(/^www\./, '')

    return hostname
}

module.exports = {
    findParent,
    extractHostFromURL,
    getDomain
}
