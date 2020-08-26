const bel = require('bel')
const changeCase = require('change-case')
const hero = require('./shared/hero.es6.js')
const statusList = require('./shared/status-list.es6.js')
const constants = require('../../../data/constants')
const crossplatformLink = require('./shared/crossplatform-link.es6.js')

module.exports = function () {
    const domain = this.model && this.model.domain
    const tosdr = this.model && this.model.tosdr

    const tosdrMsg = (tosdr && tosdr.message) ||
    constants.tosdrMessages.unknown
    const tosdrStatus = tosdrMsg.toLowerCase()

    return bel`<section class="sliding-subview sliding-subview--has-fixed-header">
    <div class="privacy-practices site-info site-info--full-height card">
        <div class="js-privacy-practices-hero">
            ${hero({
        status: tosdrStatus,
        title: domain,
        subtitle: `${tosdrMsg} Privacy Practices`,
        showClose: true
    })}
        </div>
        <div class="privacy-practices__explainer padded border--bottom--inner
            text--center">
            Privacy practices indicate how much the personal information
            that you share with a website is protected.
        </div>
        <div class="privacy-practices__details padded
            js-privacy-practices-details">
            ${tosdr && tosdr.reasons ? renderDetails(tosdr.reasons) : renderNoDetails()}
        </div>
        <div class="privacy-practices__attrib padded text--center border--top--inner">
            Privacy Practice results from ${crossplatformLink('https://tosdr.org/', {
        className: 'bold',
        target: '_blank',
        text: 'ToS;DR',
        attributes: {
            'aria-label': 'Terms of Service; Didn\'t Read'
        }
    })}
        </div>
    </div>
</section>`
}

function renderDetails (reasons) {
    let good = reasons.good || []
    let bad = reasons.bad || []

    if (!good.length && !bad.length) return renderNoDetails()

    // convert arrays to work for the statusList template,
    // which use objects

    good = good.map(item => ({
        msg: changeCase.upperCaseFirst(item),
        modifier: 'good'
    }))

    bad = bad.map(item => ({
        msg: changeCase.upperCaseFirst(item),
        modifier: 'bad'
    }))

    // list good first, then bad
    return statusList(good.concat(bad))
}

function renderNoDetails () {
    return bel`<div class="text--center">
    <h1 class="privacy-practices__details__title">
        No Privacy Practices Found
    </h1>
    <div class="privacy-practices__details__msg">
        The Privacy practices of this website have not been reviewed.
    </div>
</div>`
}
