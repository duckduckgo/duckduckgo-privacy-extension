const bel = require('bel')

module.exports = function () {
    return bel`
    <div class="js-email-alias email-alias-block padded">
        <span class="email-alias__icon"></span>
        <a href="#" class="link-secondary bold">
            <span class="text-line-after-icon">
                Create New Email Alias
                <span class="js-alias-copied alias-copied-label">Copied to clipboard</span>
            </span>
        </a>
    </div>`
}
