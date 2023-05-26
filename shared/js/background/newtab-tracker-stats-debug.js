/**
 * This API is installed in the background page and allows us to debug the newtab-tracker-stats
 * during development.
 *
 * It's useful for stress-testing things like the `top100Companies` list, storage etc
 *
 * @param {import("./newtab-tracker-stats").NewTabTrackerStats} newTabTrackerStats
 * @param {import("../background/classes/tracker-stats").TrackerStats} trackerStats
 */
export function installDebug (newTabTrackerStats, trackerStats) {
    const SEC = 1000
    const MIN = SEC * 60
    const HOUR = MIN * 60
    const DAY = HOUR * 24

    /**
     * @param {number} count
     * @param {string} name - optional name to
     * @private
     */
    // @ts-ignore
    self.dbg.ntts = {
        newTabTrackerStats,
        trackerStats,
        clear: () => {
            trackerStats.clear()
            newTabTrackerStats.sendToNewTab('testing clear')
            newTabTrackerStats.syncToStorage()
            return trackerStats
        },
        clearAll: () => {
            trackerStats.clearAll()
            newTabTrackerStats.sendToNewTab('testing clearAll')
            newTabTrackerStats.syncToStorage()
            return trackerStats
        },
        record: (count, name) => {
            const now = Date.now()
            if (name) {
                for (let i = 0; i < Math.abs(count); i++) {
                    newTabTrackerStats.record(name, now)
                }
                return trackerStats
            }
            if (!newTabTrackerStats.top100Companies) return console.warn('no top100Companies')
            const keys = [...newTabTrackerStats.top100Companies.keys()]
            for (let i = 0; i < count; i++) {
                const randomNumberBetweenZeroAnd100 = Math.floor(Math.random() * 100)
                const match = keys[randomNumberBetweenZeroAnd100]
                if (match) {
                    newTabTrackerStats.record(match, now)
                } else {
                    console.log('not found')
                }
            }
            return trackerStats
        },
        recordInvalid: () => {
            const now = Date.now()
            const nowMinus1Hour = now - MIN
            newTabTrackerStats.record('ABC', now)
            newTabTrackerStats.record('ABC', now)
            newTabTrackerStats.record('ABC', now)
            newTabTrackerStats.record('ABC', nowMinus1Hour)
            newTabTrackerStats.record('ABC', now)
            newTabTrackerStats.record('ABC', now)
            newTabTrackerStats.record('ABC', now)
            return trackerStats
        },
        pack: () => {
            const now = Date.now()
            const oneDayMinusOneHour = now + DAY - HOUR
            newTabTrackerStats._handlePruneAlarm(oneDayMinusOneHour)
            return trackerStats
        },
        packAfterDay: () => {
            const now = Date.now()
            const oneDayPlusOneMin = now + DAY + MIN
            newTabTrackerStats._handlePruneAlarm(oneDayPlusOneMin)
            return trackerStats
        },
        packInvalid: () => {
            const now = Date.now()
            const nowMinus1Hour = now - HOUR
            newTabTrackerStats._handlePruneAlarm(nowMinus1Hour)
            return trackerStats
        }
    }
}
