/**
 * Unit tests related to fingerprint protection functionality
 **/
const agentSpoofer = require('../../shared/js/background/classes/agentspoofer.es6')
const agentStorage = require('../../shared/js/background/storage/agents.es6')
const agentData = require('./../data/random_useragent.json')
const agentparser = require('useragent')
const Tab = require('../../shared/js/background/classes/tab.es6')
const chromewrapper = require('../../shared/js/background/chrome-wrapper.es6')

describe('User-Agent replacement', () => {
    let spy

    beforeAll(() => {
        // Make sure we get some good agent data
        agentSpoofer.realAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.61 Safari/537.36'
        agentSpoofer.parsedAgent = agentparser.lookup(agentSpoofer.realAgent)
        agentSpoofer.spoofedAgent = agentSpoofer.realAgent
        agentStorage.family = agentSpoofer.parsedAgent.family
        agentStorage.os = agentSpoofer.parsedAgent.os.family
        agentStorage.processAgentList(agentData)
        spy = spyOn(Tab, 'constructor')
    })

    describe('User-Agent', () => {
        let tab

        beforeAll(() => {
            tab = {
                id: 123,
                requestId: 123,
                url: 'http://example.com',
                status: 200,
                site: {
                    whitelisted: false
                }
            }
        })

        it('should rotate to a new agent', () => {
            const agent = agentSpoofer.getAgent()
            agentSpoofer.rotateAgent()
            expect(agent).not.toEqual(agentSpoofer.getAgent())
        })

        it('should send fake headers to third parties', () => {
            let request = {
                tabId: 123,
                url: 'http://thirdparty.com'
            }
            spy.and.returnValue(tab)
            expect(agentSpoofer.shouldSpoof(request)).toEqual(true)

        })

        it('should send real headers to first parties', () => {
            let request = {
                tabId: 123,
                url: 'http://example.com',
                originUrl: 'http://example.com'
            }
            spy.and.returnValue(tab)
            expect(agentSpoofer.shouldSpoof(request)).toEqual(false)
        })

        it('should consider the same domain first party', () => {
            let url1 = 'http://example.com'
            let url2 = 'http://example.com/some/path/to/an/asset.js?someparam=somevalue&another=another'
            expect(agentSpoofer.isFirstParty(url1,url2)).toEqual(true)
        })

        it('should consider subdomains to be first party', () => {
            let url1 = 'http://example.com'
            let url2 = 'http://subdomain.example.com'
            expect(agentSpoofer.isFirstParty(url1,url2)).toEqual(true)
        })

    })
})