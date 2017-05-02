(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var Parent = window.DDG.base.Model;

function ItemMenu(attrs) {

    Parent.call(this, attrs);
};

ItemMenu.prototype = $.extend({}, Parent.prototype, {
    // f: function (s) {
    //     console.log(`ItemMenu f()`);
    // }

});

module.exports = ItemMenu;

},{}],2:[function(require,module,exports){
"use strict";

var Parent = window.DDG.base.Model;

function Search(attrs) {

  Parent.call(this, attrs);
};

Search.prototype = $.extend({}, Parent.prototype, {

  doSearch: function doSearch(s) {
    this.searchText = s;
    console.log("doSearch() for " + s);

    chrome.tabs.create({
      url: "https://duckduckgo.com/?q=" + s + "&bext=" + localStorage['os'] + "cr"
    });
  }

});

module.exports = Search;

},{}],3:[function(require,module,exports){
'use strict';

var Parent = window.DDG.base.Model;

function Site(attrs) {

    // domain: "cnn.com",
    // isWhitelisted: false,
    // siteRating: 'B',
    // trackerCount: 21


    attrs.httpsIcon = 'orange';
    attrs.httpsStatusText = 'Forced Secure Connection';
    attrs.blockMessage = 'Trackers Blocked';

    Parent.call(this, attrs);
};

Site.prototype = $.extend({}, Parent.prototype, {
    toggleWhitelist: function toggleWhitelist(s) {
        console.log('Site toggleWhitelist()');
    }

});

module.exports = Site;

},{}],4:[function(require,module,exports){
"use strict";

var Parent = window.DDG.base.Model;

function TrackerList(attrs) {

    Parent.call(this, attrs);

    // test data for now
    // this might reference chrome.extension.getBackgroundPage();
    // to get the parent company data
    this.testList = [{ domain: "google.com", blocked: 100 }, { domain: "facebook.com", blocked: 20 }, { domain: "twitter.com", blocked: 10 }, { domain: "amazon.com", blocked: 5 }, { domain: "adnexus.com", blocked: 4 }];

    // this.extensionIsEnabled = this.bg.settings.getSetting("extensionIsEnabled");
    // console.log("extension is enabled: ",  this.bg.settings.getSetting("extensionIsEnabled"));

};

TrackerList.prototype = $.extend({}, Parent.prototype, {});

module.exports = TrackerList;

},{}],5:[function(require,module,exports){
'use strict';

var Parent = window.DDG.base.Page;
var TrackerListView = require('./../views/trackerlist.es6.js');
var TrackerListModel = require('./../models/trackerlist.es6.js');
var TrackerListTemplate = require('./../templates/trackerlist.es6.js');

var SiteView = require('./../views/site.es6.js');
var SiteModel = require('./../models/site.es6.js');
var SiteTemplate = require('./../templates/site.es6.js');

var SearchView = require('./../views/search.es6.js');
var SearchModel = require('./../models/search.es6.js');
var SearchTemplate = require('./../templates/search.es6.js');

var ItemMenuView = require('./../views/itemMenu.es6.js');
var ItemMenuModel = require('./../models/itemMenu.es6.js');
var ItemMenuTemplate = require('./../templates/itemMenu.es6.js');

function Trackers(ops) {
    Parent.call(this, ops);
};

// var bg = chrome.extension.getBackgroundPage();

Trackers.prototype = $.extend({}, Parent.prototype, {

    pageType: 'trackers',

    ready: function ready() {

        console.log("Trackers ready()");
        var $parent = $('#DDG-site-info');

        Parent.prototype.ready.call(this);

        this.views.search = new SearchView({
            pageView: this,
            model: new SearchModel({ searchText: '' }),
            appendTo: $parent,
            template: SearchTemplate
        });

        this.views.site = new SiteView({
            pageView: this,
            model: new SiteModel({
                domain: "cnn.com",
                isTrackerListed: false,
                siteRating: 'B',
                trackerCount: 21
            }),
            appendTo: $parent,
            template: SiteTemplate
        });

        this.views.trackerlist = new TrackerListView({
            pageView: this,
            model: new TrackerListModel({ heading: 'Top Blocked', max: 5 }),
            appendTo: $parent,
            template: TrackerListTemplate
        });

        this.views.trackerlist = new ItemMenuView({
            pageView: this,
            model: new ItemMenuModel({ title: 'Options', id: "options-page",
                link: function link() {
                    chrome.tabs.update({ url: 'chrome://chrome/extensions' });
                }
            }),
            appendTo: $parent,
            template: ItemMenuTemplate
        });
    }

});

// kickoff!
window.DDG = window.DDG || {};
window.DDG.page = new Trackers();

},{"./../models/itemMenu.es6.js":1,"./../models/search.es6.js":2,"./../models/site.es6.js":3,"./../models/trackerlist.es6.js":4,"./../templates/itemMenu.es6.js":6,"./../templates/search.es6.js":7,"./../templates/site.es6.js":8,"./../templates/trackerlist.es6.js":9,"./../views/itemMenu.es6.js":10,"./../views/search.es6.js":11,"./../views/site.es6.js":12,"./../views/trackerlist.es6.js":13}],6:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<div class="js-menu-title js-menu-arrow" id="js-item-menu-', '">\n            <span>', '</span>\n            <div class="js-site-inline-icon js-site-icon-right js-icon-arrow"></div>\n        </div>'], ['<div class="js-menu-title js-menu-arrow" id="js-item-menu-', '">\n            <span>', '</span>\n            <div class="js-site-inline-icon js-site-icon-right js-icon-arrow"></div>\n        </div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('./../../node_modules/bel');

module.exports = function () {
        return bel(_templateObject, this.model.id, this.model.title);
};

},{"./../../node_modules/bel":14}],7:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<div class="js-search js-menu-section">\n        <form class="js-search-form" name="x">\n          <input type="text" autocomplete="off" placeholder="Search DuckDuckGo" name="q" class="js-search-input" value="', '" />\n          <input class="js-search-go" tabindex="2" value="" type="button"> <!-- submit -->\n          <input id="search_form_input_clear" tabindex="3" value=" " type="button">\n        </form>\n    </div>'], ['<div class="js-search js-menu-section">\n        <form class="js-search-form" name="x">\n          <input type="text" autocomplete="off" placeholder="Search DuckDuckGo" name="q" class="js-search-input" value="', '" />\n          <input class="js-search-go" tabindex="2" value="" type="button"> <!-- submit -->\n          <input id="search_form_input_clear" tabindex="3" value=" " type="button">\n        </form>\n    </div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('./../../node_modules/bel');

module.exports = function () {
    return bel(_templateObject, this.model.searchText);
};

},{"./../../node_modules/bel":14}],8:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<div class="js-site js-menu-section">\n        <ul class="js-menu-item-list">\n            <li class="js-site-item">\n                <span class="js-site-domain">', '</span>\n                <span class="js-site-whitelistToggle">', '</span>\n                <div class="js-site-rating-', ' js-site-inline-icon js-site-icon-right"></div>\n            </li>\n            <li class="js-site-item">\n                <span class="js-site-inline-icon js-site-https-', '"></span>\n                <span class="js-site-httpsStatusText">', '</span>\n            </li>\n            <li class="js-site-item">\n                <span class="js-site-trackerCount">', '</span> ', '\n            </li>\n        </ul>\n    </div>'], ['<div class="js-site js-menu-section">\n        <ul class="js-menu-item-list">\n            <li class="js-site-item">\n                <span class="js-site-domain">', '</span>\n                <span class="js-site-whitelistToggle">', '</span>\n                <div class="js-site-rating-', ' js-site-inline-icon js-site-icon-right"></div>\n            </li>\n            <li class="js-site-item">\n                <span class="js-site-inline-icon js-site-https-', '"></span>\n                <span class="js-site-httpsStatusText">', '</span>\n            </li>\n            <li class="js-site-item">\n                <span class="js-site-trackerCount">', '</span> ', '\n            </li>\n        </ul>\n    </div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('./../../node_modules/bel');

module.exports = function () {
    return bel(_templateObject, this.model.domain, this.model.isWhitelisted, this.model.siteRating, this.model.httpsIcon, this.model.httpsStatusText, this.model.trackerCount, this.model.blockMessage);
};

},{"./../../node_modules/bel":14}],9:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<li> ', ' = ', ' </li>'], ['<li> ', ' = ', ' </li>']),
    _templateObject2 = _taggedTemplateLiteral(['<div class="js-trackerlist js-menu-section">\n        <div class="js-menu-title">', '</div>\n        <ul class="js-menu-item-list">\n            ', '\n        </ul>\n    </div>'], ['<div class="js-trackerlist js-menu-section">\n        <div class="js-menu-title">', '</div>\n        <ul class="js-menu-item-list">\n            ', '\n        </ul>\n    </div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('./../../node_modules/bel');

module.exports = function () {

    var f = function f(list) {
        return list.map(function (site) {
            return bel(_templateObject, site.domain, site.blocked);
        });
    };

    return bel(_templateObject2, this.model.heading, f(this.model.testList));
};

},{"./../../node_modules/bel":14}],10:[function(require,module,exports){
"use strict";

var Parent = window.DDG.base.View;

function ItemMenu(ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    console.log("new itemMenu view");

    // this._cacheElems('#js-item-menu', [ this.model.id ]);

    this.$linkableItem = $("#js-item-menu-" + this.model.id);

    // this.bindEvents() wires up jQuery selectors to events and their handlers:
    this.bindEvents([[this.$linkableItem, 'click', this._handleClick]]);
};

ItemMenu.prototype = $.extend({}, Parent.prototype, {

    _handleClick: function _handleClick(e) {
        console.log('ItemMenu _handleClick()');

        this.model.link();
    }

});

module.exports = ItemMenu;

},{}],11:[function(require,module,exports){
'use strict';

var Parent = window.DDG.base.View;

function Search(ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    console.log("new search view");

    // this._cacheElems() caches jQuery selectors, so the following would be
    // accessible via: `this.$item` from within this view
    // and is equivalent to $('.js-search-item')

    this._cacheElems('.js-search', ['form', 'input', 'go']);

    // this.bindEvents() wires up jQuery selectors to events and their handlers:
    this.bindEvents([[this.$go, 'click', this._handleSubmit]]);

    this.bindEvents([[this.$form, 'submit', this._handleSubmit]]);
};

Search.prototype = $.extend({}, Parent.prototype, {
    _handleSubmit: function _handleSubmit(e) {
        console.log('Search submit for ' + this.$input.val());
        this.model.doSearch(this.$input.val());
    }

    // _handleClick: function (e) {
    //     console.log('Search _handleClick()');
    //     this.model.doSearch();
    // }

});

module.exports = Search;

},{}],12:[function(require,module,exports){
'use strict';

var Parent = window.DDG.base.View;

function Site(ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    console.log("new site view");

    // this._cacheElems() caches jQuery selectors, so the following would be
    // accessible via: `this.$item` from within this view
    // and is equivalent to $('.js-site-item')

    this._cacheElems('.js-site', ['whitelistToggle']);

    // this.bindEvents() wires up jQuery selectors to events and their handlers:
    this.bindEvents([[this.$whitelistToggle, 'click', this._whitelistClick]]);
};

Site.prototype = $.extend({}, Parent.prototype, {
    _whitelistClick: function _whitelistClick(e) {
        console.log('set whitelist for ' + this.model.domain + ' to ' + this.model.isWhitelisted);

        this.model.toggleWhitelist();
    }

    // _handleClick: function (e) {
    //     console.log('Site _handleClick()');
    //     this.model.doSite();
    // }

});

module.exports = Site;

},{}],13:[function(require,module,exports){
"use strict";

var Parent = window.DDG.base.View;

function TrackerList(ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    console.log("new trackerlist view");
};

TrackerList.prototype = $.extend({}, Parent.prototype, {

    // _handleClick: function (e) {
    //     console.log('TrackerList _handleClick()');
    // }

});

module.exports = TrackerList;

},{}],14:[function(require,module,exports){
var document = require('global/document')
var hyperx = require('hyperx')
var onload = require('on-load')

var SVGNS = 'http://www.w3.org/2000/svg'
var XLINKNS = 'http://www.w3.org/1999/xlink'

var BOOL_PROPS = {
  autofocus: 1,
  checked: 1,
  defaultchecked: 1,
  disabled: 1,
  formnovalidate: 1,
  indeterminate: 1,
  readonly: 1,
  required: 1,
  selected: 1,
  willvalidate: 1
}
var COMMENT_TAG = '!--'
var SVG_TAGS = [
  'svg',
  'altGlyph', 'altGlyphDef', 'altGlyphItem', 'animate', 'animateColor',
  'animateMotion', 'animateTransform', 'circle', 'clipPath', 'color-profile',
  'cursor', 'defs', 'desc', 'ellipse', 'feBlend', 'feColorMatrix',
  'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting',
  'feDisplacementMap', 'feDistantLight', 'feFlood', 'feFuncA', 'feFuncB',
  'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode',
  'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting',
  'feSpotLight', 'feTile', 'feTurbulence', 'filter', 'font', 'font-face',
  'font-face-format', 'font-face-name', 'font-face-src', 'font-face-uri',
  'foreignObject', 'g', 'glyph', 'glyphRef', 'hkern', 'image', 'line',
  'linearGradient', 'marker', 'mask', 'metadata', 'missing-glyph', 'mpath',
  'path', 'pattern', 'polygon', 'polyline', 'radialGradient', 'rect',
  'set', 'stop', 'switch', 'symbol', 'text', 'textPath', 'title', 'tref',
  'tspan', 'use', 'view', 'vkern'
]

function belCreateElement (tag, props, children) {
  var el

  // If an svg tag, it needs a namespace
  if (SVG_TAGS.indexOf(tag) !== -1) {
    props.namespace = SVGNS
  }

  // If we are using a namespace
  var ns = false
  if (props.namespace) {
    ns = props.namespace
    delete props.namespace
  }

  // Create the element
  if (ns) {
    el = document.createElementNS(ns, tag)
  } else if (tag === COMMENT_TAG) {
    return document.createComment(props.comment)
  } else {
    el = document.createElement(tag)
  }

  // If adding onload events
  if (props.onload || props.onunload) {
    var load = props.onload || function () {}
    var unload = props.onunload || function () {}
    onload(el, function belOnload () {
      load(el)
    }, function belOnunload () {
      unload(el)
    },
    // We have to use non-standard `caller` to find who invokes `belCreateElement`
    belCreateElement.caller.caller.caller)
    delete props.onload
    delete props.onunload
  }

  // Create the properties
  for (var p in props) {
    if (props.hasOwnProperty(p)) {
      var key = p.toLowerCase()
      var val = props[p]
      // Normalize className
      if (key === 'classname') {
        key = 'class'
        p = 'class'
      }
      // The for attribute gets transformed to htmlFor, but we just set as for
      if (p === 'htmlFor') {
        p = 'for'
      }
      // If a property is boolean, set itself to the key
      if (BOOL_PROPS[key]) {
        if (val === 'true') val = key
        else if (val === 'false') continue
      }
      // If a property prefers being set directly vs setAttribute
      if (key.slice(0, 2) === 'on') {
        el[p] = val
      } else {
        if (ns) {
          if (p === 'xlink:href') {
            el.setAttributeNS(XLINKNS, p, val)
          } else if (/^xmlns($|:)/i.test(p)) {
            // skip xmlns definitions
          } else {
            el.setAttributeNS(null, p, val)
          }
        } else {
          el.setAttribute(p, val)
        }
      }
    }
  }

  function appendChild (childs) {
    if (!Array.isArray(childs)) return
    for (var i = 0; i < childs.length; i++) {
      var node = childs[i]
      if (Array.isArray(node)) {
        appendChild(node)
        continue
      }

      if (typeof node === 'number' ||
        typeof node === 'boolean' ||
        typeof node === 'function' ||
        node instanceof Date ||
        node instanceof RegExp) {
        node = node.toString()
      }

      if (typeof node === 'string') {
        if (el.lastChild && el.lastChild.nodeName === '#text') {
          el.lastChild.nodeValue += node
          continue
        }
        node = document.createTextNode(node)
      }

      if (node && node.nodeType) {
        el.appendChild(node)
      }
    }
  }
  appendChild(children)

  return el
}

module.exports = hyperx(belCreateElement, {comments: true})
module.exports.default = module.exports
module.exports.createElement = belCreateElement

},{"global/document":16,"hyperx":19,"on-load":20}],15:[function(require,module,exports){

},{}],16:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

var doccy;

if (typeof document !== 'undefined') {
    doccy = document;
} else {
    doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }
}

module.exports = doccy;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"min-document":15}],17:[function(require,module,exports){
(function (global){
var win;

if (typeof window !== "undefined") {
    win = window;
} else if (typeof global !== "undefined") {
    win = global;
} else if (typeof self !== "undefined"){
    win = self;
} else {
    win = {};
}

module.exports = win;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],18:[function(require,module,exports){
module.exports = attributeToProperty

var transform = {
  'class': 'className',
  'for': 'htmlFor',
  'http-equiv': 'httpEquiv'
}

function attributeToProperty (h) {
  return function (tagName, attrs, children) {
    for (var attr in attrs) {
      if (attr in transform) {
        attrs[transform[attr]] = attrs[attr]
        delete attrs[attr]
      }
    }
    return h(tagName, attrs, children)
  }
}

},{}],19:[function(require,module,exports){
var attrToProp = require('hyperscript-attribute-to-property')

var VAR = 0, TEXT = 1, OPEN = 2, CLOSE = 3, ATTR = 4
var ATTR_KEY = 5, ATTR_KEY_W = 6
var ATTR_VALUE_W = 7, ATTR_VALUE = 8
var ATTR_VALUE_SQ = 9, ATTR_VALUE_DQ = 10
var ATTR_EQ = 11, ATTR_BREAK = 12
var COMMENT = 13

module.exports = function (h, opts) {
  if (!opts) opts = {}
  var concat = opts.concat || function (a, b) {
    return String(a) + String(b)
  }
  if (opts.attrToProp !== false) {
    h = attrToProp(h)
  }

  return function (strings) {
    var state = TEXT, reg = ''
    var arglen = arguments.length
    var parts = []

    for (var i = 0; i < strings.length; i++) {
      if (i < arglen - 1) {
        var arg = arguments[i+1]
        var p = parse(strings[i])
        var xstate = state
        if (xstate === ATTR_VALUE_DQ) xstate = ATTR_VALUE
        if (xstate === ATTR_VALUE_SQ) xstate = ATTR_VALUE
        if (xstate === ATTR_VALUE_W) xstate = ATTR_VALUE
        if (xstate === ATTR) xstate = ATTR_KEY
        p.push([ VAR, xstate, arg ])
        parts.push.apply(parts, p)
      } else parts.push.apply(parts, parse(strings[i]))
    }

    var tree = [null,{},[]]
    var stack = [[tree,-1]]
    for (var i = 0; i < parts.length; i++) {
      var cur = stack[stack.length-1][0]
      var p = parts[i], s = p[0]
      if (s === OPEN && /^\//.test(p[1])) {
        var ix = stack[stack.length-1][1]
        if (stack.length > 1) {
          stack.pop()
          stack[stack.length-1][0][2][ix] = h(
            cur[0], cur[1], cur[2].length ? cur[2] : undefined
          )
        }
      } else if (s === OPEN) {
        var c = [p[1],{},[]]
        cur[2].push(c)
        stack.push([c,cur[2].length-1])
      } else if (s === ATTR_KEY || (s === VAR && p[1] === ATTR_KEY)) {
        var key = ''
        var copyKey
        for (; i < parts.length; i++) {
          if (parts[i][0] === ATTR_KEY) {
            key = concat(key, parts[i][1])
          } else if (parts[i][0] === VAR && parts[i][1] === ATTR_KEY) {
            if (typeof parts[i][2] === 'object' && !key) {
              for (copyKey in parts[i][2]) {
                if (parts[i][2].hasOwnProperty(copyKey) && !cur[1][copyKey]) {
                  cur[1][copyKey] = parts[i][2][copyKey]
                }
              }
            } else {
              key = concat(key, parts[i][2])
            }
          } else break
        }
        if (parts[i][0] === ATTR_EQ) i++
        var j = i
        for (; i < parts.length; i++) {
          if (parts[i][0] === ATTR_VALUE || parts[i][0] === ATTR_KEY) {
            if (!cur[1][key]) cur[1][key] = strfn(parts[i][1])
            else cur[1][key] = concat(cur[1][key], parts[i][1])
          } else if (parts[i][0] === VAR
          && (parts[i][1] === ATTR_VALUE || parts[i][1] === ATTR_KEY)) {
            if (!cur[1][key]) cur[1][key] = strfn(parts[i][2])
            else cur[1][key] = concat(cur[1][key], parts[i][2])
          } else {
            if (key.length && !cur[1][key] && i === j
            && (parts[i][0] === CLOSE || parts[i][0] === ATTR_BREAK)) {
              // https://html.spec.whatwg.org/multipage/infrastructure.html#boolean-attributes
              // empty string is falsy, not well behaved value in browser
              cur[1][key] = key.toLowerCase()
            }
            break
          }
        }
      } else if (s === ATTR_KEY) {
        cur[1][p[1]] = true
      } else if (s === VAR && p[1] === ATTR_KEY) {
        cur[1][p[2]] = true
      } else if (s === CLOSE) {
        if (selfClosing(cur[0]) && stack.length) {
          var ix = stack[stack.length-1][1]
          stack.pop()
          stack[stack.length-1][0][2][ix] = h(
            cur[0], cur[1], cur[2].length ? cur[2] : undefined
          )
        }
      } else if (s === VAR && p[1] === TEXT) {
        if (p[2] === undefined || p[2] === null) p[2] = ''
        else if (!p[2]) p[2] = concat('', p[2])
        if (Array.isArray(p[2][0])) {
          cur[2].push.apply(cur[2], p[2])
        } else {
          cur[2].push(p[2])
        }
      } else if (s === TEXT) {
        cur[2].push(p[1])
      } else if (s === ATTR_EQ || s === ATTR_BREAK) {
        // no-op
      } else {
        throw new Error('unhandled: ' + s)
      }
    }

    if (tree[2].length > 1 && /^\s*$/.test(tree[2][0])) {
      tree[2].shift()
    }

    if (tree[2].length > 2
    || (tree[2].length === 2 && /\S/.test(tree[2][1]))) {
      throw new Error(
        'multiple root elements must be wrapped in an enclosing tag'
      )
    }
    if (Array.isArray(tree[2][0]) && typeof tree[2][0][0] === 'string'
    && Array.isArray(tree[2][0][2])) {
      tree[2][0] = h(tree[2][0][0], tree[2][0][1], tree[2][0][2])
    }
    return tree[2][0]

    function parse (str) {
      var res = []
      if (state === ATTR_VALUE_W) state = ATTR
      for (var i = 0; i < str.length; i++) {
        var c = str.charAt(i)
        if (state === TEXT && c === '<') {
          if (reg.length) res.push([TEXT, reg])
          reg = ''
          state = OPEN
        } else if (c === '>' && !quot(state) && state !== COMMENT) {
          if (state === OPEN) {
            res.push([OPEN,reg])
          } else if (state === ATTR_KEY) {
            res.push([ATTR_KEY,reg])
          } else if (state === ATTR_VALUE && reg.length) {
            res.push([ATTR_VALUE,reg])
          }
          res.push([CLOSE])
          reg = ''
          state = TEXT
        } else if (state === COMMENT && /-$/.test(reg) && c === '-') {
          if (opts.comments) {
            res.push([ATTR_VALUE,reg.substr(0, reg.length - 1)],[CLOSE])
          }
          reg = ''
          state = TEXT
        } else if (state === OPEN && /^!--$/.test(reg)) {
          if (opts.comments) {
            res.push([OPEN, reg],[ATTR_KEY,'comment'],[ATTR_EQ])
          }
          reg = c
          state = COMMENT
        } else if (state === TEXT || state === COMMENT) {
          reg += c
        } else if (state === OPEN && /\s/.test(c)) {
          res.push([OPEN, reg])
          reg = ''
          state = ATTR
        } else if (state === OPEN) {
          reg += c
        } else if (state === ATTR && /[^\s"'=/]/.test(c)) {
          state = ATTR_KEY
          reg = c
        } else if (state === ATTR && /\s/.test(c)) {
          if (reg.length) res.push([ATTR_KEY,reg])
          res.push([ATTR_BREAK])
        } else if (state === ATTR_KEY && /\s/.test(c)) {
          res.push([ATTR_KEY,reg])
          reg = ''
          state = ATTR_KEY_W
        } else if (state === ATTR_KEY && c === '=') {
          res.push([ATTR_KEY,reg],[ATTR_EQ])
          reg = ''
          state = ATTR_VALUE_W
        } else if (state === ATTR_KEY) {
          reg += c
        } else if ((state === ATTR_KEY_W || state === ATTR) && c === '=') {
          res.push([ATTR_EQ])
          state = ATTR_VALUE_W
        } else if ((state === ATTR_KEY_W || state === ATTR) && !/\s/.test(c)) {
          res.push([ATTR_BREAK])
          if (/[\w-]/.test(c)) {
            reg += c
            state = ATTR_KEY
          } else state = ATTR
        } else if (state === ATTR_VALUE_W && c === '"') {
          state = ATTR_VALUE_DQ
        } else if (state === ATTR_VALUE_W && c === "'") {
          state = ATTR_VALUE_SQ
        } else if (state === ATTR_VALUE_DQ && c === '"') {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK])
          reg = ''
          state = ATTR
        } else if (state === ATTR_VALUE_SQ && c === "'") {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK])
          reg = ''
          state = ATTR
        } else if (state === ATTR_VALUE_W && !/\s/.test(c)) {
          state = ATTR_VALUE
          i--
        } else if (state === ATTR_VALUE && /\s/.test(c)) {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK])
          reg = ''
          state = ATTR
        } else if (state === ATTR_VALUE || state === ATTR_VALUE_SQ
        || state === ATTR_VALUE_DQ) {
          reg += c
        }
      }
      if (state === TEXT && reg.length) {
        res.push([TEXT,reg])
        reg = ''
      } else if (state === ATTR_VALUE && reg.length) {
        res.push([ATTR_VALUE,reg])
        reg = ''
      } else if (state === ATTR_VALUE_DQ && reg.length) {
        res.push([ATTR_VALUE,reg])
        reg = ''
      } else if (state === ATTR_VALUE_SQ && reg.length) {
        res.push([ATTR_VALUE,reg])
        reg = ''
      } else if (state === ATTR_KEY) {
        res.push([ATTR_KEY,reg])
        reg = ''
      }
      return res
    }
  }

  function strfn (x) {
    if (typeof x === 'function') return x
    else if (typeof x === 'string') return x
    else if (x && typeof x === 'object') return x
    else return concat('', x)
  }
}

function quot (state) {
  return state === ATTR_VALUE_SQ || state === ATTR_VALUE_DQ
}

var hasOwn = Object.prototype.hasOwnProperty
function has (obj, key) { return hasOwn.call(obj, key) }

var closeRE = RegExp('^(' + [
  'area', 'base', 'basefont', 'bgsound', 'br', 'col', 'command', 'embed',
  'frame', 'hr', 'img', 'input', 'isindex', 'keygen', 'link', 'meta', 'param',
  'source', 'track', 'wbr', '!--',
  // SVG TAGS
  'animate', 'animateTransform', 'circle', 'cursor', 'desc', 'ellipse',
  'feBlend', 'feColorMatrix', 'feComposite',
  'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap',
  'feDistantLight', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR',
  'feGaussianBlur', 'feImage', 'feMergeNode', 'feMorphology',
  'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile',
  'feTurbulence', 'font-face-format', 'font-face-name', 'font-face-uri',
  'glyph', 'glyphRef', 'hkern', 'image', 'line', 'missing-glyph', 'mpath',
  'path', 'polygon', 'polyline', 'rect', 'set', 'stop', 'tref', 'use', 'view',
  'vkern'
].join('|') + ')(?:[\.#][a-zA-Z0-9\u007F-\uFFFF_:-]+)*$')
function selfClosing (tag) { return closeRE.test(tag) }

},{"hyperscript-attribute-to-property":18}],20:[function(require,module,exports){
/* global MutationObserver */
var document = require('global/document')
var window = require('global/window')
var watch = Object.create(null)
var KEY_ID = 'onloadid' + (new Date() % 9e6).toString(36)
var KEY_ATTR = 'data-' + KEY_ID
var INDEX = 0

if (window && window.MutationObserver) {
  var observer = new MutationObserver(function (mutations) {
    if (Object.keys(watch).length < 1) return
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].attributeName === KEY_ATTR) {
        eachAttr(mutations[i], turnon, turnoff)
        continue
      }
      eachMutation(mutations[i].removedNodes, turnoff)
      eachMutation(mutations[i].addedNodes, turnon)
    }
  })
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeOldValue: true,
    attributeFilter: [KEY_ATTR]
  })
}

module.exports = function onload (el, on, off, caller) {
  on = on || function () {}
  off = off || function () {}
  el.setAttribute(KEY_ATTR, 'o' + INDEX)
  watch['o' + INDEX] = [on, off, 0, caller || onload.caller]
  INDEX += 1
  return el
}

function turnon (index, el) {
  if (watch[index][0] && watch[index][2] === 0) {
    watch[index][0](el)
    watch[index][2] = 1
  }
}

function turnoff (index, el) {
  if (watch[index][1] && watch[index][2] === 1) {
    watch[index][1](el)
    watch[index][2] = 0
  }
}

function eachAttr (mutation, on, off) {
  var newValue = mutation.target.getAttribute(KEY_ATTR)
  if (sameOrigin(mutation.oldValue, newValue)) {
    watch[newValue] = watch[mutation.oldValue]
    return
  }
  if (watch[mutation.oldValue]) {
    off(mutation.oldValue, mutation.target)
  }
  if (watch[newValue]) {
    on(newValue, mutation.target)
  }
}

function sameOrigin (oldValue, newValue) {
  if (!oldValue || !newValue) return false
  return watch[oldValue][3] === watch[newValue][3]
}

function eachMutation (nodes, fn) {
  var keys = Object.keys(watch)
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i] && nodes[i].getAttribute && nodes[i].getAttribute(KEY_ATTR)) {
      var onloadid = nodes[i].getAttribute(KEY_ATTR)
      keys.forEach(function (k) {
        if (onloadid === k) {
          fn(k, nodes[i])
        }
      })
    }
    if (nodes[i].childNodes.length > 0) {
      eachMutation(nodes[i].childNodes, fn)
    }
  }
}

},{"global/document":16,"global/window":17}]},{},[5]);
