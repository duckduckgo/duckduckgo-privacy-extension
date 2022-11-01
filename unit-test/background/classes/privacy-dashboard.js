const Tab = require('../../../shared/js/background/classes/tab.es6')
const { dashboardDataFromTab } = require('../../../shared/js/background/classes/privacy-dashboard-data')

fdescribe('Tab -> Privacy Dashboard conversion', () => {
    it('converts basic tab without trackers', async () => {
        const tab = new Tab({
            id: 123,
            requestId: 123,
            url: 'https://example.com',
            status: 200
        })
        tab.site.enabledFeatures = ['contentBlocking']
        const data = dashboardDataFromTab(tab, undefined)
        expect(data).toEqual({
            tab: {
                id: 123,
                url: 'https://example.com',
                parentEntity: undefined,
                specialDomainName: undefined,
                protections: {
                    allowlisted: false,
                    denylisted: false,
                    unprotectedTemporary: false,
                    enabledFeatures: ['contentBlocking']
                },
                upgradedHttps: false
            },
            requestData: {
                requests: [],
                installedSurrogates: undefined
            },
            emailProtectionUserData: undefined
        })
    })
    it('converts tab with a tracker', async () => {
        const tab = new Tab({
            id: 123,
            requestId: 123,
            url: 'https://example.com',
            status: 200
        })
        tab.site.enabledFeatures = ['contentBlocking']
        const trackerName = 'Ad Company'
        const trackerObj = {
            owner: {
                name: trackerName,
                displayName: trackerName
            }
        }
        tab.addToTrackers({
            action: 'block',
            reason: 'matched rule - block',
            sameEntity: false,
            sameBaseDomain: false,
            redirectUrl: false,
            matchedRule: 'block',
            matchedRuleException: false,
            tracker: trackerObj,
            fullTrackerDomain: 'subdomain.abc.com'
        })
        const data = dashboardDataFromTab(tab, undefined)
        expect(data.tab).toEqual({
            id: 123,
            url: 'https://example.com',
            parentEntity: undefined,
            specialDomainName: undefined,
            protections: {
                allowlisted: false,
                denylisted: false,
                unprotectedTemporary: false,
                enabledFeatures: ['contentBlocking']
            },
            upgradedHttps: false
        })
        /**
         * Not asserting on everything in the request data for 2 reasons:
         *
         * 1) There was a race-condition related to the company being added
         * 2) All the transferred data is validated in the integration test via runtime-schema validations
         */
        expect(data.requestData.requests.length).toEqual(1)
    })
    it('converts same domain entries, with different actions', async () => {
        const tab = new Tab({
            id: 123,
            requestId: 123,
            url: 'https://example.com',
            status: 200
        })
        tab.site.enabledFeatures = ['contentBlocking']
        const trackerName = 'Ad Company'
        const trackerObj = {
            owner: {
                name: trackerName,
                displayName: trackerName
            }
        }
        tab.addToTrackers({
            action: 'block',
            reason: 'matched rule - block',
            sameEntity: false,
            sameBaseDomain: false,
            redirectUrl: false,
            matchedRule: 'block',
            matchedRuleException: false,
            tracker: trackerObj,
            fullTrackerDomain: 'subdomain.abc.com'
        })
        tab.addToTrackers({
            action: 'none',
            reason: 'not sure',
            sameEntity: false,
            sameBaseDomain: false,
            redirectUrl: false,
            matchedRule: 'block',
            matchedRuleException: false,
            tracker: trackerObj,
            fullTrackerDomain: 'subdomain.abc.com'
        })
        const data = dashboardDataFromTab(tab, undefined)
        expect(data.tab).toEqual({
            id: 123,
            url: 'https://example.com',
            parentEntity: undefined,
            specialDomainName: undefined,
            protections: {
                allowlisted: false,
                denylisted: false,
                unprotectedTemporary: false,
                enabledFeatures: ['contentBlocking']
            },
            upgradedHttps: false
        })
        /**
         * There should be 2 entries now, even though the domains match, one was "block"
         * and one was "none"
         */
        expect(data.requestData.requests.length).toEqual(2)
    })
})
