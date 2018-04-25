const bel = require('bel')

module.exports = function (klass, content) {
    return bel`<div class="popover ${klass}">
    <p class="popover__inner">
        ${content}
    </p>
    <span class="arrow arrow--down"></span>
</div>`
}
