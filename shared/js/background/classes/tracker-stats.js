import z from 'zod'

/**
 * A single place to collect information about the number of requests
 * we have blocked, grouped by the owner's display name.
 */
export class TrackerStats {
    maxAgeMs = 1000 * 60 * 60 // 1hr
    /**
     * A time-based mechanism
     * @type {Map<string, number[]>}
     */
    entries = new Map()
    /**
     * A running total for (hopefully) the lifespan of the extension being installed
     * @type {number}
     */
    totalCount = 0
    /**
     * Given a key eg: 'displayName', store current timestamp +
     * increment the 'since-install-time' value
     *
     * @param {string} key
     * @param {number} [timestamp] - optional timestamp
     */
    increment (key, timestamp = Date.now()) {
        // ensure we always have an array for this incoming key
        const prev = this.entries.get(key) || []

        // now add this entry to the end
        prev.push(timestamp)

        // re-store the array of timestamps
        this.entries.set(key, prev)

        // increment the total count
        this.totalCount += 1
    }

    /**
     * Ensure we're not holding onto stale data.
     *
     * Note: entries are skipped at read-time anyway, but this ensures
     * that we don't maintain a growing list of timestamp entries over time.
     *
     * This may be called by an alarm or at any other period
     *
     * @param {number} [now] - the timestamp to compare entries against
     * @returns {this}
     */
    evictExpired (now = Date.now()) {
        for (const [key, timestamps] of this.entries) {
            // note: there's an assumption here that this *won't* be a perf
            // bottleneck. `.filter(...)` is not always ideal since it allocates a new array
            // but in this instance we're not in a 'hot' path as pruning only happens
            // in response to things like timed-alarm.
            const filteredTimestamps = timestamps.filter(previousTimestamp => {
                const delta = now - previousTimestamp
                return delta <= this.maxAgeMs
            })

            // evict the entry entirely if there are no valid timestamps
            if (filteredTimestamps.length === 0) {
                this.entries.delete(key)
            } else {
                // otherwise just re-set this entry to have only valid ones.
                this.entries.set(key, filteredTimestamps)
            }
        }

        return this
    }

    /**
     * Produce a simplified 'sorted' view of the underlying data.
     *
     * We store data in the following format:
     *
     * {
     *     "Google": [1673438914778],
     *     "Facebook: [1673438914778, 1673438914778, 1673438914792]
     * }
     *
     * We have to keep track of those timestamps, but only internally. When a consumer
     * wants access to our data, we collapse it down into the following format:
     *
     * {
     *     results: { Facebook: 3, Google: 1 },
     *     overflow: 5
     * }
     *
     * Where 'overflow' represents the number of requests for companies
     * outside the `maxCount`.
     *
     * @param {number} [maxCount] - how many companies to display
     * @param {number} [now] - an optional timestamp, defaults to call-time
     * @returns {{
     *     results: { key: string, count: number }[],
     *     overflow: number
     * }}
     */
    sorted (maxCount = 10, now = Date.now()) {
        /** @type {{key: string, count: number}[]} */
        const stats = []

        // For every entry, only count the ones within the last hour.
        for (const [key, timestamps] of this.entries) {
            let count = 0
            for (const timestamp of timestamps) {
                const delta = now - timestamp
                if (delta <= this.maxAgeMs) {
                    count += 1
                }
            }
            if (count > 0) {
                stats.push({ key, count })
            }
        }

        // sort them, so that the highest count's are first
        const sorted = stats.sort((a, b) => b.count - a.count)

        // now it's sorted, we need to partition the array based on the maxCount
        const results = sorted.slice(0, maxCount)

        // everything else will make up the 'overflow' count that can be used to
        // display a category like 'Other'
        const overflowItems = sorted.slice(maxCount)
        const overflow = overflowItems.reduce((sum, item) => sum + item.count, 0)

        return {
            results,
            overflow
        }
    }

    /**
     * Allow our internal data to be 'set'.
     *
     * We are very strict about the incoming data here, mostly treating
     * it as untrusted.
     *
     * It should be in this format:
     *
     * {
     *     "totalCount": 12,
     *     "entries": {
     *         "Google": [1673438914778],
     *         "Facebook": [1673438914778, 1673438914778, 1673438914792]
     *     }
     * }
     *
     * This is normally produced by `.serialize()` on this instance (see below)
     *
     * @param {object} params
     * @param {number} params.totalCount
     * @param {Record<string, number[]>} params.entries
     * @throws
     */
    deserialize (params) {
        // define what shape incoming data must be in
        const storageSchema = z.object({
            totalCount: z.number(),
            entries: z.record(z.string(), z.array(z.number()))
        })

        // try to validate the data
        const result = storageSchema.safeParse(params)

        // if any errors occur, bail and don't use this data at all (start a fresh)
        if (!result.success) {
            console.warn('could not accept the incoming data because of schema errors', result.error.errors.length)
        } else {
            // but if we get here, we can use the data internally, we 'trust' it.
            this.totalCount = result.data.totalCount
            this.entries = new Map(Object.entries(result.data.entries))
        }
    }

    /**
     * Produce a data format that can be stored and restored from.
     *
     * The data produced by this method will be stored and should be used
     * in calls to 'deserialize' (above)
     */
    serialize () {
        return {
            entries: Object.fromEntries(this.entries),
            totalCount: this.totalCount
        }
    }
}
