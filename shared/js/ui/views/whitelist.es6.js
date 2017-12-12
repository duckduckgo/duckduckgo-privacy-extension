const Parent = window.DDG.base.View;

function Whitelist (ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    // bind events
    this.setup();

    this.setWhitelistFromSettings()
};

Whitelist.prototype = $.extend({},
    Parent.prototype,
    {

        _removeItem: function (e) {

            var itemIndex = $(e.target).data("item");

            this.model.removeDomain(itemIndex);
            this.setWhitelistFromSettings()

        },

        setup: function() {
            this._cacheElems('.js-whitelist', [ 'remove' ]);

            this.bindEvents([
              [this.$remove, 'click', this._removeItem],
              [this.store.subscribe, 'action:backgroundMessage', this.update]
            ]);
        },

        rerender: function() {
            this.unbindEvents();
            this._rerender();
            this.setup();
        },

        // watch for changes in the whitelist and rerender
        update: function(message) {
            if (message.action === 'whitelistChanged') {
                this.setWhitelistFromSettings()
            }
        },

        setWhitelistFromSettings: function() {
            let self = this
            this.model.fetch({getSetting: {name: 'whitelisted'}}).then((list) => {
                let wlist = list || {}
                self.model.list = Object.keys(wlist)
                self.model.list.sort()
                self.rerender()
            });
        }
    },


);

module.exports = Whitelist;
