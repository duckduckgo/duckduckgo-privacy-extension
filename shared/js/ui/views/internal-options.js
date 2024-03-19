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
    }
}

function template () {
    if (this.model.isInternalUser) {
        return bel`<section class="options-content__allowlist divider-bottom">
            <h2 class="menu-title">Internal settings</h2>
            <ul class="default-list">
                <li>
                    <p class="menu-paragraph">
                        Internal-only settings for debugging the extension.
                    </p>
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
    this.model.getState().then(() => {
        this._rerender()
    })
}

InternalOptionsView.prototype = window.$.extend({}, ViewParent.prototype, {

})
