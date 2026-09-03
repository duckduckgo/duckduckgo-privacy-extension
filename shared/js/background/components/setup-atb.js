/* global BUILD_TARGET */
import browser from 'webextension-polyfill';
import ATB from '../atb';
import { getBrowserName } from '../utils';
import constants from '../../../data/constants';
import experiment from '../experiments';
import onboarding from '../onboarding';
import { executeScript, getDDGTabUrls, getExtensionId, getManifestVersion, setUninstallURL } from '../wrapper';

/** Whether this build includes the ATB (install attribution) feature. */
export const isAtbEnabled = BUILD_TARGET !== 'chromium-embedded';

/**
 * Sets up the extension's install and onboarding flow:
 *  - Getting and setting ATB values on install, and updating `set_atb` on searches.
 *  - Opening the post-install page.
 *  - Keeping the uninstall URL and ATB declarativeNetRequest rules up to date.
 *  - Onboarding messaging on the SERP (welcome banner).
 *  - With `counterMessaging` enabled (Chrome builds): counter messaging on the SERP.
 *  - With `emailInjection` enabled (Chrome builds): injecting the email content script
 *    into existing tabs on install.
 *
 * NOTE: This function must be called on the first tick of extension startup, and as
 * early as possible: on Firefox we might miss the onInstalled event if we do too much
 * before adding the listener.
 *
 * @param {{
 *  settings: import('../settings.js');
 * }} opts
 * @param {{
 *  counterMessaging?: boolean;
 *  emailInjection?: boolean;
 * }} [features]
 */
export default function setupAtb({ settings }, { counterMessaging = false, emailInjection = false } = {}) {
    const browserName = getBrowserName();
    const manifestVersion = getManifestVersion();

    async function onInstalled(details) {
        if (details.reason.match(/install/)) {
            // get tab URLs immediately to prevent race with install page
            const ddgTabUrls = await getDDGTabUrls();
            await settings.ready();
            settings.updateSetting('showWelcomeBanner', true);
            if (counterMessaging && browserName === 'chrome') {
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

        if (emailInjection) {
            // Inject the email content script on all tabs upon installation (not needed on Firefox)
            // FIXME the below code throws an unhandled exception in MV3
            try {
                const tabs = await browser.tabs.query({});
                for (const tab of tabs) {
                    // Ignore URLs that we aren't permitted to access
                    if (!tab.url || tab.url.startsWith('chrome://')) {
                        continue;
                    }
                    await executeScript({
                        target: { tabId: tab.id },
                        files: ['public/js/content-scripts/autofill.js'],
                    });
                }
            } catch (e) {
                console.warn('Failed to inject email content script at startup:', e);
            }
        }
    }

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
            executeScript({
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
            executeScript({
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

        executeScript({
            target: { tabId },
            func: onboarding.onDocumentEnd,
            args: [
                {
                    isAddressBarQuery,
                    showWelcomeBanner,
                    showCounterMessaging,
                    browserName,
                    duckDuckGoSerpHostname: constants.duckDuckGoSerpHostname,
                    extensionId: getExtensionId(),
                    manifestVersion,
                },
            ],
            injectImmediately: false,
        });
    }

    browser.runtime.onInstalled.addListener(onInstalled);

    // Update the set_atb value when a new search is made on the SERP.
    browser.webRequest.onHeadersReceived.addListener(
        (request) => {
            if (ATB.shouldUpdateSetAtb(request)) {
                ATB.updateSetAtb();
            }
        },
        { urls: ['https://*.duckduckgo.com/*'], types: ['main_frame'] },
    );

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
    if (counterMessaging && browserName === 'chrome') {
        browser.runtime.onStartup.addListener(async () => {
            await settings.ready();

            if (settings.getSetting('rescheduleCounterMessagingOnStart')) {
                settings.removeSetting('rescheduleCounterMessagingOnStart');
                settings.updateSetting('showCounterMessaging', true);
            }
        });
    }

    settings.ready().then(() => {
        const updateUninstallURL = async () => {
            setUninstallURL(await ATB.getSurveyURL());
        };

        // set initial uninstall url
        updateUninstallURL();

        // Ensure the uninstall URL and the ATB declarativeNetRequest rules are also
        // kept up to date as the ATB values are updated.
        settings.onSettingUpdate.addEventListener('atb', (event) => {
            const atb = event instanceof CustomEvent ? event.detail : undefined;
            updateUninstallURL();
            ATB.setOrUpdateATBdnrRule(atb);
        });
        settings.onSettingUpdate.addEventListener('set_atb', updateUninstallURL);
        settings.onSettingUpdate.addEventListener('useNoAiSearch', () => {
            ATB.setOrUpdateATBdnrRule(settings.getSetting('atb'));
        });
    });
}
