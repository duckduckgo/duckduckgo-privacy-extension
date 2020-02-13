const filterUrls = {
    valid: [
        'https://www.google.com/',
        'https://www.google.com/search',
        'https://www.google.com/webhp',
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

function handleUpdated (tabId, changeInfo, tabInfo) {
    if (updatedTabs.tabId) return
    if (!changeInfo.status || changeInfo.status !== 'complete') return
    if (!tabInfo.url || !isValidURL(tabInfo.url)) return

    console.log(`Updated tab: ${tabId}`)
    console.log('Changed attributes: ', changeInfo)
    console.log('New tab Info: ', tabInfo)

    //  Inject JS
    chrome.tabs.executeScript({
        file: '/public/js/content-scripts/banner.js',
        runAt: 'document_start'
    },
    function (array) {
        console.log(`Tab ${tabId}: Content Script injected!`)
    })

    // Inject CSS
    chrome.tabs.insertCSS({
        file: '/public/css/banner.css',
        runAt: 'document_start'
    },
    function () {
        console.log(`Tab ${tabId}: CSS injected!`)
    })

    // prevent injecting more than once
    updatedTabs[tabId] = true
}

var Banner = (() => {
    return {
        handleUpdated
    }
})()

module.exports = Banner
