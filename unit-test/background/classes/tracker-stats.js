import { TrackerStats } from '../../../shared/js/background/classes/tracker-stats'

const SEC = 1000
const MIN = SEC * 60

describe('TrackerStats', () => {
    it('produces aggregated + sorted data', () => {
        const tc = new TrackerStats()
        const now = Date.now()
        tc.increment('Google', now)
        tc.increment('Google', now)
        tc.increment('Google', now)

        tc.increment('Facebook', now)
        tc.increment('Facebook', now)

        tc.increment('Company 3', now)
        tc.increment('Company 4', now)
        tc.increment('Company 5', now)
        tc.increment('Company 6', now)
        tc.increment('Company 7', now)
        tc.increment('Company 8', now)
        tc.increment('Company 9', now)
        tc.increment('Company 10', now)
        tc.increment('Company 11', now)
        tc.increment('Company 12', now)

        // viewing immediately, should produce all values
        const { results, overflow } = tc.sorted(10, now)
        expect(overflow).toEqual(2)
        expect(results).toEqual([
            {
                key: 'Google',
                count: 3
            },
            {
                key: 'Facebook',
                count: 2
            },
            {
                key: 'Company 3',
                count: 1
            },
            {
                key: 'Company 4',
                count: 1
            },
            {
                key: 'Company 5',
                count: 1
            },
            {
                key: 'Company 6',
                count: 1
            },
            {
                key: 'Company 7',
                count: 1
            },
            {
                key: 'Company 8',
                count: 1
            },
            {
                key: 'Company 9',
                count: 1
            },
            {
                key: 'Company 10',
                count: 1
            }
        ]
        )
    })
    it('combines `Other` entries ', () => {
        const tc = new TrackerStats()
        const now = Date.now()
        tc.increment('Google', now)
        tc.increment('Google', now)
        tc.increment('Google', now)

        tc.increment('Other', now)
        tc.increment('Other', now)

        tc.increment('Facebook', now)

        tc.increment('Company 4', now)
        tc.increment('Company 5', now)

        tc.increment('Company 6', now)
        tc.increment('Company 7', now)
        tc.increment('Company 8', now)
        tc.increment('Company 9', now)
        tc.increment('Company 10', now)

        // viewing immediately, should produce all values
        const { results, overflow } = tc.sorted(5, now)
        expect(overflow).toEqual(5)
        expect(results).toEqual([
            { key: 'Google', count: 3 },
            { key: 'Other', count: 2 },
            { key: 'Facebook', count: 1 },
            { key: 'Company 4', count: 1 },
            { key: 'Company 5', count: 1 }
        ])
    })
    it('prunes stale entries when producing a sorted view', () => {
        const trackerStats = new TrackerStats()
        const now = Date.now()

        // 8.00am, for example
        trackerStats.increment('Google', now)

        // 8.02am
        trackerStats.increment('Facebook', now + MIN * 2)
        trackerStats.increment('Facebook', now + MIN * 2)
        trackerStats.increment('Facebook', now + MIN * 2)

        // sorted time is 1 minute over `maxAgeMs`, eg: 9.01
        const { results, overflow } = trackerStats.sorted(10, now + MIN * 61)

        // so we expect there to only be the most recent entry
        expect(overflow).toEqual(0)
        expect(results).toEqual([{
            key: 'Facebook',
            count: 3
        }])
    })
    it('prunes stale entries manually', () => {
        const trackerStats = new TrackerStats()
        const now = 1673473220560

        // 8.00am, for example
        trackerStats.increment('Google', now)

        // 8.02am
        trackerStats.increment('Facebook', now)
        trackerStats.increment('Facebook', now + MIN * 2)
        trackerStats.increment('Facebook', now + MIN * 2)

        // evictExpired time is 1 minute over `maxAgeMs`, eg: 9.01
        trackerStats.evictExpired(now + MIN * 61)

        // we expect Google, and the first Facebook entry to be both be absent
        expect(Object.fromEntries(trackerStats.entries)).toEqual({
            Facebook: [1673473340560, 1673473340560]
        })

        // but the count should remain
        expect(trackerStats.totalCount).toEqual(4)
    })
    it('serializes into plain objects/arrays/numbers', () => {
        const trackerStats = new TrackerStats()
        const now = 1673473220560
        trackerStats.increment('Google', now)
        trackerStats.increment('Facebook', now)

        const serialized = trackerStats.serialize()
        expect(serialized).toEqual({
            totalCount: 2,
            entries: {
                Google: [1673473220560],
                Facebook: [1673473220560]
            }
        })
    })
    it('deserializes from valid data', () => {
        const trackerStats = new TrackerStats()
        const now = 1673473220560

        trackerStats.deserialize({
            totalCount: 2,
            entries: {
                Google: [now],
                Facebook: [now]
            }
        })

        // add a new entry
        trackerStats.increment('Google', now + MIN)

        // now verify we can produce data which is a combination
        // of both old + new
        const serialized = trackerStats.serialize()
        expect(serialized).toEqual({
            totalCount: 3,
            entries: {
                Google: [1673473220560, 1673473280560],
                Facebook: [1673473220560]
            }
        })
    })
    it('does not populate from invalid input data', () => {
        const trackerStats = new TrackerStats()
        const now = 1673473220560

        // this is incorrect, should be `totalCount`
        trackerStats.deserialize({
            total_count: 2,
            entries: {
                Google: [now],
                Facebook: [now]
            }
        })

        // now add a new entry
        trackerStats.increment('Google', now + MIN)

        // now we expect the original data to be absent, only the new entry should be present
        const serialized = trackerStats.serialize()
        expect(serialized).toEqual({
            totalCount: 1,
            entries: {
                Google: [1673473280560]
            }
        })
    })
})
