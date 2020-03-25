const pixel = require('./pixel.es6')
const settings = require('./settings.es6')
const experiment = require('./experiments.es6')

const BANNER_CLICK = 'ebc'
const BANNER_DISMISS = 'ebx'
const BANNER_SETTING = 'bannerEnabled'
const BANNER_EXP_NAME = 'privacy_nudge'

const bannerUrls = {
    hostnames: [
        'www.google.com',
        'images.google.com',
        'books.google.com'
    ],
    paths: [
        // homepage
        '/',
        // SERP
        '/search',
        // clicking google icon from SERP redirects here
        '/webhp',
        // video.google.com redirects here
        '/videohp',
        // shopping.google.com redirects here
        '/shopping',
        // shopping.google.com redirects here
        '/finance'
    ]
}

function isBannerURL (url) {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname
    const pathname = urlObj.pathname
    const params = new URL(url).searchParams

    // ignore non-google hostnames
    if (bannerUrls.hostnames.indexOf(hostname) === -1) return

    // Ignore excluded domains/paths
    if (bannerUrls.paths.indexOf(pathname) === -1) return

    // Ignore if Google UI is non-English
    if (params.has('hl') && params.get('hl') !== 'en') return

    return true
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

function createBanner () {
    // Inject CSS
    chrome.tabs.insertCSS({
        file: '/public/css/banner.css',
        runAt: 'document_start'
    })

    //  Inject JS
    chrome.tabs.executeScript({
        file: '/public/js/content-scripts/banner.js',
        runAt: 'document_start'
    })
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

    const params = new URL(url).searchParams
    // Ignore if Google UI is non-English
    if (params.has('hl') && params.get('hl') !== 'en') return

    // Ignore invalid urls
    if (!isBannerURL(url)) {
        return
    }

    // Show banner
    createBanner(tabId)
}

function firePixel (args) {
    const id = args[0]
    const ops = args[1] || {}
    const defaultOps = {
        d: experiment.getDaysSinceInstall() || -1
    }
    const pixelOps = Object.assign(defaultOps, ops)

    pixel.fire.apply(null, [id, pixelOps])

    // If dismissed, prevent from showing again
    if (id === BANNER_DISMISS) {
        settings.ready().then(() => {
            settings.updateSetting('bannerEnabled', false)
        })
    }

    // Mark as clicked
    if (id === BANNER_CLICK) {
        chrome.storage.local.set({ bannerClicked: true })
    }
}

var Banner = (() => {
    return {
        handleOnCommitted,
        handleOnDOMContentLoaded,
        firePixel,

        // for unit testing only
        test_isBannerURL: isBannerURL,
        test_isDDGSerp: isDDGSerp,
        test_isOtherSerp: isOtherSerp,
        test_isValidTransitionType: isValidTransitionType
    }
})()

module.exports = Banner
