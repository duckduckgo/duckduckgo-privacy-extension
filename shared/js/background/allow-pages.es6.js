const tdsStorage = require('./storage/tds.es6')
const settings = require('./settings.es6')

/**
 * Creates an 'allow page' rule for given domain. Our extension will not try to upgrade it or block
 * any trackers on that domain. Trackers from that domain loaded on other pages will still be blocked.
 * @param {string} domain
 */
function addDomainToSafelist (domain) {
    let res, rej
    const promise = new Promise((resolve, reject) => { res = resolve; rej = reject })

    chrome.declarativeNetRequest.addAllowedPages([`*://*.${domain}/*`], () => {
        if (chrome.runtime.lastError) {
            console.warn(`Error adding safelist entry.`, domain, chrome.runtime.lastError.message)
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
            console.warn(`Error removing safelist entry.`, domain, chrome.runtime.lastError.message)
            rej()
            return
        }

        res()
    })

    return promise
}

/**
 * We have to make sure that domains safelisted by the user, and domains safelisted by our temporary safelist (broken pages)
 * are in sync with actual 'allow page' rules
 */
function syncSafelistEntries () {
    chrome.declarativeNetRequest.getAllowedPages(allowedPagesRules => {
        settings.ready().then(() => {
            // convert rules back to domains
            const safelistedDomains = allowedPagesRules.map(rule => rule.replace('*://*.', '').replace('/*', ''))
            const brokenSitesSafelist = (tdsStorage.brokenSiteList || [])
            const userSafelist = Object.keys(settings.getSetting('whitelisted') || {})

            const expectedDomains = userSafelist.concat(brokenSitesSafelist)
            const stats = {added: 0, removed: 0}

            if (expectedDomains > chrome.declarativeNetRequest.MAX_NUMBER_OF_ALLOWED_PAGES) {
                console.warn(`Number of safelisted domains is bigger than the allowed limit (${chrome.declarativeNetRequest.MAX_NUMBER_OF_ALLOWED_PAGES}). List will be trimmed.`)
                expectedDomains.length = chrome.declarativeNetRequest.MAX_NUMBER_OF_ALLOWED_PAGES
            }

            // remove rules for domains removed from the list
            safelistedDomains.forEach(domain => {
                if (!expectedDomains.includes(domain)) {
                    removeDomainFromSafelist(domain)
                    stats.removed++
                }
            })

            // create rules for missing domains
            expectedDomains.forEach(domain => {
                if (!safelistedDomains.includes(domain)) {
                    addDomainToSafelist(domain)
                    stats.added++
                }
            })

            console.log('Broken pages and manual safelist synced with "allow page" rules.', stats)
        })
    })
}

exports.addDomainToSafelist = addDomainToSafelist
exports.removeDomainFromSafelist = removeDomainFromSafelist
exports.syncSafelistEntries = syncSafelistEntries
