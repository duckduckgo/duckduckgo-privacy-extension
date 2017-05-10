const Parent = window.DDG.base.View;

function Autocomplete (ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    this.bindEvents([
      [this.model.store.subscribe, 'change:search', this._handleUpdate]
    ]);


};

Autocomplete.prototype = $.extend({},
    Parent.prototype,
    {

        _handleUpdate: function (searchModel) {
            console.log('[AutocompleteView] _handleUpdate(searchModel):');
            console.log(searchModel);

            if (searchModel.change && searchModel.change.property === 'searchText') {
                this.model.fetchSuggestions(searchModel.change.value)
                  .then(() => this._rerender());
            }
        },

    }

);

module.exports = Autocomplete;
