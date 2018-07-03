const load = require('./../load.es6.js')
const Dexie = require('dexie')
const BloomFilter = require("jsbloom").filter
const constants = require('../../../data/constants')

class HTTPSStorage {
    constructor () {
        this.dbc = new Dexie('https')
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
                if (0 && data) {
                    data.version = 1
                    data.bloomFilter = Buffer.from(data.bloomFilter, 'base64')
                    this.createBloomFilter(data)
                    this.storeBloomInLocalDB(data)
                    resolve()
                } else {
                    this.getDataFromLocalDB().then(storedData => {
                        this.createBloomFilter(storedData.bloomData)
                    })
               }
            })

        })
    }

    createBloomFilter (filterData) {
        this.bloom = new BloomFilter(filterData.totalEntries, filterData.errorRate)
        this.bloom.importData(filterData.bloomFilter)
    }

    getBloomDataXHR () {
        let url = `https://jason.duckduckgo.com/https-bloom.json`;

        return new Promise((resolve, reject) => {
            load.JSONfromExternalFile(url, resolve);
        });
    }

    getDataFromLocalDB() {
        return new Promise((resolve, reject) => {
            this.dbc.open().then(() => {
                this.dbc.table('httpsStorage').get(0).then((data) => {
                    resolve(data)
                }).catch((err) => console.log(err))
            })
        })
    }

    storeBloomInLocalDB(bloomData) {
        return new Promise((resolve, reject) => {
            let name = this.storageName
            this.dbc.version(1).stores({
                httpsStorage: '++id'
            });
            
            this.dbc.httpsStorage.put(
                { id: 0, bloomData: bloomData},
            ).then(() => {
                resolve()
            }).catch((err) => {
                console.log(`Error saving https data: ${err}`)
                reject()
            })
        });
    }
}
module.exports = new HTTPSStorage()
