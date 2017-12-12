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
module.exports = function (str) {
	if (typeof str !== 'string') {
		throw new TypeError('Expected a string');
	}

	return str.toLowerCase().replace(/(?:^|\s|-)\S/g, function (m) {
		return m.toUpperCase();
	});
};

},{}],10:[function(require,module,exports){
module.exports={
    "TopTrackerDomains": {
        "amazon-adsystem.com": {
            "c": "Amazon",
            "t": "Advertising"
        },
        "amazon.ca": {
            "c": "Amazon",
            "t": "Advertising"
        },
        "amazon.co.jp": {
            "c": "Amazon",
            "t": "Advertising"
        },
        "amazon.co.uk": {
            "c": "Amazon",
            "t": "Advertising"
        },
        "amazon.de": {
            "c": "Amazon",
            "t": "Advertising"
        },
        "amazon.es": {
            "c": "Amazon",
            "t": "Advertising"
        },
        "amazon.fr": {
            "c": "Amazon",
            "t": "Advertising"
        },
        "amazon.it": {
            "c": "Amazon",
            "t": "Advertising"
        },
        "assoc-amazon.com": {
            "c": "Amazon",
            "t": "Advertising"
        },
        "adlantic.nl": {
            "c": "AppNexus",
            "t": "Advertising"
        },
        "adnxs.com": {
            "c": "AppNexus",
            "t": "Advertising"
        },
        "adrdgt.com": {
            "c": "AppNexus",
            "t": "Advertising"
        },
        "appnexus.com": {
            "c": "AppNexus",
            "t": "Advertising"
        },
        "alenty.com": {
            "c": "AppNexus",
            "t": "Advertising"
        },
        "adroitinteractive.com": {
            "c": "MediaMath",
            "t": "Advertising"
        },
        "designbloxlive.com": {
            "c": "MediaMath",
            "t": "Advertising"
        },
        "mathtag.com": {
            "c": "MediaMath",
            "t": "Advertising"
        },
        "mediamath.com": {
            "c": "MediaMath",
            "t": "Advertising"
        },
        "estara.com": {
            "c": "Oracle",
            "t": "Advertising"
        },
        "alexametrics.com": {
            "c": "Amazon",
            "t": "Analytics"
        },
        "polldaddy.com": {
            "c": "Automattic",
            "t": "Analytics"
        },
        "facebook.com": {
            "c": "Facebook",
            "t": "Social"
        },
        "facebook.de": {
            "c": "Facebook",
            "t": "Social"
        },
        "facebook.fr": {
            "c": "Facebook",
            "t": "Social"
        },
        "facebook.net": {
            "c": "Facebook",
            "t": "Social"
        },
        "fb.com": {
            "c": "Facebook",
            "t": "Social"
        },
        "atlassolutions.com": {
            "c": "Facebook",
            "t": "Social"
        },
        "friendfeed.com": {
            "c": "Facebook",
            "t": "Social"
        },
        "2mdn.net": {
            "c": "Google",
            "t": "Advertising"
        },
        "admeld.com": {
            "c": "Google",
            "t": "Advertising"
        },
        "admob.com": {
            "c": "Google",
            "t": "Advertising"
        },
        "cc-dt.com": {
            "c": "Google",
            "t": "Advertising"
        },
        "destinationurl.com": {
            "c": "Google",
            "t": "Advertising"
        },
        "developers.google.com": {
            "c": "Google",
            "t": "Social"
        },
        "doubleclick.net": {
            "c": "Google",
            "t": "Advertising"
        },
        "gmail.com": {
            "c": "Google",
            "t": "Social"
        },
        "google-analytics.com": {
            "c": "Google",
            "t": "Analytics"
        },
        "adwords.google.com": {
            "c": "Google",
            "t": "Advertising"
        },
        "mail.google.com": {
            "c": "Google",
            "t": "Social"
        },
        "inbox.google.com": {
            "c": "Google",
            "t": "Social"
        },
        "plus.google.com": {
            "c": "Google",
            "t": "Social"
        },
        "plusone.google.com": {
            "c": "Google",
            "t": "Social"
        },
        "voice.google.com": {
            "c": "Google",
            "t": "Social"
        },
        "wave.google.com": {
            "c": "Google",
            "t": "Social"
        },
        "googleadservices.com": {
            "c": "Google",
            "t": "Advertising"
        },
        "googlemail.com": {
            "c": "Google",
            "t": "Social"
        },
        "googlesyndication.com": {
            "c": "Google",
            "t": "Advertising"
        },
        "googletagservices.com": {
            "c": "Google",
            "t": "Advertising"
        },
        "invitemedia.com": {
            "c": "Google",
            "t": "Advertising"
        },
        "orkut.com": {
            "c": "Google",
            "t": "Social"
        },
        "postrank.com": {
            "c": "Google",
            "t": "Analytics"
        },
        "smtad.net": {
            "c": "Google",
            "t": "Advertising"
        },
        "teracent.com": {
            "c": "Google",
            "t": "Advertising"
        },
        "teracent.net": {
            "c": "Google",
            "t": "Advertising"
        },
        "ytsa.net": {
            "c": "Google",
            "t": "Advertising"
        },
        "googletagmanager.com": {
            "c": "Google",
            "t": "Disconnect"
        },
        "backtype.com": {
            "c": "Twitter",
            "t": "Social"
        },
        "crashlytics.com": {
            "c": "Twitter",
            "t": "Social"
        },
        "tweetdeck.com": {
            "c": "Twitter",
            "t": "Social"
        },
        "twimg.com": {
            "c": "Twitter",
            "t": "Social"
        },
        "twitter.com": {
            "c": "Twitter",
            "t": "Social"
        },
        "twitter.jp": {
            "c": "Twitter",
            "t": "Social"
        }
    },
    "Advertising": {
        "2leep.com": {
            "c": "2leep.com",
            "u": "http://2leep.com/"
        },
        "33across.com": {
            "c": "33Across",
            "u": "http://33across.com/"
        },
        "365dm.com": {
            "c": "365Media",
            "u": "http://365media.com/"
        },
        "365media.com": {
            "c": "365Media",
            "u": "http://365media.com/"
        },
        "4info.com": {
            "c": "4INFO",
            "u": "http://www.4info.com/"
        },
        "adhaven.com": {
            "c": "4INFO",
            "u": "http://www.4info.com/"
        },
        "4mads.com": {
            "c": "4mads",
            "u": "http://4mads.com/"
        },
        "adeurope.com": {
            "c": "AD Europe",
            "u": "http://www.adeurope.com/"
        },
        "ad2onegroup.com": {
            "c": "AD2ONE",
            "u": "http://www.ad2onegroup.com/"
        },
        "adition.com": {
            "c": "ADITION",
            "u": "http://www.adition.com/"
        },
        "admission.net": {
            "c": "ADP Dealer Services",
            "u": "http://www.adpdealerservices.com/"
        },
        "adpdealerservices.com": {
            "c": "ADP Dealer Services",
            "u": "http://www.adpdealerservices.com/"
        },
        "cobalt.com": {
            "c": "ADP Dealer Services",
            "u": "http://www.adpdealerservices.com/"
        },
        "adtech.com": {
            "c": "ADTECH",
            "u": "http://www.adtech.com/"
        },
        "adtech.de": {
            "c": "ADTECH",
            "u": "http://www.adtech.com/"
        },
        "adtechus.com": {
            "c": "ADTECH",
            "u": "http://www.adtech.com/"
        },
        "adtelligence.de": {
            "c": "ADTELLIGENCE",
            "u": "http://www.adtelligence.de/"
        },
        "adzcentral.com": {
            "c": "ADZ",
            "u": "http://www.adzcentral.com/"
        },
        "aerifymedia.com": {
            "c": "AERIFY MEDIA",
            "u": "http://aerifymedia.com/"
        },
        "anonymous-media.com": {
            "c": "AERIFY MEDIA",
            "u": "http://aerifymedia.com/"
        },
        "aggregateknowledge.com": {
            "c": "AK",
            "u": "http://www.aggregateknowledge.com/"
        },
        "agkn.com": {
            "c": "AK",
            "u": "http://www.aggregateknowledge.com/"
        },
        "adsonar.com": {
            "c": "AOL",
            "u": "http://www.aol.com/"
        },
        "advertising.com": {
            "c": "AOL",
            "u": "http://www.aol.com/"
        },
        "atwola.com": {
            "c": "AOL",
            "u": "http://www.aol.com/"
        },
        "leadback.com": {
            "c": "AOL",
            "u": "http://www.aol.com/"
        },
        "tacoda.net": {
            "c": "AOL",
            "u": "http://www.aol.com/"
        },
        "adtechjp.com": {
            "c": "AOL",
            "u": "http://www.aol.com/"
        },
        "hit-parade.com": {
            "c": "AT Internet",
            "u": "http://www.atinternet.com/"
        },
        "att.com": {
            "c": "AT&T",
            "u": "http://www.att.com/"
        },
        "yp.com": {
            "c": "AT&T",
            "u": "http://www.att.com/"
        },
        "affiliatetracking.com": {
            "c": "ATN",
            "u": "http://affiliatetracking.com/"
        },
        "am.ua": {
            "c": "AUTOCENTRE.UA",
            "u": "http://www.autocentre.ua/"
        },
        "autocentre.ua": {
            "c": "AUTOCENTRE.UA",
            "u": "http://www.autocentre.ua/"
        },
        "aweber.com": {
            "c": "AWeber",
            "u": "http://www.aweber.com/"
        },
        "abaxinteractive.com": {
            "c": "Abax Interactive",
            "u": "http://abaxinteractive.com/"
        },
        "accelia.net": {
            "c": "Accelia",
            "u": "http://www.accelia.net/"
        },
        "durasite.net": {
            "c": "Accelia",
            "u": "http://www.accelia.net/"
        },
        "accordantmedia.com": {
            "c": "Accordant Media",
            "u": "http://www.accordantmedia.com/"
        },
        "acquisio.com": {
            "c": "Acquisio",
            "u": "http://www.acquisio.com/"
        },
        "clickequations.net": {
            "c": "Acquisio",
            "u": "http://www.acquisio.com/"
        },
        "act-on.com": {
            "c": "Act-On",
            "u": "http://www.act-on.com/"
        },
        "actonsoftware.com": {
            "c": "Act-On",
            "u": "http://www.act-on.com/"
        },
        "actisens.com": {
            "c": "Actisens",
            "u": "http://www.actisens.com/"
        },
        "gestionpub.com": {
            "c": "Actisens",
            "u": "http://www.actisens.com/"
        },
        "activeconversion.com": {
            "c": "ActiveConversion",
            "u": "http://www.activeconversion.com/"
        },
        "activemeter.com": {
            "c": "ActiveConversion",
            "u": "http://www.activeconversion.com/"
        },
        "acuity.com": {
            "c": "Acuity",
            "u": "http://www.acuity.com/"
        },
        "acuityads.com": {
            "c": "Acuity",
            "u": "http://www.acuity.com/"
        },
        "acuityplatform.com": {
            "c": "Acuity",
            "u": "http://www.acuity.com/"
        },
        "a2dfp.net": {
            "c": "Ad Decisive",
            "u": "http://www.addecisive.com/"
        },
        "addecisive.com": {
            "c": "Ad Decisive",
            "u": "http://www.addecisive.com/"
        },
        "addynamo.com": {
            "c": "Ad Dynamo",
            "u": "http://www.addynamo.com/"
        },
        "addynamo.net": {
            "c": "Ad Dynamo",
            "u": "http://www.addynamo.com/"
        },
        "adknife.com": {
            "c": "Ad Knife",
            "u": "http://static.adknife.com/"
        },
        "admagnet.com": {
            "c": "Ad Magnet",
            "u": "http://www.admagnet.com/"
        },
        "admagnet.net": {
            "c": "Ad Magnet",
            "u": "http://www.admagnet.com/"
        },
        "ad4game.com": {
            "c": "Ad4Game",
            "u": "http://ad4game.com/"
        },
        "adcirrus.com": {
            "c": "AdCirrus",
            "u": "http://adcirrus.com/"
        },
        "adengage.com": {
            "c": "AdEngage",
            "u": "http://adengage.com/"
        },
        "adextent.com": {
            "c": "AdExtent",
            "u": "http://www.adextent.com/"
        },
        "adf.ly": {
            "c": "AdF.ly",
            "u": "http://adf.ly/"
        },
        "adfox.ru": {
            "c": "AdFox",
            "u": "http://adfox.ru/"
        },
        "adfrontiers.com": {
            "c": "AdFrontiers",
            "u": "http://www.adfrontiers.com/"
        },
        "adgentdigital.com": {
            "c": "AdGent Digital",
            "u": "http://www.adgentdigital.com/"
        },
        "shorttailmedia.com": {
            "c": "AdGent Digital",
            "u": "http://www.adgentdigital.com/"
        },
        "adgibbon.com": {
            "c": "AdGibbon",
            "u": "http://www.adgibbon.com/"
        },
        "adiquity.com": {
            "c": "AdIQuity",
            "u": "http://adiquity.com/"
        },
        "adinsight.com": {
            "c": "AdInsight",
            "u": "http://www.adinsight.com/"
        },
        "adinsight.eu": {
            "c": "AdInsight",
            "u": "http://www.adinsight.com/"
        },
        "adjug.com": {
            "c": "AdJug",
            "u": "http://www.adjug.com/"
        },
        "adjuggler.com": {
            "c": "AdJuggler",
            "u": "http://www.adjuggler.com/"
        },
        "adjuggler.net": {
            "c": "AdJuggler",
            "u": "http://www.adjuggler.com/"
        },
        "adkeeper.com": {
            "c": "AdKeeper",
            "u": "http://www.adkeeper.com/"
        },
        "akncdn.com": {
            "c": "AdKeeper",
            "u": "http://www.adkeeper.com/"
        },
        "adkernel.com": {
            "c": "AdKernel",
            "u": "http://adkernel.com"
        },
        "adimg.net": {
            "c": "AdLantis",
            "u": "http://www.adlantis.jp/"
        },
        "adlantis.jp": {
            "c": "AdLantis",
            "u": "http://www.adlantis.jp/"
        },
        "adleave.com": {
            "c": "AdLeave",
            "u": "http://www.adleave.com/"
        },
        "admarvel.com": {
            "c": "AdMarvel",
            "u": "http://www.admarvel.com/"
        },
        "admaximizer.com": {
            "c": "AdMaximizer Network",
            "u": "http://admaximizer.com/"
        },
        "admedia.com": {
            "c": "AdMedia",
            "u": "http://www.admedia.com/"
        },
        "adnetwork.net": {
            "c": "AdNetwork.net",
            "u": "http://www.adnetwork.net/"
        },
        "adocean-global.com": {
            "c": "AdOcean",
            "u": "http://www.adocean-global.com/"
        },
        "adocean.pl": {
            "c": "AdOcean",
            "u": "http://www.adocean-global.com/"
        },
        "adonnetwork.com": {
            "c": "Prime Visibility",
            "u": "http://www.primevisibility.com/"
        },
        "dashboardad.net": {
            "c": "AdOn Network",
            "u": "http://adonnetwork.com/"
        },
        "adonion.com": {
            "c": "AdOnion",
            "u": "http://www.adonion.com/"
        },
        "adperfect.com": {
            "c": "AdPerfect",
            "u": "http://www.adperfect.com/"
        },
        "adpredictive.com": {
            "c": "AdPredictive",
            "u": "http://www.adpredictive.com/"
        },
        "adreactor.com": {
            "c": "AdReactor",
            "u": "http://www.adreactor.com/"
        },
        "adready.com": {
            "c": "AdReady",
            "u": "http://www.adready.com/"
        },
        "adreadytractions.com": {
            "c": "AdReady",
            "u": "http://www.adready.com/"
        },
        "adrevolution.com": {
            "c": "AdRevolution",
            "u": "http://adrevolution.com/"
        },
        "adriver.ru": {
            "c": "AdRiver",
            "u": "http://adriver.ru/"
        },
        "adroll.com": {
            "c": "AdRoll",
            "u": "http://www.adroll.com/"
        },
        "adsafemedia.com": {
            "c": "AdSafe Media",
            "u": "http://adsafemedia.com/"
        },
        "adsafeprotected.com": {
            "c": "AdSafe Media",
            "u": "http://adsafemedia.com/"
        },
        "adserverpub.com": {
            "c": "AdServerPub",
            "u": "http://www.adserverpub.com/"
        },
        "adshuffle.com": {
            "c": "AdShuffle",
            "u": "http://www.adshuffle.com/"
        },
        "adside.com": {
            "c": "AdSide",
            "u": "http://www.adside.com/"
        },
        "doclix.com": {
            "c": "AdSide",
            "u": "http://www.adside.com/"
        },
        "adsmart.com": {
            "c": "AdSmart",
            "u": "http://adsmart.com/"
        },
        "adspeed.com": {
            "c": "AdSpeed",
            "u": "http://www.adspeed.com/"
        },
        "adspeed.net": {
            "c": "AdSpeed",
            "u": "http://www.adspeed.com/"
        },
        "adspirit.com": {
            "c": "AdSpirit",
            "u": "http://www.adspirit.de/"
        },
        "adspirit.de": {
            "c": "AdSpirit",
            "u": "http://www.adspirit.de/"
        },
        "adspirit.net": {
            "c": "AdSpirit",
            "u": "http://www.adspirit.de/"
        },
        "adtiger.de": {
            "c": "AdTiger",
            "u": "http://www.adtiger.de/"
        },
        "adtruth.com": {
            "c": "AdTruth",
            "u": "http://adtruth.com/"
        },
        "adxpansion.com": {
            "c": "AdXpansion",
            "u": "http://www.adxpansion.com/"
        },
        "adality.de": {
            "c": "Adality",
            "u": "http://adality.de/"
        },
        "adrtx.net": {
            "c": "Adality",
            "u": "http://adality.de/"
        },
        "adaptiveads.com": {
            "c": "AdaptiveAds",
            "u": "http://www.adaptiveads.com/"
        },
        "adaptly.com": {
            "c": "Adaptly",
            "u": "http://adaptly.com/"
        },
        "adaramedia.com": {
            "c": "Adara Media",
            "u": "http://www.adaramedia.com/"
        },
        "opinmind.com": {
            "c": "Adara Media",
            "u": "http://www.adaramedia.com/"
        },
        "yieldoptimizer.com": {
            "c": "Adara Media",
            "u": "http://www.adaramedia.com/"
        },
        "adatus.com": {
            "c": "Adatus",
            "u": "http://www.adatus.com/"
        },
        "adbrn.com": {
            "c": "Adbrain",
            "u": "http://www.adbrain.com/"
        },
        "adbrain.com": {
            "c": "Adbrain",
            "u": "http://www.adbrain.com/"
        },
        "adbroker.de": {
            "c": "Adbroker.de",
            "u": "http://adbroker.de/"
        },
        "adchemy.com": {
            "c": "Adchemy",
            "u": "http://www.adchemy.com/"
        },
        "adconion.com": {
            "c": "Adconion",
            "u": "http://www.adconion.com/"
        },
        "amgdgt.com": {
            "c": "Adconion",
            "u": "http://www.adconion.com/"
        },
        "euroclick.com": {
            "c": "Adconion",
            "u": "http://www.adconion.com/"
        },
        "smartclip.com": {
            "c": "Adconion",
            "u": "http://www.adconion.com/"
        },
        "addvantagemedia.com": {
            "c": "Addvantage Media",
            "u": "http://www.addvantagemedia.com/"
        },
        "adfonic.com": {
            "c": "Adfonic",
            "u": "http://adfonic.com/"
        },
        "adforgeinc.com": {
            "c": "Adforge",
            "u": "http://adforgeinc.com/"
        },
        "adform.com": {
            "c": "Adform",
            "u": "http://www.adform.com/"
        },
        "adform.net": {
            "c": "Adform",
            "u": "http://www.adform.com/"
        },
        "adformdsp.net": {
            "c": "Adform",
            "u": "http://www.adform.com/"
        },
        "adfunky.com": {
            "c": "Adfunky",
            "u": "http://www.adfunky.com/"
        },
        "adfunkyserver.com": {
            "c": "Adfunky",
            "u": "http://www.adfunky.com/"
        },
        "adfusion.com": {
            "c": "Adfusion",
            "u": "http://www.adfusion.com/"
        },
        "adglare.net": {
            "c": "Adglare",
            "u": "https://www.adglare.com/"
        },
        "adglare.com": {
            "c": "Adglare",
            "u": "https://www.adglare.com/"
        },
        "adblade.com": {
            "c": "Adiant",
            "u": "http://www.adiant.com/"
        },
        "adiant.com": {
            "c": "Adiant",
            "u": "http://www.adiant.com/"
        },
        "adknowledge.com": {
            "c": "Adknowledge",
            "u": "http://www.adknowledge.com/"
        },
        "adparlor.com": {
            "c": "Adknowledge",
            "u": "http://www.adknowledge.com/"
        },
        "bidsystem.com": {
            "c": "Adknowledge",
            "u": "http://www.adknowledge.com/"
        },
        "cubics.com": {
            "c": "Adknowledge",
            "u": "http://www.adknowledge.com/"
        },
        "lookery.com": {
            "c": "Adknowledge",
            "u": "http://www.adknowledge.com/"
        },
        "adlibrium.com": {
            "c": "Adlibrium",
            "u": "http://www.adlibrium.com/"
        },
        "adlucent.com": {
            "c": "Adlucent",
            "u": "http://adlucent.com"
        },
        "admarketplace.net": {
            "c": "Admarketplace",
            "u": "http://www.admarketplace.com/"
        },
        "admarketplace.com": {
            "c": "Admarketplace",
            "u": "http://www.admarketplace.com/"
        },
        "ampxchange.com": {
            "c": "Admarketplace",
            "u": "http://www.admarketplace.com/"
        },
        "admeta.com": {
            "c": "Admeta",
            "u": "http://www.admeta.com/"
        },
        "atemda.com": {
            "c": "Admeta",
            "u": "http://www.admeta.com/"
        },
        "admicro.vn": {
            "c": "Admicro",
            "u": "http://www.admicro.vn/"
        },
        "vcmedia.vn": {
            "c": "Vcmedia",
            "u": "http://vcmedia.vn/"
        },
        "admixer.co.kr": {
            "c": "Admixer",
            "u": "https://admixer.co.kr/main"
        },
        "admized.com": {
            "c": "Admized",
            "u": "http://www.admized.com/"
        },
        "admobile.com": {
            "c": "Admobile",
            "u": "http://admobile.com/"
        },
        "admotion.com": {
            "c": "Admotion",
            "u": "http://www.admotion.com/"
        },
        "nspmotion.com": {
            "c": "Admotion",
            "u": "http://www.admotion.com/"
        },
        "adnetik.com": {
            "c": "Adnetik",
            "u": "http://adnetik.com/"
        },
        "wtp101.com": {
            "c": "Adnetik",
            "u": "http://adnetik.com/"
        },
        "2o7.net": {
            "c": "Adobe",
            "u": "http://www.adobe.com/"
        },
        "auditude.com": {
            "c": "Adobe",
            "u": "http://www.adobe.com/"
        },
        "demdex.com": {
            "c": "Adobe",
            "u": "http://www.adobe.com/"
        },
        "demdex.net": {
            "c": "Adobe",
            "u": "http://www.adobe.com/"
        },
        "dmtracker.com": {
            "c": "Adobe",
            "u": "http://www.adobe.com/"
        },
        "efrontier.com": {
            "c": "Adobe",
            "u": "http://www.adobe.com/"
        },
        "everestads.net": {
            "c": "Adobe",
            "u": "http://www.adobe.com/"
        },
        "everestjs.net": {
            "c": "Adobe",
            "u": "http://www.adobe.com/"
        },
        "everesttech.net": {
            "c": "Adobe",
            "u": "http://www.adobe.com/"
        },
        "hitbox.com": {
            "c": "Adobe",
            "u": "http://www.adobe.com/"
        },
        "omniture.com": {
            "c": "Adobe",
            "u": "http://www.adobe.com/"
        },
        "omtrdc.net": {
            "c": "Adobe",
            "u": "http://www.adobe.com/"
        },
        "touchclarity.com": {
            "c": "Adobe",
            "u": "http://www.adobe.com/"
        },
        "adometry.com": {
            "c": "Adometry",
            "u": "http://www.adometry.com/"
        },
        "dmtry.com": {
            "c": "Adometry",
            "u": "http://www.adometry.com/"
        },
        "clickotmedia.com": {
            "c": "Adorika",
            "u": "http://www.clickotmedia.com/"
        },
        "adotmob.com": {
            "c": "Adotmob",
            "u": "https://adotmob.com/"
        },
        "adperium.com": {
            "c": "Adperium",
            "u": "http://www.adperium.com/"
        },
        "adpersia.com": {
            "c": "Adpersia",
            "u": "http://www.adpersia.com/"
        },
        "adstours.com": {
            "c": "AdsTours",
            "u": "http://www.adstours.com/"
        },
        "clickintext.net": {
            "c": "AdsTours",
            "u": "http://www.adstours.com/"
        },
        "adscience.nl": {
            "c": "Adscience",
            "u": "https://www.adscience.nl/"
        },
        "adsperity.com": {
            "c": "Adsperity",
            "u": "https://www.adsperity.com/"
        },
        "adsrevenue.net": {
            "c": "Adsrevenue.net",
            "u": "http://adsrevenue.net/"
        },
        "adx1.com": {
            "c": "Adsty",
            "u": "http://adsty.com/"
        },
        "adsty.com": {
            "c": "Adsty",
            "u": "http://adsty.com/"
        },
        "4dsply.com": {
            "c": "Adsupply",
            "u": "http://www.adsupply.com/"
        },
        "adsupply.com": {
            "c": "Adsupply",
            "u": "http://www.adsupply.com/"
        },
        "adswizz.com": {
            "c": "Adswizz",
            "u": "http://adswizz.com"
        },
        "adtegrity.com": {
            "c": "Adtegrity.com",
            "u": "http://www.adtegrity.com/"
        },
        "adtegrity.net": {
            "c": "Adtegrity.com",
            "u": "http://www.adtegrity.com/"
        },
        "adultadworld.com": {
            "c": "Adult AdWorld",
            "u": "http://adultadworld.com/"
        },
        "adultmoda.com": {
            "c": "Adultmoda",
            "u": "http://www.adultmoda.com/"
        },
        "adventive.com": {
            "c": "Adventive",
            "u": "http://adventive.com/"
        },
        "adnext.fr": {
            "c": "Adverline",
            "u": "http://www.adverline.com/"
        },
        "adverline.com": {
            "c": "Adverline",
            "u": "http://www.adverline.com/"
        },
        "adversal.com": {
            "c": "Adversal.com",
            "u": "http://www.adversal.com/"
        },
        "adv-adserver.com": {
            "c": "Adversal.com",
            "u": "http://www.adversal.com/"
        },
        "advertstream.com": {
            "c": "Advert Stream",
            "u": "http://www.advertstream.com/"
        },
        "adverticum.com": {
            "c": "Adverticum",
            "u": "http://www.adverticum.com/"
        },
        "adverticum.net": {
            "c": "Adverticum",
            "u": "http://www.adverticum.com/"
        },
        "advertise.com": {
            "c": "Advertise.com",
            "u": "http://www.advertise.com/"
        },
        "advertisespace.com": {
            "c": "AdvertiseSpace",
            "u": "http://www.advertisespace.com/"
        },
        "advisormedia.cz": {
            "c": "Advisor Media",
            "u": "http://advisormedia.cz/"
        },
        "adworx.at": {
            "c": "Adworx",
            "u": "http://adworx.at/"
        },
        "adworx.be": {
            "c": "Adworx",
            "u": "http://adworx.at/"
        },
        "adworx.nl": {
            "c": "Adworx",
            "u": "http://adworx.at/"
        },
        "adxvalue.com": {
            "c": "Adxvalue",
            "u": "http://adxvalue.com/"
        },
        "adxvalue.de": {
            "c": "Adxvalue",
            "u": "http://adxvalue.com/"
        },
        "adzerk.com": {
            "c": "Adzerk",
            "u": "http://www.adzerk.com/"
        },
        "adzerk.net": {
            "c": "Adzerk",
            "u": "http://www.adzerk.com/"
        },
        "aemedia.com": {
            "c": "Aegis Group",
            "u": "http://www.aemedia.com/"
        },
        "bluestreak.com": {
            "c": "Aegis Group",
            "u": "http://www.aemedia.com/"
        },
        "affectv.co.uk": {
            "c": "Affectv",
            "u": "http://affectv.co.uk/"
        },
        "affine.tv": {
            "c": "Affine",
            "u": "http://www.affine.tv/"
        },
        "affinesystems.com": {
            "c": "Affine",
            "u": "http://www.affine.tv/"
        },
        "affinity.com": {
            "c": "Affinity",
            "u": "http://www.affinity.com/"
        },
        "afdads.com": {
            "c": "AfterDownload",
            "u": "http://www.afterdownload.com/"
        },
        "afterdownload.com": {
            "c": "AfterDownload",
            "u": "http://www.afterdownload.com/"
        },
        "aim4media.com": {
            "c": "Aim4Media",
            "u": "http://aim4media.com/"
        },
        "airpush.com": {
            "c": "Airpush",
            "u": "http://www.airpush.com/"
        },
        "imiclk.com": {
            "c": "Akamai",
            "u": "http://www.akamai.com/"
        },
        "allstarmediagroup.com": {
            "c": "AllStar Media",
            "u": "http://allstarmediagroup.com/"
        },
        "aloodo.com": {
            "c": "Aloodo",
            "u": "https://aloodo.com/"
        },
        "amazon-adsystem.com": {
            "c": "Amazon",
            "u": "http://www.amazon.com/"
        },
        "amazon.ca": {
            "c": "Amazon",
            "u": "http://www.amazon.com/"
        },
        "amazon.co.jp": {
            "c": "Amazon",
            "u": "http://www.amazon.com/"
        },
        "amazon.co.uk": {
            "c": "Amazon",
            "u": "http://www.amazon.com/"
        },
        "amazon.de": {
            "c": "Amazon",
            "u": "http://www.amazon.com/"
        },
        "amazon.es": {
            "c": "Amazon",
            "u": "http://www.amazon.com/"
        },
        "amazon.fr": {
            "c": "Amazon",
            "u": "http://www.amazon.com/"
        },
        "amazon.it": {
            "c": "Amazon",
            "u": "http://www.amazon.com/"
        },
        "assoc-amazon.com": {
            "c": "Amazon",
            "u": "http://www.amazon.com/"
        },
        "adnetwork.vn": {
            "c": "Ambient Digital",
            "u": "http://ambientdigital.com.vn/"
        },
        "ambientdigital.com.vn": {
            "c": "Ambient Digital",
            "u": "http://ambientdigital.com.vn/"
        },
        "amobee.com": {
            "c": "Amobee",
            "u": "http://amobee.com/"
        },
        "andbeyond.media": {
            "c": "AndBeyond",
            "u": "http://andbeyond.media/"
        },
        "dsply.com": {
            "c": "Answers.com",
            "u": "http://www.answers.com/"
        },
        "appflood.com": {
            "c": "AppFlood",
            "u": "http://appflood.com/"
        },
        "adlantic.nl": {
            "c": "AppNexus",
            "u": "http://www.appnexus.com/"
        },
        "adnxs.com": {
            "c": "AppNexus",
            "u": "http://www.appnexus.com/"
        },
        "adrdgt.com": {
            "c": "AppNexus",
            "u": "http://www.appnexus.com/"
        },
        "appnexus.com": {
            "c": "AppNexus",
            "u": "http://www.appnexus.com/"
        },
        "alenty.com": {
            "c": "AppNexus",
            "u": "http://www.appnexus.com/"
        },
        "appenda.com": {
            "c": "Appenda",
            "u": "http://www.appenda.com/"
        },
        "appier.com": {
            "c": "Appier",
            "u": "http://appier.com/"
        },
        "applifier.com": {
            "c": "Applifier",
            "u": "http://www.applifier.com/"
        },
        "applovin.com": {
            "c": "Applovin",
            "u": "http://www.applovin.com/"
        },
        "appsflyer.com": {
            "c": "AppsFlyer",
            "u": "http://appsflyer.com/"
        },
        "arkwrightshomebrew.com": {
            "c": "Arkwrights Homebrew",
            "u": "http://www.arkwrightshomebrew.com/"
        },
        "ctasnet.com": {
            "c": "Arkwrights Homebrew",
            "u": "http://www.arkwrightshomebrew.com/"
        },
        "atoomic.com": {
            "c": "Atoomic.com",
            "u": "http://www.atoomic.com/"
        },
        "atrinsic.com": {
            "c": "Atrinsic",
            "u": "http://atrinsic.com/"
        },
        "audienceadnetwork.com": {
            "c": "Audience Ad Network",
            "u": "http://audienceadnetwork.com/"
        },
        "audience2media.com": {
            "c": "Audience2Media",
            "u": "http://www.audience2media.com/"
        },
        "audiencescience.com": {
            "c": "AudienceScience",
            "u": "http://www.audiencescience.com/"
        },
        "revsci.net": {
            "c": "AudienceScience",
            "u": "http://www.audiencescience.com/"
        },
        "targetingmarketplace.com": {
            "c": "AudienceScience",
            "u": "http://www.audiencescience.com/"
        },
        "wunderloop.net": {
            "c": "AudienceScience",
            "u": "http://www.audiencescience.com/"
        },
        "augme.com": {
            "c": "Augme",
            "u": "http://www.augme.com/"
        },
        "hipcricket.com": {
            "c": "Augme",
            "u": "http://www.augme.com/"
        },
        "augur.io": {
            "c": "Augur",
            "u": "http://www.augur.io/"
        },
        "avalanchers.com": {
            "c": "Avalanchers",
            "u": "http://www.avalanchers.com/"
        },
        "avantlink.com": {
            "c": "AvantLink",
            "u": "http://www.avantlink.com/"
        },
        "avsads.com": {
            "c": "Avsads",
            "u": "http://avsads.com/"
        },
        "adgear.com": {
            "c": "BLOOM Digital Platforms",
            "u": "http://bloom-hq.com/"
        },
        "bloom-hq.com": {
            "c": "BLOOM Digital Platforms",
            "u": "http://bloom-hq.com/"
        },
        "adgrx.com": {
            "c": "BLOOM Digital Platforms",
            "u": "http://bloom-hq.com/"
        },
        "buzzcity.com": {
            "c": "BuzzCity",
            "u": "http://www.buzzcity.com/"
        },
        "bvmedia.ca": {
            "c": "BV! MEDIA",
            "u": "http://www.buzzcity.com/"
        },
        "networldmedia.com": {
            "c": "BV! MEDIA",
            "u": "http://www.buzzcity.com/"
        },
        "networldmedia.net": {
            "c": "BV! MEDIA",
            "u": "http://www.buzzcity.com/"
        },
        "backbeatmedia.com": {
            "c": "BackBeat Media",
            "u": "http://www.backbeatmedia.com/"
        },
        "bannerconnect.net": {
            "c": "Bannerconnect",
            "u": "http://www.bannerconnect.net/"
        },
        "barilliance.com": {
            "c": "Barilliance",
            "u": "http://www.barilliance.com/"
        },
        "baronsoffers.com": {
            "c": "BaronsNetworks",
            "u": "http://baronsoffers.com/"
        },
        "batanga.com": {
            "c": "Batanga Network",
            "u": "http://www.batanganetwork.com/"
        },
        "batanganetwork.com": {
            "c": "Batanga Network",
            "u": "http://www.batanganetwork.com/"
        },
        "beanstockmedia.com": {
            "c": "Beanstock Media",
            "u": "http://www.beanstockmedia.com/"
        },
        "begun.ru": {
            "c": "Begun",
            "u": "http://www.begun.ru/"
        },
        "betgenius.com": {
            "c": "Betgenius",
            "u": "http://www.betgenius.com/"
        },
        "connextra.com": {
            "c": "Betgenius",
            "u": "http://www.betgenius.com/"
        },
        "bidvertiser.com": {
            "c": "BidVertiser",
            "u": "http://www.bidvertiser.com/"
        },
        "binlayer.com": {
            "c": "BinLayer",
            "u": "http://binlayer.com/"
        },
        "bitcoinplus.com": {
            "c": "Bitcoin Plus",
            "u": "http://www.bitcoinplus.com/"
        },
        "bittads.com": {
            "c": "BittAds",
            "u": "http://www.bittads.com/"
        },
        "bizo.com": {
            "c": "Bizo",
            "u": "http://www.bizo.com/"
        },
        "bizographics.com": {
            "c": "Bizo",
            "u": "http://www.bizo.com/"
        },
        "blacklabelads.com": {
            "c": "Black Label Ads",
            "u": "http://www.blacklabelads.com/"
        },
        "blogcatalog.com": {
            "c": "BlogCatalog",
            "u": "http://www.blogcatalog.com/"
        },
        "theblogfrog.com": {
            "c": "BlogFrog",
            "u": "http://theblogfrog.com/"
        },
        "blogher.com": {
            "c": "BlogHer",
            "u": "http://www.blogher.com/"
        },
        "blogherads.com": {
            "c": "BlogHer",
            "u": "http://www.blogher.com/"
        },
        "blogrollr.com": {
            "c": "BlogRollr",
            "u": "http://blogrollr.com/"
        },
        "bloomreach.com": {
            "c": "BloomReach",
            "u": "http://www.bloomreach.com/"
        },
        "brcdn.com": {
            "c": "BloomReach",
            "u": "http://www.bloomreach.com/"
        },
        "brsrvr.com": {
            "c": "BloomReach",
            "u": "http://www.bloomreach.com/"
        },
        "blutrumpet.com": {
            "c": "Blu Trumpet",
            "u": "http://www.blutrumpet.com/"
        },
        "bluecava.com": {
            "c": "BlueCava",
            "u": "http://www.bluecava.com/"
        },
        "bkrtx.com": {
            "c": "BlueKai",
            "u": "http://www.bluekai.com/"
        },
        "bluekai.com": {
            "c": "BlueKai",
            "u": "http://www.bluekai.com/"
        },
        "tracksimple.com": {
            "c": "BlueKai",
            "u": "http://www.bluekai.com/"
        },
        "brainient.com": {
            "c": "Brainient",
            "u": "http://brainient.com/"
        },
        "brandaffinity.net": {
            "c": "Brand Affinity Technologies",
            "u": "http://www.brandaffinity.net/"
        },
        "brand.net": {
            "c": "Brand.net",
            "u": "http://www.brand.net/"
        },
        "brandscreen.com": {
            "c": "Brandscreen",
            "u": "http://www.brandscreen.com/"
        },
        "rtbidder.net": {
            "c": "Brandscreen",
            "u": "http://www.brandscreen.com/"
        },
        "brightroll.com": {
            "c": "BrightRoll",
            "u": "http://www.brightroll.com/"
        },
        "btrll.com": {
            "c": "BrightRoll",
            "u": "http://www.brightroll.com/"
        },
        "brighttag.com": {
            "c": "BrightTag",
            "u": "http://www.brighttag.com/"
        },
        "btstatic.com": {
            "c": "BrightTag",
            "u": "http://www.brighttag.com/"
        },
        "thebrighttag.com": {
            "c": "BrightTag",
            "u": "http://www.brighttag.com/"
        },
        "brilig.com": {
            "c": "Brilig",
            "u": "http://www.brilig.com/"
        },
        "burstbeacon.com": {
            "c": "Burst Media",
            "u": "http://www.burstmedia.com/"
        },
        "burstdirectads.com": {
            "c": "Burst Media",
            "u": "http://www.burstmedia.com/"
        },
        "burstmedia.com": {
            "c": "Burst Media",
            "u": "http://www.burstmedia.com/"
        },
        "burstnet.com": {
            "c": "Burst Media",
            "u": "http://www.burstmedia.com/"
        },
        "giantrealm.com": {
            "c": "Burst Media",
            "u": "http://www.burstmedia.com/"
        },
        "burstly.com": {
            "c": "Burstly",
            "u": "http://www.burstly.com/"
        },
        "businessol.com": {
            "c": "BusinessOnline",
            "u": "http://www.businessol.com/"
        },
        "beaconads.com": {
            "c": "BuySellAds",
            "u": "http://buysellads.com/"
        },
        "buysellads.com": {
            "c": "BuySellAds",
            "u": "http://buysellads.com/"
        },
        "buysight.com": {
            "c": "Buysight",
            "u": "http://www.buysight.com/"
        },
        "permuto.com": {
            "c": "Buysight",
            "u": "http://www.buysight.com/"
        },
        "pulsemgr.com": {
            "c": "Buysight",
            "u": "http://www.buysight.com/"
        },
        "buzzparadise.com": {
            "c": "BuzzParadise",
            "u": "http://www.buzzparadise.com/"
        },
        "capitaldata.fr": {
            "c": "CAPITALDATA",
            "u": "http://www.capitaldata.fr/"
        },
        "cbproads.com": {
            "c": "CBproADS",
            "u": "http://www.cbproads.com/"
        },
        "contaxe.com": {
            "c": "CONTAXE",
            "u": "http://www.contaxe.com/"
        },
        "contextweb.com": {
            "c": "CONTEXTWEB",
            "u": "http://www.contextweb.com/"
        },
        "admailtiser.com": {
            "c": "CONTEXTin",
            "u": "http://www.contextin.com/"
        },
        "contextin.com": {
            "c": "CONTEXTin",
            "u": "http://www.contextin.com/"
        },
        "cpmstar.com": {
            "c": "CPMStar",
            "u": "http://www.cpmstar.com/"
        },
        "cpxadroit.com": {
            "c": "CPX Interactive",
            "u": "http://www.cpxinteractive.com/"
        },
        "cpxinteractive.com": {
            "c": "CPX Interactive",
            "u": "http://www.cpxinteractive.com/"
        },
        "adreadypixels.com": {
            "c": "CPX Interactive",
            "u": "http://www.cpxinteractive.com/"
        },
        "cadreon.com": {
            "c": "Cadreon",
            "u": "http://www.cadreon.com/"
        },
        "campaigngrid.com": {
            "c": "CampaignGrid",
            "u": "http://www.campaigngrid.com/"
        },
        "caraytech.com.ar": {
            "c": "Caraytech",
            "u": "http://www.caraytech.com.ar/"
        },
        "e-planning.net": {
            "c": "Caraytech",
            "u": "http://www.caraytech.com.ar/"
        },
        "cart.ro": {
            "c": "Cart.ro",
            "u": "http://www.cart.ro/"
        },
        "statistics.ro": {
            "c": "Cart.ro",
            "u": "http://www.cart.ro/"
        },
        "casalemedia.com": {
            "c": "Casale Media",
            "u": "http://www.casalemedia.com/"
        },
        "medianet.com": {
            "c": "Casale Media",
            "u": "http://www.casalemedia.com/"
        },
        "chango.ca": {
            "c": "Chango",
            "u": "http://www.chango.com/"
        },
        "chango.com": {
            "c": "Chango",
            "u": "http://www.chango.com/"
        },
        "channelintelligence.com": {
            "c": "Channel Intelligence",
            "u": "http://www.channelintelligence.com/"
        },
        "channeladvisor.com": {
            "c": "ChannelAdvisor",
            "u": "http://www.channeladvisor.com/"
        },
        "searchmarketing.com": {
            "c": "ChannelAdvisor",
            "u": "http://www.channeladvisor.com/"
        },
        "chartboost.com": {
            "c": "Chartboost",
            "u": "https://www.chartboost.com/"
        },
        "checkm8.com": {
            "c": "CheckM8",
            "u": "http://www.checkm8.com/"
        },
        "chitika.com": {
            "c": "Chitika",
            "u": "http://chitika.com/"
        },
        "chitika.net": {
            "c": "Chitika",
            "u": "http://chitika.com/"
        },
        "choicestream.com": {
            "c": "ChoiceStream",
            "u": "http://www.choicestream.com/"
        },
        "clearsaleing.com": {
            "c": "ClearSaleing",
            "u": "http://www.clearsaleing.com/"
        },
        "csdata1.com": {
            "c": "ClearSaleing",
            "u": "http://www.clearsaleing.com/"
        },
        "csdata2.com": {
            "c": "ClearSaleing",
            "u": "http://www.clearsaleing.com/"
        },
        "csdata3.com": {
            "c": "ClearSaleing",
            "u": "http://www.clearsaleing.com/"
        },
        "clearsightinteractive.com": {
            "c": "ClearSight Interactive",
            "u": "http://www.clearsightinteractive.com/"
        },
        "csi-tracking.com": {
            "c": "ClearSight Interactive",
            "u": "http://www.clearsightinteractive.com/"
        },
        "clearsearchmedia.com": {
            "c": "Clearsearch Media",
            "u": "http://www.clearsearchmedia.com/"
        },
        "csm-secure.com": {
            "c": "Clearsearch Media",
            "u": "http://www.clearsearchmedia.com/"
        },
        "clicmanager.fr": {
            "c": "ClicManager",
            "u": "http://www.clicmanager.fr/"
        },
        "clickaider.com": {
            "c": "ClickAider",
            "u": "http://clickaider.com/"
        },
        "clickdimensions.com": {
            "c": "ClickDimensions",
            "u": "http://www.clickdimensions.com/"
        },
        "clickdistrict.com": {
            "c": "ClickDistrict",
            "u": "http://www.clickdistrict.com/"
        },
        "creative-serving.com": {
            "c": "ClickDistrict",
            "u": "http://www.clickdistrict.com/"
        },
        "conversiondashboard.com": {
            "c": "ClickFuel",
            "u": "http://clickfuel.com/"
        },
        "clickinc.com": {
            "c": "ClickInc",
            "u": "http://www.clickinc.com/"
        },
        "clickbooth.com": {
            "c": "Clickbooth",
            "u": "http://www.clickbooth.com/"
        },
        "adtoll.com": {
            "c": "Clickbooth",
            "u": "http://www.clickbooth.com/"
        },
        "clicksor.com": {
            "c": "Clicksor",
            "u": "http://www.clicksor.com/"
        },
        "clicksor.net": {
            "c": "Clicksor",
            "u": "http://www.clicksor.com/"
        },
        "clickwinks.com": {
            "c": "Clickwinks",
            "u": "http://www.clickwinks.com/"
        },
        "clovenetwork.com": {
            "c": "Clove Network",
            "u": "http://www.clovenetwork.com/"
        },
        "cmads.com.tw": {
            "c": "Cognitive Match",
            "u": "http://www.cognitivematch.com/"
        },
        "cmadsasia.com": {
            "c": "Cognitive Match",
            "u": "http://www.cognitivematch.com/"
        },
        "cmadseu.com": {
            "c": "Cognitive Match",
            "u": "http://www.cognitivematch.com/"
        },
        "cmmeglobal.com": {
            "c": "Cognitive Match",
            "u": "http://www.cognitivematch.com/"
        },
        "cognitivematch.com": {
            "c": "Cognitive Match",
            "u": "http://www.cognitivematch.com/"
        },
        "coinhive.com": {
            "c": "CoinHive",
            "u": "https://coinhive.com"
        },
        "coin-hive.com": {
            "c": "CoinHive",
            "u": "https://coinhive.com"
        },
        "collective-media.net": {
            "c": "Collective",
            "u": "http://collective.com/"
        },
        "collective.com": {
            "c": "Collective",
            "u": "http://collective.com/"
        },
        "oggifinogi.com": {
            "c": "Collective",
            "u": "http://collective.com/"
        },
        "tumri.com": {
            "c": "Collective",
            "u": "http://collective.com/"
        },
        "tumri.net": {
            "c": "Collective",
            "u": "http://collective.com/"
        },
        "yt1187.net": {
            "c": "Collective",
            "u": "http://collective.com/"
        },
        "apmebf.com": {
            "c": "Commission Junction",
            "u": "http://www.cj.com/"
        },
        "awltovhc.com": {
            "c": "Commission Junction",
            "u": "http://www.cj.com/"
        },
        "cj.com": {
            "c": "Commission Junction",
            "u": "http://www.cj.com/"
        },
        "ftjcfx.com": {
            "c": "Commission Junction",
            "u": "http://www.cj.com/"
        },
        "kcdwa.com": {
            "c": "Commission Junction",
            "u": "http://www.cj.com/"
        },
        "qksz.com": {
            "c": "Commission Junction",
            "u": "http://www.cj.com/"
        },
        "qksz.net": {
            "c": "Commission Junction",
            "u": "http://www.cj.com/"
        },
        "tqlkg.com": {
            "c": "Commission Junction",
            "u": "http://www.cj.com/"
        },
        "yceml.net": {
            "c": "Commission Junction",
            "u": "http://www.cj.com/"
        },
        "communicatorcorp.com": {
            "c": "Communicator Corp",
            "u": "http://www.communicatorcorp.com/"
        },
        "compasslabs.com": {
            "c": "Compass Labs",
            "u": "http://compasslabs.com/"
        },
        "complex.com": {
            "c": "Complex Media",
            "u": "http://www.complexmedianetwork.com/"
        },
        "complexmedianetwork.com": {
            "c": "Complex Media",
            "u": "http://www.complexmedianetwork.com/"
        },
        "consiliummedia.com": {
            "c": "Consilium Media",
            "u": "http://www.consiliummedia.com/"
        },
        "agencytradingdesk.net": {
            "c": "ContextuAds",
            "u": "http://www.contextuads.com/"
        },
        "contextuads.com": {
            "c": "ContextuAds",
            "u": "http://www.contextuads.com/"
        },
        "convergedirect.com": {
            "c": "ConvergeDirect",
            "u": "http://www.convergedirect.com/"
        },
        "convergetrack.com": {
            "c": "ConvergeDirect",
            "u": "http://www.convergedirect.com/"
        },
        "conversionruler.com": {
            "c": "ConversionRuler",
            "u": "http://www.conversionruler.com/"
        },
        "conversive.nl": {
            "c": "Conversive",
            "u": "http://www.conversive.nl/"
        },
        "coremotives.com": {
            "c": "CoreMotives",
            "u": "http://coremotives.com/"
        },
        "adify.com": {
            "c": "Cox Digital Solutions",
            "u": "http://www.coxdigitalsolutions.com/"
        },
        "afy11.net": {
            "c": "Cox Digital Solutions",
            "u": "http://www.coxdigitalsolutions.com/"
        },
        "coxdigitalsolutions.com": {
            "c": "Cox Digital Solutions",
            "u": "http://www.coxdigitalsolutions.com/"
        },
        "creafi.com": {
            "c": "Creafi",
            "u": "http://www.creafi.com/"
        },
        "crimtan.com": {
            "c": "Crimtan",
            "u": "http://www.crimtan.com/"
        },
        "crispmedia.com": {
            "c": "Crisp Media",
            "u": "http://www.crispmedia.com/"
        },
        "criteo.com": {
            "c": "Criteo",
            "u": "http://www.criteo.com/"
        },
        "criteo.net": {
            "c": "Criteo",
            "u": "http://www.criteo.com/"
        },
        "crosspixel.net": {
            "c": "Cross Pixel",
            "u": "http://crosspixel.net/"
        },
        "crosspixelmedia.com": {
            "c": "Cross Pixel",
            "u": "http://crosspixel.net/"
        },
        "crsspxl.com": {
            "c": "Cross Pixel",
            "u": "http://crosspixel.net/"
        },
        "crypto-loot.com": {
            "c": "CryptoLoot",
            "u": "https://crypto-loot.com"
        },
        "cyberplex.com": {
            "c": "Cyberplex",
            "u": "http://www.cyberplex.com/"
        },
        "dc-storm.com": {
            "c": "DC Storm",
            "u": "http://www.dc-storm.com/"
        },
        "stormiq.com": {
            "c": "DC Storm",
            "u": "http://www.dc-storm.com/"
        },
        "dgit.com": {
            "c": "DG",
            "u": "http://www.dgit.com/"
        },
        "eyeblaster.com": {
            "c": "DG",
            "u": "http://www.dgit.com/"
        },
        "eyewonder.com": {
            "c": "DG",
            "u": "http://www.dgit.com/"
        },
        "mdadx.com": {
            "c": "DG",
            "u": "http://www.dgit.com/"
        },
        "serving-sys.com": {
            "c": "DG",
            "u": "http://www.dgit.com/"
        },
        "unicast.com": {
            "c": "DG",
            "u": "http://www.dgit.com/"
        },
        "ds-iq.com": {
            "c": "DS-IQ",
            "u": "http://www.ds-iq.com/"
        },
        "dsnrgroup.com": {
            "c": "DSNR Group",
            "u": "http://www.dsnrmg.com/"
        },
        "dsnrmg.com": {
            "c": "DSNR Group",
            "u": "http://www.dsnrmg.com/"
        },
        "traffiliate.com": {
            "c": "DSNR Group",
            "u": "http://www.dsnrmg.com/"
        },
        "z5x.com": {
            "c": "DSNR Group",
            "u": "http://www.dsnrmg.com/"
        },
        "z5x.net": {
            "c": "DSNR Group",
            "u": "http://www.dsnrmg.com/"
        },
        "dada.pro": {
            "c": "Dada",
            "u": "http://dada.pro/"
        },
        "simply.com": {
            "c": "Dada",
            "u": "http://dada.pro/"
        },
        "dataxu.com": {
            "c": "DataXu",
            "u": "http://www.dataxu.com/"
        },
        "dataxu.net": {
            "c": "DataXu",
            "u": "http://www.dataxu.com/"
        },
        "mexad.com": {
            "c": "DataXu",
            "u": "http://www.dataxu.com/"
        },
        "w55c.net": {
            "c": "DataXu",
            "u": "http://www.dataxu.com/"
        },
        "nexac.com": {
            "c": "Datalogix",
            "u": "http://www.datalogix.com/"
        },
        "nextaction.net": {
            "c": "Datalogix",
            "u": "http://www.datalogix.com/"
        },
        "datonics.com": {
            "c": "Datonics",
            "u": "http://datonics.com/"
        },
        "pro-market.net": {
            "c": "Datonics",
            "u": "http://datonics.com/"
        },
        "datranmedia.com": {
            "c": "Datran Media",
            "u": "http://www.datranmedia.com/"
        },
        "displaymarketplace.com": {
            "c": "Datran Media",
            "u": "http://www.datranmedia.com/"
        },
        "datvantage.com": {
            "c": "Datvantage",
            "u": "http://datvantage.com/"
        },
        "dedicatedmedia.com": {
            "c": "Dedicated Media",
            "u": "http://www.dedicatedmedia.com/"
        },
        "dedicatednetworks.com": {
            "c": "Dedicated Media",
            "u": "http://www.dedicatedmedia.com/"
        },
        "delivr.com": {
            "c": "Delivr",
            "u": "http://delivr.com/"
        },
        "percentmobile.com": {
            "c": "Delivr",
            "u": "http://delivr.com/"
        },
        "adaction.se": {
            "c": "Delta Projects",
            "u": "http://www.deltaprojects.se/"
        },
        "de17a.com": {
            "c": "Delta Projects",
            "u": "http://www.deltaprojects.se/"
        },
        "deltaprojects.se": {
            "c": "Delta Projects",
            "u": "http://www.deltaprojects.se/"
        },
        "demandmedia.com": {
            "c": "Demand Media",
            "u": "http://www.demandmedia.com/"
        },
        "indieclick.com": {
            "c": "Demand Media",
            "u": "http://www.demandmedia.com/"
        },
        "adcloud.com": {
            "c": "Deutsche Post DHL",
            "u": "http://www.dp-dhl.com/"
        },
        "adcloud.net": {
            "c": "Deutsche Post DHL",
            "u": "http://www.dp-dhl.com/"
        },
        "dp-dhl.com": {
            "c": "Deutsche Post DHL",
            "u": "http://www.dp-dhl.com/"
        },
        "developermedia.com": {
            "c": "Developer Media",
            "u": "http://developermedia.com/"
        },
        "lqcdn.com": {
            "c": "Developer Media",
            "u": "http://developermedia.com/"
        },
        "did-it.com": {
            "c": "Didit",
            "u": "http://www.didit.com/"
        },
        "didit.com": {
            "c": "Didit",
            "u": "http://www.didit.com/"
        },
        "digitalriver.com": {
            "c": "Digital River",
            "u": "http://www.digitalriver.com/"
        },
        "keywordmax.com": {
            "c": "Digital River",
            "u": "http://www.digitalriver.com/"
        },
        "netflame.cc": {
            "c": "Digital River",
            "u": "http://www.digitalriver.com/"
        },
        "digitaltarget.ru": {
            "c": "Digital Target",
            "u": "http://digitaltarget.ru"
        },
        "digitalwindow.com": {
            "c": "Digital Window",
            "u": "http://www.digitalwindow.com/"
        },
        "perfiliate.com": {
            "c": "Digital Window",
            "u": "http://www.digitalwindow.com/"
        },
        "digitize.ie": {
            "c": "Digitize",
            "u": "http://www.digitize.ie/"
        },
        "directresponsegroup.com": {
            "c": "Direct Response Group",
            "u": "http://www.directresponsegroup.com/"
        },
        "ppctracking.net": {
            "c": "Direct Response Group",
            "u": "http://www.directresponsegroup.com/"
        },
        "directadvert.ru": {
            "c": "DirectAdvert",
            "u": "http://www.directadvert.ru/"
        },
        "directtrack.com": {
            "c": "Directtrack",
            "u": "http://directtrack.com/"
        },
        "doublepimp.com": {
            "c": "DoublePimp",
            "u": "http://doublepimp.com/"
        },
        "bid-tag.com": {
            "c": "DoublePositive",
            "u": "http://www.doublepositive.com/"
        },
        "doublepositive.com": {
            "c": "DoublePositive",
            "u": "http://www.doublepositive.com/"
        },
        "doubleverify.com": {
            "c": "DoubleVerify",
            "u": "http://www.doubleverify.com/"
        },
        "adsymptotic.com": {
            "c": "Drawbridge",
            "u": "http://http://drawbrid.ge/"
        },
        "drawbrid.ge": {
            "c": "Drawbridge",
            "u": "http://http://drawbrid.ge/"
        },
        "dynamicoxygen.com": {
            "c": "DynamicOxygen",
            "u": "http://www.dynamicoxygen.com/"
        },
        "exitjunction.com": {
            "c": "DynamicOxygen",
            "u": "http://www.dynamicoxygen.com/"
        },
        "dynamicyield.com": {
            "c": "DynamicYield",
            "u": "https://www.dynamicyield.com/"
        },
        "eqads.com": {
            "c": "EQ Ads",
            "u": "http://www.eqads.com/"
        },
        "extensions.ru": {
            "c": "EXTENSIONS.RU",
            "u": "http://extensions.ru/"
        },
        "earnify.com": {
            "c": "Earnify",
            "u": "http://earnify.com/"
        },
        "effectivemeasure.com": {
            "c": "Effective Measure",
            "u": "http://www.effectivemeasure.com/"
        },
        "effectivemeasure.net": {
            "c": "Effective Measure",
            "u": "http://www.effectivemeasure.com/"
        },
        "eleavers.com": {
            "c": "Eleavers",
            "u": "http://eleavers.com/"
        },
        "emediate.biz": {
            "c": "Emediate",
            "u": "http://www.emediate.com/"
        },
        "emediate.com": {
            "c": "Emediate",
            "u": "http://www.emediate.com/"
        },
        "emediate.dk": {
            "c": "Emediate",
            "u": "http://www.emediate.com/"
        },
        "emediate.eu": {
            "c": "Emediate",
            "u": "http://www.emediate.com/"
        },
        "usemax.de": {
            "c": "Emego",
            "u": "http://www.usemax.de/"
        },
        "enecto.com": {
            "c": "Enecto",
            "u": "http://www.enecto.com/"
        },
        "appmetrx.com": {
            "c": "Engago Technology",
            "u": "http://www.engago.com/"
        },
        "engago.com": {
            "c": "Engago Technology",
            "u": "http://www.engago.com/"
        },
        "enginenetwork.com": {
            "c": "Engine Network",
            "u": "http://enginenetwork.com/"
        },
        "ensighten.com": {
            "c": "Ensighten",
            "u": "http://www.ensighten.com/"
        },
        "entireweb.com": {
            "c": "Entireweb",
            "u": "http://www.entireweb.com/"
        },
        "epicadvertising.com": {
            "c": "Epic Media Group",
            "u": "http://www.theepicmediagroup.com/"
        },
        "epicmarketplace.com": {
            "c": "Epic Media Group",
            "u": "http://www.theepicmediagroup.com/"
        },
        "epicmobileads.com": {
            "c": "Epic Media Group",
            "u": "http://www.theepicmediagroup.com/"
        },
        "theepicmediagroup.com": {
            "c": "Epic Media Group",
            "u": "http://www.theepicmediagroup.com/"
        },
        "trafficmp.com": {
            "c": "Epic Media Group",
            "u": "http://www.theepicmediagroup.com/"
        },
        "epsilon.com": {
            "c": "Epsilon",
            "u": "http://www.epsilon.com/"
        },
        "ero-advertising.com": {
            "c": "EroAdvertising",
            "u": "http://www.ero-advertising.com/"
        },
        "etargetnet.com": {
            "c": "Etarget",
            "u": "http://etargetnet.com/"
        },
        "etarget.eu": {
            "c": "Etarget",
            "u": "http://etargetnet.com/"
        },
        "adwitserver.com": {
            "c": "Etineria",
            "u": "http://www.etineria.com/"
        },
        "etineria.com": {
            "c": "Etineria",
            "u": "http://www.etineria.com/"
        },
        "everydayhealth.com": {
            "c": "Everyday Health",
            "u": "http://www.everydayhealth.com/"
        },
        "waterfrontmedia.com": {
            "c": "Everyday Health",
            "u": "http://www.everydayhealth.com/"
        },
        "betrad.com": {
            "c": "Evidon",
            "u": "http://www.evidon.com/"
        },
        "evidon.com": {
            "c": "Evidon",
            "u": "http://www.evidon.com/"
        },
        "engineseeker.com": {
            "c": "Evisions Marketing",
            "u": "http://www.evisionsmarketing.com/"
        },
        "evisionsmarketing.com": {
            "c": "Evisions Marketing",
            "u": "http://www.evisionsmarketing.com/"
        },
        "evolvemediacorp.com": {
            "c": "Evolve",
            "u": "http://www.evolvemediacorp.com/"
        },
        "evolvemediametrics.com": {
            "c": "Evolve",
            "u": "http://www.evolvemediacorp.com/"
        },
        "gorillanation.com": {
            "c": "Evolve",
            "u": "http://www.evolvemediacorp.com/"
        },
        "exoclick.com": {
            "c": "ExoClick",
            "u": "http://www.exoclick.com/"
        },
        "audienceiq.com": {
            "c": "Experian",
            "u": "http://www.experian.com/"
        },
        "experian.com": {
            "c": "Experian",
            "u": "http://www.experian.com/"
        },
        "pricegrabber.com": {
            "c": "Experian",
            "u": "http://www.experian.com/"
        },
        "adotube.com": {
            "c": "Exponential Interactive",
            "u": "http://www.exponential.com/"
        },
        "exponential.com": {
            "c": "Exponential Interactive",
            "u": "http://www.exponential.com/"
        },
        "fulltango.com": {
            "c": "Exponential Interactive",
            "u": "http://www.exponential.com/"
        },
        "tribalfusion.com": {
            "c": "Exponential Interactive",
            "u": "http://www.exponential.com/"
        },
        "extensionfactory.com": {
            "c": "Extension Factory",
            "u": "http://www.extensionfactory.com/"
        },
        "eyeconomy.co.uk": {
            "c": "Eyeconomy",
            "u": "http://www.eyeconomy.co.uk/"
        },
        "eyeconomy.com": {
            "c": "Eyeconomy",
            "u": "http://www.eyeconomy.co.uk/"
        },
        "sublimemedia.net": {
            "c": "Eyeconomy",
            "u": "http://www.eyeconomy.co.uk/"
        },
        "eyeviewdigital.com": {
            "c": "Eyeviewdigital",
            "u": "http://www.eyeviewdigital.com/"
        },
        "adsfac.eu": {
            "c": "Facilitate Digital",
            "u": "http://www.facilitatedigital.com/"
        },
        "adsfac.info": {
            "c": "Facilitate Digital",
            "u": "http://www.facilitatedigital.com/"
        },
        "adsfac.net": {
            "c": "Facilitate Digital",
            "u": "http://www.facilitatedigital.com/"
        },
        "adsfac.sg": {
            "c": "Facilitate Digital",
            "u": "http://www.facilitatedigital.com/"
        },
        "adsfac.us": {
            "c": "Facilitate Digital",
            "u": "http://www.facilitatedigital.com/"
        },
        "facilitatedigital.com": {
            "c": "Facilitate Digital",
            "u": "http://www.facilitatedigital.com/"
        },
        "fairfax.com.au": {
            "c": "Fairfax Media",
            "u": "http://www.fxj.com.au/"
        },
        "fxj.com.au": {
            "c": "Fairfax Media",
            "u": "http://www.fxj.com.au/"
        },
        "fathomdelivers.com": {
            "c": "Fathom",
            "u": "http://www.fathomdelivers.com/"
        },
        "fathomseo.com": {
            "c": "Fathom",
            "u": "http://www.fathomdelivers.com/"
        },
        "federatedmedia.net": {
            "c": "Federated Media",
            "u": "http://www.federatedmedia.net/"
        },
        "fmpub.net": {
            "c": "Federated Media",
            "u": "http://www.federatedmedia.net/"
        },
        "lijit.com": {
            "c": "Federated Media",
            "u": "http://www.federatedmedia.net/"
        },
        "fetchback.com": {
            "c": "FetchBack",
            "u": "http://www.fetchback.com/"
        },
        "fiksu.com": {
            "c": "Fiksu",
            "u": "http://www.fiksu.com/"
        },
        "financialcontent.com": {
            "c": "FinancialContent",
            "u": "http://www.financialcontent.com/"
        },
        "fizzbuzzmedia.com": {
            "c": "Fizz-Buzz Media",
            "u": "http://www.fizzbuzzmedia.com/"
        },
        "fizzbuzzmedia.net": {
            "c": "Fizz-Buzz Media",
            "u": "http://www.fizzbuzzmedia.com/"
        },
        "flashtalking.com": {
            "c": "Flashtalking",
            "u": "http://www.flashtalking.com/"
        },
        "flite.com": {
            "c": "Flite",
            "u": "http://www.flite.com/"
        },
        "widgetserver.com": {
            "c": "Flite",
            "u": "http://www.flite.com/"
        },
        "fluct.jp": {
            "c": "Fluct",
            "u": "https://corp.fluct.jp/"
        },
        "adingo.jp": {
            "c": "Fluct",
            "u": "https://corp.fluct.jp/"
        },
        "flurry.com": {
            "c": "Flurry",
            "u": "http://www.flurry.com/"
        },
        "flytxt.com": {
            "c": "Flytxt",
            "u": "http://www.flytxt.com/"
        },
        "brandsideplatform.com": {
            "c": "Forbes",
            "u": "http://www.forbes.com/"
        },
        "forbes.com": {
            "c": "Forbes",
            "u": "http://www.forbes.com/"
        },
        "fimserve.com": {
            "c": "Fox One Stop Media",
            "u": "http://www.foxonestop.com/"
        },
        "foxnetworks.com": {
            "c": "Fox One Stop Media",
            "u": "http://www.foxonestop.com/"
        },
        "foxonestop.com": {
            "c": "Fox One Stop Media",
            "u": "http://www.foxonestop.com/"
        },
        "mobsmith.com": {
            "c": "Fox One Stop Media",
            "u": "http://www.foxonestop.com/"
        },
        "myads.com": {
            "c": "Fox One Stop Media",
            "u": "http://www.foxonestop.com/"
        },
        "othersonline.com": {
            "c": "Fox One Stop Media",
            "u": "http://www.foxonestop.com/"
        },
        "rubiconproject.com": {
            "c": "Fox One Stop Media",
            "u": "http://www.foxonestop.com/"
        },
        "fout.jp": {
            "c": "FreakOut",
            "u": "http://fout.jp/"
        },
        "freedom.com": {
            "c": "Freedom Communications",
            "u": "http://www.freedom.com/"
        },
        "adultfriendfinder.com": {
            "c": "FriendFinder Networks",
            "u": "http://ffn.com/"
        },
        "ffn.com": {
            "c": "FriendFinder Networks",
            "u": "http://ffn.com/"
        },
        "pop6.com": {
            "c": "FriendFinder Networks",
            "u": "http://ffn.com/"
        },
        "double-check.com": {
            "c": "Frog Sex",
            "u": "http://www.frogsex.com/"
        },
        "frogsex.com": {
            "c": "Frog Sex",
            "u": "http://www.frogsex.com/"
        },
        "futureads.com": {
            "c": "Future Ads",
            "u": "https://www.futureads.com/"
        },
        "resultlinks.com": {
            "c": "Future Ads",
            "u": "https://www.futureads.com/"
        },
        "gb-world.net": {
            "c": "GB-World",
            "u": "http://www.gb-world.net/"
        },
        "geniegroupltd.co.uk": {
            "c": "GENIE GROUP",
            "u": "http://www.geniegroupltd.co.uk/"
        },
        "gismads.jp": {
            "c": "GISMAds",
            "u": "http://www.gismads.jp/"
        },
        "gsicommerce.com": {
            "c": "GSI Commerce",
            "u": "http://www.gsicommerce.com/"
        },
        "gsimedia.net": {
            "c": "GSI Commerce",
            "u": "http://www.gsicommerce.com/"
        },
        "pepperjam.com": {
            "c": "GSI Commerce",
            "u": "http://www.gsicommerce.com/"
        },
        "pjatr.com": {
            "c": "GSI Commerce",
            "u": "http://www.gsicommerce.com/"
        },
        "pjtra.com": {
            "c": "GSI Commerce",
            "u": "http://www.gsicommerce.com/"
        },
        "pntra.com": {
            "c": "GSI Commerce",
            "u": "http://www.gsicommerce.com/"
        },
        "pntrac.com": {
            "c": "GSI Commerce",
            "u": "http://www.gsicommerce.com/"
        },
        "pntrs.com": {
            "c": "GSI Commerce",
            "u": "http://www.gsicommerce.com/"
        },
        "game-advertising-online.com": {
            "c": "Game Advertising Online",
            "u": "http://www.game-advertising-online.com/"
        },
        "games2win.com": {
            "c": "Games2win",
            "u": "http://www.games2win.com/"
        },
        "inviziads.com": {
            "c": "Games2win",
            "u": "http://www.games2win.com/"
        },
        "gamned.com": {
            "c": "Gamned",
            "u": "http://www.gamned.com/"
        },
        "gannett.com": {
            "c": "Gannett",
            "u": "http://www.gannett.com/"
        },
        "pointroll.com": {
            "c": "Gannett",
            "u": "http://www.gannett.com/"
        },
        "gemius.com": {
            "c": "Gemius",
            "u": "http://www.gemius.com/"
        },
        "gemius.pl": {
            "c": "Gemius",
            "u": "http://www.gemius.com/"
        },
        "genesismedia.com": {
            "c": "Genesis Media",
            "u": "http://www.genesismedia.com/"
        },
        "genesismediaus.com": {
            "c": "Genesis Media",
            "u": "http://www.genesismedia.com/"
        },
        "geoads.com": {
            "c": "GeoAds",
            "u": "http://www.geoads.com/"
        },
        "getglue.com": {
            "c": "GetGlue",
            "u": "http://getglue.com/"
        },
        "smrtlnks.com": {
            "c": "GetGlue",
            "u": "http://getglue.com/"
        },
        "adhigh.net": {
            "c": "GetIntent",
            "u": "http://getintent.com/"
        },
        "getintent.com": {
            "c": "GetIntent",
            "u": "http://getintent.com/"
        },
        "glam.com": {
            "c": "Glam Media",
            "u": "http://www.glammedia.com/"
        },
        "glammedia.com": {
            "c": "Glam Media",
            "u": "http://www.glammedia.com/"
        },
        "globe7.com": {
            "c": "Globe7",
            "u": "http://www.globe7.com/"
        },
        "godatafeed.com": {
            "c": "GoDataFeed",
            "u": "http://godatafeed.com/"
        },
        "goldspotmedia.com": {
            "c": "GoldSpot Media",
            "u": "http://www.goldspotmedia.com/"
        },
        "goldbachgroup.com": {
            "c": "Goldbach",
            "u": "http://www.goldbachgroup.com/"
        },
        "goldbach.com": {
            "c": "Goldbach",
            "u": "http://www.goldbachgroup.com/"
        },
        "grapeshot.co.uk": {
            "c": "Grapeshot",
            "u": "http://www.grapeshot.co.uk/"
        },
        "groceryshopping.net": {
            "c": "Grocery Shopping Network",
            "u": "http://www.groceryshopping.net/"
        },
        "groovinads.com": {
            "c": "GroovinAds",
            "u": "http://www.groovinads.com/"
        },
        "guj.de": {
            "c": "Gruner + Jahr",
            "u": "http://www.guj.de/"
        },
        "ligatus.com": {
            "c": "Gruner + Jahr",
            "u": "http://www.guj.de/"
        },
        "gumgum.com": {
            "c": "GumGum",
            "u": "http://gumgum.com/"
        },
        "gunggo.com": {
            "c": "Gunggo",
            "u": "http://www.gunggo.com/"
        },
        "hotwords.com": {
            "c": "HOTWords",
            "u": "http://www.hotwords.com/"
        },
        "hotwords.es": {
            "c": "HOTWords",
            "u": "http://www.hotwords.com/"
        },
        "hp.com": {
            "c": "HP",
            "u": "http://www.hp.com/"
        },
        "optimost.com": {
            "c": "HP",
            "u": "http://www.hp.com/"
        },
        "huntmads.com": {
            "c": "HUNT Mobile Ads",
            "u": "http://www.huntmads.com/"
        },
        "hands.com.br": {
            "c": "Hands Mobile",
            "u": "http://www.hands.com.br/"
        },
        "harrenmedia.com": {
            "c": "Harrenmedia",
            "u": "http://www.harrenmedia.com/"
        },
        "harrenmedianetwork.com": {
            "c": "Harrenmedia",
            "u": "http://www.harrenmedia.com/"
        },
        "adacado.com": {
            "c": "HealthPricer",
            "u": "http://www.healthpricer.com/"
        },
        "healthpricer.com": {
            "c": "HealthPricer",
            "u": "http://www.healthpricer.com/"
        },
        "hearst.com": {
            "c": "Hearst",
            "u": "http://www.hearst.com/"
        },
        "ic-live.com": {
            "c": "Hearst",
            "u": "http://www.hearst.com/"
        },
        "iclive.com": {
            "c": "Hearst",
            "u": "http://www.hearst.com/"
        },
        "icrossing.com": {
            "c": "Hearst",
            "u": "http://www.hearst.com/"
        },
        "sptag.com": {
            "c": "Hearst",
            "u": "http://www.hearst.com/"
        },
        "sptag1.com": {
            "c": "Hearst",
            "u": "http://www.hearst.com/"
        },
        "sptag2.com": {
            "c": "Hearst",
            "u": "http://www.hearst.com/"
        },
        "sptag3.com": {
            "c": "Hearst",
            "u": "http://www.hearst.com/"
        },
        "comclick.com": {
            "c": "Hi-media",
            "u": "http://www.hi-media.com/"
        },
        "hi-media.com": {
            "c": "Hi-media",
            "u": "http://www.hi-media.com/"
        },
        "hlserve.com": {
            "c": "HookLogic",
            "u": "http://www.hooklogic.com/"
        },
        "hooklogic.com": {
            "c": "HookLogic",
            "u": "http://www.hooklogic.com/"
        },
        "horyzon-media.com": {
            "c": "Horyzon Media",
            "u": "http://www.horyzon-media.com/"
        },
        "meetic-partners.com": {
            "c": "Horyzon Media",
            "u": "http://www.horyzon-media.com/"
        },
        "smartadserver.com": {
            "c": "Horyzon Media",
            "u": "http://www.horyzon-media.com/"
        },
        "httpool.com": {
            "c": "Httpool",
            "u": "http://www.httpool.com/"
        },
        "hurra.com": {
            "c": "Hurra.com",
            "u": "http://www.hurra.com/"
        },
        "i-behavior.com": {
            "c": "QUISMA",
            "u": "http://www.i-behavior.com/"
        },
        "ib-ibi.com": {
            "c": "I-Behavior",
            "u": "http://www.i-behavior.com/"
        },
        "i.ua": {
            "c": "I.UA",
            "u": "http://www.i.ua/"
        },
        "iac.com": {
            "c": "IAC",
            "u": "http://www.iac.com/"
        },
        "iacadvertising.com": {
            "c": "IAC",
            "u": "http://www.iac.com/"
        },
        "unica.com": {
            "c": "IBM",
            "u": "http://www.ibm.com/"
        },
        "idg.com": {
            "c": "IDG",
            "u": "http://www.idg.com/"
        },
        "idgtechnetwork.com": {
            "c": "IDG",
            "u": "http://www.idg.com/"
        },
        "adversalservers.com": {
            "c": "ISI Technologies",
            "u": "http://digbro.com/"
        },
        "digbro.com": {
            "c": "ISI Technologies",
            "u": "http://digbro.com/"
        },
        "ignitad.com": {
            "c": "IgnitAd",
            "u": "http://www.ignitad.com/"
        },
        "ignitionone.com": {
            "c": "IgnitionOne",
            "u": "http://www.ignitionone.com/"
        },
        "ignitionone.net": {
            "c": "IgnitionOne",
            "u": "http://www.ignitionone.com/"
        },
        "searchignite.com": {
            "c": "IgnitionOne",
            "u": "http://www.ignitionone.com/"
        },
        "360yield.com": {
            "c": "Improve Digital",
            "u": "www.improvedigital.com/"
        },
        "improvedigital.com": {
            "c": "Improve Digital",
            "u": "www.improvedigital.com/"
        },
        "inmobi.com": {
            "c": "InMobi",
            "u": "http://www.inmobi.com/"
        },
        "sproutinc.com": {
            "c": "InMobi",
            "u": "http://www.inmobi.com/"
        },
        "inskinmedia.com": {
            "c": "InSkin Media",
            "u": "http://inskinmedia.com/"
        },
        "anadcoads.com": {
            "c": "Inadco",
            "u": "http://www.inadco.com/"
        },
        "inadco.com": {
            "c": "Inadco",
            "u": "http://www.inadco.com/"
        },
        "inadcoads.com": {
            "c": "Inadco",
            "u": "http://www.inadco.com/"
        },
        "impressiondesk.com": {
            "c": "Infectious Media",
            "u": "http://www.infectiousmedia.com/"
        },
        "infectiousmedia.com": {
            "c": "Infectious Media",
            "u": "http://www.infectiousmedia.com/"
        },
        "inflectionpointmedia.com": {
            "c": "Inflection Point Media",
            "u": "http://www.inflectionpointmedia.com/"
        },
        "infogroup.com": {
            "c": "Infogroup",
            "u": "http://www.infogroup.com/"
        },
        "infolinks.com": {
            "c": "Infolinks",
            "u": "http://www.infolinks.com/"
        },
        "infra-ad.com": {
            "c": "Infra-Ad",
            "u": "http://www.infra-ad.com/"
        },
        "innity.com": {
            "c": "Innity",
            "u": "http://innity.com/"
        },
        "insightexpress.com": {
            "c": "InsightExpress",
            "u": "http://www.insightexpress.com/"
        },
        "insightexpressai.com": {
            "c": "InsightExpress",
            "u": "http://www.insightexpress.com/"
        },
        "instinctiveads.com": {
            "c": "Instinctive",
            "u": "https://instinctive.io/"
        },
        "instinctive.io": {
            "c": "Instinctive",
            "u": "https://instinctive.io/"
        },
        "intentmedia.com": {
            "c": "Intent Media",
            "u": "http://www.intentmedia.com/"
        },
        "intentmedia.net": {
            "c": "Intent Media",
            "u": "http://www.intentmedia.com/"
        },
        "intergi.com": {
            "c": "Intergi",
            "u": "http://intergi.com/"
        },
        "intermarkets.net": {
            "c": "Intermarkets",
            "u": "http://www.intermarkets.net/"
        },
        "intermundomedia.com": {
            "c": "Intermundo Media",
            "u": "http://intermundomedia.com/"
        },
        "ibpxl.com": {
            "c": "Internet Brands",
            "u": "http://www.internetbrands.com/"
        },
        "internetbrands.com": {
            "c": "Internet Brands",
            "u": "http://www.internetbrands.com/"
        },
        "interpolls.com": {
            "c": "Interpolls",
            "u": "http://www.interpolls.com/"
        },
        "inuvo.com": {
            "c": "Inuvo",
            "u": "http://inuvo.com/"
        },
        "investingchannel.com": {
            "c": "InvestingChannel",
            "u": "http://investingchannel.com/"
        },
        "jaroop.com": {
            "c": "Jaroop",
            "u": "http://www.jaroop.com/"
        },
        "jasperlabs.com": {
            "c": "JasperLabs",
            "u": "http://www.jasperlabs.com/"
        },
        "jemmgroup.com": {
            "c": "Jemm",
            "u": "http://jemmgroup.com/"
        },
        "jink.de": {
            "c": "Jink",
            "u": "http://www.jink.de/"
        },
        "jinkads.com": {
            "c": "Jink",
            "u": "http://www.jink.de/"
        },
        "adcolony.com": {
            "c": "Jirbo",
            "u": "http://jirbo.com/"
        },
        "jirbo.com": {
            "c": "Jirbo",
            "u": "http://jirbo.com/"
        },
        "jivox.com": {
            "c": "Jivox",
            "u": "http://www.jivox.com/"
        },
        "jobthread.com": {
            "c": "JobThread",
            "u": "http://www.jobthread.com/"
        },
        "juicyads.com": {
            "c": "JuicyAds",
            "u": "http://www.juicyads.com/"
        },
        "jumptap.com": {
            "c": "Jumptap",
            "u": "http://www.jumptap.com/"
        },
        "keewurd.com": {
            "c": "KIT digital",
            "u": "http://kitd.com/"
        },
        "kitd.com": {
            "c": "KIT digital",
            "u": "http://kitd.com/"
        },
        "peerset.com": {
            "c": "KIT digital",
            "u": "http://kitd.com/"
        },
        "kenshoo.com": {
            "c": "Kenshoo",
            "u": "http://www.kenshoo.com/"
        },
        "xg4ken.com": {
            "c": "Kenshoo",
            "u": "http://www.kenshoo.com/"
        },
        "keyade.com": {
            "c": "Keyade",
            "u": "http://www.keyade.com/"
        },
        "kissmyads.com": {
            "c": "KissMyAds",
            "u": "http://kissmyads.com/"
        },
        "103092804.com": {
            "c": "Kitara Media",
            "u": "http://www.kitaramedia.com/"
        },
        "kitaramedia.com": {
            "c": "Kitara Media",
            "u": "http://www.kitaramedia.com/"
        },
        "admost.com": {
            "c": "Kokteyl",
            "u": "http://www.kokteyl.com/"
        },
        "kokteyl.com": {
            "c": "Kokteyl",
            "u": "http://www.kokteyl.com/"
        },
        "komli.com": {
            "c": "Komli",
            "u": "http://www.komli.com/"
        },
        "kontera.com": {
            "c": "Kontera",
            "u": "http://www.kontera.com/"
        },
        "adsummos.com": {
            "c": "Korrelate",
            "u": "http://korrelate.com/"
        },
        "adsummos.net": {
            "c": "Korrelate",
            "u": "http://korrelate.com/"
        },
        "korrelate.com": {
            "c": "Korrelate",
            "u": "http://korrelate.com/"
        },
        "krux.com": {
            "c": "Krux",
            "u": "http://www.krux.com/"
        },
        "kruxdigital.com": {
            "c": "Krux",
            "u": "http://www.krux.com/"
        },
        "krxd.net": {
            "c": "Krux",
            "u": "http://www.krux.com/"
        },
        "lakana.com": {
            "c": "Lakana",
            "u": "http://www.lakana.com/"
        },
        "ibsys.com": {
            "c": "Lakana",
            "u": "http://www.lakana.com/"
        },
        "layer-ads.net": {
            "c": "Layer Ads",
            "u": "http://layer-ads.net/"
        },
        "layer-ad.org": {
            "c": "Layer-Ad.org",
            "u": "http://layer-ad.org/"
        },
        "leadbolt.com": {
            "c": "LeadBolt",
            "u": "http://www.leadbolt.com/"
        },
        "leadformix.com": {
            "c": "LeadFormix",
            "u": "http://www.leadformix.com/"
        },
        "leadforce1.com": {
            "c": "LeadFormix",
            "u": "http://www.leadformix.com/"
        },
        "leadlander.com": {
            "c": "LeadLander",
            "u": "http://www.leadlander.com/"
        },
        "trackalyzer.com": {
            "c": "LeadLander",
            "u": "http://www.leadlander.com/"
        },
        "legolas-media.com": {
            "c": "Legolas Media",
            "u": "http://www.legolas-media.com/"
        },
        "levexis.com": {
            "c": "Levexis",
            "u": "http://www.levexis.com/"
        },
        "adbull.com": {
            "c": "Lexos Media",
            "u": "http://www.lexosmedia.com/"
        },
        "lexosmedia.com": {
            "c": "Lexos Media",
            "u": "http://www.lexosmedia.com/"
        },
        "lfstmedia.com": {
            "c": "LifeStreet",
            "u": "http://lifestreetmedia.com/"
        },
        "lifestreetmedia.com": {
            "c": "LifeStreet",
            "u": "http://lifestreetmedia.com/"
        },
        "linkconnector.com": {
            "c": "LinkConnector",
            "u": "http://www.linkconnector.com/"
        },
        "linkshare.com": {
            "c": "LinkShare",
            "u": "http://www.linkshare.com/"
        },
        "linksynergy.com": {
            "c": "LinkShare",
            "u": "http://www.linkshare.com/"
        },
        "linkz.net": {
            "c": "Linkz",
            "u": "http://www.linkz.net/"
        },
        "listrak.com": {
            "c": "Listrak",
            "u": "http://www.listrak.com/"
        },
        "listrakbi.com": {
            "c": "Listrak",
            "u": "http://www.listrak.com/"
        },
        "liadm.com": {
            "c": "LiveIntent",
            "u": "http://www.liveintent.com/"
        },
        "liveintent.com": {
            "c": "LiveIntent",
            "u": "http://www.liveintent.com/"
        },
        "liveinternet.ru": {
            "c": "LiveInternet",
            "u": "http://www.liveinternet.ru"
        },
        "yadro.ru": {
            "c": "LiveInternet",
            "u": "http://www.liveinternet.ru"
        },
        "localyokelmedia.com": {
            "c": "Local Yokel Media",
            "u": "http://www.localyokelmedia.com/"
        },
        "longboardmedia.com": {
            "c": "Longboard Media",
            "u": "http://longboardmedia.com/"
        },
        "loomia.com": {
            "c": "Loomia",
            "u": "http://www.loomia.com/"
        },
        "lfov.net": {
            "c": "LoopFuse",
            "u": "https://www.loopfuse.net/"
        },
        "loopfuse.net": {
            "c": "LoopFuse",
            "u": "https://www.loopfuse.net/"
        },
        "lowermybills.com": {
            "c": "Lower My Bills",
            "u": "http://lowermybills.com"
        },
        "lucidmedia.com": {
            "c": "LucidMedia",
            "u": "http://www.lucidmedia.com/"
        },
        "cpalead.com": {
            "c": "MONETIZEdigital",
            "u": "https://www.cpalead.com/"
        },
        "mundomedia.com": {
            "c": "MUNDO Media",
            "u": "http://www.mundomedia.com/"
        },
        "silver-path.com": {
            "c": "MUNDO Media",
            "u": "http://www.mundomedia.com/"
        },
        "madhouse.cn": {
            "c": "Madhouse",
            "u": "http://www.madhouse.cn/"
        },
        "dinclinx.com": {
            "c": "Madison Logic",
            "u": "http://www.madisonlogic.com/"
        },
        "madisonlogic.com": {
            "c": "Madison Logic",
            "u": "http://www.madisonlogic.com/"
        },
        "domdex.com": {
            "c": "Magnetic",
            "u": "http://www.magnetic.com/"
        },
        "domdex.net": {
            "c": "Magnetic",
            "u": "http://www.magnetic.com/"
        },
        "magnetic.com": {
            "c": "Magnetic",
            "u": "http://www.magnetic.com/"
        },
        "qjex.net": {
            "c": "Magnetic",
            "u": "http://www.magnetic.com/"
        },
        "dialogmgr.com": {
            "c": "Magnify360",
            "u": "http://www.magnify360.com/"
        },
        "magnify360.com": {
            "c": "Magnify360",
            "u": "http://www.magnify360.com/"
        },
        "campaign-archive1.com": {
            "c": "MailChimp",
            "u": "http://mailchimp.com/"
        },
        "list-manage.com": {
            "c": "MailChimp",
            "u": "http://mailchimp.com/"
        },
        "mailchimp.com": {
            "c": "MailChimp",
            "u": "http://mailchimp.com/"
        },
        "bannerbank.ru": {
            "c": "Manifest",
            "u": "http://www.manifest.ru/"
        },
        "manifest.ru": {
            "c": "Manifest",
            "u": "http://www.manifest.ru/"
        },
        "industrybrains.com": {
            "c": "Marchex",
            "u": "http://www.marchex.com/"
        },
        "marchex.com": {
            "c": "Marchex",
            "u": "http://www.marchex.com/"
        },
        "marimedia.net": {
            "c": "Marimedia",
            "u": "http://www.marimedia.net/"
        },
        "dt00.net": {
            "c": "MarketGid",
            "u": "http://www.marketgid.com/"
        },
        "dt07.net": {
            "c": "MarketGid",
            "u": "http://www.marketgid.com/"
        },
        "marketgid.com": {
            "c": "MarketGid",
            "u": "http://www.marketgid.com/"
        },
        "marketo.com": {
            "c": "Marketo",
            "u": "http://www.marketo.com/"
        },
        "marketo.net": {
            "c": "Marketo",
            "u": "http://www.marketo.com/"
        },
        "martiniadnetwork.com": {
            "c": "Martini Media",
            "u": "http://martinimedianetwork.com/"
        },
        "martinimedianetwork.com": {
            "c": "Martini Media",
            "u": "http://martinimedianetwork.com/"
        },
        "chemistry.com": {
            "c": "Match.com",
            "u": "http://www.match.com/"
        },
        "match.com": {
            "c": "Match.com",
            "u": "http://www.match.com/"
        },
        "matomy.com": {
            "c": "Matomy Market",
            "u": "http://www.matomy.com/"
        },
        "matomymarket.com": {
            "c": "Matomy",
            "u": "http://www.matomy.com/"
        },
        "matomymedia.com": {
            "c": "Matomy",
            "u": "http://www.matomy.com/"
        },
        "xtendmedia.com": {
            "c": "Matomy",
            "u": "http://www.matomy.com/"
        },
        "adsmarket.com": {
            "c": "Matomy Market",
            "u": "http://www.matomy.com/"
        },
        "maxbounty.com": {
            "c": "MaxBounty",
            "u": "http://www.maxbounty.com/"
        },
        "mb01.com": {
            "c": "MaxBounty",
            "u": "http://www.maxbounty.com/"
        },
        "maxpointinteractive.com": {
            "c": "MaxPoint",
            "u": "http://maxpointinteractive.com/"
        },
        "maxusglobal.com": {
            "c": "MaxPoint",
            "u": "http://maxpointinteractive.com/"
        },
        "mxptint.net": {
            "c": "MaxPoint",
            "u": "http://maxpointinteractive.com/"
        },
        "mdotm.com": {
            "c": "MdotM",
            "u": "http://mdotm.com/"
        },
        "mediabrix.com": {
            "c": "MediaBrix",
            "u": "http://www.mediabrix.com/"
        },
        "mediacom.com": {
            "c": "MediaCom",
            "u": "http://www.mediacom.com/"
        },
        "adroitinteractive.com": {
            "c": "MediaMath",
            "u": "http://www.mediamath.com/"
        },
        "designbloxlive.com": {
            "c": "MediaMath",
            "u": "http://www.mediamath.com/"
        },
        "mathtag.com": {
            "c": "MediaMath",
            "u": "http://www.mediamath.com/"
        },
        "mediamath.com": {
            "c": "MediaMath",
            "u": "http://www.mediamath.com/"
        },
        "media-servers.net": {
            "c": "MediaShakers",
            "u": "http://www.mediashakers.com/"
        },
        "mediashakers.com": {
            "c": "MediaShakers",
            "u": "http://www.mediashakers.com/"
        },
        "mediatrust.com": {
            "c": "MediaTrust",
            "u": "http://www.mediatrust.com/"
        },
        "adnetinteractive.com": {
            "c": "MediaWhiz",
            "u": "http://www.mediawhiz.com/"
        },
        "mediawhiz.com": {
            "c": "MediaWhiz",
            "u": "http://www.mediawhiz.com/"
        },
        "medialets.com": {
            "c": "Medialets",
            "u": "http://www.medialets.com/"
        },
        "adbuyer.com": {
            "c": "Mediaocean",
            "u": "http://www.mediaocean.com/"
        },
        "mediaocean.com": {
            "c": "Mediaocean",
            "u": "http://www.mediaocean.com/"
        },
        "medicxmedia.com": {
            "c": "Medicx Media Solutions",
            "u": "http://www.medicxmedia.com/"
        },
        "megaindex.ru": {
            "c": "MegaIndex",
            "u": "http://www.megaindex.ru/"
        },
        "mercent.com": {
            "c": "Mercent",
            "u": "http://www.mercent.com/"
        },
        "merchantadvantage.com": {
            "c": "MerchantAdvantage",
            "u": "http://www.merchantadvantage.com/"
        },
        "merchenta.com": {
            "c": "Merchenta",
            "u": "http://www.merchenta.com/"
        },
        "metanetwork.com": {
            "c": "Meta Network",
            "u": "http://www.metanetwork.com/"
        },
        "meteorsolutions.com": {
            "c": "Meteor",
            "u": "http://www.meteorsolutions.com/"
        },
        "opinionbar.com": {
            "c": "MetrixLab",
            "u": "https://www.metrixlab.com"
        },
        "metrixlab.com": {
            "c": "MetrixLab",
            "u": "https://www.metrixlab.com"
        },
        "adoftheyear.com": {
            "c": "MetrixLab",
            "u": "https://www.metrixlab.com"
        },
        "crm-metrix.com": {
            "c": "MetrixLab",
            "u": "https://www.metrixlab.com"
        },
        "customerconversio.com": {
            "c": "MetrixLab",
            "u": "https://www.metrixlab.com"
        },
        "microad.jp": {
            "c": "MicroAd",
            "u": "http://www.microad.jp/"
        },
        "adbureau.net": {
            "c": "Microsoft",
            "u": "http://www.microsoft.com/"
        },
        "adecn.com": {
            "c": "Microsoft",
            "u": "http://www.microsoft.com/"
        },
        "aquantive.com": {
            "c": "Microsoft",
            "u": "http://www.microsoft.com/"
        },
        "atdmt.com": {
            "c": "Microsoft",
            "u": "http://www.microsoft.com/"
        },
        "msads.net": {
            "c": "Microsoft",
            "u": "http://www.microsoft.com/"
        },
        "netconversions.com": {
            "c": "Microsoft",
            "u": "http://www.microsoft.com/"
        },
        "roiservice.com": {
            "c": "Microsoft",
            "u": "http://www.microsoft.com/"
        },
        "decktrade.com": {
            "c": "Millennial Media",
            "u": "http://www.millennialmedia.com/"
        },
        "millennialmedia.com": {
            "c": "Millennial Media",
            "u": "http://www.millennialmedia.com/"
        },
        "mydas.mobi": {
            "c": "Millennial Media",
            "u": "http://www.millennialmedia.com/"
        },
        "mindset-media.com": {
            "c": "Mindset Media",
            "u": "http://www.mindset-media.com/"
        },
        "mmismm.com": {
            "c": "Mindset Media",
            "u": "http://www.mindset-media.com/"
        },
        "mirando.de": {
            "c": "Mirando",
            "u": "http://www.mirando.de/"
        },
        "mixpo.com": {
            "c": "Mixpo",
            "u": "http://www.mixpo.com/"
        },
        "mopub.com": {
            "c": "MoPub",
            "u": "http://www.mopub.com/"
        },
        "moat.com": {
            "c": "Moat",
            "u": "http://www.moat.com/"
        },
        "moatads.com": {
            "c": "Moat",
            "u": "http://www.moat.com/"
        },
        "mobfox.com": {
            "c": "MobFox",
            "u": "http://www.mobfox.com/"
        },
        "admoda.com": {
            "c": "MobVision",
            "u": "http://www.mobvision.com/"
        },
        "mobvision.com": {
            "c": "MobVision",
            "u": "http://www.mobvision.com/"
        },
        "mobilemeteor.com": {
            "c": "Mobile Meteor",
            "u": "http://mobilemeteor.com/"
        },
        "showmeinn.com": {
            "c": "Mobile Meteor",
            "u": "http://mobilemeteor.com/"
        },
        "mobilestorm.com": {
            "c": "Mobile Storm",
            "u": "http://mobilestorm.com/"
        },
        "moceanmobile.com": {
            "c": "Mocean Mobile",
            "u": "http://www.moceanmobile.com/"
        },
        "mochila.com": {
            "c": "Mochila",
            "u": "http://www.mochila.com/"
        },
        "mojiva.com": {
            "c": "Mojiva",
            "u": "http://www.mojiva.com/"
        },
        "monetate.com": {
            "c": "Monetate",
            "u": "http://monetate.com/"
        },
        "monetate.net": {
            "c": "Monetate",
            "u": "http://monetate.com/"
        },
        "monetizemore.com": {
            "c": "Monetize More",
            "u": "http://monetizemore.com/"
        },
        "monoloop.com": {
            "c": "Monoloop",
            "u": "http://www.monoloop.com/"
        },
        "monster.com": {
            "c": "Monster",
            "u": "http://www.monster.com/"
        },
        "moolah-media.com": {
            "c": "Moolah Media",
            "u": "http://www.moolahmedia.com/"
        },
        "moolahmedia.com": {
            "c": "Moolah Media",
            "u": "http://www.moolahmedia.com/"
        },
        "affbuzzads.com": {
            "c": "MovieLush.com",
            "u": "https://www.movielush.com/"
        },
        "movielush.com": {
            "c": "MovieLush.com",
            "u": "https://www.movielush.com/"
        },
        "adclickmedia.com": {
            "c": "Multiple Stream Media",
            "u": "http://www.multiplestreammktg.com/"
        },
        "multiplestreammktg.com": {
            "c": "Multiple Stream Media",
            "u": "http://www.multiplestreammktg.com/"
        },
        "mybuys.com": {
            "c": "MyBuys",
            "u": "http://www.mybuys.com/"
        },
        "veruta.com": {
            "c": "MyBuys",
            "u": "http://www.mybuys.com/"
        },
        "mycounter.com.ua": {
            "c": "MyCounter",
            "u": "http://mycounter.com.ua/"
        },
        "ppjol.net": {
            "c": "MyPressPlus",
            "u": "http://www.mypressplus.com/"
        },
        "mypressplus.com": {
            "c": "MyPressPlus",
            "u": "http://www.mypressplus.com/"
        },
        "mywebgrocer.com": {
            "c": "MyWebGrocer",
            "u": "http://www.mywebgrocer.com/"
        },
        "nanigans.com": {
            "c": "Nanigans",
            "u": "http://www.nanigans.com/"
        },
        "postrelease.com": {
            "c": "Nativo",
            "u": "http://www.nativo.net/"
        },
        "navdmp.com": {
            "c": "Navegg",
            "u": "http://www.navegg.com/"
        },
        "navegg.com": {
            "c": "Navegg",
            "u": "http://www.navegg.com/"
        },
        "cdnma.com": {
            "c": "Net-Results",
            "u": "http://www.net-results.com/"
        },
        "net-results.com": {
            "c": "Net-Results",
            "u": "http://www.net-results.com/"
        },
        "nr7.us": {
            "c": "Net-Results",
            "u": "http://www.net-results.com/"
        },
        "netaffiliation.com": {
            "c": "NetAffiliation",
            "u": "http://www.netaffiliation.com/"
        },
        "netbina.com": {
            "c": "NetBina",
            "u": "http://www.netbina.com/"
        },
        "adelixir.com": {
            "c": "NetElixir",
            "u": "http://www.netelixir.com/"
        },
        "netelixir.com": {
            "c": "NetElixir",
            "u": "http://www.netelixir.com/"
        },
        "netseer.com": {
            "c": "NetSeer",
            "u": "http://www.netseer.com/"
        },
        "netshelter.com": {
            "c": "NetShelter",
            "u": "http://netshelter.com/"
        },
        "netshelter.net": {
            "c": "NetShelter",
            "u": "http://netshelter.com/"
        },
        "netmining.com": {
            "c": "Netmining",
            "u": "http://www.netmining.com/"
        },
        "netmng.com": {
            "c": "Netmining",
            "u": "http://www.netmining.com/"
        },
        "adadvisor.net": {
            "c": "Neustar",
            "u": "http://www.neustar.biz/"
        },
        "neustar.biz": {
            "c": "Neustar",
            "u": "http://www.neustar.biz/"
        },
        "nexage.com": {
            "c": "Nexage",
            "u": "http://nexage.com/"
        },
        "nextperformance.com": {
            "c": "NextPerformance",
            "u": "http://www.nextperformance.com/"
        },
        "nxtck.com": {
            "c": "NextPerformance",
            "u": "http://www.nextperformance.com/"
        },
        "nextag.com": {
            "c": "Nextag",
            "u": "http://www.nextag.com/"
        },
        "imrworldwide.com": {
            "c": "Nielsen",
            "u": "http://www.nielsen.com/"
        },
        "imrworldwide.net": {
            "c": "Nielsen",
            "u": "http://www.nielsen.com/"
        },
        "networkedblogs.com": {
            "c": "Ninua",
            "u": "http://www.ninua.com/"
        },
        "ninua.com": {
            "c": "Ninua",
            "u": "http://www.ninua.com/"
        },
        "noktamedya.com": {
            "c": "Nokta",
            "u": "http://www.noktamedya.com/"
        },
        "virgul.com": {
            "c": "Nokta",
            "u": "http://www.noktamedya.com/"
        },
        "nowspots.com": {
            "c": "NowSpots",
            "u": "http://nowspots.com/"
        },
        "nuffnang.com": {
            "c": "Nuffnang",
            "u": "http://www.nuffnang.com.my/"
        },
        "nuffnang.com.my": {
            "c": "Nuffnang",
            "u": "http://www.nuffnang.com.my/"
        },
        "advg.jp": {
            "c": "OPT",
            "u": "http://www.opt.ne.jp/"
        },
        "opt.ne.jp": {
            "c": "OPT",
            "u": "http://www.opt.ne.jp/"
        },
        "p-advg.com": {
            "c": "OPT",
            "u": "http://www.opt.ne.jp/"
        },
        "adohana.com": {
            "c": "Ohana Media",
            "u": "http://www.ohana-media.com/"
        },
        "ohana-media.com": {
            "c": "Ohana Media",
            "u": "http://www.ohana-media.com/"
        },
        "ohanaqb.com": {
            "c": "Ohana Media",
            "u": "http://www.ohana-media.com/"
        },
        "accuenmedia.com": {
            "c": "Omnicom Group",
            "u": "http://www.omnicomgroup.com/"
        },
        "omnicomgroup.com": {
            "c": "Omnicom Group",
            "u": "http://www.omnicomgroup.com/"
        },
        "p-td.com": {
            "c": "Omnicom Group",
            "u": "http://www.omnicomgroup.com/"
        },
        "itsoneiota.com": {
            "c": "One iota",
            "u": "http://www.itsoneiota.com/"
        },
        "oneiota.co.uk": {
            "c": "One iota",
            "u": "http://www.itsoneiota.com/"
        },
        "oneupweb.com": {
            "c": "Oneupweb",
            "u": "http://www.oneupweb.com/"
        },
        "sodoit.com": {
            "c": "Oneupweb",
            "u": "http://www.oneupweb.com/"
        },
        "onm.de": {
            "c": "Open New Media",
            "u": "http://www.onm.de/"
        },
        "liftdna.com": {
            "c": "OpenX",
            "u": "http://openx.com/"
        },
        "openx.com": {
            "c": "OpenX",
            "u": "http://openx.com/"
        },
        "openx.net": {
            "c": "OpenX",
            "u": "http://openx.com/"
        },
        "openx.org": {
            "c": "OpenX",
            "u": "http://openx.com/"
        },
        "openxenterprise.com": {
            "c": "OpenX",
            "u": "http://openx.com/"
        },
        "servedbyopenx.com": {
            "c": "OpenX",
            "u": "http://openx.com/"
        },
        "mobiletheory.com": {
            "c": "Opera",
            "u": "http://www.opera.com/"
        },
        "operamediaworks.com": {
            "c": "Opera",
            "u": "http://www.opera.com/"
        },
        "operasoftware.com": {
            "c": "Opera",
            "u": "http://www.opera.com/"
        },
        "opera.com": {
            "c": "Opera",
            "u": "http://www.opera.com/"
        },
        "optmd.com": {
            "c": "OptMD",
            "u": "http://optmd.com/"
        },
        "optify.net": {
            "c": "Optify",
            "u": "http://www.optify.net/"
        },
        "cpmadvisors.com": {
            "c": "Optimal",
            "u": "http://optim.al/"
        },
        "cpmatic.com": {
            "c": "Optimal",
            "u": "http://optim.al/"
        },
        "nprove.com": {
            "c": "Optimal",
            "u": "http://optim.al/"
        },
        "optim.al": {
            "c": "Optimal",
            "u": "http://optim.al/"
        },
        "orbengine.com": {
            "c": "Optimal",
            "u": "http://optim.al/"
        },
        "xa.net": {
            "c": "Optimal",
            "u": "http://optim.al/"
        },
        "optimumresponse.com": {
            "c": "OptimumResponse",
            "u": "http://www.optimumresponse.com/"
        },
        "optnmstr.com": {
            "c": "OptinMonster",
            "u": "https://optinmonster.com/"
        },
        "optinmonster.com": {
            "c": "OptinMonster",
            "u": "https://optinmonster.com/"
        },
        "estara.com": {
            "c": "Oracle",
            "u": "http://www.oracle.com/"
        },
        "orangesoda.com": {
            "c": "OrangeSoda",
            "u": "http://www.orangesoda.com/"
        },
        "otracking.com": {
            "c": "OrangeSoda",
            "u": "http://www.orangesoda.com/"
        },
        "out-there-media.com": {
            "c": "Out There Media",
            "u": "http://www.out-there-media.com/"
        },
        "outbrain.com": {
            "c": "Outbrain",
            "u": "http://www.outbrain.com/"
        },
        "sphere.com": {
            "c": "Outbrain",
            "u": "http://www.outbrain.com/"
        },
        "dsnextgen.com": {
            "c": "Oversee.net",
            "u": "http://www.oversee.net/"
        },
        "oversee.net": {
            "c": "Oversee.net",
            "u": "http://www.oversee.net/"
        },
        "owneriq.com": {
            "c": "OwnerIQ",
            "u": "http://www.owneriq.com/"
        },
        "owneriq.net": {
            "c": "OwnerIQ",
            "u": "http://www.owneriq.com/"
        },
        "adconnexa.com": {
            "c": "OxaMedia",
            "u": "http://www.oxamedia.com/"
        },
        "adsbwm.com": {
            "c": "OxaMedia",
            "u": "http://www.oxamedia.com/"
        },
        "oxamedia.com": {
            "c": "OxaMedia",
            "u": "http://www.oxamedia.com/"
        },
        "platform-one.co.jp": {
            "c": "PLATFORM ONE",
            "u": "http://www.platform-one.co.jp/"
        },
        "pagefair.com": {
            "c": "PageFair",
            "u": "https://pagefair.com/"
        },
        "pagefair.net": {
            "c": "PageFair",
            "u": "https://pagefair.com/"
        },
        "paid-to-promote.net": {
            "c": "Paid-To-Promote.net",
            "u": "http://www.paid-to-promote.net/"
        },
        "pardot.com": {
            "c": "Pardot",
            "u": "http://www.pardot.com/"
        },
        "payhit.com": {
            "c": "PayHit",
            "u": "http://www.payhit.com/"
        },
        "lzjl.com": {
            "c": "Paypopup.com",
            "u": "http://www.paypopup.com/"
        },
        "paypopup.com": {
            "c": "Paypopup.com",
            "u": "http://www.paypopup.com/"
        },
        "peer39.com": {
            "c": "Peer39",
            "u": "http://www.peer39.com/"
        },
        "peer39.net": {
            "c": "Peer39",
            "u": "http://www.peer39.com/"
        },
        "peerfly.com": {
            "c": "PeerFly",
            "u": "http://peerfly.com/"
        },
        "performancing.com": {
            "c": "Performancing",
            "u": "http://performancing.com/"
        },
        "pheedo.com": {
            "c": "Pheedo",
            "u": "http://site.pheedo.com/"
        },
        "pictela.com": {
            "c": "Pictela",
            "u": "http://www.pictela.com/"
        },
        "pictela.net": {
            "c": "Pictela",
            "u": "http://www.pictela.com/"
        },
        "pixel.sg": {
            "c": "Pixel.sg",
            "u": "http://www.pixel.sg/"
        },
        "piximedia.com": {
            "c": "Piximedia",
            "u": "http://www.piximedia.com/"
        },
        "po.st": {
            "c": "Po.st",
            "u": "http://www.po.st/"
        },
        "pocketcents.com": {
            "c": "PocketCents",
            "u": "http://pocketcents.com/"
        },
        "polarmobile.com": {
            "c": "Polar Mobile",
            "u": "http://polarmobile.com"
        },
        "mediavoice.com": {
            "c": "Polar Mobile",
            "u": "http://polarmobile.com"
        },
        "politads.com": {
            "c": "Politads",
            "u": "http://politads.com/"
        },
        "getpolymorph.com": {
            "c": "Polymorph",
            "u": "http://getpolymorph.com/"
        },
        "adsnative.com": {
            "c": "Polymorph",
            "u": "http://getpolymorph.com/"
        },
        "pontiflex.com": {
            "c": "Pontiflex",
            "u": "http://www.pontiflex.com/"
        },
        "popads.net": {
            "c": "PopAds",
            "u": "https://www.popads.net/"
        },
        "popadscdn.net": {
            "c": "PopAds",
            "u": "https://www.popads.net/"
        },
        "gocampaignlive.com": {
            "c": "PopRule",
            "u": "http://poprule.com/"
        },
        "poprule.com": {
            "c": "PopRule",
            "u": "http://poprule.com/"
        },
        "popunder.ru": {
            "c": "Popunder.ru",
            "u": "http://popunder.ru/"
        },
        "precisionclick.com": {
            "c": "PrecisionClick",
            "u": "http://www.precisionclick.com/"
        },
        "predictad.com": {
            "c": "PredictAd",
            "u": "http://www.predictad.com/"
        },
        "blogads.com": {
            "c": "Pressflex",
            "u": "http://www.pressflex.com/"
        },
        "pressflex.com": {
            "c": "Pressflex",
            "u": "http://www.pressflex.com/"
        },
        "adcde.com": {
            "c": "Prime Visibility",
            "u": "http://www.primevisibility.com/"
        },
        "addlvr.com": {
            "c": "Prime Visibility",
            "u": "http://www.primevisibility.com/"
        },
        "adonnetwork.net": {
            "c": "Prime Visibility",
            "u": "http://www.primevisibility.com/"
        },
        "adtrgt.com": {
            "c": "Prime Visibility",
            "u": "http://www.primevisibility.com/"
        },
        "bannertgt.com": {
            "c": "Prime Visibility",
            "u": "http://www.primevisibility.com/"
        },
        "cptgt.com": {
            "c": "Prime Visibility",
            "u": "http://www.primevisibility.com/"
        },
        "cpvfeed.com": {
            "c": "Prime Visibility",
            "u": "http://www.primevisibility.com/"
        },
        "cpvtgt.com": {
            "c": "Prime Visibility",
            "u": "http://www.primevisibility.com/"
        },
        "popcde.com": {
            "c": "Prime Visibility",
            "u": "http://www.primevisibility.com/"
        },
        "primevisibility.com": {
            "c": "Prime Visibility",
            "u": "http://www.primevisibility.com/"
        },
        "sdfje.com": {
            "c": "Prime Visibility",
            "u": "http://www.primevisibility.com/"
        },
        "urtbk.com": {
            "c": "Prime Visibility",
            "u": "http://www.primevisibility.com/"
        },
        "proclivitymedia.com": {
            "c": "Proclivity",
            "u": "http://www.proclivitymedia.com/"
        },
        "proclivitysystems.com": {
            "c": "Proclivity",
            "u": "http://www.proclivitymedia.com/"
        },
        "pswec.com": {
            "c": "Proclivity",
            "u": "http://www.proclivitymedia.com/"
        },
        "projectwonderful.com": {
            "c": "Project Wonderful",
            "u": "http://www.projectwonderful.com/"
        },
        "propellerads.com": {
            "c": "Propeller Ads",
            "u": "http://propellerads.com/"
        },
        "prosperent.com": {
            "c": "Prosperent",
            "u": "http://prosperent.com/"
        },
        "proxilinks.com": {
            "c": "Proximic",
            "u": "http://www.proximic.com/"
        },
        "proximic.com": {
            "c": "Proximic",
            "u": "http://www.proximic.com/"
        },
        "proximic.net": {
            "c": "Proximic",
            "u": "http://www.proximic.com/"
        },
        "pubmatic.com": {
            "c": "PubMatic",
            "u": "http://www.pubmatic.com/"
        },
        "revinet.com": {
            "c": "PubMatic",
            "u": "http://www.pubmatic.com/"
        },
        "publicidees.com": {
            "c": "Public-Idées",
            "u": "http://www.publicidees.com/"
        },
        "pch.com": {
            "c": "Publishers Clearing House",
            "u": "http://www.pch.com/"
        },
        "iaded.com": {
            "c": "QUISMA",
            "u": "http://www.i-behavior.com/"
        },
        "quisma.com": {
            "c": "QUISMA",
            "u": "http://www.i-behavior.com/"
        },
        "quismatch.com": {
            "c": "QUISMA",
            "u": "http://www.i-behavior.com/"
        },
        "xaded.com": {
            "c": "QUISMA",
            "u": "http://www.i-behavior.com/"
        },
        "xmladed.com": {
            "c": "QUISMA",
            "u": "http://www.i-behavior.com/"
        },
        "quakemarketing.com": {
            "c": "Quake Marketing",
            "u": "http://quakemarketing.com/"
        },
        "quantcast.com": {
            "c": "Quantcast",
            "u": "http://www.quantcast.com/"
        },
        "quantserve.com": {
            "c": "Quantcast",
            "u": "http://www.quantcast.com/"
        },
        "qnsr.com": {
            "c": "QuinStreet",
            "u": "http://quinstreet.com/"
        },
        "qsstats.com": {
            "c": "QuinStreet",
            "u": "http://quinstreet.com/"
        },
        "quinstreet.com": {
            "c": "QuinStreet",
            "u": "http://quinstreet.com/"
        },
        "rmbn.net": {
            "c": "RMBN",
            "u": "http://rmbn.net/"
        },
        "rmbn.ru": {
            "c": "RMBN",
            "u": "http://rmbn.net/"
        },
        "rmmonline.com": {
            "c": "RMM",
            "u": "http://www.rmmonline.com/"
        },
        "matchbin.com": {
            "c": "Radiate Media",
            "u": "http://www.radiatemedia.com/"
        },
        "radiatemedia.com": {
            "c": "Radiate Media",
            "u": "http://www.radiatemedia.com/"
        },
        "gwallet.com": {
            "c": "RadiumOne",
            "u": "http://www.radiumone.com/"
        },
        "radiumone.com": {
            "c": "RadiumOne",
            "u": "http://www.radiumone.com/"
        },
        "radiusmarketing.com": {
            "c": "Radius Marketing",
            "u": "http://www.radiusmarketing.com/"
        },
        "rambler.ru": {
            "c": "Rambler",
            "u": "http://www.rambler.ru/"
        },
        "liveramp.com": {
            "c": "Rapleaf",
            "u": "http://www.rapleaf.com/"
        },
        "rapleaf.com": {
            "c": "Rapleaf",
            "u": "http://www.rapleaf.com/"
        },
        "rlcdn.com": {
            "c": "Rapleaf",
            "u": "http://www.rapleaf.com/"
        },
        "retargeter.com": {
            "c": "ReTargeter",
            "u": "http://www.retargeter.com/"
        },
        "reachlocal.com": {
            "c": "ReachLocal",
            "u": "http://www.reachlocal.com/"
        },
        "rlcdn.net": {
            "c": "ReachLocal",
            "u": "http://www.reachlocal.com/"
        },
        "react2media.com": {
            "c": "React2Media",
            "u": "http://www.react2media.com/"
        },
        "reduxmedia.com": {
            "c": "Redux Media",
            "u": "http://reduxmedia.com/"
        },
        "convertglobal.com": {
            "c": "Rekko",
            "u": "http://rekko.com/"
        },
        "rekko.com": {
            "c": "Rekko",
            "u": "http://rekko.com/"
        },
        "reklamstore.com": {
            "c": "Reklam Store",
            "u": "http://reklamstore.com/"
        },
        "reklamport.com": {
            "c": "Reklamport",
            "u": "http://www.reklamport.com/"
        },
        "reklamz.com": {
            "c": "Reklamz",
            "u": "http://www.reklamz.com/"
        },
        "relestar.com": {
            "c": "Relevad",
            "u": "http://www.relevad.com/"
        },
        "relevad.com": {
            "c": "Relevad",
            "u": "http://www.relevad.com/"
        },
        "advertserve.com": {
            "c": "Renegade Internet",
            "u": "http://www.renegadeinternet.com/"
        },
        "renegadeinternet.com": {
            "c": "Renegade Internet",
            "u": "http://www.renegadeinternet.com/"
        },
        "resolutionmedia.com": {
            "c": "Resolution Media",
            "u": "http://resolutionmedia.com/"
        },
        "resonateinsights.com": {
            "c": "Resonate",
            "u": "http://www.resonateinsights.com/"
        },
        "resonatenetworks.com": {
            "c": "Resonate",
            "u": "http://www.resonateinsights.com/"
        },
        "responsys.com": {
            "c": "Responsys",
            "u": "http://www.responsys.com/"
        },
        "blvdstatus.com": {
            "c": "Retirement Living",
            "u": "www.retirement-living.com/"
        },
        "retirement-living.com": {
            "c": "Retirement Living",
            "u": "www.retirement-living.com/"
        },
        "revcontent.com": {
            "c": "RevContent",
            "u": "http://revcontent.com/"
        },
        "revenuemax.de": {
            "c": "RevenueMax",
            "u": "http://revenuemax.de/"
        },
        "rhythmnewmedia.com": {
            "c": "Rhythm",
            "u": "http://rhythmnewmedia.com/"
        },
        "rnmd.net": {
            "c": "Rhythm",
            "u": "http://rhythmnewmedia.com/"
        },
        "1rx.io": {
            "c": "Rhythm",
            "u": "http://rhythmnewmedia.com/"
        },
        "rhythmone.com": {
            "c": "Rhythm",
            "u": "http://rhythmnewmedia.com/"
        },
        "richrelevance.com": {
            "c": "RichRelevance",
            "u": "http://www.richrelevance.com/"
        },
        "rightaction.com": {
            "c": "RightAction",
            "u": "http://rightaction.com/"
        },
        "rfihub.com": {
            "c": "Rocket Fuel",
            "u": "http://rocketfuel.com/"
        },
        "rfihub.net": {
            "c": "Rocket Fuel",
            "u": "http://rocketfuel.com/"
        },
        "rocketfuel.com": {
            "c": "Rocket Fuel",
            "u": "http://rocketfuel.com/"
        },
        "rovion.com": {
            "c": "Rovion",
            "u": "http://www.rovion.com/"
        },
        "rutarget.ru": {
            "c": "RuTarget",
            "u": "http://www.rutarget.ru/"
        },
        "aimatch.com": {
            "c": "SAS",
            "u": "http://www.sas.com/"
        },
        "sas.com": {
            "c": "SAS",
            "u": "http://www.sas.com/"
        },
        "reztrack.com": {
            "c": "Sabre",
            "u": "http://www.sabre.com/"
        },
        "sabre.com": {
            "c": "Sabre",
            "u": "http://www.sabre.com/"
        },
        "sabrehospitality.com": {
            "c": "Sabre",
            "u": "http://www.sabre.com/"
        },
        "salesforce.com": {
            "c": "Salesforce.com",
            "u": "http://www.salesforce.com/"
        },
        "samurai-factory.jp": {
            "c": "Samurai Factory",
            "u": "http://www.samurai-factory.jp/"
        },
        "shinobi.jp": {
            "c": "Samurai Factory",
            "u": "http://www.samurai-factory.jp/"
        },
        "bridgetrack.com": {
            "c": "Sapient",
            "u": "http://www.sapient.com/"
        },
        "sapient.com": {
            "c": "Sapient",
            "u": "http://www.sapient.com/"
        },
        "scandinavianadnetworks.com": {
            "c": "Scandinavian AdNetworks",
            "u": "http://www.scandinavianadnetworks.com/"
        },
        "scribol.com": {
            "c": "Scribol",
            "u": "http://scribol.com/"
        },
        "searchforce.com": {
            "c": "SearchForce",
            "u": "http://www.searchforce.com/"
        },
        "searchforce.net": {
            "c": "SearchForce",
            "u": "http://www.searchforce.com/"
        },
        "kanoodle.com": {
            "c": "Seevast",
            "u": "http://www.seevast.com/"
        },
        "pulse360.com": {
            "c": "Seevast",
            "u": "http://www.seevast.com/"
        },
        "seevast.com": {
            "c": "Seevast",
            "u": "http://www.seevast.com/"
        },
        "syndigonetworks.com": {
            "c": "Seevast",
            "u": "http://www.seevast.com/"
        },
        "nabbr.com": {
            "c": "Selectable Media",
            "u": "http://selectablemedia.com/"
        },
        "selectablemedia.com": {
            "c": "Selectable Media",
            "u": "http://selectablemedia.com/"
        },
        "sevenads.net": {
            "c": "SevenAds",
            "u": "http://www.sevenads.net/"
        },
        "sexinyourcity.com": {
            "c": "SexInYourCity",
            "u": "http://www.sexinyourcity.com/"
        },
        "shareasale.com": {
            "c": "ShareASale",
            "u": "http://www.shareasale.com/"
        },
        "shopzilla.com": {
            "c": "Shopzilla",
            "u": "http://www.shopzilla.com/"
        },
        "mkt51.net": {
            "c": "Silverpop",
            "u": "http://www.silverpop.com/"
        },
        "pages05.net": {
            "c": "Silverpop",
            "u": "http://www.silverpop.com/"
        },
        "silverpop.com": {
            "c": "Silverpop",
            "u": "http://www.silverpop.com/"
        },
        "vtrenz.net": {
            "c": "Silverpop",
            "u": "http://www.silverpop.com/"
        },
        "simpli.fi": {
            "c": "Simpli.fi",
            "u": "http://www.simpli.fi/"
        },
        "sitescout.com": {
            "c": "SiteScout",
            "u": "http://www.sitescout.com/"
        },
        "skimlinks.com": {
            "c": "Skimlinks",
            "u": "http://skimlinks.com/"
        },
        "skimresources.com": {
            "c": "Skimlinks",
            "u": "http://skimlinks.com/"
        },
        "adcentriconline.com": {
            "c": "Skupe Net",
            "u": "http://www.skupenet.com/"
        },
        "skupenet.com": {
            "c": "Skupe Net",
            "u": "http://www.skupenet.com/"
        },
        "smaato.com": {
            "c": "Smaato",
            "u": "http://www.smaato.com/"
        },
        "smileymedia.com": {
            "c": "Smiley Media",
            "u": "http://www.smileymedia.com/"
        },
        "smowtion.com": {
            "c": "Smowtion",
            "u": "http://smowtion.com/"
        },
        "snap.com": {
            "c": "Snap",
            "u": "http://www.snap.com/"
        },
        "halogenmediagroup.com": {
            "c": "SocialChorus",
            "u": "http://www.socialchorus.com/"
        },
        "halogennetwork.com": {
            "c": "SocialChorus",
            "u": "http://www.socialchorus.com/"
        },
        "socialchorus.com": {
            "c": "SocialChorus",
            "u": "http://www.socialchorus.com/"
        },
        "ratevoice.com": {
            "c": "SocialInterface",
            "u": "http://socialinterface.com/"
        },
        "socialinterface.com": {
            "c": "SocialInterface",
            "u": "http://socialinterface.com/"
        },
        "socialtwist.com": {
            "c": "SocialTwist",
            "u": "http://tellafriend.socialtwist.com/"
        },
        "spacechimpmedia.com": {
            "c": "Space Chimp Media",
            "u": "http://spacechimpmedia.com/"
        },
        "sparkstudios.com": {
            "c": "Spark Studios",
            "u": "http://www.sparkstudios.com/"
        },
        "adbutler.com": {
            "c": "Sparklit",
            "u": "http://www.sparklit.com/"
        },
        "sparklit.com": {
            "c": "Sparklit",
            "u": "http://www.sparklit.com/"
        },
        "adviva.co.uk": {
            "c": "Specific Media",
            "u": "http://www.specificmedia.com/"
        },
        "adviva.net": {
            "c": "Specific Media",
            "u": "http://www.specificmedia.com/"
        },
        "sitemeter.com": {
            "c": "Specific Media",
            "u": "http://www.specificmedia.com/"
        },
        "specificclick.net": {
            "c": "Specific Media",
            "u": "http://www.specificmedia.com/"
        },
        "specificmedia.com": {
            "c": "Specific Media",
            "u": "http://www.specificmedia.com/"
        },
        "specificmedia.co.uk": {
            "c": "Specific Media",
            "u": "http://www.specificmedia.com/"
        },
        "spectate.com": {
            "c": "Spectate",
            "u": "http://spectate.com/"
        },
        "spongegroup.com": {
            "c": "Sponge",
            "u": "http://spongegroup.com/"
        },
        "spongecell.com": {
            "c": "Spongecell",
            "u": "http://www.spongecell.com/"
        },
        "sponsorads.de": {
            "c": "SponsorAds",
            "u": "http://www.sponsorads.de/"
        },
        "spot200.com": {
            "c": "Spot200",
            "u": "http://spot200.com/"
        },
        "spotxchange.com": {
            "c": "SpotXchange",
            "u": "http://www.spotxchange.com/"
        },
        "stargamesaffiliate.com": {
            "c": "StarGames",
            "u": "https://www.stargames.net/"
        },
        "steelhouse.com": {
            "c": "SteelHouse",
            "u": "http://www.steelhouse.com/"
        },
        "steelhousemedia.com": {
            "c": "SteelHouse",
            "u": "http://www.steelhouse.com/"
        },
        "cams.com": {
            "c": "Streamray",
            "u": "http://streamray.com/"
        },
        "streamray.com": {
            "c": "Streamray",
            "u": "http://streamray.com/"
        },
        "strikead.com": {
            "c": "StrikeAd",
            "u": "http://www.strikead.com/"
        },
        "popularmedia.com": {
            "c": "StrongMail",
            "u": "http://www.strongmail.com/"
        },
        "struq.com": {
            "c": "Struq",
            "u": "http://struq.com/"
        },
        "suite66.com": {
            "c": "Suite 66",
            "u": "http://www.suite66.com/"
        },
        "summitmedia.co.uk": {
            "c": "Summit",
            "u": "http://www.summit.co.uk/"
        },
        "supersonicads.com": {
            "c": "SupersonicAds",
            "u": "http://www.supersonicads.com/"
        },
        "switchadhub.com": {
            "c": "Switch",
            "u": "http://www.switchconcepts.com/"
        },
        "switchconcepts.co.uk": {
            "c": "Switch",
            "u": "http://www.switchconcepts.com/"
        },
        "switchconcepts.com": {
            "c": "Switch",
            "u": "http://www.switchconcepts.com/"
        },
        "ethicalads.net": {
            "c": "Switch",
            "u": "http://www.switchconcepts.com/"
        },
        "swoop.com": {
            "c": "Swoop",
            "u": "http://swoop.com/"
        },
        "factortg.com": {
            "c": "SymphonyAM",
            "u": "http://www.factortg.com/"
        },
        "clickable.net": {
            "c": "Syncapse",
            "u": "http://www.syncapse.com/"
        },
        "syncapse.com": {
            "c": "Syncapse",
            "u": "http://www.syncapse.com/"
        },
        "adotsolution.com": {
            "c": "Syrup Ad",
            "u": "http://adotsolution.com/"
        },
        "tlvmedia.com": {
            "c": "TLVMedia",
            "u": "http://tlvmedia.com/"
        },
        "taboola.com": {
            "c": "Taboola",
            "u": "https://www.taboola.com/"
        },
        "perfectmarket.com": {
            "c": "Taboola",
            "u": "https://www.taboola.com/"
        },
        "tailsweep.com": {
            "c": "Tailsweep",
            "u": "http://www.tailsweep.com/"
        },
        "tap.me": {
            "c": "Tap.me",
            "u": "http://tap.me/"
        },
        "tapit.com": {
            "c": "TapIt!",
            "u": "http://tapit.com/"
        },
        "tapad.com": {
            "c": "Tapad",
            "u": "http://www.tapad.com/"
        },
        "bizmey.com": {
            "c": "Tapgage",
            "u": "http://www.tapgage.com/"
        },
        "tapgage.com": {
            "c": "Tapgage",
            "u": "http://www.tapgage.com/"
        },
        "targetix.net": {
            "c": "Targetix",
            "u": "http://targetix.net/"
        },
        "quicknoodles.com": {
            "c": "Tatto Media",
            "u": "http://tattomedia.com/"
        },
        "tattomedia.com": {
            "c": "Tatto Media",
            "u": "http://tattomedia.com/"
        },
        "teadma.com": {
            "c": "Teadma",
            "u": "http://www.teadma.com/"
        },
        "teads.tv": {
            "c": "Teads.tv",
            "u": "http://teads.tv/"
        },
        "ebuzzing.com": {
            "c": "Teads.tv",
            "u": "http://teads.tv/"
        },
        "technorati.com": {
            "c": "Technorati",
            "u": "http://technorati.com/"
        },
        "technoratimedia.com": {
            "c": "Technorati",
            "u": "http://technorati.com/"
        },
        "tellapart.com": {
            "c": "TellApart",
            "u": "http://tellapart.com/"
        },
        "tellapt.com": {
            "c": "TellApart",
            "u": "http://tellapart.com/"
        },
        "sensis.com.au": {
            "c": "Telstra",
            "u": "http://www.telstra.com.au/"
        },
        "sensisdata.com.au": {
            "c": "Telstra",
            "u": "http://www.telstra.com.au/"
        },
        "sensisdigitalmedia.com.au": {
            "c": "Telstra",
            "u": "http://www.telstra.com.au/"
        },
        "telstra.com.au": {
            "c": "Telstra",
            "u": "http://www.telstra.com.au/"
        },
        "eztargetmedia.com": {
            "c": "Terra",
            "u": "http://www.terra.com.br/"
        },
        "terra.com.br": {
            "c": "Terra",
            "u": "http://www.terra.com.br/"
        },
        "hittail.com": {
            "c": "The Numa Group",
            "u": "http://www.thenumagroup.com/"
        },
        "thenumagroup.com": {
            "c": "The Numa Group",
            "u": "http://www.thenumagroup.com/"
        },
        "rimmkaufman.com": {
            "c": "The Rimm-Kaufman Group",
            "u": "http://www.rimmkaufman.com/"
        },
        "rkdms.com": {
            "c": "The Rimm-Kaufman Group",
            "u": "http://www.rimmkaufman.com/"
        },
        "thesearchagency.com": {
            "c": "The Search Agency",
            "u": "http://www.thesearchagency.com/"
        },
        "thesearchagency.net": {
            "c": "The Search Agency",
            "u": "http://www.thesearchagency.com/"
        },
        "adsrvr.org": {
            "c": "The Trade Desk",
            "u": "http://thetradedesk.com/"
        },
        "thetradedesk.com": {
            "c": "The Trade Desk",
            "u": "http://thetradedesk.com/"
        },
        "echosearch.com": {
            "c": "Think Realtime",
            "u": "http://www.thinkrealtime.com/"
        },
        "esm1.net": {
            "c": "Think Realtime",
            "u": "http://www.thinkrealtime.com/"
        },
        "thinkrealtime.com": {
            "c": "Think Realtime",
            "u": "http://www.thinkrealtime.com/"
        },
        "carbonads.com": {
            "c": "Tinder",
            "u": "http://tinder.com/"
        },
        "tinder.com": {
            "c": "Tinder",
            "u": "http://tinder.com/"
        },
        "tiqiq.com": {
            "c": "TiqIQ",
            "u": "http://www.tiqiq.com/"
        },
        "adternal.com": {
            "c": "Tisoomi",
            "u": "http://www.tisoomi.com/"
        },
        "tisoomi.com": {
            "c": "Tisoomi",
            "u": "http://www.tisoomi.com/"
        },
        "todacell.com": {
            "c": "Todacell",
            "u": "http://www.todacell.com/"
        },
        "tonefuse.com": {
            "c": "ToneFuse",
            "u": "http://tonefuse.com/"
        },
        "clickfuse.com": {
            "c": "ToneMedia",
            "u": "http://tonemedia.com/"
        },
        "tonemedia.com": {
            "c": "ToneMedia",
            "u": "http://tonemedia.com/"
        },
        "inq.com": {
            "c": "TouchCommerce",
            "u": "http://www.touchcommerce.com/"
        },
        "touchcommerce.com": {
            "c": "TouchCommerce",
            "u": "http://www.touchcommerce.com/"
        },
        "trackingsoft.com": {
            "c": "TrackingSoft",
            "u": "http://trackingsoft.com/"
        },
        "tradetracker.com": {
            "c": "TradeTracker",
            "u": "http://www.tradetracker.com/"
        },
        "tradetracker.net": {
            "c": "TradeTracker",
            "u": "http://www.tradetracker.com/"
        },
        "tradedoubler.com": {
            "c": "Tradedoubler",
            "u": "http://www.tradedoubler.com/"
        },
        "traffichaus.com": {
            "c": "TrafficHaus",
            "u": "http://www.traffichaus.com/"
        },
        "traffichouse.com": {
            "c": "TrafficHaus",
            "u": "http://www.traffichaus.com/"
        },
        "trafficrevenue.net": {
            "c": "TrafficRevenue",
            "u": "http://www.trafficrevenue.net/"
        },
        "traffiq.com": {
            "c": "Traffiq",
            "u": "http://www.traffiq.com/"
        },
        "traveladnetwork.com": {
            "c": "Travora Media",
            "u": "http://www.travoramedia.com/"
        },
        "traveladvertising.com": {
            "c": "Travora Media",
            "u": "http://www.travoramedia.com/"
        },
        "travoramedia.com": {
            "c": "Travora Media",
            "u": "http://www.travoramedia.com/"
        },
        "scanscout.com": {
            "c": "Tremor Video",
            "u": "http://www.tremorvideo.com/"
        },
        "tmnetads.com": {
            "c": "Tremor Video",
            "u": "http://www.tremorvideo.com/"
        },
        "tremormedia.com": {
            "c": "Tremor Video",
            "u": "http://www.tremorvideo.com/"
        },
        "tremorvideo.com": {
            "c": "Tremor Video",
            "u": "http://www.tremorvideo.com/"
        },
        "tremorhub.com": {
            "c": "Tremor Video",
            "u": "http://www.tremorvideo.com/"
        },
        "triggit.com": {
            "c": "Triggit",
            "u": "http://triggit.com/"
        },
        "3lift.com": {
            "c": "TripleLift",
            "u": "http://triplelift.com/"
        },
        "triplelift.com": {
            "c": "TripleLift",
            "u": "http://triplelift.com/"
        },
        "adlegend.com": {
            "c": "TruEffect",
            "u": "http://www.trueffect.com/"
        },
        "trueffect.com": {
            "c": "TruEffect",
            "u": "http://www.trueffect.com/"
        },
        "tmogul.com": {
            "c": "TubeMogul",
            "u": "http://www.tubemogul.com/"
        },
        "tubemogul.com": {
            "c": "TubeMogul",
            "u": "http://www.tubemogul.com/"
        },
        "buzzlogic.com": {
            "c": "Twelvefold",
            "u": "http://www.twelvefold.com/"
        },
        "twelvefold.com": {
            "c": "Twelvefold",
            "u": "http://www.twelvefold.com/"
        },
        "tyroo.com": {
            "c": "Tyroo",
            "u": "http://www.tyroo.com/"
        },
        "upsellit.com": {
            "c": "USI Technologies",
            "u": "http://www.usitechnologies.com/"
        },
        "usitechnologies.com": {
            "c": "USI Technologies",
            "u": "http://www.usitechnologies.com/"
        },
        "unanimis.co.uk": {
            "c": "Unanimis",
            "u": "http://www.unanimis.co.uk/"
        },
        "udmserve.net": {
            "c": "Underdog Media",
            "u": "http://www.underdogmedia.com/"
        },
        "underdogmedia.com": {
            "c": "Underdog Media",
            "u": "http://www.underdogmedia.com/"
        },
        "undertone.com": {
            "c": "Undertone",
            "u": "http://www.undertone.com/"
        },
        "undertonenetworks.com": {
            "c": "Undertone",
            "u": "http://www.undertone.com/"
        },
        "undertonevideo.com": {
            "c": "Undertone",
            "u": "http://www.undertone.com/"
        },
        "51network.com": {
            "c": "UniQlick",
            "u": "http://www.uniqlick.com/"
        },
        "uniqlick.com": {
            "c": "UniQlick",
            "u": "http://www.uniqlick.com/"
        },
        "wanmo.com": {
            "c": "UniQlick",
            "u": "http://www.uniqlick.com/"
        },
        "unrulymedia.com": {
            "c": "Unruly",
            "u": "http://www.unrulymedia.com/"
        },
        "valuead.com": {
            "c": "Value Ad",
            "u": "http://valuead.com/"
        },
        "adserver.com": {
            "c": "ValueClick",
            "u": "http://www.valueclick.com/"
        },
        "dotomi.com": {
            "c": "ValueClick",
            "u": "http://www.valueclick.com/"
        },
        "dtmpub.com": {
            "c": "ValueClick",
            "u": "http://www.valueclick.com/"
        },
        "emjcd.com": {
            "c": "ValueClick",
            "u": "http://www.valueclick.com/"
        },
        "fastclick.com": {
            "c": "ValueClick",
            "u": "http://www.valueclick.com/"
        },
        "fastclick.net": {
            "c": "ValueClick",
            "u": "http://www.valueclick.com/"
        },
        "greystripe.com": {
            "c": "ValueClick",
            "u": "http://www.valueclick.com/"
        },
        "lduhtrp.net": {
            "c": "ValueClick",
            "u": "http://www.valueclick.com/"
        },
        "mediaplex.com": {
            "c": "ValueClick",
            "u": "http://www.valueclick.com/"
        },
        "valueclick.com": {
            "c": "ValueClick",
            "u": "http://www.valueclick.com/"
        },
        "valueclick.net": {
            "c": "ValueClick",
            "u": "http://www.valueclick.com/"
        },
        "valueclickmedia.com": {
            "c": "ValueClick",
            "u": "http://www.valueclick.com/"
        },
        "amigos.com": {
            "c": "Various",
            "u": "http://www.various.com/"
        },
        "getiton.com": {
            "c": "Various",
            "u": "http://www.various.com/"
        },
        "medley.com": {
            "c": "Various",
            "u": "http://www.various.com/"
        },
        "nostringsattached.com": {
            "c": "Various",
            "u": "http://www.various.com/"
        },
        "various.com": {
            "c": "Various",
            "u": "http://www.various.com/"
        },
        "ivdopia.com": {
            "c": "Vdopia",
            "u": "http://www.vdopia.com/"
        },
        "vdopia.com": {
            "c": "Vdopia",
            "u": "http://www.vdopia.com/"
        },
        "veeseo.com": {
            "c": "Veeseo",
            "u": "http://veeseo.com"
        },
        "adsvelocity.com": {
            "c": "Velocity Media",
            "u": "http://adsvelocity.com/"
        },
        "mobclix.com": {
            "c": "Velti",
            "u": "http://www.velti.com/"
        },
        "velti.com": {
            "c": "Velti",
            "u": "http://www.velti.com/"
        },
        "vemba.com": {
            "c": "Vemba",
            "u": "https://www.vemba.com/"
        },
        "singlefeed.com": {
            "c": "Vendio",
            "u": "http://www.vendio.com/"
        },
        "vendio.com": {
            "c": "Vendio",
            "u": "http://www.vendio.com/"
        },
        "veoxa.com": {
            "c": "Veoxa",
            "u": "http://www.veoxa.com/"
        },
        "veremedia.com": {
            "c": "Veremedia",
            "u": "http://www.veremedia.com/"
        },
        "verticalresponse.com": {
            "c": "VerticalResponse",
            "u": "http://www.verticalresponse.com/"
        },
        "vresp.com": {
            "c": "VerticalResponse",
            "u": "http://www.verticalresponse.com/"
        },
        "intellitxt.com": {
            "c": "Vibrant Media",
            "u": "http://www.vibrantmedia.com/"
        },
        "picadmedia.com": {
            "c": "Vibrant Media",
            "u": "http://www.vibrantmedia.com/"
        },
        "vibrantmedia.com": {
            "c": "Vibrant Media",
            "u": "http://www.vibrantmedia.com/"
        },
        "viglink.com": {
            "c": "VigLink",
            "u": "http://www.viglink.com/"
        },
        "viewablemedia.net": {
            "c": "Visible Measures",
            "u": "http://www.visiblemeasures.com/"
        },
        "visiblemeasures.com": {
            "c": "Visible Measures",
            "u": "http://www.visiblemeasures.com/"
        },
        "visbrands.com": {
            "c": "VisibleBrands",
            "u": "http://www.visbrands.com/"
        },
        "vdna-assets.com": {
            "c": "VisualDNA",
            "u": "http://www.visualdna.com/"
        },
        "visualdna-stats.com": {
            "c": "VisualDNA",
            "u": "http://www.visualdna.com/"
        },
        "visualdna.com": {
            "c": "VisualDNA",
            "u": "http://www.visualdna.com/"
        },
        "vizu.com": {
            "c": "Vizu",
            "u": "http://www.vizu.com/"
        },
        "vizury.com": {
            "c": "Vizury",
            "u": "http://www.vizury.com/"
        },
        "vserv.com": {
            "c": "Vserv",
            "u": "http://www.vserv.com/"
        },
        "vserv.mobi": {
            "c": "Vserv",
            "u": "http://www.vserv.com/"
        },
        "247realmedia.com": {
            "c": "WPP",
            "u": "http://www.wpp.com/"
        },
        "accelerator-media.com": {
            "c": "WPP",
            "u": "http://www.wpp.com/"
        },
        "acceleratorusa.com": {
            "c": "WPP",
            "u": "http://www.wpp.com/"
        },
        "decdna.net": {
            "c": "WPP",
            "u": "http://www.wpp.com/"
        },
        "decideinteractive.com": {
            "c": "WPP",
            "u": "http://www.wpp.com/"
        },
        "gmads.net": {
            "c": "WPP",
            "u": "http://www.wpp.com/"
        },
        "groupm.com": {
            "c": "WPP",
            "u": "http://www.wpp.com/"
        },
        "kantarmedia.com": {
            "c": "WPP",
            "u": "http://www.wpp.com/"
        },
        "mecglobal.com": {
            "c": "WPP",
            "u": "http://www.wpp.com/"
        },
        "mindshare.nl": {
            "c": "WPP",
            "u": "http://www.wpp.com/"
        },
        "mookie1.com": {
            "c": "WPP",
            "u": "http://www.wpp.com/"
        },
        "pm14.com": {
            "c": "WPP",
            "u": "http://www.wpp.com/"
        },
        "realmedia.com": {
            "c": "WPP",
            "u": "http://www.wpp.com/"
        },
        "targ.ad": {
            "c": "WPP",
            "u": "http://www.wpp.com/"
        },
        "themig.com": {
            "c": "WPP",
            "u": "http://www.wpp.com/"
        },
        "wpp.com": {
            "c": "WPP",
            "u": "http://www.wpp.com/"
        },
        "xaxis.com": {
            "c": "WPP",
            "u": "http://www.wpp.com/"
        },
        "contentwidgets.net": {
            "c": "Wahoha",
            "u": "http://wahoha.com/"
        },
        "wahoha.com": {
            "c": "Wahoha",
            "u": "http://wahoha.com/"
        },
        "feedperfect.com": {
            "c": "Web.com",
            "u": "http://www.web.com/"
        },
        "web.com": {
            "c": "Web.com",
            "u": "http://www.web.com/"
        },
        "webads.co.uk": {
            "c": "WebAds",
            "u": "http://www.webads.co.uk/"
        },
        "webgozar.com": {
            "c": "WebGozar.com",
            "u": "http://www.webgozar.com/"
        },
        "webgozar.ir": {
            "c": "WebGozar.com",
            "u": "http://www.webgozar.com/"
        },
        "dsmmadvantage.com": {
            "c": "WebMetro",
            "u": "http://www.webmetro.com/"
        },
        "webmetro.com": {
            "c": "WebMetro",
            "u": "http://www.webmetro.com/"
        },
        "weborama.com": {
            "c": "Weborama",
            "u": "http://weborama.com/"
        },
        "weborama.fr": {
            "c": "Weborama",
            "u": "http://weborama.com/"
        },
        "webtraffic.no": {
            "c": "Webtraffic",
            "u": "http://www.webtraffic.se/"
        },
        "webtraffic.se": {
            "c": "Webtraffic",
            "u": "http://www.webtraffic.se/"
        },
        "wiredminds.com": {
            "c": "WiredMinds",
            "u": "http://www.wiredminds.com/"
        },
        "wiredminds.de": {
            "c": "WiredMinds",
            "u": "http://www.wiredminds.com/"
        },
        "adtotal.pl": {
            "c": "Wirtualna Polska",
            "u": "http://www.wp.pl/"
        },
        "wp.pl": {
            "c": "Wirtualna Polska",
            "u": "http://www.wp.pl/"
        },
        "wishabi.com": {
            "c": "Wishabi",
            "u": "http://wishabi.com"
        },
        "wishabi.net": {
            "c": "Wishabi",
            "u": "http://wishabi.com"
        },
        "wordstream.com": {
            "c": "WordStream",
            "u": "http://www.wordstream.com/"
        },
        "admanager-xertive.com": {
            "c": "Xertive Media",
            "u": "http://www.xertivemedia.com/"
        },
        "xertivemedia.com": {
            "c": "Xertive Media",
            "u": "http://www.xertivemedia.com/"
        },
        "adplan-ds.com": {
            "c": "Xrost DS",
            "u": "http://www.adplan-ds.com/"
        },
        "ydworld.com": {
            "c": "YD",
            "u": "http://www.ydworld.com/"
        },
        "yieldivision.com": {
            "c": "YD",
            "u": "http://www.ydworld.com/"
        },
        "yoc.com": {
            "c": "YOC",
            "u": "http://group.yoc.com/"
        },
        "yoc-performance.com": {
            "c": "YOC",
            "u": "http://group.yoc.com/"
        },
        "yabuka.com": {
            "c": "Yabuka",
            "u": "http://www.yabuka.com/"
        },
        "adinterax.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "adrevolver.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "bluelithium.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "dapper.net": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "interclick.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "overture.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "rightmedia.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "rmxads.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "secure-adserver.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "adserver.yahoo.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "advertising.yahoo.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "marketingsolutions.yahoo.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "thewheelof.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "yieldmanager.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "yieldmanager.net": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "yldmgrimg.net": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "web-visor.com": {
            "c": "Yandex",
            "u": "http://www.yandex.com/"
        },
        "moikrug.ru": {
            "c": "Yandex",
            "u": "http://www.yandex.com/"
        },
        "yandex.com": {
            "c": "Yandex",
            "u": "http://www.yandex.com/"
        },
        "yandex.ru": {
            "c": "Yandex",
            "u": "http://www.yandex.com/"
        },
        "yandex.st": {
            "c": "Yandex",
            "u": "http://www.yandex.com/"
        },
        "yandex.ua": {
            "c": "Yandex",
            "u": "http://www.yandex.com/"
        },
        "yandex.com.tr": {
            "c": "Yandex",
            "u": "http://www.yandex.com/"
        },
        "yandex.by": {
            "c": "Yandex",
            "u": "http://www.yandex.com/"
        },
        "addynamix.com": {
            "c": "Ybrant Digital",
            "u": "http://www.ybrantdigital.com/"
        },
        "adserverplus.com": {
            "c": "Ybrant Digital",
            "u": "http://www.ybrantdigital.com/"
        },
        "oridian.com": {
            "c": "Ybrant Digital",
            "u": "http://www.ybrantdigital.com/"
        },
        "ybrantdigital.com": {
            "c": "Ybrant Digital",
            "u": "http://www.ybrantdigital.com/"
        },
        "attracto.com": {
            "c": "YellowHammer",
            "u": "http://www.yhmg.com/"
        },
        "clickhype.com": {
            "c": "YellowHammer",
            "u": "http://www.yhmg.com/"
        },
        "yellowhammermg.com": {
            "c": "YellowHammer",
            "u": "http://www.yhmg.com/"
        },
        "yhmg.com": {
            "c": "YellowHammer",
            "u": "http://www.yhmg.com/"
        },
        "yesads.com": {
            "c": "Yes Ads",
            "u": "http://yesads.com/"
        },
        "yieldads.com": {
            "c": "YieldAds",
            "u": "http://yieldads.com/"
        },
        "ybx.io": {
            "c": "YieldBids",
            "u": "http://ybx.io/"
        },
        "yieldbuild.com": {
            "c": "YieldBuild",
            "u": "http://yieldbuild.com/"
        },
        "yieldlab.de": {
            "c": "Yieldlab",
            "u": "http://www.yieldlab.de/"
        },
        "yieldlab.net": {
            "c": "Yieldlab",
            "u": "http://www.yieldlab.de/"
        },
        "yieldmo.com": {
            "c": "Yieldmo",
            "u": "https://yieldmo.com"
        },
        "yoggrt.com": {
            "c": "Yoggrt",
            "u": "http://www.yoggrt.com/"
        },
        "yume.com": {
            "c": "YuMe",
            "u": "http://www.yume.com/"
        },
        "yumenetworks.com": {
            "c": "YuMe",
            "u": "http://www.yume.com/"
        },
        "zedo.com": {
            "c": "ZEDO",
            "u": "http://www.zedo.com/"
        },
        "zincx.com": {
            "c": "ZEDO",
            "u": "http://www.zedo.com/"
        },
        "metricsdirect.com": {
            "c": "Zango",
            "u": "http://www.zango.com/"
        },
        "zango.com": {
            "c": "Zango",
            "u": "http://www.zango.com/"
        },
        "zemanta.com": {
            "c": "Zemanta",
            "u": "http://www.zemanta.com/"
        },
        "zestad.com": {
            "c": "ZestAd",
            "u": "http://www.zestad.com/"
        },
        "insightgrit.com": {
            "c": "Zeta Email Solutions",
            "u": "http://www.zetaemailsolutions.com/"
        },
        "zetaemailsolutions.com": {
            "c": "Zeta Email Solutions",
            "u": "http://www.zetaemailsolutions.com/"
        },
        "zumobi.com": {
            "c": "Zumobi",
            "u": "http://www.zumobi.com/"
        },
        "zypmedia.com": {
            "c": "ZypMedia",
            "u": "http://www.zypmedia.com/"
        },
        "ru4.com": {
            "c": "[x+1]",
            "u": "http://www.xplusone.com/"
        },
        "xplusone.com": {
            "c": "[x+1]",
            "u": "http://www.xplusone.com/"
        },
        "adpepper.com": {
            "c": "ad pepper media",
            "u": "http://www.adpepper.us/"
        },
        "adpepper.us": {
            "c": "ad pepper media",
            "u": "http://www.adpepper.us/"
        },
        "ad6media.fr": {
            "c": "ad6media",
            "u": "http://www.ad6media.fr/"
        },
        "adbrite.com": {
            "c": "adBrite",
            "u": "http://www.adbrite.com/"
        },
        "adprs.net": {
            "c": "adPrecision",
            "u": "http://adprecision.net/"
        },
        "aprecision.net": {
            "c": "adPrecision",
            "u": "http://adprecision.net/"
        },
        "addgloo.com": {
            "c": "addGloo",
            "u": "http://www.addgloo.com/"
        },
        "adhood.com": {
            "c": "adhood",
            "u": "http://www.adhood.com/"
        },
        "adnologies.com": {
            "c": "adnologies",
            "u": "http://www.adnologies.com/"
        },
        "heias.com": {
            "c": "adnologies",
            "u": "http://www.adnologies.com/"
        },
        "adrolays.com": {
            "c": "adrolays",
            "u": "http://adrolays.com/"
        },
        "adrolays.de": {
            "c": "adrolays",
            "u": "http://adrolays.com/"
        },
        "adscale.de": {
            "c": "adscale",
            "u": "http://www.adscale.de/"
        },
        "adyard.de": {
            "c": "adyard",
            "u": "http://adyard.de/"
        },
        "adzly.com": {
            "c": "adzly",
            "u": "http://www.adzly.com/"
        },
        "affili.net": {
            "c": "affilinet",
            "u": "http://www.affili.net/"
        },
        "affilinet-inside.de": {
            "c": "affilinet",
            "u": "http://www.affili.net/"
        },
        "banner-rotation.com": {
            "c": "affilinet",
            "u": "http://www.affili.net/"
        },
        "successfultogether.co.uk": {
            "c": "affilinet",
            "u": "http://www.affili.net/"
        },
        "appssavvy.com": {
            "c": "appssavvy",
            "u": "http://appssavvy.com/"
        },
        "beencounter.com": {
            "c": "beencounter",
            "u": "http://www.beencounter.com/"
        },
        "adbutler.de": {
            "c": "belboon",
            "u": "http://www.belboon.com/"
        },
        "belboon.com": {
            "c": "belboon",
            "u": "http://www.belboon.com/"
        },
        "bigmir.net": {
            "c": "bigmir)net",
            "u": "http://www.bigmir.net/"
        },
        "cxense.com": {
            "c": "cXense",
            "u": "http://www.cxense.com/"
        },
        "adxpose.com": {
            "c": "comScore",
            "u": "http://www.comscore.com/"
        },
        "dianomi.com": {
            "c": "dianomi",
            "u": "http://www.dianomi.com/"
        },
        "ebay.com": {
            "c": "eBay",
            "u": "http://www.ebay.com/"
        },
        "gopjn.com": {
            "c": "eBay",
            "u": "http://www.ebay.com/"
        },
        "etrigue.com": {
            "c": "eTrigue",
            "u": "http://www.etrigue.com/"
        },
        "ewaydirect.com": {
            "c": "eWayDirect",
            "u": "http://www.ewaydirect.com/"
        },
        "ixs1.net": {
            "c": "eWayDirect",
            "u": "http://www.ewaydirect.com/"
        },
        "exelate.com": {
            "c": "eXelate",
            "u": "http://exelate.com/"
        },
        "exelator.com": {
            "c": "eXelate",
            "u": "http://exelate.com/"
        },
        "e-kolay.net": {
            "c": "ekolay",
            "u": "http://www.ekolay.net/"
        },
        "ekolay.net": {
            "c": "ekolay",
            "u": "http://www.ekolay.net/"
        },
        "bnmla.com": {
            "c": "engage:BDR",
            "u": "http://engagebdr.com/"
        },
        "engagebdr.com": {
            "c": "engage:BDR",
            "u": "http://engagebdr.com/"
        },
        "777seo.com": {
            "c": "ewebse",
            "u": "http://ewebse.com/"
        },
        "ewebse.com": {
            "c": "ewebse",
            "u": "http://ewebse.com/"
        },
        "excitad.com": {
            "c": "excitad",
            "u": "http://excitad.com/"
        },
        "expo-max.com": {
            "c": "expo-MAX",
            "u": "http://expo-max.com/"
        },
        "eyereturn.com": {
            "c": "eyeReturn Marketing",
            "u": "http://www.eyereturnmarketing.com/"
        },
        "eyereturnmarketing.com": {
            "c": "eyeReturn Marketing",
            "u": "http://www.eyereturnmarketing.com/"
        },
        "faithadnet.com": {
            "c": "faithadnet",
            "u": "http://www.faithadnet.com/"
        },
        "600z.com": {
            "c": "iEntry",
            "u": "http://www.ientry.com/"
        },
        "ientry.com": {
            "c": "iEntry",
            "u": "http://www.ientry.com/"
        },
        "centraliprom.com": {
            "c": "iPROM",
            "u": "http://www.iprom.si/"
        },
        "iprom.net": {
            "c": "iPROM",
            "u": "http://www.iprom.si/"
        },
        "iprom.si": {
            "c": "iPROM",
            "u": "http://www.iprom.si/"
        },
        "mediaiprom.com": {
            "c": "iPROM",
            "u": "http://www.iprom.si/"
        },
        "ipromote.com": {
            "c": "iPromote",
            "u": "http://www.ipromote.com/"
        },
        "iprospect.com": {
            "c": "iProspect",
            "u": "http://www.iprospect.com/"
        },
        "clickmanage.com": {
            "c": "iProspect",
            "u": "http://www.iprospect.com/"
        },
        "inner-active.com": {
            "c": "inneractive",
            "u": "http://inner-active.com/"
        },
        "adsbyisocket.com": {
            "c": "isocket",
            "u": "https://www.isocket.com/"
        },
        "isocket.com": {
            "c": "isocket",
            "u": "https://www.isocket.com/"
        },
        "m6d.com": {
            "c": "m6d",
            "u": "http://m6d.com/"
        },
        "media6degrees.com": {
            "c": "m6d",
            "u": "http://m6d.com/"
        },
        "madvertise.com": {
            "c": "madvertise",
            "u": "http://madvertise.com/"
        },
        "mashero.com": {
            "c": "mashero",
            "u": "http://www.mashero.com/"
        },
        "media.net": {
            "c": "media.net",
            "u": "http://www.media.net/"
        },
        "mediaforge.com": {
            "c": "mediaFORGE",
            "u": "http://www.mediaforge.com/"
        },
        "mythings.com": {
            "c": "myThings",
            "u": "http://www.mythings.com/"
        },
        "mythingsmedia.com": {
            "c": "myThings",
            "u": "http://www.mythings.com/"
        },
        "newtention.de": {
            "c": "newtention",
            "u": "http://newtention.de/"
        },
        "newtention.net": {
            "c": "newtention",
            "u": "http://newtention.de/"
        },
        "newtentionassets.net": {
            "c": "newtention",
            "u": "http://newtention.de/"
        },
        "nrelate.com": {
            "c": "nrelate",
            "u": "http://nrelate.com/"
        },
        "nugg.ad": {
            "c": "nugg.ad",
            "u": "http://www.nugg.ad/"
        },
        "nuggad.net": {
            "c": "nugg.ad",
            "u": "http://www.nugg.ad/"
        },
        "onad.eu": {
            "c": "onAd",
            "u": "http://www.onad.eu/"
        },
        "plista.com": {
            "c": "plista",
            "u": "http://www.plista.com/"
        },
        "quadrantone.com": {
            "c": "quadrantOne",
            "u": "http://www.quadrantone.com/"
        },
        "sociomantic.com": {
            "c": "sociomantic labs",
            "u": "http://www.sociomantic.com/"
        },
        "sophus3.co.uk": {
            "c": "sophus3",
            "u": "http://www.sophus3.com/"
        },
        "sophus3.com": {
            "c": "sophus3",
            "u": "http://www.sophus3.com/"
        },
        "twyn.com": {
            "c": "Twyn Group",
            "u": "http://www.twyn.com/"
        },
        "twyn-group.com": {
            "c": "Twyn Group",
            "u": "http://www.twyn.com/"
        },
        "ucoz.ae": {
            "c": "uCoz",
            "u": "http://www.ucoz.com/"
        },
        "ucoz.br": {
            "c": "uCoz",
            "u": "http://www.ucoz.com/"
        },
        "ucoz.com": {
            "c": "uCoz",
            "u": "http://www.ucoz.com/"
        },
        "ucoz.du": {
            "c": "uCoz",
            "u": "http://www.ucoz.com/"
        },
        "ucoz.fr": {
            "c": "uCoz",
            "u": "http://www.ucoz.com/"
        },
        "ucoz.net": {
            "c": "uCoz",
            "u": "http://www.ucoz.com/"
        },
        "ucoz.ru": {
            "c": "uCoz",
            "u": "http://www.ucoz.com/"
        },
        "up-value.de": {
            "c": "up-value",
            "u": "http://www.up-value.de/"
        },
        "xad.com": {
            "c": "xAd",
            "u": "http://www.xad.com/"
        },
        "xplosion.de": {
            "c": "xplosion interactive",
            "u": "http://www.xplosion.de/"
        },
        "youknowbest.com": {
            "c": "youknowbest",
            "u": "http://www.youknowbest.com/"
        },
        "buy.at": {
            "c": "zanox",
            "u": "http://www.zanox.com/"
        },
        "zanox-affiliate.de": {
            "c": "zanox",
            "u": "http://www.zanox.com/"
        },
        "zanox.com": {
            "c": "zanox",
            "u": "http://www.zanox.com/"
        },
        "zaparena.com": {
            "c": "zapunited",
            "u": "http://www.zapunited.com/"
        },
        "zapunited.com": {
            "c": "zapunited",
            "u": "http://www.zapunited.com/"
        },
        "2mdn.net": {
            "c": "Google",
            "u": "http://www.google.com/"
        },
        "admeld.com": {
            "c": "Google",
            "u": "http://www.google.com/"
        },
        "admob.com": {
            "c": "Google",
            "u": "http://www.google.com/"
        },
        "cc-dt.com": {
            "c": "Google",
            "u": "http://www.google.com/"
        },
        "destinationurl.com": {
            "c": "Google",
            "u": "http://www.google.com/"
        },
        "doubleclick.net": {
            "c": "Google",
            "u": "http://www.google.com/"
        },
        "adwords.google.com": {
            "c": "Google",
            "u": "http://www.google.com/"
        },
        "googleadservices.com": {
            "c": "Google",
            "u": "http://www.google.com/"
        },
        "googlesyndication.com": {
            "c": "Google",
            "u": "http://www.google.com/"
        },
        "googletagservices.com": {
            "c": "Google",
            "u": "http://www.google.com/"
        },
        "invitemedia.com": {
            "c": "Google",
            "u": "http://www.google.com/"
        },
        "smtad.net": {
            "c": "Google",
            "u": "http://www.google.com/"
        },
        "teracent.com": {
            "c": "Google",
            "u": "http://www.google.com/"
        },
        "teracent.net": {
            "c": "Google",
            "u": "http://www.google.com/"
        },
        "ytsa.net": {
            "c": "Google",
            "u": "http://www.google.com/"
        }
    },
    "Analytics": {
        "63squares.com": {
            "c": "63 Squares",
            "u": "http://63squares.com/"
        },
        "i-stats.com": {
            "c": "63 Squares",
            "u": "http://63squares.com/"
        },
        "atinternet.com": {
            "c": "AT Internet",
            "u": "http://www.atinternet.com/"
        },
        "xiti.com": {
            "c": "AT Internet",
            "u": "http://www.atinternet.com/"
        },
        "acxiom.com": {
            "c": "Acxiom",
            "u": "http://www.acxiom.com/"
        },
        "mm7.net": {
            "c": "Acxiom",
            "u": "http://www.acxiom.com/"
        },
        "acxiomapac.com": {
            "c": "Acxiom",
            "u": "http://www.acxiom.com/"
        },
        "3dstats.com": {
            "c": "AddFreeStats",
            "u": "http://www.addfreestats.com/"
        },
        "addfreestats.com": {
            "c": "AddFreeStats",
            "u": "http://www.addfreestats.com/"
        },
        "adlooxtracking.com": {
            "c": "Adloox",
            "u": "http://www.adloox.com/"
        },
        "adloox.com": {
            "c": "Adloox",
            "u": "http://www.adloox.com/"
        },
        "adobedtm.com": {
            "c": "Adobe",
            "u": "http://www.adobe.com/"
        },
        "adventori.com": {
            "c": "Adventori",
            "u": "https://adventori.com"
        },
        "amadesa.com": {
            "c": "Amadesa",
            "u": "http://www.amadesa.com/"
        },
        "amazingcounters.com": {
            "c": "Amazing Counters",
            "u": "http://amazingcounters.com/"
        },
        "alexametrics.com": {
            "c": "Amazon",
            "u": "http://www.amazon.com/"
        },
        "attracta.com": {
            "c": "Attracta",
            "u": "https://www.attracta.com/"
        },
        "polldaddy.com": {
            "c": "Automattic",
            "u": "http://automattic.com/"
        },
        "awio.com": {
            "c": "Awio",
            "u": "http://www.awio.com/"
        },
        "w3counter.com": {
            "c": "Awio",
            "u": "http://www.awio.com/"
        },
        "w3roi.com": {
            "c": "Awio",
            "u": "http://www.awio.com/"
        },
        "belstat.be": {
            "c": "Belstat",
            "u": "http://www.belstat.com/"
        },
        "belstat.com": {
            "c": "Belstat",
            "u": "http://www.belstat.com/"
        },
        "belstat.de": {
            "c": "Belstat",
            "u": "http://www.belstat.com/"
        },
        "belstat.fr": {
            "c": "Belstat",
            "u": "http://www.belstat.com/"
        },
        "belstat.nl": {
            "c": "Belstat",
            "u": "http://www.belstat.com/"
        },
        "blogcounter.de": {
            "c": "BlogCounter.com",
            "u": "http://www.blogcounter.de/"
        },
        "bluemetrix.com": {
            "c": "Bluemetrix",
            "u": "http://www.bluemetrix.com/"
        },
        "bmmetrix.com": {
            "c": "Bluemetrix",
            "u": "http://www.bluemetrix.com/"
        },
        "branica.com": {
            "c": "Branica",
            "u": "http://www.branica.com/"
        },
        "brightedge.com": {
            "c": "BrightEdge",
            "u": "http://www.brightedge.com/"
        },
        "bubblestat.com": {
            "c": "Bubblestat",
            "u": "http://www.bubblestat.com/"
        },
        "attributionmodel.com": {
            "c": "C3 Metrics",
            "u": "http://c3metrics.com/"
        },
        "c3metrics.com": {
            "c": "C3 Metrics",
            "u": "http://c3metrics.com/"
        },
        "c3tag.com": {
            "c": "C3 Metrics",
            "u": "http://c3metrics.com/"
        },
        "cnzz.com": {
            "c": "CNZZ",
            "u": "http://www.cnzz.com/"
        },
        "chartbeat.com": {
            "c": "Chartbeat",
            "u": "http://chartbeat.com/"
        },
        "chartbeat.net": {
            "c": "Chartbeat",
            "u": "http://chartbeat.com/"
        },
        "clicktale.com": {
            "c": "ClickTale",
            "u": "http://www.clicktale.com/"
        },
        "clicktale.net": {
            "c": "ClickTale",
            "u": "http://www.clicktale.com/"
        },
        "pantherssl.com": {
            "c": "ClickTale",
            "u": "http://www.clicktale.com/"
        },
        "clickdensity.com": {
            "c": "Clickdensity",
            "u": "http://www.clickdensity.com/"
        },
        "clixmetrix.com": {
            "c": "ClixMetrix",
            "u": "http://www.clixmetrix.com/"
        },
        "clixpy.com": {
            "c": "Clixpy",
            "u": "http://clixpy.com/"
        },
        "clustrmaps.com": {
            "c": "ClustrMaps",
            "u": "http://www.clustrmaps.com/"
        },
        "axf8.net": {
            "c": "Compuware",
            "u": "http://www.compuware.com/"
        },
        "compuware.com": {
            "c": "Compuware",
            "u": "http://www.compuware.com/"
        },
        "gomez.com": {
            "c": "Compuware",
            "u": "http://www.compuware.com/"
        },
        "connexity.com": {
            "c": "Connexity",
            "u": "http://www.connexity.com/"
        },
        "connexity.net": {
            "c": "Connexity",
            "u": "http://www.connexity.com/"
        },
        "zmedia.com": {
            "c": "Conversant Media",
            "u": "http://www.conversantmedia.com/"
        },
        "conversantmedia.com": {
            "c": "Conversant Media",
            "u": "http://www.conversantmedia.com/"
        },
        "convert.com": {
            "c": "Convert Insights",
            "u": "http://www.convert.com/"
        },
        "reedge.com": {
            "c": "Convert Insights",
            "u": "http://www.convert.com/"
        },
        "convertro.com": {
            "c": "Convertro",
            "u": "http://www.convertro.com/"
        },
        "cetrk.com": {
            "c": "Crazy Egg",
            "u": "http://www.crazyegg.com/"
        },
        "crazyegg.com": {
            "c": "Crazy Egg",
            "u": "http://www.crazyegg.com/"
        },
        "crowdscience.com": {
            "c": "Crowd Science",
            "u": "http://crowdscience.com/"
        },
        "cya2.net": {
            "c": "Cya2",
            "u": "http://cya2.net/"
        },
        "collserve.com": {
            "c": "Dataium",
            "u": "http://www.dataium.com/"
        },
        "dataium.com": {
            "c": "Dataium",
            "u": "http://www.dataium.com/"
        },
        "deepintent.com": {
            "c": "Deep Intent",
            "u": "https://www.deepintent.com/"
        },
        "demandbase.com": {
            "c": "Demandbase",
            "u": "http://www.demandbase.com/"
        },
        "ipcounter.de": {
            "c": "DirectCORP",
            "u": "http://www.directcorp.de/"
        },
        "trackersimulator.org": {
            "c": "EFF",
            "u": "https://www.eff.org/"
        },
        "eviltracker.net": {
            "c": "EFF",
            "u": "https://www.eff.org/"
        },
        "do-not-tracker.org": {
            "c": "EFF",
            "u": "https://www.eff.org/"
        },
        "eloqua.com": {
            "c": "Eloqua",
            "u": "http://www.eloqua.com/"
        },
        "encoremetrics.com": {
            "c": "Encore",
            "u": "http://www.encoremetrics.com/"
        },
        "sitecompass.com": {
            "c": "Encore",
            "u": "http://www.encoremetrics.com/"
        },
        "eulerian.com": {
            "c": "Eulerian Technologies",
            "u": "http://www.eulerian.com/"
        },
        "eulerian.net": {
            "c": "Eulerian Technologies",
            "u": "http://www.eulerian.com/"
        },
        "feedjit.com": {
            "c": "Feedjit",
            "u": "http://feedjit.com/"
        },
        "footprintlive.com": {
            "c": "Footprint",
            "u": "http://www.footprintlive.com/"
        },
        "freeonlineusers.com": {
            "c": "Free Online Users",
            "u": "http://www.freeonlineusers.com/"
        },
        "free-pagerank.com": {
            "c": "Free-PageRank.com",
            "u": "http://www.free-pagerank.com/"
        },
        "fullstory.com": {
            "c": "Fullstory",
            "u": "https://www.fullstory.com/"
        },
        "gtop.ro": {
            "c": "GTop",
            "u": "http://www.gtop.ro/"
        },
        "gtopstats.com": {
            "c": "GTop",
            "u": "http://www.gtop.ro/"
        },
        "getsitecontrol.com": {
            "c": "GetSiteControl",
            "u": "https://getsitecontrol.com/"
        },
        "daphnecm.com": {
            "c": "GfK Group",
            "u": "http://www.gfk.com/"
        },
        "gfk.com": {
            "c": "GfK Group",
            "u": "http://www.gfk.com/"
        },
        "gfkdaphne.com": {
            "c": "GfK Group",
            "u": "http://www.gfk.com/"
        },
        "gaug.es": {
            "c": "GitHub",
            "u": "https://github.com/"
        },
        "godaddy.com": {
            "c": "Go Daddy",
            "u": "http://www.godaddy.com/"
        },
        "trafficfacts.com": {
            "c": "Go Daddy",
            "u": "http://www.godaddy.com/"
        },
        "gosquared.com": {
            "c": "GoSquared",
            "u": "https://www.gosquared.com/"
        },
        "gostats.com": {
            "c": "GoStats",
            "u": "http://gostats.com/"
        },
        "raasnet.com": {
            "c": "Hearst",
            "u": "http://www.hearst.com/"
        },
        "redaril.com": {
            "c": "Hearst",
            "u": "http://www.hearst.com/"
        },
        "histats.com": {
            "c": "Histats",
            "u": "http://www.histats.com/"
        },
        "hitsniffer.com": {
            "c": "Hit Sniffer",
            "u": "http://www.hitsniffer.com/"
        },
        "hitslink.com": {
            "c": "HitsLink",
            "u": "http://www.hitslink.com/"
        },
        "hotjar.com": {
            "c": "Hotjar",
            "u": "https://www.hotjar.com"
        },
        "hs-analytics.net": {
            "c": "HubSpot",
            "u": "http://www.hubspot.com/"
        },
        "cmcore.com": {
            "c": "IBM",
            "u": "http://www.ibm.com/"
        },
        "coremetrics.com": {
            "c": "IBM",
            "u": "http://www.ibm.com/"
        },
        "ibm.com": {
            "c": "IBM",
            "u": "http://www.ibm.com/"
        },
        "infonline.de": {
            "c": "INFOnline",
            "u": "https://www.infonline.de/"
        },
        "ivwbox.de": {
            "c": "INFOnline",
            "u": "https://www.infonline.de/"
        },
        "ioam.de": {
            "c": "INFOnline",
            "u": "https://www.infonline.de/"
        },
        "enquisite.com": {
            "c": "InboundWriter",
            "u": "http://www.inboundwriter.com/"
        },
        "inboundwriter.com": {
            "c": "InboundWriter",
            "u": "http://www.inboundwriter.com/"
        },
        "hotlog.ru": {
            "c": "InfoStars",
            "u": "http://infostars.ru/"
        },
        "infostars.ru": {
            "c": "InfoStars",
            "u": "http://infostars.ru/"
        },
        "inspectlet.com": {
            "c": "Inspectlet",
            "u": "http://www.inspectlet.com/"
        },
        "domodomain.com": {
            "c": "IntelligenceFocus",
            "u": "http://www.intelligencefocus.com/"
        },
        "intelligencefocus.com": {
            "c": "IntelligenceFocus",
            "u": "http://www.intelligencefocus.com/"
        },
        "intercom.io": {
            "c": "Intercom",
            "u": "https://www.intercom.io/"
        },
        "kissmetrics.com": {
            "c": "KISSmetrics",
            "u": "http://kissmetrics.com/"
        },
        "keymetric.net": {
            "c": "KeyMetric",
            "u": "http://www.keymetric.net/"
        },
        "src.kitcode.net": {
            "c": "Kitcode",
            "u": "http://src.kitcode.net/"
        },
        "linezing.com": {
            "c": "LineZing",
            "u": "http://www.linezing.com/"
        },
        "liveperson.com": {
            "c": "LivePerson",
            "u": "http://www.liveperson.net/"
        },
        "nuconomy.com": {
            "c": "LivePerson",
            "u": "http://www.liveperson.net/"
        },
        "logdy.com": {
            "c": "Logdy",
            "u": "http://logdy.com/"
        },
        "crwdcntrl.net": {
            "c": "Lotame",
            "u": "http://www.lotame.com/"
        },
        "lotame.com": {
            "c": "Lotame",
            "u": "http://www.lotame.com/"
        },
        "lynchpin.com": {
            "c": "Lynchpin",
            "u": "http://www.lynchpin.com/"
        },
        "lypn.com": {
            "c": "Lynchpin",
            "u": "http://www.lynchpin.com/"
        },
        "clicktracks.com": {
            "c": "Lyris",
            "u": "http://www.lyris.com/"
        },
        "lyris.com": {
            "c": "Lyris",
            "u": "http://www.lyris.com/"
        },
        "lytiks.com": {
            "c": "Lytiks",
            "u": "http://www.lytiks.com/"
        },
        "markmonitor.com": {
            "c": "MarkMonitor",
            "u": "https://www.markmonitor.com"
        },
        "9c9media.ca": {
            "c": "MarkMonitor",
            "u": "https://www.markmonitor.com"
        },
        "marktest.com": {
            "c": "Marktest",
            "u": "http://www.marktest.com/"
        },
        "marktest.pt": {
            "c": "Marktest",
            "u": "http://www.marktest.com/"
        },
        "maxymiser.com": {
            "c": "Maxymiser",
            "u": "http://www.maxymiser.com/"
        },
        "meetrics.de": {
            "c": "Meetrics",
            "u": "http://www.meetrics.de/"
        },
        "meetrics.net": {
            "c": "Meetrics",
            "u": "http://www.meetrics.de/"
        },
        "research.de.com": {
            "c": "Meetrics",
            "u": "http://www.meetrics.de/"
        },
        "mixpanel.com": {
            "c": "Mixpanel",
            "u": "https://mixpanel.com/"
        },
        "mxpnl.com": {
            "c": "Mixpanel",
            "u": "https://mixpanel.com/"
        },
        "mongoosemetrics.com": {
            "c": "Mongoose Metrics",
            "u": "http://www.mongoosemetrics.com/"
        },
        "monitus.net": {
            "c": "Monitus",
            "u": "http://www.monitus.net/"
        },
        "mouseflow.com": {
            "c": "Mouseflow",
            "u": "http://mouseflow.com/"
        },
        "mypagerank.net": {
            "c": "MyPagerank.Net",
            "u": "http://www.mypagerank.net/"
        },
        "estat.com": {
            "c": "Médiamétrie-eStat",
            "u": "http://www.mediametrie-estat.com/"
        },
        "mediametrie-estat.com": {
            "c": "Médiamétrie-eStat",
            "u": "http://www.mediametrie-estat.com/"
        },
        "hitsprocessor.com": {
            "c": "Net Applications",
            "u": "http://www.netapplications.com/"
        },
        "netapplications.com": {
            "c": "Net Applications",
            "u": "http://www.netapplications.com/"
        },
        "newrelic.com": {
            "c": "New Relic",
            "u": "http://newrelic.com/"
        },
        "nr-data.net": {
            "c": "New Relic",
            "u": "http://newrelic.com/"
        },
        "apnewsregistry.com": {
            "c": "NewsRight",
            "u": "http://www.newsright.com/"
        },
        "nextstat.com": {
            "c": "NextSTAT",
            "u": "http://www.nextstat.com/"
        },
        "glanceguide.com": {
            "c": "Nielsen",
            "u": "http://www.nielsen.com/"
        },
        "nielsen.com": {
            "c": "Nielsen",
            "u": "http://www.nielsen.com/"
        },
        "observerapp.com": {
            "c": "Observer",
            "u": "http://observerapp.com/"
        },
        "onestat.com": {
            "c": "OneStat",
            "u": "http://www.onestat.com/"
        },
        "openstat.ru": {
            "c": "Openstat",
            "u": "https://www.openstat.ru/"
        },
        "spylog.com": {
            "c": "Openstat",
            "u": "https://www.openstat.ru/"
        },
        "opentracker.net": {
            "c": "Opentracker",
            "u": "http://www.opentracker.net/"
        },
        "persianstat.com": {
            "c": "PersianStat.com",
            "u": "http://www.persianstat.com/"
        },
        "phonalytics.com": {
            "c": "Phonalytics",
            "u": "http://www.phonalytics.com/"
        },
        "piwik.org": {
            "c": "Piwik",
            "u": "http://piwik.org/"
        },
        "pronunciator.com": {
            "c": "Pronunciator",
            "u": "http://www.pronunciator.com/"
        },
        "visitorville.com": {
            "c": "Pronunciator",
            "u": "http://www.pronunciator.com/"
        },
        "protected.media": {
            "c": "Protected Media",
            "u": "http://www.protected.media/"
        },
        "ad-score.com": {
            "c": "Protected Media",
            "u": "http://www.protected.media/"
        },
        "kissinsights.com": {
            "c": "Qualaroo",
            "u": "http://qualaroo.com/"
        },
        "qualaroo.com": {
            "c": "Qualaroo",
            "u": "http://qualaroo.com/"
        },
        "thecounter.com": {
            "c": "QuinStreet",
            "u": "http://quinstreet.com/"
        },
        "quintelligence.com": {
            "c": "Quintelligence",
            "u": "http://www.quintelligence.com/"
        },
        "radarurl.com": {
            "c": "RadarURL",
            "u": "http://radarurl.com/"
        },
        "researchnow.com": {
            "c": "Research Now",
            "u": "http://www.researchnow.com/"
        },
        "valuedopinions.co.uk": {
            "c": "Research Now",
            "u": "http://www.researchnow.com/"
        },
        "revtrax.com": {
            "c": "Revtracks",
            "u": "http://revtrax.com/"
        },
        "ringier.cz": {
            "c": "Ringier",
            "u": "http://ringier.cz/"
        },
        "getclicky.com": {
            "c": "Roxr",
            "u": "http://roxr.net/"
        },
        "roxr.net": {
            "c": "Roxr",
            "u": "http://roxr.net/"
        },
        "staticstuff.net": {
            "c": "Roxr",
            "u": "http://roxr.net/"
        },
        "statsit.com": {
            "c": "STATSIT",
            "u": "http://www.statsit.com/"
        },
        "dl-rms.com": {
            "c": "Safecount",
            "u": "http://www.safecount.net/"
        },
        "dlqm.net": {
            "c": "Safecount",
            "u": "http://www.safecount.net/"
        },
        "questionmarket.com": {
            "c": "Safecount",
            "u": "http://www.safecount.net/"
        },
        "safecount.net": {
            "c": "Safecount",
            "u": "http://www.safecount.net/"
        },
        "sageanalyst.net": {
            "c": "SageMetrics",
            "u": "http://www.sagemetrics.com/"
        },
        "sagemetrics.com": {
            "c": "SageMetrics",
            "u": "http://www.sagemetrics.com/"
        },
        "seevolution.com": {
            "c": "SeeVolution",
            "u": "https://www.seevolution.com/"
        },
        "svlu.net": {
            "c": "SeeVolution",
            "u": "https://www.seevolution.com/"
        },
        "segment.io": {
            "c": "Segment.io",
            "u": "https://segment.io/"
        },
        "sessioncam.com": {
            "c": "SessionCam",
            "u": "https://sessioncam.com/"
        },
        "shinystat.com": {
            "c": "ShinyStat",
            "u": "http://www.shinystat.com/"
        },
        "shorte.st": {
            "c": "Shortest",
            "u": "http://shorte.st/"
        },
        "smartlook.com": {
            "c": "Smartlook",
            "u": "https://www.smartlook.com/"
        },
        "snoobi.com": {
            "c": "Snoobi",
            "u": "http://www.snoobi.com/"
        },
        "go-mpulse.net": {
            "c": "Soasta",
            "u": "https://www.soasta.com"
        },
        "statcounter.com": {
            "c": "StatCounter",
            "u": "http://statcounter.com/"
        },
        "statisfy.net": {
            "c": "Statisfy",
            "u": "http://statisfy.net"
        },
        "stratigent.com": {
            "c": "Stratigent",
            "u": "http://www.stratigent.com/"
        },
        "tensquare.com": {
            "c": "TENSQUARE",
            "u": "http://www.tensquare.com/"
        },
        "sesamestats.com": {
            "c": "TNS",
            "u": "http://www.tnsglobal.com/"
        },
        "statistik-gallup.net": {
            "c": "TNS",
            "u": "http://www.tnsglobal.com/"
        },
        "tns-counter.ru": {
            "c": "TNS",
            "u": "http://www.tnsglobal.com/"
        },
        "tns-cs.net": {
            "c": "TNS",
            "u": "http://www.tnsglobal.com/"
        },
        "tnsglobal.com": {
            "c": "TNS",
            "u": "http://www.tnsglobal.com/"
        },
        "heronpartners.com.au": {
            "c": "The Heron Partnership",
            "u": "http://www.heronpartners.com.au/"
        },
        "marinsm.com": {
            "c": "The Heron Partnership",
            "u": "http://www.heronpartners.com.au/"
        },
        "roia.biz": {
            "c": "TrackingSoft",
            "u": "http://trackingsoft.com/"
        },
        "trackingsoft.com": {
            "c": "TrackingSoft",
            "u": "http://trackingsoft.com/"
        },
        "umbel.com": {
            "c": "Umbel",
            "u": "https://www.umbel.com/"
        },
        "nakanohito.jp": {
            "c": "User Local",
            "u": "http://nakanohito.jp/"
        },
        "vertster.com": {
            "c": "Vertster",
            "u": "http://www.vertster.com/"
        },
        "sa-as.com": {
            "c": "VisiStat",
            "u": "http://www.visistat.com/"
        },
        "visistat.com": {
            "c": "VisiStat",
            "u": "http://www.visistat.com/"
        },
        "visitstreamer.com": {
            "c": "Visit Streamer",
            "u": "http://www.visitstreamer.com/"
        },
        "vizisense.com": {
            "c": "ViziSense",
            "u": "http://www.vizisense.com/"
        },
        "vizisense.net": {
            "c": "ViziSense",
            "u": "http://www.vizisense.com/"
        },
        "wowanalytics.co.uk": {
            "c": "WOW Analytics",
            "u": "http://www.wowanalytics.co.uk/"
        },
        "compete.com": {
            "c": "WPP",
            "u": "http://www.wpp.com/"
        },
        "onlinewebstats.com": {
            "c": "Web Stats",
            "u": "http://www.onlinewebstats.com/"
        },
        "web-stat.com": {
            "c": "Web Tracking Services",
            "u": "http://www.webtrackingservices.com/"
        },
        "webtrackingservices.com": {
            "c": "Web Tracking Services",
            "u": "http://www.webtrackingservices.com/"
        },
        "webtraxs.com": {
            "c": "Web Traxs",
            "u": "http://www.webtraxs.com/"
        },
        "webclicktracker.com": {
            "c": "Webclicktracker",
            "u": "http://www.webclicktracker.com/"
        },
        "webtrekk.com": {
            "c": "Webtrekk",
            "u": "http://www.webtrekk.com/"
        },
        "webtrekk.net": {
            "c": "Webtrekk",
            "u": "http://www.webtrekk.com/"
        },
        "reinvigorate.net": {
            "c": "Webtrends",
            "u": "http://webtrends.com/"
        },
        "webtrends.com": {
            "c": "Webtrends",
            "u": "http://webtrends.com/"
        },
        "webtrendslive.com": {
            "c": "Webtrends",
            "u": "http://webtrends.com/"
        },
        "adzmath.com": {
            "c": "White Ops",
            "u": "https://www.whiteops.com/"
        },
        "whiteops.com": {
            "c": "White Ops",
            "u": "https://www.whiteops.com/"
        },
        "woopra-ns.com": {
            "c": "Woopra",
            "u": "http://www.woopra.com/"
        },
        "woopra.com": {
            "c": "Woopra",
            "u": "http://www.woopra.com/"
        },
        "wysistat.com": {
            "c": "Wysistat",
            "u": "http://www.wysistat.com/"
        },
        "analytics.yahoo.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "yellowtracker.com": {
            "c": "YellowTracker",
            "u": "http://www.yellowtracker.com/"
        },
        "anormal-media.de": {
            "c": "anormal-media.de",
            "u": "http://anormal-media.de/"
        },
        "anormal-tracker.de": {
            "c": "anormal-media.de",
            "u": "http://anormal-media.de/"
        },
        "certifica.com": {
            "c": "comScore",
            "u": "http://www.comscore.com/"
        },
        "comscore.com": {
            "c": "comScore",
            "u": "http://www.comscore.com/"
        },
        "scorecardresearch.com": {
            "c": "comScore",
            "u": "http://www.comscore.com/"
        },
        "sitestat.com": {
            "c": "comScore",
            "u": "http://www.comscore.com/"
        },
        "voicefive.com": {
            "c": "comScore",
            "u": "http://www.comscore.com/"
        },
        "mdotlabs.com": {
            "c": "comScore",
            "u": "http://www.comscore.com/"
        },
        "dwstat.cn": {
            "c": "dwstat.com",
            "u": "http://www.dwstat.cn/"
        },
        "eproof.com": {
            "c": "eProof.com",
            "u": "http://www.eproof.com/"
        },
        "extreme-dm.com": {
            "c": "eXTReMe digital",
            "u": "http://extremetracking.com/"
        },
        "extremetracking.com": {
            "c": "eXTReMe digital",
            "u": "http://extremetracking.com/"
        },
        "etracker.com": {
            "c": "etracker",
            "u": "http://www.etracker.com/"
        },
        "etracker.de": {
            "c": "etracker",
            "u": "http://www.etracker.com/"
        },
        "sedotracker.com": {
            "c": "etracker",
            "u": "http://www.etracker.com/"
        },
        "sedotracker.de": {
            "c": "etracker",
            "u": "http://www.etracker.com/"
        },
        "iperceptions.com": {
            "c": "iPerceptions",
            "u": "http://www.iperceptions.com/"
        },
        "motigo.com": {
            "c": "motigo",
            "u": "http://motigo.com/"
        },
        "nedstatbasic.net": {
            "c": "motigo",
            "u": "http://motigo.com/"
        },
        "nurago.com": {
            "c": "nurago",
            "u": "http://www.nurago.com/"
        },
        "nurago.de": {
            "c": "nurago",
            "u": "http://www.nurago.com/"
        },
        "sensic.net": {
            "c": "nurago",
            "u": "http://www.nurago.com/"
        },
        "phpmyvisites.us": {
            "c": "phpMyVisites",
            "u": "http://www.phpmyvisites.us/"
        },
        "4u.pl": {
            "c": "stat4u",
            "u": "http://stat.4u.pl/"
        },
        "vistrac.com": {
            "c": "vistrac",
            "u": "http://vistrac.com/"
        },
        "amung.us": {
            "c": "whos.amung.us",
            "u": "http://whos.amung.us/"
        },
        "oewa.at": {
            "c": "ÖWA",
            "u": "http://www.oewa.at/"
        },
        "oewabox.at": {
            "c": "ÖWA",
            "u": "http://www.oewa.at/"
        },
        "google-analytics.com": {
            "c": "Google",
            "u": "http://www.google.com/"
        },
        "postrank.com": {
            "c": "Google",
            "u": "http://www.google.com/"
        }
    },
    "Social": {
        "facebook.com": {
            "c": "Facebook",
            "u": "http://www.facebook.com/"
        },
        "facebook.de": {
            "c": "Facebook",
            "u": "http://www.facebook.com/"
        },
        "facebook.fr": {
            "c": "Facebook",
            "u": "http://www.facebook.com/"
        },
        "facebook.net": {
            "c": "Facebook",
            "u": "http://www.facebook.com/"
        },
        "fb.com": {
            "c": "Facebook",
            "u": "http://www.facebook.com/"
        },
        "atlassolutions.com": {
            "c": "Facebook",
            "u": "http://www.facebook.com/"
        },
        "friendfeed.com": {
            "c": "Facebook",
            "u": "http://www.facebook.com/"
        },
        "developers.google.com": {
            "c": "Google",
            "u": "http://www.google.com/"
        },
        "gmail.com": {
            "c": "Google",
            "u": "http://www.google.com/"
        },
        "mail.google.com": {
            "c": "Google",
            "u": "http://www.google.com/"
        },
        "inbox.google.com": {
            "c": "Google",
            "u": "http://www.google.com/"
        },
        "plus.google.com": {
            "c": "Google",
            "u": "http://www.google.com/"
        },
        "plusone.google.com": {
            "c": "Google",
            "u": "http://www.google.com/"
        },
        "voice.google.com": {
            "c": "Google",
            "u": "http://www.google.com/"
        },
        "wave.google.com": {
            "c": "Google",
            "u": "http://www.google.com/"
        },
        "googlemail.com": {
            "c": "Google",
            "u": "http://www.google.com/"
        },
        "orkut.com": {
            "c": "Google",
            "u": "http://www.google.com/"
        },
        "backtype.com": {
            "c": "Twitter",
            "u": "https://twitter.com/"
        },
        "crashlytics.com": {
            "c": "Twitter",
            "u": "https://twitter.com/"
        },
        "tweetdeck.com": {
            "c": "Twitter",
            "u": "https://twitter.com/"
        },
        "twimg.com": {
            "c": "Twitter",
            "u": "https://twitter.com/"
        },
        "twitter.com": {
            "c": "Twitter",
            "u": "https://twitter.com/"
        },
        "twitter.jp": {
            "c": "Twitter",
            "u": "https://twitter.com/"
        },
        "addthis.com": {
            "c": "AddThis",
            "u": "http://www.addthis.com/"
        },
        "addthiscdn.com": {
            "c": "AddThis",
            "u": "http://www.addthis.com/"
        },
        "addthisedge.com": {
            "c": "AddThis",
            "u": "http://www.addthis.com/"
        },
        "clearspring.com": {
            "c": "AddThis",
            "u": "http://www.addthis.com/"
        },
        "connectedads.net": {
            "c": "AddThis",
            "u": "http://www.addthis.com/"
        },
        "xgraph.com": {
            "c": "AddThis",
            "u": "http://www.addthis.com/"
        },
        "xgraph.net": {
            "c": "AddThis",
            "u": "http://www.addthis.com/"
        },
        "causes.com": {
            "c": "Causes",
            "u": "http://www.causes.com/"
        },
        "digg.com": {
            "c": "Digg",
            "u": "http://digg.com/"
        },
        "licdn.com": {
            "c": "LinkedIn",
            "u": "http://www.linkedin.com/"
        },
        "linkedin.com": {
            "c": "LinkedIn",
            "u": "http://www.linkedin.com/"
        },
        "addtoany.com": {
            "c": "Lockerz",
            "u": "http://lockerz.com/"
        },
        "lockerz.com": {
            "c": "Lockerz",
            "u": "http://lockerz.com/"
        },
        "list.ru": {
            "c": "Mail.Ru",
            "u": "http://mail.ru/"
        },
        "mail.ru": {
            "c": "Mail.Ru",
            "u": "http://mail.ru/"
        },
        "meebo.com": {
            "c": "Meebo",
            "u": "https://www.meebo.com/"
        },
        "meebocdn.net": {
            "c": "Meebo",
            "u": "https://www.meebo.com/"
        },
        "papayamobile.com": {
            "c": "Papaya",
            "u": "http://papayamobile.com/"
        },
        "sharethis.com": {
            "c": "ShareThis",
            "u": "http://sharethis.com/"
        },
        "buzzster.com": {
            "c": "Shareaholic",
            "u": "http://www.shareaholic.com/"
        },
        "shareaholic.com": {
            "c": "Shareaholic",
            "u": "http://www.shareaholic.com/"
        },
        "stumble-upon.com": {
            "c": "StumbleUpon",
            "u": "http://www.stumbleupon.com/"
        },
        "stumbleupon.com": {
            "c": "StumbleUpon",
            "u": "http://www.stumbleupon.com/"
        },
        "userapi.com": {
            "c": "VKontakte",
            "u": "http://vk.com/"
        },
        "vk.com": {
            "c": "VKontakte",
            "u": "http://vk.com/"
        },
        "vkontakte.ru": {
            "c": "VKontakte",
            "u": "http://vk.com/"
        },
        "mybloglog.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "rocketmail.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "address.yahoo.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "alerts.yahoo.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "avatars.yahoo.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "buzz.yahoo.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "calendar.yahoo.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "edit.yahoo.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "legalredirect.yahoo.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "login.yahoo.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "mail.yahoo.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "my.yahoo.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "notepad.yahoo.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "pulse.yahoo.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "webmessenger.yahoo.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "ymail.com": {
            "c": "Yahoo!",
            "u": "http://www.yahoo.com/"
        },
        "reddit.com": {
            "c": "reddit",
            "u": "http://www.reddit.com/"
        }
    },
    "Disconnect": {
        "googletagmanager.com": {
            "c": "Google",
            "u": "http://www.google.com/"
        }
    }
}
},{}],11:[function(require,module,exports){
'use strict';

var Parent = window.DDG.base.Model;

function Autocomplete(attrs) {
    Parent.call(this, attrs);
}

Autocomplete.prototype = $.extend({}, Parent.prototype, {

    modelName: 'autocomplete',

    fetchSuggestions: function fetchSuggestions(searchText) {
        var _this = this;

        return new Promise(function (resolve, reject) {
            // TODO: ajax call here to ddg autocomplete service
            // for now we'll just mock up an async xhr query result:
            _this.suggestions = [searchText + ' world', searchText + ' united', searchText + ' famfam'];
            resolve();
        });
    }
});

module.exports = Autocomplete;

},{}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
'use strict';

var Parent = window.DDG.base.Model;

function HamburgerMenu(attrs) {
    attrs = attrs || {};
    attrs.tabUrl = '';
    Parent.call(this, attrs);
}

HamburgerMenu.prototype = $.extend({}, Parent.prototype, {
    modelName: 'hamburgerMenu'

});

module.exports = HamburgerMenu;

},{}],14:[function(require,module,exports){
"use strict";

var Parent = window.DDG.base.Model;

function Search(attrs) {

    Parent.call(this, attrs);
};

Search.prototype = $.extend({}, Parent.prototype, {

    modelName: 'search',

    doSearch: function doSearch(s) {
        this.searchText = s;
        s = encodeURIComponent(s);

        console.log("doSearch() for " + s);

        chrome.tabs.create({
            url: "https://duckduckgo.com/?q=" + s + "&bext=" + localStorage['os'] + "cr"
        });
    }

});

module.exports = Search;

},{}],15:[function(require,module,exports){
'use strict';

var DOMAIN_MAPPINGS = require('./../../../data/tracker_lists/trackersWithParentCompany.json').TopTrackerDomains;
var Parent = window.DDG.base.Model;

function SiteCompanyList(attrs) {
    attrs = attrs || {};
    attrs.tab = null;
    attrs.companyListMap = [];
    attrs.DOMAIN_MAPPINGS = DOMAIN_MAPPINGS;
    Parent.call(this, attrs);
}

SiteCompanyList.prototype = $.extend({}, Parent.prototype, {

    modelName: 'siteCompanyList',

    fetchAsyncData: function fetchAsyncData() {
        var _this = this;

        return new Promise(function (resolve, reject) {
            _this.fetch({ getCurrentTab: true }).then(function (tab) {
                if (tab) {
                    _this.fetch({ getTab: tab.id }).then(function (bkgTab) {
                        _this.tab = bkgTab;
                        _this._updateCompaniesList();
                        resolve();
                    });
                } else {
                    console.debug('SiteDetails model: no tab');
                    resolve();
                }
            });
        });
    },

    _updateCompaniesList: function _updateCompaniesList() {
        var _this2 = this;

        // list of all trackers on page (whether we blocked them or not)
        this.trackers = this.tab.trackers || {};
        var companyNames = Object.keys(this.trackers);

        // find largest number of trackers (by company)
        var maxCount = 0;
        if (this.trackers && companyNames.length > 0) {
            companyNames.map(function (name) {
                // don't sort "unknown" trackers since they will
                // be listed individually at bottom of graph,
                // we don't want "unknown" tracker total as maxCount
                if (name !== 'unknown') {
                    var compare = _this2.trackers[name].count;
                    if (compare > maxCount) maxCount = compare;
                }
            });
        }

        // set trackerlist metadata for list display by company:
        this.companyListMap = companyNames.map(function (companyName) {
            var company = _this2.trackers[companyName];
            // calc max using pixels instead of % to make margins easier
            // max width: 300 - (horizontal padding in css) = 260
            return {
                name: companyName,
                // hack to bump 'unknown' trackers to bottom of list
                count: companyName === 'unknown' ? -1 : company.count,
                px: Math.floor(company.count * 260 / maxCount),
                urls: company.urls
            };
        }).sort(function (a, b) {
            return b.count - a.count;
        });
    }
});

module.exports = SiteCompanyList;

},{"./../../../data/tracker_lists/trackersWithParentCompany.json":10}],16:[function(require,module,exports){
'use strict';

var Parent = window.DDG.base.Model;

var httpsStates = {
    'secure': 'Secure',
    'upgraded': 'Secure', // was 'Upgraded'
    'none': 'Insecure'
};

function Site(attrs) {
    attrs = attrs || {};
    attrs.disabled = true; // disabled by default
    attrs.tab = null;
    attrs.domain = '-';
    attrs.isWhitelisted = false;
    attrs.isCalculatingSiteRating = true;
    attrs.siteRating = {};
    attrs.httpsState = 'none';
    attrs.httpsStatusText = '';
    attrs.isUserPrivacyUpgraded = false;
    attrs.trackerCount = 0;
    attrs.trackerNetworks;
    attrs.tosdr = {};
    Parent.call(this, attrs);

    this.bindEvents([[this.store.subscribe, 'action:backgroundMessage', this.handleBackgroundMsg]]);
}

Site.prototype = $.extend({}, Parent.prototype, {

    modelName: 'site',

    getBackgroundTabData: function getBackgroundTabData() {
        var _this = this;

        // console.log('[site view] getBackgroundTabData()')
        return new Promise(function (resolve, reject) {
            _this.fetch({ getCurrentTab: true }).then(function (tab) {
                if (tab) {
                    _this.fetch({ getTab: tab.id }).then(function (backgroundTabObj) {
                        if (backgroundTabObj) {
                            _this.set('tab', backgroundTabObj);
                            _this.domain = backgroundTabObj.site.domain;
                            _this.fetchSiteRating();
                            _this.tosdr = backgroundTabObj.site.score.tosdr;
                        }
                        _this.setSiteProperties();
                        _this.setHttpsMessage();
                        _this.update();
                        resolve();
                    });
                } else {
                    console.debug('Site model: no tab');
                    resolve();
                }
            });
        });
    },

    fetchSiteRating: function fetchSiteRating() {
        var _this2 = this;

        // console.log('[model] fetchSiteRating()')
        if (this.tab) {
            this.fetch({ getSiteScore: this.tab.id }).then(function (rating) {
                console.log('fetchSiteRating: ', rating);
                if (rating) _this2.update({ siteRating: rating });
            });
        }
    },

    setSiteProperties: function setSiteProperties() {
        if (!this.tab) {
            this.domain = 'new tab'; // tab can be null for firefox new tabs
            this.set({ isCalculatingSiteRating: false });
        } else {
            this.isWhitelisted = this.tab.site.whitelisted;
            if (this.tab.site.isSpecialDomain) {
                this.domain = this.tab.site.isSpecialDomain; // eg "extensions", "options", "new tab"
                this.set({ isCalculatingSiteRating: false });
            } else {
                this.set({ 'disabled': false });
            }
        }

        if (this.domain && this.domain === '-') this.set('disabled', true);
    },

    setHttpsMessage: function setHttpsMessage() {
        if (!this.tab) return;

        if (this.tab.upgradedHttps) {
            this.httpsState = 'upgraded';
        } else if (/^https/.exec(this.tab.url)) {
            this.httpsState = 'secure';
        } else {
            this.httpsState = 'none';
        }

        this.httpsStatusText = httpsStates[this.httpsState];
    },

    handleBackgroundMsg: function handleBackgroundMsg(message) {
        var _this3 = this;

        // console.log('[model] handleBackgroundMsg()')
        if (!this.tab) return;
        if (message.action && message.action === 'updateTabData') {
            this.fetch({ getTab: this.tab.id }).then(function (backgroundTabObj) {
                _this3.tab = backgroundTabObj;
                _this3.update();
                _this3.fetchSiteRating();
            });
        }
    },

    // calls `this.set()` to trigger view re-rendering
    update: function update(ops) {
        // console.log('[model] update()')
        if (this.tab) {

            // got siteRating back fr/ background process,
            // 'after' rating changed, template needs re-render
            if (ops && ops.siteRating && ops.siteRating.after !== this.siteRating.after) {
                this.set({
                    'siteRating': ops.siteRating,
                    'isCalculatingSiteRating': false
                });

                // got site rating from background process,
                // but no change in 'after' rating
            } else if (ops && ops.siteRating) {
                if (this.isCalculatingSiteRating) {
                    this.set('isCalculatingSiteRating', false);
                }
            }

            var newTrackersCount = this.getUniqueTrackersCount();
            if (newTrackersCount !== this.trackersCount) {
                this.set('trackersCount', newTrackersCount);
            }

            var newTrackersBlockedCount = this.getUniqueTrackersBlockedCount();
            if (newTrackersBlockedCount !== this.trackersBlockedCount) {
                this.set('trackersBlockedCount', newTrackersBlockedCount);
            }

            var newTrackerNetworks = this.getTrackerNetworksOnPage();
            if (!this.trackerNetworks || newTrackerNetworks.length !== this.trackerNetworks.length) {
                this.set('trackerNetworks', newTrackerNetworks);
            }

            var newUserPrivacy = this.getIsUserPrivacyUpgraded();
            if (newUserPrivacy !== this.isUserPrivacyUpgraded) {
                this.set('isUserPrivacyUpgraded', newUserPrivacy);
            }
        }
    },

    getUniqueTrackersCount: function getUniqueTrackersCount() {
        var _this4 = this;

        // console.log('[model] getUniqueTrackersCount()')
        return Object.keys(this.tab.trackers).reduce(function (total, name) {
            return _this4.tab.trackers[name].urls.length + total;
        }, 0);
    },

    getUniqueTrackersBlockedCount: function getUniqueTrackersBlockedCount() {
        var _this5 = this;

        // console.log('[model] getUniqueTrackersBlockedCount()')
        return Object.keys(this.tab.trackersBlocked).reduce(function (total, name) {
            return _this5.tab.trackersBlocked[name].urls.length + total;
        }, 0);
    },

    getTrackerNetworksOnPage: function getTrackerNetworksOnPage() {
        // console.log('[model] getMajorTrackerNetworksOnPage()')
        // all tracker networks found on this page/tab
        var networks = Object.keys(this.tab.trackers).map(function (t) {
            return t.toLowerCase();
        }).filter(function (t) {
            return t !== 'unknown';
        });
        return networks;
    },

    getIsUserPrivacyUpgraded: function getIsUserPrivacyUpgraded() {
        // console.log('getIsUserPrivacyUpgraded()')
        if (!this.tab) return false;

        if (this.tab.upgradedHttps || Object.keys(this.tab.trackersBlocked).length > 0) {
            return true;
        }

        return false;
    },

    toggleWhitelist: function toggleWhitelist() {
        if (this.tab && this.tab.site) {
            this.isWhitelisted = !this.isWhitelisted;
            this.set('whitelisted', this.isWhitelisted);

            this.fetch({ 'whitelisted': {
                    list: 'whitelisted',
                    domain: this.tab.site.domain,
                    value: this.isWhitelisted
                }
            });
        }
    }
});

module.exports = Site;

},{}],17:[function(require,module,exports){
'use strict';

var Parent = window.DDG.base.Model;

function TopBlocked(attrs) {
    attrs = attrs || {};
    attrs.numCompanies = attrs.numCompanies;
    attrs.companyList = [];
    attrs.companyListMap = [];
    attrs.pctPagesWithTrackers = null;
    attrs.lastStatsResetDate = null;
    Parent.call(this, attrs);
}

TopBlocked.prototype = $.extend({}, Parent.prototype, {

    modelName: 'topBlocked',

    getTopBlocked: function getTopBlocked() {
        var _this = this;

        return new Promise(function (resolve, reject) {
            _this.fetch({ getTopBlockedByPages: _this.numCompanies }).then(function (data) {
                if (!data.totalPages || data.totalPages < 10) return resolve();
                if (!data.topBlocked || data.topBlocked.length < 1) return resolve();
                _this.companyList = data.topBlocked;
                _this.companyListMap = _this.companyList.map(function (company) {
                    return {
                        name: company.name,
                        percent: company.percent,
                        // calc graph bars using pixels instead of % to
                        // make margins easier
                        // max width: 145px
                        px: Math.floor(company.percent / 100 * 145)
                    };
                });
                if (data.pctPagesWithTrackers) {
                    _this.pctPagesWithTrackers = data.pctPagesWithTrackers;

                    if (data.lastStatsResetDate) {
                        _this.lastStatsResetDate = data.lastStatsResetDate;
                    }
                }
                resolve();
            });
        });
    },

    reset: function reset(resetDate) {
        this.companyList = [];
        this.companyListMap = [];
        this.pctPagesWithTrackers = null;
        this.lastStatsResetDate = resetDate;
    }

});

module.exports = TopBlocked;

},{}],18:[function(require,module,exports){
'use strict';

module.exports = {
  setBrowserClassOnBodyTag: require('./set-browser-class.es6.js')
  // ...add more here!
};

},{"./set-browser-class.es6.js":19}],19:[function(require,module,exports){
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

},{}],20:[function(require,module,exports){
'use strict';

var Parent = window.DDG.base.Page;
var mixins = require('./mixins/index.es6.js');
var HamburgerMenuView = require('./../views/hamburger-menu.es6.js');
var HamburgerMenuModel = require('./../models/hamburger-menu.es6.js');
var hamburgerMenuTemplate = require('./../templates/hamburger-menu.es6.js');
var TopBlockedView = require('./../views/top-blocked-truncated.es6.js');
var TopBlockedModel = require('./../models/top-blocked.es6.js');
var topBlockedTemplate = require('./../templates/top-blocked-truncated.es6.js');
var SiteView = require('./../views/site.es6.js');
var SiteModel = require('./../models/site.es6.js');
var siteTemplate = require('./../templates/site.es6.js');
var SearchView = require('./../views/search.es6.js');
var SearchModel = require('./../models/search.es6.js');
var searchTemplate = require('./../templates/search.es6.js');
var AutocompleteView = require('./../views/autocomplete.es6.js');
var AutocompleteModel = require('./../models/autocomplete.es6.js');
var autocompleteTemplate = require('./../templates/autocomplete.es6.js');
var BackgroundMessageModel = require('./../models/background-message.es6.js');

function Trackers(ops) {
    this.$parent = $('#popup-container');
    Parent.call(this, ops);
}

Trackers.prototype = $.extend({}, Parent.prototype, mixins.setBrowserClassOnBodyTag, {

    pageName: 'popup',

    ready: function ready() {

        Parent.prototype.ready.call(this);

        this.message = new BackgroundMessageModel();

        this.setBrowserClassOnBodyTag();

        this.views.search = new SearchView({
            pageView: this,
            model: new SearchModel({ searchText: '' }),
            appendTo: this.$parent,
            template: searchTemplate
        });

        this.views.hamburgerMenu = new HamburgerMenuView({
            pageView: this,
            model: new HamburgerMenuModel(),
            appendTo: this.$parent,
            template: hamburgerMenuTemplate
        });

        this.views.site = new SiteView({
            pageView: this,
            model: new SiteModel(),
            appendTo: this.$parent,
            template: siteTemplate
        });

        this.views.topblocked = new TopBlockedView({
            pageView: this,
            model: new TopBlockedModel({ numCompanies: 3 }),
            appendTo: this.$parent,
            template: topBlockedTemplate
        });

        // TODO: hook up model query to actual ddg ac endpoint.
        // For now this is just here to demonstrate how to
        // listen to another component via model.set() +
        // store.subscribe()
        this.views.autocomplete = new AutocompleteView({
            pageView: this,
            model: new AutocompleteModel({ suggestions: [] }),
            // appendTo: this.views.search.$el,
            appendTo: null,
            template: autocompleteTemplate
        });
    }
});

// kickoff!
window.DDG = window.DDG || {};
window.DDG.page = new Trackers();

},{"./../models/autocomplete.es6.js":11,"./../models/background-message.es6.js":12,"./../models/hamburger-menu.es6.js":13,"./../models/search.es6.js":14,"./../models/site.es6.js":16,"./../models/top-blocked.es6.js":17,"./../templates/autocomplete.es6.js":21,"./../templates/hamburger-menu.es6.js":23,"./../templates/search.es6.js":24,"./../templates/site.es6.js":32,"./../templates/top-blocked-truncated.es6.js":33,"./../views/autocomplete.es6.js":35,"./../views/hamburger-menu.es6.js":37,"./../views/search.es6.js":39,"./../views/site.es6.js":40,"./../views/top-blocked-truncated.es6.js":42,"./mixins/index.es6.js":18}],21:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<ul class="js-autocomplete" style="', '">\n                  ', '\n              </ul>'], ['<ul class="js-autocomplete" style="', '">\n                  ', '\n              </ul>']),
    _templateObject2 = _taggedTemplateLiteral(['\n                      <li><a href="#">', '</a></li>'], ['\n                      <li><a href="#">', '</a></li>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

module.exports = function () {

    // TODO/REMOVE: remove marginTop style tag once this is actually hooked up
    //              this is just to demo model store for now!
    //              -> this is gross, don't do this:
    var marginTop = this.model.suggestions && this.model.suggestions.length > 0 ? 'margin-top: 50px;' : '';

    return bel(_templateObject, marginTop, this.model.suggestions.map(function (suggestion) {
        return bel(_templateObject2, suggestion);
    }));
};

},{"bel":1}],22:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<section class="sliding-subview\n        sliding-subview--has-fixed-header">\n            ', '\n        </section>'], ['<section class="sliding-subview\n        sliding-subview--has-fixed-header">\n            ', '\n        </section>']),
    _templateObject2 = _taggedTemplateLiteral(['<div class="site-info site-info--details card card--no-top-margin">\n            <h1 class="site-info__domain">', '</h1>\n            ', '\n            ', '\n            <h2 class="site-info__https-status padded border--bottom">\n                ', '\n                <div class="float-right"></div>\n            </h2>\n            <h2 class="site-info__tosdr-status">\n                ', '\n            </h2>\n            <p class="site-info__tosdr-msg padded border--bottom">\n                Using privacy policy analysis from <a target="_blank" href="https://tosdr.org">tosdr.org</a>\n            </p>\n            ', '\n            <ol class="default-list site-info__trackers__company-list">\n                ', '\n            </ol>\n        </div>'], ['<div class="site-info site-info--details card card--no-top-margin">\n            <h1 class="site-info__domain">', '</h1>\n            ', '\n            ', '\n            <h2 class="site-info__https-status padded border--bottom">\n                ', '\n                <div class="float-right"></div>\n            </h2>\n            <h2 class="site-info__tosdr-status">\n                ', '\n            </h2>\n            <p class="site-info__tosdr-msg padded border--bottom">\n                Using privacy policy analysis from <a target="_blank" href="https://tosdr.org">tosdr.org</a>\n            </p>\n            ', '\n            <ol class="default-list site-info__trackers__company-list">\n                ', '\n            </ol>\n        </div>']),
    _templateObject3 = _taggedTemplateLiteral(['<span>', ' Privacy Practices</span>'], ['<span>', ' Privacy Practices</span>']),
    _templateObject4 = _taggedTemplateLiteral(['<span>Connection is secure (HTTPS)</span>'], ['<span>Connection is secure (HTTPS)</span>']),
    _templateObject5 = _taggedTemplateLiteral(['<span>Connection is insecure (HTTP)</span>'], ['<span>Connection is insecure (HTTP)</span>']),
    _templateObject6 = _taggedTemplateLiteral(['<h3 class="padded">', '</h3>'], ['<h3 class="padded">', '</h3>']),
    _templateObject7 = _taggedTemplateLiteral(['<li class="is-empty">None</li>'], ['<li class="is-empty">None</li>']),
    _templateObject8 = _taggedTemplateLiteral(['<li>\n                <span class="site-info__tracker__icon\n                    ', '\n                    float-right"></span>\n                <span class="block">', '</span>\n                <ol class="default-list site-info__trackers__company-list__url-list">\n                    ', '\n                </ol>\n            </li>'], ['<li>\n                <span class="site-info__tracker__icon\n                    ', '\n                    float-right"></span>\n                <span class="block">', '</span>\n                <ol class="default-list site-info__trackers__company-list__url-list">\n                    ', '\n                </ol>\n            </li>']),
    _templateObject9 = _taggedTemplateLiteral(['<li>\n                            <span class="url">', '</span>\n                            <span class="category pull-right">', '</span>\n                        </li>'], ['<li>\n                            <span class="url">', '</span>\n                            <span class="category pull-right">', '</span>\n                        </li>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');
var header = require('./shared/sliding-subview-header.es6.js');
var siteRating = require('./shared/site-rating.es6.js');
var siteRatingExplainer = require('./shared/site-rating-explainer.es6.js');
var tosdrMessages = { 'A': 'Good', 'B': 'Mixed', 'C': 'Poor', 'D': 'Poor' };

module.exports = function () {

    if (!this.model) {
        return bel(_templateObject, header('Grade Details'));
    } else {
        return bel(_templateObject2, this.model.site.domain, siteRating(this.model.isCalculatingSiteRating, this.model.site.siteRating, this.model.site.isWhitelisted), siteRatingExplainer(this.model.isCalculatingSiteRating, this.model.site.siteRating, this.model.site.isWhitelisted), httpsMsg(this.model.site.httpsState), tosdrMsg(this.model.site.tosdr), trackersBlockedOrFound(this.model), renderTrackerDetails(this.model.companyListMap, this.model.DOMAIN_MAPPINGS));
    }
};

function tosdrMsg(tosdr) {
    var msg = "Unknown";
    if (tosdr.class) {
        msg = tosdrMessages[tosdr.class];
    }
    return bel(_templateObject3, msg);
}

function httpsMsg(httpsState) {
    if (httpsState === 'secure' || httpsState === 'upgraded') {
        return bel(_templateObject4);
    }
    return bel(_templateObject5);
}

function trackersBlockedOrFound(model) {
    var msg = '';
    if (model.site && (model.site.isWhitelisted || model.site.trackerNetworks.length === 0)) {
        msg = 'Trackers found';
    } else {
        msg = 'Trackers blocked';
    }
    return bel(_templateObject6, msg);
}

function renderTrackerDetails(companyListMap, DOMAIN_MAPPINGS) {
    if (companyListMap.length === 0) {
        return bel(_templateObject7);
    }
    if (companyListMap && companyListMap.length > 0) {
        return companyListMap.map(function (c, i) {
            if (c.name && c.name === 'unknown') c.name = '(Tracker network unknown)';
            return bel(_templateObject8, c.name.replace('.', '').toLowerCase(), c.name, c.urls.map(function (url) {
                var category = '';
                if (DOMAIN_MAPPINGS[url.toLowerCase()]) {
                    category = DOMAIN_MAPPINGS[url.toLowerCase()].t;
                }
                return bel(_templateObject9, url, category);
            }));
        });
    }
}

},{"./shared/site-rating-explainer.es6.js":26,"./shared/site-rating.es6.js":27,"./shared/sliding-subview-header.es6.js":28,"bel":1}],23:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<nav class="hamburger-menu js-hamburger-menu is-hidden">\n        <div class="hamburger-menu__bg"></div>\n        <div class="hamburger-menu__content card padded">\n            <h2 class="menu-title border--bottom hamburger-menu__content__more-options">\n                More Options\n            </h2>\n            <nav class="pull-right hamburger-menu__close-container">\n                <a href="#" class="icon icon__close js-hamburger-menu-close"></a>\n            </nav>\n            <ul class="hamburger-menu__links padded default-list">\n                <li>\n                    <a href="#" class="menu-title js-hamburger-menu-options-link">\n                        Settings\n                        <span>Manage whitelist and other options</span>\n                    </a>\n                </li>\n                <li>\n                    <a href="', '"\n                        class="menu-title">\n                        Send feedback\n                        <span>Got issues or suggestions? Let us know!</span>\n                    </a>\n                </li>\n                <li>\n                    <a href="', '"\n                        class="menu-title">\n                        Report broken site\n                        <span>If a site\'s not working, please tell us.</span>\n                    </a>\n                </li>\n            </ul>\n        </div>\n    </nav>'], ['<nav class="hamburger-menu js-hamburger-menu is-hidden">\n        <div class="hamburger-menu__bg"></div>\n        <div class="hamburger-menu__content card padded">\n            <h2 class="menu-title border--bottom hamburger-menu__content__more-options">\n                More Options\n            </h2>\n            <nav class="pull-right hamburger-menu__close-container">\n                <a href="#" class="icon icon__close js-hamburger-menu-close"></a>\n            </nav>\n            <ul class="hamburger-menu__links padded default-list">\n                <li>\n                    <a href="#" class="menu-title js-hamburger-menu-options-link">\n                        Settings\n                        <span>Manage whitelist and other options</span>\n                    </a>\n                </li>\n                <li>\n                    <a href="', '"\n                        class="menu-title">\n                        Send feedback\n                        <span>Got issues or suggestions? Let us know!</span>\n                    </a>\n                </li>\n                <li>\n                    <a href="', '"\n                        class="menu-title">\n                        Report broken site\n                        <span>If a site\'s not working, please tell us.</span>\n                    </a>\n                </li>\n            </ul>\n        </div>\n    </nav>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

module.exports = function () {
    return bel(_templateObject, renderFeedbackHref(this.model.tabUrl), renderBrokenSiteHref(this.model.tabUrl));
};

function renderFeedbackHref(url) {
    return 'mailto:extension-feedback@duckduckgo.com?subject=Firefox%20Extension%20Feedback&body=Help%20us%20improve%20by%20sharing%20a%20little%20info%20about%20the%20issue%20you%27ve%20encountered%2E%0A%0ATell%20us%20which%20features%20or%20functionality%20your%20feedback%20refers%20to%2E%20What%20do%20you%20love%3F%20What%20isn%27t%20working%3F%20How%20could%20it%20be%20improved%3F%20%20%0A%0A----URL%20is%20' + encodeURIComponent(url);
}

function renderBrokenSiteHref(url) {
    return 'mailto:extension-brokensites@duckduckgo.com?subject=Firefox%20Extension%20Broken%20Site%20Report&body=Help%20us%20improve%20by%20sharing%20a%20little%20info%20about%20the%20issue%20you%27ve%20encountered%2E%0A%0A1%2E%20Which%20website%20is%20broken%3F%20%28copy%20and%20paste%20the%20URL%29%0A%0A2%2E%20Describe%20the%20issue%2E%20%28What%27s%20breaking%20on%20the%20page%3F%20Attach%20a%20screenshot%20if%20possible%2E%0A%0A----URL%20is%20' + encodeURIComponent(url);
}

},{"bel":1}],24:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<section>\n        <form class="sliding-subview__header card search-form js-search-form" name="x">\n          <span class="ddg-logo"></span>\n          <input type="text" autocomplete="off" placeholder="Search DuckDuckGo"\n                 name="q" class="search-form__input js-search-input"\n                 value="', '" />\n          <input class="search-form__go js-search-go" tabindex="2" value="" type="button" />\n          <input type="submit" class="search-form__submit" />\n          ', '\n        </form>\n    </section>'], ['<section>\n        <form class="sliding-subview__header card search-form js-search-form" name="x">\n          <span class="ddg-logo"></span>\n          <input type="text" autocomplete="off" placeholder="Search DuckDuckGo"\n                 name="q" class="search-form__input js-search-input"\n                 value="', '" />\n          <input class="search-form__go js-search-go" tabindex="2" value="" type="button" />\n          <input type="submit" class="search-form__submit" />\n          ', '\n        </form>\n    </section>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');
var hamburgerButton = require('./shared/hamburger-button.es6.js');

module.exports = function () {
    return bel(_templateObject, this.model.searchText, hamburgerButton('js-search-hamburger-button'));
};

},{"./shared/hamburger-button.es6.js":25,"bel":1}],25:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<button class="hamburger-button ', '">\n        <span></span>\n        <span></span>\n        <span></span>\n    </button>'], ['<button class="hamburger-button ', '">\n        <span></span>\n        <span></span>\n        <span></span>\n    </button>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

module.exports = function (klass) {
    klass = klass || '';
    return bel(_templateObject, klass);
};

},{"bel":1}],26:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<p class="site-info--details__explainer\n        js-rating-explainer border--bottom">\n            ', '\n        </p>'], ['<p class="site-info--details__explainer\n        js-rating-explainer border--bottom">\n            ', '\n        </p>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

module.exports = function (isCalculating, rating, isWhitelisted) {
    var msg = '';

    if (isCalculating) {
        msg = 'Calculating...';
    } else if (rating && (rating.before || rating.after)) {
        var _rating = isWhitelisted ? rating.before : rating.after;
        msg = 'This received a "' + _rating.toUpperCase() + '" Privacy Grade\n          for the reasons below.';
    }

    return bel(_templateObject, msg);
};

},{"bel":1}],27:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<div class="site-info__rating\n        site-info__rating--', '\n        ', '\n        js-rating"></div>'], ['<div class="site-info__rating\n        site-info__rating--', '\n        ', '\n        js-rating"></div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

module.exports = function (isCalculating, rating, isWhitelisted) {
    // console.log('[site-rating template] isCalculating: ' + isCalculating)
    var _rating = void 0;
    var isActive = '';

    if (isCalculating) {
        _rating = 'calculating';
    } else {
        isActive = isWhitelisted ? '' : 'is-active';
        if (isActive && rating && rating.after) {
            _rating = rating.after.toLowerCase();
        } else if (rating && rating.before) {
            _rating = rating.before.toLowerCase();
        } else {
            _rating = 'null';
        }
    }

    return bel(_templateObject, _rating, isActive);
};

},{"bel":1}],28:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<nav class="sliding-subview__header card">\n        <a href="#" class="sliding-subview__header__back\n            sliding-subview__header__back--is-icon\n            js-sliding-subview-close">\n            <span class="icon icon__arrow icon__arrow--left pull-left">\n            </span>\n        </a>\n        <h2 class="sliding-subview__header__title">\n            ', '\n        </h2>\n        ', '\n    </nav>'], ['<nav class="sliding-subview__header card">\n        <a href="#" class="sliding-subview__header__back\n            sliding-subview__header__back--is-icon\n            js-sliding-subview-close">\n            <span class="icon icon__arrow icon__arrow--left pull-left">\n            </span>\n        </a>\n        <h2 class="sliding-subview__header__title">\n            ', '\n        </h2>\n        ', '\n    </nav>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');
var hamburgerButton = require('./hamburger-button.es6.js');

module.exports = function (title) {

    return bel(_templateObject, title, hamburgerButton());
};

},{"./hamburger-button.es6.js":25,"bel":1}],29:[function(require,module,exports){
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

},{"bel":1}],30:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<li class="top-blocked__li">\n          <div class="top-blocked__li__company-name">', '</div>\n          <div class="top-blocked__li__blocker-bar">\n              <div class="top-blocked__li__blocker-bar__fg\n                  js-top-blocked-graph-bar-fg"\n                  style="width: 0px" data-width="', 'px">\n              </div>\n          </div>\n          <div class="top-blocked__li__blocker-pct js-top-blocked-pct">\n              ', '%\n          </div>\n        </li>'], ['<li class="top-blocked__li">\n          <div class="top-blocked__li__company-name">', '</div>\n          <div class="top-blocked__li__blocker-bar">\n              <div class="top-blocked__li__blocker-bar__fg\n                  js-top-blocked-graph-bar-fg"\n                  style="width: 0px" data-width="', 'px">\n              </div>\n          </div>\n          <div class="top-blocked__li__blocker-pct js-top-blocked-pct">\n              ', '%\n          </div>\n        </li>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

module.exports = function (companyListMap) {
    return companyListMap.map(function (data) {

        return bel(_templateObject, data.name, data.px, data.percent);
    });
};

},{"bel":1}],31:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<div class="top-blocked__no-data">\n    <p>All trackers dashboard</p>\n    <div class="top-blocked__no-data__graph">\n      <span class="top-blocked__no-data__graph__bar one"></span>\n      <span class="top-blocked__no-data__graph__bar two"></span>\n      <span class="top-blocked__no-data__graph__bar three"></span>\n      <span class="top-blocked__no-data__graph__bar four"></span>\n    </div>\n    <p>Still collecting data to show how many trackers we\'ve blocked</p>\n  </div>'], ['<div class="top-blocked__no-data">\n    <p>All trackers dashboard</p>\n    <div class="top-blocked__no-data__graph">\n      <span class="top-blocked__no-data__graph__bar one"></span>\n      <span class="top-blocked__no-data__graph__bar two"></span>\n      <span class="top-blocked__no-data__graph__bar three"></span>\n      <span class="top-blocked__no-data__graph__bar four"></span>\n    </div>\n    <p>Still collecting data to show how many trackers we\'ve blocked</p>\n  </div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

module.exports = function () {
  return bel(_templateObject);
};

},{"bel":1}],32:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<section class="site-info card">\n        <ul class="default-list">\n            <li class="site-info__rating-li">\n                <div class="site-info__rating-container border--bottom">\n                    ', '\n                    <h1 class="site-info__domain">', '</h1>\n                    ', '\n                </div>\n            </li>\n            <li class="site-info__li--toggle padded border--bottom">\n                <h2 class="site-info__protection">Site Privacy Protection</h2>\n                <div class="site-info__toggle-container">\n                    <span class="site-info__toggle-text">\n                        ', '\n                    </span>\n                    ', '\n                </div>\n            </li>\n            <li class="site-info__li--https-status padded border--bottom">\n                <h2 class="site-info__https-status bold">\n                    <span class="site-info__https-status__icon\n                        is-', '">\n                    </span>\n                    Connection\n                    <div class="float-right">\n                        <span class="site-info__https-status__msg\n                            is-', '">\n                            ', '\n                        </span>\n                    </div>\n                </h2>\n            </li>\n            <li class="site-info__li--trackers padded border--bottom">\n                ', '\n            </li>\n            <li class="site-info__li--more-details padded border--bottom">\n                <a href="#" class="js-site-show-all-trackers link-secondary bold">\n                    More details\n                    <span class="icon icon__arrow pull-right"></span>\n                </a>\n            </li>\n        </ul>\n    </section>'], ['<section class="site-info card">\n        <ul class="default-list">\n            <li class="site-info__rating-li">\n                <div class="site-info__rating-container border--bottom">\n                    ', '\n                    <h1 class="site-info__domain">', '</h1>\n                    ', '\n                </div>\n            </li>\n            <li class="site-info__li--toggle padded border--bottom">\n                <h2 class="site-info__protection">Site Privacy Protection</h2>\n                <div class="site-info__toggle-container">\n                    <span class="site-info__toggle-text">\n                        ', '\n                    </span>\n                    ', '\n                </div>\n            </li>\n            <li class="site-info__li--https-status padded border--bottom">\n                <h2 class="site-info__https-status bold">\n                    <span class="site-info__https-status__icon\n                        is-', '">\n                    </span>\n                    Connection\n                    <div class="float-right">\n                        <span class="site-info__https-status__msg\n                            is-', '">\n                            ', '\n                        </span>\n                    </div>\n                </h2>\n            </li>\n            <li class="site-info__li--trackers padded border--bottom">\n                ', '\n            </li>\n            <li class="site-info__li--more-details padded border--bottom">\n                <a href="#" class="js-site-show-all-trackers link-secondary bold">\n                    More details\n                    <span class="icon icon__arrow pull-right"></span>\n                </a>\n            </li>\n        </ul>\n    </section>']),
    _templateObject2 = _taggedTemplateLiteral(['<p class="site-info__rating-upgrade uppercase text--center">\n                    Upgraded from\n                    <span class="rating__text-only ', '">\n                    ', '</span> to\n                    <span class="rating__text-only ', '">\n                    ', '</span>\n                </p>'], ['<p class="site-info__rating-upgrade uppercase text--center">\n                    Upgraded from\n                    <span class="rating__text-only ', '">\n                    ', '</span> to\n                    <span class="rating__text-only ', '">\n                    ', '</span>\n                </p>']),
    _templateObject3 = _taggedTemplateLiteral(['<p class="site-info__rating-upgrade uppercase text--center">\n            ', '</p>'], ['<p class="site-info__rating-upgrade uppercase text--center">\n            ', '</p>']),
    _templateObject4 = _taggedTemplateLiteral(['<h2 class="site-info__trackers bold">\n            <span class="site-info__trackers-status__icon\n                is-blocking--', '">\n            </span>\n            Tracker networks ', '\n            <div class="float-right uppercase ', '">', '</div>\n        </h2>'], ['<h2 class="site-info__trackers bold">\n            <span class="site-info__trackers-status__icon\n                is-blocking--', '">\n            </span>\n            Tracker networks ', '\n            <div class="float-right uppercase ', '">', '</div>\n        </h2>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');
var titleize = require('titleize');
var toggleButton = require('./shared/toggle-button.es6.js');
var siteRating = require('./shared/site-rating.es6.js');

module.exports = function () {

    return bel(_templateObject, siteRating(this.model.isCalculatingSiteRating, this.model.siteRating, this.model.isWhitelisted), this.model.domain, ratingUpgrade(this.model.isCalculatingSiteRating, this.model.siteRating, this.model.isWhitelisted), this.model.whitelistStatusText, toggleButton(!this.model.isWhitelisted, 'js-site-toggle pull-right'), this.model.httpsState, this.model.httpsStatusText.toLowerCase(), this.model.httpsStatusText, renderTrackerNetworks(this.model.trackerNetworks, this.model.isWhitelisted));

    function ratingUpgrade(isCalculating, rating, isWhitelisted) {
        // console.log('[site template] isCalculating: ' + isCalculating)
        var isActive = isWhitelisted ? false : true;
        // site grade/rating was upgraded by extension
        if (isActive && rating && rating.before && rating.after) {
            if (rating.before !== rating.after) {
                return bel(_templateObject2, rating.before.toLowerCase(), rating.before, rating.after.toLowerCase(), rating.after);
            }
        }

        // deal with other states
        var msg = 'Privacy Grade';
        // site is whitelisted
        if (!isActive) {
            msg = 'Privacy Protection Disabled';
            // "null" state (empty tab, browser's "about:" pages)
        } else if (!isCalculating && !rating.before && !rating.after) {
            msg = 'We only grade regular websites';
            // rating is still calculating
        } else if (isCalculating) {
            msg = 'Calculating...';
        }

        return bel(_templateObject3, msg);
    }

    function renderTrackerNetworks(tn, isWhitelisted) {
        var count = 0;
        if (tn && tn.length) count = tn.length;
        var isActive = !isWhitelisted ? 'is-active' : '';
        var foundOrBlocked = isWhitelisted || count === 0 ? 'found' : 'blocked';

        return bel(_templateObject4, !isWhitelisted, foundOrBlocked, isActive, count);
    }
};

},{"./shared/site-rating.es6.js":27,"./shared/toggle-button.es6.js":29,"bel":1,"titleize":9}],33:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<section class="top-blocked card">\n            <h3 class="padded uppercase text--center">\n                Tracker Networks Top Offenders\n            </h3>\n            <ol class="default-list top-blocked__list">\n                ', '\n                <li class="top-blocked__li top-blocked__li--see-all border--top">\n                    <a href="#" class="link-secondary js-top-blocked-see-all">\n                        <span class="icon icon__arrow pull-right"></span>\n                        All trackers\n                    </a>\n                </li>\n            </ol>\n        </section>'], ['<section class="top-blocked card">\n            <h3 class="padded uppercase text--center">\n                Tracker Networks Top Offenders\n            </h3>\n            <ol class="default-list top-blocked__list">\n                ', '\n                <li class="top-blocked__li top-blocked__li--see-all border--top">\n                    <a href="#" class="link-secondary js-top-blocked-see-all">\n                        <span class="icon icon__arrow pull-right"></span>\n                        All trackers\n                    </a>\n                </li>\n            </ol>\n        </section>']),
    _templateObject2 = _taggedTemplateLiteral(['<section class="top-blocked card card--transparent">\n            <ol class="default-list top-blocked__list">\n                <li class="top-blocked__li top-blocked__li--no-data">\n                    ', '\n                </li>\n            </ol>\n        </section>'], ['<section class="top-blocked card card--transparent">\n            <ol class="default-list top-blocked__list">\n                <li class="top-blocked__li top-blocked__li--no-data">\n                    ', '\n                </li>\n            </ol>\n        </section>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');
var listItems = require('./shared/top-blocked-list-items.es6.js');
var noData = require('./shared/top-blocked-no-data.es6.js');

module.exports = function () {

    if (this.model.companyListMap && this.model.companyListMap.length > 0) {
        return bel(_templateObject, listItems(this.model.companyListMap));
    } else {
        return bel(_templateObject2, noData());
    }
};

},{"./shared/top-blocked-list-items.es6.js":30,"./shared/top-blocked-no-data.es6.js":31,"bel":1}],34:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<section class="sliding-subview\n            sliding-subview--has-fixed-header">\n            ', '\n        </section>'], ['<section class="sliding-subview\n            sliding-subview--has-fixed-header">\n            ', '\n        </section>']),
    _templateObject2 = _taggedTemplateLiteral(['<div class="js-top-blocked-content">\n            ', '\n            ', '\n            ', '\n        </div>'], ['<div class="js-top-blocked-content">\n            ', '\n            ', '\n            ', '\n        </div>']),
    _templateObject3 = _taggedTemplateLiteral(['<p class="top-blocked__pct card">\n            Trackers were found on ', '%\n            of web sites you\'ve visited', '.\n        </p>'], ['<p class="top-blocked__pct card">\n            Trackers were found on ', '%\n            of web sites you\'ve visited', '.\n        </p>']),
    _templateObject4 = _taggedTemplateLiteral(['<ol class="default-list top-blocked__list card">\n            ', '\n        </ol>'], ['<ol class="default-list top-blocked__list card">\n            ', '\n        </ol>']),
    _templateObject5 = _taggedTemplateLiteral(['<ol class="default-list top-blocked__list">\n            <li class="top-blocked__li top-blocked__li--no-data">\n                ', '\n            </li>\n        </ol>'], ['<ol class="default-list top-blocked__list">\n            <li class="top-blocked__li top-blocked__li--no-data">\n                ', '\n            </li>\n        </ol>']),
    _templateObject6 = _taggedTemplateLiteral(['<div class="top-blocked__reset-stats">\n            <button class="top-blocked__reset-stats__button block\n                js-reset-trackers-data">\n                Reset Global Stats\n            </button>\n            <p>These stats are only stored locally on your device,\n            and are not sent anywhere, ever.</p>\n        </div>'], ['<div class="top-blocked__reset-stats">\n            <button class="top-blocked__reset-stats__button block\n                js-reset-trackers-data">\n                Reset Global Stats\n            </button>\n            <p>These stats are only stored locally on your device,\n            and are not sent anywhere, ever.</p>\n        </div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');
var header = require('./shared/sliding-subview-header.es6.js');
var listItems = require('./shared/top-blocked-list-items.es6.js');
var noData = require('./shared/top-blocked-no-data.es6.js');

module.exports = function () {

    if (!this.model) {
        return bel(_templateObject, header('All Trackers'));
    } else {
        return bel(_templateObject2, renderPctPagesWithTrackers(this.model), renderList(this.model), renderResetButton(this.model));
    }
};

function renderPctPagesWithTrackers(model) {
    var msg = '';
    if (model.lastStatsResetDate) {
        var d = new Date(model.lastStatsResetDate).toDateString();
        if (d) msg = ' since ' + d;
    }
    if (model.pctPagesWithTrackers) {
        return bel(_templateObject3, model.pctPagesWithTrackers, msg);
    }
}

function renderList(model) {
    if (model.companyListMap.length > 0) {
        return bel(_templateObject4, listItems(model.companyListMap));
    } else {
        return bel(_templateObject5, noData());
    }
}

function renderResetButton(model) {
    if (model.companyListMap.length > 0) {
        return bel(_templateObject6);
    }
}

},{"./shared/sliding-subview-header.es6.js":28,"./shared/top-blocked-list-items.es6.js":30,"./shared/top-blocked-no-data.es6.js":31,"bel":1}],35:[function(require,module,exports){
'use strict';

var Parent = window.DDG.base.View;

function Autocomplete(ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    this.bindEvents([[this.store.subscribe, 'change:search', this._handleSearchText]]);
};

Autocomplete.prototype = $.extend({}, Parent.prototype, {

    _handleSearchText: function _handleSearchText(notification) {
        var _this = this;

        if (notification.change && notification.change.attribute === 'searchText') {
            if (!notification.change.value) {
                this.model.suggestions = [];
                this._rerender();
                return;
            }

            this.model.fetchSuggestions(notification.change.value).then(function () {
                return _this._rerender();
            });
        }
    }

});

module.exports = Autocomplete;

},{}],36:[function(require,module,exports){
'use strict';

var ParentSlidingSubview = require('./sliding-subview.es6.js');
var CompanyListModel = require('./../models/site-company-list.es6.js');
var SiteModel = require('./../models/site.es6.js');
var ratingTemplate = require('./../templates/shared/site-rating.es6.js');
var ratingExplainerTemplate = require('./../templates/shared/site-rating-explainer.es6.js');

function GradeDetails(ops) {
    // model data is async
    this.model = null;
    this.currentModelName = null;
    this.currentSiteModelName = null;
    this.template = ops.template;
    ParentSlidingSubview.call(this, ops);

    this.setupClose();
    this.renderAsyncContent();
}

GradeDetails.prototype = $.extend({}, ParentSlidingSubview.prototype, {

    setup: function setup() {
        // site rating arrives async
        this.bindEvents([[this.store.subscribe, 'change:' + this.currentSiteModelName, this.renderSiteRating]]);
        this.$rating = this.$el.find('.js-rating');
        this.$explainer = this.$el.find('.js-rating-explainer');
    },

    renderAsyncContent: function renderAsyncContent() {
        var _this = this;

        var random = Math.round(Math.random() * 100000);
        this.currentModelName = 'siteCompanyList' + random;
        this.currentSiteModelName = 'site' + random;

        this.model = new CompanyListModel({
            modelName: this.currentModelName
        });
        this.model.fetchAsyncData().then(function () {
            _this.model.site = new SiteModel({
                modelName: _this.currentSiteModelName
            });
            _this.model.site.getBackgroundTabData().then(function () {
                var content = _this.template();
                _this.$el.append(content);
                _this.setup();
            });
        });
    },

    renderSiteRating: function renderSiteRating() {
        // rating bubble
        var rating = ratingTemplate(this.model.site.isCalculating, this.model.site.siteRating, this.model.site.isWhitelisted);
        this.$rating.replaceWith(rating);
        // rating explainer message
        var msg = ratingExplainerTemplate(this.model.site.isCalculating, this.model.site.siteRating, this.model.site.isWhitelisted);
        this.$explainer.replaceWith(msg);
    }
});

module.exports = GradeDetails;

},{"./../models/site-company-list.es6.js":15,"./../models/site.es6.js":16,"./../templates/shared/site-rating-explainer.es6.js":26,"./../templates/shared/site-rating.es6.js":27,"./sliding-subview.es6.js":41}],37:[function(require,module,exports){
'use strict';

var Parent = window.DDG.base.View;

function HamburgerMenu(ops) {
    this.model = ops.model;
    this.template = ops.template;
    Parent.call(this, ops);

    this._setup();
}

HamburgerMenu.prototype = $.extend({}, Parent.prototype, {

    _setup: function _setup() {

        this._cacheElems('.js-hamburger-menu', ['close', 'options-link']);

        this.bindEvents([[this.$close, 'click', this._closeMenu], [this.$optionslink, 'click', this._openOptionsPage], [this.model.store.subscribe, 'action:search', this._handleAction], [this.model.store.subscribe, 'change:site', this._handleSiteUpdate]]);
    },

    _handleAction: function _handleAction(notification) {
        if (notification.action === 'burgerClick') this._openMenu();
    },

    _openMenu: function _openMenu(e) {
        this.$el.removeClass('is-hidden');
    },

    _closeMenu: function _closeMenu(e) {
        if (e) e.preventDefault();
        this.$el.addClass('is-hidden');
    },

    _handleSiteUpdate: function _handleSiteUpdate(notification) {
        if (notification && notification.change.attribute === 'tab') {
            this.model.tabUrl = notification.change.value.url;
            this._rerender();
            this._setup();
        }
    },

    _openOptionsPage: function _openOptionsPage() {
        this.model.fetch({ getBrowser: true }).then(function (browser) {
            if (browser === 'moz') {
                chrome.tabs.create({ url: chrome.extension.getURL("/html/options.html") });
                window.close();
            } else {
                chrome.runtime.openOptionsPage();
            }
        });
    }
});

module.exports = HamburgerMenu;

},{}],38:[function(require,module,exports){
'use strict';

module.exports = {
    animateGraphBars: function animateGraphBars() {
        var self = this;

        window.setTimeout(function () {
            if (!self.$graphbarfg) return;
            self.$graphbarfg.each(function (i, el) {
                var $el = $(el);
                var w = $el.data().width;
                $el.css('width', w);
            });
        }, 250);

        window.setTimeout(function () {
            if (!self.$pct) return;
            self.$pct.each(function (i, el) {
                var $el = $(el);
                $el.css('color', '#333333');
            });
        }, 700);
    }
};

},{}],39:[function(require,module,exports){
'use strict';

var Parent = window.DDG.base.View;

function Search(ops) {
    var _this = this;

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;
    Parent.call(this, ops);

    this._cacheElems('.js-search', ['form', 'input', 'go', 'hamburger-button']);

    this.bindEvents([[this.$input, 'keyup', this._handleKeyup], [this.$go, 'click', this._handleSubmit], [this.$form, 'submit', this._handleSubmit], [this.$hamburgerbutton, 'click', this._handleBurgerClick]]);

    window.setTimeout(function () {
        return _this.$input.focus();
    }, 200);
}

Search.prototype = $.extend({}, Parent.prototype, {

    _handleKeyup: function _handleKeyup(e) {
        this.model.set('searchText', this.$input.val());
    },

    _handleSubmit: function _handleSubmit(e) {
        console.log('Search submit for ' + this.$input.val());
        this.model.doSearch(this.$input.val());
        window.close();
    },

    _handleBurgerClick: function _handleBurgerClick(e) {
        e.preventDefault();
        this.model.send('burgerClick');
    }
});

module.exports = Search;

},{}],40:[function(require,module,exports){
'use strict';

var Parent = window.DDG.base.View;
var GradeDetailsView = require('./../views/grade-details.es6.js');
var gradeDetailsTemplate = require('./../templates/grade-details.es6.js');

function Site(ops) {
    var _this = this;

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    // cache 'body' selector
    this.$body = $('body');

    // get data from background process, then re-render template with it
    this.model.getBackgroundTabData().then(function () {
        if (_this.model.tab && (_this.model.tab.status === 'complete' || _this.model.domain === 'new tab')) {
            // render template for the first time here
            Parent.call(_this, ops);
            _this._setup();
        } else {
            // the timeout helps buffer the re-render cycle during heavy
            // page loads with lots of trackers
            Parent.call(_this, ops);
            setTimeout(function () {
                return _this.rerender();
            }, 750);
        }
    });
}

Site.prototype = $.extend({}, Parent.prototype, {

    _whitelistClick: function _whitelistClick(e) {
        if (this.$body.hasClass('is-disabled')) return;
        this.model.toggleWhitelist();
        console.log('isWhitelisted: ', this.model.isWhitelisted);
        chrome.tabs.reload(this.model.tab.id);
        var w = chrome.extension.getViews({ type: 'popup' })[0];
        w.close();
    },

    // NOTE: after ._setup() is called this view listens for changes to
    // site model and re-renders every time model properties change
    _setup: function _setup() {
        // console.log('[site view] _setup()')
        this._cacheElems('.js-site', ['toggle', 'show-all-trackers']);

        this.bindEvents([[this.$toggle, 'click', this._whitelistClick], [this.$showalltrackers, 'click', this._showAllTrackers], [this.store.subscribe, 'change:site', this.rerender]]);
    },

    rerender: function rerender() {
        // console.log('[site view] rerender()')
        if (this.model && this.model.disabled) {
            console.log('.addClass is-disabled');
            this.$body.addClass('is-disabled');
            this._rerender();
            this._setup();
        } else {
            this.$body.removeClass('is-disabled');
            this.unbindEvents();
            this._rerender();
            this._setup();
        }
    },

    _showAllTrackers: function _showAllTrackers() {
        if (this.$body.hasClass('is-disabled')) return;
        this.views.slidingSubview = new GradeDetailsView({
            template: gradeDetailsTemplate
        });
    }

});

module.exports = Site;

},{"./../templates/grade-details.es6.js":22,"./../views/grade-details.es6.js":36}],41:[function(require,module,exports){
'use strict';

var Parent = window.DDG.base.View;

function SlidingSubview(ops) {
    ops.appendTo = $('.sliding-subview--root');
    Parent.call(this, ops);

    this.$root = $('.sliding-subview--root');
    this.$root.addClass('sliding-subview--open');

    this.setupClose();
}

SlidingSubview.prototype = $.extend({}, Parent.prototype, {

    setupClose: function setupClose() {
        this._cacheElems('.js-sliding-subview', ['close']);
        this.bindEvents([[this.$close, 'click', this._destroy]]);
    },

    _destroy: function _destroy() {
        var _this = this;

        this.$root.removeClass('sliding-subview--open');
        window.setTimeout(function () {
            _this.destroy();
        }, 400); // 400ms = 0.35s in .sliding-subview--root transition + 50ms padding
    }
});

module.exports = SlidingSubview;

},{}],42:[function(require,module,exports){
'use strict';

var Parent = window.DDG.base.View;
var animateGraphBars = require('./mixins/animate-graph-bars.es6.js');
var TopBlockedFullView = require('./top-blocked.es6.js');
var topBlockedFullTemplate = require('./../templates/top-blocked.es6.js');

function TruncatedTopBlocked(ops) {
    var _this = this;

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;
    Parent.call(this, ops);

    this.model.getTopBlocked().then(function () {
        _this.rerenderList();
    });

    this.bindEvents([[this.model.store.subscribe, 'action:backgroundMessage', this.handleBackgroundMsg]]);
}

TruncatedTopBlocked.prototype = $.extend({}, Parent.prototype, animateGraphBars, {

    _seeAllClick: function _seeAllClick() {
        this.views.slidingSubview = new TopBlockedFullView({
            template: topBlockedFullTemplate,
            numItems: 10
        });
    },

    _setup: function _setup() {
        this._cacheElems('.js-top-blocked', ['graph-bar-fg', 'pct', 'see-all']);
        this.bindEvents([[this.$seeall, 'click', this._seeAllClick]]);
    },

    rerenderList: function rerenderList() {
        this._rerender();
        this._setup();
        this.animateGraphBars();
    },

    handleBackgroundMsg: function handleBackgroundMsg(message) {
        if (!message || !message.action) return;

        if (message.action === 'didResetTrackersData') {
            this.model.reset();
            this.rerenderList();
        }
    }
});

module.exports = TruncatedTopBlocked;

},{"./../templates/top-blocked.es6.js":34,"./mixins/animate-graph-bars.es6.js":38,"./top-blocked.es6.js":43}],43:[function(require,module,exports){
'use strict';

var ParentSlidingSubview = require('./sliding-subview.es6.js');
var animateGraphBars = require('./mixins/animate-graph-bars.es6.js');
var TopBlockedModel = require('./../models/top-blocked.es6.js');

function TopBlocked(ops) {
    // model data is async
    this.model = null;
    this.numItems = ops.numItems;
    this.template = ops.template;
    ParentSlidingSubview.call(this, ops);

    this.setupClose();
    this.renderAsyncContent();

    this.bindEvents([[this.model.store.subscribe, 'action:backgroundMessage', this.handleBackgroundMsg]]);
}

TopBlocked.prototype = $.extend({}, ParentSlidingSubview.prototype, animateGraphBars, {

    setup: function setup() {
        this.$content = this.$el.find('.js-top-blocked-content');
        // listener for reset stats click
        this.$reset = this.$el.find('.js-reset-trackers-data');
        this.bindEvents([[this.$reset, 'click', this.resetTrackersStats]]);
    },

    renderAsyncContent: function renderAsyncContent() {
        var _this = this;

        var random = Math.round(Math.random() * 100000);
        this.model = new TopBlockedModel({
            modelName: 'topBlocked' + random,
            numCompanies: this.numItems
        });
        this.model.getTopBlocked().then(function () {
            var content = _this.template();
            _this.$el.append(content);
            _this.setup();

            // animate graph bars and pct
            _this.$graphbarfg = _this.$el.find('.js-top-blocked-graph-bar-fg');
            _this.$pct = _this.$el.find('.js-top-blocked-pct');
            _this.animateGraphBars();
        });
    },

    resetTrackersStats: function resetTrackersStats(e) {
        if (e) e.preventDefault();
        this.model.fetch({ resetTrackersData: true });
    },

    handleBackgroundMsg: function handleBackgroundMsg(message) {
        if (!message || !message.action) return;

        if (message.action === 'didResetTrackersData') {
            this.model.reset(message.data);
            var content = this.template();
            this.$content.replaceWith(content);
        }
    }
});

module.exports = TopBlocked;

},{"./../models/top-blocked.es6.js":17,"./mixins/animate-graph-bars.es6.js":38,"./sliding-subview.es6.js":41}]},{},[20]);
