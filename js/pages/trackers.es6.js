const Parent = window.DDG.base.Page;
// const Whitelist = require('./../views/whitelist.es6.js');

const Trackers = window.DDG.base.pages.Trackers = function (ops) {
    Parent.call(this, ops);
};

Trackers.prototype = $.extend(
    {},
    Parent.prototype,
    {

        pageType: 'trackers',

        ready: function() {
            Parent.prototype.ready.call(this);

            // TODO: add sub-views here!
            // this.views.whitelist = new Whitelist(
            // )
            debugger;
        }

    }
);

// kickoff!
window.DDG = window.DDG || {};
window.DDG.page = new Trackers();
debugger;
