'use strict'

const consts = require('./consts.es6')
const id = consts.BANNER_ID
const logoUrl = chrome.runtime.getURL('img/banner/logo-round.svg')

module.exports = `
<div id="${id}" class="${id} ${consts.IS_ANIMATING_CLASS} slideIn">
    <div class="${id}-inner">
        <img class="${id}__logo" src="${logoUrl}"></img>
        <div class="${id}__content">
            <div class="js-${id}-title ${id}__title">
            Google can use your searches
            <br>
            to profile you.
            </div>
        </div>
    </div>
    <div class="${id}__buttons">
        <span class="js-${id}-more ${id}__btn">Show More</span>
        <span class="js-${id}-close ${id}__close">Dismiss</span>
    </div>
</div>
`
