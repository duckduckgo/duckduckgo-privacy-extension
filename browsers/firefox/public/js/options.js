(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"global/document":3,"hyperx":6,"on-load":8}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
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
},{"min-document":2}],4:[function(require,module,exports){
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
},{}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
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
            else parts[i][1]==="" || (cur[1][key] = concat(cur[1][key], parts[i][1]));
          } else if (parts[i][0] === VAR
          && (parts[i][1] === ATTR_VALUE || parts[i][1] === ATTR_KEY)) {
            if (!cur[1][key]) cur[1][key] = strfn(parts[i][2])
            else parts[i][2]==="" || (cur[1][key] = concat(cur[1][key], parts[i][2]));
          } else {
            if (key.length && !cur[1][key] && i === j
            && (parts[i][0] === CLOSE || parts[i][0] === ATTR_BREAK)) {
              // https://html.spec.whatwg.org/multipage/infrastructure.html#boolean-attributes
              // empty string is falsy, not well behaved value in browser
              cur[1][key] = key.toLowerCase()
            }
            if (parts[i][0] === CLOSE) {
              i--
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

},{"hyperscript-attribute-to-property":5}],7:[function(require,module,exports){
assert.notEqual = notEqual
assert.notOk = notOk
assert.equal = equal
assert.ok = assert

module.exports = assert

function equal (a, b, m) {
  assert(a == b, m) // eslint-disable-line eqeqeq
}

function notEqual (a, b, m) {
  assert(a != b, m) // eslint-disable-line eqeqeq
}

function notOk (t, m) {
  assert(!t, m)
}

function assert (t, m) {
  if (!t) throw new Error(m || 'AssertionError')
}

},{}],8:[function(require,module,exports){
/* global MutationObserver */
var document = require('global/document')
var window = require('global/window')
var assert = require('assert')
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
  if (document.body) {
    beginObserve(observer)
  } else {
    document.addEventListener('DOMContentLoaded', function (event) {
      beginObserve(observer)
    })
  }
}

function beginObserve (observer) {
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeOldValue: true,
    attributeFilter: [KEY_ATTR]
  })
}

module.exports = function onload (el, on, off, caller) {
  assert(document.body, 'on-load: will not work prior to DOMContentLoaded')
  on = on || function () {}
  off = off || function () {}
  el.setAttribute(KEY_ATTR, 'o' + INDEX)
  watch['o' + INDEX] = [on, off, 0, caller || onload.caller]
  INDEX += 1
  return el
}

module.exports.KEY_ATTR = KEY_ATTR
module.exports.KEY_ID = KEY_ID

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

},{"assert":7,"global/document":3,"global/window":4}],9:[function(require,module,exports){
'use strict';

var Parent = window.DDG.base.Model;

/**
 * Background messaging is done via two methods:
 *
 * 1. Passive messages from background -> backgroundMessage model -> subscribing model
 *
 *    The background sends these messages using chrome.runtime.sendMessage({'name': 'value'})
 *    The backgroundMessage model (here) receives the message and forwards the
 *    it to the global event store via model.send(msg)
 *    Other modules that are subscribed to state changes in backgroundMessage are notified
 *
 * 2. Two-way messaging using this.model.fetch() as a passthrough
 *
 *    Each model can use a fetch method to send and receive a response from the background.
 *    Ex: this.model.fetch({'name': 'value'}).then((response) => console.log(response))
 *    Listeners must be registered in the background to respond to messages with this 'name'.
 *
 *    The common fetch method is defined in base/model.es6.js
 */
function BackgroundMessage(attrs) {
    var _this = this;

    Parent.call(this, attrs);

    // listen for messages from background and
    // notify subscribers
    chrome.runtime.onMessage.addListener(function (req) {
        if (req.whitelistChanged) _this.send('whitelistChanged');
        if (req.updateTabData) _this.send('updateTabData');
        if (req.didResetTrackersData) _this.send('didResetTrackersData', req.didResetTrackersData);
        if (req.closePopup) window.close();
    });
}

BackgroundMessage.prototype = $.extend({}, Parent.prototype, {
    modelName: 'backgroundMessage'
});

module.exports = BackgroundMessage;

},{}],10:[function(require,module,exports){
'use strict';

var Parent = window.DDG.base.Model;

function PrivacyOptions(attrs) {
    // set some default values for the toggle switches in the template
    attrs.trackerBlockingEnabled = true;
    attrs.httpsEverywhereEnabled = true;
    attrs.embeddedTweetsEnabled = false;

    Parent.call(this, attrs);
};

PrivacyOptions.prototype = $.extend({}, Parent.prototype, {

    modelName: 'privacyOptions',

    toggle: function toggle(k) {
        if (this.hasOwnProperty(k)) {
            this[k] = !this[k];
            console.log('PrivacyOptions model toggle ' + k + ' is now ' + this[k]);
            this.fetch({ updateSetting: { name: k, value: this[k] } });
        }
    },

    getSettings: function getSettings() {
        var self = this;
        return new Promise(function (resolve, reject) {
            self.fetch({ getSetting: 'all' }).then(function (settings) {
                self.trackerBlockingEnabled = settings['trackerBlockingEnabled'];
                self.httpsEverywhereEnabled = settings['httpsEverywhereEnabled'];
                self.embeddedTweetsEnabled = settings['embeddedTweetsEnabled'];
                resolve();
            });
        });
    }
});

module.exports = PrivacyOptions;

},{}],11:[function(require,module,exports){
'use strict';

var Parent = window.DDG.base.Model;

function Whitelist(attrs) {
    attrs.list = {};
    Parent.call(this, attrs);
}

Whitelist.prototype = $.extend({}, Parent.prototype, {

    modelName: 'whitelist',

    removeDomain: function removeDomain(itemIndex) {
        var domain = this.list[itemIndex];
        console.log('whitelist: remove ' + domain);

        this.fetch({ 'whitelisted': {
                list: 'whitelisted',
                domain: domain,
                value: false
            }
        });
    }
});

module.exports = Whitelist;

},{}],12:[function(require,module,exports){
'use strict';

module.exports = {
  setBrowserClassOnBodyTag: require('./set-browser-class.es6.js')
  // ...add more here!
};

},{"./set-browser-class.es6.js":13}],13:[function(require,module,exports){
'use strict';

module.exports = {
    setBrowserClassOnBodyTag: function setBrowserClassOnBodyTag() {

        chrome.runtime.sendMessage({ 'getBrowser': true }, function (browser) {
            var browserClass = 'is-browser--' + browser;
            $('html').addClass(browserClass);
            $('body').addClass(browserClass);
        });
    }
};

},{}],14:[function(require,module,exports){
'use strict';

var Parent = window.DDG.base.Page;
var mixins = require('./mixins/index.es6.js');
var PrivacyOptionsView = require('./../views/privacy-options.es6.js');
var PrivacyOptionsModel = require('./../models/privacy-options.es6.js');
var privacyOptionsTemplate = require('./../templates/privacy-options.es6.js');
var WhitelistView = require('./../views/whitelist.es6.js');
var WhitelistModel = require('./../models/whitelist.es6.js');
var whitelistTemplate = require('./../templates/whitelist.es6.js');
var BackgroundMessageModel = require('./../models/background-message.es6.js');

function Options(ops) {
    Parent.call(this, ops);
}

Options.prototype = $.extend({}, Parent.prototype, mixins.setBrowserClassOnBodyTag, {

    pageName: 'options',

    ready: function ready() {

        var $parent = $("#options-content");

        Parent.prototype.ready.call(this);

        this.setBrowserClassOnBodyTag();

        this.views.options = new PrivacyOptionsView({
            pageView: this,
            model: new PrivacyOptionsModel({}),
            appendTo: $parent,
            template: privacyOptionsTemplate
        });

        this.views.whitelist = new WhitelistView({
            pageView: this,
            model: new WhitelistModel({}),
            appendTo: $parent,
            template: whitelistTemplate
        });

        this.message = new BackgroundMessageModel({});
    }

});

// kickoff!
window.DDG = window.DDG || {};
window.DDG.page = new Options();

},{"./../models/background-message.es6.js":9,"./../models/privacy-options.es6.js":10,"./../models/whitelist.es6.js":11,"./../templates/privacy-options.es6.js":15,"./../templates/whitelist.es6.js":17,"./../views/privacy-options.es6.js":18,"./../views/whitelist.es6.js":19,"./mixins/index.es6.js":12}],15:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<section class="options-content__privacy divider-bottom">\n        <h2 class="menu-title">Options</h2>\n        <ul class="default-list">\n            <li>\n                Show Embedded Tweets\n                ', '\n            </li>\n        </ul>\n    </section>'], ['<section class="options-content__privacy divider-bottom">\n        <h2 class="menu-title">Options</h2>\n        <ul class="default-list">\n            <li>\n                Show Embedded Tweets\n                ', '\n            </li>\n        </ul>\n    </section>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');
var toggleButton = require('./shared/toggle-button.es6.js');

module.exports = function () {
    return bel(_templateObject, toggleButton(this.model.embeddedTweetsEnabled, 'js-options-embedded-tweets-enabled', 'embeddedTweetsEnabled'));

    /**
     * TODO: revisit these global options later:
        <li>
            Block Trackers
            ${toggleButton(this.model.trackerBlockingEnabled,
                           'js-options-blocktrackers',
                           'trackerBlockingEnabled')}
        </li>
        <li>
            Force Secure Connection
            ${toggleButton(this.model.httpsEverywhereEnabled,
                           'js-options-https-everywhere-enabled',
                           'httpsEverywhereEnabled')}
        </li>
     *
     */
};

},{"./shared/toggle-button.es6.js":16,"bel":1}],16:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['\n    <button class="toggle-button toggle-button--is-active-', ' ', '"\n            data-key="', '"\n            type="button">\n        <div class="toggle-button__bg">\n        </div>\n        <div class="toggle-button__knob"></div>\n    </button>'], ['\n    <button class="toggle-button toggle-button--is-active-', ' ', '"\n            data-key="', '"\n            type="button">\n        <div class="toggle-button__bg">\n        </div>\n        <div class="toggle-button__knob"></div>\n    </button>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

module.exports = function (isActiveBoolean, klass, dataKey) {

    // make `klass` and `dataKey` optional:
    klass = klass || '';
    dataKey = dataKey || '';

    return bel(_templateObject, isActiveBoolean, klass, dataKey);
};

},{"bel":1}],17:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<section class="options-content__whitelist">\n            <h2 class="menu-title">Whitelisted Sites</h2>\n            <ul class="default-list">\n                ', '\n            </ul>\n        </section>'], ['<section class="options-content__whitelist">\n            <h2 class="menu-title">Whitelisted Sites</h2>\n            <ul class="default-list">\n                ', '\n            </ul>\n        </section>']),
    _templateObject2 = _taggedTemplateLiteral(['', ''], ['', '']),
    _templateObject3 = _taggedTemplateLiteral(['\n                <li>\n                    <a class="link-secondary" href="https://', '">', '</a>\n                    <button class="remove pull-right js-whitelist-remove" data-item="', '">\xD7</button>\n                </li>'], ['\n                <li>\n                    <a class="link-secondary" href="https://', '">', '</a>\n                    <button class="remove pull-right js-whitelist-remove" data-item="', '">\xD7</button>\n                </li>']),
    _templateObject4 = _taggedTemplateLiteral(['<li>No whitelisted sites.</li>'], ['<li>No whitelisted sites.</li>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

module.exports = function () {

    return bel(_templateObject, listItems(this.model.list));

    function listItems(list) {

        if (list.length > 0) {
            var i = 0;
            return bel(_templateObject2, list.map(function (dom) {
                return bel(_templateObject3, dom, dom, i++);
            }));
        }

        return bel(_templateObject4);
    };
};

},{"bel":1}],18:[function(require,module,exports){
'use strict';

var Parent = window.DDG.base.View;

function PrivacyOptions(ops) {
    var _this = this;

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    this.model.getSettings().then(function () {
        _this.rerender();
    });
};

PrivacyOptions.prototype = $.extend({}, Parent.prototype, {

    _clickSetting: function _clickSetting(e) {
        var key = $(e.target).data('key') || $(e.target).parent().data('key');
        console.log('privacyOptions view click for setting "' + key + '"');

        this.model.toggle(key);
        this.rerender();
    },

    setup: function setup() {

        this._cacheElems('.js-options', ['blocktrackers', 'https-everywhere-enabled', 'embedded-tweets-enabled']);

        this.bindEvents([[this.$blocktrackers, 'click', this._clickSetting], [this.$httpseverywhereenabled, 'click', this._clickSetting], [this.$embeddedtweetsenabled, 'click', this._clickSetting]]);
    },

    rerender: function rerender() {
        this.unbindEvents();
        this._rerender();
        this.setup();
    }
});

module.exports = PrivacyOptions;

},{}],19:[function(require,module,exports){
'use strict';

var Parent = window.DDG.base.View;

function Whitelist(ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    // bind events
    this.setup();

    this.setWhitelistFromSettings();
};

Whitelist.prototype = $.extend({}, Parent.prototype, {

    _removeItem: function _removeItem(e) {

        var itemIndex = $(e.target).data("item");

        this.model.removeDomain(itemIndex);
        this.setWhitelistFromSettings();
    },

    setup: function setup() {
        this._cacheElems('.js-whitelist', ['remove']);

        this.bindEvents([[this.$remove, 'click', this._removeItem], [this.store.subscribe, 'action:backgroundMessage', this.update]]);
    },

    rerender: function rerender() {
        this.unbindEvents();
        this._rerender();
        this.setup();
    },

    // watch for changes in the whitelist and rerender
    update: function update(message) {
        if (message.action === 'whitelistChanged') {
            this.setWhitelistFromSettings();
        }
    },

    setWhitelistFromSettings: function setWhitelistFromSettings() {
        var self = this;
        this.model.fetch({ getSetting: { name: 'whitelisted' } }).then(function (list) {
            var wlist = list || {};
            self.model.list = Object.keys(wlist);
            self.model.list.sort();
            self.rerender();
        });
    }
});

module.exports = Whitelist;

},{}]},{},[14]);
