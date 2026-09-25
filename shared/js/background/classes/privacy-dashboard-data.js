import { getUserLocale } from '../i18n';
/**
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').GetPrivacyDashboardData} ExtensionGetPrivacyDashboardData
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').DetectedRequest} DetectedRequest
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').ProtectionsStatus} ProtectionsStatus
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').ParentEntity} ParentEntity
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').EmailProtectionUserData} EmailProtectionUserData
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').CookiePromptManagementStatus} CookiePromptManagementStatus
 */

/**
 * Convert internal extension data into a format accepted by the Privacy dashboard
 * The return type of this function comes from a schema defined in the Privacy Dashboard,
 *
 * @param {import("./tab.js")} tab
 * @param {EmailProtectionUserData | undefined | {}} userData
 * @param {object} [fireButtonData]
 * @param {import('../components/cookie-prompt-management').CpmDashboardState} [cpmDashboardState]
 * @returns {ExtensionGetPrivacyDashboardData}
 */
export function dashboardDataFromTab(tab, userData, fireButtonData, cpmDashboardState) {
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

    const dashboardTab = {
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
    };

    if (cpmDashboardState) {
        // The dashboard's extension integration currently drops this field: it
        // parses our reply with a zod schema that strips unknown keys. The
        // "Cookies Managed" row stays hidden until it passes the field through.
        dashboardTab.cookiePromptManagementStatus = convertCpmState(cpmDashboardState);
    }

    return {
        tab: dashboardTab,
        requestData: {
            requests,
        },
        emailProtectionUserData,
        fireButton: fireButtonData,
    };
}

/**
 * Narrow CPM's per-tab state to the fields the dashboard's "Cookies Managed"
 * row needs. CPM uses `null` for "not known yet" where the dashboard's schema
 * expects the field to be absent, so nulls become undefined.
 *
 * `configurable` marks the row as a link to a setting the user can change. No
 * build has extension UI for it, so it is always false.
 *
 * @param {import('../components/cookie-prompt-management').CpmDashboardState} state
 * @returns {CookiePromptManagementStatus}
 */
function convertCpmState(state) {
    return {
        consentManaged: state.consentManaged,
        cosmetic: state.cosmetic ?? undefined,
        optoutFailed: state.optoutFailed ?? undefined,
        selftestFailed: state.selftestFailed ?? undefined,
        configurable: false,
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
