const bel = require('bel')

module.exports = function (domain, tosdr) {
    let subtitle = tosdr ?
        `Privacy Practices` :
        `Unknown Privacy Practices`

    return bel`<div>
        <img class="privacy-practices__overview__ribbon">
        <h1 class="privacy-practices__overview__domain">
            ${domain}
        </h1>
        <h2 class="privacy-practices__overview__subtitle">
            ${subtitle}
        </h2>
    </div>`
}
