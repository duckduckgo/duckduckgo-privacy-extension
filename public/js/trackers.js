(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var Parent = window.DDG.base.Model;

function Whitelist(attrs) {

    // TODO: utilize base.Model so we get nice set() method
    // pick up here tomorrow by setting model properly
    // so base view render() can do its thing with template fn
    debugger;
};

Whitelist.prototype = $.extend({}, Parent.prototype, {

    getList: function getList() {
        // retrieve list from local storage
    }

});

module.exports = Whitelist;

},{}],2:[function(require,module,exports){
'use strict';

var Parent = window.DDG.base.Page;
var WhitelistView = require('./../views/whitelist.es6.js');
var WhitelistModel = require('./../models/whitelist.es6.js');

function Trackers(ops) {
    Parent.call(this, ops);
};

Trackers.prototype = $.extend({}, Parent.prototype, {

    pageType: 'trackers',

    ready: function ready() {
        Parent.prototype.ready.call(this);

        var wlModel = new WhitelistModel({ heading: 'Domain Whitelist' });
        this.views.whitelist = new WhitelistView({
            pageView: this,
            appendTo: $('body'),
            model: wlModel
        });
    }

});

// kickoff!
window.DDG = window.DDG || {};
window.DDG.page = new Trackers();

},{"./../models/whitelist.es6.js":1,"./../views/whitelist.es6.js":4}],3:[function(require,module,exports){
"use strict";

module.exports = function (ctx) {
    return "<h2>" + ctx.heading + "</h2>\n        <ul>\n          <li>foo.com</li>\n          <li>foo.com</li>\n        </ul>\n    ";
};

},{}],4:[function(require,module,exports){
'use strict';

var Parent = window.DDG.base.View;
var template = require('./../templates/whitelist.es6.js');

function Whitelist(ops) {

    this.model = ops.model = {};
    this.pageView = ops.pageView;
    this.template = template;

    debugger;
    Parent.call(this, ops);

    // this._cacheElems('.js-whitelist', [
    //   'foo',
    //   'bar'
    // ]);

    // this.bindEvents([
    //   [this.$foo, 'click', this._handleClick]
    // ]);
};

Whitelist.prototype = $.extend({}, Parent.prototype, {

    _handleClick: function _handleClick(e) {
        console.log('_handleClick()');
    }

});

module.exports = Whitelist;

},{"./../templates/whitelist.es6.js":3}]},{},[2]);
