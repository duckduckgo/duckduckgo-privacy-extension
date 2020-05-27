/**
 * DuckDuckGo's ATB pipeline to facilitate various experiments.
 * Please see https://duck.co/help/privacy/atb for more information.
 */

const settings = require('./settings.es6')
const parseUserAgentString = require('../shared-utils/parse-user-agent-string.es6')
const load = require('./load.es6')
const browserWrapper = require('./$BROWSER-wrapper.es6')

const ATB_ERROR_COHORT = 'v1-1'
const ATB_FORMAT_RE = /(v\d+-\d(?:[a-z_]{2})?)$/

// list of accepted params in ATB url
const ACCEPTED_URL_PARAMS = ['natb', 'cp', 'npi']

let dev = false

const ATB = (() => {
    // regex to match ddg urls to add atb params to.
    // Matching subdomains, searches, and newsletter page
    const regExpAboutPage = /^https?:\/\/(\w+\.)?duckduckgo\.com\/(\?.*|about#newsletter)/
    const ddgAtbURL = 'https://duckduckgo.com/atb.js?'

    return {
        updateSetAtb: () => {
            let atbSetting = settings.getSetting('atb')
            let setAtbSetting = settings.getSetting('set_atb')

            let errorParam = ''

            // client shouldn't have a falsy ATB value,
            // so mark them as having gone into an errored state
            // next time they won't send the e=1 param
            if (!atbSetting) {
                atbSetting = ATB_ERROR_COHORT
                settings.updateSetting('atb', ATB_ERROR_COHORT)
                errorParam = '&e=1'
            }

            let randomValue = Math.ceil(Math.random() * 1e7)
            let url = `${ddgAtbURL}${randomValue}&atb=${atbSetting}&set_atb=${setAtbSetting}${errorParam}`

            return load.JSONfromExternalFile(url).then((res) => {
                settings.updateSetting('set_atb', res.data.version)

                if (res.data.updateVersion) {
                    settings.updateSetting('atb', res.data.updateVersion)
                }
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

        setInitialVersions: (numTries) => {
            numTries = numTries || 0
            if (settings.getSetting('atb') || numTries > 5) return Promise.resolve()

            let randomValue = Math.ceil(Math.random() * 1e7)
            let url = ddgAtbURL + randomValue

            return load.JSONfromExternalFile(url).then((res) => {
                settings.updateSetting('atb', res.data.version)
            }, () => {
                console.log('couldn\'t reach atb.js for initial server call, trying again')
                numTries += 1

                return new Promise((resolve) => {
                    setTimeout(resolve, 500)
                }).then(() => {
                    return ATB.setInitialVersions(numTries)
                })
            })
        },

        finalizeATB: (params) => {
            let atb = settings.getSetting('atb')

            // build query string when atb param wasn't acquired from any URLs
            const paramString = params && params.has('atb') ? params.toString() : `atb=${atb}`

            // make this request only once
            if (settings.getSetting('extiSent')) return

            settings.updateSetting('extiSent', true)
            settings.updateSetting('set_atb', atb)

            // just a GET request, we only care that the request was made
            load.url(`https://duckduckgo.com/exti/?${paramString}`)
        },

        // iterate over a list of accepted params, and retrieve them from a URL
        // builds a new query string containing only accepted params
        getAcceptedParamsFromURL: (url) => {
            const validParams = new URLSearchParams()
            const parsedParams = (new URL(url)).searchParams

            ACCEPTED_URL_PARAMS.forEach(param => {
                if (parsedParams.has(param)) {
                    validParams.append(
                        param === 'natb' ? 'atb' : param,
                        parsedParams.get(param)
                    )
                }
            })

            // Only return params if URL contains valid atb value
            if (validParams.has('atb') && ATB_FORMAT_RE.test(validParams.get('atb'))) {
                return validParams
            }

            return new URLSearchParams()
        },

        updateATBValues: () => {
            // wait until settings is ready to try and get atb from the page
            return settings.ready()
                .then(ATB.setInitialVersions)
                .then(browserWrapper.getDDGTabUrls)
                .then((urls) => {
                    let atb
                    let params

                    urls.some(url => {
                        params = ATB.getAcceptedParamsFromURL(url)
                        atb = params.has('atb') && params.get('atb')
                        return !!atb
                    })

                    if (atb) {
                        settings.updateSetting('atb', atb)
                        if (params && params.has('npi')) {
                            settings.updateSetting('isMultiStepOnboarding', true)
                        }
                    }

                    ATB.finalizeATB(params)
                })
        },

        openPostInstallPage: () => {
            // only show post install page on install if:
            // - the user wasn't already looking at the app install page
            // - the user hasn't seen the page before
            settings.ready().then(() => {
                // Special case for the cross product promotion on desktop (cppd) experiment
                if (settings.getSetting('isMultiStepOnboarding')) {
                    // We find the tab containing the cross product promotion modal
                    // and inject a content script that will notify the page that the
                    // extension was successfully installed
                    // Note: that we don't know on which window that tab is
                    chrome.tabs.query({}, (tabs) => {
                        const tab = tabs.find((tab) => {
                            const { hostname, searchParams } = new URL(tab.url)

                            return (
                                hostname.split('.').slice(-2).join('.') === 'duckduckgo.com' &&
                                searchParams.has('natb') &&
                                searchParams.has('npi')
                            )
                        })

                        const file = 'public/js/content-scripts/onboarding.js'
                        if (tab) {
                            chrome.tabs.highlight({
                                tabs: [tab.index],
                                windowId: tab.windowId
                            }, () => {
                                chrome.tabs.executeScript(tab.id, { file })
                            })
                        }
                    })
                } else {
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
                }
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

        getSurveyURL: () => {
            let url = ddgAtbURL + Math.ceil(Math.random() * 1e7) + '&uninstall=1&action=survey'
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
            if (dev) url += `&test=1`

            return url
        },

        setDevMode: () => {
            dev = true
        }
    }
})()

settings.ready().then(() => {
    // set initial uninstall url
    browserWrapper.setUninstallURL(ATB.getSurveyURL())
})

module.exports = ATB
