const $ = require('./../../node_modules/jquery');
const EventEmitter2 = require('./../../node_modules/eventemitter2');
const mixins = require('./mixins/index.es6.js');

/**
 * Abstract Base class for any type of view.
 *
 * Contains the basic functionality
 * for rendering a template, caching a $ ref, inserting
 * into the DOM and a locally scoped find at this.$
 *
 * @constructor
 * @augments EventEmitter2
 * @param {object} ops
 */

 function BaseView (ops) {
    this.model = ops.model;
    this.views = this.views || {};

    // A jquery object should be passed in as either 'appendTo', 'before' or 'after'
    // indicating where on the DOM the view should be added. If none is passed
    // the view will render itself to an in-memory jquery object, but won't be added to the DOM.
    this.$parent = (typeof ops.appendTo === 'string') ? $(ops.appendTo) : ops.appendTo;
    this.$before = (typeof ops.before === 'string') ? $(ops.before) : ops.before;
    this.$after = (typeof ops.after === 'string') ? $(ops.after) : ops.after;

    if (ops.events) {
        for (var id in ops.events) {
            this.on(id, ops.events[id]);
        }
    }

    this._render(ops);

    // this._wrapLinks();
};

BaseView.prototype = $.extend(
    {},
    EventEmitter2.prototype,
    mixins.events,
    {

        /***
         * Each view should define a template
         * if it wants to be rendered and added to the DOM.
         *
         * template: '',
         */

        /**
         * Removes the view element (and all child view elements)
         * from the DOM.
         *
         * Should be extended to do any cleanup of child views or
         * unbinding of events.
         */
        destroy: function(){
            this.unbindEvents();
            this.destroyChildViews();
            this.$el.remove();
        },

        /**
         * Go through the this.views object
         * and recurse down destroying any child
         * views and their child views so that
         * when a view is destroyed it removes all memory
         * footprint, all events are cleanly unbound and
         * all related DOM elements are removed.
         *
         */
        destroyChildViews: function() {
            !function destroyViews(views){
                if (!views) { return; }
                var v;
                if ($.isArray(views)) {
                    for (var i=0; i<views.length; i++) {
                        v = views[i];
                        if(v && $.isArray(v)){
                            destroyViews(v);
                        } else {
                            v && v.destroy && v.destroy();
                        }
                    }
                    views = null;
                } else {
                    for(var c in views){
                        v = views[c];
                        if(v && $.isArray(v)){
                            destroyViews(v);
                        } else {
                            v && v.destroy && v.destroy();
                        }
                        delete views[c];
                    }
                }
            }(this.views);
            delete this.views;
        },

        /**
         * Take the template defined on the view class and
         * use it to create a DOM element + append it to the DOM.
         *
         * Can be extended with any custom rendering logic
         * a view may need to do.
         *
         * @param {object} ops - the same ops hash passed into the view constructor
         */
        _render: function (ops) {
            debugger;
            if (!this.$el) {
                if (ops && ops.$el) {
                    this.$el = ops.$el;
                } else {
                    // TODO: update this to just use tagged template literals
                    // this.$el = DDG.$exec_template(this.template, ops || {});
                }
            }

            if (!this.$el) { throw new Error("Template Not Found: " + this.template); }

            this._addToDOM();

            this.$ = this.$el.find.bind(this.$el);
        },

        _rerender: function() {
            var $prev = this.$el.prev();
            if ($prev.length) {
                delete this.$parent;
                this.$after = $prev;
            } else {
                var $next = this.$el.next();
                if ($next.length) {
                    delete this.$parent;
                    this.$before = $next;
                }
            }

            this.$el.remove();
            delete this.$el;
            this._render();
            this.emit('rerender');

            // make sure any new links are wrapped
            // this._wrapLinks();
        },

        /**
         * Add extra handlers for all a tags in this view
         *
         * Internal and external links get separate handlers,
         * and external links get special treatment to allow
         * for referrers to be stripped
         *
         * @param {jQuery} $container - optional container with links to wrap
         * @api private
         */
         /*
        _wrapLinks: function ($container) {
            // default to this view's element
            if (!$container || !$container.length) {
                $container = this.$el;
            }

            // if there's still no container, the view
            // hasn't rendered yet, leave wrapping for a later date
            if (!$container) {
                return;
            }

            $container.find("a").each(function (i, el) {
                var $el = $(el);

                // only add these handlers once
                if ($el.data("wrapped")) {
                    return;
                }
                $el.data("wrapped", true);

                if (!DDG.isInternalURL(el.href)) {
                    $el.on("click.wrap", this._onExternalLinkClick.bind(this));
                }
            }.bind(this));
        },
        */

        /**
         * Add the rendered element to the DOM.
         */
        _addToDOM: function(){
            if (this.$parent) {
                this.$parent.append(this.$el);
            } else if (this.$before) {
                this.$before.before(this.$el);
            } else if (this.$after) {
                this.$after.after(this.$el);
            }
        },

        /**
         * Takes a prefix string and an array
         * of elements and caches dom references.
         *
         * It should be used like this:
         *
         * this._cacheElems('.js-detail',['next','prev']);
         * --> this.$next (is cached ref to '.js-detail-next'
         *     this.$prev (is cached ref to '.js-detail-prev'
         *
         * @param {String} prefix
         * @param {Array} elems
         */
        _cacheElems: function(prefix, elems){
            for (var i=0; i<elems.length; i++) {
                var selector = prefix + '-' + elems[i],
                    // the replace removes '-' from class names, so:
                    // 'class-name' becomes this.$classname:
                    id = '$' + elems[i].replace(/-/g,'');

                this[id] = this.$(selector);
            }
        },

        /*
        _onExternalLinkClick: function (e) {
            var link = e.currentTarget;

            // open in a new window if the New Window setting is set...
            if (DDG.settings && !DDG.settings.isDefault("kn")) {
                link.target = "_blank";
            }

            // open link with stripped referrers
            return nrl(e, link);
        }
        */

});

module.exports = BaseView;
