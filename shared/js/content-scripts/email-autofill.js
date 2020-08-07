(() => {
    // Here we store a map of input -> button associations
    const inputButtonMap = new Map()

    class Button {
        constructor (input) {
            this.input = input
            this.inputRightMargin = parseInt(getComputedStyle(this.input).paddingRight)
            this.animationFrame = null
            this.topPosition = 0
            this.leftPosition = 0
            this.createButton()
            return this
        }

        createButton () {
            this.button = document.createElement('button')
            this.button.textContent = '🦆'
            this.button.type = 'button'
            this.button.style.cssText = `
                position: absolute;
                width: 30px;
                height: 30px;
                padding: 0;
                border: 1px solid green;
                border-radius: 50%;
                text-align: center;
                background-color: #eee;
                transform: translateY(-50%);
                z-index: 2147483647;
            `
            this.button.onclick = async (e) => {
                e.preventDefault()
                e.stopPropagation()
                this.input.value = 'example_alias@duck.com'
                this.createTooltip()
            }
            window.requestAnimationFrame(() => {
                document.body.appendChild(this.button)
                this.updateButtonPosition()
            })
        }

        updateButtonPosition () {
            if (this.animationFrame) {
                console.log('canceling')
                window.cancelAnimationFrame(this.animationFrame)
            }

            this.animationFrame = window.requestAnimationFrame(() => {
                console.log('animationframecallback')
                const {right, top, height} = this.input.getBoundingClientRect()
                const currentTop = `${top + window.scrollY + height / 2}px`
                const currentLeft = `${right + window.scrollX - 30 - this.inputRightMargin}px`

                if (currentTop !== this.topPosition) {
                    this.button.style.top = currentTop
                    this.topPosition = currentTop
                }
                if (currentLeft !== this.leftPosition) {
                    this.button.style.left = currentLeft
                    this.leftPosition = currentLeft
                }

                this.animationFrame = null
            })
        }
    }

    const updateAllButtons = () => {
        inputButtonMap.forEach((button) => {
            button.updateButtonPosition()
        })
    }

    const intObs = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const input = entry.target
            if (entry.isIntersecting) {
                console.log('intersecting')
                // If is intersecting and visible (note that `display:none` will never intersect)
                if (window.getComputedStyle(input).visibility !== 'hidden') {
                    // Keep track of the input->button pair
                    const button = new Button(input)
                    inputButtonMap.set(input, button)
                }
            } else {
                // If it's not intersecting and we have the input stored…
                if (inputButtonMap.has(input)) {
                    // …remove the button from the DOM
                    inputButtonMap.get(input).button.remove()
                    console.log('input removed')
                    // …and remove the input from the map
                    inputButtonMap.delete(input)
                }
            }
        })
    })

    class Form {
        constructor (form, input) {
            this.form = form
            this.relevantInputs = new Set()
            this.addInput(input)
            this.autofillSignal = 0
            this.signals = []
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

                    intObs.observe(input)
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

        updateSignal ({
            string, // The string to check
            strength, // Strength of the signal
            signalType = 'generic', // For debugging purposes, we give a name to the signal
            shouldFlip = false, // Flips the signals, i.e. when a link points outside. See below
            shouldCheckUnifiedForm = false, // Should check for login/signup forms
            shouldBeConservative = false // Should use the conservative signup regex
        }) {
            const loginRegex = new RegExp(/sign(ing)?.?in(?!g)|log.?in/i)
            const signupRegex = new RegExp(
                /sign(ing)?.?up|join|regist(er|ration)|newsletter|subscri(be|ption)|contact|create|start/i
            )
            const conservativeSignupRegex = new RegExp(/sign.?up|join|register|newsletter|subscri(be|ption)/i)
            const strictSignupRegex = new RegExp(/sign.?up|join|register/i)
            const loginMatches = string.match(loginRegex)

            // Check explicitly for unified login/signup forms. They should always be negative, so we increase signal
            if (shouldCheckUnifiedForm && loginMatches && string.match(strictSignupRegex)) {
                this.decreaseSignalBy(strength + 2, `Unified detected ${signalType}`)
                return this
            }

            const signupMatches = string.match(shouldBeConservative ? conservativeSignupRegex : signupRegex)

            // In some cases a login match means the login is somewhere else, i.e. when a link points outside
            if (shouldFlip) {
                if (loginMatches) this.increaseSignalBy(strength, signalType)
                if (signupMatches) this.decreaseSignalBy(strength, signalType)
            } else {
                if (loginMatches) this.decreaseSignalBy(strength, signalType)
                if (signupMatches) this.increaseSignalBy(strength, signalType)
            }
            return this
        }

        evaluateElAttributes (el, signalStrength = 3, isInput = false) {
            Array.from(el.attributes).forEach(attr => {
                const attributeString = `${attr.nodeName}=${attr.nodeValue}`
                this.updateSignal({
                    string: attributeString,
                    strength: signalStrength,
                    signalType: `${el.nodeName} attr: ${attributeString}`,
                    shouldCheckUnifiedForm: isInput
                })
            })
        }

        evaluatePageTitle () {
            const pageTitle = document.title
            this.updateSignal({string: pageTitle, strength: 2, signalType: `page title: ${pageTitle}`})
        }

        evaluatePageHeadings () {
            const headings = document.querySelectorAll('h1, h2, h3')
            if (headings) {
                headings.forEach(({innerText}) => {
                    this.updateSignal({
                        string: innerText,
                        strength: 0.5,
                        signalType: `heading: ${innerText}`,
                        shouldCheckUnifiedForm: true,
                        shouldBeConservative: true
                    })
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
            const string = this.getText(el)

            // check button contents
            if (
                (el.nodeName.toUpperCase() === 'INPUT' && ['submit', 'button'].includes(el.type)) ||
                (el.nodeName.toUpperCase() === 'BUTTON' && el.type === 'submit') ||
                ((el.getAttribute('role') || '').toUpperCase() === 'BUTTON')
            ) {
                this.updateSignal({string, strength: 2, signalType: `submit: ${string}`})
            }
            // if a link points to relevant urls or contain contents outside the page…
            if (
                el.nodeName === 'A' && el.href && el.href !== '#' ||
                (el.getAttribute('role') || '').toUpperCase() === 'LINK'
            ) {
                // …and matches one of the regexes, we assume the match is not pertinent to the current form
                this.updateSignal({string, strength: 1, signalType: `external link: ${string}`, shouldFlip: true})
            } else {
                // any other case
                this.updateSignal({string, strength: 1, signalType: `generic: ${string}`, shouldCheckUnifiedForm: true})
            }
        }

        evaluateForm () {
            // Check page title
            this.evaluatePageTitle()

            // Check form attributes
            this.evaluateElAttributes(this.form)

            // Check form contents (skip select and option because they contain too much noise)
            this.form.querySelectorAll('*:not(select):not(option)').forEach(el => this.evaluateElement(el))

            // If we can't decide at this point, try reading page headings
            if (this.autofillSignal === 0) {
                this.evaluatePageHeadings()
            }
            return this
        }
    }

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
        const forms = new Map()
        context.querySelectorAll(EMAIL_SELECTOR)
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
    observer.observe(document.body, {childList: true, subtree: true, attributes: true});

    // Update the position if transitions or animations are detected just in case
    ['transitionend', 'animationend'].forEach(
        eventType => window.addEventListener(eventType, () => updateAllButtons())
    )
})()
