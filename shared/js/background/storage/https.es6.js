const load = require('./../load.es6.js')
const Dexie = require('dexie')
const constants = require('../../../data/constants')

class HTTPSStorage {
    constructor () {
        this.dbc = new Dexie('https')
        this.dbc.version(1).stores({
            httpsStorage: 'name,type,data'
        })    
    }

    // gets list data, returns array of promises. use promise.all().then()
    getLists () {
        let promiseList = []
        
        constants.httpsLists.forEach((list) => {
            promiseList.push(new Promise((resolve, reject) => {
                this.getDataXHR(list.url).then(data => {
                    if (data) {
                        // if we have new data store it in local DB for later
                        this.storeInLocalDB(list.name, list.type, data)
                        list.data = data
                        resolve(list)
                    } else {
                        // No new data, look up old data from DB
                        this.getDataFromLocalDB(list.name).then(storedData => {
                            list.data = storedData.data
                            resolve(list)
                        })
                    }
                })
            }))
        })

        return promiseList
    }

    getDataXHR (url) {
        return new Promise((resolve, reject) => {
            load.JSONfromExternalFile(url, resolve);
        });
    }

    getDataFromLocalDB(name) {
        return new Promise((resolve, reject) => {
            this.dbc.open().then(() => {
                this.dbc.table('httpsStorage').get({name: name}).then((data) => {
                    resolve(data)
                }).catch((err) => console.log(err))
            })
        })
    }

    storeInLocalDB(name, type, data) {
        return new Promise((resolve, reject) => {
            this.dbc.httpsStorage.put(
                {name: name, type: type, data: data},
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
