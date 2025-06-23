import { getUserLocale } from '../i18n';
import { getExtensionURL } from '../wrapper';
const utils = require('../utils');
const tabManager = require('../tab-manager');
const trackerutils = require('../tracker-utils');
const settings = require('../settings');
const { isActive } = require('../devtools');
const constants = require('../../../data/constants');
const { LegacyTabTransfer } = require('../classes/legacy-tab-transfer');

export function getArgumentsObject(tabId, sender, documentUrl, sessionKey) {
    const tab = tabManager.get({ tabId });
    if (!tab || !tab.url) {
        return null;
    }
    const tabClone = new LegacyTabTransfer(tab);
    // Clone site so we don't retain any site changes
    // @ts-ignore
    const site = tabClone.site;
    let cookie = {};

    // Special case for iframes that are blank we check if it's also enabled
    if (sender.url === 'about:blank') {
        const aboutBlankEnabled = utils.getEnabledFeaturesAboutBlank(tab.url);
        site.enabledFeatures = site.enabledFeatures.filter((feature) => aboutBlankEnabled.includes(feature));
    }

    site.enabledFeatures = site.enabledFeatures.filter((feature) => {
        // Prune out the tracker allowlist feature setting as it's not needed and is large
        if (feature === 'trackerAllowlist') return false;

        // Disable referrer trimming when we're not changing the referrer for the tab
        if (feature === 'referrer' && !tab.referrer?.referrer) return false;
        return true;
    });

    const featureSettings = {};
    for (const feature of site.enabledFeatures) {
        const featureSetting = utils.getFeatureSettings(feature);
        if (Object.keys(featureSetting).length) {
            featureSettings[feature] = featureSetting;
        }
    }

    // Extra contextual data required for cookie protection only send if is enabled here
    if (tab.site.isFeatureEnabled('cookie')) {
        cookie = {
            isThirdPartyFrame: false,
            shouldBlock: false,
            isTracker: false,
            isFrame: false,
        };

        if (sender.frameId !== 0) {
            cookie.isFrame = true;
        }

        if (trackerutils.hasTrackerListLoaded()) {
            if (documentUrl && trackerutils.isTracker(documentUrl)) {
                cookie.isTracker = true;
            }
            cookie.isThirdPartyFrame = !trackerutils.isFirstPartyByEntity(documentUrl, tab.url);
        }

        cookie.shouldBlock = !utils.isCookieExcluded(documentUrl);
    }
    return {
        featureSettings,
        debug: isActive(tabId),
        cookie,
        currentCohorts: utils.getCurrentCohorts(globalThis.components),
        globalPrivacyControlValue: settings.getSetting('GPC'),
        stringExemptionLists: utils.getBrokenScriptLists(),
        sessionKey,
        site,
        platform: constants.platform,
        locale: getUserLocale(),
        assets: {
            regularFontUrl: getExtensionURL('/public/font/ProximaNova-Reg-webfont.woff'),
            boldFontUrl: getExtensionURL('/public/font/ProximaNova-Bold-webfont.woff'),
        },
    };
}
