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
class ConfigStorage {
    constructor () {
        this.config = {}
    }

    /**
     * Retrieve the latest lists of excluded cookie domains. Store as needed.
     */
    updateConfigData () {
        console.log('Config: Getting config data')
        const extensionUrlData = constants.ExtensionConfig
        const source = extensionUrlData.source || 'external'
        const configName = extensionUrlData.name
        const etag = settings.getSetting(`${configName}-etag`) || ''
        load.loadExtensionFile({ url: extensionUrlData.url, etag: etag, returnType: extensionUrlData.format, source, timeout: 60000 })
            .then(response => {
                if (response && response.status === 200) {
                    // New cookie data to process.
                    const data = JSON.parse(response.response)
                    this.storeConfigData(configName, data)
                    this.processConfig(data)
                    const newEtag = response.getResponseHeader('etag') || ''
                    settings.updateSetting(`${configName}-etag`, newEtag)
                } else if (response && response.status === 304) {
                    this.loadConfig(configName, (results) => {
                        if (chrome.runtime.lastError || !results[configName]) {
                            console.log(`Error loading Exclusion settings from storage: ${chrome.runtime.lastError}`)
                            settings.updateSetting(`${configName}-etag`, '')
                        }
                        this.processConfig(results[configName])
                    })
                }
            })
            .catch(e => {
                // Reset the etag
                settings.updateSetting(`${configName}-etag`, '')
                console.log(`Error updating config data:  ${e}. Attempting to load from local storage.`)
                this.loadConfig(configName, (results) => {
                    if (chrome.runtime.lastError || !results[configName]) {
                        console.log(`Error loading config settings from storage: ${chrome.runtime.lastError}`)
                        settings.updateSetting(`${configName}-etag`, '')
                    }
                    this.processConfig(configName, results[configName])
                })
            })
    }

    processConfig (configData) {
        this.config = configData
    }

    loadConfig (configName, callback) {
        console.log(`looking for config ${configName}`)
        chrome.storage.local.get(configName, callback)
    }

    storeConfigData (configName, data) {
        chrome.storage.local.set({ [configName]: data }, () => {})
    }
}
module.exports = new ConfigStorage()
