window.chrome = {
    runtime: {},
    declarativeNetRequest: {
        getDynamicRules: (callback1) => { callback1([{ condition: { urlFilter: '||example.com' } }]) }
    }
}

const { addToHTTPSafelist, clearDynamicRules } = require('../../shared/js/background/dynamic-rules.es6')

describe('Dynamic Rules - addToHTTPSafelist', () => {
    beforeEach((done) => {
        // clear dynamic rules kept in memory before each test
        window.chrome = {
            runtime: {},
            declarativeNetRequest: {
                getDynamicRules: (callback1) => { callback1([]) },
                updateDynamicRules: (add, remove, callback) => { callback() }
            }
        }

        clearDynamicRules().then(done)
    })

    it('should create an "allow" dynamic rule for given domain', (done) => {
        window.chrome = {
            runtime: {},
            declarativeNetRequest: {
                updateDynamicRules: (add, remove, callback) => { callback() }
            }
        }

        const spy = spyOn(window.chrome.declarativeNetRequest, 'updateDynamicRules').and.callThrough()

        addToHTTPSafelist('add.me')
            .then(() => {
                expect(spy.calls.count()).toBe(1)

                const rule = spy.calls.first().args[1][0]
                expect(rule.condition.urlFilter).toBe('||add.me')

                done()
            })
            .catch(fail)
    })

    it('should not try to crate duplicate rule if we try to add same domain twice', (done) => {
        window.chrome = {
            runtime: {},
            declarativeNetRequest: {
                updateDynamicRules: (add, remove, callback) => { callback() }
            }
        }

        const spy = spyOn(window.chrome.declarativeNetRequest, 'updateDynamicRules').and.callThrough()

        addToHTTPSafelist('add.me')
            .then(() => addToHTTPSafelist('add.me'))
            .then(() => {
                expect(spy.calls.count()).toBe(1)
                done()
            })
            .catch(fail)
    })
})

describe('Dynamic Rules - clearDynamicRules', () => {
    it('should remove all existing dynamic rules', (done) => {
        window.chrome = {
            runtime: {},
            declarativeNetRequest: {
                getDynamicRules: (callback1) => { callback1([{ id: 1 }, { id: 2 }, { id: 3 }]) },
                updateDynamicRules: (add, remove, callback) => { callback() }
            }
        }

        const spy = spyOn(window.chrome.declarativeNetRequest, 'updateDynamicRules').and.callThrough()

        clearDynamicRules()
            .then(() => {
                expect(spy.calls.count()).toBe(1)
                const idsOfRulesToRemove = spy.calls.first().args[0]
                const idsOfRulesToAdd = spy.calls.first().args[1]
                expect(idsOfRulesToRemove).toEqual([1, 2, 3])
                expect(idsOfRulesToAdd).toEqual([])
                done()
            })
            .catch(fail)
    })
})
