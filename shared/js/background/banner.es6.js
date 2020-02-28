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
    updatedTabs[tabId] = {
        js: false
    }
}

function handleUpdated (tabId, changeInfo, tabInfo) {
    console.group('DDG BANNER')

    console.log(`🔔 Updated tab: ${tabId}`)
    console.log('ℹ️ Changed attributes: ', changeInfo)
    console.log('ℹ️ New tab Info: ', tabInfo)

    const url = changeInfo.url || tabInfo.url || false

    if (!updatedTabs[tabId]) resetTab(tabId)

    // Check if this banner should be displayed
    if (isValidURL(url)) {
        console.log('✅ URL IS VALID')
    } else {
        console.log('❌ URL IS NOT VALID')
        console.groupEnd()
        return
    }

    // Check if tab is loading a URL
    if (changeInfo.status && changeInfo.status === 'loading') {
        // reset updated status as this is a fresh page load
        resetTab(tabId)

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
    }

    if (changeInfo.status && changeInfo.status === 'complete') {
        //  Inject JS
        chrome.tabs.executeScript({
            file: '/public/js/content-scripts/banner.js',
            runAt: 'document_idle'
        },
        function (array) {
            console.group('DDG BANNER')
            console.log(`Tab ${tabId}: Content Script injected!`)
            console.groupEnd()
        })

        // prevent injecting more than once
        updatedTabs[tabId].js = true
    }
    console.groupEnd()
}

var Banner = (() => {
    return {
        handleUpdated
    }
})()

module.exports = Banner
