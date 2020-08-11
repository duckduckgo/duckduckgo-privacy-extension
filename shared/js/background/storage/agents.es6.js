// Babel includes for async/await
import 'regenerator-runtime/runtime'

const load = require('./../load.es6')
const Dexie = require('dexie')
const constants = require('../../../data/constants')
const settings = require('./../settings.es6')

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
            userAgents: '++id, browser, platform', //frequency, agentString',
            brokenSites: 'list'
        })
    }

    /**
     * Return UserAgent data for the given platform & browser.
     * If no local data can be found, this will attempt to update from the
     * remote source
     *  format:
     *  {
     *      exclude: [...],
     *      agents: [
     *          {
     *              agent: 'xxx'
     *              probability: dd.dd
     *          },
     *          ...
     *      ]
     *  }
     */
    async getAgentData (browser, platform) {
        if (this.agentDB.userAgents.count() === 0) {
            this.updateAgentData()
        }
        const agents = await this.agentDB.userAgents.where({
            browser: browser,
            platform: platform
        })
        console.log(agents)   
    }

    getExcludeList () {
        const excludeList = this.agentDB.brokenSites.get()
    }

    /**
     * Retrieve the latest lists of userAgent and breakage data. Store as needed.
     */
    updateAgentData () {
        console.log("Agents: Getting user agent data")
        const lists = constants.UserAgentLists
        for (const list of lists) {
            const source = list.source || 'external'
            const listName = list.name
            const etag = settings.getSetting(`${listName}-etag`) || ''
            load.loadExtensionFile({url: list.url, etag: etag, returnType: list.format, source, timeout: 60000})
                .then(response => {
                    if (response && response.status === 200) {
                        // New agent data to process.
                        switch (listName) {
                        case 'agents':
                            const data = JSON.parse(response.response)
                            this.processAgentList(data)
                            break
                        case 'excludeList':
                            this.processExcludeList(response)
                            break
                        }
                    }
                })
                .catch(e => {
                    // Reset the etag
                    settings.updateSetting(`${listName}-etag`, '')
                    console.log(`Error updating agent data:  ${e}. Probably because this data is not currently needed`)
                    if (listName === 'agents') {
                        throw new Error(`User Agents lsit ${listName}: data update failed`)
                    }
                })
        }
    }

    async processAgentList (data) {
        // delete any stale agent entries
        await this.agentDB.userAgents.clear()
        let k = 1
        for (const agentCategory of Object.keys(data)) {
            const [platform, browser] = agentCategory.split('-')

            console.log(data[agentCategory])
            console.log(agentCategory)
            for (const ua of data[agentCategory]) {
                await this.agentDB.userAgents.add({
                    browser: browser,
                    platform: platform,
                    frequency: ua.percentage,
                    agentString: ua.agent
                })
                k++
            }
        }
    }

    async processExcludeList (data) {
        // Remove any existing broken site list
        console.log("Agents: Processing exclude list")
        await this.agentDB.brokenSites.clear()
        const list = data.split('\n')
        await this.agentDB.brokenSites.put({list: list})
    }
}
module.exports = new AgentStorage()
