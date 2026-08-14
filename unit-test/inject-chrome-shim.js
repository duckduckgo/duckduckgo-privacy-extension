const chrome = {
    alarms: {
        create() {},
        get() {},
        clear() {},
        onAlarm: {
            addListener() {},
            removeListener() {},
        },
    },
    browserAction: {
        setIcon: () => {},
    },
    contextMenus: {
        create: () => {},
        onClicked: {
            addListener: () => {},
        },
    },
    declarativeNetRequest: {
        isRegexSupported() {
            return { isSupported: true };
        },
        getDynamicRules() {},
        getSessionRules() {},
        updateDynamicRules() {},
        updateSessionRules() {},
    },
    i18n: {
        getUILanguage() {
            return 'en-US';
        },
    },
    runtime: {
        id: '577dc9b9-c381-115a-2246-3f95fe0e6ffe',
        sendMessage: () => {},
        getManifest: () => {
            return { version: '1234.56' };
        },
        setUninstallURL: () => {},
        getURL: (path) => path,
        onConnect: {
            addListener() {},
            removeListener() {},
        },
        onInstalled: {
            addListener() {},
            removeListener() {},
        },
        onMessage: {
            addListener() {},
            removeListener() {},
        },
        onPerformanceWarning: {
            addListener(listener) {
                chrome.runtime.onPerformanceWarning._listeners.push(listener);
            },
            _listeners: [],
        },
        onStartup: {
            addListener() {},
            removeListener() {},
        },
        getContexts: () => Promise.resolve([]),
    },
    storage: {
        local: {
            set: (value) => {
                chrome.storage.local._setCalls.push(value);
            },
            get: (args, respond) => {
                respond({});
            },
            _setCalls: [],
        },
        managed: {
            get: (args, respond) => {
                respond({});
            },
        },
    },
    tabs: {
        onActivated: {
            addListener() {},
            removeListener() {},
        },
        onUpdated: {
            addListener() {},
            removeListener() {},
        },
        sendMessage: () => {},
        query: () => Promise.resolve([]),
        get: () => Promise.resolve(null),
        update: () => Promise.resolve(),
        reload: () => Promise.resolve(),
    },
    webNavigation: {
        onBeforeNavigate: {
            addListener() {},
            removeListener() {},
        },
        onCommitted: {
            addListener() {},
            removeListener() {},
        },
        onCompleted: {
            addListener() {},
            removeListener() {},
        },
        onErrorOccurred: {
            addListener() {},
            removeListener() {},
        },
    },
    webRequest: {
        OnBeforeSendHeadersOptions: {},
        OnHeadersReceivedOptions: {},
        onBeforeRequest: {
            addListener() {},
            removeListener() {},
        },
        onBeforeSendHeaders: {
            addListener() {},
            removeListener() {},
        },
        onCompleted: {
            addListener() {},
            removeListener() {},
        },
        onErrorOccurred: {
            addListener() {},
            removeListener() {},
        },
        onHeadersReceived: {
            addListener() {},
            removeListener() {},
        },
    },
    windows: {
        WINDOW_ID_NONE: -1,
        onFocusChanged: {
            addListener() {},
            removeListener() {},
        },
        getLastFocused: () => Promise.resolve({ id: 1, focused: true }),
    },
};
export { chrome as 'globalThis.chrome', chrome };
