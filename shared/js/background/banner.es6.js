const pattern1 = 'https://www.google.com/'
const pattern2 = 'https://www.google.com/search'
const pattern3 = 'https://www.google.com/webhp'

const filter = {
    urls: [pattern1, pattern2, pattern3]
}

function handleUpdated (tabId, changeInfo, tabInfo) {
    if (!changeInfo.status || changeInfo.status !== 'complete') {
        return
    }

    console.log(`Updated tab: ${tabId}`)
    console.log('Changed attributes: ', changeInfo)
    console.log('New tab Info: ', tabInfo)

    //  Inject JS
    chrome.tabs.executeScript({
        file: '/public/js/content-scripts/banner.js',
        runAt: 'document_start'
    },
    function (array) {
        console.log('Content Script injected!')
    })

    // Inject CSS
    chrome.tabs.insertCSS({
        file: '/public/css/banner.css',
        runAt: 'document_start'
    },
    function () {
        console.log('CSS injected!')
    })
}

var Banner = (() => {
    return {
        filter,
        handleUpdated
    }
})()

module.exports = Banner
