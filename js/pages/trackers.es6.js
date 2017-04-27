const Parent = window.DDG.base.Page;
const WhitelistView = require('./../views/whitelist.es6.js');

const Trackers = window.DDG.base.pages.Trackers = function (ops) {
    Parent.call(this, ops);
};

Trackers.prototype = $.extend({},
    Parent.prototype,
    {

        pageType: 'trackers',

        ready: function() {
            Parent.prototype.ready.call(this);

            this.views.whitelist = new WhitelistView({
                pageView: this,
                appendTo: $('body')
            });

        }

    }
);

// kickoff!
window.DDG = window.DDG || {};
window.DDG.page = new Trackers();
