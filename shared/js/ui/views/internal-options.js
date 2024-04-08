import bel from 'nanohtml'
const ModelParent = window.DDG.base.Model
const ViewParent = window.DDG.base.View

class Model extends ModelParent {
    constructor () {
        super({
            modelName: 'internalOptions'
        })
        this.isInternalUser = false
    }

    async getState () {
        this.isInternalUser = await this.sendMessage('isInternalUser')
        this.debuggingSettings = await this.sendMessage('getDebuggingSettings')
    }
}

function template () {
    if (this.model.isInternalUser) {
        const buttonState = this._buttonState()
        const buttonText = buttonState.split(' ')[0]
        const buttonDisabled = buttonState.endsWith('disabled')
        return bel`<section class="options-content__allowlist divider-bottom">
            <h2 class="menu-title">Internal settings</h2>
            <ul class="default-list">
                <li>
                    <p class="menu-paragraph">
                        Internal-only settings for debugging the extension.
                    </p>
                </li>
                <li>
                    <p class="options-info">Custom config URL</p>
                    <input class="allowlist-url js-options-config-url" type="text" placeholder="Privacy Configuration URL" value="${this.model.debuggingSettings?.configURLOverride}" />
                    <button class="custom-config-button float-right js-options-set-config-url" ${buttonDisabled ? 'disabled' : ''}>${buttonText}</button>
                </li>
            </ul>
        </section>`
    }
    return bel`<section class="options-content__allowlist"></section>`
}

export default function InternalOptionsView (ops) {
    this.model = ops.model = new Model()
    this.template = ops.template = template
    this.pageView = ops.pageView
    ViewParent.call(this, ops)
    this.reload()
}

InternalOptionsView.prototype = window.$.extend({}, ViewParent.prototype, {
    setup: function () {
        this._cacheElems('.js-options', ['config-url', 'set-config-url'])
        this.bindEvents([
            [this.$setconfigurl, 'click', this._clickSetting],
            [this.$configurl, 'input', this._onURLChange]
        ])
    },
    _buttonState: function () {
        const currentValue = this.model.debuggingSettings?.configURLOverride
        const inputValue = this.$configurl?.val() || currentValue
        let inputIsValidUrl = false
        try {
            inputIsValidUrl = !!(new URL(inputValue))
        } catch (e) {}
        if (!currentValue) {
            return inputIsValidUrl ? 'Set' : 'Set disabled'
        }
        if (inputValue === currentValue) {
            return 'Clear'
        }
        return inputIsValidUrl ? 'Update' : 'Update disabled'
    },
    _clickSetting: async function () {
        const buttonState = this._buttonState()
        const inputValue = this.$configurl?.val()
        if (buttonState === 'Set' || buttonState === 'Update') {
            // enable and set
            await this.model.sendMessage('enableDebugging', {
                configURLOverride: inputValue,
                debuggerConnection: true
            })
        } else if (buttonState === 'Clear') {
            await this.model.sendMessage('disableDebugging')
        }
        this.reload()
    },
    _onURLChange: function () {
        const buttonState = this._buttonState()
        const buttonText = buttonState.split(' ')[0]
        const buttonDisabled = buttonState.endsWith('disabled')
        this.$setconfigurl.attr('disabled', buttonDisabled)
        this.$setconfigurl.text(buttonText)
    },
    reload: function () {
        this.model.getState().then(() => {
            this.unbindEvents()
            this._rerender()
            this.setup()
        })
    }
})
