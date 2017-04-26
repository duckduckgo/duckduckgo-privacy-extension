const Parent = DDG.pages._Base;

window.DDG.pages.Trackers = function(ops) {
    Parent.call(this, ops);
};

window.DDG.pages.Trackers.prototype = $.extend(
    {},
    Parent.prototype,
    {

        pageType: 'trackers',

        ready: function() {
            Parent.prototype.ready.call(this);

            // TODO: add sub-views here!
            debugger;
        }

    }
);

// kickoff!
window.DDG.page = new DDG.pages.Trackers();

