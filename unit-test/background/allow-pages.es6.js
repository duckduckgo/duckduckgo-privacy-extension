const {addDomainToSafelist, removeDomainFromSafelist, syncSafelistEntries} = require('../../shared/js/background/allow-pages.es6')
const settingHelper = require('../helpers/settings.es6')
const settings = require('../../shared/js/background/settings.es6')
const tdsStorage = require('../../shared/js/background/storage/tds.es6')

describe('Allow Pages - addAllowedPages', () => {
    it('should create a allow page rule for domain', (done) => {
        window.chrome = {
            runtime: {},
            declarativeNetRequest: {
                addAllowedPages: (domain, callback) => { callback() }
            }
        }

        const spy = spyOn(chrome.declarativeNetRequest, 'addAllowedPages').and.callThrough()

        addDomainToSafelist('example.com')
            .then(() => {
                expect(spy.calls.count()).toBe(1)
                expect(spy.calls.first().args[0][0]).toBe('*://*.example.com/*')
                done()
            })
            .catch(fail)
    })

    it('should reject if allow rule for domain can\'t be created', (done) => {
        window.chrome = {
            runtime: {lastError: {message: 'Internal Error.'}},
            declarativeNetRequest: {
                addAllowedPages: (domain, callback) => { callback() }
            }
        }

        const spy = spyOn(chrome.declarativeNetRequest, 'addAllowedPages').and.callThrough()

        addDomainToSafelist('example.com')
            .then(() => {
                fail('Promise expected to reject.')
            })
            .catch(() => {
                expect(spy.calls.count()).toBe(1)
                done()
            })
    })
})

describe('Allow pages - removeAllowedPages', () => {
    it('removing domain to safelist should work', (done) => {
        window.chrome = {
            runtime: {},
            declarativeNetRequest: {
                removeAllowedPages: (domain, callback) => { callback() }
            }
        }

        const spy = spyOn(chrome.declarativeNetRequest, 'removeAllowedPages').and.callThrough()

        removeDomainFromSafelist('example.com')
            .then(() => {
                expect(spy.calls.count()).toBe(1)
                expect(spy.calls.first().args[0][0]).toBe('*://*.example.com/*')
                done()
            })
            .catch(fail)
    })

    it('removing domain to safelist should reject if there was an error', (done) => {
        window.chrome = {
            runtime: {lastError: {message: 'Internal Error.'}},
            declarativeNetRequest: {
                removeAllowedPages: (domain, callback) => { callback() }
            }
        }

        const spy = spyOn(chrome.declarativeNetRequest, 'removeAllowedPages').and.callThrough()

        removeDomainFromSafelist('example.com')
            .then(() => {
                fail('Promise expected to reject.')
            })
            .catch(() => {
                expect(spy.calls.count()).toBe(1)
                done()
            })
    })
})

describe('Allow pages - syncSafelistEntries', () => {
    it('should create rules for all missing domains and remove rules that don\'t have matching safelist entries', (done) => {
        settingHelper.stub({ hasSeenPostInstall: false })

        // manualy safelisted pages
        settings.updateSetting('whitelisted', {
            'add.me1': true,
            'add.me2': true
        })

        // broken pages
        tdsStorage.brokenSiteList = ['broken.me1', 'broken.me2']

        window.chrome = {
            runtime: {},
            declarativeNetRequest: {
                MAX_NUMBER_OF_ALLOWED_PAGES: 100,
                addAllowedPages: (domain, callback) => { callback() },
                removeAllowedPages: (domain, callback) => { callback() },
                getAllowedPages: (callback) => { callback(['*://*.remove.me/*']) }
            }
        }

        const removeSpy = spyOn(chrome.declarativeNetRequest, 'removeAllowedPages').and.callThrough()
        const addSpy = spyOn(chrome.declarativeNetRequest, 'addAllowedPages').and.callThrough()

        syncSafelistEntries()
            .then(() => {
                expect(addSpy.calls.count()).toBe(4)
                expect(addSpy.calls.all()[0].args[0][0]).toBe('*://*.add.me1/*')
                expect(addSpy.calls.all()[1].args[0][0]).toBe('*://*.add.me2/*')
                expect(addSpy.calls.all()[2].args[0][0]).toBe('*://*.broken.me1/*')
                expect(addSpy.calls.all()[3].args[0][0]).toBe('*://*.broken.me2/*')
                expect(removeSpy.calls.count()).toBe(1)
                expect(removeSpy.calls.first().args[0][0]).toBe('*://*.remove.me/*')
                done()
            })
    })

    it('should not try to create more rules than allowed by the limit', (done) => {
        settingHelper.stub({ hasSeenPostInstall: false })
        settings.updateSetting('whitelisted', {
            'add.me1': true,
            'add.me2': true,
            'add.me3': true,
            'add.me4': true,
            'add.me5': true
        })

        tdsStorage.brokenSiteList = ['broken.me1', 'broken.me2']

        window.chrome = {
            runtime: {},
            declarativeNetRequest: {
                MAX_NUMBER_OF_ALLOWED_PAGES: 6,
                addAllowedPages: (domain, callback) => { callback() },
                removeAllowedPages: (domain, callback) => { callback() },
                getAllowedPages: (callback) => { callback([]) }
            }
        }

        const removeSpy = spyOn(chrome.declarativeNetRequest, 'removeAllowedPages').and.callThrough()
        const addSpy = spyOn(chrome.declarativeNetRequest, 'addAllowedPages').and.callThrough()

        syncSafelistEntries()
            .then(() => {
                expect(addSpy.calls.count()).toBe(6)
                expect(addSpy.calls.all()[0].args[0][0]).toBe('*://*.add.me1/*')
                expect(addSpy.calls.all()[5].args[0][0]).toBe('*://*.broken.me1/*')
                expect(removeSpy.calls.count()).toBe(0)
                done()
            })
    })
})