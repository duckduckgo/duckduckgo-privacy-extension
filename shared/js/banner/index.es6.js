'use strict'

console.log('Hello from Banner.js Content Script!')

const consts = require('./consts.es6')
const utils = require('./utils.es6')
const bannerHTML = require('./bannerTemplate.es6')
const modalHTML = require('./modalTemplate.es6')
const banner = utils.htmlToElement(bannerHTML)
const modal = utils.htmlToElement(modalHTML)

const body = document.body

// EVENT HANDLERS
const bannerClose = banner.querySelector('.js-ddgb-close')
const bannerMore = banner.querySelector('.js-ddgb-more')
const modalClose = modal.querySelector('.js-ddgm-close')

// Banner Close Click
bannerClose.addEventListener('click', (event) => {
    banner.remove()
    body.classList.remove(consts.HAS_MODAL_CLASS)
})

// Banner Learn More Click
bannerMore.addEventListener('click', (event) => {
    body.classList.add(consts.BLUR_CLASS)
    modal.classList.remove(consts.HIDDEN_CLASS)
})

// Modal Close Click
modalClose.addEventListener('click', (event) => {
    body.classList.remove(consts.BLUR_CLASS)
    modal.classList.add(consts.HIDDEN_CLASS)
})

// DOM INJECTIOM
// Insert content and update styles accordingly
if (utils.isGoogleSerp()) {
    console.log('Google SERP Detected!')

    const searchform = document.getElementById('searchform')
    searchform.insertAdjacentElement('afterbegin', banner)

    // On Google Homepage
} else {
    console.log('Google Homepage Detected!')

    const viewport = document.getElementById('viewport')
    viewport.classList.add('ddg-viewport')

    body.insertAdjacentElement('afterbegin', banner)
}

// Insert Modal
body.insertAdjacentElement('beforeend', modal)
body.classList.add(consts.HAS_MODAL_CLASS)
