'use strict'

const consts = require('./consts.es6')

module.exports = `
<div class="ddgm-overlay ${consts.HIDDEN_CLASS}">
    <div id="ddgm" class="ddgm" >
        <div class="ddgm-content">
            <div class="ddgm-content__top">
                <svg class="ddgm__logo" width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    ${consts.LOGO_ROUND}
                </svg>
                <p class="ddgm-content__top__title">
                    DuckDuckGo can’t block Google from tracking your searches
                </p>
                <p class="ddgm-content__top__text">
                    For truly private search, make DuckDuckGo your default search engine.
                </p>
            </div>

            <div class="ddgm-content__bottom">
                <p class="ddgm-content__bottom__title">
                    In the Firefox menu, go to
                    <br>
                        Preferences, Search, and Default Search Engine.
                </p>
                <p class="ddgm-content__bottom__text">
                    Don’t remind me about this again.
                </p>
            </div>

            <svg class="js-ddgm-close ddgm__close" width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                ${consts.CLOSE_ICON}
            </svg>
        </div>
    </div>
</div >
`
