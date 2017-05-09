const Parent = window.DDG.base.Model;

function Autocomplete (attrs) {

    Parent.call(this, attrs);

    this.bindEvents([
      [this.storePublisher, 'change', this._handleUpdate],
    ]);

};


Autocomplete.prototype = $.extend({},
  Parent.prototype,
  {

      modelName: 'autocomplete',

      _handleUpdate: function (state) {
          console.log('_handleUpdate(state):');
          console.log(state);

          if (state.search && state.search.change) {
            this.searchText = state.search.searchText;
            // TODO: figure out why model.set() is hinky here
            // this.set('searchText', state.search.searchText);
          }
      }

  }
);


module.exports = Autocomplete;

