import { TimedCache } from './timed-cache'

/**
 * A single place to collect information about the number of requests
 * we have blocked, grouped by the owner's display name.
 */
export class AggregatedTrackerStats {
    /**
     * A time-based mechanism
     * @type {TimedCache}
     */
    companies = new TimedCache()
    /**
     * A running total for (hopefully) the lifespan of the extension being installed
     * @type {number}
     */
    totalCount = 0
    /**
     * The current state that consumers should place their UI into. This is stored here
     * to ensure it's co-located with the related data, such as tracking stats. It also
     * prevents consumers (like the new tab page) from having to persist their own state
     * @type {'showing' | 'hiding'}
     */
    state = 'showing'

    /**
     * Given a 'displayName', increment the companies running total for the
     * last hour + increment the 'since-install-time' value
     * @param {string} displayName
     * @param {number} [now] - optional timestamp
     */
    increment (displayName, now) {
        this.companies.insert(displayName, now)
        this.totalCount += 1
        this.sync()
    }

    /**
     * @param {number} [now] - an optional timestamp to compare entries against
     */
    prune (now) {
        this.companies.prune(now)
    }

    /**
     * @param {number} [now] - optional timestamp to use in comparisons
     */
    toDisplayData (now) {
        // access all entries
        const output = this.companies.view(now)

        // sort them first, so that the highest 'count's are first
        const sorted = output.sort((a, b) => b.count - a.count)

        // the UI will only render 9 + 'Other', so we take the first 9 here
        const listToRender = sorted.slice(0, 9)

        // everything after is classes as 'Other
        const other = sorted.slice(9)

        // aggregate the count for all in the 'Other' category
        const otherTotal = other.reduce((sum, item) => sum + item.count, 0)

        // if there were any, add a fake entry to the end of the array
        if (otherTotal > 0) {
            listToRender.push({
                key: 'Other',
                count: otherTotal
            })
        }

        // now produce the data in the shape consumers require for rendering their UI
        return {
            state: this.state,
            totalCount: this.totalCount,
            totalPeriod: 'install-time',
            trackerCompaniesPeriod: 'last-hour',
            trackerCompanies: listToRender.map(item => {
                const iconName = companyDisplayNameToIconName(item.key)
                let favicon
                if (iconsTheExtensionCanRender.includes(iconName)) {
                    favicon = chrome.runtime.getURL('/img/logos/' + iconName + '.svg')
                } else {
                    favicon = chrome.runtime.getURL('/img/letters/' + iconName[0] + '.svg')
                }
                return {
                    displayName: item.key,
                    count: item.count,
                    favicon
                }
            })
        }
    }

    reset () {
        this.companies.clear()
        this.totalCount = 0
        this.sync()
        return this
    }

    show () {
        this.state = 'showing'
        this.sync()
    }

    hide () {
        this.state = 'hiding'
        this.sync()
    }

    sync () {
        // todo
    }

    restore () {
        // todo
        return this
    }
}
const aggregatedTrackerStats = new AggregatedTrackerStats()

export { aggregatedTrackerStats }

function companyDisplayNameToIconName (companyName) {
    return (
        (companyName || '')
            .toLowerCase()
            // Remove TLD suffixes
            // e.g. Fixes cases like "amazon.com" -> "amazon"
            .replace(/\.[a-z]+$/i, '')
            // Remove non-alphanumeric characters
            // e.g. Fixes cases like "new relic" -> "newrelic"
            .replace(/[^a-z0-9]/g, '')
    )
}

export const iconsTheExtensionCanRender = [
    'adjust',
    'adobe',
    'amazon',
    'amplitude',
    'appnexus',
    'appsflyer',
    'beeswax',
    'branchmetrics',
    'braze',
    'bugsnag',
    'chartbeat',
    'comscore',
    'criteo',
    'facebook',
    'google',
    'googleadsgoogle',
    'googleanalyticsgoogle',
    'indexexchange',
    'instagramfacebook',
    'iponweb',
    'kochava',
    'linkedin',
    'liveramp',
    'magnite',
    'mediamath',
    'microsoft',
    'mixpanel',
    'neustar',
    'newrelic',
    'openx',
    'oracle',
    'outbrain',
    'pinterest',
    'pubmatic',
    'quantcast',
    'rythmone',
    'salesforce',
    'sharetrough',
    'smaato',
    'spotx',
    'taboola',
    'tapad',
    'thenielsencompany',
    'thetradedesk',
    'twitter',
    'urbanairship',
    'verizonmedia',
    'warnermedia',
    'xaxis',
    'yahoojapan',
    'yandex',
    'youtubegoogle',
    'zeotap'
]

// window.toStats = () => {
//     window.performance.mark('toStats:start')
//     const data = aggregatedTrackerStats.toDisplayData();
//     window.performance.mark('toStats:end')
//     console.log(window.performance.measure('ended', 'toStats:start', 'toStats:end'))
//     return JSON.stringify(data);
// }
