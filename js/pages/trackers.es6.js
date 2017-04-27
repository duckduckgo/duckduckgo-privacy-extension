const Parent = window.DDG.base.Page;
const WhitelistView = require('./../views/whitelist.es6.js');
const WhitelistModel = require('./../models/whitelist.es6.js');

const Trackers = window.DDG.base.pages.Trackers = function (ops) {
    Parent.call(this, ops);
};

Trackers.prototype = $.extend({},
    Parent.prototype,
    {

        pageType: 'trackers',

        ready: function() {
            Parent.prototype.ready.call(this);

            const wlModel = new WhitelistModel({ heading: 'Domain Whitelist'});
            this.views.whitelist = new WhitelistView({
                pageView: this,
                appendTo: $('body'),
                model: wlModel
            });

        }

    }
);

// kickoff!
window.DDG = window.DDG || {};
window.DDG.page = new Trackers();
