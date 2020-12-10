const DDGAutofill = require('./DDGAutofill')
const {setValue} = require('./autofill-utils')

class Form {
    constructor (form, input, intObs) {
        this.form = form
        this.intObs = intObs
        this.relevantInputs = new Set()
        this.addInput(input)
        this.autofillSignal = 0
        this.signals = []
        this.evaluateElAttributes(input, 3, true)
        form ? this.evaluateForm() : this.evaluatePage()
        console.log(this, this.autofillSignal, this.signals)
        if (this.autofillSignal > 0) this.decorateInputs()
        this.tooltip = null
        this.activeInput = null

        this.removeTooltip = (e) => {
            if (e && (e.target === this.activeInput || e.target === this.tooltip)) {
                return
            }
            document.body.removeChild(this.tooltip)
            window.removeEventListener('mousedown', this.removeTooltip)
        }
        this.removeAllInputsDecoration = () => {
            this.execOnInputs((input) => input.classList.remove('ddg-autofilled'))
        }
        this.resetAllInputs = () => {
            this.execOnInputs((input) => {
                setValue(input, '')
                input.classList.remove('ddg-autofilled')
            })
            this.activeInput.focus()
        }
        this.dismissTooltip = () => {
            this.resetAllInputs()
            this.removeTooltip()
        }

        return this
    }

    execOnInputs (fn) {
        this.relevantInputs.forEach(fn)
    }

    addInput (input) {
        this.relevantInputs.add(input)
        return this
    }

    areAllInputsEmpty () {
        let allEmpty = true
        this.execOnInputs((input) => {
            if (input.value) allEmpty = false
        })
        return allEmpty
    }

    attachTooltip () {
        this.tooltip = new DDGAutofill(this.activeInput, this)
        document.body.appendChild(this.tooltip)
        window.addEventListener('mousedown', this.removeTooltip)
    }

    decorateInputs () {
        window.requestAnimationFrame(() => {
            this.execOnInputs((input) => {
                input.setAttribute('data-ddg-autofill', 'true')
                input.addEventListener('mousedown', (e) => {
                    if (!e.isTrusted) return
                    if (e.button !== 0) return

                    if (this.areAllInputsEmpty()) {
                        e.preventDefault()
                        e.stopImmediatePropagation()
                        this.activeInput = input

                        this.attachTooltip()
                    }
                })

                this.intObs.observe(input)
            })
        })
        return this
    }

    autofill (alias) {
        this.execOnInputs((input) => {
            setValue(input, alias)
            input.classList.add('ddg-autofilled')

            // If the user changes the alias, remove the decoration
            input.addEventListener('input', this.removeAllInputsDecoration, {once: true})
        })
        this.removeTooltip()
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
        const negativeRegex = new RegExp(/sign(ing)?.?in(?!g)|log.?in/i)
        const positiveRegex = new RegExp(
            /sign(ing)?.?up|join|regist(er|ration)|newsletter|subscri(be|ption)|contact|create|start|settings|preferences|profile|update/i
        )
        const conservativePositiveRegex = new RegExp(/sign.?up|join|register|newsletter|subscri(be|ption)|settings|preferences|profile|update/i)
        const strictPositiveRegex = new RegExp(/sign.?up|join|register|settings|preferences|profile|update/i)
        const matchesNegative = string.match(negativeRegex)

        // Check explicitly for unified login/signup forms. They should always be negative, so we increase signal
        if (shouldCheckUnifiedForm && matchesNegative && string.match(strictPositiveRegex)) {
            this.decreaseSignalBy(strength + 2, `Unified detected ${signalType}`)
            return this
        }

        const matchesPositive = string.match(shouldBeConservative ? conservativePositiveRegex : positiveRegex)

        // In some cases a login match means the login is somewhere else, i.e. when a link points outside
        if (shouldFlip) {
            if (matchesNegative) this.increaseSignalBy(strength, signalType)
            if (matchesPositive) this.decreaseSignalBy(strength, signalType)
        } else {
            if (matchesNegative) this.decreaseSignalBy(strength, signalType)
            if (matchesPositive) this.increaseSignalBy(strength, signalType)
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
        const headings = document.querySelectorAll('h1, h2, h3, [class*="title"]')
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

    elIs (el, type) {
        return el.nodeName.toLowerCase() === type.toLowerCase()
    }

    getText (el) {
        // for buttons, we don't care about descendants, just get the whole text as is
        // this is important in order to give proper attribution of the text to the button
        if (this.elIs(el, 'BUTTON')) return el.innerText

        if (this.elIs(el, 'INPUT') && ['submit', 'button'].includes(el.type)) return el.value

        return Array.from(el.childNodes).reduce((text, child) =>
            this.elIs(child, '#text') ? text + ' ' + child.textContent : text, '')
    }

    evaluateElement (el) {
        const string = this.getText(el)

        // check button contents
        if (
            (this.elIs(el, 'INPUT') && ['submit', 'button'].includes(el.type)) ||
            (this.elIs(el, 'BUTTON') && el.type === 'submit') ||
            ((el.getAttribute('role') || '').toUpperCase() === 'BUTTON')
        ) {
            this.updateSignal({string, strength: 2, signalType: `submit: ${string}`})
        }
        // if a link points to relevant urls or contain contents outside the page…
        if (
            this.elIs(el, 'A') && el.href && el.href !== '#' ||
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

module.exports = Form
