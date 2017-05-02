const Parent = window.DDG.base.View;

function Site (ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    console.log("new site view");

    this._cacheElems('.js-site', [ 'whitelist-toggle' ]);

    this.bindEvents([
      [this.$whitelisttoggle, 'click', this._whitelistClick]
    ]);

};

Site.prototype = $.extend({},
    Parent.prototype,
    {
        _whitelistClick: function (e) {
            console.log(`set whitelist for ${this.model.domain} to ${this.model.isWhitelisted}`);

            this.model.toggleWhitelist();
        }

    }

);

module.exports = Site;
