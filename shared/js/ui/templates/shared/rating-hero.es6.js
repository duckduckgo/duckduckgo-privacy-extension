const bel = require('bel')
const hero = require('./hero.es6.js')

module.exports = function (site, ops) {
    const status = siteRatingStatus(
        site.isCalculatingSiteRating,
        site.siteRating,
        site.isAllowlisted
    )
    const subtitle = siteRatingSubtitle(
        site.isCalculatingSiteRating,
        site.siteRating,
        site.isAllowlisted,
        site.isBroken
    )
    const label = subtitleLabel(
        site.isCalculatingSiteRating,
        site.siteRating,
        site.isAllowlisted
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

function siteRatingStatus (isCalculating, rating, isAllowlisted) {
    let status
    let isActive = ''

    if (isCalculating) {
        status = 'calculating'
    } else if (rating && rating.before) {
        isActive = isAllowlisted ? '' : '--active'

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

function siteRatingSubtitle (isCalculating, rating, isAllowlisted, isBroken) {
    let isActive = true
    if (isBroken) {
        return ''
    }
    if (isAllowlisted) isActive = false
    // site grade/rating was upgraded by extension
    if (isActive && rating && rating.before && rating.after) {
        if (rating.before !== rating.after) {
            // wrap this in a single root span otherwise bel complains
            return bel`<span>Site enhanced from
    <span class="rating-letter rating-letter--${rating.cssBefore}">
    </span>
</span>`
        }
    }

    // deal with other states
    let msg = 'Privacy Grade'
    // site is whitelisted
    if (!isActive) {
        msg = 'Privacy Protection Disabled'
        // "null" state (empty tab, browser's "about:" pages)
    } else if (!isCalculating && !rating.before && !rating.after) {
        msg = 'We only grade regular websites'
        // rating is still calculating
    } else if (isCalculating) {
        msg = 'Calculating...'
    }

    return bel`${msg}`
}

// to avoid duplicating messages between the icon and the subtitle,
// we combine information for both here
function subtitleLabel (isCalculating, rating, isAllowlisted) {
    if (isCalculating) return

    if (isAllowlisted && rating.before) {
        return `Privacy Protection Disabled, Privacy Grade ${rating.before}`
    }

    if (rating.before && rating.before === rating.after) {
        return `Privacy Grade ${rating.before}`
    }

    if (rating.before && rating.after) {
        return `Site enhanced from ${rating.before}`
    }
}
