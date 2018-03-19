/**
 * NOTE: this needs to be the first listener that's added
 *
 * on FF, we might actually miss the onInstalled event
 * if we do too much before adding it
 */
const atb = require('./atb.es6')

chrome.runtime.onInstalled.addListener(function(details) {
    // only run the following section on install and on update
    if (details.reason.match(/install|update/)) {
        ATB.updateATBValues();
    }

    if (details.reason.match(/install/)) {
        ATB.openPostInstallPage()
    }
})

/**
 * REQUESTS
 */

const constants = require('../../data/constants')
const redirect = require('./redirect.es6')
const tabManager = require('./tab-manager.es6')

chrome.webRequest.onBeforeRequest.addListener(
    redirect.handleRequest,
    {
        urls: [
            '<all_urls>',
        ],
        types: constants.requestListenerTypes
    },
    ['blocking']
)

chrome.webRequest.onHeadersReceived.addListener(
    tabManager.updateTabUrl,
    {
        urls: ['<all_urls>'],
        types: ['main_frame']
    }
)

chrome.webRequest.onBeforeRedirect.addListener(
    tabManager.updateTabRedirectCount,
    {
        urls: ["*://*/*"]
    }
)

chrome.webRequest.onHeadersReceived.addListener(
    ATB.updateSetAtb,
    {
        urls: [
            '*://duckduckgo.com/?*',
            '*://*.duckduckgo.com/?*'
        ]
    }
)

/**
 * TABS
 */

const Companies = require('./companies.es6')

chrome.tabs.onUpdated.addListener( (id,info) => {
    // sync company data to storage when a tab finishes loading
    if (info.status === "complete") {
        Companies.syncToStorage()
    }

    tabManager.createOrUpdateTab(info, id)
})

chrome.tabs.onRemoved.addListener( (id, info) => {
    // remove the tab object
    tabManager.delete(id);
});

// message popup to close when the active tab changes
chrome.tabs.onActivated.addListener(() => chrome.runtime.sendMessage({closePopup: true}))

// search via omnibox

chrome.omnibox.onInputEntered.addListener(function(text) {
  chrome.tabs.query({
    'currentWindow': true,
    'active': true
  }, function(tabs) {
    chrome.tabs.update(tabs[0].id, {
      url: "https://duckduckgo.com/?q=" + encodeURIComponent(text) + "&bext=" + localStorage['os'] + "cl"
    });
  });
});

