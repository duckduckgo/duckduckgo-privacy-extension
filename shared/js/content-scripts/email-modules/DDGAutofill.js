const logo = chrome.runtime.getURL('img/ddg-logo-borderless.svg')
const css = chrome.runtime.getURL('public/css/email-style.css')

class DDGAutofill extends HTMLElement {
    constructor (input, associatedForm) {
        super()
        const shadow = this.attachShadow({mode: 'open'})
        this.input = input
        this.associatedForm = associatedForm
        this.inputRightMargin = parseInt(getComputedStyle(this.input).paddingRight)
        this.animationFrame = null
        this.topPosition = 0
        this.leftPosition = 0

        shadow.innerHTML = `
<link rel="stylesheet" href="${css}">
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
</div>`
        this.wrapper = shadow.querySelector('.wrapper')
        this.trigger = shadow.querySelector('.trigger')
        this.tooltip = shadow.querySelector('.tooltip')
        this.dismissButton = shadow.querySelector('.js-dismiss')
        this.confirmButton = shadow.querySelector('.js-confirm')
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
            chrome.runtime.sendMessage({getAlias: true}, (res) => {
                if (res.alias) {
                    this.execOnInputs(input => {
                        if (input.classList.contains('ddg-autofilled')) return

                        input.value = res.alias
                        input.classList.add('ddg-autofilled')

                        // If the user changes the alias, remove the decoration
                        input.addEventListener('input', () => {
                            this.execOnInputs(input => {
                                input.classList.remove('ddg-autofilled')
                            })
                        }, {once: true})
                    })
                }
            })
        }
        this.resetInputs = () => {
            this.execOnInputs(input => {
                input.value = ''
                input.classList.remove('ddg-autofilled')
            })
        }

        this.input.addEventListener('focus', () => {
            if (this.areAllInputsEmpty()) {
                this.autofillInputs()
                this.showTooltip()
            }
        }, {once: true})

        this.trigger.addEventListener('click', () => {
            this.showTooltip()
        })
        this.dismissButton.addEventListener('click', (e) => {
            e.stopImmediatePropagation()
            this.resetInputs()
            this.hideTooltip()
        })
        this.confirmButton.addEventListener('click', (e) => {
            e.stopImmediatePropagation()
            this.autofillInputs()
            this.hideTooltip()
        })
    }
}

module.exports = DDGAutofill
