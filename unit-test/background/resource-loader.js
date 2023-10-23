import ResourceLoader from '../../shared/js/background/components/resource-loader'

let mockSettingsReady
const mockSettingData = new Map()
const settingsMock = {
    ready: () => new Promise(resolve => {
        mockSettingsReady = resolve
    }),
    getSetting: (key) => {
        return mockSettingData.get(key)
    },
    updateSetting: (key, value) => {
        mockSettingData.set(key, value)
    }
}

describe('ResourceLoader', () => {
    describe('load order', () => {
        /** @type {ResourceLoader} */
        let loader
        /** @type {jasmine.Spy<Promise>} */
        let loadFromDbSpy
        /** @type {jasmine.Spy<Promise>} */
        let loadFromUrlSpy
        const mockData = 'test'
        const mockEtag = 'etag-data'

        beforeEach(() => {
            loader = new ResourceLoader({
                name: 'test',
                remoteUrl: 'https://example.com/test.json',
                localUrl: '/test.json'
            }, { settings: settingsMock })
            mockSettingData.clear()
            loadFromDbSpy = spyOn(loader, '_loadFromDB').and.rejectWith('mockDbReject')
            loadFromUrlSpy = spyOn(loader, '_loadFromURL').and.rejectWith('mockUrlReject')
        })

        afterEach(async () => {
            // cleanup any indexedDB data
            const dbc = await loader._getDb()
            await dbc.table('tdsStorage').clear()
        })

        it('Loads first from remote with no settings', async () => {
            loadFromUrlSpy.and.resolveTo({
                contents: mockData,
                etag: mockEtag
            })
            mockSettingsReady()
            await loader.ready
            expect(loadFromDbSpy.calls.count()).toEqual(0)
            expect(loadFromUrlSpy.calls.count()).toEqual(1)
            expect(loader.data).toEqual(mockData)
            expect(loader.etag).toEqual(mockEtag)
        })

        it('Loads from local when remote fails', async () => {
            // load fetch succeeds
            loadFromUrlSpy.withArgs('/test.json', true).and.resolveTo({
                contents: mockData,
                etag: mockEtag
            })
            mockSettingsReady()
            await loader.ready
            expect(loadFromDbSpy.calls.count()).toEqual(1)
            expect(loadFromUrlSpy.calls.count()).toEqual(2)
            expect(loader.data).toEqual(mockData)
            expect(loader.etag).toEqual(mockEtag)
        })

        it('Does not load when all load paths fail', async () => {
            mockSettingsReady()
            await loader.ready
            expect(loadFromDbSpy.calls.count()).toEqual(1)
            expect(loadFromUrlSpy.calls.count()).toEqual(2)
            expect(loader.data).toEqual(null)
            expect(loader.etag).toEqual('')
        })

        it('Loads from DB if remote fails', async () => {
            loadFromDbSpy.and.resolveTo({
                contents: mockData
            })
            settingsMock.updateSetting('test-etag', 'etag-from-settings')
            mockSettingsReady()
            await loader.ready
            expect(loadFromDbSpy.calls.count()).toEqual(1)
            expect(loadFromUrlSpy.calls.count()).toEqual(1)
            expect(loader.data).toEqual(mockData)
            expect(loader.etag).toEqual('etag-from-settings')
        })
    })
})
