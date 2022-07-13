require('../helpers/mock-browser-api')

const {
    dropTracking3pCookiesFromResponse,
    dropTracking3pCookiesFromRequest
} = require('../../shared/js/background/events/3p-tracking-cookie-blocking')
const tabManager = require('../../shared/js/background/tab-manager.es6')

// Note: Enabling tracker blocking for requests initiated by ServiceWorkers
//       ('tabs' with tabId of -1) caused a lot of breakage due to third party
//       cookie blocking. For now, cookies created by ServiceWorkers are ignored
//       therefore and this unit test ensures that workaround is implemented
//       correctly. In the future, it would be desirable to remove the
//       workaround and these tests entirely, if that's possible without causing
//       website breakage.

describe('3p cookie ServiceWorker workaround', () => {
    let tabManagerGetObserver

    beforeAll(() => {
        tabManagerGetObserver = spyOn(tabManager, 'get').and.callFake(() => { })
    })

    beforeEach(() => {
        tabManagerGetObserver.calls.reset()
    })

    it('Should attempt to proceed for requests initiated by tabs', () => {
        let expectedCallCount = 0
        expect(tabManagerGetObserver.calls.count()).toEqual(expectedCallCount)

        for (let tabId = 1; tabId <= 10; tabId++) {
            dropTracking3pCookiesFromResponse({ tabId })
            expect(tabManagerGetObserver.calls.count()).toEqual(++expectedCallCount)
            dropTracking3pCookiesFromRequest({ tabId })
            expect(tabManagerGetObserver.calls.count()).toEqual(++expectedCallCount)
        }
    })

    it('Should ignore requests initiated by ServiceWorkers', () => {
        const expectedCallCount = 0
        expect(tabManagerGetObserver.calls.count()).toEqual(expectedCallCount)

        const tabId = -1
        dropTracking3pCookiesFromResponse({ tabId })
        dropTracking3pCookiesFromRequest({ tabId })
        expect(tabManagerGetObserver.calls.count()).toEqual(expectedCallCount)
    })
})
