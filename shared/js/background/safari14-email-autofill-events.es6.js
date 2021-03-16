// Babel includes for async/await
import 'regenerator-runtime/runtime'

chrome.runtime.onInstalled.addListener(function (details) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            chrome.tabs.executeScript(tab.id, {file: 'public/js/content-scripts/email-autofill.js'})
        })
    })
})

/**
 * MESSAGES
 */

const settings = require('./settings.es6')
const {
    REFETCH_ALIAS_ALARM,
    fetchAlias,
    showContextMenuAction,
    hideContextMenuAction
} = require('./email-utils.es6')

// handle any messages that come from content/UI scripts
// returning `true` makes it possible to send back an async response
chrome.runtime.onMessage.addListener((req, sender, res) => {
    if (sender.id !== chrome.runtime.id) return

    if (req.updateSetting) {
        let name = req.updateSetting['name']
        let value = req.updateSetting['value']
        settings.ready().then(() => {
            settings.updateSetting(name, value)
        })
    } else if (req.getSetting) {
        let name = req.getSetting['name']
        settings.ready().then(() => {
            res(settings.getSetting(name))
        })

        return true
    }

    if (req.getAlias) {
        const userData = settings.getSetting('userData')
        res({alias: userData?.nextAlias})

        return true
    }

    if (req.refreshAlias) {
        fetchAlias().then(() => {
            const userData = settings.getSetting('userData')
            res({alias: userData?.nextAlias})
        })

        return true
    }

    if (req.addUserData) {
        // Check the origin. Shouldn't be necessary, but better safe than sorry
        if (!sender.url.match(/^https:\/\/(([a-z0-9-_]+?)\.)?duckduckgo\.com/)) return

        const {userName, token} = req.addUserData
        const {existingToken} = settings.getSetting('userData') || {}

        // If the user is already registered, just notify tabs that we're ready
        if (existingToken === token) {
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach((tab) => {
                    chrome.tabs.sendMessage(tab.id, {type: 'ddgUserReady'})
                })
            })
            return
        }

        // Check general data validity
        if (userName.match(/([a-z0-9_])+/) && token.match(/([a-z0-9])+/)) {
            settings.updateSetting('userData', req.addUserData)
            // Once user is set, fetch the alias and notify all tabs
            fetchAlias().then(response => {
                if (response && response.error) {
                    return res({error: response.error.message})
                }

                chrome.tabs.query({}, (tabs) => {
                    tabs.forEach((tab) => {
                        chrome.tabs.sendMessage(tab.id, {type: 'ddgUserReady'})
                    })
                })
                showContextMenuAction()
                res({success: true})
            })
        } else {
            res({error: 'Something seems wrong with the user data'})
        }

        return true
    }

    if (req.logout) {
        settings.updateSetting('userData', {})
        // Broadcast the logout to all tabs
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
                chrome.tabs.sendMessage(tab.id, {type: 'logout'})
            })
        })
        hideContextMenuAction()
    }
})

/**
 * ALARMS
 */

chrome.alarms.onAlarm.addListener(alarmEvent => {
    if (alarmEvent.name === REFETCH_ALIAS_ALARM) {
        fetchAlias()
    }
})

/**
 * on start up
 */
let onStartup = () => {
    settings.ready().then(async () => {
        // fetch alias if needed
        const userData = settings.getSetting('userData')
        if (userData && userData.token) {
            if (!userData.nextAlias) await fetchAlias()
            showContextMenuAction()
        }
    })
}

module.exports = {
    onStartup: onStartup
}
