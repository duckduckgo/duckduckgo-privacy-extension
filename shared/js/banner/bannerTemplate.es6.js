'use strict'

const consts = require('./consts.es6')
const id = consts.BANNER_ID
const logoUrl = chrome.runtime.getURL('img/banner/logo.svg')

module.exports = `
<div id="${id}" class="${id} slideIn">
    <img class="js-${id}-logo ${id}__logo" src="${logoUrl}"></img>
    <div class="${id}-inner">
        <div class="${id}__content">
            <div class="${id}__title">Google added this query to your personal advertising profile.</div>
            <div class="${id}__text">
                <span>
                    You're likely to see ads related to this query on 80% of websites.
                </span>
                <span class="js-${id}-more ${id}__btn">Show more</span>
            </div>
        </div>
    </div>
    <span class="js-${id}-close ${id}-close">
        <svg class="js-${id}-close ${id}__close" width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            ${consts.CLOSE_ICON}
        </svg>
    </span>
</div>
`
