(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var Parent = window.DDG.base.Page;
var WhitelistView = require('./../views/whitelist.es6.js');

var Trackers = window.DDG.base.pages.Trackers = function (ops) {
    Parent.call(this, ops);
};

Trackers.prototype = $.extend({}, Parent.prototype, {

    pageType: 'trackers',

    ready: function ready() {
        Parent.prototype.ready.call(this);

        this.views.whitelist = new WhitelistView({
            pageView: this,
            appendTo: $('body')
        });
    }

});

// kickoff!
window.DDG = window.DDG || {};
window.DDG.page = new Trackers();

},{"./../views/whitelist.es6.js":2}],2:[function(require,module,exports){
"use strict";

var Parent = window.DDG.base.View;
// const WhitelistModel = require('./../models/whitelist.es6.js');

var Whitelist = window.DDG.base.views.Whitelist = function (ops) {

    this.model = ops.model = {};
    this.pageView = ops.pageView;
    // this.template = 'hp_onboarding_education';

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
        console.log("_handleClick()");
    }

});

module.exports = Whitelist;

},{}]},{},[1]);
