import { NewTabTrackerStats } from './newtab-tracker-stats';

/**
 * This API is installed in the background page and allows us to debug the newtab-tracker-stats
 * during development.
 *
 * It's useful for stress-testing things like the `top100Companies` list, storage etc
 *
 */
export function createNewtabTrackerStatsDebugApi() {
    const SEC = 1000;
    const MIN = SEC * 60;
    const HOUR = MIN * 60;
    const DAY = HOUR * 24;

    const shared = {
        get instance() {
            if (!NewTabTrackerStats.shared) throw new Error("unreachable, NewTabTrackerStats.shared wasn't set yet");
            return NewTabTrackerStats.shared;
        },
        get stats() {
            if (!NewTabTrackerStats.shared) throw new Error("unreachable, NewTabTrackerStats.shared.stats wasn't available");
            return NewTabTrackerStats.shared.stats;
        },
    };

    return {
        /**
         * Clear current tracking data, but keep the 'totalCount'
         *
         * @return {import("./classes/tracker-stats").TrackerStats}
         */
        clear() {
            shared.stats.clear();
            shared.instance.sendToNewTab('testing clear');
            shared.instance.syncToStorage();
            return shared.instance.stats;
        },
        /**
         * Clear all data, including totalCount
         *
         * @return {import("./classes/tracker-stats").TrackerStats}
         */
        clearAll() {
            shared.instance.stats.clearAll();
            shared.instance.sendToNewTab('testing clearAll');
            shared.instance.syncToStorage();
            return shared.instance.stats;
        },
        /**
         * Record an entry.
         * @param {number} count - required. If you provide this alone, entries will be chosen from the top100 list
         * @param {string} [name] - optional company name. If you provide it, all entries will be created for it
         * @return {import("./classes/tracker-stats").TrackerStats}
         */
        record(count, name) {
            const now = Date.now();
            if (name) {
                for (let i = 0; i < Math.abs(count); i++) {
                    shared.instance.record(name, now);
                }
                return shared.instance.stats;
            }

            if (!shared.instance.top100Companies) throw new Error('top100Companies missing');

            const keys = [...shared.instance.top100Companies.keys()];
            for (let i = 0; i < count; i++) {
                const randomNumberBetweenZeroAnd100 = Math.floor(Math.random() * 100);
                const match = keys[randomNumberBetweenZeroAnd100];
                if (match) {
                    shared.instance.record(match, now);
                } else {
                    console.log('not found');
                }
            }
            return shared.instance.stats;
        },
        /**
         * Simulate what happens when previously valid entries are followed
         * by an invalid one (for example, when a user has altered their clock)
         */
        recordInvalid() {
            const now = Date.now();
            const nowMinus1Hour = now - MIN;
            shared.instance.record('ABC', now);
            shared.instance.record('ABC', now);
            shared.instance.record('ABC', now);
            shared.instance.record('ABC', nowMinus1Hour);
            shared.instance.record('ABC', now);
            shared.instance.record('ABC', now);
            shared.instance.record('ABC', now);
            return shared.instance.stats;
        },
        /**
         * Simulate what happens when the pruneAlarm is activated
         */
        pack() {
            const now = Date.now();
            const oneDayMinusOneHour = now + DAY - HOUR;
            shared.instance._handlePruneAlarm(oneDayMinusOneHour);
            return shared.instance.stats;
        },
        /**
         * Simulate what happens when the pruneAlarm is activated, but
         * current data is older than 1 day (for example, when a user opens their browser the next day)
         */
        packAfterDay() {
            const now = Date.now();
            const oneDayPlusOneMin = now + DAY + MIN;
            shared.instance._handlePruneAlarm(oneDayPlusOneMin);
            return shared.instance.stats;
        },
        /**
         * Simulate what happens when the pruneAlarm is activated with an invalid date,
         * for example when a user has altered their clock
         */
        packInvalid() {
            const now = Date.now();
            const nowMinus1Hour = now - HOUR;
            shared.instance._handlePruneAlarm(nowMinus1Hour);
            return shared.instance.stats;
        },
    };
}
