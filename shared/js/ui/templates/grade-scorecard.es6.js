const bel = require('bel')
const siteRating = require('./shared/site-rating.es6.js')
const siteRatingSubtitle = require('./shared/site-rating-subtitle.es6.js')

module.exports = function () {
  return bel`<section class="sliding-subview sliding-subview--has-fixed-header">
   <div class="site-info site-info--full-height card">
     <div class="hero border--bottom">
      <a href="#" class="hero__close js-sliding-subview-close">
        <span class="icon icon__arrow icon__arrow--left">
        </span>
      </a>
      ${siteRating(
        this.model.isCalculatingSiteRating,
        this.model.siteRating,
        this.model.isWhitelisted
      )}
      <h1 class="hero__title">${this.model.domain}</h1>
      ${siteRatingSubtitle(
        this.model.isCalculatingSiteRating,
        this.model.siteRating,
        this.model.isWhitelisted
      )}
    </div>
    ${getReasons(this.model)}
    ${getGrades(this.model)}
  </div>
  </section>`
}

function getReasons (model) {
  let detailItems = []

  // grab all the data from the items and create a status item for each of them

  // encryption status
  if (model.httpsStatusText) {
    let connectionMsg = 'Unencrypted'
    let modifier = 'bad'

    if (model.httpsStatusText === 'Secure') {
      connectionMsg = 'Encrypted'
      modifier = 'good'
    }

    detailItems.push(renderItem(modifier, `${connectionMsg} Connection`))
  }

  // tracking networks blocked,
  // only show a message if there's trackers blocked
  if (model.trackerNetworks.length) {
    detailItems.push(renderItem('bad', `${model.trackerNetworks.length} Tracker Networks Blocked`))
  }

  // major tracking networks,
  // only show a message if it's bad
  let majorTrackers = model.trackerNetworks.filter((tracker) => {
    return constants.majorTrackingNetworks[tracker]
  })
  if (majorTrackers.length) {
    detailItems.push(renderItem('bad', `${majorTrackers.length} Major Tracker Networks Blocked`))
  }

  if (model.isaMajorTrackingNetwork) {
    detailItems.push(renderItem('bad', `Site Is Part Of A Major Tracker Network`))
  }

  // privacy practices from tosdr
  if (model.tosdr &&
      model.tosdr.message &&
      model.tosdr.message !== 'Unknown') {
    let msg = model.tosdr.message
    let modifier = msg.toLowerCase()

    detailItems.push(renderItem(modifier, `${msg} Privacy Practices`))
  }

  return bel`<ul class="status-list status-list--right padded border--bottom--inner">
    ${detailItems}
  </ul>`
}

function getGrades (model) {
  let before = model.siteRating.before
  let after = model.siteRating.after

  if (!before || !after) {
    return
  }

  let detailItems = []

  detailItems.push(renderItem(before.toLowerCase(), 'Privacy Grade'))

  if (before !== after) {
    detailItems.push(renderItem(after.toLowerCase(), 'Enhanced Grade', true))
  }

  return bel`<ul class="status-list status-list--right padded">
    ${detailItems}
  </ul>`
}

function renderItem (modifier, item, highlight) {
  return bel`<li class="status-list__item status-list__item--${modifier}
      bold ${highlight ? 'is-highlighted' : ''}">
    ${item}
  </li>`
}
