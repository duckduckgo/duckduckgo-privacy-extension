(() => {
    require('@webcomponents/webcomponentsjs')
    const DDGAutofill = require('./email-modules/DDGAutofill')
    const Form = require('./email-modules/Form')

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
            chrome.runtime.sendMessage(event.data)
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
            // If we don't have user data yet, notify the web app that we are ready to receive it…
            notifyWebApp({extensionInstalled: true})
            // …then listen for when the user data is set
            chrome.runtime.onMessage.addListener((message, sender) => {
                if (sender.id === chrome.runtime.id && message.type === 'ddgUserReady') {
                    injectEmailAutofill()
                    notifyWebApp({extensionSignedIn: {value: true}})
                }
            })
        }
    })

    const injectEmailAutofill = () => {
        // Here we store a map of input -> button associations
        const inputButtonMap = new Map()
        const forms = new Map()

        customElements.define('ddg-autofill', DDGAutofill)

        const updateAllButtons = () => {
            inputButtonMap.forEach((button) => {
                DDGAutofill.updateButtonPosition(button)
            })
        }

        const intObs = new IntersectionObserver(entries => {
            for (const entry of entries) {
                const input = entry.target
                if (entry.isIntersecting) {
                    // If is intersecting and visible (note that `display:none` will never intersect)
                    if (window.getComputedStyle(input).visibility !== 'hidden') {
                        const associatedForm = forms.get(input.form) || forms.get(input)
                        const button = new DDGAutofill(input, associatedForm)
                        document.body.appendChild(button)
                        // Keep track of the input->button pair
                        inputButtonMap.set(input, button)
                    }
                } else {
                    // If it's not intersecting and we have the input stored…
                    if (inputButtonMap.has(input)) {
                        // …remove the button from the DOM
                        inputButtonMap.get(input).remove()
                        // …and remove the input from the map
                        inputButtonMap.delete(input)
                    }
                }
            }
        })

        const EMAIL_SELECTOR = `
        input:not([type])[name*=mail i]:not([readonly]):not([disabled]):not([hidden]),
        input[type=""][name*=mail i]:not([readonly]):not([disabled]):not([hidden]),
        input[type=text][name*=mail i]:not([readonly]):not([disabled]):not([hidden]),
        input:not([type])[id*=mail i]:not([readonly]):not([disabled]):not([hidden]),
        input[type=""][id*=mail i]:not([readonly]):not([disabled]):not([hidden]),
        input[type=text][id*=mail i]:not([readonly]):not([disabled]):not([hidden]),
        input[type=email]:not([readonly]):not([disabled]):not([hidden]),
        input[aria-label*=mail i],
        input[placeholder*=mail i]:not([readonly])
    `

        const findEligibleInput = context => {
            context.querySelectorAll(EMAIL_SELECTOR)
                .forEach(input => {
                    const parentForm = input.form
                    if (parentForm) {
                        if (forms.has(parentForm)) {
                            // If we've already met the form, add the input
                            forms.get(parentForm).addInput(input)
                        } else {
                            forms.set(parentForm, new Form(parentForm, input, intObs))
                        }
                    } else {
                        // If input is not associated with a form, analyse the page
                        forms.set(input, new Form(null, input, intObs))
                    }
                })
            forms.forEach((formObj, formEl) => {
                console.log(formEl, formObj.autofillSignal, formObj.signals)
                if (formObj.autofillSignal > 0) {
                    formObj.decorateInputs()
                }
            })
        }

        findEligibleInput(document)

        // For all DOM mutations, search for new eligible inputs and update existing inputs positions
        const mutObs = new MutationObserver((mutationList) => {
            for (const mutationRecord of mutationList) {
                if (mutationRecord.type === 'childList') {
                    // We query only within the context of added/removed nodes
                    mutationRecord.addedNodes.forEach(el => {
                        if (el instanceof HTMLElement) {
                            window.requestIdleCallback(() =>
                                findEligibleInput(el)
                            )
                        }
                    })
                }

                if (mutationRecord.type === 'attributes') {
                    updateAllButtons()
                }
            }
        })
        mutObs.observe(document.body, {childList: true, subtree: true, attributes: true})

        const resObs = new ResizeObserver(entries => entries.forEach(updateAllButtons))
        resObs.observe(document.body);

        // Update the position if transitions or animations are detected just in case
        ['transitionend', 'animationend'].forEach(
            eventType => window.addEventListener(eventType, () => updateAllButtons())
        )
    }
})()
