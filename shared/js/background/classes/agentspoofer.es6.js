const agentStorage = require('./../storage/agents.es6')
const agentparser = require('useragent')
const trackers = require('../trackers.es6')
const tldts = require('tldts')
const tabManager = require('../tab-manager.es6')

class AgentSpoofer {
    constructor () {
        this.realAgent = navigator.userAgent
        this.parsedAgent = agentparser.lookup(this.realAgent)
        this.spoofedAgent = this.realAgent
        this.selectAgent()
        this.needsRotation = true
        this.tabs = {} //maintain cache of tab root URL's (chrome only)
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
        if (!this.needsRotation) {
            console.log(`Rotated UserAgent. Old agent was: ${oldAgent}. New UserAgent: ${this.spoofedAgent}`)
        }
    }

    /**
     * Select an agent based on the provided
     *      browser & OS faimly should be the same
     *      Browser major version should be +/- 3 versions
     *      OS major version should remain the same
    **/
    selectAgent () {
        let agentList = this.filterAgents(agentStorage.agents)
        if (agentList.length === 0) {
            return this.realAgent
        }

        let selectedAgent = null
        let maxRandValue = 0
        for (const agent of agentList) {
            maxRandValue += agent.frequency
        }
        const pick = Math.random() * maxRandValue
        let accum = 0
        for (const agent of agentList) {
            if (pick <= accum + agent.frequency) {
                this.needsRotation = false
                selectedAgent = agent.agentString
                break
            }
            accum += agent.frequency
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
            agent.osMajor >= this.parsedAgent.os.major - osMajorVariance &&
            agent.osMajor <= this.parsedAgent.os.major + osMajorVariance &&
            agent.osMinor >= this.parsedAgent.os.minor - osMinorVariance &&
            agent.osMinor <= this.parsedAgent.os.minor + osMinorVariance &&
            agent.versionMajor >= this.parsedAgent.major - browserMajorVariance &&
            agent.versionMajor <= this.parsedAgent.major + browserMajorVariance &&
            agent.versionMinor >= this.parsedAgent.minor - browserMinorVariance &&
            agent.versionMinor <= this.parsedAgent.minor + browserMinorVariance)

        // Filter out any excluded agents
        agents = agents.filter(agent => !agentStorage.excludedAgents.every(excludePattern => excludePattern.test(agent.agentString)))

        // Don't include our current agent (so it should always rotate)
        agents = agents.filter(agent => agent.agentString !== this.spoofedAgent)
        return agents
    }

    /**
     * Return true if we should spoof UA for this request
     */
    shouldSpoof (request) {
        let tab = tabManager.get({ tabId: request.tabId })
        // Only change the user agent header if the current site is not whitelisted
        // and the request is third party.
        if (!!tab && tab.site.whitelisted) {
            return false
        }
        if (this.isFirstParty(this.getRootURL(request), request.url)) {
            return false
        }
        const domain = tldts.parse(request.url).domain
        if (agentStorage.excludedDomains.every(excluded => domain === excluded)) {
            return false
        }
        return true
    }

    /**
     * Tests whether the two URL's belong to the same
     * first party set.
     */
    isFirstParty (url1, url2) {
        const first = tldts.parse(url1).domain
        const second = tldts.parse(url2).domain
        return first === second ||
            (trackers.entityList && trackers.entityList[first] && trackers.entityList[second] &&
                trackers.entityList[first] === trackers.entityList[second])
    }

    /**
     *  Find the originating URL of a given request - whatever top level page is being visited.
     *  @param headerRequest the header object passed before headers are sent.
     **/
    getRootURL (headerRequest) {
        // Firefox includes root detail in one of two places
        let rootURL = headerRequest.frameAncestors && headerRequest.frameAncestors.length > 0 ? headerRequest.frameAncestors[0].url : headerRequest.originUrl
        if (!rootURL) {
            // Didn't find anything, so let's try chrome.
            // chrome uses async requests to get frame / tab detail, which won't work well here, so we cache
            // the last seen root URL for a tab, and always return that when the requestor is a frame.
            if (headerRequest.parentFrameId === -1) {
                rootURL = headerRequest.initiator
                this.tabs[headerRequest.tabId] = rootURL
            } else {
                rootURL = this.tabs[headerRequest.tabId]
            }
        }
        return rootURL
    }
}
module.exports = new AgentSpoofer()
