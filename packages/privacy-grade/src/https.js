const utils = require('./utils');

class HTTPS {
    addLists(lists) {
        this.httpsList = lists.https;
        this.httpsAutoUpgradeList = lists.httpsAutoUpgrade;

        this.httpsSet = new Set(this.httpsList);
        this.httpsAutoUpgradeSet = new Set(this.httpsAutoUpgradeList);
    }

    getUpgradedUrl(url) {
        // Only deal with http calls
        if (url.indexOf('http:') !== 0) {
            return url;
        }

        // Determine host
        const host = utils.extractHostFromURL(url);

        if (this.canUpgradeHost(host)) {
            return url.replace(/^(http|https):\/\//i, 'https://');
        }

        // If it falls to here, default to url
        return url;
    }

    canUpgradeHost(host) {
        if (!this.httpsSet) {
            throw new Error('tried to upgrade hosts before rules were loaded');
        }

        return this.httpsSet.has(host);
    }

    hostAutoUpgrades(host) {
        if (!this.httpsAutoUpgradeSet) {
            throw new Error('tried to upgrade hosts before rules were loaded');
        }

        return this.httpsAutoUpgradeSet.has(host);
    }
}

module.exports = new HTTPS();
