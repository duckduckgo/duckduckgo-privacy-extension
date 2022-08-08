const { normalizeCompanyName } = require('./normalize-company-name.es6')

const UNKNOWN_COMPANY_NAME = 'unknown'

/**
 * @typedef {import('../../../background/classes/tracker').Tracker} Tracker
 * @typedef {import('../../../background/classes/tracker').TrackerSite} TrackerSite
 * @typedef {(url: TrackerSite) => boolean} ListFilter
 */

class AggregatedCompanyResponseData {
    /**
     * @param {number} entitiesCount
     * @param {AggregateCompanyData[]} list
     */
    constructor (entitiesCount, list) {
        this.entitiesCount = entitiesCount
        this.list = list.sort((a, b) => {
            if (a.name === UNKNOWN_COMPANY_NAME) {
                return 1
            } else if (b.name === UNKNOWN_COMPANY_NAME) {
                return -1
            }
            return b.count - a.count
        })
    }
}

export class AggregateCompanyData {
    /**
     * @param {string} companyName
     * @param {Tracker} company
     * @param {ListFilter} listFilter
     */
    constructor (companyName, company, listFilter) {
        const urlsList = company.urls ? Object.keys(company.urls) : []

        this.name = companyName
        this.displayName = company.displayName || companyName
        this.normalizedName = normalizeCompanyName(companyName)
        this.count = company.count
        this.urls = company.urls
        this.urlsList = urlsList.filter((url) => {
            const urlObject = company.urls[url]
            return listFilter(urlObject)
        })
    }
}

/**
 * @param {Record<string, Tracker>} trackers
 * @returns {Record<string, AggregatedCompanyResponseData>}
 */
export function getTrackerAggregationStats (trackers) {
    /** @type {Record<string, ListFilter>} */
    const listFilters = {
        all: () => true,
        blocked: (trackerSite) => trackerSite.isBlocked === true,
        allowed: (trackerSite) => trackerSite.isBlocked === false && trackerSite.isSameBaseDomain === false,
        ignored: (trackerSite) => trackerSite.isSameEntity === false && (trackerSite.action === 'ignore' || trackerSite.action === 'ignore-user'),
        sameEntityOnly: (trackerSite) => trackerSite.isSameEntity === true && (trackerSite.action === 'ignore' || trackerSite.action === 'ignore-user') && trackerSite.isSameBaseDomain === false,
        other: (trackerSite) => trackerSite.action === 'none',
        adAttribution: (trackerSite) => trackerSite.action === 'ad-attribution'
    }
    /** @type {Record<string, AggregatedCompanyResponseData>} */
    const aggregationStats = {
    }
    for (const listName in listFilters) {
        const listFilter = listFilters[listName]
        const list = []
        let entitiesCount = 0
        for (const companyName in trackers) {
            const company = trackers[companyName]

            const outputCompany = new AggregateCompanyData(companyName, company, listFilter)
            // If unknown count all items distinctly.
            if (companyName === UNKNOWN_COMPANY_NAME) {
                entitiesCount += outputCompany.urlsList.length
            } else if (outputCompany.urlsList.length) {
                entitiesCount += 1
            }
            if (outputCompany.urlsList.length) {
                list.push(outputCompany)
            }
        }
        aggregationStats[listName] = new AggregatedCompanyResponseData(entitiesCount, list)
    }
    return aggregationStats
}

/**
 * Convenience calculations - most of the time for the UI we only care totals
 * @param {Record<string, AggregatedCompanyResponseData>} aggregationStats
 * @returns {{otherRequestCount: number, trackersBlockedCount: number, specialRequestCount: number, thirdPartyRequestCount: number}}
 */
export function calculateTotals (aggregationStats) {
    const trackersBlockedCount = aggregationStats.blocked.entitiesCount || 0
    const ignoredCount = aggregationStats.ignored.entitiesCount || 0
    const firstPartyCount = aggregationStats.sameEntityOnly.entitiesCount || 0
    const adAttributionCount = aggregationStats.adAttribution.entitiesCount || 0
    const specialRequestCount = ignoredCount + firstPartyCount + adAttributionCount
    const otherRequestCount = aggregationStats.other.entitiesCount || 0

    return {
        otherRequestCount,
        specialRequestCount,
        trackersBlockedCount,
        thirdPartyRequestCount: aggregationStats.allowed.entitiesCount || 0
    }
}
