const bel = require('bel')

module.exports = function (isActiveBoolean, klass, dataKey) {

    // make `klass` and `dataKey` optional:
    klass = klass || ''
    dataKey = dataKey || ''

    return bel`
    <button class="toggle-button toggle-button--is-active-${isActiveBoolean} ${klass}"
            data-key="${dataKey}"
            type="button">
        <div class="toggle-button__bg">
        </div>
        <div class="toggle-button__knob"></div>
    </button>`
}

