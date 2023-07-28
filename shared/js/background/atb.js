/**
 * DuckDuckGo's ATB pipeline to facilitate various experiments.
 * Please see https://duck.co/help/privacy/atb for more information.
 */
import browser from 'webextension-polyfill'

const settings = require('./settings')
const parseUserAgentString = require('../shared-utils/parse-user-agent-string')
const load = require('./load')
const browserWrapper = require('./wrapper')
const { ATB_PARAM_RULE_ID } = require('./dnr-utils')
const { ATB_PARAM_PRIORITY } = require('@duckduckgo/ddg2dnr/lib/rulePriorities')
const { generateDNRRule } = require('@duckduckgo/ddg2dnr/lib/utils')

const ATB_ERROR_COHORT = 'v1-1'
const ATB_FORMAT_RE = /(v\d+-\d(?:[a-z_]{2})?)$/

// 00:00:00 EST on 2/24/16
const ATB_EPOCH = 1456290000000
const ONE_WEEK = 604800000
const ONE_DAY = 86400000
const ONE_HOUR = 3600000
const ONE_MINUTE = 60000

// list of accepted params in ATB url
const ACCEPTED_URL_PARAMS = ['natb', 'cp', 'npi']

const manifestVersion = browserWrapper.getManifestVersion()

const ATB = (() => {
    // regex to match ddg urls to add atb params to.
    // Matching subdomains, searches, newsletter page and chrome new tab page
    const regExpAboutPage = /^https?:\/\/([\w-]+\.)?duckduckgo\.com\/(\?.*|about#newsletter|chrome_newtab)/
    const matchPage = /^https:\/\/([\w-]+\.)?duckduckgo.com\/\?/
    const ddgAtbURL = 'https://duckduckgo.com/atb.js?'

    return {

        shouldUpdateSetAtb (request) {
            return matchPage.test(request.url)
        },

        updateSetAtb: async () => {
            await settings.ready()
            let atbSetting = settings.getSetting('atb')
            const setAtbSetting = settings.getSetting('set_atb')

            let errorParam = ''

            // client shouldn't have a falsy ATB value,
            // so mark them as having gone into an errored state
            // next time they won't send the e=1 param
            if (!atbSetting) {
                atbSetting = ATB_ERROR_COHORT
                settings.updateSetting('atb', ATB_ERROR_COHORT)
                ATB.setOrUpdateATBdnrRule(ATB_ERROR_COHORT)
                errorParam = '&e=1'
            }

            const user = settings.getSetting('userData')
            const emailSetting = user && user.userName ? 1 : 0

            const randomValue = Math.ceil(Math.random() * 1e7)
            // @ts-ignore
            const url = `${ddgAtbURL}${randomValue}&browser=${parseUserAgentString().browser}&atb=${atbSetting}&set_atb=${setAtbSetting}&email=${emailSetting}${errorParam}`

            return load.JSONfromExternalFile(url).then((res) => {
                settings.updateSetting('set_atb', res.data.version)

                if (res.data.updateVersion) {
                    settings.updateSetting('atb', res.data.updateVersion)
                    ATB.setOrUpdateATBdnrRule(res.data.updateVersion)
                } else if (atbSetting === ATB_ERROR_COHORT) {
                    settings.updateSetting('atb', res.data.version)
                    ATB.setOrUpdateATBdnrRule(res.data.version)
                }
            })
        },

        /**
        * Accept the URL of a main_frame request in progress. If atb parameters
        * should be added by redirection, mutate the URL to add the parameters
        * and return true. Otherwise, return false.
        * @param {URL} url
        *   The request URL.
        *   Note: This is mutated to add parameters where necessary.
        * @returns {boolean}
        *   True if parameters were added and the request should be redirected,
        *   false otherwise.
        */
        addParametersMainFrameRequestUrl (url) {
            if (url.searchParams.has('atb')) {
                return false
            }

            const atbSetting = settings.getSetting('atb')
            if (!atbSetting || !regExpAboutPage.test(url.href)) {
                return false
            }

            url.searchParams.append('atb', atbSetting)
            return true
        },

        setInitialVersions: (numTries) => {
            numTries = numTries || 0
            if (settings.getSetting('atb') || numTries > 5) return Promise.resolve()

            const randomValue = Math.ceil(Math.random() * 1e7)
            // @ts-ignore
            const url = ddgAtbURL + randomValue + '&browser=' + parseUserAgentString().browser
            return load.JSONfromExternalFile(url).then((res) => {
                settings.updateSetting('atb', res.data.version)
                ATB.setOrUpdateATBdnrRule(res.data.version)
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
            const atb = settings.getSetting('atb')

            // build query string when atb param wasn't acquired from any URLs
            let paramString = params && params.has('atb') ? params.toString() : `atb=${atb}`
            // @ts-ignore
            const browserName = parseUserAgentString().browser
            paramString += `&browser=${browserName}`

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
            if (url === '') return validParams
            const parsedParams = (new URL(url)).searchParams

            ACCEPTED_URL_PARAMS.forEach(param => {
                if (parsedParams.has(param)) {
                    validParams.append(
                        param === 'natb' ? 'atb' : param,
                        // @ts-ignore
                        parsedParams.get(param)
                    )
                }
            })

            // Only return params if URL contains valid atb value
            // @ts-ignore
            if (validParams.has('atb') && ATB_FORMAT_RE.test(validParams.get('atb'))) {
                return validParams
            }

            return new URLSearchParams()
        },

        /**
         * Takes an optional date object and returns an object with ATB majorVersion, minorVersion, and version string
         * The majorVersion rolls over every Wed at 00:00:00 ET
         * The minorVersion rolls over every night at midnight ET
         *
         * @typedef {Object} AtbVersionInfo
         * @property {number} majorVersion - # of weeks since noon EST on 2/24/16
         * @property {number} minorVersion - # of days into the current week
         * @property {string} version - the version string combining both major and minor version. Format: `v${majorVersion}-${minorVersion}`
         *
         * @return {AtbVersionInfo}
         */
        getATBVersionInfo: () => {
            const date = new Date()
            const localTime = date.getTime()

            // convert local to UTC:
            const utcTime = localTime + date.getTimezoneOffset() * ONE_MINUTE

            // convert to approximation of est using 5 hour offset so we
            // can compare to the DST start/stop date in eastern time and
            // determine whether it's DST or not.
            const est = new Date(utcTime + ONE_HOUR * -5)

            // First determine DST start/end day for Eastern Timezone.
            // It's always the 2nd Sunday in March. In 2016 it's 3/13/16 and 11/6/16, In 2017 it's 3/12/17 and 11/5/17, etc.
            const dstStartDay = 13 - ((est.getFullYear() - 2016) % 6)
            const dstStopDay = 6 - ((est.getFullYear() - 2016) % 6)

            // Once we have start/stop day for the current year, we can check whether the current day (based on est) is
            // within the EDT window:
            const isDST =
              (est.getMonth() > 2 ||
                (est.getMonth() === 2 && est.getDate() >= dstStartDay)) &&
              (est.getMonth() < 10 ||
                (est.getMonth() === 10 && est.getDate() < dstStopDay))

            // finally we need to adjust the epoch based on whether we're in EST or EDT, since
            // the constant ATB_EPOCH is in EST, when we're in EDT we need to subtract an
            // hour otherwise we'll be off by 1 hour when we try to calc the major/minor version #'s:
            const epoch = isDST ? ATB_EPOCH - ONE_HOUR : ATB_EPOCH

            // time in ms since DST adjusted epoch:
            const timeSinceATBEpoch = localTime - epoch

            const majorVersion = Math.ceil(timeSinceATBEpoch / ONE_WEEK)
            const minorVersion = Math.ceil((timeSinceATBEpoch % ONE_WEEK) / ONE_DAY)

            return {
                minorVersion: minorVersion,
                majorVersion: majorVersion,
                version: 'v' + majorVersion + '-' + minorVersion
            }
        },

        getChromeCounteractExpATB: (atbString) => {
            const variant = 'v'
            const atbVariant = Math.random() < 0.5 ? 'k' : 'k'
            return `${atbString}${variant}${atbVariant}`
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

                    // in case there is no assigned atb, enroll into Chrome Counteract experiment
                    if (!atb) {
                        atb = ATB.getChromeCounteractExpATB(ATB.getATBVersionInfo().version)
                    }

                    if (atb) {
                        settings.updateSetting('atb', atb)
                        ATB.setOrUpdateATBdnrRule(atb)
                    }

                    ATB.finalizeATB(params)
                })
        },

        openPostInstallPage: async () => {
            // only show post install page on install if:
            // - the user wasn't already looking at the app install page
            // - the user hasn't seen the page before
            await settings.ready()
            const tabs = await browser.tabs.query({ currentWindow: true, active: true })
            const domain = (tabs && tabs[0]) ? tabs[0].url : ''
            if (ATB.canShowPostInstall(domain)) {
                settings.updateSetting('hasSeenPostInstall', true)
                let postInstallURL = 'https://duckduckgo.com/extension-success'
                const atb = settings.getSetting('atb')
                postInstallURL += atb ? `?atb=${atb}` : ''
                browser.tabs.create({
                    url: postInstallURL
                })
            }
        },

        canShowPostInstall: (domain) => {
            const regExpPostInstall = /duckduckgo\.com\/app/
            const regExpSoftwarePage = /duckduckgo\.com\/software/

            if (!(domain && settings)) return false

            return !settings.getSetting('hasSeenPostInstall') &&
                !domain.match(regExpPostInstall) &&
                !domain.match(regExpSoftwarePage)
        },

        /**
        * Creates a DNR rule for ATB parameters
        * @param {string} atb
        */
        setOrUpdateATBdnrRule: (atb) => {
            if (!atb || manifestVersion !== 3) {
                return
            }

            const atbRule = generateDNRRule({
                id: ATB_PARAM_RULE_ID,
                priority: ATB_PARAM_PRIORITY,
                actionType: 'redirect',
                redirect: {
                    transform: {
                        queryTransform: {
                            addOrReplaceParams: [{ key: 'atb', value: atb }]
                        }
                    }
                },
                resourceTypes: ['main_frame'],
                requestDomains: ['duckduckgo.com'],
                regexFilter: regExpAboutPage.source
            })

            chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [atbRule.id],
                addRules: [atbRule]
            })
        },

        async getSurveyURL () {
            let url = ddgAtbURL + Math.ceil(Math.random() * 1e7) + '&uninstall=1&action=survey'
            const atb = settings.getSetting('atb')
            const setAtb = settings.getSetting('set_atb')
            if (atb) url += `&atb=${atb}`
            if (setAtb) url += `&set_atb=${setAtb}`

            const browserInfo = parseUserAgentString()
            // @ts-ignore
            const browserName = browserInfo.browser
            // @ts-ignore
            const browserVersion = browserInfo.version
            const extensionVersion = browserWrapper.getExtensionVersion()
            if (browserName) url += `&browser=${browserName}`
            if (browserVersion) url += `&bv=${browserVersion}`
            if (extensionVersion) url += `&v=${extensionVersion}`
            if (await browserWrapper.getFromSessionStorage('dev')) {
                url += '&test=1'
            }
            return url
        }
    }
})()

settings.ready().then(async () => {
    // set initial uninstall url
    browserWrapper.setUninstallURL(await ATB.getSurveyURL())
})

export default ATB
