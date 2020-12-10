const css = chrome.runtime.getURL('public/css/email-autofill.css')
const daxSVG = require('./logo-svg')
const { safeExecute } = require('./autofill-utils')

class DDGAutofill extends HTMLElement {
    constructor (input, associatedForm) {
        super()
        const shadow = this.attachShadow({mode: 'closed'})
        this.input = input
        this.associatedForm = associatedForm
        this.inputRightMargin = parseInt(getComputedStyle(this.input).paddingRight)
        this.animationFrame = null
        this.topPosition = 0
        this.leftPosition = 0

        shadow.innerHTML = `
<link rel="stylesheet" href="${css}">
<div class="wrapper">
    <div class="tooltip">
        <h2 class="tooltip__title">For more privacy, use a Duck Address.</h2>
        <p>This address can be used to communicate with you, but won’t reveal your real email.</p>
        <div class="tooltip__alias-container">${daxSVG}<strong class="alias">${this.nextAlias}</strong>@duck.com</div>
        <div class="tooltip__button-container">
            <button class="tooltip__button tooltip__button--secondary js-dismiss">Don’t use</button>
            <button class="tooltip__button tooltip__button--primary js-confirm">Use Address</button>
        </div>
    </div>
</div>`
        this.wrapper = shadow.querySelector('.wrapper')
        this.tooltip = shadow.querySelector('.tooltip')
        this.dismissButton = shadow.querySelector('.js-dismiss')
        this.confirmButton = shadow.querySelector('.js-confirm')
        this.aliasEl = shadow.querySelector('.alias')

        this.updateAliasInTooltip = () => {
            const [alias] = this.nextAlias.split('@')
            this.aliasEl.textContent = alias
        }

        // Get the alias from the extension
        chrome.runtime.sendMessage({getAlias: true}, (res) => {
            if (res.alias) {
                this.nextAlias = res.alias
                this.updateAliasInTooltip()
            }
        })
    }

    static updateButtonPosition (el) {
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

    connectedCallback () {
        DDGAutofill.updateButtonPosition(this)

        this.dismissButton.addEventListener('click', (e) => {
            if (!e.isTrusted) return

            e.stopImmediatePropagation()
            this.associatedForm.dismissTooltip()
        })
        this.confirmButton.addEventListener('click', (e) => {
            if (!e.isTrusted) return
            e.stopImmediatePropagation()

            safeExecute(this.confirmButton, () => {
                this.associatedForm.autofill(this.nextAlias)
                chrome.runtime.sendMessage({refreshAlias: true}, (res) => {
                    if (res && res.alias) {
                        this.nextAlias = res.alias
                        this.updateAliasInTooltip()
                    }
                })
            })
        })
    }
}

module.exports = DDGAutofill
