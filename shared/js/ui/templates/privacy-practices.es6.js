const bel = require('bel')
const header = require('./shared/sliding-subview-header.es6.js')

module.exports = function () {

    return bel`<section class="sliding-subview sliding-subview--has-fixed-header">
        ${header('Privacy Practices')}
        <div class="site-info site-info--details card card--no-top-margin">
            <h1 class="site-info__domain">dodgysite.tk</h1>
        </div>
        <div class="site-info site-info--details card card--no-top-margin">
            Privacy practices indicate how much the personal information
            that you share with a website is protected.
        </div>
        <div class="site-info site-info--details card card--no-top-margin">
            <ul>
                <li><i>X</i>You must provide your legal name</li>
            </ul>
        </div>
     </section>`
}
