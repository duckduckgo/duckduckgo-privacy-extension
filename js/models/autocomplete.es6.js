const Parent = window.DDG.base.Model;

function Autocomplete (attrs) {

    Parent.call(this, attrs);

};


Autocomplete.prototype = $.extend({},
  Parent.prototype,
  {

      modelType: 'autocomplete'

  }
);


module.exports = Autocomplete;

