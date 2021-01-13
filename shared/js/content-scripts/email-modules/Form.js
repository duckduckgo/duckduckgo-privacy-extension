const DDGAutofill = require('./DDGAutofill')
const FormAnalyzer = require('./FormAnalyzer')
const {base64String} = require('./logo-svg')
const {setValue, isEventWithinDax} = require('./autofill-utils')

const INLINE_STYLES = {
    'background-size': {jsName: 'backgroundSize', val: 'auto 24px'},
    'background-position': {jsName: 'backgroundPosition', val: 'center right'},
    'background-repeat': {jsName: 'backgroundRepeat', val: 'no-repeat'},
    'background-origin': {jsName: 'backgroundOrigin', val: 'content-box'},
    'background-image': {jsName: 'backgroundImage', val: `url('data:image/svg+xml;base64,${base64String}')`}
}

class Form {
    constructor (form, input) {
        this.form = form
        this.formAnalyzer = new FormAnalyzer(form, input)
        this.relevantInputs = new Set()
        this.touched = new Set()
        this.listeners = new Set()
        this.addInput(input)
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
            this.intObs.disconnect()
            window.removeEventListener('mousedown', this.removeTooltip, {capture: true})
        }
        this.removeInputHighlight = (input) => {
            input.classList.remove('ddg-autofilled')
        }
        this.removeAllHighlights = () => {
            this.execOnInputs(this.removeInputHighlight)
        }
        this.removeInputDecoration = (input) => {
            Object.keys(INLINE_STYLES).forEach(prop => input.style.removeProperty(prop))
            input.removeAttribute('data-ddg-autofill')
        }
        this.removeAllDecorations = () => {
            this.execOnInputs(this.removeInputDecoration)
            this.listeners.forEach(({el, type, fn}) => el.removeEventListener(type, fn))
        }
        this.resetAllInputs = () => {
            this.execOnInputs((input) => {
                setValue(input, '')
                this.removeInputHighlight(input)
            })
            if (this.activeInput) this.activeInput.focus()
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
        if (this.formAnalyzer.autofillSignal > 0) this.decorateInput(input)
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
        this.intObs.observe(input)
        window.addEventListener('mousedown', this.removeTooltip, {capture: true})
    }

    addListener (el, type, fn) {
        el.addEventListener(type, fn)
        this.listeners.add({el, type, fn})
    }

    decorateInput (input) {
        input.setAttribute('data-ddg-autofill', 'true')
        Object.values(INLINE_STYLES)
            .forEach(({jsName, val}) => (input.style[jsName] = val))
        this.addListener(input, 'mousemove', (e) => {
            if (isEventWithinDax(e, e.target)) {
                e.target.style.cursor = 'pointer'
            } else {
                e.target.style.cursor = 'auto'
            }
        })
        this.addListener(input, 'mousedown', (e) => {
            if (!e.isTrusted) return
            if (e.button !== 0) return

            if (this.shouldOpenTooltip(e, e.target)) {
                e.preventDefault()
                e.stopImmediatePropagation()

                this.touched.add(e.target)
                this.attachTooltip(e.target)
            }
        })
        return this
    }

    shouldOpenTooltip (e, input) {
        return (!this.touched.has(input) && this.areAllInputsEmpty()) || isEventWithinDax(e, input)
    }

    autofill (alias) {
        this.execOnInputs((input) => {
            setValue(input, alias)
            input.classList.add('ddg-autofilled')

            // If the user changes the alias, remove the decoration
            input.addEventListener('input', this.removeAllHighlights, {once: true})
        })
        if (this.tooltip) {
            this.removeTooltip()
        }
    }
}

module.exports = Form
