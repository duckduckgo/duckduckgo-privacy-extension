import { getUserLocale } from '../i18n'
import { getExtensionURL } from '../wrapper'
const utils = require('../utils')
const trackerutils = require('../tracker-utils')
const settings = require('../settings')
const constants = require('../../../data/constants')
const { LegacyTabTransfer } = require('../classes/legacy-tab-transfer')

/**
 * @param tabId
 * @param sender
 * @param documentUrl
 * @param sessionKey
 * @param {import("../tab-manager").TabManager} tabManager
 * @param {import("../devtools").DevTools} devTools
 */
export function getArgumentsObject (tabId, sender, documentUrl, sessionKey, tabManager, devTools) {
    const tab = tabManager.get({ tabId })
    if (!tab || !tab.url) {
        return null
    }
    const tabClone = new LegacyTabTransfer(tab)
    // Clone site so we don't retain any site changes
    // @ts-ignore
    const site = tabClone.site
    const referrer = tab?.referrer || ''
    let cookie = {}

    // Special case for iframes that are blank we check if it's also enabled
    if (sender.url === 'about:blank') {
        const aboutBlankEnabled = utils.getEnabledFeaturesAboutBlank(tab.url)
        site.enabledFeatures = site.enabledFeatures.filter(feature => aboutBlankEnabled.includes(feature))
    }

    const featureSettings = {}
    for (const feature of site.enabledFeatures) {
        // Prune out the tracker allowlist feature setting as it's not needed and is large
        if (feature === 'trackerAllowlist') continue
        const featureSetting = utils.getFeatureSettings(feature)
        if (Object.keys(featureSetting).length) {
            featureSettings[feature] = featureSetting
        }
    }

    // Extra contextual data required for cookie protection only send if is enabled here
    if (tab.site.isFeatureEnabled('cookie')) {
        cookie = {
            isThirdPartyFrame: false,
            shouldBlock: false,
            isTracker: false,
            isFrame: false
        }

        if (sender.frameId !== 0) {
            cookie.isFrame = true
        }

        if (trackerutils.hasTrackerListLoaded()) {
            if (documentUrl &&
                trackerutils.isTracker(documentUrl)) {
                cookie.isTracker = true
            }
            cookie.isThirdPartyFrame = !trackerutils.isFirstPartyByEntity(documentUrl, tab.url)
        }

        cookie.shouldBlock = !utils.isCookieExcluded(documentUrl)
    }
    return {
        featureSettings,
        debug: devTools.isActive(tabId),
        cookie,
        globalPrivacyControlValue: settings.getSetting('GPC'),
        stringExemptionLists: utils.getBrokenScriptLists(),
        sessionKey,
        site,
        referrer,
        platform: constants.platform,
        locale: getUserLocale(),
        assets: {
            regularFontUrl: getExtensionURL('/public/font/ProximaNova-Reg-webfont.woff'),
            boldFontUrl: getExtensionURL('/public/font/ProximaNova-Bold-webfont.woff')
        }
    }
}
