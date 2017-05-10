const Parent = window.DDG.base.Model;

function Autocomplete (attrs) {

    Parent.call(this, attrs);

    this.bindEvents([
      [this.storePublisher, 'change:search', this._handleUpdate]
    ]);

};


Autocomplete.prototype = $.extend({},
  Parent.prototype,
  {

      modelName: 'autocomplete',

      _handleUpdate: function (state) {
          console.log('[Autocomplete] _handleUpdate(state):');
          console.log(state);

          if (state.change && state.change.property === 'searchText') {
              this._fetchSuggestions(state.change.value);
          }
      },

      _fetchSuggestions: function (searchText) {
            // mockup autocomplete result for now:
            this.suggestions = [`${searchText}es`, `${searchText}able`]
      }

  }
);


module.exports = Autocomplete;

