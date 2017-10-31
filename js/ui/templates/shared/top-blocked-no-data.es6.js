const bel = require('bel')

module.exports = function () {
  return bel`<div class="top-blocked__no-data">
    <p>All trackers dashboard</p>
    <div class="top-blocked__no-data__graph">
      <span class="top-blocked__no-data__graph__bar one"></span>
      <span class="top-blocked__no-data__graph__bar two"></span>
      <span class="top-blocked__no-data__graph__bar three"></span>
      <span class="top-blocked__no-data__graph__bar four"></span>
    </div>
    <p>Still collecting data to show how many trackers we've blocked</p>
  </div>`
}

