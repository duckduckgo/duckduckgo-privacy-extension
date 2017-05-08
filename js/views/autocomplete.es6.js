const Parent = window.DDG.base.View;

function Autocomplete (ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

};

Autocomplete.prototype = $.extend({},
    Parent.prototype,
    {

    }

);

module.exports = Autocomplete;
