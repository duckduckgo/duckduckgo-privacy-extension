/**
 * NOTE: this needs to be the first listener that's added
 *
 * on FF, we might actually miss the onInstalled event
 * if we do too much before adding it
 */
import browser from 'webextension-polyfill';
import { updateActionIcon } from './events/privacy-icon-indicator';
import httpsStorage from './storage/https';
import ATB from './atb';
import { clearExpiredBrokenSiteReportTimes } from './broken-site-report';
import { sendPageloadsWithAdAttributionPixelAndResetCount } from './classes/ad-click-attribution-policy';
import { postPopupMessage } from './popup-messaging';
const utils = require('./utils');
const experiment = require('./experiments');
const settings = require('./settings');
const constants = require('../../data/constants');
const onboarding = require('./onboarding');
const cspProtection = require('./csp-blocking');
const browserName = utils.getBrowserName();
const browserWrapper = require('./wrapper');
const limitReferrerData = require('./events/referrer-trimming');
const {
    dropTracking3pCookiesFromResponse,
    dropTracking3pCookiesFromRequest,
    validateSetCookieBlock,
} = require('./events/3p-tracking-cookie-blocking');

const manifestVersion = browserWrapper.getManifestVersion();

async function onInstalled(details) {
    if (details.reason.match(/install/)) {
        // get tab URLs immediately to prevent race with install page
        const ddgTabUrls = await browserWrapper.getDDGTabUrls();
        await settings.ready();
        settings.updateSetting('showWelcomeBanner', true);
        if (browserName === 'chrome') {
            settings.updateSetting('showCounterMessaging', true);
            settings.updateSetting('shouldFireIncontextEligibilityPixel', true);
        }
        await ATB.updateATBValues(ddgTabUrls);
        await ATB.openPostInstallPage();

        if (browserName === 'chrome') {
            experiment.setActiveExperiment();
        }
    } else if (details.reason.match(/update/) && browserName === 'chrome') {
        experiment.setActiveExperiment();
    }

    // Inject the email content script on all tabs upon installation (not needed on Firefox)
    // FIXME the below code throws an unhandled exception in MV3
    try {
        if (browserName !== 'moz') {
            const tabs = await browser.tabs.query({});
            for (const tab of tabs) {
                // Ignore URLs that we aren't permitted to access
                if (tab.url.startsWith('chrome://')) {
                    continue;
                }
                await browserWrapper.executeScript({
                    target: { tabId: tab.id },
                    files: ['public/js/content-scripts/autofill.js'],
                });
            }
        }
    } catch (e) {
        console.warn('Failed to inject email content script at startup:', e);
    }
}

browser.runtime.onInstalled.addListener(onInstalled);

/**
 * ONBOARDING
 * Logic to allow the SERP to display onboarding UI
 */
async function onboardingMessaging({ transitionQualifiers, tabId }) {
    await settings.ready();
    const showWelcomeBanner = settings.getSetting('showWelcomeBanner');
    const showCounterMessaging = settings.getSetting('showCounterMessaging');

    // If the onboarding messaging has already been displayed, there's no need
    // to trigger this event listener any longer.
    if (!showWelcomeBanner && !showCounterMessaging) {
        browser.webNavigation.onCommitted.removeListener(onboardingMessaging);
        return;
    }

    // The counter messaging should only be active for the very first search
    // navigation observed.
    const isAddressBarQuery = transitionQualifiers.includes('from_address_bar');
    if (isAddressBarQuery && showCounterMessaging) {
        settings.removeSetting('showCounterMessaging');
    }

    // Clear the showWelcomeBanner setting to ensure that the welcome banner
    // isn't shown again in the future.
    if (showWelcomeBanner) {
        settings.removeSetting('showWelcomeBanner');
    }

    // Display the onboarding messaging.

    if (browserName === 'chrome') {
        browserWrapper.executeScript({
            target: { tabId },
            func: onboarding.onDocumentStart,
            args: [
                {
                    duckDuckGoSerpHostname: constants.duckDuckGoSerpHostname,
                },
            ],
            injectImmediately: true,
        });
    }

    if (manifestVersion === 3) {
        browserWrapper.executeScript({
            target: { tabId },
            func: onboarding.onDocumentEndMainWorld,
            args: [
                {
                    isAddressBarQuery,
                    showWelcomeBanner,
                    showCounterMessaging,
                },
            ],
            injectImmediately: false,
            world: 'MAIN',
        });
    }

    browserWrapper.executeScript({
        target: { tabId },
        func: onboarding.onDocumentEnd,
        args: [
            {
                isAddressBarQuery,
                showWelcomeBanner,
                showCounterMessaging,
                browserName,
                duckDuckGoSerpHostname: constants.duckDuckGoSerpHostname,
                extensionId: browserWrapper.getExtensionId(),
                manifestVersion,
            },
        ],
        injectImmediately: false,
    });
}

browser.webNavigation.onCommitted.addListener(onboardingMessaging, {
    // We only target the search results page (SERP), which has a 'q' query
    // parameter. Two filters are required since the parameter is not
    // necessarily first.
    url: [
        {
            schemes: ['https'],
            hostEquals: constants.duckDuckGoSerpHostname,
            pathEquals: '/',
            queryContains: '?q=',
        },
        {
            schemes: ['https'],
            hostEquals: constants.duckDuckGoSerpHostname,
            pathEquals: '/',
            queryContains: '&q=',
        },
    ],
});

/**
 * Health checks + `showCounterMessaging` mutation
 * (Chrome only)
 */
if (browserName === 'chrome') {
    chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
        if (request === 'healthCheckRequest') {
            sendResponse(true);
        } else if (request === 'rescheduleCounterMessagingRequest') {
            await settings.ready();
            settings.updateSetting('rescheduleCounterMessagingOnStart', true);
            sendResponse(true);
        }
    });

    browser.runtime.onStartup.addListener(async () => {
        await settings.ready();

        if (settings.getSetting('rescheduleCounterMessagingOnStart')) {
            settings.removeSetting('rescheduleCounterMessagingOnStart');
            settings.updateSetting('showCounterMessaging', true);
        }
    });
}

/**
 * REQUESTS
 */

const beforeRequest = require('./before-request');
const tabManager = require('./tab-manager');
const https = require('./https');

let additionalOptions = [];
if (manifestVersion === 2) {
    additionalOptions = ['blocking'];
}
browser.webRequest.onBeforeRequest.addListener(
    beforeRequest.handleRequest,
    {
        urls: ['<all_urls>'],
    },
    additionalOptions,
);

// MV2 needs blocking for webRequest
// MV3 still needs some info from response headers
const extraInfoSpec = ['responseHeaders'];
if (manifestVersion === 2) {
    extraInfoSpec.push('blocking');
}

if (browser.webRequest.OnHeadersReceivedOptions.EXTRA_HEADERS) {
    extraInfoSpec.push(browser.webRequest.OnHeadersReceivedOptions.EXTRA_HEADERS);
}

// We determine if browsingTopics is enabled by testing for availability of its
// JS API.
// Note: This approach will not work with MV3 since the background
//       ServiceWorker does not have access to a `document` Object.
const isTopicsEnabled = manifestVersion === 2 && 'browsingTopics' in document && utils.isFeatureEnabled('googleRejected');

browser.webRequest.onHeadersReceived.addListener(
    (request) => {
        if (ATB.shouldUpdateSetAtb(request)) {
            // returns a promise
            return ATB.updateSetAtb();
        }

        const responseHeaders = request.responseHeaders;

        if (isTopicsEnabled && responseHeaders && (request.type === 'main_frame' || request.type === 'sub_frame')) {
            // there can be multiple permissions-policy headers, so we are good always appending one
            // According to Google's docs a site can opt out of browsing topics the same way as opting out of FLoC
            // https://privacysandbox.com/proposals/topics (See FAQ)
            responseHeaders.push({ name: 'permissions-policy', value: 'interest-cohort=()' });
        }

        return { responseHeaders };
    },
    { urls: ['<all_urls>'] },
    extraInfoSpec,
);

/**
 * TABS
 */
browser.tabs.onActivated.addListener(({ tabId }) => {
    // Note the active tab ID to session storage (to memory) as it changes, so
    // that the current tab can still be determined when the "popup" UI (aka
    // privacy dashboard) is open.
    if (tabId) {
        // Note: No need to await for this to finish before closing the popup.
        browserWrapper.setToSessionStorage('currentTabId', tabId);
    }

    // Message popup to close when the active tab changes.
    postPopupMessage({ messageType: 'closePopup' });
});

browser.windows.onFocusChanged.addListener(async (windowId) => {
    const previousWindowId = await browserWrapper.getFromSessionStorage('currentWindowId');

    if (windowId > 0 && windowId !== previousWindowId) {
        // If there are multiple browser windows and the user switches to a
        // different window, the tabs.onActivated event won't fire, but the
        // current tab has likely changed.
        await browserWrapper.removeFromSessionStorage('currentTabId');
        await browserWrapper.setToSessionStorage('currentWindowId', windowId);
    }
});

// Include the performanceWarning flag in breakage reports.
if (browser.runtime.onPerformanceWarning) {
    browser.runtime.onPerformanceWarning.addListener(({ tabId }) => {
        if (tabId && tabId > 0) {
            const tab = tabManager.get({ tabId });
            if (tab) {
                tab.performanceWarning = true;
            }
        }
    });
}

/*
 * Referrer Trimming
 */
if (manifestVersion === 2) {
    const referrerListenerOptions = ['blocking', 'requestHeaders'];
    if (browser.webRequest.OnBeforeSendHeadersOptions.EXTRA_HEADERS) {
        referrerListenerOptions.push(browser.webRequest.OnBeforeSendHeadersOptions.EXTRA_HEADERS);
    }

    browser.webRequest.onBeforeSendHeaders.addListener(limitReferrerData, { urls: ['<all_urls>'] }, referrerListenerOptions);
}

/**
 * Global Privacy Control
 */
const GPC = require('./GPC');
const extraInfoSpecSendHeaders = ['requestHeaders'];
if (browser.webRequest.OnBeforeSendHeadersOptions.EXTRA_HEADERS) {
    extraInfoSpecSendHeaders.push(browser.webRequest.OnBeforeSendHeadersOptions.EXTRA_HEADERS);
}

if (manifestVersion === 2) {
    extraInfoSpecSendHeaders.push('blocking');
    // Attach GPC header to all requests if enabled.
    browser.webRequest.onBeforeSendHeaders.addListener(
        (request) => {
            const tab = tabManager.get({ tabId: request.tabId });
            const GPCHeader = GPC.getHeader();
            const GPCEnabled = tab && tab.site.isFeatureEnabled('gpc');

            const requestHeaders = request.requestHeaders;
            if (GPCHeader && GPCEnabled) {
                requestHeaders.push(GPCHeader);
            }

            return { requestHeaders };
        },
        { urls: ['<all_urls>'] },
        extraInfoSpecSendHeaders,
    );
}

browser.webRequest.onBeforeSendHeaders.addListener(dropTracking3pCookiesFromRequest, { urls: ['<all_urls>'] }, extraInfoSpecSendHeaders);

browser.webRequest.onHeadersReceived.addListener(dropTracking3pCookiesFromResponse, { urls: ['<all_urls>'] }, extraInfoSpec);

if (manifestVersion === 3) {
    browser.webRequest.onCompleted.addListener(validateSetCookieBlock, { urls: ['<all_urls>'] }, extraInfoSpec);
}

/**
 * For each completed page load, update the extension's action icon
 */
browser.webNavigation.onCompleted.addListener((details) => {
    // only update the icon when the outermost frame is complete
    if (details.parentFrameId !== -1) return;

    // try to access the tab where this event originated
    const tab = tabManager.get({ tabId: details.tabId });

    // just to be sure that we can access the current tab
    if (!tab) return;

    // select the next icon state
    updateActionIcon(tab.site, tab.id).catch((e) => console.error('could not set the action icon', e));
});

/**
 * ALARMS
 */

const httpsService = require('./https-service');

browserWrapper.createAlarm('updateHTTPSLists', {
    periodInMinutes: httpsStorage.updatePeriodInMinutes,
});
// remove expired HTTPS service entries
browserWrapper.createAlarm('clearExpiredHTTPSServiceCache', { periodInMinutes: 60 });
// Rotate the user agent spoofed
browserWrapper.createAlarm('rotateUserAgent', { periodInMinutes: 24 * 60 });
// Rotate the sessionKey
browserWrapper.createAlarm('rotateSessionKey', { periodInMinutes: 60 });
// Expire site breakage reports
browserWrapper.createAlarm('clearExpiredBrokenSiteReportTimes', { periodInMinutes: 60 });
// Reset the ad click attribution counter and send out the corresponding pixel
// request where necessary.
browserWrapper.createAlarm('adClickAttributionDaily', { periodInMinutes: 60 * 24 });

browser.alarms.onAlarm.addListener(async (alarmEvent) => {
    // Warning: Awaiting in this function doesn't actually wait for the promise to resolve before unblocking the main thread.
    if (alarmEvent.name === 'updateHTTPSLists') {
        await settings.ready();
        try {
            const lists = await httpsStorage.getLists();
            https.setLists(lists);
        } catch (e) {
            console.log(e);
        }
    } else if (alarmEvent.name === 'clearExpiredHTTPSServiceCache') {
        httpsService.clearExpiredCache();
    } else if (alarmEvent.name === 'rotateSessionKey') {
        await utils.resetSessionKey();
    } else if (alarmEvent.name === 'clearExpiredBrokenSiteReportTimes') {
        await clearExpiredBrokenSiteReportTimes();
    } else if (alarmEvent.name === 'adClickAttributionDaily') {
        await sendPageloadsWithAdAttributionPixelAndResetCount();
    }
});

browser.webNavigation.onErrorOccurred.addListener((e) => {
    // If not main frame ignore
    if (e.frameId !== 0) return;
    const tab = tabManager.get({ tabId: e.tabId });
    tab.errorDescriptions.push(e.error);
});

browser.webRequest.onErrorOccurred.addListener(
    (e) => {
        if (!(e.type === 'main_frame')) return;

        const tab = tabManager.get({ tabId: e.tabId });
        tab.errorDescriptions.push(e.error);

        // We're only looking at failed main_frame upgrades. A tab can send multiple
        // main_frame request errors so we will only look at the first one then set tab.hasHttpsError.
        if (!tab || !tab.mainFrameUpgraded || tab.hasHttpsError) {
            return;
        }

        // Count https upgrade failures to allow bad data to be removed from lists
        if (e.error && e.url.match(/^https/)) {
            const errCode = constants.httpsErrorCodes[e.error];
            tab.hasHttpsError = true;

            if (errCode) {
                https.incrementUpgradeCount('failedUpgrades');
            }
        }
    },
    { urls: ['<all_urls>'] },
);

if (browserName === 'moz') {
    cspProtection.init();
}
