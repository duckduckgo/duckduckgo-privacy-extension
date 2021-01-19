const FormAnalyzer = require('./FormAnalyzer')
const {addInlineStyles, removeInlineStyles} = require('./autofill-utils')
const {daxBase64} = require('./logo-svg')
const {setValue, isEventWithinDax} = require('./autofill-utils')

const INLINE_DAX_STYLES = {
    'background-size': {jsName: 'backgroundSize', val: 'auto 24px'},
    'background-position': {jsName: 'backgroundPosition', val: 'center right'},
    'background-repeat': {jsName: 'backgroundRepeat', val: 'no-repeat'},
    'background-origin': {jsName: 'backgroundOrigin', val: 'content-box'},
    'background-image': {jsName: 'backgroundImage', val: `url('data:image/svg+xml;base64,${daxBase64}')`}
}

const INLINE_AUTOFILLED_STYLES = {
    'background-color': {jsName: 'backgroundColor', val: '#F8F498'},
    'color': {jsName: 'color', val: '#333333'}
}

class Form {
    constructor (form, input, attachTooltip) {
        this.form = form
        this.formAnalyzer = new FormAnalyzer(form, input)
        this.attachTooltip = attachTooltip
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
            removeInlineStyles(input, INLINE_AUTOFILLED_STYLES)
            input.classList.remove('ddg-autofilled')
        }
        this.removeAllHighlights = () => {
            this.execOnInputs(this.removeInputHighlight)
        }
        this.removeInputDecoration = (input) => {
            removeInlineStyles(input, INLINE_DAX_STYLES)
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

    addListener (el, type, fn) {
        el.addEventListener(type, fn)
        this.listeners.add({el, type, fn})
    }

    decorateInput (input) {
        input.setAttribute('data-ddg-autofill', 'true')
        addInlineStyles(input, INLINE_DAX_STYLES)
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
                this.attachTooltip(this, e.target)
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
            addInlineStyles(input, INLINE_AUTOFILLED_STYLES)

            // If the user changes the alias, remove the decoration
            input.addEventListener('input', this.removeAllHighlights, {once: true})
        })
        if (this.tooltip) {
            this.removeTooltip()
        }
    }
}

module.exports = Form
