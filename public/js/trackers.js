(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var Parent = DDG.pages._Base;

window.DDG.pages.Trackers = function (ops) {
    Parent.call(this, ops);
};

window.DDG.pages.Trackers.prototype = $.extend({}, Parent.prototype, {

    pageType: 'trackers',

    ready: function ready() {
        Parent.prototype.ready.call(this);

        // TODO: add sub-views here!
        debugger;
    }

});

// kickoff!
window.DDG.page = new DDG.pages.Trackers();

},{}]},{},[1]);
