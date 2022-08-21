const bel = require('bel').default
const displayCategories = require('./../../../../data/constants.js').displayCategories

export function renderAboutOurTrackingProtectionsLink () {
    const webProtectionsURL = 'https://help.duckduckgo.com/duckduckgo-help-pages/privacy/web-tracking-protections/'
    return bel`<a class="about-link" href="${webProtectionsURL}" target="_blank">About our Web Tracking Protections</a>`
}

/**
 * Find first matching category from our list of allowed display categories
 * @param {import('../../../background/classes/tracker.js').TrackerSite} trackerObj
 **/
export function categoryText (trackerObj) {
    let category = ''
    if (trackerObj && trackerObj.categories) {
        category = displayCategories.find(displayCat => {
            return trackerObj.categories.includes(displayCat)
        }) || ''
    }
    return category
}

/**
 * @typedef {import('../../models/mixins/calculate-aggregation-stats.js').AggregateCompanyData} AggregateCompanyData
 */
/**
 * @param {AggregateCompanyData[]} companyListMap
 * @param {*} [site] // is '../../models/site.es6.js' but the types are impossible to import without refactor
 * @returns {*}
 */
export function renderTrackerDetails (companyListMap, site) {
    if (!companyListMap || companyListMap.length === 0) {
        return bel`<li class="is-empty"></li>`
    }
    return companyListMap.map((c, i) => {
        if (!c.urlsMap.size) {
            return ''
        }
        const urlOutput = [...c.urlsMap.entries()].map(([url, tracker]) => {
            const category = categoryText(tracker)
            return bel`<li class="url-list-item">
                <div class="url" title="${url}">${url}</div>
                <div class="category">${category}</div>
            </li>`
        })
        return bel`<li class="padded--top-half">
        <div class="site-info__tracker__wrapper ${c.normalizedName} float-right">
            <span class="site-info__tracker__icon ${c.normalizedName}">
            </span>
        </div>
        <h1 title="${c.name}" class="site-info__domain block">${c.displayName}</h1>
        <ol class="default-list site-info__trackers__company-list__url-list" aria-label="Tracker domains for ${c.name}">
            ${urlOutput}
        </ol>
        </li>`
    })
}
