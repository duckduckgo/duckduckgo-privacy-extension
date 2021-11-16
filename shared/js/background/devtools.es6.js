import browser from 'webextension-polyfill'
const tldts = require('tldts')

const tabManager = require('./tab-manager.es6')
const trackers = require('./trackers.es6')
const tdsStorage = require('./storage/tds.es6')
const { removeBroken } = require('./utils.es6')

const ports = new Map()

function init () {
    browser.runtime.onConnect.addListener(connected)
}

function connected (port) {
    let tabId = -1
    port.onMessage.addListener((m) => {
        if (m.action === 'setTab') {
            tabId = m.tabId
            ports.set(tabId, port)
            const tab = tabManager.get({ tabId })
            postMessage(tabId, 'tabChange', tab)
        } else if (m.action === 'I' || m.action === 'B') {
            const { requestData, siteUrl, tracker } = m
            const matchedTracker = trackers.getTrackerData(requestData.url, siteUrl, requestData)
            if (tracker.matchedRule) {
                // find the rule for this url
                const ruleIndex = matchedTracker.tracker.rules.findIndex((r) => r.rule?.toString() === tracker.matchedRule)
                const rule = matchedTracker.tracker.rules[ruleIndex]
                const parsedHost = tldts.parse(siteUrl)
                if (!rule.exceptions) {
                    rule.exceptions = {}
                }
                if (!rule.exceptions.domains) {
                    rule.exceptions.domains = []
                }
                if (m.action === 'B' && matchedTracker.action === 'redirect') {
                    matchedTracker.tracker.rules.splice(ruleIndex, 1)
                } else if (m.action === 'I') {
                    rule.exceptions.domains.push(parsedHost.domain)
                    if (!rule.exceptions.types?.includes(requestData.type)) {
                        rule.exceptions.types.push(requestData.type)
                    }
                } else {
                    let index = rule.exceptions.domains.indexOf(parsedHost.domain)
                    if (index === -1) {
                        index = rule.exceptions.domains.indexOf(parsedHost.hostname)
                    }
                    rule.exceptions.domains.splice(index, 1)
                }
                console.log('add exception for ', matchedTracker, rule)
            } else {
                matchedTracker.tracker.default = m.action === 'I' ? 'ignore' : 'block'
            }
        } else if (m.action === 'toggleProtection') {
            const { tabId } = m
            const tab = tabManager.get({ tabId })
            if (tab.site?.isBroken) {
                removeBroken(tab.site.domain)
                removeBroken(new URL(tab.url).hostname)
            } else {
                tabManager.setList({
                    list: 'allowlisted',
                    domain: tab.site.domain,
                    value: !tab.site.allowlisted
                })
            }
            postMessage(tabId, 'tabChange', tab)
        } else if (m.action === 'toggletrackerAllowlist') {
            if (tdsStorage.config.features.trackerAllowlist.state === 'enabled') {
                tdsStorage.config.features.trackerAllowlist.state = 'disabled'
            } else {
                tdsStorage.config.features.trackerAllowlist.state = 'enabled'
            }
        } else if (m.action.startsWith('toggle')) {
            const { tabId } = m
            const feature = m.action.slice(6)
            const tab = tabManager.get({ tabId })
            const enabled = tab.site?.enabledFeatures.includes(feature)
            const excludedSites = tdsStorage.config.features[feature].exceptions
            const tabDomain = tldts.getDomain(tab.site.domain)
            if (enabled) {
                excludedSites.push({
                    domain: tabDomain,
                    reason: 'Manually disabled'
                })
            } else {
                excludedSites.splice(excludedSites.findIndex(({ domain }) => domain === tabDomain), 1)
            }
        }
    })
    port.onDisconnect.addListener(() => {
        if (tabId !== -1) {
            ports.delete(tabId)
        }
    })
}

function postMessage (tabId, action, message) {
    if (ports.has(tabId)) {
        ports.get(tabId).postMessage(JSON.stringify({ tabId, action, message }))
    }
}

function isActive (tabId) {
    return ports.has(tabId)
}

module.exports = {
    init,
    postMessage,
    isActive
}
