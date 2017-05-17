const bel = require('bel');

module.exports = function (isActiveBoolean, klass) {

    return bel`
    <button class="toggle-button ${klass}" type="button">
        <div class="js-toggle-bg js-toggle-bg-${isActiveBoolean}">
            <div class="js-toggle-knob js-toggle-knob-${isActiveBoolean}"></div>
        </div>
    </button>`;
}

