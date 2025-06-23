/**
 * When web tracking protections interfere with essential usability, for
 * example, if users can't sign in to a popular website, they can report that
 * breakage to us anonymously in our apps and extensions. This is part of our
 * tooling for those anonymous broken site reports.
 *
 * Learn more at: https://duckduckgo.com/duckduckgo-help-pages/privacy/web-tracking-protections/#remotely-configured-exceptions
 *
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').ToggleReportScreen} DisclosureDetails
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').DataItemId} DisclosureParamId
 */

const load = require('./load');
const browserWrapper = require('./wrapper');
const settings = require('./settings');
const parseUserAgentString = require('../shared-utils/parse-user-agent-string');
const { getCurrentTab, getURLWithoutQueryString } = require('./utils');
const { getURL } = require('./pixels');
const maxPixelLength = 7000;

/**
 * When the user clicks to see what a breakage report will include, the details
 * displayed are based on these param IDs.
 *
 * Notes:
 *  - The naming system is similar, but not quite the same as the breakage
 *    report parameter names themselves. See the docs[1] for a list of all the
 *    possible values.
 *  - Take care to update this list as the privacy-dashboard dependency is
 *    updated, and when breakage parameters are added/removed.
 *  - The UI displays the parameters in the order the IDs are listed here, so
 *    consider the ordering when adjusting the array.
 *
 * TODO: In the future, it would be better for the UI to accept all of the
 *       actual parameter names instead. Needing to update the list here
 *       manually seems error-prone. Likewise with the ordering, it would be
 *       better for the UI to decide the display order for the parameters,
 *       to ensure they are displayed consistently between platforms.
 *
 * 1 - https://duckduckgo.github.io/privacy-dashboard/documents/Guides.Toggle_Report.html#md:appendix-data-disclosure-item-ids-and-their-meanings
 *
 * @type {DisclosureParamId[]}
 */
const PARAM_IDS = [
    'siteUrl',
    'atb',
    'errorDescriptions',
    'extensionVersion',
    'features',
    'httpErrorCodes',
    'jsPerformance',
    'locale',
    'openerContext',
    'requests',
    'userRefreshCount',
];

/**
 *
 * Fire a pixel
 *
 * @param {string} querystring
 *
 */
export function fire(pixelName, querystring) {
    let url = constructUrl(pixelName, querystring, false);

    // If we're over the max pixel length, truncate the less important params
    if (url.length > maxPixelLength) {
        url = constructUrl(pixelName, querystring, true);
    }

    // Send the request
    load.url(url);
}

function constructUrl(pixelName, querystring, truncate) {
    const randomNum = Math.ceil(Math.random() * 1e7);
    const browserInfo = parseUserAgentString();
    const browserName = browserInfo?.browser;
    const extensionVersion = browserWrapper.getExtensionVersion();
    const atb = settings.getSetting('atb');

    const searchParams = new URLSearchParams(querystring);

    if (extensionVersion) {
        searchParams.append('extensionVersion', extensionVersion);
    }
    if (atb) {
        searchParams.append('atb', atb);
    }
    if (searchParams.get('category') === 'null') {
        searchParams.delete('category');
    }
    if (truncate) {
        searchParams.append('truncated', '1');
    }
    // build url string
    let url = getURL(pixelName);
    if (browserName) {
        url += `_${browserName.toLowerCase()}`;
    }
    // random number cache buster
    url += `?${randomNum}&`;
    // some params should be not urlencoded
    let extraParams = '';
    [...Object.values(requestCategoryMapping)].forEach((key) => {
        // if we're truncating, don't include the truncatable fields
        if (truncate && truncatableFields.includes(key)) return;
        if (searchParams.has(key)) {
            extraParams += `&${key}=${decodeURIComponent(searchParams.get(key) || '')}`;
            searchParams.delete(key);
        }
    });
    url += `${searchParams.toString()}${extraParams}`;
    return url;
}

const truncatableFields = ['ignoreRequests', 'noActionRequests', 'adAttributionRequests', 'ignoredByUserRequests'];

/**
 * @type {Object<import('../../../packages/privacy-grade/src/classes/trackers').ActionName, string>}
 */
const requestCategoryMapping = {
    ignore: 'ignoreRequests',
    block: 'blockedTrackers',
    redirect: 'surrogates',
    none: 'noActionRequests',
    'ad-attribution': 'adAttributionRequests',
    'ignore-user': 'ignoredByUserRequests',
};

async function digestMessage(message) {
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

async function computeLastSentDay(urlString) {
    const url = new URL(urlString);
    // Output time as a string in the format YYYY-MM-DD
    const dayOutput = new Date().toISOString().split('T')[0];

    // Use a sha256 hash prefix of the hostname so that we don't store the full hostname
    const hash = await digestMessage(url.hostname);
    const hostnameHashPrefix = hash.slice(0, 6);

    const reportTimes = settings.getSetting('brokenSiteReportTimes') || {};
    const lastSentDay = reportTimes[hostnameHashPrefix];

    // Update existing time
    reportTimes[hostnameHashPrefix] = dayOutput;
    settings.updateSetting('brokenSiteReportTimes', reportTimes);

    return lastSentDay;
}

/**
 * Clears any expired broken site report times
 * Called by an alarm every hour to remove entries older than 30 days
 */
export async function clearExpiredBrokenSiteReportTimes() {
    await settings.ready();
    const brokenSiteReports = settings.getSetting('brokenSiteReportTimes') || {};
    // Expiry of 30 days
    const expiryTime = new Date().getTime() - 30 * 24 * 60 * 60 * 1000;
    for (const hashPrefix in brokenSiteReports) {
        const reportTime = new Date(brokenSiteReports[hashPrefix]);
        if (reportTime.getTime() < expiryTime) {
            delete brokenSiteReports[hashPrefix];
        }
    }
    settings.updateSetting('brokenSiteReportTimes', brokenSiteReports);
}

export async function clearAllBrokenSiteReportTimes() {
    settings.updateSetting('brokenSiteReportTimes', {});
}

/**
 * Given an optional category and description, create a report for a given Tab instance.
 *
 * This code previously lived within the UI section of the dashboard,
 * but has been moved here since there's no longer a relationship to 'where' this request
 * came from.
 *
 * @param {Object} arg
 * @prop {string} pixelName
 * @prop {import("./classes/tab")} arg.tab
 * @prop {string} arg.tds - tds-etag from settings
 * @prop {string} arg.remoteConfigEtag - config-etag from settings
 * @prop {string} arg.remoteConfigVersion - config version
 * @prop {string | undefined} arg.category - optional category
 * @prop {string | undefined} arg.description - optional description
 * @prop {Object | undefined} arg.pageParams - on page parameters
 * @prop {string | undefined} arg.reportFlow
 *   String detailing the UI flow that this breakage report came from.
 */
export async function breakageReportForTab({
    pixelName,
    tab,
    tds,
    remoteConfigEtag,
    remoteConfigVersion,
    category,
    description,
    pageParams,
    reportFlow,
}) {
    if (!tab.url) {
        return;
    }
    const siteUrl = getURLWithoutQueryString(tab.url).split('#')[0];
    const requestCategories = {};

    // This is to satisfy the privacy reference tests expecting these keys to be present
    for (const requiredRequestCategory of Object.values(requestCategoryMapping)) {
        requestCategories[requiredRequestCategory] = [];
    }

    for (const tracker of Object.values(tab.trackers)) {
        for (const [key, entry] of Object.entries(tracker.urls)) {
            const [fullDomain] = key.split(':');
            const requestCategory = requestCategoryMapping[entry.action];
            if (requestCategory) {
                requestCategories[requestCategory].push(fullDomain);
            }
        }
    }

    // collect page parameters
    if (pageParams.docReferrer && pageParams.docReferrer !== '') {
        try {
            const referrerUrl = new URL(pageParams.docReferrer);
            if (referrerUrl.hostname === 'duckduckgo.com') {
                tab.openerContext = 'serp';
            } else {
                tab.openerContext = 'navigation';
            }
        } catch {
            console.error('Unable to construct referrer URL from:' + pageParams.docReferrer);
        }
    } else if (!pageParams.opener) {
        tab.openerContext = 'external';
    }

    const urlParametersRemoved = tab.urlParametersRemoved ? 'true' : 'false';
    const ctlYouTube = tab.ctlYouTube ? 'true' : 'false';
    const ctlFacebookPlaceholderShown = tab.ctlFacebookPlaceholderShown ? 'true' : 'false';
    const ctlFacebookLogin = tab.ctlFacebookLogin ? 'true' : 'false';
    const performanceWarning = tab.performanceWarning ? 'true' : 'false';
    const ampUrl = tab.ampUrl ? getURLWithoutQueryString(tab.ampUrl).split('#')[0] : undefined;
    const upgradedHttps = tab.upgradedHttps;
    const debugFlags = tab.debugFlags.join(',');
    const errorDescriptions = JSON.stringify(tab.errorDescriptions);
    const httpErrorCodes = tab.httpErrorCodes.join(',');
    const lastSentDay = await computeLastSentDay(tab.url);
    const userRefreshCount = tab.userRefreshCount;
    const openerContext = tab.openerContext ? tab.openerContext : undefined;
    const jsPerformance = pageParams.jsPerformance ? pageParams.jsPerformance : undefined;
    const locale = tab.locale;
    const contentScopeExperiments = tab.contentScopeExperiments;

    // Note: Take care to update the `PARAM_IDS` array (see above) when
    //       adding/removing breakage parameters!
    const brokenSiteParams = new URLSearchParams({
        siteUrl,
        tds,
        remoteConfigEtag,
        remoteConfigVersion,
        upgradedHttps: upgradedHttps.toString(),
        urlParametersRemoved,
        ctlYouTube,
        ctlFacebookPlaceholderShown,
        ctlFacebookLogin,
        performanceWarning,
        userRefreshCount,
        jsPerformance,
        locale,
    });

    // The protectionsState parameter will always be false for these reports,
    // and misleading since the user will have disabled protections directly
    // before the report was sent (but before the page was reloaded).
    if (pixelName !== 'protection-toggled-off-breakage-report') {
        brokenSiteParams.set('protectionsState', tab.site.isFeatureEnabled('contentBlocking'));
    }

    for (const [key, value] of Object.entries(requestCategories)) {
        brokenSiteParams.append(key, value.join(','));
    }

    if (lastSentDay) brokenSiteParams.set('lastSentDay', lastSentDay);
    if (ampUrl) brokenSiteParams.set('ampUrl', ampUrl);
    if (category) brokenSiteParams.set('category', category);
    if (debugFlags) brokenSiteParams.set('debugFlags', debugFlags);
    if (description) brokenSiteParams.set('description', description);
    if (errorDescriptions) brokenSiteParams.set('errorDescriptions', errorDescriptions);
    if (httpErrorCodes) brokenSiteParams.set('httpErrorCodes', httpErrorCodes);
    if (openerContext) brokenSiteParams.set('openerContext', openerContext);
    if (reportFlow) brokenSiteParams.set('reportFlow', reportFlow);
    if (contentScopeExperiments && Object.keys(contentScopeExperiments).length > 0) {
        const experiments = Object.entries(contentScopeExperiments)
            .sort(([aKey], [bKey]) => aKey.localeCompare(bKey))
            .map(([key, value]) => `${key}:${value}`)
            .join(',');
        brokenSiteParams.set('contentScopeExperiments', experiments);
    }

    return fire(pixelName, brokenSiteParams.toString());
}

/**
 * Returns the breakage report details as expected by the
 * "getBreakageFormOptions" and "getToggleReportOptions" messages.
 *
 * @returns {Promise<DisclosureDetails>}
 */
export async function getDisclosureDetails() {
    let siteUrl = null;
    const currentTabUrl = (await getCurrentTab())?.url;
    if (currentTabUrl) {
        siteUrl = getURLWithoutQueryString(currentTabUrl);
    }

    /** @type {DisclosureDetails} */
    const response = { data: [] };

    for (const paramId of PARAM_IDS) {
        if (paramId === 'siteUrl' && siteUrl) {
            response.data.push({ id: 'siteUrl', additional: { url: siteUrl } });
        } else {
            response.data.push({ id: paramId });
        }
    }

    return response;
}
