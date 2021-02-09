const {daxSvg} = require('./logo-svg')
const {getDaxBoundingBox} = require('./autofill-utils')
const { safeExecute } = require('./autofill-utils')

class DDGAutofill {
    constructor (input, associatedForm) {
        const shadow = document.createElement('ddg-autofill').attachShadow({mode: 'closed'})
        this.host = shadow.host
        this.input = input
        this.associatedForm = associatedForm
        this.animationFrame = null

        shadow.innerHTML = `
<link rel="stylesheet" href="${chrome.runtime.getURL('public/css/email-autofill.css')}">
<div class="wrapper">
    <div class="tooltip" hidden>
        <h2 class="tooltip__title">Use a Private Duck Address</h2>
        <p>Protect your personal address, block trackers, and forward to your regular inbox. </p>
        <div class="tooltip__alias-container">${daxSvg}<strong class="alias">${this.nextAlias}</strong>@duck.com</div>
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
        this.link = shadow.querySelector('link')
        // Un-hide once the style is loaded, to avoid flashing unstyled content
        this.link.addEventListener('load', () =>
            this.tooltip.removeAttribute('hidden'))

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
        this.updatePosition = ({left, top}) => {
            // If the stylesheet is not loaded wait for load (Chrome bug)
            if (!shadow.styleSheets.length) return this.link.addEventListener('load', this.checkPosition)

            this.left = left
            this.top = top

            if (this.transformRuleIndex && shadow.styleSheets[this.transformRuleIndex]) {
                // If we have already set the rule, remove it…
                shadow.styleSheets[0].deleteRule(this.transformRuleIndex)
            } else {
                // …otherwise, set the index as the very last rule
                this.transformRuleIndex = shadow.styleSheets[0].rules.length
            }

            const newRule = `.wrapper {transform: translate(${left}px, ${top}px);}`
            shadow.styleSheets[0].insertRule(newRule, this.transformRuleIndex)
        }

        this.append = () => document.body.appendChild(shadow.host)
        this.append()
        this.firePixel = pixel =>
            chrome.runtime.sendMessage({firePixel: pixel})
        // Tooltip impression pixel
        this.firePixel('emaf')
        this.lift = () => {
            this.left = null
            this.top = null
            document.body.removeChild(this.host)
        }

        this.remove = () => {
            window.removeEventListener('scroll', this.checkPosition, {passive: true, capture: true})
            this.resObs.disconnect()
            this.mutObs.disconnect()
            this.lift()
        }

        this.checkPosition = () => {
            if (this.animationFrame) {
                window.cancelAnimationFrame(this.animationFrame)
            }

            this.animationFrame = window.requestAnimationFrame(() => {
                const {left, top} = getDaxBoundingBox(this.input)

                if (left !== this.left || top !== this.top) {
                    this.updatePosition({left, top})
                }

                this.animationFrame = null
            })
        }
        this.resObs = new ResizeObserver(entries => entries.forEach(this.checkPosition))
        this.resObs.observe(document.body)
        this.count = 0
        this.ensureIsLastInDOM = () => {
            // If DDG el is not the last in the doc, move them there
            if (document.body.lastElementChild !== this.host) {
                this.lift()

                // Try up to 5 times to avoid infinite loop in case someone is doing the same
                if (this.count < 15) {
                    this.append()
                    this.checkPosition()
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
                    // Only check added nodes
                    mutationRecord.addedNodes.forEach(el => {
                        if (el.nodeName === 'DDG-AUTOFILL') return

                        this.ensureIsLastInDOM()
                    })
                }
            }
            this.checkPosition()
        })
        this.mutObs.observe(document.body, {childList: true, subtree: true, attributes: true})
        window.addEventListener('scroll', this.checkPosition, {passive: true, capture: true})

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
                // Autofill confirmation pixel
                this.firePixel('emafub')
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
