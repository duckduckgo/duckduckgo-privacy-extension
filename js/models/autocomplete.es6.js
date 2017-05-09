const Parent = window.DDG.base.Model;

function Autocomplete (attrs) {

    Parent.call(this, attrs);

};


Autocomplete.prototype = $.extend({},
  Parent.prototype,
  {

      modelName: 'autocomplete'

  }
);


module.exports = Autocomplete;

