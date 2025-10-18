/**
 * Helper for checking request matching outcomes.
 * Note: The logic around determining action is simplistic, but good enough for
 *       now.
 *
 * @param {import('../../puppeteerInterface').PuppeteerInterface} browser
 * @param {Object} requestDetails
 * @param {string} requestDetails.requestUrl
 * @param {string} requestDetails.websiteUrl
 * @param {string} [requestDetails.requestType='script']
 * @param {number} [requestDetails.tabId=1]
 * @returns {Promise<{
 *    actualAction: string,
 *    actualRedirects: string[],
 *    actualMatchedRules: Object[]
 * }>}
 */
async function actualMatchOutcome(browser, { requestUrl, websiteUrl, requestType = 'script', tabId = 1 }) {
    // Check which rules match the request.
    let actualMatchedRules = await browser.testMatchOutcome({
        url: requestUrl,
        type: requestType,
        initiator: websiteUrl,
        tabId,
    });

    // Find any allowlisting rules that apply to the whole website, and see if
    // any of those negate the above request rule matches.
    let actualAllowAllRequestRules = [];
    let lowestAllowAllPriority = null;
    if (requestType !== 'main_frame') {
        const actualMatchedWebsiteRules = await browser.testMatchOutcome({
            url: websiteUrl,
            type: 'main_frame',
            tabId,
        });
        actualAllowAllRequestRules = actualMatchedWebsiteRules.filter((rule) => rule.action.type === 'allowAllRequests');

        for (const rule of actualAllowAllRequestRules) {
            if (typeof lowestAllowAllPriority !== 'number' || lowestAllowAllPriority > rule.priority) {
                lowestAllowAllPriority = rule.priority;
            }
        }
    }
    if (actualAllowAllRequestRules.length > 0) {
        actualMatchedRules = [
            ...actualAllowAllRequestRules,
            ...actualMatchedRules.filter((rule) => rule.priority > lowestAllowAllPriority),
        ];
    }

    // Figure out if any redirection or blocking rules apply to the request.
    let actualAction = 'ignore';
    const actualRedirects = [];
    for (const rule of actualMatchedRules) {
        if (rule.action.type === 'allowAllRequests') {
            continue;
        }

        if (rule.action.type === 'block') {
            actualAction = 'block';
            continue;
        }

        if (rule.action.type === 'redirect') {
            actualRedirects.push(rule.action.redirect.extensionPath);
        }
    }

    // Ensure redirect URLs and special actions (e.g. "upgradeSchema") are
    // returned if the request wasn't ultimately blocked.
    if (actualAction === 'ignore') {
        if (actualRedirects.length > 0) {
            actualAction = 'redirect';
        } else if (actualMatchedRules.length === 1) {
            const firstRuleType = actualMatchedRules[0].action.type;
            if (firstRuleType !== 'allow' && firstRuleType !== 'allowAllRequests') {
                actualAction = firstRuleType;
            }
        }
    }

    return { actualAction, actualRedirects, actualMatchedRules };
}

function emptyBlockList() {
    return {
        cnames: {},
        domains: {},
        entities: {},
        trackers: {},
    };
}

exports.actualMatchOutcome = actualMatchOutcome;
exports.emptyBlockList = emptyBlockList;
