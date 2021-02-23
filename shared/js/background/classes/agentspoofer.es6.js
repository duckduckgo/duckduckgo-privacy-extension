const agentStorage = require('./../storage/agents.es6')
const agentparser = require('useragent')
const utils = require('./../utils.es6')
const tldts = require('tldts')
const tabManager = require('../tab-manager.es6')

class AgentSpoofer {
    constructor () {
        this.realAgent = navigator.userAgent
        this.parsedAgent = agentparser.lookup(this.realAgent)
        this.spoofedAgent = this.realAgent
        this.selectAgent()
        this.needsRotation = true
    }

    getAgent () {
        if (this.needsRotation) {
            this.rotateAgent()
        }
        return this.spoofedAgent
    }

    /**
     * Select a new spoofed user agent to return.
     */
    rotateAgent () {
        const oldAgent = this.spoofedAgent
        this.spoofedAgent = this.selectAgent()
        console.log(`Rotated UserAgent. Old agent was: ${oldAgent}. New UserAgent: ${this.spoofedAgent}`)
    }

    /**
     * Select an agent based on the provided
     *      browser & OS faimly should be the same
     *      Browser major version should be +/- 3 versions
     *      OS major version should remain the same
    **/
    selectAgent () {
        const agentList = this.filterAgents(agentStorage.agents)
        if (agentList.length === 0) {
            return this.realAgent
        }

        let selectedAgent = null
        let maxRandValue = 0
        for (const agent of agentList) {
            maxRandValue += agent.frequency
        }
        let pick = Math.random() * maxRandValue

        for (const agent of agentList) {
            if (pick <= agent.frequency) {
                this.needsRotation = false
                selectedAgent = agent.agentString
                break
            }
            pick -= agent.frequency
        }
        return selectedAgent || this.realAgent
    }

    /**
     * Filter agents according to the filter list
     * and criteria such as keeping major / minor versions
     * relatively close.
     */
    filterAgents (agents) {
        const osMajorVariance = 0
        const osMinorVariance = 3
        const browserMajorVariance = 3
        const browserMinorVariance = 1000
        // Filter for version constraints
        agents = agents.filter(agent =>
            agent.osMajor >= Number(this.parsedAgent.os.major) - Number(osMajorVariance) &&
            agent.osMajor <= Number(this.parsedAgent.os.major) + Number(osMajorVariance) &&
            agent.osMinor >= Number(this.parsedAgent.os.minor) - Number(osMinorVariance) &&
            agent.osMinor <= Number(this.parsedAgent.os.minor) + Number(osMinorVariance) &&
            agent.versionMajor >= Number(this.parsedAgent.major) - Number(browserMajorVariance) &&
            agent.versionMajor <= Number(this.parsedAgent.major) + Number(browserMajorVariance) &&
            agent.versionMinor >= Number(this.parsedAgent.minor) - Number(browserMinorVariance) &&
            agent.versionMinor <= Number(this.parsedAgent.minor) + Number(browserMinorVariance))
        // Filter out any excluded agents
        if (agentStorage.excludedAgents.length > 0) {
            agents = agents.filter(agent => !agentStorage.excludedAgents.some(excludePattern => excludePattern.test(agent.agentString)))
        }
        // Don't include our current agent (so it should always rotate)
        agents = agents.filter(agent => agent.agentString !== this.spoofedAgent)
        return agents
    }

    /**
     * Return true if we should spoof UA for this request
     */
    shouldSpoof (request) {
        const tab = tabManager.get({ tabId: request.tabId })
        // Only change the user agent header if the current site is not whitelisted
        // and the request is third party.
        if (!!tab && tab.site.whitelisted) {
            return false
        }
        if (!!tab && utils.isFirstParty(tab.url, request.url)) {
            return false
        }
        const domain = tldts.parse(request.url).domain
        if (agentStorage.excludedDomains.length > 0 && agentStorage.excludedDomains.includes(domain)) {
            return false
        }
        return true
    }
}
module.exports = new AgentSpoofer()
