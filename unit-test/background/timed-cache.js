const { TimedCache } = require('../../shared/js/background/timed-cache')

const SEC = 1000
const MIN = SEC * 60

describe('TimedCache', () => {
    it('produces an aggregated view', () => {
        const tc = new TimedCache()
        const now = Date.now()
        tc.insert('Google', now)
        tc.insert('Facebook', now)
        tc.insert('Facebook', now)

        // viewing immediately, should produce all values
        const view = tc.view(now)
        expect(view).toEqual([
            {
                key: 'Google',
                count: 1
            },
            {
                key: 'Facebook',
                count: 2
            }
        ])
    })
    it('prunes stale entries when producing an aggregated view', () => {
        const tc = new TimedCache()
        const now = Date.now()

        // 8.00am, for example
        tc.insert('Google', now)

        // 8.02am
        tc.insert('Facebook', now + MIN * 2)
        tc.insert('Facebook', now + MIN * 2)
        tc.insert('Facebook', now + MIN * 2)

        // view time is 1 minute over `maxAgeMs`, eg: 9.01
        const view = tc.view(now + MIN * 61)

        // so we expect there to only be the most recent entry
        expect(view).toEqual([{
            key: 'Facebook',
            count: 3
        }])
    })
    it('prunes stale entries manually', () => {
        const tc = new TimedCache()
        const now = 1673473220560

        // 8.00am, for example
        tc.insert('Google', now)

        // 8.02am
        tc.insert('Facebook', now)
        tc.insert('Facebook', now + MIN * 2)
        tc.insert('Facebook', now + MIN * 2)

        // prune time is 1 minute over `maxAgeMs`, eg: 9.01
        tc.prune(now + MIN * 61)

        // we expect Google entirely, and the first Facebook entry to be both be absent
        expect(Object.fromEntries(tc.entries)).toEqual({
            Facebook: [1673473340560, 1673473340560]
        })
    })
})
