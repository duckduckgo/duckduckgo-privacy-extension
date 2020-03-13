'use strict'

console.log('Banner.js Content Script Loaded')

const consts = require('./consts.es6')
const utils = require('./utils.es6')
const bannerHTML = require('./bannerTemplate.es6')
const modalHTML = require('./modalTemplate.es6')
const banner = utils.htmlToElement(bannerHTML)
const modal = utils.htmlToElement(modalHTML)

// Banner & Modal Elements
const bannerClose = banner.querySelector(`.js-${consts.BANNER_ID}-close`)
const bannerMore = banner.querySelector(`.js-${consts.BANNER_ID}-more`)
const modalContent = modal.querySelector(`#${consts.MODAL_ID}`)
const modalClose = modal.querySelector(`.js-${consts.MODAL_ID}-close`)
const modalDontRemind = modal.querySelector(`.js-${consts.MODAL_ID}-dont-remind`)
const body = document.body

// For handling Google's own banner
const HAS_PROMOS_CLASS = 'has-promos'
const PROMOS_SELECTOR = '#promos, .og-pdp'
let promos = document.querySelector(PROMOS_SELECTOR)
// Observe and react when Google banner dismissed
// See: https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
const promosConfig = { attributes: true, attributeFilter: ['aria-hidden'], subtree: true }
const promosHiddenCallback = function () {
    // Update banner position when Google banner dismissed
    if (body.classList.contains(HAS_PROMOS_CLASS)) {
        body.classList.remove(HAS_PROMOS_CLASS)
        // Stop observing after dimissed
        promosObserver.disconnect()
    }
}
const promosObserver = new MutationObserver(promosHiddenCallback)

// EVENT HANDLERS
// Remove animating class after entrance
banner.addEventListener('animationend', () => {
    banner.classList.remove(consts.IS_ANIMATING_CLASS)
})

// Hide banner on page click after entrance animation
// Also hide modal on overlay click
body.addEventListener('click', (event) => {
    // ignore if banner is animating
    if (banner.classList.contains(consts.IS_ANIMATING_CLASS)) return

    // ignore clicks on banner, modal, and banner children
    if (banner.contains(event.target) || modalContent.contains(event.target)) return

    // hide on modal background click
    if (body.classList.contains(consts.HAS_MODAL_CLASS)) {
        hideModal()
    }

    // hide on page click
    // if (body.classList.contains(consts.HAS_BANNER_CLASS)) {
    //     hideModal()
    //     hideBanner()
    // }
})

// Hide banner on key press
body.addEventListener('keydown', (event) => {
    // Hide if escape key pressed
    if (body.classList.contains(consts.HAS_BANNER_CLASS) && event.keyCode === 27) {
        hideModal()
        hideBanner()
    }

    // Hide on any key press except arrows
    // if (body.classList.contains(consts.HAS_BANNER_CLASS) &&
    // event.key.indexOf('Arrow') === -1) {
    //     hideModal()
    //     hideBanner()
    // }
})

// Banner Learn More Click
bannerMore.addEventListener('click', (event) => {
    body.classList.add(consts.HAS_MODAL_CLASS, consts.BLUR_CLASS)
    modal.classList.remove(consts.HIDDEN_CLASS)
    chrome.runtime.sendMessage({ firePixel: consts.BANNER_CLICK })
    chrome.storage.local.set({ bannerClicked: true }, function () {
        console.log('MARKED BANNER AS CLICKED')
    })
})

// Banner Close Click
bannerClose.addEventListener('click', (event) => {
    disableBanner()
})

// Modal Close Click
modalClose.addEventListener('click', (event) => {
    hideModal()
    hideBanner()
})

// Modal Do-Not-Remind-Me Click
modalDontRemind.addEventListener('click', (event) => {
    hideModal()
    disableBanner()
})

// Close banner, permanently
function disableBanner () {
    modal.remove()
    banner.remove()
    body.classList.remove(consts.HAS_BANNER_CLASS, consts.HAS_MODAL_CLASS)

    chrome.runtime.sendMessage({ firePixel: consts.BANNER_DISMISS })
    chrome.storage.local.set({ bannerDismissed: true }, function () {
        console.log('MARKED BANNER AS DISMISSED')
    })
}

// Hide banner
function hideBanner () {
    // remove elements from DOM
    modal.remove()
    banner.remove()
    body.classList.remove(consts.HAS_BANNER_CLASS)
}

// Hide Modal
function hideModal () {
    body.classList.remove(consts.HAS_MODAL_CLASS, consts.BLUR_CLASS)
    modal.classList.add(consts.HIDDEN_CLASS)
}

function updateDOM () {
    // DOM INJECTION

    // Check if Google SERP or Homepage
    // if (utils.isGoogleSerp()) {
    //     console.log('Google SERP Detected!')
    // } else {
    //     console.log('Google Homepage Detected!')
    // }

    if (promos) {
        // Start observing the target node for configured mutations
        promosObserver.observe(promos, promosConfig)
        body.classList.add(HAS_PROMOS_CLASS)
    }

    // Insert Banner
    body.insertAdjacentElement('beforeend', banner)

    chrome.runtime.sendMessage({ firePixel: consts.BANNER_IMPRESSION })

    // Insert Modal
    body.insertAdjacentElement('beforeend', modal)
    body.classList.add(consts.HAS_BANNER_CLASS)
}

// Skip if DDG banner already in DOM
if (!(document.getElementById(consts.BANNER_ID) || document.getElementById(consts.MODAL_ID))) {
    updateDOM()
} else {
    console.log('DDG Banner already exists')
}
