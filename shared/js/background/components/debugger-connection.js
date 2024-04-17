import browser from 'webextension-polyfill'
import { registerMessageHandler } from '../message-handlers'
import { getBrowserName } from '../utils'
import { getExtensionVersion, getFromSessionStorage, removeFromSessionStorage, setToSessionStorage } from '../wrapper'
import { registerDebugHandler } from '../devtools'

/**
 * @typedef {import('./tds').default} TDSStorage
 */

export async function getDebuggerSettings () {
    const [configURLOverride, debuggerConnection] = await Promise.all([
        getFromSessionStorage('configURLOverride'),
        getFromSessionStorage('debuggerConnection')
    ])
    return {
        configURLOverride,
        debuggerConnection
    }
}

export default class DebuggerConnection {
    /**
     * @param {{
    *  tds: TDSStorage
    * }} options
     */
    constructor ({ tds }) {
        this.init()
        this.tds = tds
        this.socket = null
        this.subscribedTabs = new Set()
        registerMessageHandler('getDebuggingSettings', getDebuggerSettings)
        registerMessageHandler('enableDebugging', ({ configURLOverride, debuggerConnection }) => {
            return this.enableDebugging(configURLOverride, debuggerConnection)
        })
        registerMessageHandler('disableDebugging', this.disableDebugging.bind(this))
        registerMessageHandler('forceReloadConfig', this.forceReloadConfig.bind(this))
    }

    async init () {
        const { configURLOverride, debuggerConnection } = await getDebuggerSettings()
        this.configURLOverride = configURLOverride
        this.debuggerConnectionEnabled = debuggerConnection
        if (this.configURLOverride && this.debuggerConnectionEnabled) {
            const url = new URL('./debugger/extension', this.configURLOverride.replace(/https?:/, 'ws:'))
            url.searchParams.append('browserName', getBrowserName())
            url.searchParams.append('version', getExtensionVersion())
            let lastUpdate = 0
            this.socket = new WebSocket(url.href)
            this.socket.addEventListener('message', (event) => {
                const { messageType, payload } = JSON.parse(event.data)
                console.log('debugger message', event.data)
                if (messageType === 'status') {
                    if (payload.lastBuild > lastUpdate) {
                        lastUpdate = payload.lastBuild
                        this.tds.config.checkForUpdates(true)
                    }
                } else if (messageType === 'subscribe') {
                    const { tabId } = payload
                    if (!this.subscribedTabs.has(tabId)) {
                        this.subscribedTabs.add(tabId)
                        this.forwardDebugMessagesForTab(tabId)
                    }
                }
            })
            this.socket.addEventListener('close', () => {
                this.socket = null
                setTimeout(() => this.init(), 5000)
            })
            this.socket.addEventListener('open', async () => {
                // send initial batch of data.
                const tabs = await browser.tabs.query({})
                this.socket?.send(JSON.stringify({
                    messageType: 'tabs',
                    payload: tabs.sort((a, b) => (a.lastAccessed || 0) - (b.lastAccessed || 0))
                }))

                this.subscribedTabs.forEach((tabId) => {
                    this.forwardDebugMessagesForTab(tabId)
                })
            })
        }
    }

    async isActive () {
        return this.socket !== null
    }

    async enableDebugging (url, debuggerConnection = false) {
        await Promise.all([
            setToSessionStorage('configURLOverride', url),
            setToSessionStorage('debuggerConnection', debuggerConnection)
        ])
        this.init()
        this.forceReloadConfig()
    }

    async forceReloadConfig () {
        this.tds.config.checkForUpdates(true)
    }

    async disableDebugging () {
        await Promise.all([
            removeFromSessionStorage('configURLOverride'),
            removeFromSessionStorage('debuggerConnection')
        ])
        this.socket?.close()
    }

    forwardDebugMessagesForTab (tabId) {
        registerDebugHandler(tabId, (payload) => {
            if (this.socket) {
                this.socket.send(JSON.stringify({
                    messageType: 'devtools',
                    payload
                }))
            }
        })
    }
}
