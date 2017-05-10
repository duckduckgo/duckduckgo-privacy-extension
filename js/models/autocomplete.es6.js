const Parent = window.DDG.base.Model;

function Autocomplete (attrs) {

    Parent.call(this, attrs);

};


Autocomplete.prototype = $.extend({},
  Parent.prototype,
  {

      modelName: 'autocomplete',

      fetchSuggestions: function (searchText) {
            // mockup autocomplete query result for now:
            this.suggestions = [`${searchText}es`, `${searchText}able`]
      }

  }
);


module.exports = Autocomplete;

