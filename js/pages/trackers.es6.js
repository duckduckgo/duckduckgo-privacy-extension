const Parent = window.DDG.base.Page;
const TrackerListView = require('./../views/trackerlist.es6.js');
const TrackerListModel = require('./../models/trackerlist.es6.js');
const TrackerListTemplate = require('./../templates/trackerlist.es6.js');

const SiteView = require('./../views/site.es6.js');
const SiteModel = require('./../models/site.es6.js');
const SiteTemplate = require('./../templates/site.es6.js');

const SearchView = require('./../views/search.es6.js');
const SearchModel = require('./../models/search.es6.js');
const SearchTemplate = require('./../templates/search.es6.js');

const ItemMenuView = require('./../views/itemMenu.es6.js');
const ItemMenuModel = require('./../models/itemMenu.es6.js');
const ItemMenuTemplate = require('./../templates/itemMenu.es6.js');

function Trackers (ops) {
    Parent.call(this, ops);
};

// var bg = chrome.extension.getBackgroundPage();

Trackers.prototype = $.extend({},
    Parent.prototype,
    {

        pageType: 'trackers',

        ready: function() {

            console.log("Trackers ready()");
            var $parent = $('#DDG-site-info');

            Parent.prototype.ready.call(this);

            this.views.search = new SearchView({
                pageView: this,
                model: new SearchModel({searchText:''}),
                appendTo: $parent,
                template: SearchTemplate
            });

            this.views.site = new SiteView({
                pageView: this,
                model: new SiteModel({
                    domain: "cnn.com",
                    isWhitelisted: false,
                    siteRating: 'B',
                    trackerCount: 21
                }),
                appendTo: $parent,
                template: SiteTemplate
            });

            this.views.trackerlist = new TrackerListView({
                pageView: this,
                model: new TrackerListModel({heading: 'Top Blocked', max:5}),
                appendTo: $parent,
                template: TrackerListTemplate
            });

            this.views.trackerlist = new ItemMenuView({
                pageView: this,
                model: new ItemMenuModel({title: 'Options', id: "options-page",
                     link: function() { chrome.tabs.update({ url: 'chrome://chrome/extensions' }); }
                }),
                appendTo: $parent,
                template: ItemMenuTemplate
            });

        }

    }
);

// kickoff!
window.DDG = window.DDG || {};
window.DDG.page = new Trackers();
