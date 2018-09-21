const bel = require('bel')
const hero = require('./hero.es6.js')

module.exports = function (site, ops) {
    const status = siteRatingStatus(
        site.isCalculatingSiteRating,
        site.siteRating,
        site.isWhitelisted
    )
    const subtitle = siteRatingSubtitle(
        site.isCalculatingSiteRating,
        site.siteRating,
        site.isWhitelisted
    )
    const label = subtitleLabel(
        site.isCalculatingSiteRating,
        site.siteRating,
        site.isWhitelisted
    )

    return bel`<div class="rating-hero-container js-rating-hero">
     ${hero({
        status: status,
        title: site.domain,
        subtitle: subtitle,
        subtitleLabel: label,
        showClose: ops.showClose,
        showOpen: ops.showOpen
    })}
</div>`
}

function siteRatingStatus (isCalculating, rating, isWhitelisted) {
    let status
    let isActive = ''

    if (isCalculating) {
        status = 'calculating'
    } else if (rating && rating.before) {
        isActive = isWhitelisted ? '' : '--active'

        if (isActive && rating.after) {
            status = rating.cssAfter
        } else {
            status = rating.cssBefore
        }
    } else {
        status = 'null'
    }

    return status + isActive
}

function siteRatingSubtitle (isCalculating, rating, isWhitelisted) {
    let isActive = true
    if (isWhitelisted) isActive = false
    // site grade/rating was upgraded by extension
    if (isActive && rating && rating.before && rating.after) {
        if (rating.before !== rating.after) {
            // wrap this in a single root span otherwise bel complains
            return bel`<span>Enhanced from
    <span class="rating-letter rating-letter--${rating.cssBefore}">
    </span> to
    <span class="rating-letter rating-letter--${rating.cssAfter}">
    </span>
</span>`
        }
    }

    // deal with other states
    let msg = 'Privacy Grade'
    // site is whitelisted
    if (!isActive) {
        msg = `Privacy Protection Disabled`
        // "null" state (empty tab, browser's "about:" pages)
    } else if (!isCalculating && !rating.before && !rating.after) {
        msg = `We only grade regular websites`
        // rating is still calculating
    } else if (isCalculating) {
        msg = `Calculating...`
    }

    return bel`${msg}`
}

// to avoid duplicating messages between the icon and the subtitle,
// we combine information for both here
function subtitleLabel (isCalculating, rating, isWhitelisted) {
    if (isCalculating) return

    if (isWhitelisted && rating.before) {
        return `Privacy Protection Disabled, Privacy Grade ${rating.before}`
    }

    if (rating.before && rating.before === rating.after) {
        return `Privacy Grade ${rating.before}`
    }

    if (rating.before && rating.after) {
        return `Enhanced from ${rating.before} to ${rating.after}`
    }
}
