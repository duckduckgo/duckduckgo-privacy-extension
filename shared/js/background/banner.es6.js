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
let tabState = {}

function isValidURL (url) {
    const urlObj = new URL(url)
    const href = urlObj.href
    console.log(`Validating URL: ${href}`)
    // ensure match is at beginning of string
    return filterUrls.valid.some(pattern => href.indexOf(pattern) === 0) &&
        !filterUrls.invalid.some(pattern => href.indexOf(pattern) === 0)
}

function isDdgURL (url) {
    const urlObj = new URL(url)
    const href = urlObj.href
    const hostname = urlObj.hostname
    console.log(`Validating DDG URL: ${href}`)

    if (hostname !== 'duckduckgo.com') return false

    const params = urlObj.searchParams
    const hasIaParam = params.has('ia')

    // Ignore static pages, but not DDG cached pages e.g. duckduckgo.com/apple?ia=web
    if (urlObj.pathname && !hasIaParam) return false

    return true
}

function resetTab (tabId) {
    updatedTabs[tabId] = false
}

function injectAssets (tabId) {
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

// Check if we can show the banner
function canShowBanner (url) {
    if (isValidURL(url)) {
        console.log('✅ URL IS VALID')
        return true
    } else if (isDdgURL(url)) {
        console.log('🦆 URL IS DDG URL')
        return false
    } else {
        console.log('❌ URL IS NOT VALID')
        return false
    }
}

function createBanner (tabId, changeInfo, tabInfo) {
    const url = changeInfo.url || tabInfo.url || false
    // if (!updatedTabs[tabId]) resetTab(tabId)

    // Ignore page if url is invalid
    if (!canShowBanner(url)) {
        console.groupEnd()
        return
    }

    // Check if tab is loading a URL
    if (changeInfo.status && changeInfo.status === 'loading') {
        // reset updated status as this is a fresh page load
        resetTab(tabId)
    }

    if (changeInfo.status && changeInfo.status === 'complete') {
        injectAssets(tabId)
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

        if (changeInfo.status === 'complete') {
            console.log(`🔔 Updated tab: ${tabId}`)
            console.log('ℹ️ Changed attributes: ', changeInfo)
            console.log('ℹ️ New tab Info: ', tabInfo)

            createBanner(tabId, changeInfo, tabInfo)
        }
    })
    console.groupEnd()
}

var Banner = (() => {
    return {
        handleUpdated
    }
})()

module.exports = Banner
