import { getUserLocale } from '../i18n';
/**
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').GetPrivacyDashboardData} ExtensionGetPrivacyDashboardData
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').DetectedRequest} DetectedRequest
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').ProtectionsStatus} ProtectionsStatus
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').ParentEntity} ParentEntity
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').EmailProtectionUserData} EmailProtectionUserData
 */

/**
 * Convert internal extension data into a format accepted by the Privacy dashboard
 * The return type of this function comes from a schema defined in the Privacy Dashboard,
 *
 * @param {import("./tab.js")} tab
 * @param {EmailProtectionUserData | undefined | {}} userData
 * @returns {ExtensionGetPrivacyDashboardData}
 */
export function dashboardDataFromTab(tab, userData, fireButtonData) {
    const protectionsEnabled = !tab.site.allowlisted && !tab.site.isBroken && tab.site.enabledFeatures.includes('contentBlocking');

    // parent entity, if available
    /** @type {ParentEntity | undefined} */
    let parentEntity;
    if (tab.site.parentEntity) {
        parentEntity = {
            displayName: tab.site.parentEntity,
            prevalence: tab.site.parentPrevalence ?? 0,
        };
    }

    /** @type {ProtectionsStatus} */
    const protections = {
        allowlisted: Boolean(tab.site.allowlisted),
        denylisted: Boolean(tab.site.denylisted),
        unprotectedTemporary: Boolean(tab.site.isBroken),
        enabledFeatures: tab.site.enabledFeatures,
    };

    const requests = convertToRequests(tab, protectionsEnabled);

    // Only assign `emailProtectionUserData` if we're sure it is valid data (eg: has at least 'nextAlias'
    // - otherwise allow it to be undefined.
    let emailProtectionUserData;
    if (userData && 'nextAlias' in userData) {
        emailProtectionUserData = userData;
    }

    return {
        tab: {
            id: tab.id,
            url: tab.url || '',
            protections,
            upgradedHttps: tab.upgradedHttps,
            parentEntity,
            specialDomainName: tab.site.specialDomainName || undefined,
            /**
             * Explicitly setting this to 'en' for now. When ready we can send 2-character codes such
             * as 'pl' or 'de' etc. Please see https://duckduckgo.github.io/privacy-dashboard/interfaces/Generated_Schema_Definitions.LocaleSettings.html
             */
            localeSettings: { locale: getUserLocale() },
        },
        requestData: {
            requests,
        },
        emailProtectionUserData,
        fireButton: fireButtonData,
    };
}

/**
 * WIP - this is a just a hack to get the types working together, we'll create a better implementation
 *
 * @param {import('./tab')} tab
 * @param {boolean} protectionsEnabled
 * @returns {DetectedRequest[]}
 */
function convertToRequests(tab, protectionsEnabled) {
    /** @type {DetectedRequest[]} */
    const detectedRequests = [];
    for (const tracker of Object.values(tab.trackers || {})) {
        for (const detectedRequest of Object.values(tracker.urls || {})) {
            // When protections are off, change the 'state' of each tracking request
            if (!protectionsEnabled && detectedRequest.action !== 'none') {
                /** @type {DetectedRequest["state"]} */
                const nextState = { allowed: { reason: 'protectionDisabled' } };
                const request = {
                    ...detectedRequest,
                    state: nextState,
                };
                detectedRequests.push(request);
                continue;
            }

            // other, just add the request as-is
            detectedRequests.push(detectedRequest);
        }
    }
    return detectedRequests;
}

/**
 * @param {import('@duckduckgo/privacy-grade/src/classes/trackers.js').ActionName} action
 * @param {boolean} isSameEntity
 * @return {DetectedRequest["state"] | null}
 */
export function convertState(action, isSameEntity) {
    if (action === 'none') {
        return { allowed: { reason: 'otherThirdPartyRequest' } };
    }
    if (action === 'ignore' || action === 'ignore-user') {
        if (isSameEntity) {
            return { allowed: { reason: 'ownedByFirstParty' } };
        }
        return { allowed: { reason: 'ruleException' } };
    }
    if (action === 'ad-attribution') {
        return { allowed: { reason: 'adClickAttribution' } };
    }
    if (action === 'block') {
        return { blocked: {} };
    }
    if (action === 'redirect') {
        return { blocked: {} };
    }
    /** @type {never} */
    // eslint-disable-next-line no-unused-vars
    const _output = action;
    return null;
}
