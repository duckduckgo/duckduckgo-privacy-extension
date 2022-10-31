import constants from '../../../data/constants'

/**
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').ExtensionGetPrivacyDashboardData} ExtensionGetPrivacyDashboardData
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').DetectedRequest} DetectedRequest
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').ProtectionsStatus} ProtectionsStatus
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').StateAllowed} StateAllowed
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').StateBlocked} StateBlocked
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').EmailProtectionUserData} EmailProtectionUserData
 */

/**
 * Convert internal extension data into a format accepted by the Privacy dashboard
 * The return type of this function comes from a schema defined in the Privacy Dashboard,
 *
 * @param {import("./tab.es6.js")} tab
 * @param {EmailProtectionUserData | undefined} userData
 * @returns {ExtensionGetPrivacyDashboardData}
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

    const requests = convertToRequests(tab, protectionsEnabled)

    return {
        tab: {
            id: tab.id,
            url: tab.url || '',
            protections,
            upgradedHttps: tab.upgradedHttps,
            parentEntity,
            specialDomainName: tab.site.specialDomainName || undefined
        },
        requestData: {
            requests
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
function convertToRequests (tab, protectionsEnabled) {
    /** @type {DetectedRequest[]} */
    const detectedRequests = []
    // loop over `Record<string, Tracker>`, accessing just the Tracker values
    for (const tracker of Object.values(tab.trackers || {})) {
        // loop over `Record<string, TrackerSite[]>`, accessing just the list of TrackerSite's
        for (const trackerSites of Object.values(tracker.urls || {})) {
            for (const trackerSite of Object.values(trackerSites)) {
                const state = deriveState(trackerSite, protectionsEnabled)
                if (!state) {
                    continue
                }
                /** @type {DetectedRequest} */
                const req = {
                    url: trackerSite.url || tracker.baseDomain || '',
                    eTLDplus1: tracker.baseDomain,
                    entityName: tracker.displayName,
                    prevalence: tracker.prevalence,
                    ownerName: tracker.parentCompany?.name,
                    pageUrl: tab.url || '',
                    category: trackerSite.categories?.find(category => constants.displayCategories.includes(category)),
                    state
                }
                detectedRequests.push(req)
            }
        }
    }

    return detectedRequests
}

/**
 * @param {import('../../ui/models/mixins/calculate-aggregation-stats').TrackerSite} trackerSite
 * @param {boolean} protectionsEnabled
 * @return {DetectedRequest["state"] | null}
 */
function deriveState (trackerSite, protectionsEnabled) {
    if (trackerSite.action === 'none') {
        return { allowed: { reason: 'otherThirdPartyRequest' } }
    }
    if (trackerSite.action === 'ignore' || trackerSite.action === 'ignore-user') {
        if (!protectionsEnabled) {
            return { allowed: { reason: 'protectionDisabled' } }
        }
        if (trackerSite.isSameEntity) {
            return { allowed: { reason: 'ownedByFirstParty' } }
        }
        return { allowed: { reason: 'ruleException' } }
    }
    if (trackerSite.action === 'ad-attribution') {
        return { allowed: { reason: 'adClickAttribution' } }
    }
    if (trackerSite.action === 'block') {
        return { blocked: {} }
    }
    if (trackerSite.action === 'redirect') {
        return { blocked: {} }
    }
    /** @type {never} */
    const _output = trackerSite.action
    return null
}
