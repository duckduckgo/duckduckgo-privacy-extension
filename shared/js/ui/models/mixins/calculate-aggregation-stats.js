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
        allowed: (trackerSite) => trackerSite.isBlocked === false,
        ignored: (trackerSite) => trackerSite.isFirstParty === false && trackerSite.action === 'ignore',
        firstParty: (trackerSite) => trackerSite.isFirstParty === true && trackerSite.action === 'ignore',
        other: (trackerSite) => trackerSite.action === 'none' || trackerSite.action === 'ignore-user',
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
