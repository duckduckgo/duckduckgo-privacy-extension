const Parent = window.DDG.base.View;

function PrivacyOptions (ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    console.log("new privacyOptions view");


    this.setup();

};

PrivacyOptions.prototype = $.extend({},
    Parent.prototype,
    {

        _click_blocktrackers: function (e) {
            console.log('PrivacyOptions _click_blocktrackers()');
            this.model.toggle('blockTrackers');
            this.rerender();
        },

        _click_forcehttps: function (e) {
            console.log('PrivacyOptions _click_forcehttps()');
            this.model.toggle('forceHTTPS');
            this.rerender();
        },

        setup: function() {

            this._cacheElems('.js-options', [ 'blocktrackers', 'force-https' ]);

            this.bindEvents([
              [this.$blocktrackers, 'click', this._click_blocktrackers],
              [this.$forcehttps, 'click', this._click_forcehttps]
            ]);
            
        },

        rerender: function() {
            this.unbindEvents();
            this._rerender();
            this.setup();
        }

    }

);

module.exports = PrivacyOptions;
