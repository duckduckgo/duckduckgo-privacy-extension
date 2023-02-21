const tldts = require('tldts')
const utils = require('../utils')
const tabManager = require('../tab-manager')
const trackerutils = require('../tracker-utils')
const settings = require('../settings')
const { isActive } = require('../devtools')
const constants = require('../../../data/constants')
const { LegacyTabTransfer } = require('../classes/legacy-tab-transfer')

function getArgumentsObject (tabId, sender, documentUrl, sessionKey) {
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
        const featureSetting = utils.getFeatureSettings(feature)
        if (Object.keys(featureSetting).length) {
            featureSettings[feature] = featureSetting
        }
    }

    // Extra contextual data required for cookie protection only send if is enabled here
    if (tab.site.isFeatureEnabled('cookie')) {
        cookie = {
            isThirdParty: false,
            shouldBlock: false,
            tabRegisteredDomain: null,
            isTracker: false,
            isFrame: false
        }

        // determine the register domain of the sending tab
        const parsed = tldts.parse(tab.url)
        cookie.tabRegisteredDomain = parsed.domain === null ? parsed.hostname : parsed.domain

        if (sender.frameId !== 0) {
            cookie.isFrame = true
        }

        if (trackerutils.hasTrackerListLoaded()) {
            if (documentUrl &&
                trackerutils.isTracker(documentUrl)) {
                cookie.isTracker = true
            }
            cookie.isThirdParty = !trackerutils.isFirstPartyByEntity(documentUrl, tab.url)
        }

        cookie.shouldBlock = !utils.isCookieExcluded(documentUrl)
    }
    return {
        featureSettings,
        debug: isActive(tabId),
        cookie,
        globalPrivacyControlValue: settings.getSetting('GPC'),
        stringExemptionLists: utils.getBrokenScriptLists(),
        sessionKey,
        site,
        referrer,
        platform: constants.platform
    }
}

module.exports = getArgumentsObject
