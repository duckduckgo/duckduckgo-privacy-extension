const logo = chrome.runtime.getURL('img/ddg-logo-borderless.svg')

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
        display: flex;
        justify-content: center;
        align-items: center;
        width: 30px;
        height: 30px;
        padding: 0;
        border: none;
        text-align: center;
        background: transparent;
        cursor: pointer;
    }
    .trigger > img {
        width: 24px;
        height: 24px;
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
                        input.value = res.alias
                        input.style.backgroundColor = '#fcfab8'
                        input.style.color = '#222222'

                        // If the user changes the alias, remove the decoration
                        input.addEventListener('input', () => {
                            this.execOnInputs(input => {
                                input.style.removeProperty('background-color')
                                input.style.removeProperty('color')
                            })
                        }, {once: true})
                    })
                }
            })
        }
        this.resetInputs = () => {
            this.execOnInputs(input => {
                input.value = ''
                input.style.removeProperty('background-color')
                input.style.removeProperty('color')
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
