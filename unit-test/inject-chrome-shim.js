const chrome = {
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
    browserAction: {
        setIcon: () => {}
    },
    contextMenus: {
        create: () => {},
        onClicked: {
            addListener: () => {}
        }
    },
    runtime: {
        id: '577dc9b9-c381-115a-2246-3f95fe0e6ffe',
        sendMessage: () => {},
        getManifest: () => {
            return { version: '1234.56' }
        },
        setUninstallURL: () => {},
        getURL: path => path
    },
    tabs: {
        sendMessage: () => {},
        query: () => Promise.resolve([])
    },
    declarativeNetRequest: {
        isRegexSupported () { return { isSupported: true } },
        getDynamicRules () { },
        getSessionRules () { },
        updateDynamicRules () { },
        updateSessionRules () { }
    }
}
export {
    chrome as 'globalThis.chrome',
    chrome
}
