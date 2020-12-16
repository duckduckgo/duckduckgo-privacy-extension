const css = chrome.runtime.getURL('public/css/email-autofill.css')
const daxSVG = require('./logo-svg')
const {getDaxBoundingBox} = require('./autofill-utils')
const { safeExecute } = require('./autofill-utils')

class DDGAutofill extends HTMLElement {
    constructor (input, associatedForm) {
        super()
        const shadow = this.attachShadow({mode: 'closed'})
        this.input = input
        this.associatedForm = associatedForm
        this.animationFrame = null

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

        this.top = 0
        this.left = 0
        this.transformRuleIndex = null
        this.updatePosition = function ({left, top}) {
            // return if the stylesheet is not loaded
            if (!shadow.styleSheets.length) return

            this.left = left
            this.top = top

            if (this.transformRuleIndex) {
                // If we have already set the rule, remove it…
                shadow.styleSheets[0].deleteRule(this.transformRuleIndex)
            } else {
                // …otherwise, set the index as the very last rule
                this.transformRuleIndex = shadow.styleSheets[0].rules.length
            }

            const newRule = `.wrapper {transform: translate(${left}px, ${top}px);}`
            shadow.styleSheets[0].insertRule(newRule, this.transformRuleIndex)
        }
    }

    static updateButtonPosition (el) {
        if (el.animationFrame) {
            window.cancelAnimationFrame(el.animationFrame)
        }

        el.animationFrame = window.requestAnimationFrame(() => {
            const {left, top} = getDaxBoundingBox(el.input)

            if (left !== el.left || top !== el.top) {
                el.updatePosition({left, top})
            }

            el.animationFrame = null
        })
    }

    disconnectedCallback () {
        window.removeEventListener('scroll', this.updateThisPosition, {passive: true, capture: true})
        this.resObs.disconnect()
        this.mutObs.disconnect()
    }

    connectedCallback () {
        this.updateThisPosition = () => DDGAutofill.updateButtonPosition(this)
        this.updateThisPosition()
        this.resObs = new ResizeObserver(entries => entries.forEach(this.updateThisPosition))
        this.resObs.observe(document.body)
        this.count = 0
        this.ensureIsLastInDOM = () => {
            // If DDG el is not the last in the doc, move them there
            if (document.body.lastElementChild !== this) {
                this.remove()

                // Try up to 5 times to avoid infinite loop in case someone is doing the same
                if (this.count < 15) {
                    document.body.append(this)
                    this.count++
                } else {
                    // Reset count so we can resume normal flow
                    this.count = 0
                    console.info(`DDG autofill bailing out`)
                }
            }
        }
        this.mutObs = new MutationObserver((mutationList) => {
            for (const mutationRecord of mutationList) {
                if (mutationRecord.type === 'childList') {
                    // Only check added nodes added nodes
                    mutationRecord.addedNodes.forEach(el => {
                        if (el.nodeName === 'DDG-AUTOFILL') return

                        this.ensureIsLastInDOM()
                    })
                }
            }
            this.updateThisPosition()
        })
        this.mutObs.observe(document.body, {childList: true, subtree: true, attributes: true})
        window.addEventListener('scroll', this.updateThisPosition, {passive: true, capture: true})

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
