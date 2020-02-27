'use strict'

const consts = require('./consts.es6')
const logoUrl = chrome.runtime.getURL('img/banner/logo.svg')

module.exports = `
<div id="ddgb" class="ddgb slideIn">
    <img class="js-ddgb-logo ddgb__logo" src="${logoUrl}"></img>
    <div class="ddgb-inner">
        <div class="ddgb__content">
            <div class="ddgb__title">Google added this query to your personal advertising profile.</div>
            <div class="ddgb__text">
                <span>
                    You're likely to see ads related to this query on 80% of websites.
                </span>
                <span class="js-ddgb-more ddgb__btn">Show more</span>
            </div>
        </div>
    </div>
    <span class="js-ddgb-close ddgb-close">
        <svg class="js-ddgb-close ddgb__close" width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            ${consts.CLOSE_ICON}
        </svg>
    </span>
</div>
`
