const logo = chrome.runtime.getURL('img/ddg-logo-borderless.svg')
const css = chrome.runtime.getURL('public/css/email-autofill.css')
const daxSVG = require('./logo-svg')

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
    <button class="trigger">${daxSVG}</button>
    <div class="tooltip" hidden>
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
        this.trigger = shadow.querySelector('.trigger')
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

        /**
         * Use IntersectionObserver v2 to make sure the element is visible when clicked
         * https://developers.google.com/web/updates/2019/02/intersectionobserver-v2
         */
        this.safeExecute = (el, fn) => {
            const intObs = new IntersectionObserver((changes) => {
                for (const change of changes) {
                    // Feature detection
                    if (typeof change.isVisible === 'undefined') {
                        // The browser doesn't support Intersection Observer v2, falling back to v1 behavior.
                        change.isVisible = true;
                    }
                    if (change.isIntersecting && change.isVisible) {
                        fn()
                    }
                }
                intObs.disconnect()
            }, {trackVisibility: true, delay: 100})
            intObs.observe(el)
        }
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

        this.showTooltip = () => {
            if (!this.tooltip.hidden) {
                return
            }
            this.updateAliasInTooltip()
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
        this.execOnInputs = (fn) => {
            this.associatedForm.relevantInputs.forEach(fn)
        }
        this.areAllInputsEmpty = () => {
            let allEmpty = true
            this.execOnInputs(input => {
                if (input.value) allEmpty = false
            })
            return allEmpty
        }
        this.autofillInputs = () => {
            this.execOnInputs((input) => {
                input.value = this.nextAlias
                input.classList.add('ddg-autofilled')

                // If the user changes the alias, remove the decoration
                input.addEventListener('input', () => {
                    this.execOnInputs(input => {
                        input.classList.remove('ddg-autofilled')
                    })
                }, {once: true})
            })
            chrome.runtime.sendMessage({sendAutofillNotification: true})
            chrome.runtime.sendMessage({refreshAlias: true}, (res) => {
                if (res && res.alias) {
                    this.nextAlias = res.alias
                    this.updateAliasInTooltip()
                }
            })
        }
        this.resetInputs = () => {
            this.execOnInputs(input => {
                input.value = ''
                input.classList.remove('ddg-autofilled')
            })
        }

        this.input.addEventListener('mousedown', (e) => {
            if (!e.isTrusted) return

            if (this.areAllInputsEmpty()) {
                e.preventDefault()
                e.stopImmediatePropagation()
                this.showTooltip()
            }
        }, {once: true})

        this.trigger.addEventListener('click', (e) => {
            if (!e.isTrusted) return

            this.safeExecute(this.trigger, () => this.showTooltip())
        })
        this.dismissButton.addEventListener('click', (e) => {
            if (!e.isTrusted) return

            e.stopImmediatePropagation()
            this.resetInputs()
            this.hideTooltip()
            this.input.focus()
        })
        this.confirmButton.addEventListener('click', (e) => {
            if (!e.isTrusted) return
            e.stopImmediatePropagation()

            this.safeExecute(this.confirmButton, () => {
                this.autofillInputs()
                this.hideTooltip()
            })
        })
    }
}

module.exports = DDGAutofill
