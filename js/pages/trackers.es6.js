const Parent = window.DDG.base.Page;
const TrackerListView = require('./../views/trackerlist.es6.js');
const TrackerListModel = require('./../models/trackerlist.es6.js');
const trackerListTemplate = require('./../templates/trackerlist.es6.js');

const SiteView = require('./../views/site.es6.js');
const SiteModel = require('./../models/site.es6.js');
const siteTemplate = require('./../templates/site.es6.js');

const SearchView = require('./../views/search.es6.js');
const SearchModel = require('./../models/search.es6.js');
const searchTemplate = require('./../templates/search.es6.js');

const LinkableView = require('./../views/linkable.es6.js');
const LinkableModel = require('./../models/linkable.es6.js');
const linkableTemplate = require('./../templates/linkable.es6.js');

const AutocompleteView = require('./../views/autocomplete.es6.js');
const AutocompleteModel = require('./../models/autocomplete.es6.js');
const autocompleteTemplate = require('./../templates/autocomplete.es6.js');


function Trackers (ops) {
    Parent.call(this, ops);
};

Trackers.prototype = $.extend({},
    Parent.prototype,
    {

        pageName: 'trackers',

        ready: function() {

            var $parent = $('#trackers-container');

            Parent.prototype.ready.call(this);

            this.views.search = new SearchView({
                pageView: this,
                model: new SearchModel({searchText:''}), // TODO proper location of remembered query
                appendTo: $parent,
                template: searchTemplate
            });

            this.views.site = new SiteView({
                pageView: this,
                model: new SiteModel({
                    domain: '-',
                    isWhitelisted: false,
                    siteRating: 'B',
                    trackerCount: 0
                }),
                appendTo: $parent,
                template: siteTemplate
            });

            this.views.options = new LinkableView({
                pageView: this,
                model: new LinkableModel({
                    text: 'Options',
                    id: 'options-link',
                    link: chrome.runtime.openOptionsPage,
                    klass: 'link-secondary',
                    spanClass: 'icon pull-right icon--arrow'
                }),
                appendTo: $parent,
                template: linkableTemplate
            });

            this.views.trackerlist = new TrackerListView({
                pageView: this,
                model: new TrackerListModel({}),
                appendTo: $parent,
                template: trackerListTemplate
            });

            // TODO: hook up model query to actual ddg ac endpoint.
            // For now this is just here to demonstrate how to
            // listen to another component via model.set() +
            // store.subscribe()
            this.views.autocomplete = new AutocompleteView({
                pageView: this,
                model: new AutocompleteModel({suggestions: []}),
                // appendTo: this.views.search.$el,
                appendTo: null,
                template: autocompleteTemplate
            });

        }

    }
);

// kickoff!
window.DDG = window.DDG || {};
window.DDG.page = new Trackers();
