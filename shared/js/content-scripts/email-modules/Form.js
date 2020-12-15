const DDGAutofill = require('./DDGAutofill')
const FormAnalyzer = require('./FormAnalyzer')
const {setValue, isEventWithinDax} = require('./autofill-utils')

class Form {
    constructor (form, input) {
        this.form = form
        this.relevantInputs = new Set()
        this.addInput(input)
        const formAnalyzer = new FormAnalyzer(form, input)
        if (formAnalyzer.autofillSignal > 0) this.decorateInputs()
        this.tooltip = null
        this.activeInput = null

        this.intObs = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) this.removeTooltip()
            }
        })

        this.removeTooltip = (e) => {
            if (e && (e.target === this.activeInput || e.target === this.tooltip)) {
                return
            }
            document.body.removeChild(this.tooltip)
            this.tooltip = null
            this.input = null
            window.removeEventListener('mousedown', this.removeTooltip)
        }
        this.removeAllHighlights = () => {
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

    attachTooltip (input) {
        if (this.tooltip) return

        this.activeInput = input
        this.tooltip = new DDGAutofill(input, this)
        document.body.appendChild(this.tooltip)
        window.addEventListener('mousedown', this.removeTooltip)
    }

    decorateInputs () {
        window.requestAnimationFrame(() => {
            this.execOnInputs((input) => {
                input.setAttribute('data-ddg-autofill', 'true')
                input.addEventListener('mousemove', (e) => {
                    if (isEventWithinDax(e, input)) {
                        input.style.cursor = 'pointer'
                    } else {
                        input.style.cursor = 'auto'
                    }
                })
                input.addEventListener('mousedown', (e) => {
                    if (!e.isTrusted) return
                    if (e.button !== 0) return

                    if (isEventWithinDax(e, input) || this.areAllInputsEmpty()) {
                        e.preventDefault()
                        e.stopImmediatePropagation()

                        this.attachTooltip(input)
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
            input.addEventListener('input', this.removeAllHighlights, {once: true})
        })
        this.removeTooltip()
    }

    // Static methods are called by the contextual menu
    static removeHighlight (e) {
        e.target.classList.remove('ddg-autofilled')
    }
    static autofillInput (input, alias) {
        setValue(input, alias)
        input.classList.add('ddg-autofilled')

        // If the user changes the alias, remove the decoration
        input.addEventListener('input', Form.removeHighlight, {once: true})
    }
}

module.exports = Form
