import browser from 'webextension-polyfill';
import EventEmitter2 from 'eventemitter2';
import ATB from './atb';
import { postPopupMessage } from './popup-messaging';

const utils = require('./utils');
const trackers = require('./trackers');
const https = require('./https');
const Companies = require('./companies');
const tabManager = require('./tab-manager');
const browserWrapper = require('./wrapper');
const settings = require('./settings');
const devtools = require('./devtools');
const trackerAllowlist = require('./allowlisted-trackers');
const { stripTrackingParameters, trackingParametersStrippingEnabled } = require('./url-parameters');
const ampProtection = require('./amp-protection');
const { displayClickToLoadPlaceholders, getDefaultEnabledClickToLoadRuleActionsForTab } = require('./click-to-load');

function buildResponse(url, requestData, tab, isMainFrame) {
    if (url.toLowerCase() !== requestData.url.toLowerCase()) {
        console.log('HTTPS: upgrade request url to ' + url);
        tab.httpsRedirects.registerRedirect(requestData);

        if (isMainFrame) {
            tab.upgradedHttps = true;
        }
        if (utils.getUpgradeToSecureSupport()) {
            return { upgradeToSecure: true };
        } else {
            return { redirectUrl: url };
        }
    } else if (isMainFrame) {
        tab.upgradedHttps = false;
    }
}

function updateTabCleanAmpUrl(currentTab, canonicalUrl, url) {
    if (currentTab) {
        currentTab.cleanAmpUrl = canonicalUrl || url;
    }
}

async function handleAmpAsyncRedirect(thisTab, url) {
    const canonicalUrl = await ampProtection.fetchAMPURL(thisTab.site, url);
    const currentTab = tabManager.get({ tabId: thisTab.id });
    updateTabCleanAmpUrl(currentTab, canonicalUrl, url);
    if (canonicalUrl) {
        return { redirectUrl: canonicalUrl };
    }
}

async function handleAmpDelayedUpdate(thisTab, url) {
    const canonicalUrl = await ampProtection.fetchAMPURL(thisTab.site, url);
    const currentTab = tabManager.get({ tabId: thisTab.id });
    const newUrl = canonicalUrl || url;
    updateTabCleanAmpUrl(currentTab, canonicalUrl, url);

    browser.tabs.update(thisTab.id, { url: newUrl });
}

function handleAmpRedirect(thisTab, url) {
    if (!thisTab) {
        return;
    }
    if (utils.getBrowserName() === 'moz') {
        return handleAmpAsyncRedirect(thisTab, url);
    }

    handleAmpDelayedUpdate(thisTab, url);
    return { redirectUrl: 'about:blank' };
}

/**
 * Where most of the extension work happens.
 *
 * For each request made:
 * - Add ATB param
 * - Block tracker requests
 * - Upgrade http -> https where possible
 * @param {import('webextension-polyfill').WebRequest.OnBeforeRedirectDetailsType} requestData
 */
function handleRequest(requestData) {
    const thisTab = tabManager.get(requestData);

    // control access to web accessible resources
    if (requestData.url.startsWith(browserWrapper.getExtensionURL('/web_accessible_resources'))) {
        if (!thisTab || !thisTab.hasWebResourceAccess(requestData.url)) {
            return { cancel: true };
        }
    }

    // There is a chance this tab was closed before the
    // webRequest.onBeforeRequest event fired. For new tabs, there is also a
    // chance that the webRequest.onBeforeRequest event fired before the
    // tabs.onCreated event.
    if (!thisTab) return;

    if (requestData.type === 'main_frame') {
        let mainFrameRequestURL = new URL(requestData.url);

        // AMP protection
        const canonUrl = ampProtection.extractAMPURL(thisTab.site, mainFrameRequestURL.href);
        if (canonUrl) {
            thisTab.setAmpUrl(mainFrameRequestURL.href);
            updateTabCleanAmpUrl(thisTab, canonUrl, mainFrameRequestURL.href);
            mainFrameRequestURL = new URL(canonUrl);
        } else if (ampProtection.tabNeedsDeepExtraction(requestData, thisTab, mainFrameRequestURL)) {
            thisTab.setAmpUrl(mainFrameRequestURL.href);
            return handleAmpRedirect(thisTab, mainFrameRequestURL.href);
        } else if (thisTab.cleanAmpUrl && mainFrameRequestURL.host !== new URL(thisTab.cleanAmpUrl).host) {
            thisTab.ampUrl = null;
            thisTab.cleanAmpUrl = null;
        }

        const ampRedirected =
            thisTab.ampUrl && thisTab.cleanAmpUrl && thisTab.cleanAmpUrl !== thisTab.ampUrl && requestData.url === thisTab.ampUrl;

        // Tracking parameter stripping.

        thisTab.urlParametersRemoved =
            // Tracking parameters were stripped previously, this is the request
            // event that fired after the redirection to strip the parameters.
            (thisTab.urlParametersRemovedUrl && thisTab.urlParametersRemovedUrl === requestData.url) ||
            // Strip tracking parameters if 1. there are any and 2. the feature
            // is enabled for both the request URL and the initiator URL.
            (trackingParametersStrippingEnabled(thisTab.site, requestData.initiator || requestData.originUrl) &&
                stripTrackingParameters(mainFrameRequestURL));

        // To strip tracking parameters, the request is redirected and this event
        // listener fires again for the redirected request. Take note of the URL
        // before redirecting the request, so that  the `urlParametersRemoved`
        // breakage flag persists after the redirection.
        if (thisTab.urlParametersRemoved && !thisTab.urlParametersRemovedUrl) {
            thisTab.urlParametersRemovedUrl = mainFrameRequestURL.href;
        } else {
            thisTab.urlParametersRemovedUrl = null;
        }

        // add atb params only to main_frame
        const atbParametersAdded = ATB.addParametersMainFrameRequestUrl(mainFrameRequestURL);

        if (thisTab.urlParametersRemoved || ampRedirected || atbParametersAdded) {
            return { redirectUrl: mainFrameRequestURL.href };
        }
    } else {
        /**
         * Check that we have a valid tab
         * there is a chance this tab was closed before
         * we got the webrequest event
         */
        if (!(thisTab.url && thisTab.id)) return;

        // skip blocking on new tab and extension pages
        if (thisTab.site.specialDomainName) {
            return;
        }

        const handleResponse = blockHandleResponse(thisTab, requestData);
        if (handleResponse) {
            return handleResponse;
        }
    }

    /**
     * HTTPS Everywhere rules
     * If an upgrade rule is found, request is upgraded from http to https
     */

    if (!thisTab.site) return;

    // Skip https upgrade on broken sites
    if (thisTab.site.isBroken) {
        console.log(
            'temporarily skip https upgrades for site: ' +
                utils.extractHostFromURL(thisTab.url) +
                '\n' +
                'more info: https://github.com/duckduckgo/privacy-configuration',
        );
        return;
    }

    // Is this request from the tab's main frame?
    const isMainFrame = requestData.type === 'main_frame';
    const isPost = requestData.method === 'POST';

    // Skip https upgrade if host failed before or if we detect redirect loop
    if (!thisTab.httpsRedirects.canRedirect(requestData)) {
        if (isMainFrame) {
            thisTab.upgradedHttps = false;
        }
        return;
    }

    // Fetch upgrade rule from https module:
    const resultUrl = https.getUpgradedUrl(requestData.url, thisTab, isMainFrame, isPost);

    if (resultUrl instanceof Promise) {
        return resultUrl.then((url) => buildResponse(url, requestData, thisTab, isMainFrame));
    } else {
        return buildResponse(resultUrl, requestData, thisTab, isMainFrame);
    }
}

/**
 * For publishing tracking events that other modules might care about
 * @type {EventEmitter2}
 */
export const emitter = new EventEmitter2();

/**
 * An event to publish the fact that we blocked a tracker.
 * Note: this is deliberately conservative about how much information is published,
 * for now it's just the parent company's display name which is enough
 * to power the NewTabTrackerStats module.
 */
export class TrackerBlockedEvent {
    static eventName = 'tracker-blocked';

    /**
     * @param {object} params
     * @param {string} params.companyDisplayName
     */
    constructor(params) {
        this.companyDisplayName = params.companyDisplayName;
    }
}

/**
 * Tracker blocking
 * If request is a tracker, cancel the request
 * @param {import('./classes/tab')} thisTab
 * @param {import('webextension-polyfill').WebRequest.OnBeforeRedirectDetailsType} requestData
 * @returns {browser.WebRequest.BlockingResponseOrPromise | undefined}
 */
function blockHandleResponse(thisTab, requestData) {
    const blockingEnabled = thisTab.site.isContentBlockingEnabled();

    // Find the supported and enabled Click to Load rule actions for this tab.
    const enabledRuleActions = new Set(
        getDefaultEnabledClickToLoadRuleActionsForTab(thisTab).filter(
            (ruleAction) => !thisTab.disabledClickToLoadRuleActions.includes(ruleAction),
        ),
    );

    const tracker = trackers.getTrackerData(requestData.url, thisTab.site.url, requestData, enabledRuleActions);
    const baseDomain = trackers.getBaseDomain(requestData.url);
    const serviceWorkerInitiated = requestData.tabId === -1;

    if (tracker) {
        if (tracker?.matchedRule?.action?.startsWith('block-ctl-')) {
            displayClickToLoadPlaceholders(thisTab, tracker.matchedRule.action);
        }

        // temp allowlisted trackers to fix site breakage
        if (thisTab.site.isFeatureEnabled('trackerAllowlist')) {
            const allowListed = trackerAllowlist(thisTab.site.url, requestData.url);

            if (allowListed) {
                console.log(`Allowlisted: ${requestData.url} Reason: ${allowListed.reason}`);
                tracker.action = 'ignore';
                tracker.reason = `tracker allowlist - ${allowListed.reason}`;
            }
        }

        // ad click attribution
        if (thisTab.allowAdAttribution(requestData.url)) {
            tracker.action = 'ad-attribution';
            tracker.reason = 'tracker allowlist - ad click';
        }

        if (!blockingEnabled && (tracker.action === 'block' || tracker.action === 'redirect')) {
            tracker.action = 'ignore-user';
            tracker.reason = 'content blocking disabled';
        }

        if (serviceWorkerInitiated && (tracker.action === 'block' || tracker.action === 'redirect')) {
            if (!thisTab.site.isFeatureEnabled('serviceworkerInitiatedRequests')) {
                tracker.action = 'ignore-user';
                tracker.reason = 'service worker initiated request blocking disabled';
            } else {
                tracker.reason += ' (service worker)';
            }
        }

        // allow embedded twitter content if user enabled this setting
        if (tracker.fullTrackerDomain === 'platform.twitter.com' && settings.getSetting('embeddedTweetsEnabled') === true) {
            tracker.action = 'ignore-user';
            tracker.reason = 'embedded tweets allowed';
        }

        const reportedTracker = { ...tracker };
        const cleanUrl = new URL(requestData.url);
        cleanUrl.search = '';
        cleanUrl.hash = '';
        // @ts-ignore
        thisTab.postDevtoolsMessage(devtools, 'tracker', {
            tracker: {
                ...reportedTracker,
                matchedRule: reportedTracker.matchedRule?.rule?.toString(),
            },
            url: cleanUrl,
            requestData,
            siteUrl: thisTab.site.url,
            serviceWorkerInitiated,
        });

        // Count and block trackers.

        // Determine if this tracker was coming from our current tab. There can be cases where a tracker request
        // comes through on document unload and by the time we block it we have updated our tab data to the new
        // site. This can make it look like the tracker was on the new site we navigated to. We're blocking the
        // request anyway but deciding to show it in the popup or not. If we have a documentUrl, use it, otherwise
        // just default to true.
        const sameDomainDocument = isSameDomainRequest(thisTab, requestData);
        if (sameDomainDocument) {
            // record all tracker urls on a site even if we don't block them
            thisTab.site.addTracker(tracker);

            // record potential blocked trackers for this tab
            // without a baseDomain, it wouldn't make sense to record this
            if (baseDomain) {
                const url = utils.getURLWithoutQueryString(requestData.url);
                thisTab.addToTrackers(tracker, baseDomain, url);
            }
        }
        // the tab has finished loading
        postPopupMessage({ messageType: 'updateTabData' });
        // Block the request if the site is not allowlisted
        if (['block', 'redirect'].includes(tracker.action)) {
            // @ts-ignore
            Companies.add(tracker.tracker.owner);

            // publish the parent's display name only
            const displayName = utils.findParentDisplayName(requestData.url);
            emitter.emit(TrackerBlockedEvent.eventName, new TrackerBlockedEvent({ companyDisplayName: displayName }));

            console.info(
                'blocked ' +
                    utils.extractHostFromURL(thisTab.url) +
                    // @ts-ignore
                    ' [' +
                    tracker.tracker.owner.name +
                    '] ' +
                    requestData.url +
                    (serviceWorkerInitiated ? ' (serviceworker)' : ''),
            );

            // return surrogate redirect if match, otherwise
            // tell Chrome to cancel this webrequest
            if (tracker.redirectUrl && tracker.matchedRule) {
                const webResource = browserWrapper.getExtensionURL(`web_accessible_resources/${tracker.matchedRule.surrogate}`);

                // Firefox: check these for Origin headers in onBeforeSendHeaders before redirecting or not. Workaround for
                // https://bugzilla.mozilla.org/show_bug.cgi?id=1694679
                // Surrogates that for sure need to load should have 'strictRedirect' set, and will have their headers checked
                // in onBeforeSendHeaders
                if (tracker.matchedRule.strictRedirect && utils.getBrowserName() === 'moz') {
                    thisTab.surrogates[requestData.url] = webResource;
                } else {
                    const key = thisTab.addWebResourceAccess(webResource);
                    return { redirectUrl: `${webResource}?key=${key}` };
                }
            } else {
                return { cancel: true };
            }
        }
    }

    /**
     * Notify skipping for broken sites
     */
    if (thisTab.site.isBroken) {
        console.log(
            'temporarily skip tracker blocking for site: ' +
                utils.extractHostFromURL(thisTab.url) +
                '\n' +
                'more info: https://github.com/duckduckgo/privacy-configuration',
        );
    }
}

/* Check to see if a request came from our current tab. This generally handles the
 * case of pings that fire on document unload. We can get into a case where we count the
 * ping to the new site we navigated to.
 *
 * In Firefox we can check the request frameAncestors to see if our current
 * tab url is one of the ancestors.
 * In Chrome we don't have access to a sub_frame ancestors. We can check that a request
 * is coming from the main_frame and that it matches our current tab url
 */
function isSameDomainRequest(tab, req) {
    // Firefox
    if (req.documentUrl) {
        if (req.frameAncestors && req.frameAncestors.length) {
            const ancestors = req.frameAncestors.reduce((lst, f) => {
                lst.push(f.url);
                return lst;
            }, []);
            return ancestors.includes(tab.url);
        } else {
            return req.documentUrl === tab.url;
        }
        // Chrome
    } else if (req.initiator && req.frameId === 0) {
        return !!tab.url.match(req.initiator);
    } else {
        return true;
    }
}

export { blockHandleResponse, handleRequest };
