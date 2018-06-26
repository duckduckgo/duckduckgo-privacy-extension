const load = require('./load.es6')
const settings = require('./settings.es6')
const utils = require('./utils.es6')
const constants = require('../../data/constants')
const Dexie = require('dexie')
const BloomFilter = require("jsbloom").filter;

class HTTPS {
    constructor () {
        this.db = new Dexie('https_bloom_blob')
        this.numberOfDomains = 0
        this.bloom = {
            filter: '',
            errorRate: 0.0001,
        }

        this._isReady = this.init().then(() => this.isReady = true)
        
        return this
    }

    ready() {
        return this._isReady
    }

    init() {
        return new Promise((resolve, reject) => {
            console.log('HTTPS: init()')
            
            // check for a new bloom filter
            this.getBloomDataXHR().then(data => {
                if (data) {
                    this.numberOfDomains = data.total
                    let arrayBuffer = new Uint8Array(data.array)
                    //this.storeBloomInLocalDB(arrayBuffer)
                    this.createBloomFilter(arrayBuffer)
                    this._isReady = true
                    resolve()
                } else {
                    //this.getBloomDataFromLocalDB().then(arrayBuffer => {
                    //    this.createBloomFilter(arrayBuffer)
                    //})
                }
            })
        })
    }

    checkForListUpdate() {
        getBloomBlob().then(data)
    }

    getBloomDataXHR() {
        let url = `https://jason.duckduckgo.com/https-bloom`;

        return new Promise((resolve, reject) => {
            load.JSONfromExternalFile(url, resolve);
        });
    }

    createBloomFilter(arrayBuffer) {
        console.log("loading filter");
        this.bloom.filter = new BloomFilter(this.numberOfDomains, this.bloom.errorRate);
        this.bloom.filter.importData(new Uint8Array(arrayBuffer));
    }

    getBloomFromLocalDB() {
        return new Promise((resolve, reject) => {
            this.db.open() 
        })
    }
    storeBloomInLocalDB(arrayBuffer) {
        return new Promise((resolve, reject) => {
            this.db.version(1).stores({
                rules: '++id'
            });
            
            return this.db.rules.put({ buf: arrayBuffer })
            resolve();
        });
    }

    canUpgradeHost (host) {
        return this.bloom.filter.checkEntry(host)
    }

    getUpgradedUrl (reqUrl, tab, isMainFrame) {
        // Only deal with http calls
        const protocol = utils.getProtocol(reqUrl).toLowerCase()
        if (protocol !== 'http:') {
            return reqUrl
        }

        // Obey global settings (options page)
        if (!settings.getSetting('httpsEverywhereEnabled')) {
            return reqUrl
        }

        // Skip upgrading sites that have been whitelisted by user
        // via on/off toggle in popup
        if (tab.site.whitelisted) {
            console.log(`HTTPS: ${tab.site.domain} was whitelisted by user. skip upgrade check.`)
            return reqUrl
        }

        // Determine host
        const host = utils.extractHostFromURL(reqUrl)

        if (this.canUpgradeHost(host)) {
            return reqUrl.replace(/^(http|https):\/\//i, 'https://')
        }

        // If it falls to here, default to reqUrl
        return reqUrl
    }
}

module.exports = new HTTPS()
