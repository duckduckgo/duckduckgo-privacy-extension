(() => {
    require('@webcomponents/webcomponentsjs')

    // Here we store a map of input -> button associations
    const inputButtonMap = new Map()
    const logo = chrome.runtime.getURL('img/logo-small.svg')

    class DDGAutofill extends HTMLElement {
        constructor (input) {
            super()
            const shadow = this.attachShadow({mode: 'open'})
            this.input = input
            this.inputRightMargin = parseInt(getComputedStyle(this.input).paddingRight)
            this.animationFrame = null
            this.topPosition = 0
            this.leftPosition = 0

            shadow.innerHTML = `
<style>
    *, *::before, *::after {
        box-sizing: border-box;
    }
    .wrapper {
        position: absolute;
        top: 0;
        left: 0;
        width: 30px;
        height: 30px;
        padding: 0;
        transform: translateY(-50%);
        font-family: "Proxima Nova";
        z-index: 2147483647;
    }
    .trigger {
        width: 30px;
        height: 30px;
        padding: 0;
        border: none;
        text-align: center;
        background: transparent;
    }
    .trigger > img {
        width: 100%;
    }
    .tooltip {
        position: absolute;
        bottom: calc(100% + 15px);
        right: calc(100% - 60px);
        width: 350px;
        max-width: calc(100vw - 25px);
        padding: 25px;
        border: 1px solid #D0D0D0;
        border-radius: 20px;
        background-color: #FFFFFF;
        font-size: 14px;
        line-height: 1.4;
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
        z-index: 2147483647;
    }
    .tooltip::before {
        content: "";
        width: 0; 
        height: 0; 
        border-left: 10px solid transparent;
        border-right: 10px solid transparent;
        display: block;
        border-top: 12px solid #D0D0D0;
        position: absolute;
        right: 34px;
        bottom: -12px;
    }
    .tooltip::after {
        content: "";
        width: 0; 
        height: 0; 
        border-left: 10px solid transparent;
        border-right: 10px solid transparent;
        display: block;
        border-top: 12px solid #FFFFFF;
        position: absolute;
        right: 34px;
        bottom: -10px;
    }
    .tooltip strong {
        margin: 0 0 4px;
        color: #333333;
        font-size: 16px;
        font-weight: bold;
        line-height: 1.3;
    }    
    .tooltip p {
        margin: 4px 0 12px;
        color: #666666;
    }
    .tooltip__button-container {
        display: flex;
    }
    .tooltip__button {
        flex: 1;
        height: 40px;
        padding: 0 10px;
        background-color: #678FFF;
        color: #FFFFFF;
        border: none;
        border-radius: 10px;
        font-weight: bold;
    }
    .tooltip__button:last-child {
        margin-left: 12px;
    }
    .tooltip__button--secondary {
        background-color: #EEEEEE;
        color: #3E1D83;
    }
</style>
<div class="wrapper">
    <button class="trigger"><img src="${logo}" alt="Open the DuckDuckGo autofill tooltip" /></button>
    <div class="tooltip" hidden>
        <strong>Duck.com created a private alias for you.</strong>
        <p>Emails will be sent to you as usual, and you gain an extra level of privacy.</p>
        <div class="tooltip__button-container">
            <button class="tooltip__button tooltip__button--secondary js-dismiss">Don’t use</button>
            <button class="tooltip__button tooltip__button--primary js-confirm">Use Private Alias</button>
        </div>
    </div>
</div>
            `
            this.wrapper = shadow.querySelector('.wrapper')
            this.trigger = shadow.querySelector('.trigger')
            this.tooltip = shadow.querySelector('.tooltip')
            this.dismissButton = shadow.querySelector('.js-dismiss')
            this.confirmButton = shadow.querySelector('.js-confirm')
        }

        connectedCallback () {
            updateButtonPosition(this)

            this.showTooltip = () => {
                if (!this.tooltip.hidden) {
                    return
                }
                this.tooltip.hidden = false
                window.addEventListener('click', this.hideTooltip)
            }
            this.hideTooltip = (e) => {
                if (e && (e.target === this.input || e.target === this)) {
                    return
                }
                if (this.tooltip.hidden) {
                    return
                }
                this.tooltip.hidden = true
                window.removeEventListener('click', this.hideTooltip)
            }
            this.autofillInput = () => {
                this.input.value = 'example_alias@duck.com'
                this.input.style.backgroundColor = '#fcfab8'
            }
            this.resetInput = () => {
                this.input.value = ''
                this.input.style.removeProperty('background-color')
            }

            this.input.addEventListener('focus', () => {
                if (!this.input.value) this.autofillInput()
                this.showTooltip()
            }, {once: true})

            this.trigger.addEventListener('click', (e) => {
                e.stopImmediatePropagation()
                this.showTooltip()
            })
            this.dismissButton.addEventListener('click', (e) => {
                e.stopImmediatePropagation()
                this.resetInput()
                this.hideTooltip()
            })
            this.confirmButton.addEventListener('click', (e) => {
                e.stopImmediatePropagation()
                this.autofillInput()
                this.hideTooltip()
            })
        }
    }

    function updateButtonPosition (el) {
        if (el.animationFrame) {
            window.cancelAnimationFrame(el.animationFrame)
        }

        el.animationFrame = window.requestAnimationFrame(() => {
            const {right, top, height} = el.input.getBoundingClientRect()
            const currentTop = `${top + window.scrollY + height / 2}px`
            const currentLeft = `${right + window.scrollX - 30 - el.inputRightMargin}px`

            if (currentTop !== el.topPosition) {
                el.wrapper.style.top = currentTop
                el.topPosition = currentTop
            }
            if (currentLeft !== el.leftPosition) {
                el.wrapper.style.left = currentLeft
                el.leftPosition = currentLeft
            }

            el.animationFrame = null
        })
    }

    customElements.define('ddg-autofill', DDGAutofill)

    const updateAllButtons = () => {
        inputButtonMap.forEach((button) => {
            updateButtonPosition(button)
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
                    const button = new DDGAutofill(input)
                    document.body.appendChild(button)
                    inputButtonMap.set(input, button)
                }
            } else {
                // If it's not intersecting and we have the input stored…
                if (inputButtonMap.has(input)) {
                    // …remove the button from the DOM
                    inputButtonMap.get(input).remove()
                    console.log('button removed')
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
