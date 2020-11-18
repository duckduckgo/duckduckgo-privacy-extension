// Babel includes for async/await
import 'regenerator-runtime/runtime'

const load = require('./../load.es6')
const Dexie = require('dexie')
const constants = require('../../../data/constants')
const settings = require('./../settings.es6')
const agentparser = require('useragent')

/**
 *  Manage local userAgent data.
 *  Data is updated regularly with the latest
 *  userAgent statistics, and stored here for fast retrieval and usage
 *  when spoofing a user agent.
 **/
class AgentStorage {
    constructor () {
        this.agentDB = new Dexie('agentStorage')
        this.agentDB.version(1).stores({
            agentStorage: 'listName,listData'
        })
        this.agents = []
        this.excludedDomains = []
        this.excludedAgents = []
        // Information about which agents to keep in our data set.
        const realAgent = agentparser.lookup(navigator.userAgent)
        this.family = realAgent.family
        this.os = realAgent.os.family
    }

    /**
     * Retrieve the latest lists of userAgent and breakage data. Store as needed.
     */
    updateAgentData () {
        console.log(`UserAgents: Getting user agent data`)
        const lists = constants.UserAgentLists
        for (const list of lists) {
            const source = list.source || 'external'
            const listName = list.name
            const etag = settings.getSetting(`${listName}-etag`) || ''
            load.loadExtensionFile({url: list.url, etag: etag, returnType: list.format, source, timeout: 60000})
                .then(response => {
                    if (response && response.status === 200) {
                        // New agent data to process.
                        const data = JSON.parse(response.response)
                        this.storeAgentList(listName, data)
                        this.processList(listName, data)
                        const newEtag = response.getResponseHeader('etag') || ''
                        settings.updateSetting(`${listName}-etag`, newEtag)
                    } else if (response && response.status === 304) {
                        console.log(`${list.url} returned 304, resource not changed`)
                        if (this.agents.length === 0) {
                            this.loadAgentList(listName)
                                .then(queryData => {
                                    this.processList(listName, queryData.listData)
                                })
                                .catch(e => {
                                    console.log(`Error loading UserAgent settings from storage: ${e}`)
                                    settings.updateSetting(`${listName}-etag`, '')
                                })
                        }
                    }
                })
                .catch(e => {
                    // Reset the etag
                    settings.updateSetting(`${listName}-etag`, '')
                    console.log(`Error updating agent data:  ${e}. Attempting to load from local storage.`)
                    this.loadAgentList(listName)
                        .then(queryData => {
                            this.processList(listName, queryData.listData)
                        })
                        .catch(e => {
                            console.log(`Error loading UserAgent settings from storage: ${e}`)
                        })
                })
        }
    }

    processList (listName, listData) {
        switch (listName) {
        case 'agents':
            this.processAgentList(listData)
            break
        case 'excludeList':
            this.processExcludeList(listData)
            break
        }
    }

    /**
     * In the highly unlikely event an agent is injected into data with malicious
     * characters, flag it here.
     **/
    isPotentiallyMaliciousAgent (agent) {
        if (agent.search(`'`) !== -1 || agent.search(`"`) !== -1) {
            return true
        }
        return false
    }

    processAgentList (data) {
        // delete any stale agent entries
        console.log('Processing agents')
        this.agents = []
        for (const agentCategory of Object.keys(data)) {
            for (const ua of data[agentCategory]) {
                if (this.isPotentiallyMaliciousAgent(ua.agent)) {
                    continue
                }
                const parsedUA = agentparser.lookup(ua.agent)
                if (parsedUA.family === this.family &&
                    parsedUA.os.family === this.os) {
                    let frequency = ua.percentage
                    if (typeof frequency === 'string') {
                        frequency = Number(frequency.replace('%', ''))
                    }
                    this.agents.push({
                        browser: parsedUA.family,
                        platform: parsedUA.os.family,
                        frequency: frequency,
                        agentString: ua.agent,
                        osMajor: parsedUA.os.major,
                        osMinor: parsedUA.os.minor,
                        versionMajor: parsedUA.major,
                        versionMinor: parsedUA.minor
                    })
                }
            }
        }
    }

    async processExcludeList (data) {
        for (const record of data.excludedDomains) {
            this.excludedDomains.push(record.domain)
        }
        for (const record of data.excludeAgentPatterns) {
            this.excludedAgents.push(new RegExp(record.agent))
        }
    }

    /**
     * Load an agent list from local storage
     */
    loadAgentList (listName) {
        console.log(`looking for listname ${listName}`)
        return this.agentDB.open()
            .then(() => this.agentDB.table('agentStorage').get({listName: listName}))
    }

    async storeAgentList (listname, data) {
        try {
            await this.agentDB.agentStorage.put({listName: listname, listData: data})
        } catch (e) {
            console.log(`Error storing agent data locally: ${e}`)
        }
    }
}
module.exports = new AgentStorage()
