const z = require('zod')
const { AggregatedTrackerStats } = require('../../shared/js/background/aggregated-tracker-stats')

const SEC = 1000
const MIN = SEC * 60

// This helps to validate that .toDisplayData() on instances of AggregatedTrackerStats will produce
// a well-known set of data
const jsonSchema = z.object({
    state: z.union([z.literal('showing'), z.literal('hiding')]),
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

describe('AggregatedTrackerStats', () => {
    it('produces a filtered output for multiple companies', () => {
        const ats = new AggregatedTrackerStats()
        const now = Date.now()

        ats.increment('Google', now)
        ats.increment('Google', now)
        ats.increment('Google', now)
        ats.increment('Facebook', now + MIN * 2)

        // produce the data as consumers would
        const output = ats.toDisplayData()

        // this will throw (and cause the test to fail) if the
        // data has deviated from the schema defined here
        jsonSchema.parse(output)

        // just some manual checks on the values too
        expect(output.totalCount).toEqual(4)
        expect(output.trackerCompanies.length).toEqual(2)
    })
    it('prunes stale entries when viewing data', () => {
        const ats = new AggregatedTrackerStats()
        const now = Date.now()

        // 8.00am
        ats.increment('Google', now)
        // 8.02am
        ats.increment('Google', now + MIN * 2)
        // 9.01am
        const readTime = now + (MIN * 61)

        // produce the view data as consumers would
        const actual = ats.toDisplayData(readTime)

        // should have dropped the 8.00am entry
        expect(actual.trackerCompanies[0].count).toEqual(1)
    })
})
