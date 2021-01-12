(() => {
    // Polyfills/shims
    require('intersection-observer')
    require('./requestIdleCallback')
    require('@webcomponents/webcomponentsjs')

    const DDGAutofill = require('./DDGAutofill')
    const Form = require('./Form')

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
        if (event.data.checkDeviceSignedIn) {
            chrome.runtime.sendMessage({getSetting: {name: 'userData'}}, userData => {
                notifyWebApp({deviceSignedIn: {value: userData && userData.nextAlias}})
            })
        }
    })

    // Check if we already have user data
    chrome.runtime.sendMessage({getSetting: {name: 'userData'}}, userData => {
        if (userData && userData.nextAlias) {
            injectEmailAutofill()
            notifyWebApp({deviceSignedIn: {value: true}})
        } else {
            // If we don't have user data yet, notify the web app that we are ready to receive it
            notifyWebApp({extensionInstalled: true})
        }
    })

    // When the extension is ready, notify the web app and inject the autofill script
    chrome.runtime.onMessage.addListener((message, sender) => {
        if (sender.id === chrome.runtime.id && message.type === 'ddgUserReady') {
            notifyWebApp({deviceSignedIn: {value: true}})
            injectEmailAutofill()
        }
    })

    const injectEmailAutofill = () => {
        const forms = new Map()

        if (!customElements.get('ddg-autofill')) {
            customElements.define('ddg-autofill', DDGAutofill)
        }

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

        const addInput = input => {
            const parentForm = input.form

            if (forms.has(parentForm)) {
                // If we've already met the form, add the input
                forms.get(parentForm).addInput(input)
            } else {
                forms.set(parentForm || input, new Form(parentForm, input))
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
                            })
                        }
                    })
                }
            }
        })
        mutObs.observe(document.body, {childList: true, subtree: true})

        // Cleanup on logout events
        chrome.runtime.onMessage.addListener((message, sender) => {
            if (sender.id === chrome.runtime.id && message.type === 'logout') {
                // remove buttons, listeners, and clear observers
                mutObs.disconnect()
                forms.clear()
                notifyWebApp({deviceSignedIn: {value: false}})
            }
        })
    }

    // Add contextual menu listeners
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
