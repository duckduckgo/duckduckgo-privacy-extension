'use strict'

const consts = require('./consts.es6')

module.exports = `
<div class="ddgb">
    <div class="ddgb-left"></div>

    <div class="ddgb-center">
        <svg class="ddgb__logo" width="90" height="24" viewBox="0 0 90 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            ${consts.LOGO_HORIZONTAL}
        </svg>

        <div class="ddgb__divider"></div>

        <div class="ddgb__content">
            <svg class="ddgb__icon" width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                ${consts.ATTN_ICON}
            </svg>
            <span class="ddgb__text">Google added this query to your personal advertising profile. You're likely to see ads related to this query on 80% of websites.</span>
            <span class="js-ddgb-more ddgb__btn">Show more</span>
        </div>
    </div>

    <div class="ddgb-right">
        <span class="js-ddgb-close ddgb-close">
            <svg class="js-ddgb-close ddgb__close" width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                ${consts.CLOSE_ICON}
            </svg>
        </span>
    </div>
</div>
`
