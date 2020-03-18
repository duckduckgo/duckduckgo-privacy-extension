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
const bannerTitle = banner.querySelector(`.js-${consts.BANNER_ID}-title`)
const modalContent = modal.querySelector(`#${consts.MODAL_ID}`)
const modalClose = modal.querySelector(`.js-${consts.MODAL_ID}-close`)
const modalButton = modal.querySelector(`.js-${consts.MODAL_ID}-btn`)
const modalDontRemind = modal.querySelector(`.js-${consts.MODAL_ID}-dont-remind`)
const body = document.body

let isSerp = false

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
})

// Hide banner on key press
body.addEventListener('keydown', (event) => {
    // Ignore on homepage where the notification isn't in the way
    if (!isSerp) return

    // ignore if banner is animating
    if (banner.classList.contains(consts.IS_ANIMATING_CLASS)) return

    // Ignore if banner is dismissed
    if (!body.classList.contains(consts.HAS_BANNER_CLASS)) return

    // Hide if escape key pressed
    if (event.code.indexOf('Key') !== -1 ||
        event.code.indexOf('Digit') !== -1 ||
        event.code.indexOf('Numpad') !== -1) {
        hideBanner()
    }
})

// Banner Learn More Click
bannerMore.addEventListener('click', (event) => {
    body.classList.add(consts.HAS_MODAL_CLASS, consts.BLUR_CLASS)
    modal.classList.remove(consts.HIDDEN_CLASS)
    _firePixel(consts.BANNER_CLICK)
})

// Banner Close Click
bannerClose.addEventListener('click', (event) => {
    hideBanner({disable: true})
})

// Modal Close Click
modalClose.addEventListener('click', (event) => {
    hideBanner()
})

// Modal CTA Click
modalButton.addEventListener('click', (event) => {
    _firePixel(consts.MODAL_CLICK)
})

// Modal Do-Not-Remind-Me Click
modalDontRemind.addEventListener('click', (event) => {
    hideBanner({disable: true, fromModal: true})
})

// Hide banner
function hideBanner (ops) {
    hideModal()
    // remove elements from DOM
    modal.remove()
    banner.remove()
    body.classList.remove(consts.HAS_BANNER_CLASS)

    // Disable permananetly
    if (ops && ops.disable) {
        const pixelOps = ops.fromModal ? {s: 'modal'} : {}
        // Disables banner via Banner.es6.js
        _firePixel(consts.BANNER_DISMISS, pixelOps)
    }
}

// Hide Modal
function hideModal () {
    body.classList.remove(consts.HAS_MODAL_CLASS, consts.BLUR_CLASS)
    modal.classList.add(consts.HIDDEN_CLASS)
}

function _firePixel (id, ops) {
    const defaultOps = { p: isSerp ? 'serp' : 'home' }
    const pixelOps = Object.assign(defaultOps, ops)
    chrome.runtime.sendMessage({ bannerPixel: true, pixelArgs: [id, pixelOps] })
}

// DOM INJECTION
function updateDOM () {
    if (window.location.pathname === '/search') {
        const url = new URL(window.location.href)
        const query = url.searchParams.get('q')

        isSerp = true

        // Adjust copy for SERP
        bannerTitle.innerHTML = bannerTitle.innerHTML.replace('can', 'may').replace('searches', 'search')
        modalButton.href += `?q=${query}`
    }

    if (promos) {
        // Start observing the target node for configured mutations
        promosObserver.observe(promos, promosConfig)
        body.classList.add(HAS_PROMOS_CLASS)
    }

    // Insert Banner
    body.insertAdjacentElement('beforeend', banner)
    _firePixel(consts.BANNER_IMPRESSION)

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
