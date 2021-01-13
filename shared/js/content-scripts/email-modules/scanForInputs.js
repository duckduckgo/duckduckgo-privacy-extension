const Form = require('./Form')
const {notifyWebApp} = require('./autofill-utils')
const DDGAutofill = require('./DDGAutofill')

const scanForInputs = () => {
    notifyWebApp({deviceSignedIn: {value: true}})
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
            // remove Dax, listeners, and observers
            mutObs.disconnect()
            forms.forEach(form => {
                form.resetAllInputs()
                form.removeAllDecorations()
            })
            forms.clear()
            notifyWebApp({deviceSignedIn: {value: false}})
        }
    })
}

module.exports = scanForInputs
