const Parent = window.DDG.base.View;

function Search (ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    console.log("new search view");


    // this._cacheElems() caches jQuery selectors, so the following would be
    // accessible via: `this.$item` from within this view
    // and is equivalent to $('.js-search-item')

    this._cacheElems('.js-search', [ 'form', 'input', 'go' ]);

    // this.bindEvents() wires up jQuery selectors to events and their handlers:
    this.bindEvents([
      [this.$go, 'click', this._handleSubmit]
    ]);

    this.bindEvents([
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

        // _handleClick: function (e) {
        //     console.log('Search _handleClick()');
        //     this.model.doSearch();
        // }

    }

);

module.exports = Search;
