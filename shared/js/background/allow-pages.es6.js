const tdsStorage = require('./storage/tds.es6')

/**
 * Creates ann 'allow page' rule for given domain. Our extension will not try to upgrade it or block
 * any trackers on that domain. Trackers from that domain loaded on other pages will still be blocked.
 * @param {string} domain
 */
function addDomainToSafelist (domain) {
    let res, rej
    const promise = new Promise((resolve, reject) => { res = resolve; rej = reject })

    chrome.declarativeNetRequest.addAllowedPages([`*://*.${domain}/*`], () => {
        if (chrome.runtime.lastError) {
            console.warn(`Error adding whitelist entry.`, domain, chrome.runtime.lastError.message)
            rej()
            return
        }

        res()
    })

    return promise
}

/**
 * Removes matching 'allow page' rule
 * @param {string} domain
 */
function removeDomainFromSafelist (domain) {
    let res, rej
    const promise = new Promise((resolve, reject) => { res = resolve; rej = reject })

    chrome.declarativeNetRequest.removeAllowedPages([`*://*.${domain}/*`], () => {
        if (chrome.runtime.lastError) {
            console.warn(`Error removing whitelist entry.`, domain, chrome.runtime.lastError.message)
            rej()
            return
        }

        res()
    })

    return promise
}

/**
 * We have to make sure that domains safelisted by the user, and domains safelisted by our temporary safelist
 * are in sync with actual 'allow page' rules
 */
function syncSafelistEntries () {
    chrome.declarativeNetRequest.getAllowedPages(allowedPagesRules => {
        // convert rules back to domains
        const allowedDomains = allowedPagesRules.map(rule => rule.replace('*://*.', '').replace('/*', ''))

        console.log('allowed domains:', allowedDomains)
        console.log('brokenSiteList', tdsStorage.brokenSiteList)
    })
}

exports.addDomainToSafelist = addDomainToSafelist
exports.removeDomainFromSafelist = removeDomainFromSafelist
exports.syncSafelistEntries = syncSafelistEntries
