'use strict'

const consts = require('./consts.es6')
const id = consts.BANNER_ID
const logoUrl = chrome.runtime.getURL('img/banner/logo-round.svg')

module.exports = `
<div id="${id}" class="${id} ${consts.IS_ANIMATING_CLASS} slideIn">
    <div class="${id}-inner">
        <img class="${id}__logo" src="${logoUrl}"></img>
        <div class="${id}__content">
            <div class="${id}__title">
                Google may use your search to profile you.
            </div>
            <div class="${id}__text">
                Ads about this topic may follow you across sites and devices
            </div>
        </div>
    </div>
    <div class="${id}__buttons">
        <span class="js-${id}-more ${id}__btn">Show more</span>
        <span class="js-${id}-close ${id}__close">Dismiss</span>
    </div>
</div>
`
