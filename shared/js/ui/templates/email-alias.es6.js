const bel = require('bel')
const crossplatformLink = require('./shared/crossplatform-link.es6.js')

module.exports = function () {
    if (this.model.userData && this.model.userData.nextAlias) {
        return bel`
            <div class="js-email-alias email-alias-block padded">
                <span class="email-alias__icon"></span>
                <a href="#" class="link-secondary bold">
                    <span class="text-line-after-icon">
                        Create a Duck Address
                        <span class="js-alias-copied alias-copied-label">Copied to clipboard</span>
                    </span>
                </a>
            </div>`
    }

    return bel`${crossplatformLink('https://quack.duckduckgo.com/email/signup/', {
        className: 'email-alias-block padded bold',
        target: '_blank',
        text: 'Turn on Email Protection'
    })}`
}
