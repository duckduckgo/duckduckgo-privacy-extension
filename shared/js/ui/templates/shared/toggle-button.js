const bel = require('bel')

module.exports = function (isActiveBoolean, klass, dataKey) {
    // make `klass` and `dataKey` optional:
    klass = klass || ''
    dataKey = dataKey || ''

    return bel`
<button class="toggle-button toggle-button--is-active-${isActiveBoolean} ${klass}"
    data-key="${dataKey}"
    type="button"
    aria-pressed="${isActiveBoolean ? 'true' : 'false'}"
    >
    <div class="toggle-button__bg">
    </div>
    <div class="toggle-button__knob"></div>
</button>`
}
