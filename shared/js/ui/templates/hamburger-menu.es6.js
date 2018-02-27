const bel = require('bel')
const renderBrokenSiteHref = require('./shared/render-broken-site-href.es6.js')
const renderFeedbackHref = require('./shared/render-feedback-href.es6.js')

module.exports = function () {
  return bel`<nav class="hamburger-menu js-hamburger-menu is-hidden">
    <div class="hamburger-menu__bg"></div>
    <div class="hamburger-menu__content card padded">
        <h2 class="menu-title border--bottom hamburger-menu__content__more-options">
      More Options
        </h2>
        <nav class="pull-right hamburger-menu__close-container">
      <a href="#" class="icon icon__close js-hamburger-menu-close"></a>
        </nav>
        <ul class="hamburger-menu__links padded default-list">
      <li>
          <a href="#" class="menu-title js-hamburger-menu-options-link">
        Settings
        <span>Manage whitelist and other options</span>
          </a>
      </li>
      <li>
        <a href="${renderFeedbackHref(this.model.browserInfo, this.model.tabUrl)}"
        target="_blank"
        class="menu-title">
        Send feedback
        <span>Got issues or suggestions? Let us know!</span>
          </a>
      </li>
      <li>
        <a href="${renderBrokenSiteHref(this.model.browserInfo, this.model.tabUrl)}"
        target="_blank"
        class="menu-title">
        Report broken site
        <span>If a site's not working, please tell us.</span>
          </a>
      </li>
        </ul>
    </div>
  </nav>`
}
