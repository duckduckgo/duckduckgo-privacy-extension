const bel = require('bel')
const statusList = require('./status-list.es6.js')
const changeCase = require('change-case')

module.exports = function (tosdr) {
  if (!tosdr || !tosdr.reasons) return renderNoDetails()

  let good = tosdr.reasons.good || []
  let bad = tosdr.reasons.bad || []

  if (!good.length && !bad.length) return renderNoDetails()

  // convert arrays to work for the statusList template,
  // which use objects

  good = good.map(item => ({
    msg: changeCase.upperCaseFirst(item),
    modifier: 'good'
  }))

  bad = bad.map(item => ({
    msg: changeCase.upperCaseFirst(item),
    modifier: 'bad'
  }))

  // list good first, then bad
  return statusList(good.concat(bad))
}

function renderNoDetails () {
  return bel`<div class="text--center">
    <div class="privacy-practices__details__no-detail-icon"></div>
    <h1 class="privacy-practices__details__title">
      No Privacy Practices Found
    </h1>
    <div class="privacy-practices__details__msg">
      The Privacy practices of this website have not been reviewed
    </div>
  </div>`
}
