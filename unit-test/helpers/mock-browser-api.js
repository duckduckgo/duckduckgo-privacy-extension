globalThis.browser = {
    storage: {
        local: {
            set: () => {},
            get: () => {
                return {}
            }
        }
    },
    browserAction: {
        setIcon: () => {}
    },
    runtime: {
        id: '577dc9b9-c381-115a-2246-3f95fe0e6ffe',
        sendMessage: () => {},
        getManifest: () => ({ version: '1234.56' }),
        setUninstallURL: () => {},
        getURL: path => path
    },
    tabs: {
        sendMessage: () => {}
    }
}
globalThis.chrome = globalThis.browser
