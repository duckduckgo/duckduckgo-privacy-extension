const TopBlocked = require('./classes/top-blocked')
const Company = require('./classes/company')
const browserWrapper = require('./wrapper')

export class Companies {
    /** @type {Companies | undefined} */
    shared;

    constructor() {
        this.companyContainer = {};
        this.topBlocked = new TopBlocked();
        this.storageName = 'companyData';
        this.totalPages = 0;
        this.totalPagesWithTrackers = 0;
        this.lastStatsResetDate = null;
    }

    sortByCount(a, b) {
        return this.companyContainer[b].count - this.companyContainer[a].count;
    }

    sortByPages(a, b) {
        return this.companyContainer[b].pagesSeenOn - this.companyContainer[a].pagesSeenOn;
    }

    get(name) {
        return this.companyContainer[name];
    }

    getTotalPages() {
        return this.totalPages;
    }

    add(c) {
        if (!this.companyContainer[c.name]) {
            this.companyContainer[c.name] = new Company(c);
            this.topBlocked.add(c.name);
        }
        this.companyContainer[c.name].incrementCount();
        return this.companyContainer[c.name];
    }

    countCompanyOnPage(c) {
        if (!this.companyContainer[c.name]) {
            this.companyContainer[c.name] = new Company(c);
            this.topBlocked.add(c.name);
        }
        if (c.name !== 'unknown') this.companyContainer[c.name].incrementPagesSeenOn();
    }

    all() {
        return Object.keys(this.companyContainer);
    }

    getTopBlocked(n) {
        const topBlockedData = [];
        this.topBlocked.getTop(n, this.sortByCount.bind(this)).forEach((name) => {
            const c = this.get(name);
            topBlockedData.push({ name: c.name, count: c.count, displayName: c.displayName });
        });

        return topBlockedData;
    }

    getTopBlockedByPages(n) {
        const topBlockedData = [];
        this.topBlocked.getTop(n, this.sortByPages.bind(this)).forEach((name) => {
            const c = this.get(name);
            topBlockedData.push({
                name: c.name,
                displayName: c.displayName,
                percent: Math.min(100, Math.round((c.pagesSeenOn / this.totalPages) * 100)),
            });
        });

        return {
            topBlocked: topBlockedData,
            totalPages: this.totalPages,
            pctPagesWithTrackers: Math.min(100, Math.round((this.totalPagesWithTrackers / this.totalPages) * 100)),
            lastStatsResetDate: this.lastStatsResetDate,
        };
    }

    setTotalPagesFromStorage(n) {
        if (n) this.totalPages = n;
    }

    setTotalPagesWithTrackersFromStorage(n) {
        if (n) this.totalPagesWithTrackers = n;
    }

    resetData() {
        this.companyContainer = {};
        this.topBlocked.clear();
        this.totalPages = 0;
        this.totalPagesWithTrackers = 0;
        this.lastStatsResetDate = Date.now();
        this.syncToStorage();
        const resetDate = this.getLastResetDate();
        browserWrapper.notifyPopup({ didResetTrackersData: resetDate });
    }

    getLastResetDate() {
        return this.lastStatsResetDate;
    }

    incrementTotalPages() {
        this.totalPages += 1;
        this.syncToStorage();
    }

    incrementTotalPagesWithTrackers() {
        this.totalPagesWithTrackers += 1;
        this.syncToStorage();
    }

    syncToStorage() {
        const toSync = {};
        toSync[this.storageName] = this.companyContainer;
        browserWrapper.syncToStorage(toSync);
        browserWrapper.syncToStorage({ totalPages: this.totalPages });
        browserWrapper.syncToStorage({ totalPagesWithTrackers: this.totalPagesWithTrackers });
        browserWrapper.syncToStorage({ lastStatsResetDate: this.lastStatsResetDate });
    }

    sanitizeData(storageData) {
        if (storageData && Object.hasOwnProperty.call(storageData, 'twitter')) {
            delete storageData.twitter;
        }
        return storageData;
    }

    buildFromStorage() {
        browserWrapper.getFromStorage(this.storageName).then((storageData) => {
            // uncomment for testing
            // storageData.twitter = {count: 10, name: 'twitter', pagesSeenOn: 10}
            storageData = this.sanitizeData(storageData);

            for (const company in storageData) {
                const newCompany = this.add(storageData[company]);
                newCompany.set('count', storageData[company].count || 0);
                newCompany.set('pagesSeenOn', storageData[company].pagesSeenOn || 0);
            }
        });

        browserWrapper.getFromStorage('totalPages').then((n) => {
            if (n) this.totalPages = n;
        });
        browserWrapper.getFromStorage('totalPagesWithTrackers').then((n) => {
            if (n) this.totalPagesWithTrackers = n;
        });
        browserWrapper.getFromStorage('lastStatsResetDate').then((d) => {
            if (d) {
                this.lastStatsResetDate = d;
            } else {
                // if 'lastStatsResetDate' not found, reset all data
                // https://app.asana.com/0/0/460622849089890/f
                this.resetData();
            }
        });
    }
}
