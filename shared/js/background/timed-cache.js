/**
 * Maintain a list of timestamps that correspond to the point
 * at which a tracker was identified as being 'blocked' by us.
 *
 * Timestamps are grouped on the owner name, so that the internal data
 * structure looking like this
 *
 * {
 *     "Google": [1673438914778],
 *     "Facebook: [1673438914778, 1673438914778, 1673438914792]
 * }
 *
 * where the entries in the arrays are unix timestamps.
 *
 * ```js
 * const cache = new TimedCache()
 * cache.insert("Google")
 * cache.insert("Google")
 *
 * const data = cache.view(); // { Google: 2 }
 * ```
 *
 */
export class TimedCache {
    /**
     * @type {Map<string, number[]>}
     */
    entries = new Map()

    /**
     * @type {number} maximum age of an entry in ms
     */
    maxAgeMs = 1000 * 60 * 60

    clear () {
        this.entries = new Map()
    }

    /**
     * Insert a new entry.
     *
     * ```js
     * const tc = new TimedCache();
     * tc.insert("Google")
     * tc.insert("Google")
     * tc.insert("Google")
     * console.log(tc.entries) // Map({ Google: [1673438914778, 1673438914778, 1673438914778] })
     * ```
     *
     * @param {string} key
     * @param {number} [timestamp]
     */
    insert (key, timestamp = Date.now()) {
        // ensure we always have an array for this incoming name
        const prev = this.entries.get(key) || []

        // now add this entry to the end
        prev.push(timestamp)

        // and re-set on the storage
        this.entries.set(key, prev)
    }

    /**
     * Ensure we're not holding onto stale data.
     *
     * Note: entries are skipped at read-time anyway, but this ensures
     * that we don't maintain a growing list of timestamp entries over time.
     *
     * This will be called by an alarm
     *
     * @param {number} [now] - the timestamp to compare entries against
     * @returns {this}
     */
    prune (now = Date.now()) {
        for (const [key, timestamps] of this.entries) {
            // note: there's an assumption here that this *won't* be a perf
            // bottleneck. `.filter(...)` is not always ideal since it allocates a new array
            // but in this instance we're not in a 'hot' path as pruning only happens
            // in response to a timed-alarm.
            const next = timestamps.filter(previousTimestamp => {
                const delta = now - previousTimestamp
                return delta <= this.maxAgeMs
            })

            if (next.length === 0) {
                this.entries.delete(key)
            } else {
                this.entries.set(key, next)
            }
        }
        return this
    }

    /**
     * Produce a simplified 'view' of the underlying data.
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
     * [ { Google: 1, Facebook: 3 } ]
     *
     * @param {number} [now] - an optional timestamp, defaults to call-time
     * @returns {{key: string, count: number}[]}
     */
    view (now = Date.now()) {
        /** @type {{key: string, count: number}[]} */
        const output = []

        // For every entry, only count the ones within the last hour.
        // This acts as a secondary check to ensure we don't
        // produce outdated results to consumers.
        for (const [key, timestamps] of this.entries) {
            let count = 0
            for (const timestamp of timestamps) {
                const delta = now - timestamp
                if (delta <= this.maxAgeMs) {
                    count += 1
                }
            }
            if (count > 0) {
                output.push({ key, count })
            }
        }

        return output
    }
}
