const Parent = window.DDG.base.View;

function PrivacyOptions (ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    this.setup();

};

PrivacyOptions.prototype = $.extend({},
    Parent.prototype,
    {

        _click_setting: function (e) {
            var k =  $(e.target).data('key');

            console.log(`privacyOptions view click for setting "${k}"`);

            this.model.toggle(k);
            this.rerender();
        },

        setup: function() {

            this._cacheElems('.js-options', [ 'blocktrackers', 'https-everywhere-enabled' ]);

            this.bindEvents([
              [this.$blocktrackers, 'click', this._click_setting],
              [this.$httpseverywhereenabled, 'click', this._click_setting]
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
