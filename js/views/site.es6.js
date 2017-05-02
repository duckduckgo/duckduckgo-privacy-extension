const Parent = window.DDG.base.View;

function Site (ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    console.log("new site view");


    // this._cacheElems() caches jQuery selectors, so the following would be
    // accessible via: `this.$item` from within this view
    // and is equivalent to $('.js-site-item')

    this._cacheElems('.js-site', [ 'whitelistToggle' ]);

    // this.bindEvents() wires up jQuery selectors to events and their handlers:
    this.bindEvents([
      [this.$whitelistToggle, 'click', this._whitelistClick]
    ]);

};

Site.prototype = $.extend({},
    Parent.prototype,
    {
        _whitelistClick: function (e) {
            console.log(`set whitelist for ${this.model.domain} to ${this.model.isWhitelisted}`);

            this.model.toggleWhitelist();
        }

        // _handleClick: function (e) {
        //     console.log('Site _handleClick()');
        //     this.model.doSite();
        // }

    }

);

module.exports = Site;
