const pixel = require('./pixel.es6')
const settings = require('./settings.es6')
const experiment = require('./experiments.es6')

const BANNER_CLICK = 'ebc'
const BANNER_DISMISS = 'ebd'

const bannerUrls = {
    valid: [
        'https://www.google.com/',
        'https://www.google.com/search',
        'https://www.google.com/webhp',
        'https://www.google.com/videohp',
        'https://www.google.com/shopping',
        'https://images.google.com/'
    ],
    invalid: ['https://www.google.com/maps']
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
            console.group('DDG BANNER -- INJECT ASSETS')
            console.warn(`Tab ${tabId}: CSS injected!`)
            console.groupEnd()
        }
    )

    //  Inject JS
    chrome.tabs.executeScript(
        {
            file: '/public/js/content-scripts/banner.js',
            runAt: 'document_start'
        },
        function () {
            console.group('DDG BANNER -- INJECT ASSETS')
            console.warn(`Tab ${tabId}: Content Script injected!`)
            console.groupEnd()
        }
    )
}

function handleOnCommitted (details) {
    const { url, tabId } = details

    console.group('DDG BANNER -- ON COMMITTED')
    console.warn(`🔔 Updated tab: ${tabId} -- Details: `, details)
    console.warn(`ℹ️ URL: ${url}`)
    console.warn('TRANSITION TYPE:', details.transitionType)

    if (isDDGSerp(url) && isValidTransitionType(details)) {
        console.warn('🦆 IS DDG SERP')
        chrome.storage.local.get(['bannerDismissed'], result => {
            // cast boolean to int
            pixel.fire('evd', { bd: +result.bannerDismissed })
            console.warn('🎇 DDG SERP VISITED PIXEL')
        })
    } else if (isOtherSerp(url) && isValidTransitionType(details)) {
        console.warn('😬 IS OTHER SERP')
        chrome.storage.local.get(['bannerDismissed'], result => {
            // cast boolean to int
            pixel.fire('evg', { bd: +result.bannerDismissed })
            console.warn('🎇 OTHER SERP VISITED PIXEL')
        })
    } else {
        // console.warn('❌ URL IS NOT A SERP')
    }
    console.groupEnd()
}

// Check if we can show banner
function handleOnCompleted (details) {
    const { url, tabId, frameId } = details

    // ignore navigation on iframes
    if (frameId !== 0) return

    console.group('DDG BANNER -- ON COMPLETED')

    if (!isBannerURL(url)) {
        // console.warn('❌ URL IS NOT VALID')
        console.groupEnd()
        return
    }

    console.warn(`🔔 Updated tab: ${tabId} -- Details: `, details)
    console.warn('✅ URL IS VALID')
    console.warn(`ℹ️ URL: ${url}`)

    // Show banner if not dismissed
    if (settings.getSetting('bannerEnabled')) {
        createBanner(tabId)
    } else {
        console.warn('❌ IGNORING. BANNER DISMISSED')
    }
    console.groupEnd()
}

function firePixel (args) {
    const defaultOps = {
        d: experiment.getDaysSinceInstall() || -1,
        p: isOtherSerp ? 'serp' : 'home'
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
        chrome.storage.local.set({ bannerClicked: true }, function () {
            console.log('MARKED BANNER AS CLICKED')
        })
    }
}

var Banner = (() => {
    return {
        handleOnCommitted,
        handleOnCompleted,
        firePixel
    }
})()

module.exports = Banner
