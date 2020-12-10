(() => {
    // Polyfills/shims
    require('intersection-observer')
    require('./requestIdleCallback')
    require('@webcomponents/webcomponentsjs')

    const DDGAutofill = require('./DDGAutofill')
    const Form = require('./Form')

    // Font-face must be declared in the host page, otherwise it won't work in the shadow dom
    const regFontUrl = chrome.runtime.getURL('public/font/ProximaNova-Reg-webfont.woff2')
    const boldFontUrl = chrome.runtime.getURL('public/font/ProximaNova-Bold-webfont.woff2')
    const daxUrl = chrome.runtime.getURL('img/ddg-logo-borderless.svg')
    const styleTag = document.createElement('style')
    document.head.appendChild(styleTag)
    const sheet = styleTag.sheet
    sheet.insertRule(`
@font-face {
    font-family: 'DDG_ProximaNova';
    src: url(${regFontUrl}) format('woff2');
    font-weight: normal;
    font-style: normal;
}
    `)
    sheet.insertRule(`
@font-face {
    font-family: 'DDG_ProximaNova';
    src: url(${boldFontUrl}) format('woff2');
    font-weight: bold;
    font-style: normal;
}
    `)
    sheet.insertRule(`
.ddg-autofilled {
    background-color: #F8F498;
    color: #333333;
}
    `)
    sheet.insertRule(`
input[data-ddg-autofill] {
    background-image: url(${daxUrl}) !important;
    background-size: auto 24px !important;
    background-position: center right 2px !important;
    background-repeat: no-repeat !important;
    background-origin: content-box !important;
}
    `)

    const ddgDomainRegex = new RegExp(/^https:\/\/(([a-z0-9-_]+?)\.)?duckduckgo\.com/)

    // Send a message to the web app (only on DDG domains)
    const notifyWebApp = (message) => {
        if (window.origin.match(ddgDomainRegex)) {
            window.postMessage(message, window.origin)
        }
    }

    // Listen for sign in message from the ddg email page
    window.addEventListener('message', (event) => {
        if (!event.origin.match(ddgDomainRegex)) return

        // The web app notifies us that the user signed in
        if (event.data.addUserData) {
            chrome.runtime.sendMessage(event.data, (res) => {
                console.log('Extension login result', res)
            })
        }

        // The web app wants to know if the user is signed in
        if (event.data.checkExtensionSignedIn) {
            chrome.runtime.sendMessage({getSetting: {name: 'userData'}}, userData => {
                notifyWebApp({extensionSignedIn: {value: userData && userData.nextAlias}})
            })
        }
    })

    // Check if we already have user data
    chrome.runtime.sendMessage({getSetting: {name: 'userData'}}, userData => {
        if (userData && userData.nextAlias) {
            injectEmailAutofill()
            notifyWebApp({extensionSignedIn: {value: true}})
        } else {
            // If we don't have user data yet, notify the web app that we are ready to receive it
            notifyWebApp({extensionInstalled: true})
        }
    })

    // When the extension is ready, notify the web app and inject the autofill script
    chrome.runtime.onMessage.addListener((message, sender) => {
        if (sender.id === chrome.runtime.id && message.type === 'ddgUserReady') {
            notifyWebApp({extensionSignedIn: {value: true}})
            injectEmailAutofill()
        }
    })

    const injectEmailAutofill = () => {
        // Here we store a map of input -> button associations
        const inputButtonMap = new Map()
        const forms = new Map()

        if (!customElements.get('ddg-autofill')) {
            customElements.define('ddg-autofill', DDGAutofill)
        }

        const updateAllButtons = () => {
            inputButtonMap.forEach((button) => {
                DDGAutofill.updateButtonPosition(button)
            })
        }

        const intObs = new IntersectionObserver(entries => {})

        const EMAIL_SELECTOR = `
            input:not([type])[name*=mail i]:not([readonly]):not([disabled]):not([hidden]):not([aria-hidden=true]),
            input[type=""][name*=mail i]:not([readonly]):not([disabled]):not([hidden]):not([aria-hidden=true]),
            input[type=text][name*=mail i]:not([readonly]):not([disabled]):not([hidden]):not([aria-hidden=true]),
            input:not([type])[id*=mail i]:not([readonly]):not([disabled]):not([hidden]):not([aria-hidden=true]),
            input[type=""][id*=mail i]:not([readonly]):not([disabled]):not([hidden]):not([aria-hidden=true]),
            input[type=text][placeholder*=mail i]:not([readonly]):not([disabled]):not([hidden]):not([aria-hidden=true]),
            input[type=""][placeholder*=mail i]:not([readonly]):not([disabled]):not([hidden]):not([aria-hidden=true]),
            input:not([type])[placeholder*=mail i]:not([readonly]):not([disabled]):not([hidden]):not([aria-hidden=true]),
            input[type=email]:not([readonly]):not([disabled]):not([hidden]):not([aria-hidden=true]),
            input[type=text][aria-label*=mail i],
            input:not([type])[aria-label*=mail i],
            input[type=text][placeholder*=mail i]:not([readonly])
        `

        let count = 0
        const ensureDDGElementsAreLast = () => {
            // If DDG els are not the last in the doc, move them there
            if (inputButtonMap.size && document.body.lastElementChild.nodeName !== 'DDG-AUTOFILL') {
                inputButtonMap.forEach(button => button.remove())

                // Try up to 5 times to avoid infinite loop in case someone is doing the same
                if (count < 15) {
                    document.body.append(...inputButtonMap.values())
                    count++
                } else {
                    // Reset count so we can resume normal flow
                    count = 0
                    console.info(`DDG autofill bailing out`)
                }
            }
        }

        const addInput = input => {
            const parentForm = input.form

            if (forms.has(parentForm)) {
                // If we've already met the form, add the input
                forms.get(parentForm).addInput(input)
            } else {
                forms.set(parentForm || input, new Form(parentForm, input, intObs))
            }
        }

        const findEligibleInput = context => {
            if (context.nodeName === 'INPUT' && context.matches(EMAIL_SELECTOR)) {
                addInput(context)
            } else {
                context.querySelectorAll(EMAIL_SELECTOR).forEach(addInput)
            }
        }

        findEligibleInput(document)

        // For all DOM mutations, search for new eligible inputs and update existing inputs positions
        const mutObs = new MutationObserver((mutationList) => {
            for (const mutationRecord of mutationList) {
                if (mutationRecord.type === 'childList') {
                    // We query only within the context of added/removed nodes
                    mutationRecord.addedNodes.forEach(el => {
                        if (el.nodeName === 'DDG-AUTOFILL') return

                        if (el instanceof HTMLElement) {
                            window.requestIdleCallback(() => {
                                findEligibleInput(el)
                                ensureDDGElementsAreLast()
                            })
                        }
                    })
                }
            }
            updateAllButtons()
        })
        mutObs.observe(document.body, {childList: true, subtree: true, attributes: true})

        const resObs = new ResizeObserver(entries => entries.forEach(updateAllButtons))
        resObs.observe(document.body)

        // Update the position if transitions or animations are detected just in case
        const pageEvents = ['transitionend', 'animationend', 'load']
        pageEvents.forEach(
            eventType => window.addEventListener(eventType, updateAllButtons)
        )

        // Cleanup on logout events
        chrome.runtime.onMessage.addListener((message, sender) => {
            if (sender.id === chrome.runtime.id && message.type === 'logout') {
                // remove buttons, listeners, and clear observers
                intObs.disconnect()
                mutObs.disconnect()
                resObs.disconnect()
                pageEvents.forEach(
                    eventType => window.removeEventListener(eventType, updateAllButtons)
                )
                inputButtonMap.forEach((button, input) => {
                    setValue(input, '')
                    input.classList.remove('ddg-autofilled')
                    button.remove()
                })
                inputButtonMap.clear()
                forms.clear()
                notifyWebApp({extensionSignedIn: {value: false}})
            }
        })
    }

    // Add contextual menu listeners
    const { setValue } = require('./autofill-utils')
    let activeEl = null
    document.addEventListener('contextmenu', e => {
        activeEl = e.target
    })
    chrome.runtime.onMessage.addListener((message, sender) => {
        if (sender.id === chrome.runtime.id && message.type === 'contextualAutofill') {
            Form.autofillInput(activeEl, message.alias)
        }
    })
})()
