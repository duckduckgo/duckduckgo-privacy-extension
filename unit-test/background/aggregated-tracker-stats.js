const z = require('zod')
const { NewTabTrackerStats } = require('../../shared/js/background/newtab-tracker-stats')
const { TrackerStats } = require('../../shared/js/background/classes/tracker-stats')
const browserWrapper = require('../../shared/js/background/wrapper.es6')
const constants = require('../../shared/data/constants')

const SEC = 1000
const MIN = SEC * 60

// This helps to validate that .toDisplayData() on instances of TrackerStats will produce
// a well-known set of data to be sent to tabs
const jsonSchema = z.object({
    totalCount: z.number(),
    totalPeriod: z.enum(['install-time']),
    trackerCompaniesPeriod: z.enum(['last-hour']),
    trackerCompanies: z.array(
        z.object({
            displayName: z.string(),
            count: z.number(),
            favicon: z.string()
        })
    )
})

describe('NewTabTrackerStats', () => {
    it('produces a filtered output for multiple companies', () => {
        const stats = new TrackerStats()
        const newtab = new NewTabTrackerStats(stats)

        const now = Date.now()

        newtab.record('Google', now)
        newtab.record('Google', now)
        newtab.record('Google', now)
        newtab.record('Facebook', now + MIN * 2)

        // produce the data as consumers would
        const output = newtab.toDisplayData(now)

        // this will throw (and cause the test to fail) if the
        // data has deviated from the schema defined here
        jsonSchema.parse(output)

        // just some manual checks on the values too
        expect(output.totalCount).toEqual(4)
        expect(output.trackerCompanies.length).toEqual(2)
    })
})

describe('sending data', () => {
    beforeEach(() => {
        jasmine.clock().install()
    })
    afterEach(() => {
        jasmine.clock().uninstall()
    })
    it('should debounce sending data after recording tracker events', () => {
        const stats = new TrackerStats()
        const newtab = new NewTabTrackerStats(stats)
        const sendSpy = spyOn(newtab, '_publish')
        const syncSpy = spyOn(browserWrapper, 'syncToStorage')

        const now = 1673473220560

        newtab.record('Google', now)
        newtab.record('Google', now)
        newtab.record('Google', now)
        newtab.record('Google', now)
        newtab.record('Google', now)
        newtab.record('Google', now)

        // 1000 ms for the 'record' debounce
        // 200 ms for the send debounce.
        // so, 5000 gives plenty of time to catch any unwanted called
        jasmine.clock().tick(5000)
        expect(sendSpy).toHaveBeenCalledTimes(1)

        // assert that values were synced to storage
        expect(syncSpy).toHaveBeenCalledTimes(1)
        expect(syncSpy).toHaveBeenCalledWith({
            [NewTabTrackerStats.storageKey]: {
                stats: {
                    entries: {
                        Google: [1673473220560, 1673473220560, 1673473220560, 1673473220560, 1673473220560, 1673473220560]
                    },
                    totalCount: 6
                }
            }
        })
    })
})

describe('incoming events', () => {
    let newtab, sendSpy
    beforeEach(() => {
        const stats = new TrackerStats()
        stats.deserialize({
            entries: {
                Google: [1673473220560, 1673473220560, 1673473220560, 1673473220560, 1673473220560, 1673473220560]
            },
            totalCount: 6
        })

        newtab = new NewTabTrackerStats(stats)
        sendSpy = spyOn(newtab, '_publish')
        jasmine.clock().install()
    })
    afterEach(() => {
        jasmine.clock().uninstall()
    })
    it('should respond to heartbeat', () => {
        // simulate a valid incoming event
        newtab.handleIncomingEvent({
            messageType: constants.trackerStats.events.incoming.newTabPage_heartbeat
        })

        // allow for the debouncing on send
        jasmine.clock().tick(201)
        expect(sendSpy).toHaveBeenCalledTimes(1)
    })
    it('should respond to readInitial', () => {
        // simulate a valid incoming event
        newtab.handleIncomingEvent({
            messageType: constants.trackerStats.events.incoming.newTabPage_readInitial
        })

        // allow for the debouncing on send
        jasmine.clock().tick(201)
        expect(sendSpy).toHaveBeenCalledTimes(1)
    })
})

describe('alarms', () => {
    let newtab, sendSpy
    const now = 1673473220560
    beforeEach(() => {
        const stats = new TrackerStats()
        stats.deserialize({
            entries: {
                Google: [now, now, now, now, now, now]
            },
            totalCount: 6
        })

        newtab = new NewTabTrackerStats(stats)
        sendSpy = spyOn(newtab, '_publish')
        jasmine.clock().install()
    })
    afterEach(() => {
        jasmine.clock().uninstall()
    })
    it('should evict expired entries', () => {
        const callTime = now + MIN * 61

        // simulate calling evictExpired at a time that would evict all entries (61 min in this case)
        newtab.handlePruneAlarm(callTime)

        // allow for the debouncing on send
        jasmine.clock().tick(201)
        expect(sendSpy).toHaveBeenCalledTimes(1)

        const display = newtab.toDisplayData(callTime)
        expect(display).toEqual({
            totalCount: 6,
            totalPeriod: 'install-time',
            trackerCompaniesPeriod: 'last-hour',
            trackerCompanies: []
        })
    })
})
