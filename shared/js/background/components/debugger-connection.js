import { getFromSessionStorage, removeFromSessionStorage, setToSessionStorage } from '../wrapper'

/**
 * @typedef {import('./tds').default} TDSStorage
 */

export default class DebuggerConnection {
    /**
     * @param {{
    *  tds: TDSStorage
    * }} options
     */
    constructor ({ tds }) {
        this.init()
        this.tds = tds
    }

    async init () {
        const [configURLOverride, debuggerConnection] = await Promise.all([
            getFromSessionStorage('configURLOverride'),
            getFromSessionStorage('debuggerConnection')
        ])
        this.configURLOverride = configURLOverride
        this.debuggerConnectionEnabled = debuggerConnection
        if (this.configURLOverride && this.debuggerConnectionEnabled) {
            const url = new URL('/status', this.configURLOverride)
            let lastUpdate = 0
            this.eventSource = new EventSource(url.href)
            this.eventSource.onmessage = event => {
                const status = JSON.parse(event.data)
                console.log('debugger message', status)
                if (status.lastBuild > lastUpdate) {
                    lastUpdate = status.lastBuild
                    this.tds.config.checkForUpdates(true)
                }
            }
        }
    }

    async enableDebugging (url, debuggerConnection = false) {
        await Promise.all([
            setToSessionStorage('configURLOverride', url),
            setToSessionStorage('debuggerConnection', debuggerConnection)
        ])
        this.init()
        this.tds.config.checkForUpdates(true)
    }

    async disableDebugging () {
        await Promise.all([
            removeFromSessionStorage('configURLOverride'),
            removeFromSessionStorage('debuggerConnection')
        ])
        this.eventSource?.close()
    }
}
