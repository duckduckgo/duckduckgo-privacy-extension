const pattern1 = 'https://www.google.com/'
const pattern2 = 'https://www.google.com/search'
const pattern3 = 'https://www.google.com/webhp'

const filter = {
    urls: [pattern1, pattern2, pattern3],
    properties: ['status']
}

function onExecuted (result) {
    console.log('We executed!')
}

function onError (error) {
    console.log(`Error: ${error}`)
}

function handleUpdated (tabId, changeInfo, tabInfo) {
    if (!changeInfo.status || changeInfo.status !== 'complete') {
        return
    }

    console.log(`Updated tab: ${tabId}`)
    console.log('Changed attributes: ', changeInfo)
    console.log('New tab Info: ', tabInfo)

    //  Inject JS
    const executing = browser.tabs.executeScript({
        file: '/public/js/content-scripts/banner.js',
        runAt: 'document_start'
    })
    executing.then(onExecuted, onError)

    // Inject CSS
    var insertingCSS = browser.tabs.insertCSS({
        file: '/public/css/banner.css'
    })
    insertingCSS.then(null, onError)
}

var Banner = (() => {
    return {
        filter,
        handleUpdated
    }
})()

module.exports = Banner
