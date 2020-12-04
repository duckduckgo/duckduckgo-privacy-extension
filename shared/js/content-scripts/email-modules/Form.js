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
        return this
    }

    addInput (input) {
        this.relevantInputs.add(input)
        return this
    }

    decorateInputs () {
        window.requestAnimationFrame(() => {
            this.relevantInputs.forEach(input => {
                if (window.navigator.userAgent.includes('test')) {
                    input.setAttribute('data-ddg-autofill', 'true')
                }

                this.intObs.observe(input)
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
