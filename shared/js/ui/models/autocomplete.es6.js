const Parent = window.DDG.base.Model

function Autocomplete (attrs) {
    Parent.call(this, attrs)
}

Autocomplete.prototype = window.$.extend({},
    Parent.prototype,
    {

        modelName: 'autocomplete',

        fetchSuggestions: function (searchText) {
            return new Promise((resolve, reject) => {
                // TODO: ajax call here to ddg autocomplete service
                // for now we'll just mock up an async xhr query result:
                this.suggestions = [`${searchText} world`, `${searchText} united`, `${searchText} famfam`]
                resolve()
            })
        }
    }
)

module.exports = Autocomplete
