import { TrackerStats } from '../../../shared/js/background/classes/tracker-stats.js'

const SEC = 1000
const MIN = SEC * 60
const HOUR = MIN * 60
const DAY = HOUR * 24

describe('TrackerStats alternative storage implementation', () => {
    it('doesnt pack within time window', () => {
        const ts = new TrackerStats()
        const now = Date.now()

        ts.increment('a', now)
        ts.increment('a', now)
        ts.increment('a', now)

        // pack after 5 min
        ts.pack(now + (MIN * 5))

        expect(ts.current.entries.get('a')).toEqual(3)
        expect(ts.current.entries.size)
            .withContext('current entries should be size:1 because we packed after 5 min')
            .toEqual(1)
        expect(ts.packs.length === 0)
    })
    it('packs when outside time window', () => {
        const ts = new TrackerStats()
        const now = Date.now()

        // eg : 8:00
        ts.increment('a', now)

        // eg : 9:05
        ts.pack(now + HOUR + (MIN * 5))

        expect(ts.current.entries.size)
            .withContext('current should be empty now because we packed after 1hr 5m')
            .toEqual(0)
    })

    it('packs twice', () => {
        const ts = new TrackerStats()
        const now = Date.now()

        // eg : 8:00
        ts.increment('a', now)

        // eg : 9:05
        ts.pack(now + HOUR + (MIN * 5))

        // eg : 9:06
        ts.increment('a', now + HOUR + (MIN * 6))
        ts.increment('a', now + HOUR + (MIN * 6))
        ts.increment('a', now + HOUR + (MIN * 6))
        ts.increment('a', now + HOUR + (MIN * 6))

        // 10:05
        ts.pack(now + (HOUR * 2) + (MIN * 6))

        expect(ts.current.entries.size)
            .withContext('current should be empty because we packed twice')
            .toEqual(0)

        expect(ts.packs.length)
            .withContext('should have 2 packs because both times were outside the time window')
            .toEqual(2)
    })

    it('handles clock adjustments for current', () => {
        const ts = new TrackerStats()
        const now = Date.now()

        // eg : 8:00
        ts.increment('a', now)
        ts.increment('a', now - MIN)

        expect(ts.current.entries.size)
            .withContext('the first current entry should have been cleared as a safety measure')
            .toEqual(1)

        expect(ts.totalCount)
            .withContext('total count should still contain both entries')
            .toEqual(2)
    })

    it('handles clock adjustments for packing', () => {
        const ts = new TrackerStats()
        const now = Date.now()

        // eg : 8:00
        ts.increment('a', now)
        ts.pack(now - MIN) // pack at 7:59, should be ignored for packing
        ts.pack(now + HOUR + MIN) // at 9:01, should be accepted

        expect(ts.current.entries.size)
            .withContext('the first current entry should have been cleared as a safety measure')
            .toEqual(0)

        expect(ts.packs.length)
            .withContext('should have 1 pack because the first pack was ignored')
            .toEqual(1)
    })

    it('Produces data from current only', () => {
        const ts = new TrackerStats()
        const now = Date.now()

        // eg : 8:00
        ts.increment('a', now)
        ts.increment('a', now)

        // eg : 8:00
        ts.increment('b', now)
        ts.increment('b', now)
        ts.increment('b', now)

        const data = ts.data(now)

        expect(data.a).toEqual(2)
        expect(data.b).toEqual(3)
    })

    it('Produce data from current + packs', () => {
        const ts = new TrackerStats()
        const now = Date.now()

        // time: 8:00
        ts.increment('a', now)
        ts.increment('a', now)

        // time: 9:00
        ts.pack(now + HOUR)

        // time: 9:01
        ts.increment('a', now + HOUR + MIN)

        // time: 9:01
        const data = ts.data(now + HOUR + MIN)

        expect(data.a)
            .withContext("should have 3 a's - 2 from the pack and 1 from current")
            .toEqual(3)
    })

    it('ignores expired packs', () => {
        const ts = new TrackerStats()

        // time: Monday 8:00
        const now = Date.now()

        // time: Monday 8:00
        ts.increment('a', now)
        ts.increment('a', now)

        // time: Monday 9:00
        ts.pack(now + HOUR)

        // time: Tuesday 9:10
        ts.increment('b', now + DAY + (MIN * 10))
        ts.increment('b', now + DAY + (MIN * 10))
        ts.increment('b', now + DAY + (MIN * 10))

        // time: Tuesday 9:01
        const data = ts.data(now + DAY + HOUR + MIN)

        expect(data)
            .withContext('should only have tuesdays data because the monday pack is expired')
            .toEqual({
                b: 3
            })
    })

    it('evicts expired packs', () => {
        const ts = new TrackerStats()

        // time: Monday 8:00
        const now = Date.now()

        // time: Monday 8:00
        ts.increment('a', now)
        ts.increment('a', now)

        // time: Monday 9:00
        const mon9am = now + HOUR
        ts.pack(mon9am)
        expect(ts.packs.length).toEqual(1)

        // time: Tuesday 9:01
        ts.pack(mon9am + DAY + MIN)
        expect(ts.packs.length)
            .withContext('The monday 9am pack should be evicted')
            .toEqual(0)
    })

    it('ignore expired current', () => {
        const ts = new TrackerStats()

        // time: Monday 8:00
        const now = Date.now()

        // time: Monday 8:00
        ts.increment('a', now)
        ts.increment('a', now)

        const data = ts.data(now + DAY + MIN)
        expect(data)
            .withContext('should be empty, because the current is expired')
            .toEqual({})
    })

    it('sorts by count', () => {
        const ts = new TrackerStats()

        // time: Monday 8:00
        const now = Date.now()

        // time: Monday 8:00
        ts.increment('a', now)
        ts.increment('a', now)
        ts.increment('b', now)
        ts.increment('b', now)
        ts.increment('b', now)

        const data = ts.sorted(now + MIN)

        expect(data).toEqual([{ key: 'b', count: 3 }, { key: 'a', count: 2 }])
    })

    it('deserialize - all expired', () => {
        const ts = new TrackerStats()
        const now = Date.now()
        const overOneDayAgo = now - (DAY + MIN)

        ts.deserialize({
            current: {
                start: overOneDayAgo,
                end: overOneDayAgo,
                entries: {
                    a: 2,
                    b: 3
                }
            },
            packs: [
                {
                    start: overOneDayAgo,
                    end: overOneDayAgo,
                    entries: {
                        a: 1,
                        b: 1
                    }
                },
                {
                    start: overOneDayAgo,
                    end: overOneDayAgo,
                    entries: {
                        a: 1,
                        b: 1
                    }
                }
            ],
            totalCount: 9
        })

        expect(ts.packs.length).toEqual(0)
    })

    it('deserialize current only', () => {
        const ts = new TrackerStats()
        const now = Date.now()
        const overOneDayAgo = now - (DAY + MIN)
        const lessThan1DayAgo = now - (DAY - (2 * MIN))

        ts.deserialize({
            current: {
                start: lessThan1DayAgo,
                end: lessThan1DayAgo,
                entries: {
                    a: 2,
                    b: 3
                }
            },
            packs: [
                {
                    start: overOneDayAgo,
                    end: overOneDayAgo,
                    entries: {
                        a: 1,
                        b: 1
                    }
                }
            ],
            totalCount: 9
        })

        const data = ts.data(now)

        expect(data).toEqual({
            a: 2,
            b: 3
        })
    })

    it('deserialize current + 1 valid pack only', () => {
        const ts = new TrackerStats()
        const now = Date.now()
        const overOneDayAgo = now - (DAY + MIN)
        const lessThan1DayAgo = now - (DAY - (2 * MIN))

        ts.deserialize({
            current: {
                start: lessThan1DayAgo,
                end: lessThan1DayAgo,
                entries: {
                    a: 2,
                    b: 3
                }
            },
            packs: [
                {
                    start: overOneDayAgo,
                    end: overOneDayAgo,
                    entries: {
                        a: 1,
                        b: 1
                    }
                },
                {
                    start: lessThan1DayAgo,
                    end: lessThan1DayAgo,
                    entries: {
                        a: 10,
                        b: 10
                    }
                }
            ],
            totalCount: 9
        })

        const data = ts.data(now)

        expect(data).toEqual({
            a: 12,
            b: 13
        })
    })

    it('deserialize corrupted data', () => {
        const ts = new TrackerStats()
        const now = Date.now()

        ts.deserialize({
            current: {
                // @ts-expect-error
                start: 'lessThan1DayAgo',
                // @ts-expect-error
                end: () => {},
                entries: {
                    a: 2,
                    b: 3
                }
            },
            packs: [
                // @ts-expect-error
                2, '23'
            ],
            totalCount: 9
        })

        const data = ts.data(now)
        expect(data)
            .withContext('defaults to empty when it cannot deserialize')
            .toEqual({})
    })

    it('deserialize partially bad data', () => {
        const ts = new TrackerStats()
        const now = Date.now()
        const oneHourAgo = now - HOUR
        const twoHoursAgo = now - (HOUR * 2)

        ts.deserialize({
            current: {
                start: 12,
                end: 1243,
                entries: {
                    a: 2,
                    b: 3
                }
            },
            packs: [{
                start: twoHoursAgo,
                end: oneHourAgo,
                entries: {
                    a: 200,
                    b: 300
                }
            }],
            totalCount: 9
        })

        const data = ts.data(now)

        expect(data).toEqual({
            a: 200,
            b: 300
        })

        expect(ts.totalCount).toEqual(9)
    })
})
