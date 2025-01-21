
export class RefreshMetric {

    /** @type {Map<number, number[]>} */
    tabRefreshCounter = new Map()
    DEBOUNCE_MS = 500

    /**
     *
     * @param {{
     *   abnMetrics: import('./components/abn-experiments').default,
     *   tabTracking: import('./components/tab-tracking').default,
     * }} opts
     */
    constructor({ abnMetrics, tabTracking }) {
        tabTracking.addEventListener('tabRefresh', (ev) => {
            if (ev instanceof CustomEvent) {
                const { tabId } = ev.detail
                if (!this.tabRefreshCounter.has(tabId)) {
                    this.tabRefreshCounter.set(tabId, [])
                }
                const refreshCounter = this.tabRefreshCounter.get(tabId) || []
                if (refreshCounter.length > 0 && refreshCounter[refreshCounter.length - 1] > Date.now() - this.DEBOUNCE_MS) {
                    // last refresh less than DEBOUNCE_MS ago, ignore
                    return
                }
                refreshCounter.push(Date.now())

                // reload-twice-within-12-seconds
                const tMinus12s = Date.now() - 12000
                if (refreshCounter.filter(t => t > tMinus12s).length === 2) {
                    abnMetrics.onMetricTriggered('reload-twice-within-12-seconds')
                }
                // reload-three-times-within-20-seconds
                const tMinus20s = Date.now() - 20000
                if (refreshCounter.filter(t => tMinus20s).length === 3) {
                    abnMetrics.onMetricTriggered('reload-three-times-within-20-seconds')
                }

                // clean up old refreshes
                while (refreshCounter.length > 0 && refreshCounter[0] < tMinus20s) {
                    refreshCounter.pop()
                }
                if (refreshCounter.length === 0) {
                    this.tabRefreshCounter.delete(tabId)
                }
            }
        })
    }
}
