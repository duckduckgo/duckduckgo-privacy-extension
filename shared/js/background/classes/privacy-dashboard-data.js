import constants from '../../../data/constants'

/**
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').ExtensionGetPrivacyDashboardData} Payload
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').DetectedRequest} DetectedRequest
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').ProtectionsStatus} ProtectionsStatus
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').StateAllowed} StateAllowed
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').StateBlocked} StateBlocked
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').EmailProtectionUserData} EmailProtectionUserData
 */

/**
 * Convert internal extension data into a format accepted by the Privacy dashboard
 *
 * @param {import("./tab.es6.js")} tab
 * @param {EmailProtectionUserData | undefined} userData
 * @returns {Payload}
 */
export function fromTab (tab, userData) {
    const protectionsEnabled = !tab.site.allowlisted && !tab.site.isBroken && tab.site.enabledFeatures.includes('contentBlocking')

    // parent entity, if available
    let parentEntity
    if (tab.site.parentEntity) {
        parentEntity = {
            displayName: tab.site.parentEntity,
            prevalence: tab.site.parentPrevalence ?? 0
        }
    }

    /** @type {ProtectionsStatus} */
    const protections = {
        allowlisted: Boolean(tab.site.allowlisted),
        denylisted: Boolean(tab.site.denylisted),
        unprotectedTemporary: Boolean(tab.site.isBroken),
        enabledFeatures: tab.site.enabledFeatures
    }

    return {
        tab: {
            id: tab.id,
            url: tab.url,
            protections,
            upgradedHttps: tab.upgradedHttps,
            parentEntity,
            specialDomainName: tab.site.specialDomainName || undefined
        },
        requestData: {
            requests: requests(tab, protectionsEnabled),
            installedSurrogates: undefined
        },
        emailProtectionUserData: userData
    }
}

/**
 * WIP - this is a just a hack to get the types working together, we'll create a better implementation
 *
 * @param {import('./tab.es6')} tab
 * @param {boolean} protectionsEnabled
 * @returns {DetectedRequest[]}
 */
function requests (tab, protectionsEnabled) {
    /** @type {DetectedRequest[]} */
    const detectedRequests = []

    // loop over `Record<string, Tracker>`, accessing just the Tracker values
    for (const tracker of Object.values(tab.trackers || {})) {
        // loop over `Record<string, TrackerSite[]>`, accessing just the list of TrackerSite's
        for (const [trackerDomain, trackerSites] of Object.entries(tracker.urls || {})) {
            // loop over `TrackerSite[]`
            for (const trackerSite of trackerSites) {
                /** @type {StateAllowed | StateBlocked | undefined} */
                let state
                if (trackerSite.action === 'none') {
                    state = { allowed: { reason: 'otherThirdPartyRequest' } }
                } else if (trackerSite.action === 'ignore' || trackerSite.action === 'ignore-user') {
                    if (!protectionsEnabled) {
                        state = { allowed: { reason: 'protectionDisabled' } }
                    } else {
                        if (trackerSite.isSameEntity) {
                            state = { allowed: { reason: 'ownedByFirstParty' } }
                        } else {
                            state = { allowed: { reason: 'ruleException' } }
                        }
                    }
                } else if (trackerSite.action === 'block') {
                    state = { blocked: {} }
                } else if (trackerSite.action === 'redirect') {
                    state = { blocked: {} }
                } else if (trackerSite.action === 'ad-attribution') {
                    state = { allowed: { reason: 'adClickAttribution' } }
                }
                if (state === undefined) {
                    throw new Error(`unhandled entry: ${JSON.stringify(trackerSite)}`)
                }
                /** @type {DetectedRequest} */
                const req = {
                    url: trackerSite.url || tracker.baseDomain || trackerDomain,
                    eTLDplus1: tracker.baseDomain,
                    entityName: tracker.displayName,
                    prevalence: tracker.prevalence,
                    ownerName: tracker.parentCompany?.name,
                    pageUrl: tab.url,
                    category: trackerSite.categories?.find(category => constants.displayCategories.includes(category)),
                    state
                }
                detectedRequests.push(req)
            }
        }
    }
    return detectedRequests
}
