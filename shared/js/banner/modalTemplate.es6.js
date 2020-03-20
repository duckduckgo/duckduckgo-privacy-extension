'use strict'

const consts = require('./consts.es6')
const id = consts.MODAL_ID

const logoUrl = chrome.runtime.getURL('img/banner/logo-round.svg')

module.exports = `
<div class="${id}-overlay ${consts.HIDDEN_CLASS}">
    <div class="js-${id}-wrap ${id}-wrap">
        <div id="${id}" class="${id}">
            <img class="js-${id}-logo ${id}__logo" src="${logoUrl}"></img>
            <h1 class="${id}__title">
                DuckDuckGo can't protect you
                <br>
                when you search on Google.
            </h1>

            <p class="${id}__text">
                What’s the harm?
                <br>
                Google remembers what you search and uses that data profile to follow you around with ads.
            </p>

            <a href="https://duckduckgo.com" class="js-${id}-btn ${id}__btn">
                Search Privately on DuckDuckGo
            </a>

            <span class="js-${id}-dont-remind ${id}__link">
                Don’t remind me about this again.
            </span>

            <svg class="js-${id}-close ${id}__close" width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
                ${consts.CLOSE_ICON}
            </svg>
        </div>
    </div>
</div >
`
