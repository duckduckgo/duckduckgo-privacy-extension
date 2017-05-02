const Parent = window.DDG.base.Page;
const WhitelistView = require('./../views/whitelist.es6.js');
const WhitelistModel = require('./../models/whitelist.es6.js');
const whitelistTemplate = require('./../templates/whitelist.es6.js');


function Trackers (ops) {
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
                model: new WhitelistModel({ heading: 'Domain Whitelist'}),
                appendTo: $('body'),
                template: whitelistTemplate
            });

        }

    }
);

// kickoff!
window.DDG = window.DDG || {};
window.DDG.page = new Trackers();
