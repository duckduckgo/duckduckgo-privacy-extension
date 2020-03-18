const pixel = require('./pixel.es6')
const settings = require('./settings.es6')
const experiment = require('./experiments.es6')

const BANNER_CLICK = 'ebc'
const BANNER_DISMISS = 'ebx'
const BANNER_SETTING = 'bannerEnabled'
const BANNER_EXP_NAME = 'privacy_nudge'

const bannerUrls = {
    valid: [
        'https://www.google.com/',
        'https://www.google.com/search',
        'https://www.google.com/webhp',
        'https://www.google.com/videohp',
        'https://www.google.com/shopping',
        'https://images.google.com/'
    ],
    invalid: [
        'https://www.google.com/maps',
        'https://www.google.com/preferences'
    ]
}

function isBannerURL (url) {
    const urlObj = new URL(url)
    const href = urlObj.href

    // ensure match is at beginning of string
    return (bannerUrls.valid.some(pattern => href.indexOf(pattern) === 0) &&
        !bannerUrls.invalid.some(pattern => href.indexOf(pattern) === 0))
}

function isDDGSerp (url) {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname
    const params = urlObj.searchParams
    const hasQuery = params.has('q')
    const hasIA = params.has('ia')

    if (hostname !== 'duckduckgo.com') return false

    // match duckduckgo.com/?q=apple
    // match duckduckgo.com/apple?ia=web
    // ignore duckduckgo.com/about
    if (urlObj.pathname !== '/' && !hasIA) return false
    return urlObj.pathname === '/' && hasQuery
}

function isOtherSerp (url) {
    const urlObj = new URL(url)
    const params = urlObj.searchParams
    const hasQuery = params.has('q')

    // match google.com/search?q=apple
    return urlObj.hostname === 'www.google.com' &&
        urlObj.pathname === '/search' &&
        hasQuery
}

function isValidTransitionType (details) {
    const { url } = details
    const urlObj = new URL(url)
    const params = urlObj.searchParams

    return details.transitionType === 'form_submit' ||
        details.transitionType === 'generated' ||
        // search from extension popup
        (details.transitionType === 'link' && params.has('bext')) ||
        // redirect from DDG via !bang
        (details.transitionType === 'link' && details.transitionQualifiers.indexOf('server_redirect') !== -1)
}

function createBanner (tabId) {
    // Inject CSS
    chrome.tabs.insertCSS(
        {
        file: '/public/css/banner.css',
        runAt: 'document_start'
        },
        function () {
            console.warn(`Tab ${tabId}: CSS injected!`)
        }
    )

    //  Inject JS
    chrome.tabs.executeScript(
        {
        file: '/public/js/content-scripts/banner.js',
        runAt: 'document_start'
        },
        function () {
            console.warn(`Tab ${tabId}: Content Script injected!`)
}
    )
}

function handleOnCommitted (details) {
    const { url } = details
    let pixelOps = {}
    let pixelID

    if (!isValidTransitionType(details)) return

    if (isDDGSerp(url)) {
        pixelID = 'evd'
    } else if (isOtherSerp(url)) {
        pixelID = 'evg'
    } else {
        return
    }

    const activeExp = settings.getSetting('activeExperiment')

    if (activeExp && activeExp.name === BANNER_EXP_NAME) {
        let enabled = settings.getSetting(BANNER_SETTING)
        // cast bool to int
        pixelOps.be = +enabled
    } else {
        pixelOps.be = -1
    }

    pixel.fire(pixelID, pixelOps)

    // TODO: REMOVE THIS
    console.warn('DDG BANNER -- ON COMMITTED')
    if (pixelID === 'evd') {
        console.warn('🎇 DDG SERP VISITED PIXEL')
    } else {
        console.warn('🎇 OTHER SERP VISITED PIXEL')
    }
}

// Check if we can show banner
function handleOnDOMContentLoaded (details) {
    const { url, tabId, frameId } = details
    const activeExp = settings.getSetting('activeExperiment')

    // Exclude unless in active experiment, and banner not disabled
    if (!activeExp ||
        !activeExp.name === BANNER_EXP_NAME ||
        !settings.getSetting(BANNER_SETTING)) {
        return
    }

    // Ignore navigation on iframes
    if (frameId !== 0) return

    // Ignore invalid urls
    if (!isBannerURL(url)) {
        return
    }

    // TODO: REMOVE THIS
    console.warn('DDG BANNER -- ON COMPLETED')
    console.warn('✅ URL IS VALID')

    // Show banner
    createBanner(tabId)
}

function firePixel (args) {
    const defaultOps = {
        d: experiment.getDaysSinceInstall() || -1
    }
    const id = args[0]
    const ops = args[1] || {}
    const pixelOps = Object.assign(defaultOps, ops)

    pixel.fire.apply(null, [id, pixelOps])

    // If dismissed, prevent from showing again
    if (id === BANNER_DISMISS) {
        settings.ready().then(() => {
            settings.updateSetting('bannerEnabled', false)
            console.warn('MARKED AS DISMISSED')
        })
    }

    // Mark as clicked
    if (id === BANNER_CLICK) {
        // TODO: REMOVE CALLBACK
        chrome.storage.local.set({ bannerClicked: true }, function () {
            console.log('MARKED BANNER AS CLICKED')
        })
    }
}

var Banner = (() => {
    return {
        handleOnCommitted,
        handleOnDOMContentLoaded,
        firePixel
    }
})()

module.exports = Banner
