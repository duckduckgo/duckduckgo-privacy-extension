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
        sendMessage: () => {},
        getManifest: () => ({ version: '1234.56' })
    }
}
