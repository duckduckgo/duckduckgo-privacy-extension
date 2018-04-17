const settings = require('./settings.es6')
const utils = require('./utils.es6')

var ATB = (() => {
    // regex to match ddg urls to add atb params to.
    // Matching subdomains, searches, and newsletter page
    const regExpAboutPage = /^https?:\/\/(\w+\.)?duckduckgo\.com\/(\?.*|about#newsletter)/
    const ddgAtbURL = 'https://duckduckgo.com/atb.js?'

    return {
        updateSetAtb: () => {
            return new Promise((resolve) => {
                let atbSetting = settings.getSetting('atb'),
                    setAtbSetting = settings.getSetting('set_atb')

                if(!atbSetting || !setAtbSetting)
                    resolve(null)

                ATB.getSetAtb(atbSetting, setAtbSetting).then((newAtb) => {
                    if(newAtb !== setAtbSetting){
                        settings.updateSetting('set_atb', newAtb)
                    }
                    resolve(newAtb)
                })
            })
        },

        getSetAtb: (atbSetting, setAtb) => {
            return new Promise((resolve) => {
                var xhr = new XMLHttpRequest()

                xhr.onreadystatechange = function() {
                    if(xhr.readyState === XMLHttpRequest.DONE){
                        if(xhr.status == 200){
                            let curATB = JSON.parse(xhr.responseText)
                            resolve(curATB.version)
                        }
                    }
                }

                let randomValue = Math.ceil(Math.random() * 1e7)
                let AtbRequestURL = ddgAtbURL + randomValue + '&atb=' + atbSetting + '&set_atb=' + setAtb

                xhr.open('GET', AtbRequestURL, true )
                xhr.send()
            })
        },

        redirectURL: (request) => {
            if(request.url.search(regExpAboutPage) !== -1){

                if(request.url.indexOf('atb=') !== -1){
                    return
                }

                let atbSetting = settings.getSetting('atb')

                if(!atbSetting){
                    return
                }

                // handle anchor tags for pages like about#newsletter
                let urlParts = request.url.split('#')
                let newURL = request.url

                // if we have an anchor tag
                if (urlParts.length === 2) {
                    newURL = urlParts[0] + '&atb=' + atbSetting + '#' + urlParts[1]
                }
                else {
                    newURL = request.url + '&atb=' + atbSetting
                }

                return {redirectUrl: newURL}
            }
        },

        setInitialVersions: () => {
            if(!settings.getSetting('atb')){
                let versions = ATB.calculateInitialVersions()
                if(versions && versions.major && versions.minor){
                    settings.updateSetting('atb', `v${versions.major}-${versions.minor}`)
                }
            }
        },

        calculateInitialVersions: () => {
            let oneWeek = 604800000,
                oneDay = 86400000,
                oneHour = 3600000,
                oneMinute = 60000,
                estEpoch = 1456290000000,
                localDate = new Date(),
                localTime = localDate.getTime(),
                utcTime = localTime + (localDate.getTimezoneOffset() * oneMinute),
                est = new Date(utcTime + (oneHour * -5)),
                dstStartDay = 13 - ((est.getFullYear() - 2016) % 6),
                dstStopDay = 6 - ((est.getFullYear() - 2016) % 6),
                isDST = (est.getMonth() > 2 || (est.getMonth() == 2 && est.getDate() >= dstStartDay)) && (est.getMonth() < 10 || (est.getMonth() == 10 && est.getDate() < dstStopDay)),
                epoch = isDST ? estEpoch - oneHour : estEpoch,
                timeSinceEpoch = new Date().getTime() - epoch,
                majorVersion = Math.ceil(timeSinceEpoch / oneWeek),
                minorVersion = Math.ceil(timeSinceEpoch % oneWeek / oneDay)
            return {'major': majorVersion, 'minor': minorVersion}
        },

        setAtbValuesFromSuccessPage: (atb) => {
            if(settings.getSetting('set_atb')){ return }

            settings.updateSetting('atb', atb)
            settings.updateSetting('set_atb', atb)

            let xhr = new XMLHttpRequest()
            xhr.open('GET', 'https://duckduckgo.com/exti/?atb=' + atb, true)
            xhr.send()
        },

        inject: () => {
            chrome.tabs.query({ url: 'https://*.duckduckgo.com/*' }, function (tabs) {
                var i = tabs.length, tab
                while (i--) {
                    tab = tabs[i]

                    chrome.tabs.executeScript(tab.id, {
                        file: '/public/js/content-scripts/on-install.js'
                    })

                    chrome.tabs.insertCSS(tab.id, {
                        file: '/public/css/noatb.css'
                    })
                }
            })
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
            settings.ready().then( () => {
                chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
                    const domain = (tabs && tabs[0]) ? tabs[0].url : ''
                    if (this.canShowPostInstall(domain)) {
                            settings.updateSetting('hasSeenPostInstall', true)
                            chrome.tabs.create({
                                url: 'https://duckduckgo.com/app?post=1'
                            })
                    }
                })
            })
        },

        canShowPostInstall: (domain) => {
            const regExpPostInstall = /duckduckgo\.com\/app/
            const regExpSoftwarePage = /duckduckgo\.com\/software/

            if (!(domain && settings)) return false

            return !settings.getSetting('hasSeenPostInstall')
                && !domain.match(regExpPostInstall)
                && !domain.match(regExpSoftwarePage);
        },

        migrate: () => {
            // migrate localStorage ATB from the old extension over to settings
            if(!settings.getSetting('atb') && localStorage['atb']) {
                settings.updateSetting('atb', localStorage['atb'])
            }

            if(!settings.getSetting('set_atb') && localStorage['set_atb']) {
                settings.updateSetting('set_atb', localStorage['set_atb'])
            }
        },

        getSurveyURL: () => {
            let url = 'https://duckduckgo.com/atb.js?' + Math.ceil(Math.random() * 1e7) + '&uninstall=1&action=survey'
            let atb = settings.getSetting('atb')
            let set_atb = settings.getSetting('set_atb')
            if (atb) url += `&atb=${atb}`
            if (set_atb) url += `&set_atb=${set_atb}`

            let browserInfo = utils.parseUserAgentString()
            let browserName = browserInfo.browser
            let browserVersion = browserInfo.version
            let extensionVersion = window.chrome.runtime.getManifest().version

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
    chrome.runtime.setUninstallURL(ATB.getSurveyURL())
})

module.exports = ATB
