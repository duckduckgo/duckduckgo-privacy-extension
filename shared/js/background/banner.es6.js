const filterUrls = {
    valid: [
        'https://www.google.com/',
        'https://www.google.com/search',
        'https://www.google.com/webhp',
        'https://www.google.com/videohp',
        'https://www.google.com/shopping',
        'https://images.google.com/'
    ],
    invalid: [
        'https://www.google.com/maps'
    ]
}

let updatedTabs = {}

function isValidURL (url) {
    url = url.toLowerCase()
    console.log(`Validating URL: ${url}`)
    // ensure match is at beginning of string
    return filterUrls.valid.some(pattern => url.indexOf(pattern) === 0) &&
        !filterUrls.invalid.some(pattern => url.indexOf(pattern) === 0)
}

function resetTab (tabId) {
    updatedTabs[tabId] = false
}

function injectAssets () {
    // Inject CSS
    chrome.tabs.insertCSS({
        file: '/public/css/banner.css',
        runAt: 'document_start'
    },
    function () {
        console.group('DDG BANNER')
        console.log(`Tab ${tabId}: CSS injected!`)
        console.groupEnd()
    })

    //  Inject JS
    chrome.tabs.executeScript({
        file: '/public/js/content-scripts/banner.js',
        runAt: 'document_start'
    },
    function (array) {
        console.group('DDG BANNER')
        console.log(`Tab ${tabId}: Content Script injected!`)
        console.groupEnd()
    })
}

function createBanner (tabId, changeInfo, tabInfo) {
    const url = changeInfo.url || tabInfo.url || false

    if (!updatedTabs[tabId]) resetTab(tabId)

    // Check if this banner should be displayed
    if (!isValidURL(url)) {
        console.log('❌ URL IS NOT VALID')
        console.groupEnd()
        return
    }

    console.log('✅ URL IS VALID')

    // Check if tab is loading a URL
    if (changeInfo.status && changeInfo.status === 'loading') {
        // reset updated status as this is a fresh page load
        resetTab(tabId)
    }

    if (changeInfo.status && changeInfo.status === 'complete') {
        injectAssets()

        // prevent injecting more than once
        updatedTabs[tabId] = true
    }
    console.groupEnd()
}

function handleUpdated (tabId, changeInfo, tabInfo) {
    console.group('DDG BANNER')

    // Check if banner dismissed before loading
    chrome.storage.local.get(['bannerDismissed'], function (result) {
        if (result.bannerDismissed) {
            console.log('IGNORING. BANNER DISMISSED')
            console.groupEnd()
            return
        }

        console.log(`🔔 Updated tab: ${tabId}`)
        console.log('ℹ️ Changed attributes: ', changeInfo)
        console.log('ℹ️ New tab Info: ', tabInfo)

        createBanner(tabId, changeInfo, tabInfo)
    })
    console.groupEnd()
}

var Banner = (() => {
    return {
        handleUpdated
    }
})()

module.exports = Banner
