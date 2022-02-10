const tldts = require('tldts')
const utils = require('../utils.es6')
const tabManager = require('../tab-manager.es6')
const trackerutils = require('../tracker-utils')
const settings = require('../settings.es6')
const devtools = require('../devtools.es6')
const constants = require('../../../data/constants')

function getArgumentsObject (tabId, sender, documentUrl, sessionKey) {
    const tab = tabManager.get({ tabId })
    if (!tab) {
        return null
    }
    // Clone site so we don't retain any site changes
    const site = Object.assign({}, tab.site || {})
    const referrer = tab?.referrer || ''

    const firstPartyCookiePolicy = utils.getFeatureSettings('trackingCookies1p').firstPartyTrackerCookiePolicy || {
        threshold: 864000, // 10 days
        maxAge: 864000 // 10 days
    }
    const cookie = {
        isThirdParty: false,
        shouldBlock: false,
        tabRegisteredDomain: null,
        isTrackerFrame: false,
        policy: firstPartyCookiePolicy
    }
    // Special case for iframes that are blank we check if it's also enabled
    if (sender.url === 'about:blank') {
        const aboutBlankEnabled = utils.getEnabledFeaturesAboutBlank(tab.url)
        site.enabledFeatures = site.enabledFeatures.filter(feature => aboutBlankEnabled.includes(feature))
    }

    // Extra contextual data required for 1p and 3p cookie protection - only send if at least one is enabled here
    if (tab.site.isFeatureEnabled('trackingCookies3p') || tab.site.isFeatureEnabled('trackingCookies1p')) {
        // determine the register domain of the sending tab
        const parsed = tldts.parse(tab.url)
        cookie.tabRegisteredDomain = parsed.domain === null ? parsed.hostname : parsed.domain

        if (trackerutils.hasTrackerListLoaded()) {
            if (documentUrl &&
                trackerutils.isTracker(documentUrl) &&
                sender.frameId !== 0) {
                cookie.isTrackerFrame = true
            }
            cookie.isThirdParty = !trackerutils.isFirstPartyByEntity(documentUrl, tab.url)
        }

        cookie.shouldBlock = !utils.isCookieExcluded(documentUrl)
    }
    return {
        debug: devtools.isActive(tabId),
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
