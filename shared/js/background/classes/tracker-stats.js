import z from 'zod'

const SEC = 1000
const MIN = SEC * 60
const HOUR = MIN * 60
const DAY = HOUR * 24

/**
 * @typedef {Record<string, number>} PlainEntries
 * @typedef {{key: string; count: number}[]} SortedOutput
 */

/**
 * @typedef Pack - a pack is a collection of entries that are packed into a single object
 * @property {number} start
 * @property {number} end
 * @property {PlainEntries} entries
 */

export class TrackerStats {
    /**
     * A running total for the lifespan of the extension being installed
     * @type {number}
     */
    totalCount = 0

    /**
     * A collection of packs, each one representing an hour of data
     * @type {Pack[]}
     */
    packs = []

    /**
     * @type {{entries: Map<string, number>, start: number, end: number}}
     */
    current = {
        start: 0,
        end: 0,
        entries: new Map()
    }

    /**
     * @param {string} key
     * @param {number} [now] optional timestamp to use as the current time
     */
    increment (key, now = Date.now()) {
        this.totalCount += 1
        if (this.current.start === 0) {
            this.current.start = now
        }
        const count = this.current.entries.get(key) ?? 0
        this.current.entries.set(key, count + 1)
    }

    /**
     * Every hour, pack up the current entries and start a new pack
     * @param {number} [now] optional timestamp to use as the current time
     */
    pack (now = Date.now()) {
        const currentIsOverAnHourOld = (now - this.current.start) >= HOUR
        const currentIsOverADayOld = (now - this.current.start) >= DAY

        // if current is over a day old, just clear it
        if (currentIsOverADayOld) {
            // clear current
            this.clearCurrent()
        } else if (currentIsOverAnHourOld && this.current.entries.size > 0) {
            // when 'current' is over an hour old, pack it
            /** @type {Pack} */
            const next = {
                start: this.current.start,
                end: now,
                entries: Object.fromEntries(this.current.entries)
            }

            this.packs.push(next)
            this.clearCurrent()
        } else {
            // Here we do nothing because 'current' was neither dropped nor packed.
            // This comments remains here to highlight this 3rd state, where we don't alter 'current'
            // but instead we allow it to keep collecting data
        }

        // prune expired packs and ensure this.totalCount is accurate
        this.packs = this.packs.filter(pack => {
            const packIsYoungerThanADay = (now - pack.end) <= DAY
            return packIsYoungerThanADay
        })
    }

    /**
     * @param {number} [now] - optional timestamp to use as the current time
     * @return {PlainEntries}
     */
    data (now = Date.now()) {
        /** @type {Record<string, number>} */
        const output = {}

        // aggregate all packs
        for (const pack of this.packs) {
            const packIsYoungerThanADay = (now - pack.end) < DAY
            if (!packIsYoungerThanADay) continue
            for (const [key, count] of Object.entries(pack.entries)) {
                output[key] = (output[key] ?? 0) + count
            }
        }

        // aggregate current, but only if it's younger than a day
        const currentIsYoungerThanADay = (now - this.current.start) < DAY
        if (currentIsYoungerThanADay) {
            for (const [key, count] of this.current.entries) {
                output[key] = (output[key] ?? 0) + count
            }
        }

        return output
    }

    /**
     * @param {number} [now] optional timestamp to use as the current time
     * @returns {SortedOutput}
     */
    sorted (now = Date.now()) {
        const data = this.data(now)

        /** @type {SortedOutput} */
        const keys = Object.keys(data)
            .map(key => {
                return { key, count: data[key] }
            })
            .sort((a, b) => b.count - a.count)

        return keys
    }

    /**
     * @param {object} params
     * @param {number} params.totalCount
     * @param {Pack} params.current
     * @param {Pack[]} params.packs
     */
    deserialize (params) {
        // this is the schema for a single pack. It's used for the current pack and for the packs array
        const packSchema = z.object({
            start: z.number().default(0),
            end: z.number().default(0),
            entries: z.record(z.string(), z.number())
        })

        // this is the schema for the entire storage object
        const storageSchema = z.object({
            totalCount: z.number(),
            current: packSchema.default({
                start: 0,
                end: 0,
                entries: {}
            }),
            packs: z.array(packSchema).default([])
        })

        // try to validate the data, but without throwing errors
        const result = storageSchema.safeParse(params)

        // if any errors occur, bail and don't use this data at all (essentially starting a fresh)
        if (!result.success) {
            console.log(params)
            console.warn('could not accept the incoming data because of schema errors', result.error.errors.length)
            console.warn('could not accept the incoming data because of schema errors', result.error.errors)
        } else {
            // but if we get here, we can use the data internally, we 'trust' it at this point.
            this.totalCount = result.data.totalCount
            this.current = {
                start: result.data.current.start,
                end: result.data.current.end,
                entries: new Map(Object.entries(result.data.current.entries))
            }
            this.packs = result.data.packs
        }

        // Because 'deserialize' will happen every time the extension is loaded, we need to pack
        // the restored data to prune expired packs and ensure this.totalCount is accurate
        this.pack()
    }

    /**
     * Produce a JSON-compatible object that can be stored in `chrome.storage.local`
     * NewTabTrackerStats will call this when it's time to save the data
     *
     * @return {{current: Pack, totalCount: number, packs: Pack[]}}
     */
    serialize () {
        const output = {
            totalCount: this.totalCount,
            current: {
                ...this.current,
                entries: Object.fromEntries(this.current.entries)
            },
            packs: this.packs
        }
        return output
    }

    /**
     * NewTabTrackerStats will call this via things like alarms. It's an opportunity
     * to look at internal data and drop what we no-longer need. This prevents
     * the data from growing too large whilst also ensuring we don't hang onto stale entries.
     *
     * @param {number} [now] optional timestamp to use as the current time
     */
    evictExpired (now = Date.now()) {
        this.pack(now)
    }

    clearCurrent () {
        this.current.entries.clear()
        this.current.start = 0
        this.current.end = 0
    }

    clear () {
        this.clearCurrent()
        this.packs = []
    }
}
