const Parent = window.DDG.base.Model;

function Autocomplete (attrs) {

    Parent.call(this, attrs);

};


Autocomplete.prototype = $.extend({},
  Parent.prototype,
  {

      modelName: 'autocomplete',

      fetchSuggestions: function (searchText) {
          return new Promise((resolve, reject) => {
              // TODO: ajax call here to ddg autocomplete service
              // for now we'll just mock up an async xhr query result:
              this.suggestions = [`${searchText}es`, `${searchText}able`]
              resolve();
          });
      }

  }
);


module.exports = Autocomplete;

