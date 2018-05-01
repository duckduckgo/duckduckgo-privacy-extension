const Parent = window.DDG.base.View

function Autocomplete (ops) {
    this.model = ops.model
    this.pageView = ops.pageView
    this.template = ops.template
    Parent.call(this, ops)

    this.bindEvents([
        [this.store.subscribe, 'change:search', this._handleSearchText]
    ])
}

Autocomplete.prototype = window.$.extend({},
    Parent.prototype,
    {

        _handleSearchText: function (notification) {
            if (notification.change && notification.change.attribute === 'searchText') {
                if (!notification.change.value) {
                    this.model.suggestions = []
                    this._rerender()
                    return
                }

                this.model.fetchSuggestions(notification.change.value)
                    .then(() => this._rerender())
            }
        }
    }
)

module.exports = Autocomplete
