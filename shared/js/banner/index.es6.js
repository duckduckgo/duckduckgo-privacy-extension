'use strict'

console.log('Banner.js Content Script Loaded')

const consts = require('./consts.es6')
const utils = require('./utils.es6')
const bannerHTML = require('./bannerTemplate.es6')
const modalHTML = require('./modalTemplate.es6')
const banner = utils.htmlToElement(bannerHTML)
const modal = utils.htmlToElement(modalHTML)

// Banner & Modal Elements
const bannerLogo = banner.querySelector(`.js-${consts.BANNER_ID}-logo`)
const bannerClose = banner.querySelector(`.js-${consts.BANNER_ID}-close`)
const bannerMore = banner.querySelector(`.js-${consts.BANNER_ID}-more`)
const modalClose = modal.querySelector(`.js-${consts.BANNER_MODAL_ID}-close`)
const modalDontRemind = modal.querySelector(`.js-${consts.BANNER_MODAL_ID}-dont-remind`)
const body = document.body

// EVENT HANDLERS
// Banner Logo Hovere
banner.addEventListener('mouseover', (event) => {
    console.log('HOVERED ON BANNER')

    banner.classList.remove('slideIn')
    banner.classList.remove('hideBanner')
    banner.classList.add('showBanner')
})

bannerLogo.addEventListener('click', (event) => {
    banner.classList.remove('showBanner')
    banner.classList.add('hideBanner')
})

// Banner Learn More Click
bannerMore.addEventListener('click', (event) => {
    body.classList.add(consts.BLUR_CLASS)
    modal.classList.remove(consts.HIDDEN_CLASS)
    chrome.runtime.sendMessage({ firePixel: consts.BANNER_CLICK })
    chrome.storage.local.set({ bannerClicked: true }, function () {
        console.log('MARKED BANNER AS CLICKED')
    })
})

// Banner Close Click
bannerClose.addEventListener('click', (event) => {
    closeBanner()

    chrome.runtime.sendMessage({ firePixel: consts.BANNER_DISMISS })
    chrome.storage.local.set({ bannerDismissed: true }, function () {
        console.log('MARKED BANNER AS DISMISSED')
    })
})

// Modal Close Click
modalClose.addEventListener('click', (event) => {
    closeModal()
})

// Modal Do-Not-Remind-Me Click
modalDontRemind.addEventListener('click', (event) => {
    closeModal()
    closeBanner()
})

// Hide Banner
function closeBanner () {
    modal.remove()
    banner.remove()
    body.classList.remove(consts.HAS_MODAL_CLASS)
}

// Hide Modal
function closeModal () {
    body.classList.remove(consts.BLUR_CLASS)
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

    // Insert Banner
    body.insertAdjacentElement('beforeend', banner)

    chrome.runtime.sendMessage({ firePixel: consts.BANNER_IMPRESSION })

    // Insert Modal
    body.insertAdjacentElement('beforeend', modal)
    body.classList.add(consts.HAS_MODAL_CLASS)
}

// Skip if DDG banner already in DOM
if (!(document.getElementById(consts.BANNER_ID) || document.getElementById(consts.BANNER_MODAL_ID))) {
    updateDOM()
} else {
    console.log('DDG Banner already exists')
}
