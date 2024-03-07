const chrome = {
    alarms: {
        onAlarm: {
            addListener () { },
            removeListener () { }
        }
    },
    browserAction: {
        setIcon: () => {}
    },
    contextMenus: {
        create: () => {},
        onClicked: {
            addListener: () => {}
        }
    },
    declarativeNetRequest: {
        isRegexSupported () { return { isSupported: true } },
        getDynamicRules () { },
        getSessionRules () { },
        updateDynamicRules () { },
        updateSessionRules () { }
    },
    runtime: {
        id: '577dc9b9-c381-115a-2246-3f95fe0e6ffe',
        sendMessage: () => {},
        getManifest: () => {
            return { version: '1234.56' }
        },
        setUninstallURL: () => {},
        getURL: path => path,
        onConnect: {
            addListener () { },
            removeListener () { }
        },
        onInstalled: {
            addListener () { },
            removeListener () { }
        },
        onMessage: {
            addListener () { },
            removeListener () { }
        },
        onPerformanceWarning: {
            addListener (listener) {
                chrome.runtime.onPerformanceWarning._listeners.push(listener)
            },
            _listeners: []
        },
        onStartup: {
            addListener () { },
            removeListener () { }
        }
    },
    storage: {
        local: {
            set: (value) => {
                chrome.storage.local._setCalls.push(value)
            },
            get: (args, cb) => {
                // eslint-disable-next-line n/no-callback-literal
                cb({})
            },
            _setCalls: []
        },
        managed: {
            get: (args, cb) => {
                // eslint-disable-next-line n/no-callback-literal
                cb({})
            }
        }
    },
    tabs: {
        onActivated: {
            addListener () { },
            removeListener () { }
        },
        sendMessage: () => {},
        query: () => Promise.resolve([])
    },
    webNavigation: {
        onCommitted: {
            addListener () { },
            removeListener () { }
        },
        onCompleted: {
            addListener () { },
            removeListener () { }
        },
        onErrorOccurred: {
            addListener () { },
            removeListener () { }
        }
    },
    webRequest: {
        OnBeforeSendHeadersOptions: { },
        OnHeadersReceivedOptions: { },
        onBeforeRequest: {
            addListener () { },
            removeListener () { }
        },
        onBeforeSendHeaders: {
            addListener () { },
            removeListener () { }
        },
        onCompleted: {
            addListener () { },
            removeListener () { }
        },
        onErrorOccurred: {
            addListener () { },
            removeListener () { }
        },
        onHeadersReceived: {
            addListener () { },
            removeListener () { }
        }
    }
}
export {
    chrome as 'globalThis.chrome',
    chrome
}
