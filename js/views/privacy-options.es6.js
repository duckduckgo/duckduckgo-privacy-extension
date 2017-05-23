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

        _clickSetting: function (e) {
            var key =  $(e.target).data('key') || $(e.target).parent().data('key');
            console.log(`privacyOptions view click for setting "${key}"`);

            this.model.toggle(key);
            this.rerender();
        },

        setup: function() {

            this._cacheElems('.js-options', [ 'blocktrackers', 'https-everywhere-enabled' ]);

            this.bindEvents([
              [this.$blocktrackers, 'click', this._clickSetting],
              [this.$httpseverywhereenabled, 'click', this._clickSetting]
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
