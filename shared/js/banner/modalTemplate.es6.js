'use strict'

const consts = require('./consts.es6')
const id = consts.BANNER_MODAL_ID

const logoUrl = chrome.runtime.getURL('img/banner/logo-round.svg')

module.exports = `
<div class="${id}-overlay ${consts.HIDDEN_CLASS}">
    <div id="${id}" class="${id}" >
        <div class="${id}-content">
            <div class="${id}-content__top">
                <img class="js-${id}-logo ${id}__logo" src="${logoUrl}"></img>
                <p class="${id}-content__top__title">
                    DuckDuckGo can’t block Google from tracking your searches
                </p>
                <p class="${id}-content__top__text">
                    For truly private search, make DuckDuckGo your default search engine.
                </p>
            </div>

            <div class="${id}-content__bottom">
                <p class="${id}-content__bottom__title">
                    In the Firefox menu, go to
                    <br>
                    Preferences, Search, and Default Search Engine.
                </p>
                <span class="js-${id}-dont-remind ${id}-content__bottom__text">
                    Don’t remind me about this again.
                </span>
            </div>

            <svg class="js-${id}-close ${id}__close" width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                ${consts.CLOSE_ICON}
            </svg>
        </div>
    </div>
</div >
`
