const bel = require('bel');

module.exports = function () {
    return bel`<div class="top-blocked__no-data">
    <div class="top-blocked__no-data__graph">
        <span class="top-blocked__no-data__graph__bar one"></span>
        <span class="top-blocked__no-data__graph__bar two"></span>
        <span class="top-blocked__no-data__graph__bar three"></span>
        <span class="top-blocked__no-data__graph__bar four"></span>
    </div>
    <p class="top-blocked__no-data__lead text-center">Tracker Networks Top Offenders</p>
    <p>No data available yet</p>
</div>`;
};
