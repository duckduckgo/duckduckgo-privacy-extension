const Parent = window.DDG.base.View;

function Search (ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    console.log("new search view");

    this._cacheElems('.js-search', [ 'form', 'input', 'go' ]);

    this.bindEvents([
      [this.$go, 'click', this._handleSubmit],
      [this.$form, 'submit', this._handleSubmit]
    ]);

};

Search.prototype = $.extend({},
    Parent.prototype,
    {
        _handleSubmit: function (e) {
            console.log(`Search submit for ${this.$input.val()}`);
            this.model.doSearch(this.$input.val());
        }
    }

);

module.exports = Search;
