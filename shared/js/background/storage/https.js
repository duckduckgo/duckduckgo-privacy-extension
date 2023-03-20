import Dexie from 'dexie'
const load = require('./../load')
const constants = require('../../../data/constants')
const settings = require('./../settings')

class HTTPSStorage {
    constructor () {
        // @ts-ignore - TypeScript is not following the Dexie import property.
        this.dbc = new Dexie(constants.httpsDBName)
        this.dbc.version(1).stores({
            httpsStorage: 'name,type,data,checksum'
        })

        // Update the lists every 12 hours.
        this.updatePeriodInMinutes = 12 * 60
    }

    // Load https data defined in constants.httpsLists.
    // We wait until all promises resolve to send data to https.
    // This is all or nothing. We gather data for each of the lists
    // and validate. If any list fails validation then promise.all will
    // reject the whole update.
    getLists (preferLocal = false) {
        return Promise.all(constants.httpsLists.map(async list => {
            const listCopy = JSON.parse(JSON.stringify(list))
            const etag = settings.getSetting(`${listCopy.name}-etag`) || ''

            if (preferLocal) {
                const lastUpdate = settings.getSetting(`${listCopy.name}-lastUpdate`) || 0
                const millisecondsSinceUpdate = Date.now() - lastUpdate
                if (millisecondsSinceUpdate < this.updatePeriodInMinutes * 60 * 1000) {
                    const result = await this.getListFromLocalDB(listCopy)
                    if (result) {
                        return result
                    }
                }
            }

            return this.getDataXHR(listCopy.url, etag).then(response => {
                // Set the lastUpdate time.
                // Notes:
                //  - Take the earliest time between server and local, that way if
                //    the local time is set far in the future updates will still
                //    happen.
                //  - Date.parse() returns NaN for invalid (or missing) Date
                //    headers, and Math.min() always considers NaN to be the
                //    smallest value. So before calling Math.min(), replace
                //    serverTime with localTime if serverTime is falsey (NaN).
                const localTime = Date.now()
                const serverTime = Date.parse(response.date)
                const updateTime = Math.min(localTime, serverTime || localTime)
                settings.updateSetting(`${listCopy.name}-lastUpdate`, updateTime)

                // for 200 response we update etags
                if (response && response.status === 200) {
                    const newEtag = response.etag || ''
                    settings.updateSetting(`${listCopy.name}-etag`, newEtag)
                }

                // We try to process both 200 and 304 responses. 200s will validate
                // and update the db. 304s will try to grab the previous data from db
                // or throw an error if none exists.
                return this.processData(listCopy, response.data).then(resultData => {
                    if (resultData) {
                        return resultData
                    } else {
                        throw new Error(`HTTPS: process list xhr failed  ${listCopy.name}`)
                    }
                })
            }).catch(async e => {
                const result = await this.getListFromLocalDB(listCopy)
                if (result) {
                    return result
                }

                // Reset etag and lastUpdate time to force us to get
                // fresh server data in case of an error.
                settings.updateSetting(`${listCopy.name}-etag`, '')
                settings.updateSetting(`${listCopy.name}-lastUpdate`, '')
                throw new Error(`HTTPS: data update for ${listCopy.name} failed`)
            })
        }))
    }

    // validate xhr data and lookup previous data from local db if needed
    // verify the checksum before returning the processData result
    processData (listDetails, xhrData) {
        if (xhrData) {
            return this.hasCorrectChecksum(xhrData).then((isValid) => {
                if (isValid) {
                    this.storeInLocalDB(listDetails.name, listDetails.type, xhrData)
                    return Object.assign(listDetails, xhrData)
                }
            })
        } else {
            return Promise.resolve()
        }
    }

    getDataXHR (url, etag) {
        return load.loadExtensionFile({ url, etag, returnType: 'json', source: 'external', timeout: 60000 })
    }

    async getListFromLocalDB (listDetails) {
        console.log('HTTPS: getting from db', listDetails.name)
        try {
            await this.dbc.open()
            const list = await this.dbc.table('httpsStorage').get({ name: listDetails.name })

            if (list && list.data && await this.hasCorrectChecksum(list.data)) {
                return Object.assign(listDetails, list.data)
            }
        } catch (e) {
            console.warn(`getListFromLocalDB failed for ${listDetails.name}`, e)
            return null
        }
    }

    storeInLocalDB (name, type, data) {
        return this.dbc.table('httpsStorage').put({ name, type, data }).catch(e => {
            console.warn(`storeInLocalDB failed for ${name}: resetting stored etag`, e)
            settings.updateSetting(`${name}-etag`, '')
            settings.updateSetting(`${name}-lastUpdate`, '')
        })
    }

    hasCorrectChecksum (data) {
        // not everything has a checksum
        if (!data.checksum) return Promise.resolve(true)

        // TODO: rewrite this check without needing a Buffer polyfill
        if (typeof Buffer === 'undefined') {
            return Promise.resolve(true)
        }

        // need a buffer to send to crypto.subtle
        const buffer = Buffer.from(data.data, 'base64')

        return crypto.subtle.digest('SHA-256', buffer).then(arrayBuffer => {
            const sha256 = Buffer.from(arrayBuffer).toString('base64')
            if (data.checksum.sha256 && data.checksum.sha256 === sha256) {
                return true
            } else {
                return false
            }
        })
    }
}
export default new HTTPSStorage()
