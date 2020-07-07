const bel = require('bel')

module.exports = function (list) {
    if (list.length > 0) {
        var i = 0
        return bel`${list.map((dom) => bel`
<li class="js-whitelist-list-item">
    <a class="link-secondary" href="https://${dom}">${dom}</a>
    <button class="remove pull-right js-whitelist-remove" data-item="${i++}">×</button>
</li>`)}`
    }
    return bel`<li>No Unprotected Sites Yet</li>`
}
