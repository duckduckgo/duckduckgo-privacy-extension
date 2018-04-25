const bel = require('bel')

module.exports = function () {
    // TODO/REMOVE: remove marginTop style tag once this is actually hooked up
    // this is just to demo model store for now!
    //  -> this is gross, don't do this:
    const marginTop = this.model.suggestions && this.model.suggestions.length > 0 ? `margin-top: 50px;` : ''

    return bel`<ul class="js-autocomplete" style="${marginTop}">
        ${this.model.suggestions.map((suggestion) => bel`
            <li><a href="javascript:void(0)">${suggestion}</a></li>`
    )}
    </ul>`
}
