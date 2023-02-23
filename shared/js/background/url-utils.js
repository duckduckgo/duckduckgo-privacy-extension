import * as tldts from 'tldts'

// Removes information from a URL, such as path, user information, and optionally sub domains
// @ts-ignore
export function extractLimitedDomainFromURL (url, { keepSubdomains } = {}) {
    if (!url) return undefined
    try {
        const parsedURL = new URL(url)
        const tld = tldts.parse(url)
        if (!parsedURL || !tld) return ''
        // tld.domain is null if this is an IP or the domain does not use a known TLD (e.g. localhost)
        // in that case use the hostname (no truncation)
        let finalURL = tld.domain || tld.hostname
        if (keepSubdomains) {
            finalURL = tld.hostname
        } else if (tld.subdomain && tld.subdomain.toLowerCase() === 'www') {
            // This is a special case where if a domain requires 'www' to work
            // we keep it, even if we wouldn't normally keep subdomains.
            // note that even mutliple subdomains like www.something.domain.com has
            // subdomain of www.something, and wouldn't trigger this case.
            finalURL = 'www.' + tld.domain
        }
        const port = parsedURL.port ? `:${parsedURL.port}` : ''

        return `${parsedURL.protocol}//${finalURL}${port}/`
    } catch (e) {
        // tried to parse invalid URL, such as an extension URL. In this case, don't modify anything
        return undefined
    }
}

export function extractTopSubdomainFromHost (host) {
    if (typeof host !== 'string') return false
    const rgx = /\./g
    // @ts-ignore
    if (host.match(rgx) && host.match(rgx).length > 1) {
        return host.split('.')[0]
    }
    return false
}

/**
 * @param {string} urlString
 * @returns {string | null} etld plus one of the URL
 */
export function getBaseDomain (urlString) {
    const parsedUrl = tldts.parse(urlString, { allowPrivateDomains: true })
    if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname?.endsWith('.localhost') || parsedUrl.isIp) {
        return parsedUrl.hostname
    }
    return parsedUrl.domain
}

export function extractHostFromURL (url, shouldKeepWWW) {
    if (!url) return ''

    // Tweak the URL for Firefox about:* pages to ensure that they are parsed
    // correctly. For example, 'about:example' becomes 'about://example'.
    if (url.startsWith('about:') && url[6] !== '/') {
        url = 'about://' + url.substr(6)
    }

    const urlObj = tldts.parse(url)
    let hostname = urlObj.hostname || ''

    if (!shouldKeepWWW) {
        hostname = hostname.replace(/^www\./, '')
    }

    return hostname
}