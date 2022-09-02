const utils = require('./utils.es6')
const browserWrapper = require('./wrapper.es6')
const getArgumentsObject = require('./helpers/arguments-object')
const {
    isolatedWorld,
    mainWorld
} = require('@duckduckgo/content-scope-scripts/build/chrome-mv3/inject')

/**
 * Inject the content-scope-scripts protections into a page.
 * Note: This is only intended for use in MV3, since targetting execution world
 *       is not supported in MV2.
 * @param {import('webextension-polyfill').WebNavigation.OnCommittedDetailsType} details
 */
export async function injectContentScopeScripts ({ url, frameId, tabId }) {
    const argumentsObject = getArgumentsObject(
        tabId,
        { frameId, tab: { id: tabId }, url },
        url,
        await utils.getSessionKey()
    )

    // This should not be possible, since the caller has already checked these.
    if (!argumentsObject ||
        argumentsObject.site.isBroken ||
        argumentsObject.site.allowlisted ||
        argumentsObject.site.specialDomainName) {
        return
    }

    browserWrapper.executeScript({
        target: { tabId, frameIds: [frameId] },
        world: 'ISOLATED',
        func: isolatedWorld,
        injectImmediately: true,
        args: [argumentsObject]
    })
    browserWrapper.executeScript({
        target: { tabId, frameIds: [frameId] },
        world: 'MAIN',
        func: mainWorld,
        injectImmediately: true,
        args: [argumentsObject]
    })
}
