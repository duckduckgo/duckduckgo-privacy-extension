(() => {
    class Form {
        constructor (form, input) {
            this.form = form
            this.relevantInputs = new Set()
            this.addInput(input)
            this.autofillSignal = 0
            this.signals = []
            this.loginRegex = new RegExp(/sign(ing)?.?in(?!g)|log.?in/i)
            this.signupRegex = new RegExp(/sign(ing)?.?up|join|regist(er|ration)|newsletter|subscri(be|ption)|contact|create|start/i)
            this.conservativeSignupRegex = new RegExp(/sign.?up|join|register|newsletter|subscri(be|ption)/i)
            this.strictSignupRegex = new RegExp(/sign.?up|join|register/i)
            this.evaluateElAttributes(input, 3, true)
            form ? this.evaluateForm() : this.evaluatePage()
            return this
        }

        addInput (input) {
            this.relevantInputs.add(input)
            return this
        }

        decorateInputs () {
            window.requestAnimationFrame(() => {
                this.relevantInputs.forEach(input => {
                    input.style.backgroundColor = 'red'
                    input.style.boxShadow = '0 0 25px red'
                    input.setAttribute('data-ddg-autofill', 'true')
                })
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

        evaluateElAttributes (el, signalStrength = 3, isInput = false) {
            Array.from(el.attributes).forEach(attr => {
                const attributeString = `${attr.nodeName}=${attr.nodeValue}`
                if (attributeString.match(this.loginRegex)) this.decreaseSignalBy(signalStrength, `${el.nodeName} attr: ${attributeString}`)
                if (attributeString.match(this.signupRegex)) this.increaseSignalBy(signalStrength, `${el.nodeName} attr: ${attributeString}`)
                // Check for unified login/signup forms only on the input attributes
                if (isInput) {
                    if (attributeString.match(this.loginRegex) && attributeString.match(this.strictSignupRegex)) {
                        this.decreaseSignalBy(3, `${el.nodeName} attr ratto: ${attributeString}`)
                    }
                }
            })
        }

        evaluatePageTitle () {
            const pageTitle = document.title
            if (pageTitle.match(this.loginRegex)) this.decreaseSignalBy(2, `page title: ${pageTitle}`)
            if (pageTitle.match(this.signupRegex)) this.increaseSignalBy(2, `page title: ${pageTitle}`)
            // Check for unified login/signup forms
            if (pageTitle.match(this.loginRegex) && pageTitle.match(this.strictSignupRegex)) {
                this.decreaseSignalBy(2, `page title: ${pageTitle}`)
            }
        }

        evaluatePageHeadings () {
            const headings = document.querySelectorAll('h1, h2, h3')
            if (headings) {
                headings.forEach(({innerText}) => {
                    if (innerText.match(this.loginRegex)) this.decreaseSignalBy(0.5, `heading: ${innerText}`)
                    if (innerText.match(this.conservativeSignupRegex)) this.increaseSignalBy(0.5, `heading: ${innerText}`)
                    // Check for unified login/signup forms
                    if (innerText.match(this.loginRegex) && innerText.match(this.strictSignupRegex)) {
                        this.decreaseSignalBy(3, `heading: ${innerText}`)
                    }
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

        getText (el) {
            // for buttons, we don't care about descendants, just get the whole text as is
            // this is important in order to give proper attribution of the text to the button
            if (el.nodeName.toUpperCase() === 'BUTTON') return el.innerText

            if (el.nodeName.toUpperCase() === 'INPUT' && ['submit', 'button'].includes(el.type)) return el.value

            return Array.from(el.childNodes).reduce((text, child) =>
                child.nodeName === '#text' ? text + ' ' + child.textContent : text, '')
        }

        evaluateElement (el) {
            // Skip select and option elements because they contain too much noise
            if (['OPTION', 'SELECT'].includes(el.nodeName.toUpperCase())) return

            const elText = this.getText(el)

            // check button contents
            if (
                (el.nodeName.toUpperCase() === 'INPUT' && ['submit', 'button'].includes(el.type)) ||
                (el.nodeName.toUpperCase() === 'BUTTON' && el.type === 'submit') ||
                ((el.getAttribute('role') || '').toUpperCase() === 'BUTTON')
            ) {
                if (elText.match(this.loginRegex)) this.decreaseSignalBy(2, `submit: ${elText}`)
                if (elText.match(this.signupRegex)) this.increaseSignalBy(2, `submit: ${elText}`)
            }
            // if a link points to relevant urls or contain contents outside the page…
            if (
                el.nodeName === 'A' && el.href && el.href !== '#' ||
                (el.getAttribute('role') || '').toUpperCase() === 'LINK'
            ) {
                // …and matches one of the regexes, we assume the match is not pertinent to the current form
                if (elText.match(this.loginRegex)) this.increaseSignalBy(1, `external link: ${elText}`)
                if (elText.match(this.signupRegex)) this.decreaseSignalBy(1, `external link: ${elText}`)
            } else {
                // any other case
                if (elText.match(this.loginRegex)) this.decreaseSignalBy(1, `generic: ${elText}`)
                if (elText.match(this.signupRegex)) this.increaseSignalBy(1, `generic: ${elText}`)
                if (elText.match(this.loginRegex) && elText.match(this.strictSignupRegex)) {
                    this.decreaseSignalBy(2, `generic: ${elText}`)
                }
            }
        }

        evaluateForm () {
            // Check page title
            this.evaluatePageTitle()

            // Check form attributes
            this.evaluateElAttributes(this.form)

            // Check form contents
            this.form.querySelectorAll('*').forEach(el => this.evaluateElement(el))

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
                input:not([type])[name*=mail i]:not([readonly]):not([disabled]):not([hidden]),
                input[type=""][name*=mail i]:not([readonly]):not([disabled]):not([hidden]),
                input[type=text][name*=mail i]:not([readonly]):not([disabled]):not([hidden]),
                input:not([type])[id*=mail i]:not([readonly]):not([disabled]):not([hidden]),
                input[type=""][id*=mail i]:not([readonly]):not([disabled]):not([hidden]),
                input[type=text][id*=mail i]:not([readonly]):not([disabled]):not([hidden]),
                input[type=email]:not([readonly]):not([disabled]):not([hidden]),
                input[aria-label*=mail i],
                input[placeholder*=mail i]:not([readonly])
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
                        window.requestIdleCallback(() =>
                            findEligibleInput(el)
                        )
                    }
                })
            }
        })
    })
    observer.observe(document.body, {childList: true, subtree: true, attributes: true})
})()
