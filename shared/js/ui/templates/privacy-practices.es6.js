const bel = require('bel')
const header = require('./shared/sliding-subview-header.es6.js')
const overview = require('./shared/privacy-practices-overview.es6.js')
const details = require('./shared/privacy-practices-details.es6.js')

module.exports = function () {
    let domain = this.model && this.model.domain;
    let tosdr = this.model && this.model.tosdr;

    // TODO does there need to be a "calculating" state?
    return bel`<section class="sliding-subview sliding-subview--has-fixed-header">
        ${header('Privacy Practices')}
        <div class="privacy-practices site-info site-info--details
            card card--no-top-margin">
            <div class="privacy-practices__overview padded border--bottom
                js-privacy-practices-overview">
                ${overview(domain, tosdr)}
            </div>
            <div class="privacy-practices__explainer padded border--bottom--inner">
                Privacy practices indicate how much the personal information
                that you share with a website is protected.
            </div>
            <div class="privacy-practices__details padded border--bottom--inner
                js-privacy-practices-details">
                ${details(tosdr)}
            </div>
            <div class="privacy-practices__attrib padded">
                Privacy Practice results from <a href="https://tosdr.org/">TOSDR</a>
            </div>
        </div>
     </section>`
}
