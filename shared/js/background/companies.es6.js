const TopBlocked = require('./classes/top-blocked.es6')
const Company = require('./classes/company.es6')
const browserWrapper = require('./$BROWSER-wrapper.es6')
const migrate = require('./migrate.es6')

const Companies = (() => {
    let companyContainer = {}
    const topBlocked = new TopBlocked()
    const storageName = 'companyData'
    let totalPages = 0
    let totalPagesWithTrackers = 0
    let lastStatsResetDate = null

    function sortByCount (a, b) {
        return companyContainer[b].count - companyContainer[a].count
    }

    function sortByPages (a, b) {
        return companyContainer[b].pagesSeenOn - companyContainer[a].pagesSeenOn
    }

    return {
        get: (name) => { return companyContainer[name] },

        getTotalPages: () => { return totalPages },

        add: (c) => {
            if (!companyContainer[c.name]) {
                companyContainer[c.name] = new Company(c)
                topBlocked.add(c.name)
            }
            companyContainer[c.name].incrementCount()
            return companyContainer[c.name]
        },

        // This is used by tab.js to count only unique tracking networks on a tab
        countCompanyOnPage: (c) => {
            if (!companyContainer[c.name]) {
                companyContainer[c.name] = new Company(c)
                topBlocked.add(c.name)
            }
            if (c.name !== 'unknown') companyContainer[c.name].incrementPagesSeenOn()
        },

        all: () => { return Object.keys(companyContainer) },

        getTopBlocked: (n) => {
            const topBlockedData = []
            topBlocked.getTop(n, sortByCount).forEach((name) => {
                const c = Companies.get(name)
                topBlockedData.push({ name: c.name, count: c.count, displayName: c.displayName })
            })

            return topBlockedData
        },

        getTopBlockedByPages: (n) => {
            const topBlockedData = []
            topBlocked.getTop(n, sortByPages).forEach((name) => {
                const c = Companies.get(name)
                topBlockedData.push({
                    name: c.name,
                    displayName: c.displayName,
                    percent: Math.min(100, Math.round((c.pagesSeenOn / totalPages) * 100))
                })
            })

            return {
                topBlocked: topBlockedData,
                totalPages: totalPages,
                pctPagesWithTrackers: Math.min(100, Math.round((totalPagesWithTrackers / totalPages) * 100)),
                lastStatsResetDate: lastStatsResetDate
            }
        },

        setTotalPagesFromStorage: (n) => {
            if (n) totalPages = n
        },

        setTotalPagesWithTrackersFromStorage: (n) => {
            if (n) totalPagesWithTrackers = n
        },

        resetData: () => {
            companyContainer = {}
            topBlocked.clear()
            totalPages = 0
            totalPagesWithTrackers = 0
            lastStatsResetDate = Date.now()
            Companies.syncToStorage()
            const resetDate = Companies.getLastResetDate()
            browserWrapper.notifyPopup({ didResetTrackersData: resetDate })
        },

        getLastResetDate: () => lastStatsResetDate,

        incrementTotalPages: () => {
            totalPages += 1
            Companies.syncToStorage()
        },

        incrementTotalPagesWithTrackers: () => {
            totalPagesWithTrackers += 1
            Companies.syncToStorage()
        },

        syncToStorage: () => {
            const toSync = {}
            toSync[storageName] = companyContainer
            browserWrapper.syncToStorage(toSync)
            browserWrapper.syncToStorage({ totalPages: totalPages })
            browserWrapper.syncToStorage({ totalPagesWithTrackers: totalPagesWithTrackers })
            browserWrapper.syncToStorage({ lastStatsResetDate: lastStatsResetDate })
        },

        sanitizeData: (storageData) => {
            if (storageData && Object.hasOwnProperty.call(storageData, 'twitter')) {
                delete storageData.twitter
            }
            return storageData
        },

        buildFromStorage: () => {
            browserWrapper.getFromStorage(storageName, function (storageData) {
                // uncomment for testing
                // storageData.twitter = {count: 10, name: 'twitter', pagesSeenOn: 10}
                storageData = Companies.sanitizeData(storageData)

                for (let company in storageData) {
                    [company, storageData] = migrate.migrateCompanyData(company, storageData)
                    const newCompany = Companies.add(storageData[company])
                    newCompany.set('count', storageData[company].count || 0)
                    newCompany.set('pagesSeenOn', storageData[company].pagesSeenOn || 0)
                }
            })

            browserWrapper.getFromStorage('totalPages', (n) => { if (n) totalPages = n })
            browserWrapper.getFromStorage('totalPagesWithTrackers', (n) => { if (n) totalPagesWithTrackers = n })
            browserWrapper.getFromStorage('lastStatsResetDate', (d) => {
                if (d) {
                    lastStatsResetDate = d
                } else {
                    // if 'lastStatsResetDate' not found, reset all data
                    // https://app.asana.com/0/0/460622849089890/f
                    Companies.resetData()
                }
            })
        }
    }
})()

module.exports = Companies
