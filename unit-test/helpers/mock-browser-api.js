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
        sendMessage: () => {}
    }
}
