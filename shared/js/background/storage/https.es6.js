const load = require('./../load.es6.js')
const Dexie = require('dexie')
const BloomFilter = require("jsbloom").filter
const constants = require('../../../data/constants')

class HTTPSStorage {
    constructor () {
        this.dbc = new Dexie('https_bloom_blob')
        this._isReady = this.init().then(() => { return true })
        this.bloom = {}
    }

    ready () {
        return this._isReady
    }

    init () {
        return new Promise((resolve, reject) => {
            // check for a new bloom filter
            this.getBloomDataXHR().then(data => {
                if (data) {
                    this.createBloomFilter(data)
                    //this.storeBloomInLocalDB(arrayBuffer)
                    resolve()
                } else {
                    //this.getBloomDataFromLocalDB().then(arrayBuffer => {
                    //    this.createBloomFilter(arrayBuffer)
                    //})
               }
            })

        })
    }

    checkForListUpdate () {
        getBloomBlob().then(data)
    }

    createBloomFilter (filterData) {
        this.bloom = new BloomFilter(filterData.totalEntries, filterData.errorRate)
        this.bloom.importData(Buffer.from(filterData.bloomFilter, 'base64'))
    }

    getBloomDataXHR () {
        let url = `https://jason.duckduckgo.com/https-bloom.json`;

        return new Promise((resolve, reject) => {
            load.JSONfromExternalFile(url, resolve);
        });
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
}
module.exports = new HTTPSStorage()
