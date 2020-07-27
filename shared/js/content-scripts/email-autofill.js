(() => {
    class Form {
        constructor (form, input) {
            this.form = form
            this.relevantInputs = new Set()
            this.addInput(input)
            this.autofillSignal = 0
            this.signals = []
            this.loginRegex = new RegExp(/sign(ing)?.?in(?!g)|log.?in/i)
            this.signupRegex = new RegExp(/sign(ing)?.?up|join|register|newsletter|subscri(be|ption)|contact|create|start/i)
            this.conservativeSignupRegex = new RegExp(/sign.?up|join|register|newsletter|subscri(be|ption)/i)
            this.evaluateElAttributes(input)
            form ? this.evaluateForm() : this.evaluatePage()
            return this
        }

        addInput (input) {
            this.relevantInputs.add(input)
            return this
        }

        decorateInputs () {
            this.relevantInputs.forEach(input => {
                input.style.backgroundColor = 'red'
                input.style.boxShadow = '0 0 25px red'
            })
            return this
        }

        increaseSignalBy (strength, signal) {
            this.autofillSignal += strength
            this.signals.push(`${signal}: +${strength}`)
            return this
        }

        decreaseSignalBy (strength, signal) {
            this.autofillSignal -= strength
            this.signals.push(`${signal}: -${strength}`)
            return this
        }

        evaluateElAttributes (el, signalStrength = 3) {
            Array.from(el.attributes).forEach(attr => {
                const attributeString = `${attr.nodeName}=${attr.nodeValue}`
                if (attributeString.match(this.loginRegex)) this.decreaseSignalBy(signalStrength, `${el.nodeName} attr: ${attributeString}`)
                if (attributeString.match(this.signupRegex)) this.increaseSignalBy(signalStrength, `${el.nodeName} attr: ${attributeString}`)
            })
        }

        evaluatePageTitle () {
            const pageTitle = document.title
            if (pageTitle.match(this.loginRegex)) this.decreaseSignalBy(2, `page title: ${pageTitle}`)
            if (pageTitle.match(this.signupRegex)) this.increaseSignalBy(2, `page title: ${pageTitle}`)
        }

        evaluatePageHeadings () {
            const headings = document.querySelectorAll('h1, h2, h3')
            if (headings) {
                headings.forEach(({textContent}) => {
                    if (textContent.match(this.loginRegex)) this.decreaseSignalBy(0.5, `generic: ${textContent}`)
                    if (textContent.match(this.conservativeSignupRegex)) this.increaseSignalBy(0.5, `generic: ${textContent}`)
                })
            }
        }

        evaluatePage () {
            this.evaluatePageTitle()
            this.evaluatePageHeadings()
            // Check for submit buttons
            const buttons = document.querySelectorAll(`
                button[type=submit],
                button:not([type]),
                [role=button]
            `)
            buttons.forEach(button => {
                // if the button has a form, it's not related to our input, because our input has no form here
                if (!button.form && !button.closest('form')) {
                    this.evaluateElAttributes(button, 0.5)
                }
            })
        }

        evaluateForm () {
            // Check page title
            this.evaluatePageTitle()

            // Check form attributes
            this.evaluateElAttributes(this.form)

            // Check form contents
            this.form.querySelectorAll('*').forEach(el => {
                // Skip select and option elements because they contain a lot of noise
                if (!['OPTION', 'SELECT'].includes(el.nodeName.toUpperCase())) {
                    // check submit button or input[type=submit]
                    if (el.nodeName.toUpperCase() === 'INPUT' && el.type === 'submit') {
                        if (el.value.match(this.loginRegex)) this.decreaseSignalBy(2, `submit: ${el.value}`)
                        if (el.value.match(this.signupRegex)) this.increaseSignalBy(2, `submit: ${el.value}`)
                    }
                    // check button contents
                    if (
                        el.nodeName.toUpperCase() === 'BUTTON' && el.type === 'submit' ||
                        (el.getAttribute('role') || '').toUpperCase() === 'BUTTON'
                    ) {
                        if (el.textContent.match(this.loginRegex)) this.decreaseSignalBy(2, `submit: ${el.textContent}`)
                        if (el.textContent.match(this.signupRegex)) this.increaseSignalBy(2, `submit: ${el.textContent}`)
                    }
                    // if a link points to relevant urls or contain contents outside the page…
                    if (
                        el.nodeName === 'A' && el.href && el.href !== '#' ||
                        (el.getAttribute('role') || '').toUpperCase() === 'LINK'
                    ) {
                        // …and matches one of the regexes, we assume the match is not pertinent to the current form
                        if (el.textContent.match(this.loginRegex)) this.increaseSignalBy(1, `external link: ${el.textContent}`)
                        if (el.textContent.match(this.signupRegex)) this.decreaseSignalBy(1, `external link: ${el.textContent}`)
                    } else {
                        // any other case
                        if (el.textContent.match(this.loginRegex)) this.decreaseSignalBy(1, `generic: ${el.textContent}`)
                        if (el.textContent.match(this.signupRegex)) this.increaseSignalBy(1, `generic: ${el.textContent}`)
                    }
                }
            })
            // If we can't decide at this point, try reading page headings
            if (this.autofillSignal === 0) {
                this.evaluatePageHeadings()
            }
            return this
        }
    }

    const findEligibleInput = context => {
        const forms = new Map()
        context.querySelectorAll(`
                input:not([type])[name*=email i]:not([readonly]):not([disabled]):not([hidden]),
                input[type=""][name*=email i]:not([readonly]):not([disabled]):not([hidden]),
                input[type=text][name*=email i]:not([readonly]):not([disabled]):not([hidden]),
                input:not([type])[id*=email i]:not([readonly]):not([disabled]):not([hidden]),
                input[type=""][id*=email i]:not([readonly]):not([disabled]):not([hidden]),
                input[type=text][id*=email i]:not([readonly]):not([disabled]):not([hidden]),
                input[type=email]:not([readonly]):not([disabled]):not([hidden]),
                input[aria-label*=email i],
                input[placeholder*=email i]:not([readonly])
            `)
            .forEach(input => {
                const parentForm = input.form
                if (parentForm) {
                    if (forms.has(parentForm)) {
                        // If we've already met the form, add the input
                        forms.get(parentForm).addInput(input)
                    } else {
                        forms.set(parentForm, new Form(parentForm, input))
                    }
                } else {
                    // If input is not associated with a form, analyse the page
                    forms.set(input, new Form(null, input))
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
    const observer = new MutationObserver((mutationList) => {
        mutationList.forEach(mutationRecord => {
            if (mutationRecord.type === 'childList') {
                // We query only within the context of added/removed nodes
                mutationRecord.addedNodes.forEach(el => {
                    if (el instanceof HTMLElement) {
                        findEligibleInput(el)
                    }
                })
            }
        })
    })
    observer.observe(document.body, {childList: true, subtree: true, attributes: true})
})()
