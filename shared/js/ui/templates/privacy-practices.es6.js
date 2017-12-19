const bel = require('bel')
const header = require('./shared/sliding-subview-header.es6.js')

module.exports = function () {
    return bel`<section class="sliding-subview sliding-subview--has-fixed-header">
        ${header('Privacy Practices')}
        <div class="privacy-practices site-info site-info--details
            card card--no-top-margin">
            <div class="privacy-practices__overview padded border--bottom">
                <h1>dodgysite.tk</h1>
            </div>
            <div class="privacy-practices__explainer padded border--bottom">
                Privacy practices indicate how much the personal information
                that you share with a website is protected.
            </div>
            <ul class="privacy-practices__details padded border--bottom">
                <li class="privacy-practices__detail-item
                    privacy-practices__detail-item--bad
                    ">You must provide your legal name</li>
                <li class="privacy-practices__detail-item
                    privacy-practices__detail-item--good
                    ">Your personal information is used for limited purposes</li>
            </ul>
            <div class="privacy-practices__attrib padded">
                Privacy Practice results from <a href="https://tosdr.org/">TOSDR</a>
            </div>
        </div>
     </section>`
}
