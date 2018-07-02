const settings = require('./settings.es6')
const parseUserAgentString = require('../shared-utils/parse-user-agent-string.es6')
const load = require('./load.es6')
const browserWrapper = require('./$BROWSER-wrapper.es6')

var ATB = (() => {
    // regex to match ddg urls to add atb params to.
    // Matching subdomains, searches, and newsletter page
    const regExpAboutPage = /^https?:\/\/(\w+\.)?duckduckgo\.com\/(\?.*|about#newsletter)/
    const ddgAtbURL = 'https://duckduckgo.com/atb.js?'

    return {
        updateSetAtb: () => {
            return new Promise((resolve) => {
                let atbSetting = settings.getSetting('atb')
                let setAtbSetting = settings.getSetting('set_atb')

                if (!atbSetting) return resolve()

                let randomValue = Math.ceil(Math.random() * 1e7)
                let url = ddgAtbURL + randomValue + '&atb=' + atbSetting + '&set_atb=' + setAtbSetting

                load.JSONfromExternalFile(url, (res) => {
                    settings.updateSetting('set_atb', res.version)
                    resolve()
                })
            })
        },

        redirectURL: (request) => {
            if (request.url.search(regExpAboutPage) !== -1) {
                if (request.url.indexOf('atb=') !== -1) {
                    return
                }

                let atbSetting = settings.getSetting('atb')

                if (!atbSetting) {
                    return
                }

                // handle anchor tags for pages like about#newsletter
                let urlParts = request.url.split('#')
                let newURL = request.url
                let anchor = ''

                // if we have an anchor tag
                if (urlParts.length === 2) {
                    newURL = urlParts[0]
                    anchor = '#' + urlParts[1]
                }

                if (request.url.indexOf('?') !== -1) {
                    newURL += '&'
                } else {
                    newURL += '?'
                }

                newURL += 'atb=' + atbSetting + anchor

                return {redirectUrl: newURL}
            }
        },

        setInitialVersions: () => {
            if (settings.getSetting('atb')) return

            let randomValue = Math.ceil(Math.random() * 1e7)
            let url = ddgAtbURL + randomValue

            load.JSONfromExternalFile(url, (res) => {
                settings.updateSetting('atb', res.version)
            })
        },

        setAtbValuesFromSuccessPage: (atb) => {
            if (!atb) return

            settings.updateSetting('atb', atb)

            ATB.finalizeATB()
        },

        finalizeATB: () => {
            let atb = settings.getSetting('atb')

            if (!atb || settings.getSetting('set_atb')) return

            settings.updateSetting('set_atb', atb)

            load.url(`https://duckduckgo.com/exti/?atb=${atb}`, () => {
                // no-op, we only care that the request was made
            })
        },

        inject: () => {
            browserWrapper.getTabsByURL('https://*.duckduckgo.com/*', (tabs) => {
                let i = tabs.length
                let tab

                while (i--) {
                    tab = tabs[i]

                    browserWrapper.executeScript(tab.id, '/public/js/content-scripts/on-install.js')
                    browserWrapper.insertCSS(tab.id, '/public/css/noatb.css')
                }
            })

            // while we're waiting for any tabs to get back to us with an ATB version,
            // we're retrieving it from atb.js (see setInitialVersions)
            //
            // if there's no DDG tabs open or no tabs that can give us an ATB version,
            // fall back to version from atb.js
            setTimeout(ATB.finalizeATB, 1000)
        },

        updateATBValues: () => {
            // wait until settings is ready to try and get atb from the page
            settings.ready().then(() => {
                ATB.inject()
                ATB.migrate()
                ATB.setInitialVersions()
            })
        },

        openPostInstallPage: () => {
            // only show post install page on install if:
            // - the user wasn't already looking at the app install page
            // - the user hasn't seen the page before
            settings.ready().then(() => {
                chrome.tabs.query({currentWindow: true, active: true}, function (tabs) {
                    const domain = (tabs && tabs[0]) ? tabs[0].url : ''
                    if (ATB.canShowPostInstall(domain)) {
                        settings.updateSetting('hasSeenPostInstall', true)
                        let postInstallURL = 'https://duckduckgo.com/app?post=1'
                        const atb = settings.getSetting('atb')
                        postInstallURL += atb ? `&atb=${atb}` : ''
                        chrome.tabs.create({
                            url: postInstallURL
                        })
                    }
                })
            })
        },

        canShowPostInstall: (domain) => {
            const regExpPostInstall = /duckduckgo\.com\/app/
            const regExpSoftwarePage = /duckduckgo\.com\/software/

            if (!(domain && settings)) return false

            return !settings.getSetting('hasSeenPostInstall') &&
                !domain.match(regExpPostInstall) &&
                !domain.match(regExpSoftwarePage)
        },

        migrate: () => {
            // migrate localStorage ATB from the old extension over to settings
            if (!settings.getSetting('atb') && localStorage['atb']) {
                settings.updateSetting('atb', localStorage['atb'])
            }

            if (!settings.getSetting('set_atb') && localStorage['set_atb']) {
                settings.updateSetting('set_atb', localStorage['set_atb'])
            }
        },

        getSurveyURL: () => {
            let url = 'https://duckduckgo.com/atb.js?' + Math.ceil(Math.random() * 1e7) + '&uninstall=1&action=survey'
            let atb = settings.getSetting('atb')
            let setAtb = settings.getSetting('set_atb')
            if (atb) url += `&atb=${atb}`
            if (setAtb) url += `&set_atb=${setAtb}`

            let browserInfo = parseUserAgentString()
            let browserName = browserInfo.browser
            let browserVersion = browserInfo.version
            let extensionVersion = browserWrapper.getExtensionVersion()
            if (browserName) url += `&browser=${browserName}`
            if (browserVersion) url += `&bv=${browserVersion}`
            if (extensionVersion) url += `&v=${extensionVersion}`

            return url
        }
    }
})()

settings.ready().then(() => {
    // migrate over any localStorage values from the old extension
    ATB.migrate()

    // set initial uninstall url
    browserWrapper.setUninstallURL(ATB.getSurveyURL())
})

module.exports = ATB
