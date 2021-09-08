const bel = require('bel')

module.exports = function () {
    return bel`
        <div class="js-broken-site-footer broken-site-footer-block padded">
            <a href="#" class="link-secondary bold">
                <span class="broken-site-text-line">
                    Site not working as expected?
                </span>
            </a>
        </div>`
}
