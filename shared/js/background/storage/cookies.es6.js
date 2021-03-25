// Babel includes for async/await
import 'regenerator-runtime/runtime'

const load = require('./../load.es6')
const constants = require('../../../data/constants')
const settings = require('./../settings.es6')

/**
 *  Manage local cookie exclusion data.
 *  Data is updated regularly with the latest
 *  cookie exclusions, and stored here for fast retrieval and usage
 *  when checking which cookies to block.
 **/
class ExcludedCookieStorage {
    constructor () {
        this.excludedDomains = []
        this.firstPartyCookiePolicy = {
            threshold: 864000, // 10 days
            maxAge: 864000 // 10 days
        }
    }

    /**
     * Retrieve the latest lists of excluded cookie domains. Store as needed.
     */
    updateCookieData () {
        console.log('Cookies: Getting cookie data')
        const lists = constants.CookieLists
        for (const list of lists) {
            const source = list.source || 'external'
            const listName = list.name
            const etag = settings.getSetting(`${listName}-etag`) || ''
            load.loadExtensionFile({ url: list.url, etag: etag, returnType: list.format, source, timeout: 60000 })
                .then(response => {
                    if (response && response.status === 200) {
                        // New cookie data to process.
                        const data = JSON.parse(response.response)
                        this.storeExclusionList(listName, data)
                        this.processList(listName, data)
                        const newEtag = response.getResponseHeader('etag') || ''
                        settings.updateSetting(`${listName}-etag`, newEtag)
                    } else if (response && response.status === 304) {
                        this.loadExclusionList(listName, (results) => {
                            if (chrome.runtime.lastError) {
                                console.log(`Error loading Exclusion settings from storage: ${chrome.runtime.lastError}`)
                                settings.updateSetting(`${listName}-etag`, '')
                            }
                            this.processList(listName, results[listName])
                        })
                    }
                })
                .catch(e => {
                    // Reset the etag
                    settings.updateSetting(`${listName}-etag`, '')
                    console.log(`Error updating cookie data:  ${e}. Attempting to load from local storage.`)
                    this.loadExclusionList(listName, (results) => {
                        if (chrome.runtime.lastError) {
                            console.log(`Error loading Exclusion settings from storage: ${chrome.runtime.lastError}`)
                            settings.updateSetting(`${listName}-etag`, '')
                        }
                        this.processList(listName, results[listName])
                    })
                })
        }
    }

    processList (listName, listData) {
        switch (listName) {
        case 'cookieExcludeList':
            this.processExcludeList(listData)
            break
        }
    }

    async processExcludeList (data) {
        this.excludedDomains = []
        for (const record of data.excludedDomains) {
            this.excludedDomains.push(record.domain)
        }
        if (data.firstPartyTrackerCookiePolicy) {
            this.firstPartyCookiePolicy = data.firstPartyTrackerCookiePolicy
        }
    }

    loadExclusionList (listName, callback) {
        console.log(`looking for listname ${listName}`)
        chrome.storage.local.get(listName, callback)
    }

    async storeExclusionList (listname, data) {
        chrome.storage.local.set({ [listname]: data }, () => {})
    }

    isExcluded (url) {
        const domain = (new URL(url)).host
        return this.isDomainExcluded(domain)
    }

    isDomainExcluded (domain) {
        if (this.excludedDomains.find(elem => elem === domain)) {
            return true
        }

        const comps = domain.split('.')
        if (comps.length > 2) {
            comps.shift()
            return this.isDomainExcluded(comps.join('.'))
        }

        return false
    }
}
module.exports = new ExcludedCookieStorage()
