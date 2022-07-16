const tldts = require('tldts')
const utils = require('../utils.es6')
const tabManager = require('../tab-manager.es6')
const trackerutils = require('../tracker-utils')
const settings = require('../settings.es6')
const { isActive } = require('../devtools.es6')
const constants = require('../../../data/constants')

function getArgumentsObject (tabId, sender, documentUrl, sessionKey) {
    const tab = tabManager.get({ tabId })
    if (!tab) {
        return null
    }
    // Clone site so we don't retain any site changes
    /** @type {import('../classes/site.es6.js').Site} */
    const site = Object.assign({}, tab.site)
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
