const Tab = require('../../../shared/js/background/classes/tab.es6')
const browserWrapper = require('../../../shared/js/background/wrapper.es6')

let tab

describe('Tab', () => {
    describe('updateSite()', () => {
        beforeEach(() => {
            spyOn(browserWrapper, 'getExtensionId').and.returnValue('sdf')

            tab = new Tab({
                id: 123,
                requestId: 123,
                url: 'http://example.com',
                status: 200
            })
        })
        it('should update the site object if the URL is different', () => {
            const originalSite = tab.site

            tab.updateSite('https://example.com')

            expect(tab.site.url).toEqual('https://example.com')
            expect(originalSite).not.toBe(tab.site)
        })
        it('should not update the site object if the URL is different', () => {
            const originalSite = tab.site

            tab.updateSite('http://example.com')

            expect(tab.site.url).toEqual('http://example.com')
            expect(originalSite).toBe(tab.site)
        })
    })
})
