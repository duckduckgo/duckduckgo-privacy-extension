const Parent = window.DDG.base.View;

function Autocomplete (ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    this.bindEvents([
      [this.model.store.subscribe, 'change:search', this._handleSearchTextUpdate],
    ]);


};

Autocomplete.prototype = $.extend({},
    Parent.prototype,
    {

        _handleSearchTextUpdate: function (update) {
            if (update.change && update.change.attribute === 'searchText') {
                if (!update.change.value) {
                  this.model.suggestions = [];
                  this._rerender();
                  return;
                }
                this.model.fetchSuggestions(update.change.value)
                  .then(() => this._rerender());
            }
        }

    }

);

module.exports = Autocomplete;
