/* global safari:false */
let context

if (safari &&
        safari.extension &&
        safari.extension.globalPage &&
        safari.extension.globalPage.contentWindow) {
    context = 'popup'
} else if (safari &&
        safari.self &&
        safari.self.tab) {
    context = 'extensionPage'
} else {
    throw new Error('safari-ui-wrapper couldn\'t figure out the context it\'s in')
}

let reloadTab = () => {
    var activeTab = window.safari.application.activeBrowserWindow.activeTab
    activeTab.url = activeTab.url
}

let closePopup = () => {
    window.safari.self.hide()
}

/**
 * Messaging to/from the background page
 *
 * Unlike Chrome, Safari has different contexts for the popups and extension pages
 *
 * In extension pages, it's impossible to send a message along with a callback
 * for a reply, so for messages that need a response (e.g. getSetting) we need to
 * keep track of them via an ID
 */

let pendingMessages = {}

let sendExtensionPageMessage = (message, resolve, reject) => {
    if (message.whitelisted) {
        resolve(safari.self.tab.dispatchMessage('whitelisted', message))
    } else if (message.getSetting) {
        let id = Math.random()
        message.id = id
        pendingMessages[id] = resolve
        safari.self.tab.dispatchMessage('getSetting', message)
    } else if (message.getExtensionVersion) {
        let id = Math.random()
        message.id = id
        pendingMessages[id] = resolve
        safari.self.tab.dispatchMessage('getExtensionVersion', message)
    } else if (message.updateSetting) {
        resolve(safari.self.tab.dispatchMessage('updateSetting', message))
    }
}

if (context === 'extensionPage') {
    safari.self.addEventListener('message', (e) => {
        if (e.name !== 'backgroundResponse' || !e.message.id) {
            return
        }

        let pendingResolve = pendingMessages[e.message.id]

        if (!pendingResolve) { return }

        delete pendingMessages[e.message.id]
        pendingResolve(e.message.data)
    }, true)
}

let fetch = (message) => {
    return new Promise((resolve, reject) => {
        console.log(`Safari Fetch: ${JSON.stringify(message)}`)
        if (context === 'popup') {
            safari.extension.globalPage.contentWindow.message(message, resolve)
        } else if (context === 'extensionPage') {
            sendExtensionPageMessage(message, resolve, reject)
        }
    })
}

let backgroundMessage = (thisModel) => {
    // listen for messages from background
    safari.self.addEventListener('message', (req) => {
        if (req.whitelistChanged) {
            // notify subscribers that the whitelist has changed
            thisModel.set('whitelistChanged', true)
        } else if (req.updateTrackerCount) {
            thisModel.set('updateTrackerCount', true)
        }
    })
}

let getBackgroundTabData = () => {
    return new Promise((resolve) => {
        fetch({getCurrentTab: true}).then((tab) => {
            if (tab) {
                let tabCopy = JSON.parse(JSON.stringify(tab))
                resolve(tabCopy)
            } else {
                resolve()
            }
        })
    })
}

let search = (url) => {
    // in Chrome, adding the ATB param is handled by ATB.redirectURL()
    // which doesn't happen on Safari
    fetch({ getSetting: { name: 'atb' } }).then((atb) => {
        safari.application.activeBrowserWindow.openTab().url = `https://duckduckgo.com/?q=${url}&bext=safari&atb=${atb}`
        safari.self.hide()
    })
}

let getExtensionURL = (path) => {
    return safari.extension.baseURI + path
}

let openExtensionPage = (path) => {
    // Chrome needs an opening slash, Safari breaks if you add it
    if (path.indexOf('/') === 0) {
        path = path.substr(1)
    }

    let url = getExtensionURL(path)

    if (context === 'popup') {
        let tab = safari.application.activeBrowserWindow.openTab()
        tab.url = url
        safari.self.hide()
    } else {
        // note: this will only work if this is happening as a direct response
        // to a user click - otherwise it'll be blocked by Safari's popup blocker
        window.open(url, '_blank')
    }
}

let openOptionsPage = () => {
    openExtensionPage('/html/options.html')
}

module.exports = {
    fetch: fetch,
    reloadTab: reloadTab,
    closePopup: closePopup,
    backgroundMessage: backgroundMessage,
    getBackgroundTabData: getBackgroundTabData,
    search: search,
    openOptionsPage: openOptionsPage,
    openExtensionPage: openExtensionPage,
    getExtensionURL: getExtensionURL
}
