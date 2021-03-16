const bel = require('bel')
const crossplatformLink = require('./shared/crossplatform-link.es6.js')

module.exports = function () {
    let menu = ''
    if (this.model.userData && this.model.userData.nextAlias) {
        menu = bel`
            <div>
                <div class="padded email-menu-items">
                    <span class="email-dashboard__icon"></span>
                    ${crossplatformLink('https://quack.duckduckgo.com/email/dashboard/', {
                        className: 'link-secondary bold text-line-after-icon',
                        target: '_blank',
                        text: 'Email Protection Dashboard'
                    })}
                </div>
                <div class="padded email-menu-items">
                    <span class="email-feedback__icon"></span>
                    ${crossplatformLink('https://form.asana.com/?k=JSQR4UJazRdbbu0XM7_5ig&d=137249556945', {
                        className: 'link-secondary bold text-line-after-icon',
                        target: '_blank',
                        text: 'Give feedback'
                    })}
                </div>
                <div class="padded email-menu-items">
                    <span class="email-turn-off__icon"></span>
                    <a href="#" class="js-email-autofill-menu-logout link-secondary bold text-line-after-icon">
                        Turn off Email Protection
                    </a>
                </div>
            </div>
        `
    }

    return bel`
        <div>
            <div class="email-header">
                Email Protection
            </div>
            ${menu}
        </div>
    `
}
