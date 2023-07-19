const chrome = {
    storage: {
        local: {
            set: (value) => {
                chrome.storage.local._setCalls.push(value)
            },
            get: () => {
                return {}
            },
            _setCalls: []
        },
        managed: {
            get: () => {}
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
        getManifest: () => ({ version: '1234.56' }),
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
