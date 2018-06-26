const bel = require('bel')

module.exports = function () {
    return bel`<a class="linkable ${this.model.klass}"
    id="js-linkable-${this.model.id}"
    href="javascript:void(0)">
        ${this.model.text}
    <span class="${this.model.spanClass}"></div>
</a>`
}
