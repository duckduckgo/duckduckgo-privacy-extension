(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var trailingNewlineRegex = /\n[\s]+$/
var leadingNewlineRegex = /^\n[\s]+/
var trailingSpaceRegex = /[\s]+$/
var leadingSpaceRegex = /^[\s]+/
var multiSpaceRegex = /[\n\s]+/g

var TEXT_TAGS = [
  'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'data', 'dfn', 'em', 'i',
  'kbd', 'mark', 'q', 'rp', 'rt', 'rtc', 'ruby', 's', 'amp', 'small', 'span',
  'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr'
]

var VERBATIM_TAGS = [
  'code', 'pre', 'textarea'
]

module.exports = function appendChild (el, childs) {
  if (!Array.isArray(childs)) return

  var nodeName = el.nodeName.toLowerCase()

  var hadText = false
  var value, leader

  for (var i = 0, len = childs.length; i < len; i++) {
    var node = childs[i]
    if (Array.isArray(node)) {
      appendChild(el, node)
      continue
    }

    if (typeof node === 'number' ||
      typeof node === 'boolean' ||
      typeof node === 'function' ||
      node instanceof Date ||
      node instanceof RegExp) {
      node = node.toString()
    }

    var lastChild = el.childNodes[el.childNodes.length - 1]

    // Iterate over text nodes
    if (typeof node === 'string') {
      hadText = true

      // If we already had text, append to the existing text
      if (lastChild && lastChild.nodeName === '#text') {
        lastChild.nodeValue += node

      // We didn't have a text node yet, create one
      } else {
        node = document.createTextNode(node)
        el.appendChild(node)
        lastChild = node
      }

      // If this is the last of the child nodes, make sure we close it out
      // right
      if (i === len - 1) {
        hadText = false
        // Trim the child text nodes if the current node isn't a
        // node where whitespace matters.
        if (TEXT_TAGS.indexOf(nodeName) === -1 &&
          VERBATIM_TAGS.indexOf(nodeName) === -1) {
          value = lastChild.nodeValue
            .replace(leadingNewlineRegex, '')
            .replace(trailingSpaceRegex, '')
            .replace(trailingNewlineRegex, '')
            .replace(multiSpaceRegex, ' ')
          if (value === '') {
            el.removeChild(lastChild)
          } else {
            lastChild.nodeValue = value
          }
        } else if (VERBATIM_TAGS.indexOf(nodeName) === -1) {
          // The very first node in the list should not have leading
          // whitespace. Sibling text nodes should have whitespace if there
          // was any.
          leader = i === 0 ? '' : ' '
          value = lastChild.nodeValue
            .replace(leadingNewlineRegex, leader)
            .replace(leadingSpaceRegex, ' ')
            .replace(trailingSpaceRegex, '')
            .replace(trailingNewlineRegex, '')
            .replace(multiSpaceRegex, ' ')
          lastChild.nodeValue = value
        }
      }

    // Iterate over DOM nodes
    } else if (node && node.nodeType) {
      // If the last node was a text node, make sure it is properly closed out
      if (hadText) {
        hadText = false

        // Trim the child text nodes if the current node isn't a
        // text node or a code node
        if (TEXT_TAGS.indexOf(nodeName) === -1 &&
          VERBATIM_TAGS.indexOf(nodeName) === -1) {
          value = lastChild.nodeValue
            .replace(leadingNewlineRegex, '')
            .replace(trailingNewlineRegex, '')
            .replace(multiSpaceRegex, ' ')

          // Remove empty text nodes, append otherwise
          if (value === '') {
            el.removeChild(lastChild)
          } else {
            lastChild.nodeValue = value
          }
        // Trim the child nodes if the current node is not a node
        // where all whitespace must be preserved
        } else if (VERBATIM_TAGS.indexOf(nodeName) === -1) {
          value = lastChild.nodeValue
            .replace(leadingSpaceRegex, ' ')
            .replace(leadingNewlineRegex, '')
            .replace(trailingNewlineRegex, '')
            .replace(multiSpaceRegex, ' ')
          lastChild.nodeValue = value
        }
      }

      // Store the last nodename
      var _nodeName = node.nodeName
      if (_nodeName) nodeName = _nodeName.toLowerCase()

      // Append the node to the DOM
      el.appendChild(node)
    }
  }
}

},{}],2:[function(require,module,exports){
var hyperx = require('hyperx')
var appendChild = require('./appendChild')

var SVGNS = 'http://www.w3.org/2000/svg'
var XLINKNS = 'http://www.w3.org/1999/xlink'

var BOOL_PROPS = [
  'autofocus', 'checked', 'defaultchecked', 'disabled', 'formnovalidate',
  'indeterminate', 'readonly', 'required', 'selected', 'willvalidate'
]

var COMMENT_TAG = '!--'

var SVG_TAGS = [
  'svg', 'altGlyph', 'altGlyphDef', 'altGlyphItem', 'animate', 'animateColor',
  'animateMotion', 'animateTransform', 'circle', 'clipPath', 'color-profile',
  'cursor', 'defs', 'desc', 'ellipse', 'feBlend', 'feColorMatrix',
  'feComponentTransfer', 'feComposite', 'feConvolveMatrix',
  'feDiffuseLighting', 'feDisplacementMap', 'feDistantLight', 'feFlood',
  'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage',
  'feMerge', 'feMergeNode', 'feMorphology', 'feOffset', 'fePointLight',
  'feSpecularLighting', 'feSpotLight', 'feTile', 'feTurbulence', 'filter',
  'font', 'font-face', 'font-face-format', 'font-face-name', 'font-face-src',
  'font-face-uri', 'foreignObject', 'g', 'glyph', 'glyphRef', 'hkern', 'image',
  'line', 'linearGradient', 'marker', 'mask', 'metadata', 'missing-glyph',
  'mpath', 'path', 'pattern', 'polygon', 'polyline', 'radialGradient', 'rect',
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
      if (BOOL_PROPS.indexOf(key) !== -1) {
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

  appendChild(el, children)
  return el
}

module.exports = hyperx(belCreateElement, {comments: true})
module.exports.default = module.exports
module.exports.createElement = belCreateElement

},{"./appendChild":1,"hyperx":4}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
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
        if (xstate === OPEN) {
          if (reg === '/') {
            p.push([ OPEN, '/', arg ])
            reg = ''
          } else {
            p.push([ OPEN, arg ])
          }
        } else if (xstate === COMMENT && opts.comments) {
          reg += String(arg)
        } else if (xstate !== COMMENT) {
          p.push([ VAR, xstate, arg ])
        }
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
      if (opts.createFragment) return opts.createFragment(tree[2])
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
          if (state === OPEN && reg.length) {
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
            res.push([ATTR_VALUE,reg.substr(0, reg.length - 1)])
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
        } else if (state === OPEN && c === '/' && reg.length) {
          // no-op, self closing tag without a space <br/>
        } else if (state === OPEN && /\s/.test(c)) {
          if (reg.length) {
            res.push([OPEN, reg])
          }
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
    else if (x === null || x === undefined) return x
    else return concat('', x)
  }
}

function quot (state) {
  return state === ATTR_VALUE_SQ || state === ATTR_VALUE_DQ
}

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

},{"hyperscript-attribute-to-property":3}],5:[function(require,module,exports){
"use strict";

module.exports = {
  "entityList": "https://duckduckgo.com/contentblocking.js?l=entitylist2",
  "entityMap": "data/tracker_lists/entityMap.json",
  "displayCategories": ["Analytics", "Advertising", "Social Network"],
  "requestListenerTypes": ["main_frame", "sub_frame", "stylesheet", "script", "image", "object", "xmlhttprequest", "other"],
  "feedbackUrl": "https://duckduckgo.com/feedback.js?type=extension-feedback",
  "tosdrMessages": {
    "A": "Good",
    "B": "Mixed",
    "C": "Poor",
    "D": "Poor",
    "E": "Poor",
    "good": "Good",
    "bad": "Poor",
    "unknown": "Unknown",
    "mixed": "Mixed"
  },
  "httpsService": "https://duckduckgo.com/smarter_encryption.js",
  "duckDuckGoSerpHostname": "duckduckgo.com",
  "httpsMessages": {
    "secure": "Encrypted Connection",
    "upgraded": "Forced Encryption",
    "none": "Unencrypted Connection"
  },

  /**
   * Major tracking networks data:
   * percent of the top 1 million sites a tracking network has been seen on.
   * see: https://webtransparency.cs.princeton.edu/webcensus/
   */
  "majorTrackingNetworks": {
    "google": 84,
    "facebook": 36,
    "twitter": 16,
    "amazon": 14,
    "appnexus": 10,
    "oracle": 10,
    "mediamath": 9,
    "oath": 9,
    "maxcdn": 7,
    "automattic": 7
  },

  /*
   * Mapping entity names to CSS class name for popup icons
   */
  "entityIconMapping": {
    "Google LLC": "google",
    "Facebook, Inc.": "facebook",
    "Twitter, Inc.": "twitter",
    "Amazon Technologies, Inc.": "amazon",
    "AppNexus, Inc.": "appnexus",
    "MediaMath, Inc.": "mediamath",
    "StackPath, LLC": "maxcdn",
    "Automattic, Inc.": "automattic",
    "Adobe Inc.": "adobe",
    "Quantcast Corporation": "quantcast",
    "The Nielsen Company": "nielsen"
  },
  "httpsDBName": "https",
  "httpsLists": [{
    "type": "upgrade bloom filter",
    "name": "httpsUpgradeBloomFilter",
    "url": "https://staticcdn.duckduckgo.com/https/https-bloom.json"
  }, {
    "type": "don\'t upgrade bloom filter",
    "name": "httpsDontUpgradeBloomFilters",
    "url": "https://staticcdn.duckduckgo.com/https/negative-https-bloom.json"
  }, {
    "type": "upgrade safelist",
    "name": "httpsUpgradeList",
    "url": "https://staticcdn.duckduckgo.com/https/negative-https-whitelist.json"
  }, {
    "type": "don\'t upgrade safelist",
    "name": "httpsDontUpgradeList",
    "url": "https://staticcdn.duckduckgo.com/https/https-whitelist.json"
  }],
  "tdsLists": [{
    "name": "surrogates",
    "url": "/data/surrogates.txt",
    "format": "text",
    "source": "local"
  }, {
    "name": "tds",
    "url": "https://staticcdn.duckduckgo.com/trackerblocking/v2.1/tds.json",
    "format": "json",
    "source": "external",
    "channels": {
      "live": "https://staticcdn.duckduckgo.com/trackerblocking/v2.1/tds.json",
      "next": "https://staticcdn.duckduckgo.com/trackerblocking/v2.1/tds-next.json",
      "beta": "https://staticcdn.duckduckgo.com/trackerblocking/beta/tds.json"
    }
  }, {
    "name": "ClickToLoadConfig",
    "url": "https://staticcdn.duckduckgo.com/useragents/social_ctp_configuration.json",
    "format": "json",
    "source": "external"
  }, {
    "name": "config",
    "url": "https://staticcdn.duckduckgo.com/trackerblocking/config/v1/extension-config.json",
    "format": "json",
    "source": "external"
  }],
  "httpsErrorCodes": {
    "net::ERR_CONNECTION_REFUSED": 1,
    "net::ERR_ABORTED": 2,
    "net::ERR_SSL_PROTOCOL_ERROR": 3,
    "net::ERR_SSL_VERSION_OR_CIPHER_MISMATCH": 4,
    "net::ERR_NAME_NOT_RESOLVED": 5,
    "NS_ERROR_CONNECTION_REFUSED": 6,
    "NS_ERROR_UNKNOWN_HOST": 7,
    "An additional policy constraint failed when validating this certificate.": 8,
    "Unable to communicate securely with peer: requested domain name does not match the server’s certificate.": 9,
    "Cannot communicate securely with peer: no common encryption algorithm(s).": 10,
    "SSL received a record that exceeded the maximum permissible length.": 11,
    "The certificate is not trusted because it is self-signed.": 12,
    "downgrade_redirect_loop": 13
  }
};

},{}],6:[function(require,module,exports){
"use strict";

module.exports = {
  "extensionIsEnabled": true,
  "socialBlockingIsEnabled": false,
  "trackerBlockingEnabled": true,
  "httpsEverywhereEnabled": true,
  "embeddedTweetsEnabled": false,
  "GPC": true,
  "meanings": true,
  "advanced_options": true,
  "last_search": "",
  "lastsearch_enabled": true,
  "safesearch": true,
  "use_post": false,
  "ducky": false,
  "dev": false,
  "zeroclick_google_right": false,
  "version": null,
  "atb": null,
  "set_atb": null,
  "trackersWhitelistTemporary-etag": null,
  "trackersWhitelist-etag": null,
  "surrogateList-etag": null,
  "httpsUpgradeBloomFilter-etag": null,
  "httpsDontUpgradeBloomFilters-etag": null,
  "httpsUpgradeList-etag": null,
  "httpsDontUpgradeList-etag": null,
  "hasSeenPostInstall": false,
  "extiSent": false,
  "failedUpgrades": 0,
  "totalUpgrades": 0,
  "tds-etag": null,
  "surrogates-etag": null,
  "brokenSiteList-etag": null,
  "lastTdsUpdate": 0
};

},{}],7:[function(require,module,exports){
"use strict";

var RELEASE_EXTENSION_IDS = ['caoacbimdbbljakfhgikoodekdnlcgpk', // edge store
'bkdgflcldnnnapblkhphbgpggdiikppg', // chrome store
'jid1-ZAdIEUB7XOzOJw@jetpack' // firefox
];
var IS_BETA = RELEASE_EXTENSION_IDS.indexOf(chrome.runtime.id) === -1;
module.exports = {
  IS_BETA: IS_BETA
};

},{}],8:[function(require,module,exports){
"use strict";

var _require = require('./settings.es6'),
    getSetting = _require.getSetting,
    updateSetting = _require.updateSetting;

var REFETCH_ALIAS_ALARM = 'refetchAlias'; // Keep track of the number of attempted fetches. Stop trying after 5.

var attempts = 1;

var fetchAlias = function fetchAlias() {
  // if another fetch was previously scheduled, clear that and execute now
  chrome.alarms.get(REFETCH_ALIAS_ALARM, function () {
    return chrome.alarms.clear(REFETCH_ALIAS_ALARM);
  });
  var userData = getSetting('userData');
  if (!(userData !== null && userData !== void 0 && userData.token)) return;
  return fetch('https://quack.duckduckgo.com/api/email/addresses', {
    method: 'post',
    headers: {
      Authorization: "Bearer ".concat(userData.token)
    }
  }).then(function (response) {
    if (response.ok) {
      return response.json().then(function (_ref) {
        var address = _ref.address;
        if (!/^[a-z0-9]+$/.test(address)) throw new Error('Invalid address');
        updateSetting('userData', Object.assign(userData, {
          nextAlias: "".concat(address)
        })); // Reset attempts

        attempts = 1;
        return {
          success: true
        };
      });
    } else {
      throw new Error('An error occurred while fetching the alias');
    }
  })["catch"](function (e) {
    // TODO: Do we want to logout if the error is a 401 unauthorized?
    console.log('Error fetching new alias', e); // Don't try fetching more than 5 times in a row

    if (attempts < 5) {
      chrome.alarms.create(REFETCH_ALIAS_ALARM, {
        delayInMinutes: 2
      });
      attempts++;
    } // Return the error so we can handle it


    return {
      error: e
    };
  });
};

var MENU_ITEM_ID = 'ddg-autofill-context-menu-item';

var createAutofillContextMenuItem = function createAutofillContextMenuItem() {
  // Create the contextual menu hidden by default
  chrome.contextMenus.create({
    id: MENU_ITEM_ID,
    title: 'Use Duck Address',
    contexts: ['editable'],
    visible: false,
    onclick: function onclick(info, tab) {
      var userData = getSetting('userData');

      if (userData.nextAlias) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'contextualAutofill',
          alias: userData.nextAlias
        });
      }
    }
  });
};

var showContextMenuAction = function showContextMenuAction() {
  return chrome.contextMenus.update(MENU_ITEM_ID, {
    visible: true
  });
};

var hideContextMenuAction = function hideContextMenuAction() {
  return chrome.contextMenus.update(MENU_ITEM_ID, {
    visible: false
  });
};

var getAddresses = function getAddresses() {
  var userData = getSetting('userData');
  return {
    personalAddress: userData === null || userData === void 0 ? void 0 : userData.userName,
    privateAddress: userData === null || userData === void 0 ? void 0 : userData.nextAlias
  };
};
/**
 * Given a username, returns a valid email address with the duck domain
 * @param {string} address
 * @returns {string}
 */


var formatAddress = function formatAddress(address) {
  return address + '@duck.com';
};
/**
 * Checks formal username validity
 * @param {string} userName
 * @returns {boolean}
 */


var isValidUsername = function isValidUsername(userName) {
  return /^[a-z0-9_]+$/.test(userName);
};
/**
 * Checks formal token validity
 * @param {string} token
 * @returns {boolean}
 */


var isValidToken = function isValidToken(token) {
  return /^[a-z0-9]+$/.test(token);
};

module.exports = {
  REFETCH_ALIAS_ALARM: REFETCH_ALIAS_ALARM,
  fetchAlias: fetchAlias,
  createAutofillContextMenuItem: createAutofillContextMenuItem,
  showContextMenuAction: showContextMenuAction,
  hideContextMenuAction: hideContextMenuAction,
  getAddresses: getAddresses,
  formatAddress: formatAddress,
  isValidUsername: isValidUsername,
  isValidToken: isValidToken
};

},{"./settings.es6":9}],9:[function(require,module,exports){
"use strict";

var defaultSettings = require('../../data/defaultSettings');

var browserWrapper = require('./wrapper.es6');
/**
 * Settings whose defaults can by managed by the system administrator
 */


var MANAGED_SETTINGS = ['hasSeenPostInstall'];
/**
 * Public api
 * Usage:
 * You can use promise callbacks to check readyness before getting and updating
 * settings.ready().then(() => settings.updateSetting('settingName', settingValue))
 */

var settings = {};
var isReady = false;

var _ready = init().then(function () {
  isReady = true;
  console.log('Settings are loaded');
});

function init() {
  return new Promise(function (resolve) {
    buildSettingsFromDefaults();
    buildSettingsFromManagedStorage().then(buildSettingsFromLocalStorage).then(function () {
      return resolve();
    });
  });
}

function ready() {
  return _ready;
}

function buildSettingsFromLocalStorage() {
  return new Promise(function (resolve) {
    browserWrapper.getFromStorage(['settings'], function (results) {
      // copy over saved settings from storage
      if (!results) resolve();
      settings = browserWrapper.mergeSavedSettings(settings, results);
      resolve();
    });
  });
}

function buildSettingsFromManagedStorage() {
  return new Promise(function (resolve) {
    browserWrapper.getFromManagedStorage(MANAGED_SETTINGS, function (results) {
      settings = browserWrapper.mergeSavedSettings(settings, results);
      resolve();
    });
  });
}

function buildSettingsFromDefaults() {
  // initial settings are a copy of default settings
  settings = Object.assign({}, defaultSettings);
}

function syncSettingTolocalStorage() {
  browserWrapper.syncToStorage({
    settings: settings
  });
}

function getSetting(name) {
  if (!isReady) {
    console.warn("Settings: getSetting() Settings not loaded: ".concat(name));
    return;
  } // let all and null return all settings


  if (name === 'all') name = null;

  if (name) {
    return settings[name];
  } else {
    return settings;
  }
}

function updateSetting(name, value) {
  if (!isReady) {
    console.warn("Settings: updateSetting() Setting not loaded: ".concat(name));
    return;
  }

  settings[name] = value;
  syncSettingTolocalStorage();
}

function removeSetting(name) {
  if (!isReady) {
    console.warn("Settings: removeSetting() Setting not loaded: ".concat(name));
    return;
  }

  if (settings[name]) {
    delete settings[name];
    syncSettingTolocalStorage();
  }
}

function logSettings() {
  browserWrapper.getFromStorage(['settings'], function (s) {
    console.log(s.settings);
  });
}

module.exports = {
  getSetting: getSetting,
  updateSetting: updateSetting,
  removeSetting: removeSetting,
  logSettings: logSettings,
  ready: ready
};

},{"../../data/defaultSettings":6,"./wrapper.es6":10}],10:[function(require,module,exports){
"use strict";

var getExtensionURL = function getExtensionURL(path) {
  return chrome.runtime.getURL(path);
};

var getExtensionVersion = function getExtensionVersion() {
  var manifest = window.chrome && chrome.runtime.getManifest();
  return manifest.version;
};

var setBadgeIcon = function setBadgeIcon(badgeData) {
  chrome.browserAction.setIcon(badgeData);
};

var syncToStorage = function syncToStorage(data) {
  chrome.storage.local.set(data, function () {});
};

var getFromStorage = function getFromStorage(key, cb) {
  chrome.storage.local.get(key, function (result) {
    cb(result[key]);
  });
};

var getFromManagedStorage = function getFromManagedStorage(keys, cb) {
  getFromStorage(keys, cb); // chrome.storage.managed.get(keys, (result) => {
  //     if (chrome.runtime.lastError) {
  //         console.warn('Managed storage not available.', browser.runtime.lastError)
  //     }
  //     cb(result || {})
  // })
};

var getExtensionId = function getExtensionId() {
  return chrome.runtime.id;
};

var notifyPopup = function notifyPopup(message) {
  // this can send an error message when the popup is not open. check lastError to hide it
  chrome.runtime.sendMessage(message, function () {
    return chrome.runtime.lastError;
  });
};

var normalizeTabData = function normalizeTabData(tabData) {
  return tabData;
};

var mergeSavedSettings = function mergeSavedSettings(settings, results) {
  return Object.assign(settings, results);
};

var getDDGTabUrls = function getDDGTabUrls() {
  return new Promise(function (resolve) {
    chrome.tabs.query({
      url: 'https://*.duckduckgo.com/*'
    }, function (tabs) {
      tabs = tabs || [];
      tabs.forEach(function (tab) {
        chrome.tabs.insertCSS(tab.id, {
          file: '/public/css/noatb.css'
        });
      });
      resolve(tabs.map(function (tab) {
        return tab.url;
      }));
    });
  });
};

var setUninstallURL = function setUninstallURL(url) {
  chrome.runtime.setUninstallURL(url);
};

var changeTabURL = function changeTabURL(tabId, url) {
  return new Promise(function (resolve) {
    chrome.tabs.update(tabId, {
      url: url
    }, resolve);
  });
};

module.exports = {
  getExtensionURL: getExtensionURL,
  getExtensionVersion: getExtensionVersion,
  setBadgeIcon: setBadgeIcon,
  syncToStorage: syncToStorage,
  getFromStorage: getFromStorage,
  notifyPopup: notifyPopup,
  normalizeTabData: normalizeTabData,
  mergeSavedSettings: mergeSavedSettings,
  getDDGTabUrls: getDDGTabUrls,
  setUninstallURL: setUninstallURL,
  getExtensionId: getExtensionId,
  changeTabURL: changeTabURL,
  getFromManagedStorage: getFromManagedStorage
};

},{}],11:[function(require,module,exports){
"use strict";

var fetch = function fetch(message) {
  return new Promise(function (resolve, reject) {
    window.chrome.runtime.sendMessage(message, function (result) {
      return resolve(result);
    });
  });
};

var backgroundMessage = function backgroundMessage(thisModel) {
  // listen for messages from background and
  // // notify subscribers
  window.chrome.runtime.onMessage.addListener(function (req, sender) {
    if (sender.id !== chrome.runtime.id) return;
    if (req.whitelistChanged) thisModel.send('whitelistChanged');
    if (req.updateTabData) thisModel.send('updateTabData');
    if (req.didResetTrackersData) thisModel.send('didResetTrackersData', req.didResetTrackersData);
    if (req.closePopup) window.close();
  });
};

var getBackgroundTabData = function getBackgroundTabData() {
  return new Promise(function (resolve, reject) {
    fetch({
      getCurrentTab: true
    }).then(function (tab) {
      if (tab) {
        fetch({
          getTab: tab.id
        }).then(function (backgroundTabObj) {
          resolve(backgroundTabObj);
        });
      }
    });
  });
};

var search = function search(url) {
  window.chrome.tabs.create({
    url: "https://duckduckgo.com/?q=".concat(url, "&bext=").concat(window.localStorage.os, "cr")
  });
};

var getExtensionURL = function getExtensionURL(path) {
  return chrome.runtime.getURL(path);
};

var openExtensionPage = function openExtensionPage(path) {
  window.chrome.tabs.create({
    url: getExtensionURL(path)
  });
};

var openOptionsPage = function openOptionsPage(browser) {
  if (browser === 'moz') {
    openExtensionPage('/html/options.html');
    window.close();
  } else {
    window.chrome.runtime.openOptionsPage();
  }
};

var reloadTab = function reloadTab(id) {
  window.chrome.tabs.reload(id);
};

var closePopup = function closePopup() {
  var w = window.chrome.extension.getViews({
    type: 'popup'
  })[0];
  w.close();
};

module.exports = {
  fetch: fetch,
  reloadTab: reloadTab,
  closePopup: closePopup,
  backgroundMessage: backgroundMessage,
  getBackgroundTabData: getBackgroundTabData,
  search: search,
  openOptionsPage: openOptionsPage,
  openExtensionPage: openExtensionPage,
  getExtensionURL: getExtensionURL
};

},{}],12:[function(require,module,exports){
"use strict";

var Parent = window.DDG.base.Model;

function Autocomplete(attrs) {
  Parent.call(this, attrs);
}

Autocomplete.prototype = window.$.extend({}, Parent.prototype, {
  modelName: 'autocomplete',
  fetchSuggestions: function fetchSuggestions(searchText) {
    var _this = this;

    return new Promise(function (resolve, reject) {
      // TODO: ajax call here to ddg autocomplete service
      // for now we'll just mock up an async xhr query result:
      _this.suggestions = ["".concat(searchText, " world"), "".concat(searchText, " united"), "".concat(searchText, " famfam")];
      resolve();
    });
  }
});
module.exports = Autocomplete;

},{}],13:[function(require,module,exports){
"use strict";

var Parent = window.DDG.base.Model;

var browserUIWrapper = require('./../base/ui-wrapper.es6.js');
/**
 * Background messaging is done via two methods:
 *
 * 1. Passive messages from background -> backgroundMessage model -> subscribing model
 *
 *  The background sends these messages using chrome.runtime.sendMessage({'name': 'value'})
 *  The backgroundMessage model (here) receives the message and forwards the
 *  it to the global event store via model.send(msg)
 *  Other modules that are subscribed to state changes in backgroundMessage are notified
 *
 * 2. Two-way messaging using this.model.fetch() as a passthrough
 *
 *  Each model can use a fetch method to send and receive a response from the background.
 *  Ex: this.model.fetch({'name': 'value'}).then((response) => console.log(response))
 *  Listeners must be registered in the background to respond to messages with this 'name'.
 *
 *  The common fetch method is defined in base/model.es6.js
 */


function BackgroundMessage(attrs) {
  Parent.call(this, attrs);
  var thisModel = this;
  browserUIWrapper.backgroundMessage(thisModel);
}

BackgroundMessage.prototype = window.$.extend({}, Parent.prototype, {
  modelName: 'backgroundMessage'
});
module.exports = BackgroundMessage;

},{"./../base/ui-wrapper.es6.js":11}],14:[function(require,module,exports){
"use strict";

var Parent = window.DDG.base.Model;

function EmailAliasModel(attrs) {
  attrs = attrs || {};
  Parent.call(this, attrs);
}

EmailAliasModel.prototype = window.$.extend({}, Parent.prototype, {
  modelName: 'emailAlias',
  getUserData: function getUserData() {
    return this.fetch({
      getSetting: {
        name: 'userData'
      }
    }).then(function (userData) {
      return userData;
    });
  },
  logout: function logout() {
    var _this = this;

    return this.fetch({
      logout: true
    }).then(function () {
      return _this.set('userData', undefined);
    });
  }
});
module.exports = EmailAliasModel;

},{}],15:[function(require,module,exports){
"use strict";

var Parent = window.DDG.base.Model;

function HamburgerMenu(attrs) {
  attrs = attrs || {};
  attrs.tabUrl = '';
  Parent.call(this, attrs);
}

HamburgerMenu.prototype = window.$.extend({}, Parent.prototype, {
  modelName: 'hamburgerMenu'
});
module.exports = HamburgerMenu;

},{}],16:[function(require,module,exports){
"use strict";

module.exports = {
  // Fixes cases like "Amazon.com", which break the company icon
  normalizeCompanyName: function normalizeCompanyName(companyName) {
    companyName = companyName || '';
    var normalizedName = companyName.toLowerCase().replace(/\.[a-z]+$/, '');
    return normalizedName;
  }
};

},{}],17:[function(require,module,exports){
"use strict";

var Parent = window.DDG.base.Model;

var browserUIWrapper = require('./../base/ui-wrapper.es6.js');

function Search(attrs) {
  Parent.call(this, attrs);
}

Search.prototype = window.$.extend({}, Parent.prototype, {
  modelName: 'search',
  doSearch: function doSearch(s) {
    this.searchText = s;
    s = encodeURIComponent(s);
    console.log("doSearch() for ".concat(s));
    browserUIWrapper.search(s);
  }
});
module.exports = Search;

},{"./../base/ui-wrapper.es6.js":11}],18:[function(require,module,exports){
"use strict";

var Parent = window.DDG.base.Model;

var normalizeCompanyName = require('./mixins/normalize-company-name.es6');

function SiteCompanyList(attrs) {
  attrs = attrs || {};
  attrs.tab = null;
  attrs.companyListMap = [];
  Parent.call(this, attrs);
}

SiteCompanyList.prototype = window.$.extend({}, Parent.prototype, normalizeCompanyName, {
  modelName: 'siteCompanyList',
  fetchAsyncData: function fetchAsyncData() {
    var _this = this;

    return new Promise(function (resolve, reject) {
      _this.fetch({
        getCurrentTab: true
      }).then(function (tab) {
        if (tab) {
          _this.fetch({
            getTab: tab.id
          }).then(function (bkgTab) {
            _this.tab = bkgTab;
            _this.domain = _this.tab && _this.tab.site ? _this.tab.site.domain : '';

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
    var unknownSameDomainCompany = null; // set trackerlist metadata for list display by company:

    this.companyListMap = companyNames.map(function (companyName) {
      var company = _this2.trackers[companyName];
      var urlsList = company.urls ? Object.keys(company.urls) : []; // Unknown same domain trackers need to be individually fetched and put
      // in the unblocked list

      if (companyName === 'unknown' && _this2.hasUnblockedTrackers(company, urlsList)) {
        unknownSameDomainCompany = _this2.createUnblockedList(company, urlsList);
      } // calc max using pixels instead of % to make margins easier
      // max width: 300 - (horizontal padding in css) = 260


      return {
        name: companyName,
        displayName: company.displayName || companyName,
        normalizedName: _this2.normalizeCompanyName(companyName),
        count: _this2._setCount(company, companyName, urlsList),
        urls: company.urls,
        urlsList: urlsList
      };
    }, this).sort(function (a, b) {
      return b.count - a.count;
    });

    if (unknownSameDomainCompany) {
      this.companyListMap.push(unknownSameDomainCompany);
    }
  },
  // Make ad-hoc unblocked list
  // used to cherry pick unblocked trackers from unknown companies
  // the name is the site domain, count is -2 to show the list at the bottom
  createUnblockedList: function createUnblockedList(company, urlsList) {
    var unblockedTrackers = this.spliceUnblockedTrackers(company, urlsList);
    return {
      name: this.domain,
      iconName: '',
      // we won't have an icon for unknown first party trackers
      count: -2,
      urls: unblockedTrackers,
      urlsList: Object.keys(unblockedTrackers)
    };
  },
  // Return an array of unblocked trackers
  // and remove those entries from the specified company
  // only needed for unknown trackers, so far
  spliceUnblockedTrackers: function spliceUnblockedTrackers(company, urlsList) {
    if (!company || !company.urls || !urlsList) return null;
    return urlsList.filter(function (url) {
      return company.urls[url].isBlocked === false;
    }).reduce(function (unblockedTrackers, url) {
      unblockedTrackers[url] = company.urls[url]; // Update the company urls and urlsList

      delete company.urls[url];
      urlsList.splice(urlsList.indexOf(url), 1);
      return unblockedTrackers;
    }, {});
  },
  // Return true if company has unblocked trackers in the current tab
  hasUnblockedTrackers: function hasUnblockedTrackers(company, urlsList) {
    if (!company || !company.urls || !urlsList) return false;
    return urlsList.some(function (url) {
      return company.urls[url].isBlocked === false;
    });
  },
  // Determines sorting order of the company list
  _setCount: function _setCount(company, companyName, urlsList) {
    var count = company.count; // Unknown trackers, followed by unblocked first party,
    // should be at the bottom of the list

    if (companyName === 'unknown') {
      count = -1;
    } else if (this.hasUnblockedTrackers(company, urlsList)) {
      count = -2;
    }

    return count;
  }
});
module.exports = SiteCompanyList;

},{"./mixins/normalize-company-name.es6":16}],19:[function(require,module,exports){
"use strict";

var Parent = window.DDG.base.Model;

var constants = require('../../../data/constants');

var httpsMessages = constants.httpsMessages;

var browserUIWrapper = require('./../base/ui-wrapper.es6.js'); // for now we consider tracker networks found on more than 7% of sites
// as "major"


var MAJOR_TRACKER_THRESHOLD_PCT = 7;

function Site(attrs) {
  attrs = attrs || {};
  attrs.disabled = true; // disabled by default

  attrs.tab = null;
  attrs.domain = '-';
  attrs.isWhitelisted = false;
  attrs.isAllowlisted = false;
  attrs.isBroken = false;
  attrs.whitelistOptIn = false;
  attrs.isCalculatingSiteRating = true;
  attrs.siteRating = {};
  attrs.httpsState = 'none';
  attrs.httpsStatusText = '';
  attrs.trackersCount = 0; // unique trackers count

  attrs.majorTrackerNetworksCount = 0;
  attrs.totalTrackerNetworksCount = 0;
  attrs.trackerNetworks = [];
  attrs.tosdr = {};
  attrs.isaMajorTrackingNetwork = false;
  Parent.call(this, attrs);
  this.bindEvents([[this.store.subscribe, 'action:backgroundMessage', this.handleBackgroundMsg]]);
}

Site.prototype = window.$.extend({}, Parent.prototype, {
  modelName: 'site',
  getBackgroundTabData: function getBackgroundTabData() {
    var _this = this;

    return new Promise(function (resolve) {
      browserUIWrapper.getBackgroundTabData().then(function (tab) {
        if (tab) {
          _this.set('tab', tab);

          _this.domain = tab.site.domain;

          _this.fetchSiteRating();

          _this.set('tosdr', tab.site.tosdr);

          _this.set('isaMajorTrackingNetwork', tab.site.parentPrevalence >= MAJOR_TRACKER_THRESHOLD_PCT);

          _this.fetch({
            getSetting: {
              name: 'tds-etag'
            }
          }).then(function (etag) {
            return _this.set('tds', etag);
          });
        } else {
          console.debug('Site model: no tab');
        }

        _this.setSiteProperties();

        _this.setHttpsMessage();

        _this.update();

        resolve();
      });
    });
  },
  fetchSiteRating: function fetchSiteRating() {
    var _this2 = this;

    // console.log('[model] fetchSiteRating()')
    if (this.tab) {
      this.fetch({
        getSiteGrade: this.tab.id
      }).then(function (rating) {
        console.log('fetchSiteRating: ', rating);
        if (rating) _this2.update({
          siteRating: rating
        });
      });
    }
  },
  setSiteProperties: function setSiteProperties() {
    if (!this.tab) {
      this.domain = 'new tab'; // tab can be null for firefox new tabs

      this.set({
        isCalculatingSiteRating: false
      });
    } else {
      this.initAllowlisted(this.tab.site.whitelisted);
      this.whitelistOptIn = this.tab.site.whitelistOptIn;

      if (this.tab.site.specialDomainName) {
        this.domain = this.tab.site.specialDomainName; // eg "extensions", "options", "new tab"

        this.set({
          isCalculatingSiteRating: false
        });
      } else {
        this.set({
          disabled: false
        });
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

    this.httpsStatusText = httpsMessages[this.httpsState];
  },
  handleBackgroundMsg: function handleBackgroundMsg(message) {
    var _this3 = this;

    // console.log('[model] handleBackgroundMsg()')
    if (!this.tab) return;

    if (message.action && message.action === 'updateTabData') {
      this.fetch({
        getTab: this.tab.id
      }).then(function (backgroundTabObj) {
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
      // got siteRating back from background process
      if (ops && ops.siteRating && ops.siteRating.site && ops.siteRating.enhanced) {
        var before = ops.siteRating.site.grade;
        var after = ops.siteRating.enhanced.grade; // we don't currently show D- grades

        if (before === 'D-') before = 'D';
        if (after === 'D-') after = 'D';

        if (before !== this.siteRating.before || after !== this.siteRating.after) {
          var newSiteRating = {
            cssBefore: before.replace('+', '-plus').toLowerCase(),
            cssAfter: after.replace('+', '-plus').toLowerCase(),
            before: before,
            after: after
          };
          this.set({
            siteRating: newSiteRating,
            isCalculatingSiteRating: false
          });
        } else if (this.isCalculatingSiteRating) {
          // got site rating from background process
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

      if (this.trackerNetworks.length === 0 || newTrackerNetworks.length !== this.trackerNetworks.length) {
        this.set('trackerNetworks', newTrackerNetworks);
      }

      var newUnknownTrackersCount = this.getUnknownTrackersCount();
      var newTotalTrackerNetworksCount = newUnknownTrackersCount + newTrackerNetworks.length;

      if (newTotalTrackerNetworksCount !== this.totalTrackerNetworksCount) {
        this.set('totalTrackerNetworksCount', newTotalTrackerNetworksCount);
      }

      var newMajorTrackerNetworksCount = this.getMajorTrackerNetworksCount();

      if (newMajorTrackerNetworksCount !== this.majorTrackerNetworksCount) {
        this.set('majorTrackerNetworksCount', newMajorTrackerNetworksCount);
      }
    }
  },
  getUniqueTrackersCount: function getUniqueTrackersCount() {
    var _this4 = this;

    // console.log('[model] getUniqueTrackersCount()')
    var count = Object.keys(this.tab.trackers).reduce(function (total, name) {
      return _this4.tab.trackers[name].count + total;
    }, 0);
    return count;
  },
  getUniqueTrackersBlockedCount: function getUniqueTrackersBlockedCount() {
    var _this5 = this;

    // console.log('[model] getUniqueTrackersBlockedCount()')
    var count = Object.keys(this.tab.trackersBlocked).reduce(function (total, name) {
      var companyBlocked = _this5.tab.trackersBlocked[name]; // Don't throw a TypeError if urls are not there

      var trackersBlocked = companyBlocked.urls ? Object.keys(companyBlocked.urls) : null; // Counting unique URLs instead of using the count
      // because the count refers to all requests rather than unique number of trackers

      var trackersBlockedCount = trackersBlocked ? trackersBlocked.length : 0;
      return trackersBlockedCount + total;
    }, 0);
    return count;
  },
  getUnknownTrackersCount: function getUnknownTrackersCount() {
    // console.log('[model] getUnknownTrackersCount()')
    var unknownTrackers = this.tab.trackers ? this.tab.trackers.unknown : {};
    var count = 0;

    if (unknownTrackers && unknownTrackers.urls) {
      var unknownTrackersUrls = Object.keys(unknownTrackers.urls);
      count = unknownTrackersUrls ? unknownTrackersUrls.length : 0;
    }

    return count;
  },
  getMajorTrackerNetworksCount: function getMajorTrackerNetworksCount() {
    // console.log('[model] getMajorTrackerNetworksCount()')
    // Show only blocked major trackers count, unless site is whitelisted
    var trackers = this.isAllowlisted ? this.tab.trackers : this.tab.trackersBlocked;
    var count = Object.values(trackers).reduce(function (total, t) {
      var isMajor = t.prevalence > MAJOR_TRACKER_THRESHOLD_PCT;
      total += isMajor ? 1 : 0;
      return total;
    }, 0);
    return count;
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
  initAllowlisted: function initAllowlisted(value) {
    this.isWhitelisted = value;
    this.isBroken = this.tab.site.isBroken || this.tab.site.brokenFeatures.includes('contentBlocking');
    this.isAllowlisted = this.isBroken || this.isWhitelisted;
  },
  toggleWhitelist: function toggleWhitelist() {
    if (this.tab && this.tab.site) {
      this.initAllowlisted(!this.isWhitelisted);
      this.set('whitelisted', this.isWhitelisted);
      var whitelistOnOrOff = this.isWhitelisted ? 'off' : 'on'; // fire ept.on pixel if just turned privacy protection on,
      // fire ept.off pixel if just turned privacy protection off.

      if (whitelistOnOrOff === 'on' && this.whitelistOptIn) {
        // If user reported broken site and opted to share data on site,
        // attach domain and path to ept.on pixel if they turn privacy protection back on.
        var siteUrl = this.tab.url.split('?')[0].split('#')[0];
        this.set('whitelistOptIn', false);
        this.fetch({
          firePixel: ['ept', 'on', {
            siteUrl: encodeURIComponent(siteUrl)
          }]
        });
        this.fetch({
          whitelistOptIn: {
            list: 'whitelistOptIn',
            domain: this.tab.site.domain,
            value: false
          }
        });
      } else {
        this.fetch({
          firePixel: ['ept', whitelistOnOrOff]
        });
      }

      this.fetch({
        whitelisted: {
          list: 'whitelisted',
          domain: this.tab.site.domain,
          value: this.isWhitelisted
        }
      });
    }
  },
  submitBreakageForm: function submitBreakageForm(category) {
    if (!this.tab) return;
    var blockedTrackers = [];
    var surrogates = [];
    var upgradedHttps = this.tab.upgradedHttps; // remove params and fragments from url to avoid including sensitive data

    var siteUrl = this.tab.url.split('?')[0].split('#')[0];
    var trackerObjects = this.tab.trackersBlocked;
    var pixelParams = ['epbf', {
      category: category
    }, {
      siteUrl: encodeURIComponent(siteUrl)
    }, {
      upgradedHttps: upgradedHttps.toString()
    }, {
      tds: this.tds
    }];

    var _loop = function _loop(tracker) {
      var trackerDomains = trackerObjects[tracker].urls;
      Object.keys(trackerDomains).forEach(function (domain) {
        if (trackerDomains[domain].isBlocked) {
          blockedTrackers.push(domain);

          if (trackerDomains[domain].reason === 'matched rule - surrogate') {
            surrogates.push(domain);
          }
        }
      });
    };

    for (var tracker in trackerObjects) {
      _loop(tracker);
    }

    pixelParams.push({
      blockedTrackers: blockedTrackers
    }, {
      surrogates: surrogates
    });
    this.fetch({
      firePixel: pixelParams
    }); // remember that user opted into sharing site breakage data
    // for this domain, so that we can attach domain when they
    // remove site from whitelist

    this.set('whitelistOptIn', true);
    this.fetch({
      whitelistOptIn: {
        list: 'whitelistOptIn',
        domain: this.tab.site.domain,
        value: true
      }
    });
  }
});
module.exports = Site;

},{"../../../data/constants":5,"./../base/ui-wrapper.es6.js":11}],20:[function(require,module,exports){
"use strict";

var Parent = window.DDG.base.Model;

var normalizeCompanyName = require('./mixins/normalize-company-name.es6');

function TopBlocked(attrs) {
  attrs = attrs || {}; // eslint-disable-next-line no-self-assign

  attrs.numCompanies = attrs.numCompanies;
  attrs.companyList = [];
  attrs.companyListMap = [];
  attrs.pctPagesWithTrackers = null;
  attrs.lastStatsResetDate = null;
  Parent.call(this, attrs);
}

TopBlocked.prototype = window.$.extend({}, Parent.prototype, normalizeCompanyName, {
  modelName: 'topBlocked',
  getTopBlocked: function getTopBlocked() {
    var _this = this;

    return new Promise(function (resolve, reject) {
      _this.fetch({
        getTopBlockedByPages: _this.numCompanies
      }).then(function (data) {
        if (!data.totalPages || data.totalPages < 30) return resolve();
        if (!data.topBlocked || data.topBlocked.length < 1) return resolve();
        _this.companyList = data.topBlocked;
        _this.companyListMap = _this.companyList.map(function (company) {
          return {
            name: company.name,
            displayName: company.displayName,
            normalizedName: _this.normalizeCompanyName(company.name),
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

},{"./mixins/normalize-company-name.es6":16}],21:[function(require,module,exports){
"use strict";

module.exports = {
  setBrowserClassOnBodyTag: require('./set-browser-class.es6.js'),
  parseQueryString: require('./parse-query-string.es6.js')
};

},{"./parse-query-string.es6.js":22,"./set-browser-class.es6.js":23}],22:[function(require,module,exports){
"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

module.exports = {
  parseQueryString: function parseQueryString(qs) {
    if (typeof qs !== 'string') {
      throw new Error('tried to parse a non-string query string');
    }

    var parsed = {};

    if (qs[0] === '?') {
      qs = qs.substr(1);
    }

    var parts = qs.split('&');
    parts.forEach(function (part) {
      var _part$split = part.split('='),
          _part$split2 = _slicedToArray(_part$split, 2),
          key = _part$split2[0],
          val = _part$split2[1];

      if (key && val) {
        parsed[key] = val;
      }
    });
    return parsed;
  }
};

},{}],23:[function(require,module,exports){
"use strict";

module.exports = {
  setBrowserClassOnBodyTag: function setBrowserClassOnBodyTag() {
    window.chrome.runtime.sendMessage({
      getBrowser: true
    }, function (browser) {
      if (['edg', 'edge', 'brave'].includes(browser)) {
        browser = 'chrome';
      } // TEMPORARY FIX FOR SAFARI


      if (browser === undefined) browser = 'chrome';
      var browserClass = 'is-browser--' + browser;
      window.$('html').addClass(browserClass);
      window.$('body').addClass(browserClass);
    });
  }
};

},{}],24:[function(require,module,exports){
"use strict";

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

var EmailAliasView = require('../views/email-alias.es6.js');

var EmailAliasModel = require('../models/email-alias.es6.js');

var EmailAliasTemplate = require('../templates/email-alias.es6.js');

function Trackers(ops) {
  this.$parent = window.$('#popup-container');
  Parent.call(this, ops);
}

Trackers.prototype = window.$.extend({}, Parent.prototype, mixins.setBrowserClassOnBodyTag, {
  pageName: 'popup',
  ready: function ready() {
    Parent.prototype.ready.call(this);
    this.message = new BackgroundMessageModel();
    this.setBrowserClassOnBodyTag();
    this.views.search = new SearchView({
      pageView: this,
      model: new SearchModel({
        searchText: ''
      }),
      appendTo: window.$('#search-form-container'),
      template: searchTemplate
    });
    this.views.hamburgerMenu = new HamburgerMenuView({
      pageView: this,
      model: new HamburgerMenuModel(),
      appendTo: window.$('#hamburger-menu-container'),
      template: hamburgerMenuTemplate
    });
    this.views.site = new SiteView({
      pageView: this,
      model: new SiteModel(),
      appendTo: window.$('#site-info-container'),
      template: siteTemplate
    });
    this.views.topblocked = new TopBlockedView({
      pageView: this,
      model: new TopBlockedModel({
        numCompanies: 3
      }),
      appendTo: window.$('#top-blocked-container'),
      template: topBlockedTemplate
    });
    this.views.emailAlias = new EmailAliasView({
      pageView: this,
      model: new EmailAliasModel(),
      appendTo: window.$('#email-alias-container'),
      template: EmailAliasTemplate
    }); // TODO: hook up model query to actual ddg ac endpoint.
    // For now this is just here to demonstrate how to
    // listen to another component via model.set() +
    // store.subscribe()

    this.views.autocomplete = new AutocompleteView({
      pageView: this,
      model: new AutocompleteModel({
        suggestions: []
      }),
      // appendTo: this.views.search.$el,
      appendTo: null,
      template: autocompleteTemplate
    });
  }
}); // kickoff!

window.DDG = window.DDG || {};
window.DDG.page = new Trackers();

},{"../models/email-alias.es6.js":14,"../templates/email-alias.es6.js":27,"../views/email-alias.es6.js":52,"./../models/autocomplete.es6.js":12,"./../models/background-message.es6.js":13,"./../models/hamburger-menu.es6.js":15,"./../models/search.es6.js":17,"./../models/site.es6.js":19,"./../models/top-blocked.es6.js":20,"./../templates/autocomplete.es6.js":25,"./../templates/hamburger-menu.es6.js":29,"./../templates/search.es6.js":31,"./../templates/site.es6.js":44,"./../templates/top-blocked-truncated.es6.js":47,"./../views/autocomplete.es6.js":50,"./../views/hamburger-menu.es6.js":54,"./../views/search.es6.js":58,"./../views/site.es6.js":59,"./../views/top-blocked-truncated.es6.js":61,"./mixins/index.es6.js":21}],25:[function(require,module,exports){
"use strict";

var _templateObject, _templateObject2;

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

module.exports = function () {
  // TODO/REMOVE: remove marginTop style tag once this is actually hooked up
  // this is just to demo model store for now!
  //  -> this is gross, don't do this:
  var marginTop = this.model.suggestions && this.model.suggestions.length > 0 ? 'margin-top: 50px;' : '';
  return bel(_templateObject || (_templateObject = _taggedTemplateLiteral(["<ul class=\"js-autocomplete\" style=\"", "\">\n        ", "\n    </ul>"])), marginTop, this.model.suggestions.map(function (suggestion) {
    return bel(_templateObject2 || (_templateObject2 = _taggedTemplateLiteral(["\n            <li><a href=\"javascript:void(0)\">", "</a></li>"])), suggestion);
  }));
};

},{"bel":2}],26:[function(require,module,exports){
"use strict";

var _templateObject, _templateObject2;

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

var categories = [{
  category: 'Video or images didn\'t load',
  value: 'images'
}, {
  category: 'Content is missing',
  value: 'content'
}, {
  category: 'Links or buttons don\'t work',
  value: 'links'
}, {
  category: 'Can\'t sign in',
  value: 'login'
}, {
  category: 'Site asked me to disable the extension',
  value: 'paywall'
}];

function shuffle(arr) {
  var len = arr.length;
  var temp;
  var index;

  while (len > 0) {
    index = Math.floor(Math.random() * len);
    len--;
    temp = arr[len];
    arr[len] = arr[index];
    arr[index] = temp;
  }

  return arr;
}

module.exports = function () {
  return bel(_templateObject || (_templateObject = _taggedTemplateLiteral(["<div class=\"breakage-form js-breakage-form\">\n    <div class=\"breakage-form__content\">\n        <nav class=\"breakage-form__close-container\">\n            <a href=\"javascript:void(0)\" class=\"icon icon__close js-breakage-form-close\" role=\"button\" aria-label=\"Dismiss form\"></a>\n        </nav>\n        <div class=\"form__icon--wrapper\">\n            <div class=\"form__icon\"></div>\n        </div>\n        <div class=\"breakage-form__element js-breakage-form-element\">\n            <h2 class=\"breakage-form__title\">Something broken?</h2>\n            <div class=\"breakage-form__explanation\">Submitting an anonymous broken site report helps us debug these issues and improve the extension.</div>\n            <div class=\"form__select breakage-form__input--dropdown\">\n                <select class=\"js-breakage-form-dropdown\">\n                    <option value='unspecified' disabled selected>Select a category (optional)</option>\n                    ", "\n                    <option value='other'>Something else</option>\n                </select>\n            </div>\n            <btn class=\"form__submit js-breakage-form-submit\" role=\"button\">Send report</btn>\n            <div class=\"breakage-form__footer\">Reports sent to DuckDuckGo are 100% anonymous and only include your selection above, the URL, and a list of trackers we found on the site.</div>\n        </div>\n        <div class=\"breakage-form__message js-breakage-form-message is-transparent\">\n            <h2 class=\"breakage-form__success--title\">Thank you!</h2>\n            <div class=\"breakage-form__success--message\">Your report will help improve the extension and make the experience better for other people.</div>\n        </div>\n    </div>\n</div>"])), shuffle(categories).map(function (item) {
    return bel(_templateObject2 || (_templateObject2 = _taggedTemplateLiteral(["<option value=", ">", "</option>"])), item.value, item.category);
  }));
};

},{"bel":2}],27:[function(require,module,exports){
"use strict";

var _templateObject;

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

module.exports = function () {
  if (this.model.userData && this.model.userData.nextAlias) {
    return bel(_templateObject || (_templateObject = _taggedTemplateLiteral(["\n            <div class=\"js-email-alias email-alias-block padded\">\n                <span class=\"email-alias__icon\"></span>\n                <a href=\"#\" class=\"link-secondary bold\">\n                    <span class=\"text-line-after-icon\">\n                        Create new Duck Address\n                        <span class=\"js-alias-copied alias-copied-label\">Copied to clipboard</span>\n                    </span>\n                </a>\n            </div>"])));
  }

  return null;
};

},{"bel":2}],28:[function(require,module,exports){
"use strict";

var _templateObject;

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

var reasons = require('./shared/grade-scorecard-reasons.es6.js');

var grades = require('./shared/grade-scorecard-grades.es6.js');

var ratingHero = require('./shared/rating-hero.es6.js');

module.exports = function () {
  return bel(_templateObject || (_templateObject = _taggedTemplateLiteral(["<section class=\"sliding-subview grade-scorecard sliding-subview--has-fixed-header\">\n    <div class=\"site-info site-info--full-height card\">\n        ", "\n        ", "\n        ", "\n    </div>\n</section>"])), ratingHero(this.model, {
    showClose: true
  }), reasons(this.model), grades(this.model));
};

},{"./shared/grade-scorecard-grades.es6.js":32,"./shared/grade-scorecard-reasons.es6.js":33,"./shared/rating-hero.es6.js":37,"bel":2}],29:[function(require,module,exports){
"use strict";

var _templateObject;

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

module.exports = function () {
  return bel(_templateObject || (_templateObject = _taggedTemplateLiteral(["<nav class=\"hamburger-menu js-hamburger-menu is-hidden\">\n    <div class=\"hamburger-menu__bg\"></div>\n    <div class=\"hamburger-menu__content card padded\">\n        <h2 class=\"menu-title border--bottom hamburger-menu__content__more-options\">\n            More options\n        </h2>\n        <nav class=\"pull-right hamburger-menu__close-container\">\n            <a href=\"javascript:void(0)\" class=\"icon icon__close js-hamburger-menu-close\" role=\"button\" aria-label=\"Close options\"></a>\n        </nav>\n        <ul class=\"hamburger-menu__links padded default-list\">\n            <li>\n                <a href=\"javascript:void(0)\" class=\"menu-title js-hamburger-menu-options-link\">\n                    Settings\n                    <span>Manage Unprotected Sites and other options.</span>\n                </a>\n            </li>\n            <li>\n                <a href=\"javascript:void(0)\" class=\"menu-title js-hamburger-menu-feedback-link\">\n                    Share feedback\n                    <span>Got issues or suggestions? Let us know!</span>\n                </a>\n            </li>\n            <li>\n                <a href=\"javascript:void(0)\" class=\"menu-title js-hamburger-menu-broken-site-link\">\n                    Report broken site\n                    <span>If a site's not working, please tell us.</span>\n                </a>\n            </li>\n            <li class=\"is-hidden\" id=\"debugger-panel\">\n                <a href=\"javascript:void(0)\" class=\"menu-title js-hamburger-menu-debugger-panel-link\">\n                    Protection debugger panel\n                    <span>Debug privacy protections on a page.</span>\n                </a>\n            </li>\n        </ul>\n    </div>\n</nav>"])));
};

},{"bel":2}],30:[function(require,module,exports){
"use strict";

var _templateObject, _templateObject2;

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

var hero = require('./shared/hero.es6.js');

var statusList = require('./shared/status-list.es6.js');

var constants = require('../../../data/constants');

var link = require('./shared/link.es6.js');

function upperCaseFirst(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

module.exports = function () {
  var domain = this.model && this.model.domain;
  var tosdr = this.model && this.model.tosdr;
  var tosdrMsg = tosdr && tosdr.message || constants.tosdrMessages.unknown;
  var tosdrStatus = tosdrMsg.toLowerCase();
  return bel(_templateObject || (_templateObject = _taggedTemplateLiteral(["<section class=\"sliding-subview sliding-subview--has-fixed-header\">\n    <div class=\"privacy-practices site-info site-info--full-height card\">\n        <div class=\"js-privacy-practices-hero\">\n            ", "\n        </div>\n        <div class=\"privacy-practices__explainer padded border--bottom--inner\n            text--center\">\n            Privacy practices indicate how much the personal information\n            that you share with a website is protected.\n        </div>\n        <div class=\"privacy-practices__details padded\n            js-privacy-practices-details\">\n            ", "\n        </div>\n        <div class=\"privacy-practices__attrib padded text--center border--top--inner\">\n            Privacy Practices from ", ".\n        </div>\n    </div>\n</section>"])), hero({
    status: tosdrStatus,
    title: domain,
    subtitle: "".concat(tosdrMsg, " Privacy Practices"),
    showClose: true
  }), tosdr && tosdr.reasons ? renderDetails(tosdr.reasons) : renderNoDetails(), link('https://tosdr.org/', {
    className: 'bold',
    target: '_blank',
    text: 'ToS;DR',
    attributes: {
      'aria-label': 'Terms of Service; Didn\'t Read'
    }
  }));
};

function renderDetails(reasons) {
  var good = reasons.good || [];
  var bad = reasons.bad || [];
  if (!good.length && !bad.length) return renderNoDetails(); // convert arrays to work for the statusList template,
  // which use objects

  good = good.map(function (item) {
    return {
      msg: upperCaseFirst(item),
      modifier: 'good'
    };
  });
  bad = bad.map(function (item) {
    return {
      msg: upperCaseFirst(item),
      modifier: 'bad'
    };
  }); // list good first, then bad

  return statusList(good.concat(bad));
}

function renderNoDetails() {
  return bel(_templateObject2 || (_templateObject2 = _taggedTemplateLiteral(["<div class=\"text--center\">\n    <h1 class=\"privacy-practices__details__title\">\n        No privacy practices found\n    </h1>\n    <div class=\"privacy-practices__details__msg\">\n        The privacy practices of this website have not been reviewed.\n    </div>\n</div>"])));
}

},{"../../../data/constants":5,"./shared/hero.es6.js":35,"./shared/link.es6.js":36,"./shared/status-list.es6.js":39,"bel":2}],31:[function(require,module,exports){
"use strict";

var _templateObject;

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

var hamburgerButton = require('./shared/hamburger-button.es6.js');

module.exports = function () {
  return bel(_templateObject || (_templateObject = _taggedTemplateLiteral(["\n    <form class=\"sliding-subview__header search-form js-search-form\" name=\"x\">\n        <input type=\"text\" autocomplete=\"off\" placeholder=\"Search DuckDuckGo\"\n            name=\"q\" class=\"search-form__input js-search-input\"\n            value=\"", "\" />\n        <input class=\"search-form__go js-search-go\" value=\"\" type=\"submit\" aria-label=\"Search\" />\n        ", "\n    </form>"])), this.model.searchText, hamburgerButton('js-search-hamburger-button'));
};

},{"./shared/hamburger-button.es6.js":34,"bel":2}],32:[function(require,module,exports){
"use strict";

var statusList = require('./status-list.es6.js');

module.exports = function (site) {
  var grades = getGrades(site.siteRating, site.isAllowlisted);
  if (!grades || !grades.length) return;
  return statusList(grades, 'status-list--right padded js-grade-scorecard-grades');
};

function getGrades(rating, isAllowlisted) {
  if (!rating || !rating.before || !rating.after) return; // transform site ratings into grades
  // that the template can display more easily

  var before = rating.cssBefore;
  var after = rating.cssAfter;
  var grades = [];
  grades.push({
    msg: 'Privacy Grade',
    modifier: before.toLowerCase()
  });

  if (before !== after && !isAllowlisted) {
    grades.push({
      msg: 'Enhanced Grade',
      modifier: after.toLowerCase(),
      highlight: true
    });
  }

  return grades;
}

},{"./status-list.es6.js":39}],33:[function(require,module,exports){
"use strict";

var statusList = require('./status-list.es6.js');

var constants = require('../../../../data/constants');

var trackerNetworksText = require('./tracker-networks-text.es6.js');

module.exports = function (site) {
  var reasons = getReasons(site);
  if (!reasons || !reasons.length) return;
  return statusList(reasons, 'status-list--right padded border--bottom--inner js-grade-scorecard-reasons');
};

function getReasons(site) {
  var reasons = []; // grab all the data from the site to create
  // a list of reasons behind the grade
  // encryption status

  var httpsState = site.httpsState;

  if (httpsState) {
    var _modifier = httpsState === 'none' ? 'bad' : 'good';

    reasons.push({
      modifier: _modifier,
      msg: site.httpsStatusText
    });
  } // tracking networks blocked or found,
  // only show a message if there's any


  var trackersCount = site.isAllowlisted ? site.trackersCount : site.trackersBlockedCount;
  var trackersBadOrGood = trackersCount !== 0 ? 'bad' : 'good';
  reasons.push({
    modifier: trackersBadOrGood,
    msg: "".concat(trackerNetworksText(site))
  }); // major tracking networks,
  // only show a message if there are any

  var majorTrackersBadOrGood = site.majorTrackerNetworksCount !== 0 ? 'bad' : 'good';
  reasons.push({
    modifier: majorTrackersBadOrGood,
    msg: "".concat(trackerNetworksText(site, true))
  }); // Is the site itself a major tracking network?
  // only show a message if it is

  if (site.isaMajorTrackingNetwork) {
    reasons.push({
      modifier: 'bad',
      msg: 'Site Is a Major Tracker Network'
    });
  } // privacy practices from tosdr


  var unknownPractices = constants.tosdrMessages.unknown;
  var privacyMessage = site.tosdr && site.tosdr.message || unknownPractices;
  var modifier = privacyMessage === unknownPractices ? 'poor' : privacyMessage.toLowerCase();
  reasons.push({
    modifier: modifier,
    msg: "".concat(privacyMessage, " Privacy Practices")
  });
  return reasons;
}

},{"../../../../data/constants":5,"./status-list.es6.js":39,"./tracker-networks-text.es6.js":43}],34:[function(require,module,exports){
"use strict";

var _templateObject;

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

module.exports = function (klass) {
  klass = klass || '';
  return bel(_templateObject || (_templateObject = _taggedTemplateLiteral(["<button type=\"button\" class=\"hamburger-button ", "\" aria-label=\"More options\">\n    <span></span>\n    <span></span>\n    <span></span>\n</button>"])), klass);
};

},{"bel":2}],35:[function(require,module,exports){
"use strict";

var _templateObject, _templateObject2;

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

module.exports = function (ops) {
  var slidingSubviewClass = ops.showClose ? 'js-sliding-subview-close' : '';
  return bel(_templateObject || (_templateObject = _taggedTemplateLiteral(["<div class=\"hero text--center ", "\">\n    <div class=\"hero__icon hero__icon--", "\">\n    </div>\n    <h1 class=\"hero__title\">\n        ", "\n    </h1>\n    <h2 class=\"hero__subtitle ", "\" aria-label=\"", "\">\n        ", "\n    </h2>\n    ", "\n</div>"])), slidingSubviewClass, ops.status, ops.title, ops.subtitle === '' ? 'is-hidden' : '', ops.subtitleLabel ? ops.subtitleLabel : ops.subtitle, ops.subtitle, renderOpenOrCloseButton(ops.showClose));
};

function renderOpenOrCloseButton(isCloseButton) {
  var openOrClose = isCloseButton ? 'close' : 'open';
  var arrowIconClass = isCloseButton ? 'icon__arrow--left' : '';
  return bel(_templateObject2 || (_templateObject2 = _taggedTemplateLiteral(["<a href=\"javascript:void(0)\"\n        class=\"hero__", "\"\n        role=\"button\"\n        aria-label=\"", "\"\n        >\n    <span class=\"icon icon__arrow icon__arrow--large ", "\">\n    </span>\n</a>"])), openOrClose, isCloseButton ? 'Go back' : 'More details', arrowIconClass);
}

},{"bel":2}],36:[function(require,module,exports){
"use strict";

/* Generates a link tag
 * url: href url
 * options: any a tag attribute
 */
module.exports = function (url, options) {
  var a = document.createElement('a');
  a.href = url; // attributes for the <a> tag, e.g. "aria-label"

  if (options.attributes) {
    for (var attr in options.attributes) {
      a.setAttribute(attr, options.attributes[attr]);
    }

    delete options.attributes;
  }

  for (var key in options) {
    a[key] = options[key];
  }

  return a;
};

},{}],37:[function(require,module,exports){
"use strict";

var _templateObject, _templateObject2, _templateObject3;

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

var hero = require('./hero.es6.js');

module.exports = function (site, ops) {
  var status = siteRatingStatus(site.isCalculatingSiteRating, site.siteRating, site.isAllowlisted);
  var subtitle = siteRatingSubtitle(site.isCalculatingSiteRating, site.siteRating, site.isAllowlisted, site.isBroken);
  var label = subtitleLabel(site.isCalculatingSiteRating, site.siteRating, site.isAllowlisted);
  return bel(_templateObject || (_templateObject = _taggedTemplateLiteral(["<div class=\"rating-hero-container js-rating-hero\">\n     ", "\n</div>"])), hero({
    status: status,
    title: site.domain,
    subtitle: subtitle,
    subtitleLabel: label,
    showClose: ops.showClose,
    showOpen: ops.showOpen
  }));
};

function siteRatingStatus(isCalculating, rating, isAllowlisted) {
  var status;
  var isActive = '';

  if (isCalculating) {
    status = 'calculating';
  } else if (rating && rating.before) {
    isActive = isAllowlisted ? '' : '--active';

    if (isActive && rating.after) {
      status = rating.cssAfter;
    } else {
      status = rating.cssBefore;
    }
  } else {
    status = 'null';
  }

  return status + isActive;
}

function siteRatingSubtitle(isCalculating, rating, isAllowlisted, isBroken) {
  var isActive = true;

  if (isBroken) {
    return '';
  }

  if (isAllowlisted) isActive = false; // site grade/rating was upgraded by extension

  if (isActive && rating && rating.before && rating.after) {
    if (rating.before !== rating.after) {
      // wrap this in a single root span otherwise bel complains
      return bel(_templateObject2 || (_templateObject2 = _taggedTemplateLiteral(["<span>Site enhanced from\n    <span class=\"rating-letter rating-letter--", "\">\n    </span>\n</span>"])), rating.cssBefore);
    }
  } // deal with other states


  var msg = 'Privacy Grade'; // site is whitelisted

  if (!isActive) {
    msg = 'Privacy Protection Disabled'; // "null" state (empty tab, browser's "about:" pages)
  } else if (!isCalculating && !rating.before && !rating.after) {
    msg = 'We only grade regular websites'; // rating is still calculating
  } else if (isCalculating) {
    msg = 'Calculating...';
  }

  return bel(_templateObject3 || (_templateObject3 = _taggedTemplateLiteral(["", ""])), msg);
} // to avoid duplicating messages between the icon and the subtitle,
// we combine information for both here


function subtitleLabel(isCalculating, rating, isAllowlisted) {
  if (isCalculating) return;

  if (isAllowlisted && rating.before) {
    return "Privacy Protection Disabled, Privacy Grade ".concat(rating.before);
  }

  if (rating.before && rating.before === rating.after) {
    return "Privacy Grade ".concat(rating.before);
  }

  if (rating.before && rating.after) {
    return "Site enhanced from ".concat(rating.before);
  }
}

},{"./hero.es6.js":35,"bel":2}],38:[function(require,module,exports){
"use strict";

var _templateObject;

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

var hamburgerButton = require('./hamburger-button.es6.js');

module.exports = function (title) {
  return bel(_templateObject || (_templateObject = _taggedTemplateLiteral(["<nav class=\"sliding-subview__header card\">\n    <a href=\"javascript:void(0)\" class=\"sliding-subview__header__back\n        sliding-subview__header__back--is-icon\n        js-sliding-subview-close\">\n        <span class=\"icon icon__arrow icon__arrow--left pull-left\">\n        </span>\n    </a>\n    <h2 class=\"sliding-subview__header__title\">\n        ", "\n    </h2>\n    ", "\n</nav>"])), title, hamburgerButton());
};

},{"./hamburger-button.es6.js":34,"bel":2}],39:[function(require,module,exports){
"use strict";

var _templateObject, _templateObject2;

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

module.exports = function (items, extraClasses) {
  extraClasses = extraClasses || '';
  return bel(_templateObject || (_templateObject = _taggedTemplateLiteral(["<ul class=\"status-list ", "\">\n    ", "\n</ul>"])), extraClasses, items.map(renderItem));
};

function renderItem(item) {
  return bel(_templateObject2 || (_templateObject2 = _taggedTemplateLiteral(["<li class=\"status-list__item status-list__item--", "\n    bold ", "\">\n    ", "\n</li>"])), item.modifier, item.highlight ? 'is-highlighted' : '', item.msg);
}

},{"bel":2}],40:[function(require,module,exports){
"use strict";

var _templateObject;

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

module.exports = function (isActiveBoolean, klass, dataKey) {
  // make `klass` and `dataKey` optional:
  klass = klass || '';
  dataKey = dataKey || '';
  return bel(_templateObject || (_templateObject = _taggedTemplateLiteral(["\n<button class=\"toggle-button toggle-button--is-active-", " ", "\"\n    data-key=\"", "\"\n    type=\"button\"\n    aria-pressed=\"", "\"\n    >\n    <div class=\"toggle-button__bg\">\n    </div>\n    <div class=\"toggle-button__knob\"></div>\n</button>"])), isActiveBoolean, klass, dataKey, isActiveBoolean ? 'true' : 'false');
};

},{"bel":2}],41:[function(require,module,exports){
"use strict";

var _templateObject;

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

module.exports = function () {
  return bel(_templateObject || (_templateObject = _taggedTemplateLiteral(["<div class=\"top-blocked__no-data\">\n    <div class=\"top-blocked__no-data__graph\">\n        <span class=\"top-blocked__no-data__graph__bar one\"></span>\n        <span class=\"top-blocked__no-data__graph__bar two\"></span>\n        <span class=\"top-blocked__no-data__graph__bar three\"></span>\n        <span class=\"top-blocked__no-data__graph__bar four\"></span>\n    </div>\n    <p class=\"top-blocked__no-data__lead text-center\">Tracker Networks Top Offenders</p>\n    <p>No data available yet</p>\n</div>"])));
};

},{"bel":2}],42:[function(require,module,exports){
"use strict";

var _templateObject;

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

module.exports = function (siteRating, isAllowlisted, totalTrackerNetworksCount) {
  var iconNameModifier = 'blocked';

  if (isAllowlisted && siteRating.before === 'D' && totalTrackerNetworksCount !== 0) {
    iconNameModifier = 'warning';
  }

  var iconName = 'major-networks-' + iconNameModifier;
  return bel(_templateObject || (_templateObject = _taggedTemplateLiteral(["", ""])), iconName);
};

},{"bel":2}],43:[function(require,module,exports){
"use strict";

var _templateObject, _templateObject2;

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

module.exports = function (site, isMajorNetworksCount) {
  // Show all trackers found if site is whitelisted
  // but only show the blocked ones otherwise
  var trackersCount = site.isAllowlisted ? site.trackersCount : site.trackersBlockedCount || 0;
  var uniqueTrackersText = trackersCount === 1 ? ' Tracker ' : ' Trackers ';

  if (isMajorNetworksCount) {
    trackersCount = site.majorTrackerNetworksCount;
    uniqueTrackersText = trackersCount === 1 ? ' Major Tracker Network ' : ' Major Tracker Networks ';
  }

  var finalText = trackersCount + uniqueTrackersText + trackersBlockedOrFound(site, trackersCount);
  return bel(_templateObject || (_templateObject = _taggedTemplateLiteral(["", ""])), finalText);
};

function trackersBlockedOrFound(site, trackersCount) {
  var msg = '';

  if (site && (site.isAllowlisted || trackersCount === 0)) {
    msg = 'Found';
  } else {
    msg = 'Blocked';
  }

  return bel(_templateObject2 || (_templateObject2 = _taggedTemplateLiteral(["", ""])), msg);
}

},{"bel":2}],44:[function(require,module,exports){
"use strict";

var _templateObject, _templateObject2, _templateObject3;

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

var toggleButton = require('./shared/toggle-button.es6.js');

var ratingHero = require('./shared/rating-hero.es6.js');

var trackerNetworksIcon = require('./shared/tracker-network-icon.es6.js');

var trackerNetworksText = require('./shared/tracker-networks-text.es6.js');

var constants = require('../../../data/constants');

module.exports = function () {
  var tosdrMsg = this.model.tosdr && this.model.tosdr.message || constants.tosdrMessages.unknown;
  return bel(_templateObject || (_templateObject = _taggedTemplateLiteral(["<div class=\"site-info site-info--main\">\n    <ul class=\"default-list\">\n        <li class=\"border--bottom site-info__rating-li main-rating js-hero-open\">\n            ", "\n        </li>\n        <li class=\"text--center padded border--bottom warning_bg bold ", "\">\n            We temporarily disabled Privacy Protection as it appears to be breaking this site.\n        </li>\n        <li class=\"site-info__li--https-status padded border--bottom\">\n            <p class=\"site-info__https-status bold\">\n                <span class=\"site-info__https-status__icon\n                    is-", "\">\n                </span>\n                <span class=\"text-line-after-icon\">\n                    ", "\n                </span>\n            </p>\n        </li>\n        <li class=\"js-site-tracker-networks js-site-show-page-trackers site-info__li--trackers padded border--bottom\">\n            <a href=\"javascript:void(0)\" class=\"link-secondary bold\" role=\"button\">\n                ", "\n            </a>\n        </li>\n        <li class=\"js-site-privacy-practices site-info__li--privacy-practices padded border--bottom\">\n            <span class=\"site-info__privacy-practices__icon\n                is-", "\">\n            </span>\n            <a href=\"javascript:void(0)\" class=\"link-secondary bold\" role=\"button\">\n                <span class=\"text-line-after-icon\"> ", " Privacy Practices </span>\n                <span class=\"icon icon__arrow pull-right\"></span>\n            </a>\n        </li>\n        <li class=\"site-info__li--toggle js-site-protection-row padded ", " ", "\">\n            <p class=\"is-transparent site-info__whitelist-status js-site-whitelist-status\">\n                <span class=\"text-line-after-icon privacy-on-off-message bold\">\n                    ", "\n                </span>\n            </p>\n            <p class=\"site-info__protection js-site-protection bold\">Site Privacy Protection</p>\n            <div class=\"site-info__toggle-container\">\n                ", "\n            </div>\n        </li>\n        <li class=\"js-site-manage-whitelist-li site-info__li--manage-whitelist padded ", "\">\n            ", "\n        </li>\n        <li class=\"js-site-confirm-breakage-li site-info__li--confirm-breakage border--bottom padded is-hidden\">\n           <div class=\"js-site-confirm-breakage-message site-info__confirm-thanks is-transparent\">\n                <span class=\"site-info__message\">\n                    Thanks for the feedback!\n                </span>\n            </div>\n            <div class=\"js-site-confirm-breakage site-info--confirm-breakage\">\n                <span class=\"site-info--is-site-broken bold\">\n                    Is this website broken?\n                </span>\n                <btn class=\"js-site-confirm-breakage-yes site-info__confirm-breakage-yes btn-pill\">\n                    Yes\n                </btn>\n                <btn class=\"js-site-confirm-breakage-no site-info__confirm-breakage-no btn-pill\">\n                    No\n                </btn>\n            </div>\n        </li>\n    </ul>\n</div>"])), ratingHero(this.model, {
    showOpen: !this.model.disabled
  }), this.model.isBroken ? '' : 'is-hidden', this.model.httpsState, this.model.httpsStatusText, renderTrackerNetworks(this.model), tosdrMsg.toLowerCase(), tosdrMsg, this.model.isAllowlisted ? '' : 'is-active', this.model.isBroken ? 'is-disabled' : '', setTransitionText(!this.model.isWhitelisted), toggleButton(!this.model.isAllowlisted, 'js-site-toggle pull-right'), this.model.isBroken ? 'is-hidden' : '', renderManageAllowlist(this.model));

  function setTransitionText(isSiteAllowlisted) {
    isSiteAllowlisted = isSiteAllowlisted || false;
    var text = 'Added to Unprotected Sites';

    if (isSiteAllowlisted) {
      text = 'Removed from Unprotected Sites';
    }

    return text;
  }

  function renderTrackerNetworks(model) {
    var isActive = !model.isAllowlisted ? 'is-active' : '';
    return bel(_templateObject2 || (_templateObject2 = _taggedTemplateLiteral(["<a href=\"javascript:void(0)\" class=\"site-info__trackers link-secondary bold\">\n    <span class=\"site-info__trackers-status__icon\n        icon-", "\"></span>\n    <span class=\"", " text-line-after-icon\"> ", " </span>\n    <span class=\"icon icon__arrow pull-right\"></span>\n</a>"])), trackerNetworksIcon(model.siteRating, model.isAllowlisted, model.totalTrackerNetworksCount), isActive, trackerNetworksText(model, false));
  }

  function renderManageAllowlist(model) {
    return bel(_templateObject3 || (_templateObject3 = _taggedTemplateLiteral(["<div>\n    <a href=\"javascript:void(0)\" class=\"js-site-manage-whitelist site-info__manage-whitelist link-secondary bold\">\n        Unprotected Sites\n    </a>\n    <div class=\"separator\"></div>\n    <a href=\"javascript:void(0)\" class=\"js-site-report-broken site-info__report-broken link-secondary bold\">\n        Report broken site\n    </a>\n</div>"])));
  }
};

},{"../../../data/constants":5,"./shared/rating-hero.es6.js":37,"./shared/toggle-button.es6.js":40,"./shared/tracker-network-icon.es6.js":42,"./shared/tracker-networks-text.es6.js":43,"bel":2}],45:[function(require,module,exports){
"use strict";

var _templateObject;

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

module.exports = function (companyListMap) {
  return companyListMap.map(function (data) {
    return bel(_templateObject || (_templateObject = _taggedTemplateLiteral(["<li class=\"top-blocked__li\">\n    <div title=\"", "\" class=\"top-blocked__li__company-name\">", "</div>\n    <div class=\"top-blocked__li__blocker-bar\">\n        <div class=\"top-blocked__li__blocker-bar__fg\n            js-top-blocked-graph-bar-fg\"\n            style=\"width: 0px\" data-width=\"", "\">\n        </div>\n    </div>\n    <div class=\"top-blocked__li__blocker-pct js-top-blocked-pct\">\n        ", "%\n    </div>\n</li>"])), data.name, data.displayName, data.percent, data.percent);
  });
};

},{"bel":2}],46:[function(require,module,exports){
"use strict";

var _templateObject;

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

var constants = require('../../../data/constants');

var entityIconMapping = constants.entityIconMapping;

module.exports = function (companyListMap) {
  return companyListMap.map(function (data) {
    return bel(_templateObject || (_templateObject = _taggedTemplateLiteral(["<span class=\"top-blocked__pill-site__icon ", "\"></span>"])), getScssClass(data.name));
  });

  function getScssClass(companyName) {
    var iconClassName = entityIconMapping[companyName] || 'generic';
    return iconClassName;
  }
};

},{"../../../data/constants":5,"bel":2}],47:[function(require,module,exports){
"use strict";

var _templateObject;

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

var listItems = require('./top-blocked-truncated-list-items.es6.js');

module.exports = function () {
  if (this.model.companyListMap && this.model.companyListMap.length > 0) {
    return bel(_templateObject || (_templateObject = _taggedTemplateLiteral(["<div class=\"top-blocked top-blocked--truncated\">\n    <div class=\"top-blocked__see-all js-top-blocked-see-all\">\n        <a href=\"javascript:void(0)\" class=\"link-secondary\">\n            <span class=\"icon icon__arrow pull-right\"></span>\n            Top Tracking Offenders\n            <span class=\"top-blocked__list top-blocked__list--truncated top-blocked__list--icons\">\n                ", "\n            </span>\n        </a>\n    </div>\n</div>"])), listItems(this.model.companyListMap));
  }
};

},{"./top-blocked-truncated-list-items.es6.js":46,"bel":2}],48:[function(require,module,exports){
"use strict";

var _templateObject, _templateObject2, _templateObject3, _templateObject4, _templateObject5, _templateObject6;

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

var header = require('./shared/sliding-subview-header.es6.js');

var listItems = require('./top-blocked-list-items.es6.js');

var noData = require('./shared/top-blocked-no-data.es6.js');

module.exports = function () {
  if (!this.model) {
    return bel(_templateObject || (_templateObject = _taggedTemplateLiteral(["<div class=\"sliding-subview\n    sliding-subview--has-fixed-header top-blocked-header\">\n    ", "\n</div>"])), header('All Trackers'));
  } else {
    return bel(_templateObject2 || (_templateObject2 = _taggedTemplateLiteral(["<div class=\"js-top-blocked-content\">\n    ", "\n    ", "\n    ", "\n</div>"])), renderPctPagesWithTrackers(this.model), renderList(this.model), renderResetButton(this.model));
  }
};

function renderPctPagesWithTrackers(model) {
  var msg = '';

  if (model.lastStatsResetDate) {
    var d = new Date(model.lastStatsResetDate).toLocaleDateString('default', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    if (d) msg = " since ".concat(d);
  }

  if (model.pctPagesWithTrackers) {
    return bel(_templateObject3 || (_templateObject3 = _taggedTemplateLiteral(["<p class=\"top-blocked__pct card\">\n    Trackers were found on <b>", "%</b>\n    of websites you've visited", ".\n</p>"])), model.pctPagesWithTrackers, msg);
  }
}

function renderList(model) {
  if (model.companyListMap.length > 0) {
    return bel(_templateObject4 || (_templateObject4 = _taggedTemplateLiteral(["<ol aria-label=\"List of Trackers Found\" class=\"default-list top-blocked__list card border--bottom\">\n    ", "\n</ol>"])), listItems(model.companyListMap));
  } else {
    return bel(_templateObject5 || (_templateObject5 = _taggedTemplateLiteral(["<ol class=\"default-list top-blocked__list\">\n    <li class=\"top-blocked__li top-blocked__li--no-data\">\n        ", "\n    </li>\n</ol>"])), noData());
  }
}

function renderResetButton(model) {
  if (model.companyListMap.length > 0) {
    return bel(_templateObject6 || (_templateObject6 = _taggedTemplateLiteral(["<div class=\"top-blocked__reset-stats\">\n    <button class=\"top-blocked__reset-stats__button block\n        js-reset-trackers-data\">\n        Reset global stats\n    </button>\n    <p>These stats are only stored locally on your device,\n    and are not sent anywhere, ever.</p>\n</div>"])));
  }
}

},{"./shared/sliding-subview-header.es6.js":38,"./shared/top-blocked-no-data.es6.js":41,"./top-blocked-list-items.es6.js":45,"bel":2}],49:[function(require,module,exports){
"use strict";

var _templateObject, _templateObject2, _templateObject3, _templateObject4, _templateObject5, _templateObject6;

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

var hero = require('./shared/hero.es6.js');

var trackerNetworksIcon = require('./shared/tracker-network-icon.es6.js');

var trackerNetworksText = require('./shared/tracker-networks-text.es6.js');

var displayCategories = require('./../../../data/constants.js').displayCategories;

module.exports = function () {
  if (!this.model) {
    return bel(_templateObject || (_templateObject = _taggedTemplateLiteral(["<section class=\"sliding-subview\n    sliding-subview--has-fixed-header\">\n</section>"])));
  } else {
    return bel(_templateObject2 || (_templateObject2 = _taggedTemplateLiteral(["<div class=\"tracker-networks site-info site-info--full-height card\">\n    <div class=\"js-tracker-networks-hero\">\n        ", "\n    </div>\n    <div class=\"tracker-networks__explainer border--bottom--inner\n        text--center\">\n        Tracker networks aggregate your web history into a data profile about you.\n        Major tracker networks are more harmful because they can track and target you across more of the Internet.\n    </div>\n    <div class=\"tracker-networks__details padded\n        js-tracker-networks-details\">\n        <ol class=\"default-list site-info__trackers__company-list\" aria-label=\"List of tracker networks\">\n            ", "\n        </ol>\n    </div>\n</div>"])), renderHero(this.model.site), renderTrackerDetails(this.model, this.model.DOMAIN_MAPPINGS));
  }
};

function renderHero(site) {
  site = site || {};
  return bel(_templateObject3 || (_templateObject3 = _taggedTemplateLiteral(["", ""])), hero({
    status: trackerNetworksIcon(site.siteRating, site.isAllowlisted, site.totalTrackerNetworksCount),
    title: site.domain,
    subtitle: "".concat(trackerNetworksText(site, false)),
    showClose: true
  }));
}

function renderTrackerDetails(model) {
  var companyListMap = model.companyListMap || {};

  if (companyListMap.length === 0) {
    return bel(_templateObject4 || (_templateObject4 = _taggedTemplateLiteral(["<li class=\"is-empty\"></li>"])));
  }

  if (companyListMap && companyListMap.length > 0) {
    return companyListMap.map(function (c, i) {
      var borderClass = '';

      if (c.name && c.name === 'unknown') {
        c.name = '(Tracker network unknown)';
      } else if (c.name && model.hasUnblockedTrackers(c, c.urlsList)) {
        var additionalText = ' associated domains';
        var domain = model.site ? model.site.domain : c.displayName;
        c.displayName = model.site.isAllowlisted ? domain + additionalText : domain + additionalText + ' (not blocked)';
        borderClass = companyListMap.length > 1 ? 'border--top padded--top' : '';
      }

      return bel(_templateObject5 || (_templateObject5 = _taggedTemplateLiteral(["<li class=\"", "\">\n    <div class=\"site-info__tracker__wrapper ", " float-right\">\n        <span class=\"site-info__tracker__icon ", "\">\n        </span>\n    </div>\n    <h1 title=\"", "\" class=\"site-info__domain block\">", "</h1>\n    <ol class=\"default-list site-info__trackers__company-list__url-list\" aria-label=\"Tracker domains for ", "\">\n        ", "\n    </ol>\n</li>"])), borderClass, c.normalizedName, c.normalizedName, c.name, c.displayName, c.name, c.urlsList.map(function (url) {
        // find first matchign category from our list of allowed display categories
        var category = '';

        if (c.urls[url] && c.urls[url].categories) {
          displayCategories.some(function (displayCat) {
            var match = c.urls[url].categories.find(function (cat) {
              return cat === displayCat;
            });

            if (match) {
              category = match;
              return true;
            }

            return false;
          });
        }

        return bel(_templateObject6 || (_templateObject6 = _taggedTemplateLiteral(["<li>\n                <div class=\"url\">", "</div>\n                <div class=\"category\">", "</div>\n            </li>"])), url, category);
      }));
    });
  }
}

},{"./../../../data/constants.js":5,"./shared/hero.es6.js":35,"./shared/tracker-network-icon.es6.js":42,"./shared/tracker-networks-text.es6.js":43,"bel":2}],50:[function(require,module,exports){
"use strict";

var Parent = window.DDG.base.View;

function Autocomplete(ops) {
  this.model = ops.model;
  this.pageView = ops.pageView;
  this.template = ops.template;
  Parent.call(this, ops);
  this.bindEvents([[this.store.subscribe, 'change:search', this._handleSearchText]]);
}

Autocomplete.prototype = window.$.extend({}, Parent.prototype, {
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

},{}],51:[function(require,module,exports){
"use strict";

var Parent = window.DDG.base.View;

function BreakageForm(ops) {
  this.model = ops.model;
  this.template = ops.template;
  this.siteView = ops.siteView;
  this.clickSource = ops.clickSource;
  this.$root = window.$('.js-breakage-form');
  Parent.call(this, ops);

  this._setup();
}

BreakageForm.prototype = window.$.extend({}, Parent.prototype, {
  _setup: function _setup() {
    this._cacheElems('.js-breakage-form', ['close', 'submit', 'element', 'message', 'dropdown']);

    this.bindEvents([[this.$close, 'click', this._closeForm], [this.$submit, 'click', this._submitForm], [this.$dropdown, 'change', this._selectCategory]]);
  },
  _closeForm: function _closeForm(e) {
    if (e) e.preventDefault(); // reload page after closing form if user got to form from
    // toggling privacy protection. otherwise destroy view.

    if (this.clickSource === 'toggle') {
      this.siteView.closePopupAndReload(500);
      this.destroy();
    } else {
      this.destroy();
    }
  },
  _submitForm: function _submitForm() {
    if (this.$submit.hasClass('btn-disabled')) {
      return;
    }

    var category = this.$dropdown.val();
    this.model.submitBreakageForm(category);

    this._showThankYouMessage();
  },
  _showThankYouMessage: function _showThankYouMessage() {
    this.$element.addClass('is-transparent');
    this.$message.removeClass('is-transparent'); // reload page after form submission if user got to form from
    // toggling privacy protection, otherwise destroy view.

    if (this.clickSource === 'toggle') {
      this.siteView.closePopupAndReload(3500);
    }
  },
  _selectCategory: function _selectCategory() {}
});
module.exports = BreakageForm;

},{}],52:[function(require,module,exports){
"use strict";

var _require = require('../../background/email-utils.es6'),
    formatAddress = _require.formatAddress;

var Parent = window.DDG.base.View;

function EmailAliasView(ops) {
  var _this = this;

  this.model = ops.model;
  this.pageView = ops.pageView;
  this.template = ops.template;
  this.model.getUserData().then(function (userData) {
    _this.model.set('userData', userData);

    Parent.call(_this, ops);

    _this._setup();
  });
}

EmailAliasView.prototype = window.$.extend({}, Parent.prototype, {
  _copyAliasToClipboard: function _copyAliasToClipboard() {
    var _this2 = this;

    var alias = this.model.userData.nextAlias;
    navigator.clipboard.writeText(formatAddress(alias));
    this.$el.addClass('show-copied-label');
    this.$el.one('animationend', function () {
      _this2.$el.removeClass('show-copied-label');
    });
    this.model.fetch({
      refreshAlias: true
    }).then(function (_ref) {
      var privateAddress = _ref.privateAddress;
      _this2.model.userData.nextAlias = privateAddress;
    });
  },
  _setup: function _setup() {
    this.bindEvents([[this.$el, 'click', this._copyAliasToClipboard]]);
  }
});
module.exports = EmailAliasView;

},{"../../background/email-utils.es6":8}],53:[function(require,module,exports){
"use strict";

var Parent = require('./sliding-subview.es6.js');

var ratingHeroTemplate = require('../templates/shared/rating-hero.es6.js');

var gradesTemplate = require('../templates/shared/grade-scorecard-grades.es6.js');

var reasonsTemplate = require('../templates/shared/grade-scorecard-reasons.es6.js');

function GradeScorecard(ops) {
  this.model = ops.model;
  this.template = ops.template;
  Parent.call(this, ops);

  this._setup();

  this.bindEvents([[this.store.subscribe, 'change:site', this._onSiteChange]]);
  this.setupClose();
}

GradeScorecard.prototype = window.$.extend({}, Parent.prototype, {
  _setup: function _setup() {
    this._cacheElems('.js-grade-scorecard', ['reasons', 'grades']);

    this.$hero = this.$('.js-rating-hero');
  },
  _rerenderHero: function _rerenderHero() {
    this.$hero.replaceWith(ratingHeroTemplate(this.model, {
      showClose: true
    }));
  },
  _rerenderGrades: function _rerenderGrades() {
    this.$grades.replaceWith(gradesTemplate(this.model));
  },
  _rerenderReasons: function _rerenderReasons() {
    this.$reasons.replaceWith(reasonsTemplate(this.model));
  },
  _onSiteChange: function _onSiteChange(e) {
    if (e.change.attribute === 'siteRating') {
      this._rerenderHero();

      this._rerenderGrades();
    } // all the other stuff we use in the reasons
    // (e.g. https, tosdr)
    // doesn't change dynamically


    if (e.change.attribute === 'trackerNetworks' || e.change.attribute === 'isaMajorTrackingNetwork') {
      this._rerenderReasons();
    } // recache any selectors that were rerendered


    this._setup();

    this.setupClose();
  }
});
module.exports = GradeScorecard;

},{"../templates/shared/grade-scorecard-grades.es6.js":32,"../templates/shared/grade-scorecard-reasons.es6.js":33,"../templates/shared/rating-hero.es6.js":37,"./sliding-subview.es6.js":60}],54:[function(require,module,exports){
"use strict";

var Parent = window.DDG.base.View;

var openOptionsPage = require('./mixins/open-options-page.es6.js');

var browserUIWrapper = require('./../base/ui-wrapper.es6.js');

var _require = require('../../background/channel.es6.js'),
    IS_BETA = _require.IS_BETA;

function HamburgerMenu(ops) {
  this.model = ops.model;
  this.template = ops.template;
  this.pageView = ops.pageView;
  Parent.call(this, ops);

  this._setup();
}

HamburgerMenu.prototype = window.$.extend({}, Parent.prototype, openOptionsPage, {
  _setup: function _setup() {
    this._cacheElems('.js-hamburger-menu', ['close', 'options-link', 'feedback-link', 'broken-site-link', 'debugger-panel-link']);

    this.bindEvents([[this.$close, 'click', this._closeMenu], [this.$optionslink, 'click', this.openOptionsPage], [this.$feedbacklink, 'click', this._handleFeedbackClick], [this.$brokensitelink, 'click', this._handleBrokenSiteClick], [this.model.store.subscribe, 'action:search', this._handleAction], [this.model.store.subscribe, 'change:site', this._handleSiteUpdate], [this.$debuggerpanellink, 'click', this._handleDebuggerClick]]);

    if (IS_BETA) {
      this.$('#debugger-panel').removeClass('is-hidden');
    }
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
  _handleFeedbackClick: function _handleFeedbackClick(e) {
    e.preventDefault();
    browserUIWrapper.openExtensionPage('/html/feedback.html');
  },
  _handleBrokenSiteClick: function _handleBrokenSiteClick(e) {
    e.preventDefault();
    this.$el.addClass('is-hidden');
    this.pageView.views.site.showBreakageForm('reportBrokenSite');
  },
  _handleSiteUpdate: function _handleSiteUpdate(notification) {
    if (notification && notification.change.attribute === 'tab') {
      this.model.tabUrl = notification.change.value.url;

      this._rerender();

      this._setup();
    }
  },
  _handleDebuggerClick: function _handleDebuggerClick(e) {
    e.preventDefault();
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, function (tabs) {
      var tabId = tabs.length > 0 ? tabs[0].id : '';
      chrome.tabs.create({
        url: chrome.runtime.getURL("/html/devtools-panel.html?tabId=".concat(tabId))
      });
    });
  }
});
module.exports = HamburgerMenu;

},{"../../background/channel.es6.js":7,"./../base/ui-wrapper.es6.js":11,"./mixins/open-options-page.es6.js":56}],55:[function(require,module,exports){
"use strict";

module.exports = {
  animateGraphBars: function animateGraphBars() {
    var self = this;
    window.setTimeout(function () {
      if (!self.$graphbarfg) return;
      self.$graphbarfg.each(function (i, el) {
        var $el = window.$(el);
        var w = $el.data().width;
        $el.css('width', w + '%');
      });
    }, 250);
    window.setTimeout(function () {
      if (!self.$pct) return;
      self.$pct.each(function (i, el) {
        var $el = window.$(el);
        $el.css('color', '#333333');
      });
    }, 700);
  }
};

},{}],56:[function(require,module,exports){
"use strict";

var browserUIWrapper = require('./../../base/ui-wrapper.es6.js');

module.exports = {
  openOptionsPage: function openOptionsPage() {
    this.model.fetch({
      getBrowser: true
    }).then(function (browser) {
      browserUIWrapper.openOptionsPage(browser);
    });
  }
};

},{"./../../base/ui-wrapper.es6.js":11}],57:[function(require,module,exports){
"use strict";

var ParentSlidingSubview = require('./sliding-subview.es6.js');

function PrivacyPractices(ops) {
  this.model = ops.model;
  this.template = ops.template;
  ParentSlidingSubview.call(this, ops);
  this.setupClose();
}

PrivacyPractices.prototype = window.$.extend({}, ParentSlidingSubview.prototype, {});
module.exports = PrivacyPractices;

},{"./sliding-subview.es6.js":60}],58:[function(require,module,exports){
"use strict";

var Parent = window.DDG.base.View;
var FOCUS_CLASS = 'go--focused';

function Search(ops) {
  var _this = this;

  this.model = ops.model;
  this.pageView = ops.pageView;
  this.template = ops.template;
  Parent.call(this, ops);

  this._cacheElems('.js-search', ['form', 'input', 'go', 'hamburger-button']);

  this.bindEvents([[this.$input, 'input', this._handleInput], [this.$input, 'blur', this._handleBlur], [this.$go, 'click', this._handleSubmit], [this.$form, 'submit', this._handleSubmit], [this.$hamburgerbutton, 'click', this._handleBurgerClick]]);
  window.setTimeout(function () {
    return _this.$input.focus();
  }, 200);
}

Search.prototype = window.$.extend({}, Parent.prototype, {
  // Hover effect on search button while typing
  _addHoverEffect: function _addHoverEffect() {
    if (!this.$go.hasClass(FOCUS_CLASS)) {
      this.$go.addClass(FOCUS_CLASS);
    }
  },
  _removeHoverEffect: function _removeHoverEffect() {
    if (this.$go.hasClass(FOCUS_CLASS)) {
      this.$go.removeClass(FOCUS_CLASS);
    }
  },
  _handleBlur: function _handleBlur(e) {
    this._removeHoverEffect();
  },
  _handleInput: function _handleInput(e) {
    var searchText = this.$input.val();
    this.model.set('searchText', searchText);

    if (searchText.length) {
      this._addHoverEffect();
    } else {
      this._removeHoverEffect();
    }
  },
  _handleSubmit: function _handleSubmit(e) {
    e.preventDefault();
    console.log("Search submit for ".concat(this.$input.val()));
    this.model.fetch({
      firePixel: 'epq'
    });
    this.model.doSearch(this.$input.val());
    window.close();
  },
  _handleBurgerClick: function _handleBurgerClick(e) {
    e.preventDefault();
    this.model.fetch({
      firePixel: 'eph'
    });
    this.model.send('burgerClick');
  }
});
module.exports = Search;

},{}],59:[function(require,module,exports){
"use strict";

var Parent = window.DDG.base.View;

var GradeScorecardView = require('./../views/grade-scorecard.es6.js');

var TrackerNetworksView = require('./../views/tracker-networks.es6.js');

var PrivacyPracticesView = require('./../views/privacy-practices.es6.js');

var BreakageFormView = require('./../views/breakage-form.es6.js');

var gradeScorecardTemplate = require('./../templates/grade-scorecard.es6.js');

var trackerNetworksTemplate = require('./../templates/tracker-networks.es6.js');

var privacyPracticesTemplate = require('./../templates/privacy-practices.es6.js');

var breakageFormTemplate = require('./../templates/breakage-form.es6.js');

var openOptionsPage = require('./mixins/open-options-page.es6.js');

var browserUIWrapper = require('./../base/ui-wrapper.es6.js');

function Site(ops) {
  var _this = this;

  this.model = ops.model;
  this.pageView = ops.pageView;
  this.template = ops.template; // cache 'body' selector

  this.$body = window.$('body'); // get data from background process, then re-render template with it

  this.model.getBackgroundTabData().then(function () {
    if (_this.model.tab && (_this.model.tab.status === 'complete' || _this.model.domain === 'new tab')) {
      // render template for the first time here
      Parent.call(_this, ops);

      _this.model.fetch({
        firePixel: 'ep'
      });

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

Site.prototype = window.$.extend({}, Parent.prototype, openOptionsPage, {
  _onWhitelistClick: function _onWhitelistClick(e) {
    if (this.$body.hasClass('is-disabled')) return;
    if (this.$protectionrow.hasClass('is-disabled')) return;
    this.model.toggleWhitelist();
    var whitelisted = this.model.isWhitelisted;

    this._showWhitelistedStatusMessage(!whitelisted);

    if (whitelisted) {
      this._showBreakageConfirmation();
    }
  },
  // If we just whitelisted a site, show a message briefly before reloading
  // otherwise just reload the tab and close the popup
  _showWhitelistedStatusMessage: function _showWhitelistedStatusMessage(reload) {
    var _this2 = this;

    var isTransparentClass = 'is-transparent'; // Wait for the rerendering to be done
    // 10ms timeout is the minimum to render the transition smoothly

    setTimeout(function () {
      return _this2.$whiteliststatus.removeClass(isTransparentClass);
    }, 10);
    setTimeout(function () {
      return _this2.$protection.addClass(isTransparentClass);
    }, 10);

    if (reload) {
      // Wait a bit more before closing the popup and reloading the tab
      this.closePopupAndReload(1500);
    }
  },
  // NOTE: after ._setup() is called this view listens for changes to
  // site model and re-renders every time model properties change
  _setup: function _setup() {
    // console.log('[site view] _setup()')
    this._cacheElems('.js-site', ['toggle', 'protection', 'protection-row', 'whitelist-status', 'show-all-trackers', 'show-page-trackers', 'manage-whitelist', 'manage-whitelist-li', 'report-broken', 'privacy-practices', 'confirm-breakage-li', 'confirm-breakage', 'confirm-breakage-yes', 'confirm-breakage-no', 'confirm-breakage-message']);

    this.$gradescorecard = this.$('.js-hero-open');
    this.bindEvents([[this.$toggle, 'click', this._onWhitelistClick], [this.$showpagetrackers, 'click', this._showPageTrackers], [this.$privacypractices, 'click', this._showPrivacyPractices], [this.$confirmbreakageyes, 'click', this._onConfirmBrokenClick], [this.$confirmbreakageno, 'click', this._onConfirmNotBrokenClick], [this.$gradescorecard, 'click', this._showGradeScorecard], [this.$managewhitelist, 'click', this._onManageWhitelistClick], [this.$reportbroken, 'click', this._onReportBrokenSiteClick], [this.store.subscribe, 'change:site', this.rerender]]);
  },
  rerender: function rerender() {
    // Prevent rerenders when confirmation form is active,
    // otherwise form will disappear on rerender.
    if (this.$body.hasClass('confirmation-active')) return;

    if (this.model && this.model.disabled) {
      if (!this.$body.hasClass('is-disabled')) {
        console.log('$body.addClass() is-disabled');
        this.$body.addClass('is-disabled');

        this._rerender();

        this._setup();
      }
    } else {
      this.$body.removeClass('is-disabled');
      this.unbindEvents();

      this._rerender();

      this._setup();
    }
  },
  _onManageWhitelistClick: function _onManageWhitelistClick() {
    if (this.model && this.model.disabled) {
      return;
    }

    this.openOptionsPage();
  },
  _onReportBrokenSiteClick: function _onReportBrokenSiteClick(e) {
    e.preventDefault();

    if (this.model && this.model.disabled) {
      return;
    }

    this.showBreakageForm('reportBrokenSite');
  },
  _onConfirmBrokenClick: function _onConfirmBrokenClick() {
    var isHiddenClass = 'is-hidden';
    this.$managewhitelistli.removeClass(isHiddenClass);
    this.$confirmbreakageli.addClass(isHiddenClass);
    this.$body.removeClass('confirmation-active');
    this.showBreakageForm('toggle');
  },
  _onConfirmNotBrokenClick: function _onConfirmNotBrokenClick() {
    var isTransparentClass = 'is-transparent';
    this.$confirmbreakagemessage.removeClass(isTransparentClass);
    this.$confirmbreakage.addClass(isTransparentClass);
    this.$body.removeClass('confirmation-active');
    this.closePopupAndReload(1500);
  },
  _showBreakageConfirmation: function _showBreakageConfirmation() {
    this.$body.addClass('confirmation-active');
    this.$confirmbreakageli.removeClass('is-hidden');
    this.$managewhitelistli.addClass('is-hidden');
  },
  // pass clickSource to specify whether page should reload
  // after submitting breakage form.
  showBreakageForm: function showBreakageForm(clickSource) {
    this.views.breakageForm = new BreakageFormView({
      siteView: this,
      template: breakageFormTemplate,
      model: this.model,
      appendTo: this.$body,
      clickSource: clickSource
    });
  },
  _showPageTrackers: function _showPageTrackers(e) {
    if (this.$body.hasClass('is-disabled')) return;
    this.model.fetch({
      firePixel: 'epn'
    });
    this.views.slidingSubview = new TrackerNetworksView({
      template: trackerNetworksTemplate
    });
  },
  _showPrivacyPractices: function _showPrivacyPractices(e) {
    if (this.model.disabled) return;
    this.model.fetch({
      firePixel: 'epp'
    });
    this.views.privacyPractices = new PrivacyPracticesView({
      template: privacyPracticesTemplate,
      model: this.model
    });
  },
  _showGradeScorecard: function _showGradeScorecard(e) {
    if (this.model.disabled) return;
    this.model.fetch({
      firePixel: 'epc'
    });
    this.views.gradeScorecard = new GradeScorecardView({
      template: gradeScorecardTemplate,
      model: this.model
    });
  },
  closePopupAndReload: function closePopupAndReload(delay) {
    var _this3 = this;

    delay = delay || 0;
    setTimeout(function () {
      browserUIWrapper.reloadTab(_this3.model.tab.id);
      browserUIWrapper.closePopup();
    }, delay);
  }
});
module.exports = Site;

},{"./../base/ui-wrapper.es6.js":11,"./../templates/breakage-form.es6.js":26,"./../templates/grade-scorecard.es6.js":28,"./../templates/privacy-practices.es6.js":30,"./../templates/tracker-networks.es6.js":49,"./../views/breakage-form.es6.js":51,"./../views/grade-scorecard.es6.js":53,"./../views/privacy-practices.es6.js":57,"./../views/tracker-networks.es6.js":63,"./mixins/open-options-page.es6.js":56}],60:[function(require,module,exports){
"use strict";

var Parent = window.DDG.base.View;

function SlidingSubview(ops) {
  ops.appendTo = window.$('.sliding-subview--root');
  Parent.call(this, ops);
  this.$root = window.$('.sliding-subview--root');
  this.$root.addClass('sliding-subview--open');
  this.setupClose();
}

SlidingSubview.prototype = window.$.extend({}, Parent.prototype, {
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

},{}],61:[function(require,module,exports){
"use strict";

var Parent = window.DDG.base.View;

var TopBlockedFullView = require('./top-blocked.es6.js');

var topBlockedFullTemplate = require('./../templates/top-blocked.es6.js');

var TOP_BLOCKED_CLASS = 'has-top-blocked--truncated';

function TruncatedTopBlocked(ops) {
  var _this = this;

  this.model = ops.model;
  this.pageView = ops.pageView;
  this.template = ops.template;
  this.model.getTopBlocked().then(function () {
    Parent.call(_this, ops);

    _this._setup();
  });
  this.bindEvents([[this.model.store.subscribe, 'action:backgroundMessage', this.handleBackgroundMsg]]);
}

TruncatedTopBlocked.prototype = window.$.extend({}, Parent.prototype, {
  _seeAllClick: function _seeAllClick() {
    this.model.fetch({
      firePixel: 'eps'
    });
    this.views.slidingSubview = new TopBlockedFullView({
      template: topBlockedFullTemplate,
      numItems: 10
    });
  },
  _setup: function _setup() {
    this._cacheElems('.js-top-blocked', ['graph-bar-fg', 'pct', 'see-all']);

    this.bindEvents([[this.$seeall, 'click', this._seeAllClick]]);

    if (window.$('.top-blocked--truncated').length) {
      window.$('html').addClass(TOP_BLOCKED_CLASS);
    }
  },
  rerenderList: function rerenderList() {
    this._rerender();

    this._setup();
  },
  handleBackgroundMsg: function handleBackgroundMsg(message) {
    var _this2 = this;

    if (!message || !message.action) return;

    if (message.action === 'didResetTrackersData') {
      this.model.reset();
      setTimeout(function () {
        return _this2.rerenderList();
      }, 750);
      this.rerenderList();
      window.$('html').removeClass(TOP_BLOCKED_CLASS);
    }
  }
});
module.exports = TruncatedTopBlocked;

},{"./../templates/top-blocked.es6.js":48,"./top-blocked.es6.js":62}],62:[function(require,module,exports){
"use strict";

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

TopBlocked.prototype = window.$.extend({}, ParentSlidingSubview.prototype, animateGraphBars, {
  setup: function setup() {
    this.$content = this.$el.find('.js-top-blocked-content'); // listener for reset stats click

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

      _this.setup(); // animate graph bars and pct


      _this.$graphbarfg = _this.$el.find('.js-top-blocked-graph-bar-fg');
      _this.$pct = _this.$el.find('.js-top-blocked-pct');

      _this.animateGraphBars();
    });
  },
  resetTrackersStats: function resetTrackersStats(e) {
    if (e) e.preventDefault();
    this.model.fetch({
      resetTrackersData: true
    });
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

},{"./../models/top-blocked.es6.js":20,"./mixins/animate-graph-bars.es6.js":55,"./sliding-subview.es6.js":60}],63:[function(require,module,exports){
"use strict";

var ParentSlidingSubview = require('./sliding-subview.es6.js');

var heroTemplate = require('./../templates/shared/hero.es6.js');

var CompanyListModel = require('./../models/site-company-list.es6.js');

var SiteModel = require('./../models/site.es6.js');

var trackerNetworksIconTemplate = require('./../templates/shared/tracker-network-icon.es6.js');

var trackerNetworksTextTemplate = require('./../templates/shared/tracker-networks-text.es6.js');

function TrackerNetworks(ops) {
  var _this = this;

  // model data is async
  this.model = null;
  this.currentModelName = null;
  this.currentSiteModelName = null;
  this.template = ops.template;
  ParentSlidingSubview.call(this, ops);
  setTimeout(function () {
    return _this._rerender();
  }, 750);
  this.renderAsyncContent();
}

TrackerNetworks.prototype = window.$.extend({}, ParentSlidingSubview.prototype, {
  setup: function setup() {
    this._cacheElems('.js-tracker-networks', ['hero', 'details']); // site rating arrives async


    this.bindEvents([[this.store.subscribe, "change:".concat(this.currentSiteModelName), this._rerender]]);
  },
  renderAsyncContent: function renderAsyncContent() {
    var _this2 = this;

    var random = Math.round(Math.random() * 100000);
    this.currentModelName = 'siteCompanyList' + random;
    this.currentSiteModelName = 'site' + random;
    this.model = new CompanyListModel({
      modelName: this.currentModelName
    });
    this.model.fetchAsyncData().then(function () {
      _this2.model.site = new SiteModel({
        modelName: _this2.currentSiteModelName
      });

      _this2.model.site.getBackgroundTabData().then(function () {
        var content = _this2.template();

        _this2.$el.append(content);

        _this2.setup();

        _this2.setupClose();
      });
    });
  },
  _renderHeroTemplate: function _renderHeroTemplate() {
    if (this.model.site) {
      var trackerNetworksIconName = trackerNetworksIconTemplate(this.model.site.siteRating, this.model.site.isAllowlisted, this.model.site.totalTrackerNetworksCount);
      var trackerNetworksText = trackerNetworksTextTemplate(this.model.site, false);
      this.$hero.html(heroTemplate({
        status: trackerNetworksIconName,
        title: this.model.site.domain,
        subtitle: trackerNetworksText,
        showClose: true
      }));
    }
  },
  _rerender: function _rerender(e) {
    if (e && e.change) {
      if (e.change.attribute === 'isaMajorTrackingNetwork' || e.change.attribute === 'isWhitelisted' || e.change.attribute === 'totalTrackerNetworksCount' || e.change.attribute === 'siteRating') {
        this._renderHeroTemplate();

        this.unbindEvents();
        this.setup();
        this.setupClose();
      }
    }
  }
});
module.exports = TrackerNetworks;

},{"./../models/site-company-list.es6.js":18,"./../models/site.es6.js":19,"./../templates/shared/hero.es6.js":35,"./../templates/shared/tracker-network-icon.es6.js":42,"./../templates/shared/tracker-networks-text.es6.js":43,"./sliding-subview.es6.js":60}]},{},[24])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYmVsL2FwcGVuZENoaWxkLmpzIiwibm9kZV9tb2R1bGVzL2JlbC9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL2h5cGVyc2NyaXB0LWF0dHJpYnV0ZS10by1wcm9wZXJ0eS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9oeXBlcngvaW5kZXguanMiLCJzaGFyZWQvZGF0YS9jb25zdGFudHMuanMiLCJzaGFyZWQvZGF0YS9kZWZhdWx0U2V0dGluZ3MuanMiLCJzaGFyZWQvanMvYmFja2dyb3VuZC9jaGFubmVsLmVzNi5qcyIsInNoYXJlZC9qcy9iYWNrZ3JvdW5kL2VtYWlsLXV0aWxzLmVzNi5qcyIsInNoYXJlZC9qcy9iYWNrZ3JvdW5kL3NldHRpbmdzLmVzNi5qcyIsInNoYXJlZC9qcy9iYWNrZ3JvdW5kL3dyYXBwZXIuZXM2LmpzIiwic2hhcmVkL2pzL3VpL2Jhc2UvdWktd3JhcHBlci5lczYuanMiLCJzaGFyZWQvanMvdWkvbW9kZWxzL2F1dG9jb21wbGV0ZS5lczYuanMiLCJzaGFyZWQvanMvdWkvbW9kZWxzL2JhY2tncm91bmQtbWVzc2FnZS5lczYuanMiLCJzaGFyZWQvanMvdWkvbW9kZWxzL2VtYWlsLWFsaWFzLmVzNi5qcyIsInNoYXJlZC9qcy91aS9tb2RlbHMvaGFtYnVyZ2VyLW1lbnUuZXM2LmpzIiwic2hhcmVkL2pzL3VpL21vZGVscy9taXhpbnMvbm9ybWFsaXplLWNvbXBhbnktbmFtZS5lczYuanMiLCJzaGFyZWQvanMvdWkvbW9kZWxzL3NlYXJjaC5lczYuanMiLCJzaGFyZWQvanMvdWkvbW9kZWxzL3NpdGUtY29tcGFueS1saXN0LmVzNi5qcyIsInNoYXJlZC9qcy91aS9tb2RlbHMvc2l0ZS5lczYuanMiLCJzaGFyZWQvanMvdWkvbW9kZWxzL3RvcC1ibG9ja2VkLmVzNi5qcyIsInNoYXJlZC9qcy91aS9wYWdlcy9taXhpbnMvaW5kZXguZXM2LmpzIiwic2hhcmVkL2pzL3VpL3BhZ2VzL21peGlucy9wYXJzZS1xdWVyeS1zdHJpbmcuZXM2LmpzIiwic2hhcmVkL2pzL3VpL3BhZ2VzL21peGlucy9zZXQtYnJvd3Nlci1jbGFzcy5lczYuanMiLCJzaGFyZWQvanMvdWkvcGFnZXMvcG9wdXAuZXM2LmpzIiwic2hhcmVkL2pzL3VpL3RlbXBsYXRlcy9hdXRvY29tcGxldGUuZXM2LmpzIiwic2hhcmVkL2pzL3VpL3RlbXBsYXRlcy9icmVha2FnZS1mb3JtLmVzNi5qcyIsInNoYXJlZC9qcy91aS90ZW1wbGF0ZXMvZW1haWwtYWxpYXMuZXM2LmpzIiwic2hhcmVkL2pzL3VpL3RlbXBsYXRlcy9ncmFkZS1zY29yZWNhcmQuZXM2LmpzIiwic2hhcmVkL2pzL3VpL3RlbXBsYXRlcy9oYW1idXJnZXItbWVudS5lczYuanMiLCJzaGFyZWQvanMvdWkvdGVtcGxhdGVzL3ByaXZhY3ktcHJhY3RpY2VzLmVzNi5qcyIsInNoYXJlZC9qcy91aS90ZW1wbGF0ZXMvc2VhcmNoLmVzNi5qcyIsInNoYXJlZC9qcy91aS90ZW1wbGF0ZXMvc2hhcmVkL2dyYWRlLXNjb3JlY2FyZC1ncmFkZXMuZXM2LmpzIiwic2hhcmVkL2pzL3VpL3RlbXBsYXRlcy9zaGFyZWQvZ3JhZGUtc2NvcmVjYXJkLXJlYXNvbnMuZXM2LmpzIiwic2hhcmVkL2pzL3VpL3RlbXBsYXRlcy9zaGFyZWQvaGFtYnVyZ2VyLWJ1dHRvbi5lczYuanMiLCJzaGFyZWQvanMvdWkvdGVtcGxhdGVzL3NoYXJlZC9oZXJvLmVzNi5qcyIsInNoYXJlZC9qcy91aS90ZW1wbGF0ZXMvc2hhcmVkL2xpbmsuZXM2LmpzIiwic2hhcmVkL2pzL3VpL3RlbXBsYXRlcy9zaGFyZWQvcmF0aW5nLWhlcm8uZXM2LmpzIiwic2hhcmVkL2pzL3VpL3RlbXBsYXRlcy9zaGFyZWQvc2xpZGluZy1zdWJ2aWV3LWhlYWRlci5lczYuanMiLCJzaGFyZWQvanMvdWkvdGVtcGxhdGVzL3NoYXJlZC9zdGF0dXMtbGlzdC5lczYuanMiLCJzaGFyZWQvanMvdWkvdGVtcGxhdGVzL3NoYXJlZC90b2dnbGUtYnV0dG9uLmVzNi5qcyIsInNoYXJlZC9qcy91aS90ZW1wbGF0ZXMvc2hhcmVkL3RvcC1ibG9ja2VkLW5vLWRhdGEuZXM2LmpzIiwic2hhcmVkL2pzL3VpL3RlbXBsYXRlcy9zaGFyZWQvdHJhY2tlci1uZXR3b3JrLWljb24uZXM2LmpzIiwic2hhcmVkL2pzL3VpL3RlbXBsYXRlcy9zaGFyZWQvdHJhY2tlci1uZXR3b3Jrcy10ZXh0LmVzNi5qcyIsInNoYXJlZC9qcy91aS90ZW1wbGF0ZXMvc2l0ZS5lczYuanMiLCJzaGFyZWQvanMvdWkvdGVtcGxhdGVzL3RvcC1ibG9ja2VkLWxpc3QtaXRlbXMuZXM2LmpzIiwic2hhcmVkL2pzL3VpL3RlbXBsYXRlcy90b3AtYmxvY2tlZC10cnVuY2F0ZWQtbGlzdC1pdGVtcy5lczYuanMiLCJzaGFyZWQvanMvdWkvdGVtcGxhdGVzL3RvcC1ibG9ja2VkLXRydW5jYXRlZC5lczYuanMiLCJzaGFyZWQvanMvdWkvdGVtcGxhdGVzL3RvcC1ibG9ja2VkLmVzNi5qcyIsInNoYXJlZC9qcy91aS90ZW1wbGF0ZXMvdHJhY2tlci1uZXR3b3Jrcy5lczYuanMiLCJzaGFyZWQvanMvdWkvdmlld3MvYXV0b2NvbXBsZXRlLmVzNi5qcyIsInNoYXJlZC9qcy91aS92aWV3cy9icmVha2FnZS1mb3JtLmVzNi5qcyIsInNoYXJlZC9qcy91aS92aWV3cy9lbWFpbC1hbGlhcy5lczYuanMiLCJzaGFyZWQvanMvdWkvdmlld3MvZ3JhZGUtc2NvcmVjYXJkLmVzNi5qcyIsInNoYXJlZC9qcy91aS92aWV3cy9oYW1idXJnZXItbWVudS5lczYuanMiLCJzaGFyZWQvanMvdWkvdmlld3MvbWl4aW5zL2FuaW1hdGUtZ3JhcGgtYmFycy5lczYuanMiLCJzaGFyZWQvanMvdWkvdmlld3MvbWl4aW5zL29wZW4tb3B0aW9ucy1wYWdlLmVzNi5qcyIsInNoYXJlZC9qcy91aS92aWV3cy9wcml2YWN5LXByYWN0aWNlcy5lczYuanMiLCJzaGFyZWQvanMvdWkvdmlld3Mvc2VhcmNoLmVzNi5qcyIsInNoYXJlZC9qcy91aS92aWV3cy9zaXRlLmVzNi5qcyIsInNoYXJlZC9qcy91aS92aWV3cy9zbGlkaW5nLXN1YnZpZXcuZXM2LmpzIiwic2hhcmVkL2pzL3VpL3ZpZXdzL3RvcC1ibG9ja2VkLXRydW5jYXRlZC5lczYuanMiLCJzaGFyZWQvanMvdWkvdmlld3MvdG9wLWJsb2NrZWQuZXM2LmpzIiwic2hhcmVkL2pzL3VpL3ZpZXdzL3RyYWNrZXItbmV0d29ya3MuZXM2LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QUMsTUFBRixDQUFTLFNBQVQsS0FBdUIsWUFIM0IsRUFHeUM7QUFDckMsYUFBSyxtQkFBTDs7QUFDQSxhQUFLLFlBQUw7QUFDQSxhQUFLLEtBQUw7QUFDQSxhQUFLLFVBQUw7QUFDSDtBQUNKO0FBQ0o7QUFwRUwsQ0FGd0IsQ0FBNUI7QUEwRUEsTUFBTSxDQUFDLE9BQVAsR0FBaUIsZUFBakIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJ2YXIgdHJhaWxpbmdOZXdsaW5lUmVnZXggPSAvXFxuW1xcc10rJC9cbnZhciBsZWFkaW5nTmV3bGluZVJlZ2V4ID0gL15cXG5bXFxzXSsvXG52YXIgdHJhaWxpbmdTcGFjZVJlZ2V4ID0gL1tcXHNdKyQvXG52YXIgbGVhZGluZ1NwYWNlUmVnZXggPSAvXltcXHNdKy9cbnZhciBtdWx0aVNwYWNlUmVnZXggPSAvW1xcblxcc10rL2dcblxudmFyIFRFWFRfVEFHUyA9IFtcbiAgJ2EnLCAnYWJicicsICdiJywgJ2JkaScsICdiZG8nLCAnYnInLCAnY2l0ZScsICdkYXRhJywgJ2RmbicsICdlbScsICdpJyxcbiAgJ2tiZCcsICdtYXJrJywgJ3EnLCAncnAnLCAncnQnLCAncnRjJywgJ3J1YnknLCAncycsICdhbXAnLCAnc21hbGwnLCAnc3BhbicsXG4gICdzdHJvbmcnLCAnc3ViJywgJ3N1cCcsICd0aW1lJywgJ3UnLCAndmFyJywgJ3dicidcbl1cblxudmFyIFZFUkJBVElNX1RBR1MgPSBbXG4gICdjb2RlJywgJ3ByZScsICd0ZXh0YXJlYSdcbl1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBhcHBlbmRDaGlsZCAoZWwsIGNoaWxkcykge1xuICBpZiAoIUFycmF5LmlzQXJyYXkoY2hpbGRzKSkgcmV0dXJuXG5cbiAgdmFyIG5vZGVOYW1lID0gZWwubm9kZU5hbWUudG9Mb3dlckNhc2UoKVxuXG4gIHZhciBoYWRUZXh0ID0gZmFsc2VcbiAgdmFyIHZhbHVlLCBsZWFkZXJcblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gY2hpbGRzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgdmFyIG5vZGUgPSBjaGlsZHNbaV1cbiAgICBpZiAoQXJyYXkuaXNBcnJheShub2RlKSkge1xuICAgICAgYXBwZW5kQ2hpbGQoZWwsIG5vZGUpXG4gICAgICBjb250aW51ZVxuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygbm9kZSA9PT0gJ251bWJlcicgfHxcbiAgICAgIHR5cGVvZiBub2RlID09PSAnYm9vbGVhbicgfHxcbiAgICAgIHR5cGVvZiBub2RlID09PSAnZnVuY3Rpb24nIHx8XG4gICAgICBub2RlIGluc3RhbmNlb2YgRGF0ZSB8fFxuICAgICAgbm9kZSBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgbm9kZSA9IG5vZGUudG9TdHJpbmcoKVxuICAgIH1cblxuICAgIHZhciBsYXN0Q2hpbGQgPSBlbC5jaGlsZE5vZGVzW2VsLmNoaWxkTm9kZXMubGVuZ3RoIC0gMV1cblxuICAgIC8vIEl0ZXJhdGUgb3ZlciB0ZXh0IG5vZGVzXG4gICAgaWYgKHR5cGVvZiBub2RlID09PSAnc3RyaW5nJykge1xuICAgICAgaGFkVGV4dCA9IHRydWVcblxuICAgICAgLy8gSWYgd2UgYWxyZWFkeSBoYWQgdGV4dCwgYXBwZW5kIHRvIHRoZSBleGlzdGluZyB0ZXh0XG4gICAgICBpZiAobGFzdENoaWxkICYmIGxhc3RDaGlsZC5ub2RlTmFtZSA9PT0gJyN0ZXh0Jykge1xuICAgICAgICBsYXN0Q2hpbGQubm9kZVZhbHVlICs9IG5vZGVcblxuICAgICAgLy8gV2UgZGlkbid0IGhhdmUgYSB0ZXh0IG5vZGUgeWV0LCBjcmVhdGUgb25lXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBub2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUobm9kZSlcbiAgICAgICAgZWwuYXBwZW5kQ2hpbGQobm9kZSlcbiAgICAgICAgbGFzdENoaWxkID0gbm9kZVxuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGlzIGlzIHRoZSBsYXN0IG9mIHRoZSBjaGlsZCBub2RlcywgbWFrZSBzdXJlIHdlIGNsb3NlIGl0IG91dFxuICAgICAgLy8gcmlnaHRcbiAgICAgIGlmIChpID09PSBsZW4gLSAxKSB7XG4gICAgICAgIGhhZFRleHQgPSBmYWxzZVxuICAgICAgICAvLyBUcmltIHRoZSBjaGlsZCB0ZXh0IG5vZGVzIGlmIHRoZSBjdXJyZW50IG5vZGUgaXNuJ3QgYVxuICAgICAgICAvLyBub2RlIHdoZXJlIHdoaXRlc3BhY2UgbWF0dGVycy5cbiAgICAgICAgaWYgKFRFWFRfVEFHUy5pbmRleE9mKG5vZGVOYW1lKSA9PT0gLTEgJiZcbiAgICAgICAgICBWRVJCQVRJTV9UQUdTLmluZGV4T2Yobm9kZU5hbWUpID09PSAtMSkge1xuICAgICAgICAgIHZhbHVlID0gbGFzdENoaWxkLm5vZGVWYWx1ZVxuICAgICAgICAgICAgLnJlcGxhY2UobGVhZGluZ05ld2xpbmVSZWdleCwgJycpXG4gICAgICAgICAgICAucmVwbGFjZSh0cmFpbGluZ1NwYWNlUmVnZXgsICcnKVxuICAgICAgICAgICAgLnJlcGxhY2UodHJhaWxpbmdOZXdsaW5lUmVnZXgsICcnKVxuICAgICAgICAgICAgLnJlcGxhY2UobXVsdGlTcGFjZVJlZ2V4LCAnICcpXG4gICAgICAgICAgaWYgKHZhbHVlID09PSAnJykge1xuICAgICAgICAgICAgZWwucmVtb3ZlQ2hpbGQobGFzdENoaWxkKVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsYXN0Q2hpbGQubm9kZVZhbHVlID0gdmFsdWVcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoVkVSQkFUSU1fVEFHUy5pbmRleE9mKG5vZGVOYW1lKSA9PT0gLTEpIHtcbiAgICAgICAgICAvLyBUaGUgdmVyeSBmaXJzdCBub2RlIGluIHRoZSBsaXN0IHNob3VsZCBub3QgaGF2ZSBsZWFkaW5nXG4gICAgICAgICAgLy8gd2hpdGVzcGFjZS4gU2libGluZyB0ZXh0IG5vZGVzIHNob3VsZCBoYXZlIHdoaXRlc3BhY2UgaWYgdGhlcmVcbiAgICAgICAgICAvLyB3YXMgYW55LlxuICAgICAgICAgIGxlYWRlciA9IGkgPT09IDAgPyAnJyA6ICcgJ1xuICAgICAgICAgIHZhbHVlID0gbGFzdENoaWxkLm5vZGVWYWx1ZVxuICAgICAgICAgICAgLnJlcGxhY2UobGVhZGluZ05ld2xpbmVSZWdleCwgbGVhZGVyKVxuICAgICAgICAgICAgLnJlcGxhY2UobGVhZGluZ1NwYWNlUmVnZXgsICcgJylcbiAgICAgICAgICAgIC5yZXBsYWNlKHRyYWlsaW5nU3BhY2VSZWdleCwgJycpXG4gICAgICAgICAgICAucmVwbGFjZSh0cmFpbGluZ05ld2xpbmVSZWdleCwgJycpXG4gICAgICAgICAgICAucmVwbGFjZShtdWx0aVNwYWNlUmVnZXgsICcgJylcbiAgICAgICAgICBsYXN0Q2hpbGQubm9kZVZhbHVlID0gdmFsdWVcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgLy8gSXRlcmF0ZSBvdmVyIERPTSBub2Rlc1xuICAgIH0gZWxzZSBpZiAobm9kZSAmJiBub2RlLm5vZGVUeXBlKSB7XG4gICAgICAvLyBJZiB0aGUgbGFzdCBub2RlIHdhcyBhIHRleHQgbm9kZSwgbWFrZSBzdXJlIGl0IGlzIHByb3Blcmx5IGNsb3NlZCBvdXRcbiAgICAgIGlmIChoYWRUZXh0KSB7XG4gICAgICAgIGhhZFRleHQgPSBmYWxzZVxuXG4gICAgICAgIC8vIFRyaW0gdGhlIGNoaWxkIHRleHQgbm9kZXMgaWYgdGhlIGN1cnJlbnQgbm9kZSBpc24ndCBhXG4gICAgICAgIC8vIHRleHQgbm9kZSBvciBhIGNvZGUgbm9kZVxuICAgICAgICBpZiAoVEVYVF9UQUdTLmluZGV4T2Yobm9kZU5hbWUpID09PSAtMSAmJlxuICAgICAgICAgIFZFUkJBVElNX1RBR1MuaW5kZXhPZihub2RlTmFtZSkgPT09IC0xKSB7XG4gICAgICAgICAgdmFsdWUgPSBsYXN0Q2hpbGQubm9kZVZhbHVlXG4gICAgICAgICAgICAucmVwbGFjZShsZWFkaW5nTmV3bGluZVJlZ2V4LCAnJylcbiAgICAgICAgICAgIC5yZXBsYWNlKHRyYWlsaW5nTmV3bGluZVJlZ2V4LCAnJylcbiAgICAgICAgICAgIC5yZXBsYWNlKG11bHRpU3BhY2VSZWdleCwgJyAnKVxuXG4gICAgICAgICAgLy8gUmVtb3ZlIGVtcHR5IHRleHQgbm9kZXMsIGFwcGVuZCBvdGhlcndpc2VcbiAgICAgICAgICBpZiAodmFsdWUgPT09ICcnKSB7XG4gICAgICAgICAgICBlbC5yZW1vdmVDaGlsZChsYXN0Q2hpbGQpXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxhc3RDaGlsZC5ub2RlVmFsdWUgPSB2YWx1ZVxuICAgICAgICAgIH1cbiAgICAgICAgLy8gVHJpbSB0aGUgY2hpbGQgbm9kZXMgaWYgdGhlIGN1cnJlbnQgbm9kZSBpcyBub3QgYSBub2RlXG4gICAgICAgIC8vIHdoZXJlIGFsbCB3aGl0ZXNwYWNlIG11c3QgYmUgcHJlc2VydmVkXG4gICAgICAgIH0gZWxzZSBpZiAoVkVSQkFUSU1fVEFHUy5pbmRleE9mKG5vZGVOYW1lKSA9PT0gLTEpIHtcbiAgICAgICAgICB2YWx1ZSA9IGxhc3RDaGlsZC5ub2RlVmFsdWVcbiAgICAgICAgICAgIC5yZXBsYWNlKGxlYWRpbmdTcGFjZVJlZ2V4LCAnICcpXG4gICAgICAgICAgICAucmVwbGFjZShsZWFkaW5nTmV3bGluZVJlZ2V4LCAnJylcbiAgICAgICAgICAgIC5yZXBsYWNlKHRyYWlsaW5nTmV3bGluZVJlZ2V4LCAnJylcbiAgICAgICAgICAgIC5yZXBsYWNlKG11bHRpU3BhY2VSZWdleCwgJyAnKVxuICAgICAgICAgIGxhc3RDaGlsZC5ub2RlVmFsdWUgPSB2YWx1ZVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIFN0b3JlIHRoZSBsYXN0IG5vZGVuYW1lXG4gICAgICB2YXIgX25vZGVOYW1lID0gbm9kZS5ub2RlTmFtZVxuICAgICAgaWYgKF9ub2RlTmFtZSkgbm9kZU5hbWUgPSBfbm9kZU5hbWUudG9Mb3dlckNhc2UoKVxuXG4gICAgICAvLyBBcHBlbmQgdGhlIG5vZGUgdG8gdGhlIERPTVxuICAgICAgZWwuYXBwZW5kQ2hpbGQobm9kZSlcbiAgICB9XG4gIH1cbn1cbiIsInZhciBoeXBlcnggPSByZXF1aXJlKCdoeXBlcngnKVxudmFyIGFwcGVuZENoaWxkID0gcmVxdWlyZSgnLi9hcHBlbmRDaGlsZCcpXG5cbnZhciBTVkdOUyA9ICdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZydcbnZhciBYTElOS05TID0gJ2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsnXG5cbnZhciBCT09MX1BST1BTID0gW1xuICAnYXV0b2ZvY3VzJywgJ2NoZWNrZWQnLCAnZGVmYXVsdGNoZWNrZWQnLCAnZGlzYWJsZWQnLCAnZm9ybW5vdmFsaWRhdGUnLFxuICAnaW5kZXRlcm1pbmF0ZScsICdyZWFkb25seScsICdyZXF1aXJlZCcsICdzZWxlY3RlZCcsICd3aWxsdmFsaWRhdGUnXG5dXG5cbnZhciBDT01NRU5UX1RBRyA9ICchLS0nXG5cbnZhciBTVkdfVEFHUyA9IFtcbiAgJ3N2ZycsICdhbHRHbHlwaCcsICdhbHRHbHlwaERlZicsICdhbHRHbHlwaEl0ZW0nLCAnYW5pbWF0ZScsICdhbmltYXRlQ29sb3InLFxuICAnYW5pbWF0ZU1vdGlvbicsICdhbmltYXRlVHJhbnNmb3JtJywgJ2NpcmNsZScsICdjbGlwUGF0aCcsICdjb2xvci1wcm9maWxlJyxcbiAgJ2N1cnNvcicsICdkZWZzJywgJ2Rlc2MnLCAnZWxsaXBzZScsICdmZUJsZW5kJywgJ2ZlQ29sb3JNYXRyaXgnLFxuICAnZmVDb21wb25lbnRUcmFuc2ZlcicsICdmZUNvbXBvc2l0ZScsICdmZUNvbnZvbHZlTWF0cml4JyxcbiAgJ2ZlRGlmZnVzZUxpZ2h0aW5nJywgJ2ZlRGlzcGxhY2VtZW50TWFwJywgJ2ZlRGlzdGFudExpZ2h0JywgJ2ZlRmxvb2QnLFxuICAnZmVGdW5jQScsICdmZUZ1bmNCJywgJ2ZlRnVuY0cnLCAnZmVGdW5jUicsICdmZUdhdXNzaWFuQmx1cicsICdmZUltYWdlJyxcbiAgJ2ZlTWVyZ2UnLCAnZmVNZXJnZU5vZGUnLCAnZmVNb3JwaG9sb2d5JywgJ2ZlT2Zmc2V0JywgJ2ZlUG9pbnRMaWdodCcsXG4gICdmZVNwZWN1bGFyTGlnaHRpbmcnLCAnZmVTcG90TGlnaHQnLCAnZmVUaWxlJywgJ2ZlVHVyYnVsZW5jZScsICdmaWx0ZXInLFxuICAnZm9udCcsICdmb250LWZhY2UnLCAnZm9udC1mYWNlLWZvcm1hdCcsICdmb250LWZhY2UtbmFtZScsICdmb250LWZhY2Utc3JjJyxcbiAgJ2ZvbnQtZmFjZS11cmknLCAnZm9yZWlnbk9iamVjdCcsICdnJywgJ2dseXBoJywgJ2dseXBoUmVmJywgJ2hrZXJuJywgJ2ltYWdlJyxcbiAgJ2xpbmUnLCAnbGluZWFyR3JhZGllbnQnLCAnbWFya2VyJywgJ21hc2snLCAnbWV0YWRhdGEnLCAnbWlzc2luZy1nbHlwaCcsXG4gICdtcGF0aCcsICdwYXRoJywgJ3BhdHRlcm4nLCAncG9seWdvbicsICdwb2x5bGluZScsICdyYWRpYWxHcmFkaWVudCcsICdyZWN0JyxcbiAgJ3NldCcsICdzdG9wJywgJ3N3aXRjaCcsICdzeW1ib2wnLCAndGV4dCcsICd0ZXh0UGF0aCcsICd0aXRsZScsICd0cmVmJyxcbiAgJ3RzcGFuJywgJ3VzZScsICd2aWV3JywgJ3ZrZXJuJ1xuXVxuXG5mdW5jdGlvbiBiZWxDcmVhdGVFbGVtZW50ICh0YWcsIHByb3BzLCBjaGlsZHJlbikge1xuICB2YXIgZWxcblxuICAvLyBJZiBhbiBzdmcgdGFnLCBpdCBuZWVkcyBhIG5hbWVzcGFjZVxuICBpZiAoU1ZHX1RBR1MuaW5kZXhPZih0YWcpICE9PSAtMSkge1xuICAgIHByb3BzLm5hbWVzcGFjZSA9IFNWR05TXG4gIH1cblxuICAvLyBJZiB3ZSBhcmUgdXNpbmcgYSBuYW1lc3BhY2VcbiAgdmFyIG5zID0gZmFsc2VcbiAgaWYgKHByb3BzLm5hbWVzcGFjZSkge1xuICAgIG5zID0gcHJvcHMubmFtZXNwYWNlXG4gICAgZGVsZXRlIHByb3BzLm5hbWVzcGFjZVxuICB9XG5cbiAgLy8gQ3JlYXRlIHRoZSBlbGVtZW50XG4gIGlmIChucykge1xuICAgIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKG5zLCB0YWcpXG4gIH0gZWxzZSBpZiAodGFnID09PSBDT01NRU5UX1RBRykge1xuICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVDb21tZW50KHByb3BzLmNvbW1lbnQpXG4gIH0gZWxzZSB7XG4gICAgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZylcbiAgfVxuXG4gIC8vIENyZWF0ZSB0aGUgcHJvcGVydGllc1xuICBmb3IgKHZhciBwIGluIHByb3BzKSB7XG4gICAgaWYgKHByb3BzLmhhc093blByb3BlcnR5KHApKSB7XG4gICAgICB2YXIga2V5ID0gcC50b0xvd2VyQ2FzZSgpXG4gICAgICB2YXIgdmFsID0gcHJvcHNbcF1cbiAgICAgIC8vIE5vcm1hbGl6ZSBjbGFzc05hbWVcbiAgICAgIGlmIChrZXkgPT09ICdjbGFzc25hbWUnKSB7XG4gICAgICAgIGtleSA9ICdjbGFzcydcbiAgICAgICAgcCA9ICdjbGFzcydcbiAgICAgIH1cbiAgICAgIC8vIFRoZSBmb3IgYXR0cmlidXRlIGdldHMgdHJhbnNmb3JtZWQgdG8gaHRtbEZvciwgYnV0IHdlIGp1c3Qgc2V0IGFzIGZvclxuICAgICAgaWYgKHAgPT09ICdodG1sRm9yJykge1xuICAgICAgICBwID0gJ2ZvcidcbiAgICAgIH1cbiAgICAgIC8vIElmIGEgcHJvcGVydHkgaXMgYm9vbGVhbiwgc2V0IGl0c2VsZiB0byB0aGUga2V5XG4gICAgICBpZiAoQk9PTF9QUk9QUy5pbmRleE9mKGtleSkgIT09IC0xKSB7XG4gICAgICAgIGlmICh2YWwgPT09ICd0cnVlJykgdmFsID0ga2V5XG4gICAgICAgIGVsc2UgaWYgKHZhbCA9PT0gJ2ZhbHNlJykgY29udGludWVcbiAgICAgIH1cbiAgICAgIC8vIElmIGEgcHJvcGVydHkgcHJlZmVycyBiZWluZyBzZXQgZGlyZWN0bHkgdnMgc2V0QXR0cmlidXRlXG4gICAgICBpZiAoa2V5LnNsaWNlKDAsIDIpID09PSAnb24nKSB7XG4gICAgICAgIGVsW3BdID0gdmFsXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAobnMpIHtcbiAgICAgICAgICBpZiAocCA9PT0gJ3hsaW5rOmhyZWYnKSB7XG4gICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGVOUyhYTElOS05TLCBwLCB2YWwpXG4gICAgICAgICAgfSBlbHNlIGlmICgvXnhtbG5zKCR8OikvaS50ZXN0KHApKSB7XG4gICAgICAgICAgICAvLyBza2lwIHhtbG5zIGRlZmluaXRpb25zXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZU5TKG51bGwsIHAsIHZhbClcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZWwuc2V0QXR0cmlidXRlKHAsIHZhbClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFwcGVuZENoaWxkKGVsLCBjaGlsZHJlbilcbiAgcmV0dXJuIGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gaHlwZXJ4KGJlbENyZWF0ZUVsZW1lbnQsIHtjb21tZW50czogdHJ1ZX0pXG5tb2R1bGUuZXhwb3J0cy5kZWZhdWx0ID0gbW9kdWxlLmV4cG9ydHNcbm1vZHVsZS5leHBvcnRzLmNyZWF0ZUVsZW1lbnQgPSBiZWxDcmVhdGVFbGVtZW50XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGF0dHJpYnV0ZVRvUHJvcGVydHlcblxudmFyIHRyYW5zZm9ybSA9IHtcbiAgJ2NsYXNzJzogJ2NsYXNzTmFtZScsXG4gICdmb3InOiAnaHRtbEZvcicsXG4gICdodHRwLWVxdWl2JzogJ2h0dHBFcXVpdidcbn1cblxuZnVuY3Rpb24gYXR0cmlidXRlVG9Qcm9wZXJ0eSAoaCkge1xuICByZXR1cm4gZnVuY3Rpb24gKHRhZ05hbWUsIGF0dHJzLCBjaGlsZHJlbikge1xuICAgIGZvciAodmFyIGF0dHIgaW4gYXR0cnMpIHtcbiAgICAgIGlmIChhdHRyIGluIHRyYW5zZm9ybSkge1xuICAgICAgICBhdHRyc1t0cmFuc2Zvcm1bYXR0cl1dID0gYXR0cnNbYXR0cl1cbiAgICAgICAgZGVsZXRlIGF0dHJzW2F0dHJdXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBoKHRhZ05hbWUsIGF0dHJzLCBjaGlsZHJlbilcbiAgfVxufVxuIiwidmFyIGF0dHJUb1Byb3AgPSByZXF1aXJlKCdoeXBlcnNjcmlwdC1hdHRyaWJ1dGUtdG8tcHJvcGVydHknKVxuXG52YXIgVkFSID0gMCwgVEVYVCA9IDEsIE9QRU4gPSAyLCBDTE9TRSA9IDMsIEFUVFIgPSA0XG52YXIgQVRUUl9LRVkgPSA1LCBBVFRSX0tFWV9XID0gNlxudmFyIEFUVFJfVkFMVUVfVyA9IDcsIEFUVFJfVkFMVUUgPSA4XG52YXIgQVRUUl9WQUxVRV9TUSA9IDksIEFUVFJfVkFMVUVfRFEgPSAxMFxudmFyIEFUVFJfRVEgPSAxMSwgQVRUUl9CUkVBSyA9IDEyXG52YXIgQ09NTUVOVCA9IDEzXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGgsIG9wdHMpIHtcbiAgaWYgKCFvcHRzKSBvcHRzID0ge31cbiAgdmFyIGNvbmNhdCA9IG9wdHMuY29uY2F0IHx8IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgcmV0dXJuIFN0cmluZyhhKSArIFN0cmluZyhiKVxuICB9XG4gIGlmIChvcHRzLmF0dHJUb1Byb3AgIT09IGZhbHNlKSB7XG4gICAgaCA9IGF0dHJUb1Byb3AoaClcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbiAoc3RyaW5ncykge1xuICAgIHZhciBzdGF0ZSA9IFRFWFQsIHJlZyA9ICcnXG4gICAgdmFyIGFyZ2xlbiA9IGFyZ3VtZW50cy5sZW5ndGhcbiAgICB2YXIgcGFydHMgPSBbXVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHJpbmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoaSA8IGFyZ2xlbiAtIDEpIHtcbiAgICAgICAgdmFyIGFyZyA9IGFyZ3VtZW50c1tpKzFdXG4gICAgICAgIHZhciBwID0gcGFyc2Uoc3RyaW5nc1tpXSlcbiAgICAgICAgdmFyIHhzdGF0ZSA9IHN0YXRlXG4gICAgICAgIGlmICh4c3RhdGUgPT09IEFUVFJfVkFMVUVfRFEpIHhzdGF0ZSA9IEFUVFJfVkFMVUVcbiAgICAgICAgaWYgKHhzdGF0ZSA9PT0gQVRUUl9WQUxVRV9TUSkgeHN0YXRlID0gQVRUUl9WQUxVRVxuICAgICAgICBpZiAoeHN0YXRlID09PSBBVFRSX1ZBTFVFX1cpIHhzdGF0ZSA9IEFUVFJfVkFMVUVcbiAgICAgICAgaWYgKHhzdGF0ZSA9PT0gQVRUUikgeHN0YXRlID0gQVRUUl9LRVlcbiAgICAgICAgaWYgKHhzdGF0ZSA9PT0gT1BFTikge1xuICAgICAgICAgIGlmIChyZWcgPT09ICcvJykge1xuICAgICAgICAgICAgcC5wdXNoKFsgT1BFTiwgJy8nLCBhcmcgXSlcbiAgICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHAucHVzaChbIE9QRU4sIGFyZyBdKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh4c3RhdGUgPT09IENPTU1FTlQgJiYgb3B0cy5jb21tZW50cykge1xuICAgICAgICAgIHJlZyArPSBTdHJpbmcoYXJnKVxuICAgICAgICB9IGVsc2UgaWYgKHhzdGF0ZSAhPT0gQ09NTUVOVCkge1xuICAgICAgICAgIHAucHVzaChbIFZBUiwgeHN0YXRlLCBhcmcgXSlcbiAgICAgICAgfVxuICAgICAgICBwYXJ0cy5wdXNoLmFwcGx5KHBhcnRzLCBwKVxuICAgICAgfSBlbHNlIHBhcnRzLnB1c2guYXBwbHkocGFydHMsIHBhcnNlKHN0cmluZ3NbaV0pKVxuICAgIH1cblxuICAgIHZhciB0cmVlID0gW251bGwse30sW11dXG4gICAgdmFyIHN0YWNrID0gW1t0cmVlLC0xXV1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgY3VyID0gc3RhY2tbc3RhY2subGVuZ3RoLTFdWzBdXG4gICAgICB2YXIgcCA9IHBhcnRzW2ldLCBzID0gcFswXVxuICAgICAgaWYgKHMgPT09IE9QRU4gJiYgL15cXC8vLnRlc3QocFsxXSkpIHtcbiAgICAgICAgdmFyIGl4ID0gc3RhY2tbc3RhY2subGVuZ3RoLTFdWzFdXG4gICAgICAgIGlmIChzdGFjay5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgc3RhY2sucG9wKClcbiAgICAgICAgICBzdGFja1tzdGFjay5sZW5ndGgtMV1bMF1bMl1baXhdID0gaChcbiAgICAgICAgICAgIGN1clswXSwgY3VyWzFdLCBjdXJbMl0ubGVuZ3RoID8gY3VyWzJdIDogdW5kZWZpbmVkXG4gICAgICAgICAgKVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHMgPT09IE9QRU4pIHtcbiAgICAgICAgdmFyIGMgPSBbcFsxXSx7fSxbXV1cbiAgICAgICAgY3VyWzJdLnB1c2goYylcbiAgICAgICAgc3RhY2sucHVzaChbYyxjdXJbMl0ubGVuZ3RoLTFdKVxuICAgICAgfSBlbHNlIGlmIChzID09PSBBVFRSX0tFWSB8fCAocyA9PT0gVkFSICYmIHBbMV0gPT09IEFUVFJfS0VZKSkge1xuICAgICAgICB2YXIga2V5ID0gJydcbiAgICAgICAgdmFyIGNvcHlLZXlcbiAgICAgICAgZm9yICg7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChwYXJ0c1tpXVswXSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgICAgIGtleSA9IGNvbmNhdChrZXksIHBhcnRzW2ldWzFdKVxuICAgICAgICAgIH0gZWxzZSBpZiAocGFydHNbaV1bMF0gPT09IFZBUiAmJiBwYXJ0c1tpXVsxXSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcGFydHNbaV1bMl0gPT09ICdvYmplY3QnICYmICFrZXkpIHtcbiAgICAgICAgICAgICAgZm9yIChjb3B5S2V5IGluIHBhcnRzW2ldWzJdKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnRzW2ldWzJdLmhhc093blByb3BlcnR5KGNvcHlLZXkpICYmICFjdXJbMV1bY29weUtleV0pIHtcbiAgICAgICAgICAgICAgICAgIGN1clsxXVtjb3B5S2V5XSA9IHBhcnRzW2ldWzJdW2NvcHlLZXldXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBrZXkgPSBjb25jYXQoa2V5LCBwYXJ0c1tpXVsyXSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgYnJlYWtcbiAgICAgICAgfVxuICAgICAgICBpZiAocGFydHNbaV1bMF0gPT09IEFUVFJfRVEpIGkrK1xuICAgICAgICB2YXIgaiA9IGlcbiAgICAgICAgZm9yICg7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChwYXJ0c1tpXVswXSA9PT0gQVRUUl9WQUxVRSB8fCBwYXJ0c1tpXVswXSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgICAgIGlmICghY3VyWzFdW2tleV0pIGN1clsxXVtrZXldID0gc3RyZm4ocGFydHNbaV1bMV0pXG4gICAgICAgICAgICBlbHNlIHBhcnRzW2ldWzFdPT09XCJcIiB8fCAoY3VyWzFdW2tleV0gPSBjb25jYXQoY3VyWzFdW2tleV0sIHBhcnRzW2ldWzFdKSk7XG4gICAgICAgICAgfSBlbHNlIGlmIChwYXJ0c1tpXVswXSA9PT0gVkFSXG4gICAgICAgICAgJiYgKHBhcnRzW2ldWzFdID09PSBBVFRSX1ZBTFVFIHx8IHBhcnRzW2ldWzFdID09PSBBVFRSX0tFWSkpIHtcbiAgICAgICAgICAgIGlmICghY3VyWzFdW2tleV0pIGN1clsxXVtrZXldID0gc3RyZm4ocGFydHNbaV1bMl0pXG4gICAgICAgICAgICBlbHNlIHBhcnRzW2ldWzJdPT09XCJcIiB8fCAoY3VyWzFdW2tleV0gPSBjb25jYXQoY3VyWzFdW2tleV0sIHBhcnRzW2ldWzJdKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChrZXkubGVuZ3RoICYmICFjdXJbMV1ba2V5XSAmJiBpID09PSBqXG4gICAgICAgICAgICAmJiAocGFydHNbaV1bMF0gPT09IENMT1NFIHx8IHBhcnRzW2ldWzBdID09PSBBVFRSX0JSRUFLKSkge1xuICAgICAgICAgICAgICAvLyBodHRwczovL2h0bWwuc3BlYy53aGF0d2cub3JnL211bHRpcGFnZS9pbmZyYXN0cnVjdHVyZS5odG1sI2Jvb2xlYW4tYXR0cmlidXRlc1xuICAgICAgICAgICAgICAvLyBlbXB0eSBzdHJpbmcgaXMgZmFsc3ksIG5vdCB3ZWxsIGJlaGF2ZWQgdmFsdWUgaW4gYnJvd3NlclxuICAgICAgICAgICAgICBjdXJbMV1ba2V5XSA9IGtleS50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocGFydHNbaV1bMF0gPT09IENMT1NFKSB7XG4gICAgICAgICAgICAgIGktLVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgY3VyWzFdW3BbMV1dID0gdHJ1ZVxuICAgICAgfSBlbHNlIGlmIChzID09PSBWQVIgJiYgcFsxXSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgY3VyWzFdW3BbMl1dID0gdHJ1ZVxuICAgICAgfSBlbHNlIGlmIChzID09PSBDTE9TRSkge1xuICAgICAgICBpZiAoc2VsZkNsb3NpbmcoY3VyWzBdKSAmJiBzdGFjay5sZW5ndGgpIHtcbiAgICAgICAgICB2YXIgaXggPSBzdGFja1tzdGFjay5sZW5ndGgtMV1bMV1cbiAgICAgICAgICBzdGFjay5wb3AoKVxuICAgICAgICAgIHN0YWNrW3N0YWNrLmxlbmd0aC0xXVswXVsyXVtpeF0gPSBoKFxuICAgICAgICAgICAgY3VyWzBdLCBjdXJbMV0sIGN1clsyXS5sZW5ndGggPyBjdXJbMl0gOiB1bmRlZmluZWRcbiAgICAgICAgICApXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gVkFSICYmIHBbMV0gPT09IFRFWFQpIHtcbiAgICAgICAgaWYgKHBbMl0gPT09IHVuZGVmaW5lZCB8fCBwWzJdID09PSBudWxsKSBwWzJdID0gJydcbiAgICAgICAgZWxzZSBpZiAoIXBbMl0pIHBbMl0gPSBjb25jYXQoJycsIHBbMl0pXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHBbMl1bMF0pKSB7XG4gICAgICAgICAgY3VyWzJdLnB1c2guYXBwbHkoY3VyWzJdLCBwWzJdKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGN1clsyXS5wdXNoKHBbMl0pXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gVEVYVCkge1xuICAgICAgICBjdXJbMl0ucHVzaChwWzFdKVxuICAgICAgfSBlbHNlIGlmIChzID09PSBBVFRSX0VRIHx8IHMgPT09IEFUVFJfQlJFQUspIHtcbiAgICAgICAgLy8gbm8tb3BcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigndW5oYW5kbGVkOiAnICsgcylcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodHJlZVsyXS5sZW5ndGggPiAxICYmIC9eXFxzKiQvLnRlc3QodHJlZVsyXVswXSkpIHtcbiAgICAgIHRyZWVbMl0uc2hpZnQoKVxuICAgIH1cblxuICAgIGlmICh0cmVlWzJdLmxlbmd0aCA+IDJcbiAgICB8fCAodHJlZVsyXS5sZW5ndGggPT09IDIgJiYgL1xcUy8udGVzdCh0cmVlWzJdWzFdKSkpIHtcbiAgICAgIGlmIChvcHRzLmNyZWF0ZUZyYWdtZW50KSByZXR1cm4gb3B0cy5jcmVhdGVGcmFnbWVudCh0cmVlWzJdKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnbXVsdGlwbGUgcm9vdCBlbGVtZW50cyBtdXN0IGJlIHdyYXBwZWQgaW4gYW4gZW5jbG9zaW5nIHRhZydcbiAgICAgIClcbiAgICB9XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodHJlZVsyXVswXSkgJiYgdHlwZW9mIHRyZWVbMl1bMF1bMF0gPT09ICdzdHJpbmcnXG4gICAgJiYgQXJyYXkuaXNBcnJheSh0cmVlWzJdWzBdWzJdKSkge1xuICAgICAgdHJlZVsyXVswXSA9IGgodHJlZVsyXVswXVswXSwgdHJlZVsyXVswXVsxXSwgdHJlZVsyXVswXVsyXSlcbiAgICB9XG4gICAgcmV0dXJuIHRyZWVbMl1bMF1cblxuICAgIGZ1bmN0aW9uIHBhcnNlIChzdHIpIHtcbiAgICAgIHZhciByZXMgPSBbXVxuICAgICAgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX1cpIHN0YXRlID0gQVRUUlxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGMgPSBzdHIuY2hhckF0KGkpXG4gICAgICAgIGlmIChzdGF0ZSA9PT0gVEVYVCAmJiBjID09PSAnPCcpIHtcbiAgICAgICAgICBpZiAocmVnLmxlbmd0aCkgcmVzLnB1c2goW1RFWFQsIHJlZ10pXG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IE9QRU5cbiAgICAgICAgfSBlbHNlIGlmIChjID09PSAnPicgJiYgIXF1b3Qoc3RhdGUpICYmIHN0YXRlICE9PSBDT01NRU5UKSB7XG4gICAgICAgICAgaWYgKHN0YXRlID09PSBPUEVOICYmIHJlZy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJlcy5wdXNoKFtPUEVOLHJlZ10pXG4gICAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX0tFWSxyZWddKVxuICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUUgJiYgcmVnLmxlbmd0aCkge1xuICAgICAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnXSlcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzLnB1c2goW0NMT1NFXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gVEVYVFxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBDT01NRU5UICYmIC8tJC8udGVzdChyZWcpICYmIGMgPT09ICctJykge1xuICAgICAgICAgIGlmIChvcHRzLmNvbW1lbnRzKSB7XG4gICAgICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWcuc3Vic3RyKDAsIHJlZy5sZW5ndGggLSAxKV0pXG4gICAgICAgICAgfVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBURVhUXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IE9QRU4gJiYgL14hLS0kLy50ZXN0KHJlZykpIHtcbiAgICAgICAgICBpZiAob3B0cy5jb21tZW50cykge1xuICAgICAgICAgICAgcmVzLnB1c2goW09QRU4sIHJlZ10sW0FUVFJfS0VZLCdjb21tZW50J10sW0FUVFJfRVFdKVxuICAgICAgICAgIH1cbiAgICAgICAgICByZWcgPSBjXG4gICAgICAgICAgc3RhdGUgPSBDT01NRU5UXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IFRFWFQgfHwgc3RhdGUgPT09IENPTU1FTlQpIHtcbiAgICAgICAgICByZWcgKz0gY1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBPUEVOICYmIGMgPT09ICcvJyAmJiByZWcubGVuZ3RoKSB7XG4gICAgICAgICAgLy8gbm8tb3AsIHNlbGYgY2xvc2luZyB0YWcgd2l0aG91dCBhIHNwYWNlIDxici8+XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IE9QRU4gJiYgL1xccy8udGVzdChjKSkge1xuICAgICAgICAgIGlmIChyZWcubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXMucHVzaChbT1BFTiwgcmVnXSlcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gT1BFTikge1xuICAgICAgICAgIHJlZyArPSBjXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFIgJiYgL1teXFxzXCInPS9dLy50ZXN0KGMpKSB7XG4gICAgICAgICAgc3RhdGUgPSBBVFRSX0tFWVxuICAgICAgICAgIHJlZyA9IGNcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUiAmJiAvXFxzLy50ZXN0KGMpKSB7XG4gICAgICAgICAgaWYgKHJlZy5sZW5ndGgpIHJlcy5wdXNoKFtBVFRSX0tFWSxyZWddKVxuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX0JSRUFLXSlcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9LRVkgJiYgL1xccy8udGVzdChjKSkge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX0tFWSxyZWddKVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBBVFRSX0tFWV9XXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfS0VZICYmIGMgPT09ICc9Jykge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX0tFWSxyZWddLFtBVFRSX0VRXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gQVRUUl9WQUxVRV9XXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfS0VZKSB7XG4gICAgICAgICAgcmVnICs9IGNcbiAgICAgICAgfSBlbHNlIGlmICgoc3RhdGUgPT09IEFUVFJfS0VZX1cgfHwgc3RhdGUgPT09IEFUVFIpICYmIGMgPT09ICc9Jykge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX0VRXSlcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJfVkFMVUVfV1xuICAgICAgICB9IGVsc2UgaWYgKChzdGF0ZSA9PT0gQVRUUl9LRVlfVyB8fCBzdGF0ZSA9PT0gQVRUUikgJiYgIS9cXHMvLnRlc3QoYykpIHtcbiAgICAgICAgICByZXMucHVzaChbQVRUUl9CUkVBS10pXG4gICAgICAgICAgaWYgKC9bXFx3LV0vLnRlc3QoYykpIHtcbiAgICAgICAgICAgIHJlZyArPSBjXG4gICAgICAgICAgICBzdGF0ZSA9IEFUVFJfS0VZXG4gICAgICAgICAgfSBlbHNlIHN0YXRlID0gQVRUUlxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX1cgJiYgYyA9PT0gJ1wiJykge1xuICAgICAgICAgIHN0YXRlID0gQVRUUl9WQUxVRV9EUVxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX1cgJiYgYyA9PT0gXCInXCIpIHtcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJfVkFMVUVfU1FcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9EUSAmJiBjID09PSAnXCInKSB7XG4gICAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnXSxbQVRUUl9CUkVBS10pXG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9TUSAmJiBjID09PSBcIidcIikge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX1ZBTFVFLHJlZ10sW0FUVFJfQlJFQUtdKVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBBVFRSXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUVfVyAmJiAhL1xccy8udGVzdChjKSkge1xuICAgICAgICAgIHN0YXRlID0gQVRUUl9WQUxVRVxuICAgICAgICAgIGktLVxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFICYmIC9cXHMvLnRlc3QoYykpIHtcbiAgICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWddLFtBVFRSX0JSRUFLXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gQVRUUlxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFIHx8IHN0YXRlID09PSBBVFRSX1ZBTFVFX1NRXG4gICAgICAgIHx8IHN0YXRlID09PSBBVFRSX1ZBTFVFX0RRKSB7XG4gICAgICAgICAgcmVnICs9IGNcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHN0YXRlID09PSBURVhUICYmIHJlZy5sZW5ndGgpIHtcbiAgICAgICAgcmVzLnB1c2goW1RFWFQscmVnXSlcbiAgICAgICAgcmVnID0gJydcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUUgJiYgcmVnLmxlbmd0aCkge1xuICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWddKVxuICAgICAgICByZWcgPSAnJ1xuICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9EUSAmJiByZWcubGVuZ3RoKSB7XG4gICAgICAgIHJlcy5wdXNoKFtBVFRSX1ZBTFVFLHJlZ10pXG4gICAgICAgIHJlZyA9ICcnXG4gICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX1NRICYmIHJlZy5sZW5ndGgpIHtcbiAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnXSlcbiAgICAgICAgcmVnID0gJydcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfS0VZKSB7XG4gICAgICAgIHJlcy5wdXNoKFtBVFRSX0tFWSxyZWddKVxuICAgICAgICByZWcgPSAnJ1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHN0cmZuICh4KSB7XG4gICAgaWYgKHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nKSByZXR1cm4geFxuICAgIGVsc2UgaWYgKHR5cGVvZiB4ID09PSAnc3RyaW5nJykgcmV0dXJuIHhcbiAgICBlbHNlIGlmICh4ICYmIHR5cGVvZiB4ID09PSAnb2JqZWN0JykgcmV0dXJuIHhcbiAgICBlbHNlIGlmICh4ID09PSBudWxsIHx8IHggPT09IHVuZGVmaW5lZCkgcmV0dXJuIHhcbiAgICBlbHNlIHJldHVybiBjb25jYXQoJycsIHgpXG4gIH1cbn1cblxuZnVuY3Rpb24gcXVvdCAoc3RhdGUpIHtcbiAgcmV0dXJuIHN0YXRlID09PSBBVFRSX1ZBTFVFX1NRIHx8IHN0YXRlID09PSBBVFRSX1ZBTFVFX0RRXG59XG5cbnZhciBjbG9zZVJFID0gUmVnRXhwKCdeKCcgKyBbXG4gICdhcmVhJywgJ2Jhc2UnLCAnYmFzZWZvbnQnLCAnYmdzb3VuZCcsICdicicsICdjb2wnLCAnY29tbWFuZCcsICdlbWJlZCcsXG4gICdmcmFtZScsICdocicsICdpbWcnLCAnaW5wdXQnLCAnaXNpbmRleCcsICdrZXlnZW4nLCAnbGluaycsICdtZXRhJywgJ3BhcmFtJyxcbiAgJ3NvdXJjZScsICd0cmFjaycsICd3YnInLCAnIS0tJyxcbiAgLy8gU1ZHIFRBR1NcbiAgJ2FuaW1hdGUnLCAnYW5pbWF0ZVRyYW5zZm9ybScsICdjaXJjbGUnLCAnY3Vyc29yJywgJ2Rlc2MnLCAnZWxsaXBzZScsXG4gICdmZUJsZW5kJywgJ2ZlQ29sb3JNYXRyaXgnLCAnZmVDb21wb3NpdGUnLFxuICAnZmVDb252b2x2ZU1hdHJpeCcsICdmZURpZmZ1c2VMaWdodGluZycsICdmZURpc3BsYWNlbWVudE1hcCcsXG4gICdmZURpc3RhbnRMaWdodCcsICdmZUZsb29kJywgJ2ZlRnVuY0EnLCAnZmVGdW5jQicsICdmZUZ1bmNHJywgJ2ZlRnVuY1InLFxuICAnZmVHYXVzc2lhbkJsdXInLCAnZmVJbWFnZScsICdmZU1lcmdlTm9kZScsICdmZU1vcnBob2xvZ3knLFxuICAnZmVPZmZzZXQnLCAnZmVQb2ludExpZ2h0JywgJ2ZlU3BlY3VsYXJMaWdodGluZycsICdmZVNwb3RMaWdodCcsICdmZVRpbGUnLFxuICAnZmVUdXJidWxlbmNlJywgJ2ZvbnQtZmFjZS1mb3JtYXQnLCAnZm9udC1mYWNlLW5hbWUnLCAnZm9udC1mYWNlLXVyaScsXG4gICdnbHlwaCcsICdnbHlwaFJlZicsICdoa2VybicsICdpbWFnZScsICdsaW5lJywgJ21pc3NpbmctZ2x5cGgnLCAnbXBhdGgnLFxuICAncGF0aCcsICdwb2x5Z29uJywgJ3BvbHlsaW5lJywgJ3JlY3QnLCAnc2V0JywgJ3N0b3AnLCAndHJlZicsICd1c2UnLCAndmlldycsXG4gICd2a2Vybidcbl0uam9pbignfCcpICsgJykoPzpbXFwuI11bYS16QS1aMC05XFx1MDA3Ri1cXHVGRkZGXzotXSspKiQnKVxuZnVuY3Rpb24gc2VsZkNsb3NpbmcgKHRhZykgeyByZXR1cm4gY2xvc2VSRS50ZXN0KHRhZykgfVxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgXCJlbnRpdHlMaXN0XCI6IFwiaHR0cHM6Ly9kdWNrZHVja2dvLmNvbS9jb250ZW50YmxvY2tpbmcuanM/bD1lbnRpdHlsaXN0MlwiLFxuICAgIFwiZW50aXR5TWFwXCI6IFwiZGF0YS90cmFja2VyX2xpc3RzL2VudGl0eU1hcC5qc29uXCIsXG4gICAgXCJkaXNwbGF5Q2F0ZWdvcmllc1wiOiBbXCJBbmFseXRpY3NcIiwgXCJBZHZlcnRpc2luZ1wiLCBcIlNvY2lhbCBOZXR3b3JrXCJdLFxuICAgIFwicmVxdWVzdExpc3RlbmVyVHlwZXNcIjogW1wibWFpbl9mcmFtZVwiLFwic3ViX2ZyYW1lXCIsXCJzdHlsZXNoZWV0XCIsXCJzY3JpcHRcIixcImltYWdlXCIsXCJvYmplY3RcIixcInhtbGh0dHByZXF1ZXN0XCIsXCJvdGhlclwiXSxcbiAgICBcImZlZWRiYWNrVXJsXCI6IFwiaHR0cHM6Ly9kdWNrZHVja2dvLmNvbS9mZWVkYmFjay5qcz90eXBlPWV4dGVuc2lvbi1mZWVkYmFja1wiLFxuICAgIFwidG9zZHJNZXNzYWdlc1wiIDoge1xuICAgICAgICBcIkFcIjogXCJHb29kXCIsXG4gICAgICAgIFwiQlwiOiBcIk1peGVkXCIsXG4gICAgICAgIFwiQ1wiOiBcIlBvb3JcIixcbiAgICAgICAgXCJEXCI6IFwiUG9vclwiLFxuICAgICAgICBcIkVcIjogXCJQb29yXCIsXG4gICAgICAgIFwiZ29vZFwiOiBcIkdvb2RcIixcbiAgICAgICAgXCJiYWRcIjogXCJQb29yXCIsXG4gICAgICAgIFwidW5rbm93blwiOiBcIlVua25vd25cIixcbiAgICAgICAgXCJtaXhlZFwiOiBcIk1peGVkXCJcbiAgICB9LFxuICAgIFwiaHR0cHNTZXJ2aWNlXCI6IFwiaHR0cHM6Ly9kdWNrZHVja2dvLmNvbS9zbWFydGVyX2VuY3J5cHRpb24uanNcIixcbiAgICBcImR1Y2tEdWNrR29TZXJwSG9zdG5hbWVcIjogXCJkdWNrZHVja2dvLmNvbVwiLFxuICAgIFwiaHR0cHNNZXNzYWdlc1wiOiB7XG4gICAgICAgIFwic2VjdXJlXCI6IFwiRW5jcnlwdGVkIENvbm5lY3Rpb25cIixcbiAgICAgICAgXCJ1cGdyYWRlZFwiOiBcIkZvcmNlZCBFbmNyeXB0aW9uXCIsXG4gICAgICAgIFwibm9uZVwiOiBcIlVuZW5jcnlwdGVkIENvbm5lY3Rpb25cIixcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIE1ham9yIHRyYWNraW5nIG5ldHdvcmtzIGRhdGE6XG4gICAgICogcGVyY2VudCBvZiB0aGUgdG9wIDEgbWlsbGlvbiBzaXRlcyBhIHRyYWNraW5nIG5ldHdvcmsgaGFzIGJlZW4gc2VlbiBvbi5cbiAgICAgKiBzZWU6IGh0dHBzOi8vd2VidHJhbnNwYXJlbmN5LmNzLnByaW5jZXRvbi5lZHUvd2ViY2Vuc3VzL1xuICAgICAqL1xuICAgIFwibWFqb3JUcmFja2luZ05ldHdvcmtzXCI6IHtcbiAgICAgICAgXCJnb29nbGVcIjogODQsXG4gICAgICAgIFwiZmFjZWJvb2tcIjogMzYsXG4gICAgICAgIFwidHdpdHRlclwiOiAxNixcbiAgICAgICAgXCJhbWF6b25cIjogMTQsXG4gICAgICAgIFwiYXBwbmV4dXNcIjogMTAsXG4gICAgICAgIFwib3JhY2xlXCI6IDEwLFxuICAgICAgICBcIm1lZGlhbWF0aFwiOiA5LFxuICAgICAgICBcIm9hdGhcIjogOSxcbiAgICAgICAgXCJtYXhjZG5cIjogNyxcbiAgICAgICAgXCJhdXRvbWF0dGljXCI6IDdcbiAgICB9LFxuICAgIC8qXG4gICAgICogTWFwcGluZyBlbnRpdHkgbmFtZXMgdG8gQ1NTIGNsYXNzIG5hbWUgZm9yIHBvcHVwIGljb25zXG4gICAgICovXG4gICAgXCJlbnRpdHlJY29uTWFwcGluZ1wiOiB7XG4gICAgICAgIFwiR29vZ2xlIExMQ1wiOiBcImdvb2dsZVwiLFxuICAgICAgICBcIkZhY2Vib29rLCBJbmMuXCI6IFwiZmFjZWJvb2tcIixcbiAgICAgICAgXCJUd2l0dGVyLCBJbmMuXCI6IFwidHdpdHRlclwiLFxuICAgICAgICBcIkFtYXpvbiBUZWNobm9sb2dpZXMsIEluYy5cIjogXCJhbWF6b25cIixcbiAgICAgICAgXCJBcHBOZXh1cywgSW5jLlwiOiBcImFwcG5leHVzXCIsXG4gICAgICAgIFwiTWVkaWFNYXRoLCBJbmMuXCI6IFwibWVkaWFtYXRoXCIsXG4gICAgICAgIFwiU3RhY2tQYXRoLCBMTENcIjogXCJtYXhjZG5cIixcbiAgICAgICAgXCJBdXRvbWF0dGljLCBJbmMuXCI6IFwiYXV0b21hdHRpY1wiLFxuICAgICAgICBcIkFkb2JlIEluYy5cIjogXCJhZG9iZVwiLFxuICAgICAgICBcIlF1YW50Y2FzdCBDb3Jwb3JhdGlvblwiOiBcInF1YW50Y2FzdFwiLFxuICAgICAgICBcIlRoZSBOaWVsc2VuIENvbXBhbnlcIjogXCJuaWVsc2VuXCJcbiAgICB9LFxuICAgIFwiaHR0cHNEQk5hbWVcIjogXCJodHRwc1wiLFxuICAgIFwiaHR0cHNMaXN0c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVwZ3JhZGUgYmxvb20gZmlsdGVyXCIsXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJodHRwc1VwZ3JhZGVCbG9vbUZpbHRlclwiLFxuICAgICAgICAgICAgXCJ1cmxcIjogXCJodHRwczovL3N0YXRpY2Nkbi5kdWNrZHVja2dvLmNvbS9odHRwcy9odHRwcy1ibG9vbS5qc29uXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZG9uXFwndCB1cGdyYWRlIGJsb29tIGZpbHRlclwiLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiaHR0cHNEb250VXBncmFkZUJsb29tRmlsdGVyc1wiLFxuICAgICAgICAgICAgXCJ1cmxcIjogXCJodHRwczovL3N0YXRpY2Nkbi5kdWNrZHVja2dvLmNvbS9odHRwcy9uZWdhdGl2ZS1odHRwcy1ibG9vbS5qc29uXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidXBncmFkZSBzYWZlbGlzdFwiLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiaHR0cHNVcGdyYWRlTGlzdFwiLFxuICAgICAgICAgICAgXCJ1cmxcIjogXCJodHRwczovL3N0YXRpY2Nkbi5kdWNrZHVja2dvLmNvbS9odHRwcy9uZWdhdGl2ZS1odHRwcy13aGl0ZWxpc3QuanNvblwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImRvblxcJ3QgdXBncmFkZSBzYWZlbGlzdFwiLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiaHR0cHNEb250VXBncmFkZUxpc3RcIixcbiAgICAgICAgICAgIFwidXJsXCI6IFwiaHR0cHM6Ly9zdGF0aWNjZG4uZHVja2R1Y2tnby5jb20vaHR0cHMvaHR0cHMtd2hpdGVsaXN0Lmpzb25cIlxuICAgICAgICB9LFxuICAgIF0sXG4gICAgXCJ0ZHNMaXN0c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInN1cnJvZ2F0ZXNcIixcbiAgICAgICAgICAgIFwidXJsXCI6IFwiL2RhdGEvc3Vycm9nYXRlcy50eHRcIixcbiAgICAgICAgICAgIFwiZm9ybWF0XCI6IFwidGV4dFwiLFxuICAgICAgICAgICAgXCJzb3VyY2VcIjogXCJsb2NhbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInRkc1wiLFxuICAgICAgICAgICAgXCJ1cmxcIjogXCJodHRwczovL3N0YXRpY2Nkbi5kdWNrZHVja2dvLmNvbS90cmFja2VyYmxvY2tpbmcvdjIuMS90ZHMuanNvblwiLFxuICAgICAgICAgICAgXCJmb3JtYXRcIjogXCJqc29uXCIsXG4gICAgICAgICAgICBcInNvdXJjZVwiOiBcImV4dGVybmFsXCIsXG4gICAgICAgICAgICBcImNoYW5uZWxzXCI6IHtcbiAgICAgICAgICAgICAgICBcImxpdmVcIjogXCJodHRwczovL3N0YXRpY2Nkbi5kdWNrZHVja2dvLmNvbS90cmFja2VyYmxvY2tpbmcvdjIuMS90ZHMuanNvblwiLFxuICAgICAgICAgICAgICAgIFwibmV4dFwiOiBcImh0dHBzOi8vc3RhdGljY2RuLmR1Y2tkdWNrZ28uY29tL3RyYWNrZXJibG9ja2luZy92Mi4xL3Rkcy1uZXh0Lmpzb25cIixcbiAgICAgICAgICAgICAgICBcImJldGFcIjogXCJodHRwczovL3N0YXRpY2Nkbi5kdWNrZHVja2dvLmNvbS90cmFja2VyYmxvY2tpbmcvYmV0YS90ZHMuanNvblwiXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkNsaWNrVG9Mb2FkQ29uZmlnXCIsXG4gICAgICAgICAgICBcInVybFwiOiBcImh0dHBzOi8vc3RhdGljY2RuLmR1Y2tkdWNrZ28uY29tL3VzZXJhZ2VudHMvc29jaWFsX2N0cF9jb25maWd1cmF0aW9uLmpzb25cIixcbiAgICAgICAgICAgIFwiZm9ybWF0XCI6IFwianNvblwiLFxuICAgICAgICAgICAgXCJzb3VyY2VcIjogXCJleHRlcm5hbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcImNvbmZpZ1wiLFxuICAgICAgICAgICAgXCJ1cmxcIjogXCJodHRwczovL3N0YXRpY2Nkbi5kdWNrZHVja2dvLmNvbS90cmFja2VyYmxvY2tpbmcvY29uZmlnL3YxL2V4dGVuc2lvbi1jb25maWcuanNvblwiLFxuICAgICAgICAgICAgXCJmb3JtYXRcIjogXCJqc29uXCIsXG4gICAgICAgICAgICBcInNvdXJjZVwiOiBcImV4dGVybmFsXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJodHRwc0Vycm9yQ29kZXNcIjoge1xuICAgICAgICBcIm5ldDo6RVJSX0NPTk5FQ1RJT05fUkVGVVNFRFwiOiAxLFxuICAgICAgICBcIm5ldDo6RVJSX0FCT1JURURcIjogMixcbiAgICAgICAgXCJuZXQ6OkVSUl9TU0xfUFJPVE9DT0xfRVJST1JcIjogMyxcbiAgICAgICAgXCJuZXQ6OkVSUl9TU0xfVkVSU0lPTl9PUl9DSVBIRVJfTUlTTUFUQ0hcIjogNCxcbiAgICAgICAgXCJuZXQ6OkVSUl9OQU1FX05PVF9SRVNPTFZFRFwiOiA1LFxuICAgICAgICBcIk5TX0VSUk9SX0NPTk5FQ1RJT05fUkVGVVNFRFwiOiA2LFxuICAgICAgICBcIk5TX0VSUk9SX1VOS05PV05fSE9TVFwiOiA3LFxuICAgICAgICBcIkFuIGFkZGl0aW9uYWwgcG9saWN5IGNvbnN0cmFpbnQgZmFpbGVkIHdoZW4gdmFsaWRhdGluZyB0aGlzIGNlcnRpZmljYXRlLlwiOiA4LFxuICAgICAgICBcIlVuYWJsZSB0byBjb21tdW5pY2F0ZSBzZWN1cmVseSB3aXRoIHBlZXI6IHJlcXVlc3RlZCBkb21haW4gbmFtZSBkb2VzIG5vdCBtYXRjaCB0aGUgc2VydmVy4oCZcyBjZXJ0aWZpY2F0ZS5cIjogOSxcbiAgICAgICAgXCJDYW5ub3QgY29tbXVuaWNhdGUgc2VjdXJlbHkgd2l0aCBwZWVyOiBubyBjb21tb24gZW5jcnlwdGlvbiBhbGdvcml0aG0ocykuXCI6IDEwLFxuICAgICAgICBcIlNTTCByZWNlaXZlZCBhIHJlY29yZCB0aGF0IGV4Y2VlZGVkIHRoZSBtYXhpbXVtIHBlcm1pc3NpYmxlIGxlbmd0aC5cIjogMTEsXG4gICAgICAgIFwiVGhlIGNlcnRpZmljYXRlIGlzIG5vdCB0cnVzdGVkIGJlY2F1c2UgaXQgaXMgc2VsZi1zaWduZWQuXCI6IDEyLFxuICAgICAgICBcImRvd25ncmFkZV9yZWRpcmVjdF9sb29wXCI6IDEzXG4gICAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgXCJleHRlbnNpb25Jc0VuYWJsZWRcIjogdHJ1ZSxcbiAgICBcInNvY2lhbEJsb2NraW5nSXNFbmFibGVkXCI6IGZhbHNlLFxuICAgIFwidHJhY2tlckJsb2NraW5nRW5hYmxlZFwiOiB0cnVlLFxuICAgIFwiaHR0cHNFdmVyeXdoZXJlRW5hYmxlZFwiOiB0cnVlLFxuICAgIFwiZW1iZWRkZWRUd2VldHNFbmFibGVkXCI6IGZhbHNlLFxuICAgIFwiR1BDXCI6IHRydWUsXG4gICAgXCJtZWFuaW5nc1wiOiB0cnVlLFxuICAgIFwiYWR2YW5jZWRfb3B0aW9uc1wiOiB0cnVlLFxuICAgIFwibGFzdF9zZWFyY2hcIjogXCJcIixcbiAgICBcImxhc3RzZWFyY2hfZW5hYmxlZFwiOiB0cnVlLFxuICAgIFwic2FmZXNlYXJjaFwiOiB0cnVlLFxuICAgIFwidXNlX3Bvc3RcIjogZmFsc2UsXG4gICAgXCJkdWNreVwiOiBmYWxzZSxcbiAgICBcImRldlwiOiBmYWxzZSxcbiAgICBcInplcm9jbGlja19nb29nbGVfcmlnaHRcIjogZmFsc2UsXG4gICAgXCJ2ZXJzaW9uXCI6IG51bGwsXG4gICAgXCJhdGJcIjogbnVsbCxcbiAgICBcInNldF9hdGJcIjogbnVsbCxcbiAgICBcInRyYWNrZXJzV2hpdGVsaXN0VGVtcG9yYXJ5LWV0YWdcIjogbnVsbCxcbiAgICBcInRyYWNrZXJzV2hpdGVsaXN0LWV0YWdcIjogbnVsbCxcbiAgICBcInN1cnJvZ2F0ZUxpc3QtZXRhZ1wiOiBudWxsLFxuICAgIFwiaHR0cHNVcGdyYWRlQmxvb21GaWx0ZXItZXRhZ1wiOiBudWxsLFxuICAgIFwiaHR0cHNEb250VXBncmFkZUJsb29tRmlsdGVycy1ldGFnXCI6IG51bGwsXG4gICAgXCJodHRwc1VwZ3JhZGVMaXN0LWV0YWdcIjogbnVsbCxcbiAgICBcImh0dHBzRG9udFVwZ3JhZGVMaXN0LWV0YWdcIjogbnVsbCxcbiAgICBcImhhc1NlZW5Qb3N0SW5zdGFsbFwiOiBmYWxzZSxcbiAgICBcImV4dGlTZW50XCI6IGZhbHNlLFxuICAgIFwiZmFpbGVkVXBncmFkZXNcIjogMCxcbiAgICBcInRvdGFsVXBncmFkZXNcIjogMCxcbiAgICBcInRkcy1ldGFnXCI6IG51bGwsXG4gICAgXCJzdXJyb2dhdGVzLWV0YWdcIjogbnVsbCxcbiAgICBcImJyb2tlblNpdGVMaXN0LWV0YWdcIjogbnVsbCxcbiAgICBcImxhc3RUZHNVcGRhdGVcIjogMFxufVxuIiwiXG5jb25zdCBSRUxFQVNFX0VYVEVOU0lPTl9JRFMgPSBbXG4gICAgJ2Nhb2FjYmltZGJibGpha2ZoZ2lrb29kZWtkbmxjZ3BrJywgLy8gZWRnZSBzdG9yZVxuICAgICdia2RnZmxjbGRubm5hcGJsa2hwaGJncGdnZGlpa3BwZycsIC8vIGNocm9tZSBzdG9yZVxuICAgICdqaWQxLVpBZElFVUI3WE96T0p3QGpldHBhY2snIC8vIGZpcmVmb3hcbl1cbmNvbnN0IElTX0JFVEEgPSBSRUxFQVNFX0VYVEVOU0lPTl9JRFMuaW5kZXhPZihjaHJvbWUucnVudGltZS5pZCkgPT09IC0xXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIElTX0JFVEFcbn1cbiIsImNvbnN0IHsgZ2V0U2V0dGluZywgdXBkYXRlU2V0dGluZyB9ID0gcmVxdWlyZSgnLi9zZXR0aW5ncy5lczYnKVxuY29uc3QgUkVGRVRDSF9BTElBU19BTEFSTSA9ICdyZWZldGNoQWxpYXMnXG5cbi8vIEtlZXAgdHJhY2sgb2YgdGhlIG51bWJlciBvZiBhdHRlbXB0ZWQgZmV0Y2hlcy4gU3RvcCB0cnlpbmcgYWZ0ZXIgNS5cbmxldCBhdHRlbXB0cyA9IDFcblxuY29uc3QgZmV0Y2hBbGlhcyA9ICgpID0+IHtcbiAgICAvLyBpZiBhbm90aGVyIGZldGNoIHdhcyBwcmV2aW91c2x5IHNjaGVkdWxlZCwgY2xlYXIgdGhhdCBhbmQgZXhlY3V0ZSBub3dcbiAgICBjaHJvbWUuYWxhcm1zLmdldChSRUZFVENIX0FMSUFTX0FMQVJNLCAoKSA9PiBjaHJvbWUuYWxhcm1zLmNsZWFyKFJFRkVUQ0hfQUxJQVNfQUxBUk0pKVxuXG4gICAgY29uc3QgdXNlckRhdGEgPSBnZXRTZXR0aW5nKCd1c2VyRGF0YScpXG5cbiAgICBpZiAoIXVzZXJEYXRhPy50b2tlbikgcmV0dXJuXG5cbiAgICByZXR1cm4gZmV0Y2goJ2h0dHBzOi8vcXVhY2suZHVja2R1Y2tnby5jb20vYXBpL2VtYWlsL2FkZHJlc3NlcycsIHtcbiAgICAgICAgbWV0aG9kOiAncG9zdCcsXG4gICAgICAgIGhlYWRlcnM6IHsgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke3VzZXJEYXRhLnRva2VufWAgfVxuICAgIH0pXG4gICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkudGhlbigoeyBhZGRyZXNzIH0pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEvXlthLXowLTldKyQvLnRlc3QoYWRkcmVzcykpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBhZGRyZXNzJylcblxuICAgICAgICAgICAgICAgICAgICB1cGRhdGVTZXR0aW5nKCd1c2VyRGF0YScsIE9iamVjdC5hc3NpZ24odXNlckRhdGEsIHsgbmV4dEFsaWFzOiBgJHthZGRyZXNzfWAgfSkpXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlc2V0IGF0dGVtcHRzXG4gICAgICAgICAgICAgICAgICAgIGF0dGVtcHRzID0gMVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FuIGVycm9yIG9jY3VycmVkIHdoaWxlIGZldGNoaW5nIHRoZSBhbGlhcycpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChlID0+IHtcbiAgICAgICAgICAgIC8vIFRPRE86IERvIHdlIHdhbnQgdG8gbG9nb3V0IGlmIHRoZSBlcnJvciBpcyBhIDQwMSB1bmF1dGhvcml6ZWQ/XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgZmV0Y2hpbmcgbmV3IGFsaWFzJywgZSlcbiAgICAgICAgICAgIC8vIERvbid0IHRyeSBmZXRjaGluZyBtb3JlIHRoYW4gNSB0aW1lcyBpbiBhIHJvd1xuICAgICAgICAgICAgaWYgKGF0dGVtcHRzIDwgNSkge1xuICAgICAgICAgICAgICAgIGNocm9tZS5hbGFybXMuY3JlYXRlKFJFRkVUQ0hfQUxJQVNfQUxBUk0sIHsgZGVsYXlJbk1pbnV0ZXM6IDIgfSlcbiAgICAgICAgICAgICAgICBhdHRlbXB0cysrXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBSZXR1cm4gdGhlIGVycm9yIHNvIHdlIGNhbiBoYW5kbGUgaXRcbiAgICAgICAgICAgIHJldHVybiB7IGVycm9yOiBlIH1cbiAgICAgICAgfSlcbn1cblxuY29uc3QgTUVOVV9JVEVNX0lEID0gJ2RkZy1hdXRvZmlsbC1jb250ZXh0LW1lbnUtaXRlbSdcbmNvbnN0IGNyZWF0ZUF1dG9maWxsQ29udGV4dE1lbnVJdGVtID0gKCkgPT4ge1xuICAgIC8vIENyZWF0ZSB0aGUgY29udGV4dHVhbCBtZW51IGhpZGRlbiBieSBkZWZhdWx0XG4gICAgY2hyb21lLmNvbnRleHRNZW51cy5jcmVhdGUoe1xuICAgICAgICBpZDogTUVOVV9JVEVNX0lELFxuICAgICAgICB0aXRsZTogJ1VzZSBEdWNrIEFkZHJlc3MnLFxuICAgICAgICBjb250ZXh0czogWydlZGl0YWJsZSddLFxuICAgICAgICB2aXNpYmxlOiBmYWxzZSxcbiAgICAgICAgb25jbGljazogKGluZm8sIHRhYikgPT4ge1xuICAgICAgICAgICAgY29uc3QgdXNlckRhdGEgPSBnZXRTZXR0aW5nKCd1c2VyRGF0YScpXG4gICAgICAgICAgICBpZiAodXNlckRhdGEubmV4dEFsaWFzKSB7XG4gICAgICAgICAgICAgICAgY2hyb21lLnRhYnMuc2VuZE1lc3NhZ2UodGFiLmlkLCB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjb250ZXh0dWFsQXV0b2ZpbGwnLFxuICAgICAgICAgICAgICAgICAgICBhbGlhczogdXNlckRhdGEubmV4dEFsaWFzXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pXG59XG5cbmNvbnN0IHNob3dDb250ZXh0TWVudUFjdGlvbiA9ICgpID0+IGNocm9tZS5jb250ZXh0TWVudXMudXBkYXRlKE1FTlVfSVRFTV9JRCwgeyB2aXNpYmxlOiB0cnVlIH0pXG5cbmNvbnN0IGhpZGVDb250ZXh0TWVudUFjdGlvbiA9ICgpID0+IGNocm9tZS5jb250ZXh0TWVudXMudXBkYXRlKE1FTlVfSVRFTV9JRCwgeyB2aXNpYmxlOiBmYWxzZSB9KVxuXG5jb25zdCBnZXRBZGRyZXNzZXMgPSAoKSA9PiB7XG4gICAgY29uc3QgdXNlckRhdGEgPSBnZXRTZXR0aW5nKCd1c2VyRGF0YScpXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcGVyc29uYWxBZGRyZXNzOiB1c2VyRGF0YT8udXNlck5hbWUsXG4gICAgICAgIHByaXZhdGVBZGRyZXNzOiB1c2VyRGF0YT8ubmV4dEFsaWFzXG4gICAgfVxufVxuXG4vKipcbiAqIEdpdmVuIGEgdXNlcm5hbWUsIHJldHVybnMgYSB2YWxpZCBlbWFpbCBhZGRyZXNzIHdpdGggdGhlIGR1Y2sgZG9tYWluXG4gKiBAcGFyYW0ge3N0cmluZ30gYWRkcmVzc1xuICogQHJldHVybnMge3N0cmluZ31cbiAqL1xuY29uc3QgZm9ybWF0QWRkcmVzcyA9IChhZGRyZXNzKSA9PiBhZGRyZXNzICsgJ0BkdWNrLmNvbSdcblxuLyoqXG4gKiBDaGVja3MgZm9ybWFsIHVzZXJuYW1lIHZhbGlkaXR5XG4gKiBAcGFyYW0ge3N0cmluZ30gdXNlck5hbWVcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5jb25zdCBpc1ZhbGlkVXNlcm5hbWUgPSAodXNlck5hbWUpID0+IC9eW2EtejAtOV9dKyQvLnRlc3QodXNlck5hbWUpXG5cbi8qKlxuICogQ2hlY2tzIGZvcm1hbCB0b2tlbiB2YWxpZGl0eVxuICogQHBhcmFtIHtzdHJpbmd9IHRva2VuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuY29uc3QgaXNWYWxpZFRva2VuID0gKHRva2VuKSA9PiAvXlthLXowLTldKyQvLnRlc3QodG9rZW4pXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFJFRkVUQ0hfQUxJQVNfQUxBUk0sXG4gICAgZmV0Y2hBbGlhcyxcbiAgICBjcmVhdGVBdXRvZmlsbENvbnRleHRNZW51SXRlbSxcbiAgICBzaG93Q29udGV4dE1lbnVBY3Rpb24sXG4gICAgaGlkZUNvbnRleHRNZW51QWN0aW9uLFxuICAgIGdldEFkZHJlc3NlcyxcbiAgICBmb3JtYXRBZGRyZXNzLFxuICAgIGlzVmFsaWRVc2VybmFtZSxcbiAgICBpc1ZhbGlkVG9rZW5cbn1cbiIsImNvbnN0IGRlZmF1bHRTZXR0aW5ncyA9IHJlcXVpcmUoJy4uLy4uL2RhdGEvZGVmYXVsdFNldHRpbmdzJylcbmNvbnN0IGJyb3dzZXJXcmFwcGVyID0gcmVxdWlyZSgnLi93cmFwcGVyLmVzNicpXG5cbi8qKlxuICogU2V0dGluZ3Mgd2hvc2UgZGVmYXVsdHMgY2FuIGJ5IG1hbmFnZWQgYnkgdGhlIHN5c3RlbSBhZG1pbmlzdHJhdG9yXG4gKi9cbmNvbnN0IE1BTkFHRURfU0VUVElOR1MgPSBbJ2hhc1NlZW5Qb3N0SW5zdGFsbCddXG4vKipcbiAqIFB1YmxpYyBhcGlcbiAqIFVzYWdlOlxuICogWW91IGNhbiB1c2UgcHJvbWlzZSBjYWxsYmFja3MgdG8gY2hlY2sgcmVhZHluZXNzIGJlZm9yZSBnZXR0aW5nIGFuZCB1cGRhdGluZ1xuICogc2V0dGluZ3MucmVhZHkoKS50aGVuKCgpID0+IHNldHRpbmdzLnVwZGF0ZVNldHRpbmcoJ3NldHRpbmdOYW1lJywgc2V0dGluZ1ZhbHVlKSlcbiAqL1xubGV0IHNldHRpbmdzID0ge31cbmxldCBpc1JlYWR5ID0gZmFsc2VcbmNvbnN0IF9yZWFkeSA9IGluaXQoKS50aGVuKCgpID0+IHtcbiAgICBpc1JlYWR5ID0gdHJ1ZVxuICAgIGNvbnNvbGUubG9nKCdTZXR0aW5ncyBhcmUgbG9hZGVkJylcbn0pXG5cbmZ1bmN0aW9uIGluaXQgKCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICBidWlsZFNldHRpbmdzRnJvbURlZmF1bHRzKClcbiAgICAgICAgYnVpbGRTZXR0aW5nc0Zyb21NYW5hZ2VkU3RvcmFnZSgpXG4gICAgICAgICAgICAudGhlbihidWlsZFNldHRpbmdzRnJvbUxvY2FsU3RvcmFnZSlcbiAgICAgICAgICAgIC50aGVuKCgpID0+IHJlc29sdmUoKSlcbiAgICB9KVxufVxuXG5mdW5jdGlvbiByZWFkeSAoKSB7XG4gICAgcmV0dXJuIF9yZWFkeVxufVxuXG5mdW5jdGlvbiBidWlsZFNldHRpbmdzRnJvbUxvY2FsU3RvcmFnZSAoKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgIGJyb3dzZXJXcmFwcGVyLmdldEZyb21TdG9yYWdlKFsnc2V0dGluZ3MnXSwgZnVuY3Rpb24gKHJlc3VsdHMpIHtcbiAgICAgICAgICAgIC8vIGNvcHkgb3ZlciBzYXZlZCBzZXR0aW5ncyBmcm9tIHN0b3JhZ2VcbiAgICAgICAgICAgIGlmICghcmVzdWx0cykgcmVzb2x2ZSgpXG4gICAgICAgICAgICBzZXR0aW5ncyA9IGJyb3dzZXJXcmFwcGVyLm1lcmdlU2F2ZWRTZXR0aW5ncyhzZXR0aW5ncywgcmVzdWx0cylcbiAgICAgICAgICAgIHJlc29sdmUoKVxuICAgICAgICB9KVxuICAgIH0pXG59XG5cbmZ1bmN0aW9uIGJ1aWxkU2V0dGluZ3NGcm9tTWFuYWdlZFN0b3JhZ2UgKCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICBicm93c2VyV3JhcHBlci5nZXRGcm9tTWFuYWdlZFN0b3JhZ2UoTUFOQUdFRF9TRVRUSU5HUywgKHJlc3VsdHMpID0+IHtcbiAgICAgICAgICAgIHNldHRpbmdzID0gYnJvd3NlcldyYXBwZXIubWVyZ2VTYXZlZFNldHRpbmdzKHNldHRpbmdzLCByZXN1bHRzKVxuICAgICAgICAgICAgcmVzb2x2ZSgpXG4gICAgICAgIH0pXG4gICAgfSlcbn1cblxuZnVuY3Rpb24gYnVpbGRTZXR0aW5nc0Zyb21EZWZhdWx0cyAoKSB7XG4gICAgLy8gaW5pdGlhbCBzZXR0aW5ncyBhcmUgYSBjb3B5IG9mIGRlZmF1bHQgc2V0dGluZ3NcbiAgICBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRTZXR0aW5ncylcbn1cblxuZnVuY3Rpb24gc3luY1NldHRpbmdUb2xvY2FsU3RvcmFnZSAoKSB7XG4gICAgYnJvd3NlcldyYXBwZXIuc3luY1RvU3RvcmFnZSh7IHNldHRpbmdzOiBzZXR0aW5ncyB9KVxufVxuXG5mdW5jdGlvbiBnZXRTZXR0aW5nIChuYW1lKSB7XG4gICAgaWYgKCFpc1JlYWR5KSB7XG4gICAgICAgIGNvbnNvbGUud2FybihgU2V0dGluZ3M6IGdldFNldHRpbmcoKSBTZXR0aW5ncyBub3QgbG9hZGVkOiAke25hbWV9YClcbiAgICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gbGV0IGFsbCBhbmQgbnVsbCByZXR1cm4gYWxsIHNldHRpbmdzXG4gICAgaWYgKG5hbWUgPT09ICdhbGwnKSBuYW1lID0gbnVsbFxuXG4gICAgaWYgKG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIHNldHRpbmdzW25hbWVdXG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHNldHRpbmdzXG4gICAgfVxufVxuXG5mdW5jdGlvbiB1cGRhdGVTZXR0aW5nIChuYW1lLCB2YWx1ZSkge1xuICAgIGlmICghaXNSZWFkeSkge1xuICAgICAgICBjb25zb2xlLndhcm4oYFNldHRpbmdzOiB1cGRhdGVTZXR0aW5nKCkgU2V0dGluZyBub3QgbG9hZGVkOiAke25hbWV9YClcbiAgICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgc2V0dGluZ3NbbmFtZV0gPSB2YWx1ZVxuICAgIHN5bmNTZXR0aW5nVG9sb2NhbFN0b3JhZ2UoKVxufVxuXG5mdW5jdGlvbiByZW1vdmVTZXR0aW5nIChuYW1lKSB7XG4gICAgaWYgKCFpc1JlYWR5KSB7XG4gICAgICAgIGNvbnNvbGUud2FybihgU2V0dGluZ3M6IHJlbW92ZVNldHRpbmcoKSBTZXR0aW5nIG5vdCBsb2FkZWQ6ICR7bmFtZX1gKVxuICAgICAgICByZXR1cm5cbiAgICB9XG4gICAgaWYgKHNldHRpbmdzW25hbWVdKSB7XG4gICAgICAgIGRlbGV0ZSBzZXR0aW5nc1tuYW1lXVxuICAgICAgICBzeW5jU2V0dGluZ1RvbG9jYWxTdG9yYWdlKClcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGxvZ1NldHRpbmdzICgpIHtcbiAgICBicm93c2VyV3JhcHBlci5nZXRGcm9tU3RvcmFnZShbJ3NldHRpbmdzJ10sIGZ1bmN0aW9uIChzKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKHMuc2V0dGluZ3MpXG4gICAgfSlcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZ2V0U2V0dGluZzogZ2V0U2V0dGluZyxcbiAgICB1cGRhdGVTZXR0aW5nOiB1cGRhdGVTZXR0aW5nLFxuICAgIHJlbW92ZVNldHRpbmc6IHJlbW92ZVNldHRpbmcsXG4gICAgbG9nU2V0dGluZ3M6IGxvZ1NldHRpbmdzLFxuICAgIHJlYWR5OiByZWFkeVxufVxuIiwiY29uc3QgZ2V0RXh0ZW5zaW9uVVJMID0gKHBhdGgpID0+IHtcbiAgICByZXR1cm4gY2hyb21lLnJ1bnRpbWUuZ2V0VVJMKHBhdGgpXG59XG5cbmNvbnN0IGdldEV4dGVuc2lvblZlcnNpb24gPSAoKSA9PiB7XG4gICAgY29uc3QgbWFuaWZlc3QgPSB3aW5kb3cuY2hyb21lICYmIGNocm9tZS5ydW50aW1lLmdldE1hbmlmZXN0KClcbiAgICByZXR1cm4gbWFuaWZlc3QudmVyc2lvblxufVxuXG5jb25zdCBzZXRCYWRnZUljb24gPSAoYmFkZ2VEYXRhKSA9PiB7XG4gICAgY2hyb21lLmJyb3dzZXJBY3Rpb24uc2V0SWNvbihiYWRnZURhdGEpXG59XG5cbmNvbnN0IHN5bmNUb1N0b3JhZ2UgPSAoZGF0YSkgPT4ge1xuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldChkYXRhLCBmdW5jdGlvbiAoKSB7IH0pXG59XG5cbmNvbnN0IGdldEZyb21TdG9yYWdlID0gKGtleSwgY2IpID0+IHtcbiAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoa2V5LCAocmVzdWx0KSA9PiB7XG4gICAgICAgIGNiKHJlc3VsdFtrZXldKVxuICAgIH0pXG59XG5jb25zdCBnZXRGcm9tTWFuYWdlZFN0b3JhZ2UgPSAoa2V5cywgY2IpID0+IHtcbiAgICBnZXRGcm9tU3RvcmFnZShrZXlzLCBjYilcbiAgICAvLyBjaHJvbWUuc3RvcmFnZS5tYW5hZ2VkLmdldChrZXlzLCAocmVzdWx0KSA9PiB7XG4gICAgLy8gICAgIGlmIChjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpIHtcbiAgICAvLyAgICAgICAgIGNvbnNvbGUud2FybignTWFuYWdlZCBzdG9yYWdlIG5vdCBhdmFpbGFibGUuJywgYnJvd3Nlci5ydW50aW1lLmxhc3RFcnJvcilcbiAgICAvLyAgICAgfVxuICAgIC8vICAgICBjYihyZXN1bHQgfHwge30pXG4gICAgLy8gfSlcbn1cblxuY29uc3QgZ2V0RXh0ZW5zaW9uSWQgPSAoKSA9PiB7XG4gICAgcmV0dXJuIGNocm9tZS5ydW50aW1lLmlkXG59XG5cbmNvbnN0IG5vdGlmeVBvcHVwID0gKG1lc3NhZ2UpID0+IHtcbiAgICAvLyB0aGlzIGNhbiBzZW5kIGFuIGVycm9yIG1lc3NhZ2Ugd2hlbiB0aGUgcG9wdXAgaXMgbm90IG9wZW4uIGNoZWNrIGxhc3RFcnJvciB0byBoaWRlIGl0XG4gICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UobWVzc2FnZSwgKCkgPT4gY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKVxufVxuXG5jb25zdCBub3JtYWxpemVUYWJEYXRhID0gKHRhYkRhdGEpID0+IHtcbiAgICByZXR1cm4gdGFiRGF0YVxufVxuXG5jb25zdCBtZXJnZVNhdmVkU2V0dGluZ3MgPSAoc2V0dGluZ3MsIHJlc3VsdHMpID0+IHtcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihzZXR0aW5ncywgcmVzdWx0cylcbn1cblxuY29uc3QgZ2V0RERHVGFiVXJscyA9ICgpID0+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgY2hyb21lLnRhYnMucXVlcnkoeyB1cmw6ICdodHRwczovLyouZHVja2R1Y2tnby5jb20vKicgfSwgKHRhYnMpID0+IHtcbiAgICAgICAgICAgIHRhYnMgPSB0YWJzIHx8IFtdXG5cbiAgICAgICAgICAgIHRhYnMuZm9yRWFjaCh0YWIgPT4ge1xuICAgICAgICAgICAgICAgIGNocm9tZS50YWJzLmluc2VydENTUyh0YWIuaWQsIHtcbiAgICAgICAgICAgICAgICAgICAgZmlsZTogJy9wdWJsaWMvY3NzL25vYXRiLmNzcydcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgcmVzb2x2ZSh0YWJzLm1hcCh0YWIgPT4gdGFiLnVybCkpXG4gICAgICAgIH0pXG4gICAgfSlcbn1cblxuY29uc3Qgc2V0VW5pbnN0YWxsVVJMID0gKHVybCkgPT4ge1xuICAgIGNocm9tZS5ydW50aW1lLnNldFVuaW5zdGFsbFVSTCh1cmwpXG59XG5cbmNvbnN0IGNoYW5nZVRhYlVSTCA9ICh0YWJJZCwgdXJsKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgIGNocm9tZS50YWJzLnVwZGF0ZSh0YWJJZCwgeyB1cmwgfSwgcmVzb2x2ZSlcbiAgICB9KVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBnZXRFeHRlbnNpb25VUkw6IGdldEV4dGVuc2lvblVSTCxcbiAgICBnZXRFeHRlbnNpb25WZXJzaW9uOiBnZXRFeHRlbnNpb25WZXJzaW9uLFxuICAgIHNldEJhZGdlSWNvbjogc2V0QmFkZ2VJY29uLFxuICAgIHN5bmNUb1N0b3JhZ2U6IHN5bmNUb1N0b3JhZ2UsXG4gICAgZ2V0RnJvbVN0b3JhZ2U6IGdldEZyb21TdG9yYWdlLFxuICAgIG5vdGlmeVBvcHVwOiBub3RpZnlQb3B1cCxcbiAgICBub3JtYWxpemVUYWJEYXRhOiBub3JtYWxpemVUYWJEYXRhLFxuICAgIG1lcmdlU2F2ZWRTZXR0aW5nczogbWVyZ2VTYXZlZFNldHRpbmdzLFxuICAgIGdldERER1RhYlVybHM6IGdldERER1RhYlVybHMsXG4gICAgc2V0VW5pbnN0YWxsVVJMOiBzZXRVbmluc3RhbGxVUkwsXG4gICAgZ2V0RXh0ZW5zaW9uSWQ6IGdldEV4dGVuc2lvbklkLFxuICAgIGNoYW5nZVRhYlVSTCxcbiAgICBnZXRGcm9tTWFuYWdlZFN0b3JhZ2Vcbn1cbiIsImNvbnN0IGZldGNoID0gKG1lc3NhZ2UpID0+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICB3aW5kb3cuY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UobWVzc2FnZSwgKHJlc3VsdCkgPT4gcmVzb2x2ZShyZXN1bHQpKVxuICAgIH0pXG59XG5cbmNvbnN0IGJhY2tncm91bmRNZXNzYWdlID0gKHRoaXNNb2RlbCkgPT4ge1xuICAgIC8vIGxpc3RlbiBmb3IgbWVzc2FnZXMgZnJvbSBiYWNrZ3JvdW5kIGFuZFxuICAgIC8vIC8vIG5vdGlmeSBzdWJzY3JpYmVyc1xuICAgIHdpbmRvdy5jaHJvbWUucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoKHJlcSwgc2VuZGVyKSA9PiB7XG4gICAgICAgIGlmIChzZW5kZXIuaWQgIT09IGNocm9tZS5ydW50aW1lLmlkKSByZXR1cm5cbiAgICAgICAgaWYgKHJlcS53aGl0ZWxpc3RDaGFuZ2VkKSB0aGlzTW9kZWwuc2VuZCgnd2hpdGVsaXN0Q2hhbmdlZCcpXG4gICAgICAgIGlmIChyZXEudXBkYXRlVGFiRGF0YSkgdGhpc01vZGVsLnNlbmQoJ3VwZGF0ZVRhYkRhdGEnKVxuICAgICAgICBpZiAocmVxLmRpZFJlc2V0VHJhY2tlcnNEYXRhKSB0aGlzTW9kZWwuc2VuZCgnZGlkUmVzZXRUcmFja2Vyc0RhdGEnLCByZXEuZGlkUmVzZXRUcmFja2Vyc0RhdGEpXG4gICAgICAgIGlmIChyZXEuY2xvc2VQb3B1cCkgd2luZG93LmNsb3NlKClcbiAgICB9KVxufVxuXG5jb25zdCBnZXRCYWNrZ3JvdW5kVGFiRGF0YSA9ICgpID0+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBmZXRjaCh7IGdldEN1cnJlbnRUYWI6IHRydWUgfSkudGhlbigodGFiKSA9PiB7XG4gICAgICAgICAgICBpZiAodGFiKSB7XG4gICAgICAgICAgICAgICAgZmV0Y2goeyBnZXRUYWI6IHRhYi5pZCB9KS50aGVuKChiYWNrZ3JvdW5kVGFiT2JqKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYmFja2dyb3VuZFRhYk9iailcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH0pXG59XG5cbmNvbnN0IHNlYXJjaCA9ICh1cmwpID0+IHtcbiAgICB3aW5kb3cuY2hyb21lLnRhYnMuY3JlYXRlKHsgdXJsOiBgaHR0cHM6Ly9kdWNrZHVja2dvLmNvbS8/cT0ke3VybH0mYmV4dD0ke3dpbmRvdy5sb2NhbFN0b3JhZ2Uub3N9Y3JgIH0pXG59XG5cbmNvbnN0IGdldEV4dGVuc2lvblVSTCA9IChwYXRoKSA9PiB7XG4gICAgcmV0dXJuIGNocm9tZS5ydW50aW1lLmdldFVSTChwYXRoKVxufVxuXG5jb25zdCBvcGVuRXh0ZW5zaW9uUGFnZSA9IChwYXRoKSA9PiB7XG4gICAgd2luZG93LmNocm9tZS50YWJzLmNyZWF0ZSh7IHVybDogZ2V0RXh0ZW5zaW9uVVJMKHBhdGgpIH0pXG59XG5cbmNvbnN0IG9wZW5PcHRpb25zUGFnZSA9IChicm93c2VyKSA9PiB7XG4gICAgaWYgKGJyb3dzZXIgPT09ICdtb3onKSB7XG4gICAgICAgIG9wZW5FeHRlbnNpb25QYWdlKCcvaHRtbC9vcHRpb25zLmh0bWwnKVxuICAgICAgICB3aW5kb3cuY2xvc2UoKVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHdpbmRvdy5jaHJvbWUucnVudGltZS5vcGVuT3B0aW9uc1BhZ2UoKVxuICAgIH1cbn1cblxuY29uc3QgcmVsb2FkVGFiID0gKGlkKSA9PiB7XG4gICAgd2luZG93LmNocm9tZS50YWJzLnJlbG9hZChpZClcbn1cblxuY29uc3QgY2xvc2VQb3B1cCA9ICgpID0+IHtcbiAgICBjb25zdCB3ID0gd2luZG93LmNocm9tZS5leHRlbnNpb24uZ2V0Vmlld3MoeyB0eXBlOiAncG9wdXAnIH0pWzBdXG4gICAgdy5jbG9zZSgpXG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGZldGNoOiBmZXRjaCxcbiAgICByZWxvYWRUYWI6IHJlbG9hZFRhYixcbiAgICBjbG9zZVBvcHVwOiBjbG9zZVBvcHVwLFxuICAgIGJhY2tncm91bmRNZXNzYWdlOiBiYWNrZ3JvdW5kTWVzc2FnZSxcbiAgICBnZXRCYWNrZ3JvdW5kVGFiRGF0YTogZ2V0QmFja2dyb3VuZFRhYkRhdGEsXG4gICAgc2VhcmNoOiBzZWFyY2gsXG4gICAgb3Blbk9wdGlvbnNQYWdlOiBvcGVuT3B0aW9uc1BhZ2UsXG4gICAgb3BlbkV4dGVuc2lvblBhZ2U6IG9wZW5FeHRlbnNpb25QYWdlLFxuICAgIGdldEV4dGVuc2lvblVSTDogZ2V0RXh0ZW5zaW9uVVJMXG59XG4iLCJjb25zdCBQYXJlbnQgPSB3aW5kb3cuRERHLmJhc2UuTW9kZWxcblxuZnVuY3Rpb24gQXV0b2NvbXBsZXRlIChhdHRycykge1xuICAgIFBhcmVudC5jYWxsKHRoaXMsIGF0dHJzKVxufVxuXG5BdXRvY29tcGxldGUucHJvdG90eXBlID0gd2luZG93LiQuZXh0ZW5kKHt9LFxuICAgIFBhcmVudC5wcm90b3R5cGUsXG4gICAge1xuXG4gICAgICAgIG1vZGVsTmFtZTogJ2F1dG9jb21wbGV0ZScsXG5cbiAgICAgICAgZmV0Y2hTdWdnZXN0aW9uczogZnVuY3Rpb24gKHNlYXJjaFRleHQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETzogYWpheCBjYWxsIGhlcmUgdG8gZGRnIGF1dG9jb21wbGV0ZSBzZXJ2aWNlXG4gICAgICAgICAgICAgICAgLy8gZm9yIG5vdyB3ZSdsbCBqdXN0IG1vY2sgdXAgYW4gYXN5bmMgeGhyIHF1ZXJ5IHJlc3VsdDpcbiAgICAgICAgICAgICAgICB0aGlzLnN1Z2dlc3Rpb25zID0gW2Ake3NlYXJjaFRleHR9IHdvcmxkYCwgYCR7c2VhcmNoVGV4dH0gdW5pdGVkYCwgYCR7c2VhcmNoVGV4dH0gZmFtZmFtYF1cbiAgICAgICAgICAgICAgICByZXNvbHZlKClcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9XG4pXG5cbm1vZHVsZS5leHBvcnRzID0gQXV0b2NvbXBsZXRlXG4iLCJjb25zdCBQYXJlbnQgPSB3aW5kb3cuRERHLmJhc2UuTW9kZWxcbmNvbnN0IGJyb3dzZXJVSVdyYXBwZXIgPSByZXF1aXJlKCcuLy4uL2Jhc2UvdWktd3JhcHBlci5lczYuanMnKVxuXG4vKipcbiAqIEJhY2tncm91bmQgbWVzc2FnaW5nIGlzIGRvbmUgdmlhIHR3byBtZXRob2RzOlxuICpcbiAqIDEuIFBhc3NpdmUgbWVzc2FnZXMgZnJvbSBiYWNrZ3JvdW5kIC0+IGJhY2tncm91bmRNZXNzYWdlIG1vZGVsIC0+IHN1YnNjcmliaW5nIG1vZGVsXG4gKlxuICogIFRoZSBiYWNrZ3JvdW5kIHNlbmRzIHRoZXNlIG1lc3NhZ2VzIHVzaW5nIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHsnbmFtZSc6ICd2YWx1ZSd9KVxuICogIFRoZSBiYWNrZ3JvdW5kTWVzc2FnZSBtb2RlbCAoaGVyZSkgcmVjZWl2ZXMgdGhlIG1lc3NhZ2UgYW5kIGZvcndhcmRzIHRoZVxuICogIGl0IHRvIHRoZSBnbG9iYWwgZXZlbnQgc3RvcmUgdmlhIG1vZGVsLnNlbmQobXNnKVxuICogIE90aGVyIG1vZHVsZXMgdGhhdCBhcmUgc3Vic2NyaWJlZCB0byBzdGF0ZSBjaGFuZ2VzIGluIGJhY2tncm91bmRNZXNzYWdlIGFyZSBub3RpZmllZFxuICpcbiAqIDIuIFR3by13YXkgbWVzc2FnaW5nIHVzaW5nIHRoaXMubW9kZWwuZmV0Y2goKSBhcyBhIHBhc3N0aHJvdWdoXG4gKlxuICogIEVhY2ggbW9kZWwgY2FuIHVzZSBhIGZldGNoIG1ldGhvZCB0byBzZW5kIGFuZCByZWNlaXZlIGEgcmVzcG9uc2UgZnJvbSB0aGUgYmFja2dyb3VuZC5cbiAqICBFeDogdGhpcy5tb2RlbC5mZXRjaCh7J25hbWUnOiAndmFsdWUnfSkudGhlbigocmVzcG9uc2UpID0+IGNvbnNvbGUubG9nKHJlc3BvbnNlKSlcbiAqICBMaXN0ZW5lcnMgbXVzdCBiZSByZWdpc3RlcmVkIGluIHRoZSBiYWNrZ3JvdW5kIHRvIHJlc3BvbmQgdG8gbWVzc2FnZXMgd2l0aCB0aGlzICduYW1lJy5cbiAqXG4gKiAgVGhlIGNvbW1vbiBmZXRjaCBtZXRob2QgaXMgZGVmaW5lZCBpbiBiYXNlL21vZGVsLmVzNi5qc1xuICovXG5mdW5jdGlvbiBCYWNrZ3JvdW5kTWVzc2FnZSAoYXR0cnMpIHtcbiAgICBQYXJlbnQuY2FsbCh0aGlzLCBhdHRycylcbiAgICBjb25zdCB0aGlzTW9kZWwgPSB0aGlzXG4gICAgYnJvd3NlclVJV3JhcHBlci5iYWNrZ3JvdW5kTWVzc2FnZSh0aGlzTW9kZWwpXG59XG5cbkJhY2tncm91bmRNZXNzYWdlLnByb3RvdHlwZSA9IHdpbmRvdy4kLmV4dGVuZCh7fSxcbiAgICBQYXJlbnQucHJvdG90eXBlLFxuICAgIHtcbiAgICAgICAgbW9kZWxOYW1lOiAnYmFja2dyb3VuZE1lc3NhZ2UnXG4gICAgfVxuKVxuXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tncm91bmRNZXNzYWdlXG4iLCJjb25zdCBQYXJlbnQgPSB3aW5kb3cuRERHLmJhc2UuTW9kZWxcblxuZnVuY3Rpb24gRW1haWxBbGlhc01vZGVsIChhdHRycykge1xuICAgIGF0dHJzID0gYXR0cnMgfHwge31cbiAgICBQYXJlbnQuY2FsbCh0aGlzLCBhdHRycylcbn1cblxuRW1haWxBbGlhc01vZGVsLnByb3RvdHlwZSA9IHdpbmRvdy4kLmV4dGVuZCh7fSxcbiAgICBQYXJlbnQucHJvdG90eXBlLFxuICAgIHtcbiAgICAgICAgbW9kZWxOYW1lOiAnZW1haWxBbGlhcycsXG5cbiAgICAgICAgZ2V0VXNlckRhdGE6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZldGNoKHsgZ2V0U2V0dGluZzogeyBuYW1lOiAndXNlckRhdGEnIH0gfSkudGhlbih1c2VyRGF0YSA9PiB1c2VyRGF0YSlcbiAgICAgICAgfSxcblxuICAgICAgICBsb2dvdXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZldGNoKHsgbG9nb3V0OiB0cnVlIH0pLnRoZW4oKCkgPT4gdGhpcy5zZXQoJ3VzZXJEYXRhJywgdW5kZWZpbmVkKSlcbiAgICAgICAgfVxuICAgIH1cbilcblxubW9kdWxlLmV4cG9ydHMgPSBFbWFpbEFsaWFzTW9kZWxcbiIsImNvbnN0IFBhcmVudCA9IHdpbmRvdy5EREcuYmFzZS5Nb2RlbFxuXG5mdW5jdGlvbiBIYW1idXJnZXJNZW51IChhdHRycykge1xuICAgIGF0dHJzID0gYXR0cnMgfHwge31cbiAgICBhdHRycy50YWJVcmwgPSAnJ1xuICAgIFBhcmVudC5jYWxsKHRoaXMsIGF0dHJzKVxufVxuXG5IYW1idXJnZXJNZW51LnByb3RvdHlwZSA9IHdpbmRvdy4kLmV4dGVuZCh7fSxcbiAgICBQYXJlbnQucHJvdG90eXBlLFxuICAgIHtcbiAgICAgICAgbW9kZWxOYW1lOiAnaGFtYnVyZ2VyTWVudSdcbiAgICB9XG4pXG5cbm1vZHVsZS5leHBvcnRzID0gSGFtYnVyZ2VyTWVudVxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgLy8gRml4ZXMgY2FzZXMgbGlrZSBcIkFtYXpvbi5jb21cIiwgd2hpY2ggYnJlYWsgdGhlIGNvbXBhbnkgaWNvblxuICAgIG5vcm1hbGl6ZUNvbXBhbnlOYW1lIChjb21wYW55TmFtZSkge1xuICAgICAgICBjb21wYW55TmFtZSA9IGNvbXBhbnlOYW1lIHx8ICcnXG4gICAgICAgIGNvbnN0IG5vcm1hbGl6ZWROYW1lID0gY29tcGFueU5hbWUudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9cXC5bYS16XSskLywgJycpXG4gICAgICAgIHJldHVybiBub3JtYWxpemVkTmFtZVxuICAgIH1cbn1cbiIsImNvbnN0IFBhcmVudCA9IHdpbmRvdy5EREcuYmFzZS5Nb2RlbFxuY29uc3QgYnJvd3NlclVJV3JhcHBlciA9IHJlcXVpcmUoJy4vLi4vYmFzZS91aS13cmFwcGVyLmVzNi5qcycpXG5cbmZ1bmN0aW9uIFNlYXJjaCAoYXR0cnMpIHtcbiAgICBQYXJlbnQuY2FsbCh0aGlzLCBhdHRycylcbn1cblxuU2VhcmNoLnByb3RvdHlwZSA9IHdpbmRvdy4kLmV4dGVuZCh7fSxcbiAgICBQYXJlbnQucHJvdG90eXBlLFxuICAgIHtcblxuICAgICAgICBtb2RlbE5hbWU6ICdzZWFyY2gnLFxuXG4gICAgICAgIGRvU2VhcmNoOiBmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgdGhpcy5zZWFyY2hUZXh0ID0gc1xuICAgICAgICAgICAgcyA9IGVuY29kZVVSSUNvbXBvbmVudChzKVxuXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgZG9TZWFyY2goKSBmb3IgJHtzfWApXG5cbiAgICAgICAgICAgIGJyb3dzZXJVSVdyYXBwZXIuc2VhcmNoKHMpXG4gICAgICAgIH1cbiAgICB9XG4pXG5cbm1vZHVsZS5leHBvcnRzID0gU2VhcmNoXG4iLCJjb25zdCBQYXJlbnQgPSB3aW5kb3cuRERHLmJhc2UuTW9kZWxcbmNvbnN0IG5vcm1hbGl6ZUNvbXBhbnlOYW1lID0gcmVxdWlyZSgnLi9taXhpbnMvbm9ybWFsaXplLWNvbXBhbnktbmFtZS5lczYnKVxuXG5mdW5jdGlvbiBTaXRlQ29tcGFueUxpc3QgKGF0dHJzKSB7XG4gICAgYXR0cnMgPSBhdHRycyB8fCB7fVxuICAgIGF0dHJzLnRhYiA9IG51bGxcbiAgICBhdHRycy5jb21wYW55TGlzdE1hcCA9IFtdXG4gICAgUGFyZW50LmNhbGwodGhpcywgYXR0cnMpXG59XG5cblNpdGVDb21wYW55TGlzdC5wcm90b3R5cGUgPSB3aW5kb3cuJC5leHRlbmQoe30sXG4gICAgUGFyZW50LnByb3RvdHlwZSxcbiAgICBub3JtYWxpemVDb21wYW55TmFtZSxcbiAgICB7XG5cbiAgICAgICAgbW9kZWxOYW1lOiAnc2l0ZUNvbXBhbnlMaXN0JyxcblxuICAgICAgICBmZXRjaEFzeW5jRGF0YTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmZldGNoKHsgZ2V0Q3VycmVudFRhYjogdHJ1ZSB9KS50aGVuKCh0YWIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRhYikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5mZXRjaCh7IGdldFRhYjogdGFiLmlkIH0pLnRoZW4oKGJrZ1RhYikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFiID0gYmtnVGFiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kb21haW4gPSB0aGlzLnRhYiAmJiB0aGlzLnRhYi5zaXRlID8gdGhpcy50YWIuc2l0ZS5kb21haW4gOiAnJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3VwZGF0ZUNvbXBhbmllc0xpc3QoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoJ1NpdGVEZXRhaWxzIG1vZGVsOiBubyB0YWInKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSxcblxuICAgICAgICBfdXBkYXRlQ29tcGFuaWVzTGlzdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gbGlzdCBvZiBhbGwgdHJhY2tlcnMgb24gcGFnZSAod2hldGhlciB3ZSBibG9ja2VkIHRoZW0gb3Igbm90KVxuICAgICAgICAgICAgdGhpcy50cmFja2VycyA9IHRoaXMudGFiLnRyYWNrZXJzIHx8IHt9XG4gICAgICAgICAgICBjb25zdCBjb21wYW55TmFtZXMgPSBPYmplY3Qua2V5cyh0aGlzLnRyYWNrZXJzKVxuICAgICAgICAgICAgbGV0IHVua25vd25TYW1lRG9tYWluQ29tcGFueSA9IG51bGxcblxuICAgICAgICAgICAgLy8gc2V0IHRyYWNrZXJsaXN0IG1ldGFkYXRhIGZvciBsaXN0IGRpc3BsYXkgYnkgY29tcGFueTpcbiAgICAgICAgICAgIHRoaXMuY29tcGFueUxpc3RNYXAgPSBjb21wYW55TmFtZXNcbiAgICAgICAgICAgICAgICAubWFwKChjb21wYW55TmFtZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wYW55ID0gdGhpcy50cmFja2Vyc1tjb21wYW55TmFtZV1cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdXJsc0xpc3QgPSBjb21wYW55LnVybHMgPyBPYmplY3Qua2V5cyhjb21wYW55LnVybHMpIDogW11cbiAgICAgICAgICAgICAgICAgICAgLy8gVW5rbm93biBzYW1lIGRvbWFpbiB0cmFja2VycyBuZWVkIHRvIGJlIGluZGl2aWR1YWxseSBmZXRjaGVkIGFuZCBwdXRcbiAgICAgICAgICAgICAgICAgICAgLy8gaW4gdGhlIHVuYmxvY2tlZCBsaXN0XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb21wYW55TmFtZSA9PT0gJ3Vua25vd24nICYmIHRoaXMuaGFzVW5ibG9ja2VkVHJhY2tlcnMoY29tcGFueSwgdXJsc0xpc3QpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1bmtub3duU2FtZURvbWFpbkNvbXBhbnkgPSB0aGlzLmNyZWF0ZVVuYmxvY2tlZExpc3QoY29tcGFueSwgdXJsc0xpc3QpXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBjYWxjIG1heCB1c2luZyBwaXhlbHMgaW5zdGVhZCBvZiAlIHRvIG1ha2UgbWFyZ2lucyBlYXNpZXJcbiAgICAgICAgICAgICAgICAgICAgLy8gbWF4IHdpZHRoOiAzMDAgLSAoaG9yaXpvbnRhbCBwYWRkaW5nIGluIGNzcykgPSAyNjBcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGNvbXBhbnlOYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzcGxheU5hbWU6IGNvbXBhbnkuZGlzcGxheU5hbWUgfHwgY29tcGFueU5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBub3JtYWxpemVkTmFtZTogdGhpcy5ub3JtYWxpemVDb21wYW55TmFtZShjb21wYW55TmFtZSksXG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudDogdGhpcy5fc2V0Q291bnQoY29tcGFueSwgY29tcGFueU5hbWUsIHVybHNMaXN0KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybHM6IGNvbXBhbnkudXJscyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybHNMaXN0OiB1cmxzTGlzdFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgdGhpcylcbiAgICAgICAgICAgICAgICAuc29ydCgoYSwgYikgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYi5jb3VudCAtIGEuY291bnRcbiAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICBpZiAodW5rbm93blNhbWVEb21haW5Db21wYW55KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb21wYW55TGlzdE1hcC5wdXNoKHVua25vd25TYW1lRG9tYWluQ29tcGFueSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvLyBNYWtlIGFkLWhvYyB1bmJsb2NrZWQgbGlzdFxuICAgICAgICAvLyB1c2VkIHRvIGNoZXJyeSBwaWNrIHVuYmxvY2tlZCB0cmFja2VycyBmcm9tIHVua25vd24gY29tcGFuaWVzXG4gICAgICAgIC8vIHRoZSBuYW1lIGlzIHRoZSBzaXRlIGRvbWFpbiwgY291bnQgaXMgLTIgdG8gc2hvdyB0aGUgbGlzdCBhdCB0aGUgYm90dG9tXG4gICAgICAgIGNyZWF0ZVVuYmxvY2tlZExpc3Q6IGZ1bmN0aW9uIChjb21wYW55LCB1cmxzTGlzdCkge1xuICAgICAgICAgICAgY29uc3QgdW5ibG9ja2VkVHJhY2tlcnMgPSB0aGlzLnNwbGljZVVuYmxvY2tlZFRyYWNrZXJzKGNvbXBhbnksIHVybHNMaXN0KVxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBuYW1lOiB0aGlzLmRvbWFpbixcbiAgICAgICAgICAgICAgICBpY29uTmFtZTogJycsIC8vIHdlIHdvbid0IGhhdmUgYW4gaWNvbiBmb3IgdW5rbm93biBmaXJzdCBwYXJ0eSB0cmFja2Vyc1xuICAgICAgICAgICAgICAgIGNvdW50OiAtMixcbiAgICAgICAgICAgICAgICB1cmxzOiB1bmJsb2NrZWRUcmFja2VycyxcbiAgICAgICAgICAgICAgICB1cmxzTGlzdDogT2JqZWN0LmtleXModW5ibG9ja2VkVHJhY2tlcnMpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gUmV0dXJuIGFuIGFycmF5IG9mIHVuYmxvY2tlZCB0cmFja2Vyc1xuICAgICAgICAvLyBhbmQgcmVtb3ZlIHRob3NlIGVudHJpZXMgZnJvbSB0aGUgc3BlY2lmaWVkIGNvbXBhbnlcbiAgICAgICAgLy8gb25seSBuZWVkZWQgZm9yIHVua25vd24gdHJhY2tlcnMsIHNvIGZhclxuICAgICAgICBzcGxpY2VVbmJsb2NrZWRUcmFja2VyczogZnVuY3Rpb24gKGNvbXBhbnksIHVybHNMaXN0KSB7XG4gICAgICAgICAgICBpZiAoIWNvbXBhbnkgfHwgIWNvbXBhbnkudXJscyB8fCAhdXJsc0xpc3QpIHJldHVybiBudWxsXG5cbiAgICAgICAgICAgIHJldHVybiB1cmxzTGlzdC5maWx0ZXIoKHVybCkgPT4gY29tcGFueS51cmxzW3VybF0uaXNCbG9ja2VkID09PSBmYWxzZSlcbiAgICAgICAgICAgICAgICAucmVkdWNlKCh1bmJsb2NrZWRUcmFja2VycywgdXJsKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHVuYmxvY2tlZFRyYWNrZXJzW3VybF0gPSBjb21wYW55LnVybHNbdXJsXVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgY29tcGFueSB1cmxzIGFuZCB1cmxzTGlzdFxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgY29tcGFueS51cmxzW3VybF1cbiAgICAgICAgICAgICAgICAgICAgdXJsc0xpc3Quc3BsaWNlKHVybHNMaXN0LmluZGV4T2YodXJsKSwgMSlcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5ibG9ja2VkVHJhY2tlcnNcbiAgICAgICAgICAgICAgICB9LCB7fSlcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBSZXR1cm4gdHJ1ZSBpZiBjb21wYW55IGhhcyB1bmJsb2NrZWQgdHJhY2tlcnMgaW4gdGhlIGN1cnJlbnQgdGFiXG4gICAgICAgIGhhc1VuYmxvY2tlZFRyYWNrZXJzOiBmdW5jdGlvbiAoY29tcGFueSwgdXJsc0xpc3QpIHtcbiAgICAgICAgICAgIGlmICghY29tcGFueSB8fCAhY29tcGFueS51cmxzIHx8ICF1cmxzTGlzdCkgcmV0dXJuIGZhbHNlXG5cbiAgICAgICAgICAgIHJldHVybiB1cmxzTGlzdC5zb21lKCh1cmwpID0+IGNvbXBhbnkudXJsc1t1cmxdLmlzQmxvY2tlZCA9PT0gZmFsc2UpXG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gRGV0ZXJtaW5lcyBzb3J0aW5nIG9yZGVyIG9mIHRoZSBjb21wYW55IGxpc3RcbiAgICAgICAgX3NldENvdW50OiBmdW5jdGlvbiAoY29tcGFueSwgY29tcGFueU5hbWUsIHVybHNMaXN0KSB7XG4gICAgICAgICAgICBsZXQgY291bnQgPSBjb21wYW55LmNvdW50XG4gICAgICAgICAgICAvLyBVbmtub3duIHRyYWNrZXJzLCBmb2xsb3dlZCBieSB1bmJsb2NrZWQgZmlyc3QgcGFydHksXG4gICAgICAgICAgICAvLyBzaG91bGQgYmUgYXQgdGhlIGJvdHRvbSBvZiB0aGUgbGlzdFxuICAgICAgICAgICAgaWYgKGNvbXBhbnlOYW1lID09PSAndW5rbm93bicpIHtcbiAgICAgICAgICAgICAgICBjb3VudCA9IC0xXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaGFzVW5ibG9ja2VkVHJhY2tlcnMoY29tcGFueSwgdXJsc0xpc3QpKSB7XG4gICAgICAgICAgICAgICAgY291bnQgPSAtMlxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gY291bnRcbiAgICAgICAgfVxuICAgIH1cbilcblxubW9kdWxlLmV4cG9ydHMgPSBTaXRlQ29tcGFueUxpc3RcbiIsImNvbnN0IFBhcmVudCA9IHdpbmRvdy5EREcuYmFzZS5Nb2RlbFxuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi4vLi4vLi4vZGF0YS9jb25zdGFudHMnKVxuY29uc3QgaHR0cHNNZXNzYWdlcyA9IGNvbnN0YW50cy5odHRwc01lc3NhZ2VzXG5jb25zdCBicm93c2VyVUlXcmFwcGVyID0gcmVxdWlyZSgnLi8uLi9iYXNlL3VpLXdyYXBwZXIuZXM2LmpzJylcblxuLy8gZm9yIG5vdyB3ZSBjb25zaWRlciB0cmFja2VyIG5ldHdvcmtzIGZvdW5kIG9uIG1vcmUgdGhhbiA3JSBvZiBzaXRlc1xuLy8gYXMgXCJtYWpvclwiXG5jb25zdCBNQUpPUl9UUkFDS0VSX1RIUkVTSE9MRF9QQ1QgPSA3XG5cbmZ1bmN0aW9uIFNpdGUgKGF0dHJzKSB7XG4gICAgYXR0cnMgPSBhdHRycyB8fCB7fVxuICAgIGF0dHJzLmRpc2FibGVkID0gdHJ1ZSAvLyBkaXNhYmxlZCBieSBkZWZhdWx0XG4gICAgYXR0cnMudGFiID0gbnVsbFxuICAgIGF0dHJzLmRvbWFpbiA9ICctJ1xuICAgIGF0dHJzLmlzV2hpdGVsaXN0ZWQgPSBmYWxzZVxuICAgIGF0dHJzLmlzQWxsb3dsaXN0ZWQgPSBmYWxzZVxuICAgIGF0dHJzLmlzQnJva2VuID0gZmFsc2VcbiAgICBhdHRycy53aGl0ZWxpc3RPcHRJbiA9IGZhbHNlXG4gICAgYXR0cnMuaXNDYWxjdWxhdGluZ1NpdGVSYXRpbmcgPSB0cnVlXG4gICAgYXR0cnMuc2l0ZVJhdGluZyA9IHt9XG4gICAgYXR0cnMuaHR0cHNTdGF0ZSA9ICdub25lJ1xuICAgIGF0dHJzLmh0dHBzU3RhdHVzVGV4dCA9ICcnXG4gICAgYXR0cnMudHJhY2tlcnNDb3VudCA9IDAgLy8gdW5pcXVlIHRyYWNrZXJzIGNvdW50XG4gICAgYXR0cnMubWFqb3JUcmFja2VyTmV0d29ya3NDb3VudCA9IDBcbiAgICBhdHRycy50b3RhbFRyYWNrZXJOZXR3b3Jrc0NvdW50ID0gMFxuICAgIGF0dHJzLnRyYWNrZXJOZXR3b3JrcyA9IFtdXG4gICAgYXR0cnMudG9zZHIgPSB7fVxuICAgIGF0dHJzLmlzYU1ham9yVHJhY2tpbmdOZXR3b3JrID0gZmFsc2VcbiAgICBQYXJlbnQuY2FsbCh0aGlzLCBhdHRycylcblxuICAgIHRoaXMuYmluZEV2ZW50cyhbXG4gICAgICAgIFt0aGlzLnN0b3JlLnN1YnNjcmliZSwgJ2FjdGlvbjpiYWNrZ3JvdW5kTWVzc2FnZScsIHRoaXMuaGFuZGxlQmFja2dyb3VuZE1zZ11cbiAgICBdKVxufVxuXG5TaXRlLnByb3RvdHlwZSA9IHdpbmRvdy4kLmV4dGVuZCh7fSxcbiAgICBQYXJlbnQucHJvdG90eXBlLFxuICAgIHtcblxuICAgICAgICBtb2RlbE5hbWU6ICdzaXRlJyxcblxuICAgICAgICBnZXRCYWNrZ3JvdW5kVGFiRGF0YTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICAgICAgYnJvd3NlclVJV3JhcHBlci5nZXRCYWNrZ3JvdW5kVGFiRGF0YSgpLnRoZW4oKHRhYikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGFiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldCgndGFiJywgdGFiKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kb21haW4gPSB0YWIuc2l0ZS5kb21haW5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZmV0Y2hTaXRlUmF0aW5nKClcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0KCd0b3NkcicsIHRhYi5zaXRlLnRvc2RyKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXQoJ2lzYU1ham9yVHJhY2tpbmdOZXR3b3JrJywgdGFiLnNpdGUucGFyZW50UHJldmFsZW5jZSA+PSBNQUpPUl9UUkFDS0VSX1RIUkVTSE9MRF9QQ1QpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZmV0Y2goeyBnZXRTZXR0aW5nOiB7IG5hbWU6ICd0ZHMtZXRhZycgfSB9KS50aGVuKGV0YWcgPT4gdGhpcy5zZXQoJ3RkcycsIGV0YWcpKVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnU2l0ZSBtb2RlbDogbm8gdGFiJylcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U2l0ZVByb3BlcnRpZXMoKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEh0dHBzTWVzc2FnZSgpXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlKClcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0sXG5cbiAgICAgICAgZmV0Y2hTaXRlUmF0aW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnW21vZGVsXSBmZXRjaFNpdGVSYXRpbmcoKScpXG4gICAgICAgICAgICBpZiAodGhpcy50YWIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmZldGNoKHsgZ2V0U2l0ZUdyYWRlOiB0aGlzLnRhYi5pZCB9KS50aGVuKChyYXRpbmcpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2ZldGNoU2l0ZVJhdGluZzogJywgcmF0aW5nKVxuICAgICAgICAgICAgICAgICAgICBpZiAocmF0aW5nKSB0aGlzLnVwZGF0ZSh7IHNpdGVSYXRpbmc6IHJhdGluZyB9KVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2V0U2l0ZVByb3BlcnRpZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy50YWIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRvbWFpbiA9ICduZXcgdGFiJyAvLyB0YWIgY2FuIGJlIG51bGwgZm9yIGZpcmVmb3ggbmV3IHRhYnNcbiAgICAgICAgICAgICAgICB0aGlzLnNldCh7IGlzQ2FsY3VsYXRpbmdTaXRlUmF0aW5nOiBmYWxzZSB9KVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmluaXRBbGxvd2xpc3RlZCh0aGlzLnRhYi5zaXRlLndoaXRlbGlzdGVkKVxuICAgICAgICAgICAgICAgIHRoaXMud2hpdGVsaXN0T3B0SW4gPSB0aGlzLnRhYi5zaXRlLndoaXRlbGlzdE9wdEluXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudGFiLnNpdGUuc3BlY2lhbERvbWFpbk5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kb21haW4gPSB0aGlzLnRhYi5zaXRlLnNwZWNpYWxEb21haW5OYW1lIC8vIGVnIFwiZXh0ZW5zaW9uc1wiLCBcIm9wdGlvbnNcIiwgXCJuZXcgdGFiXCJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXQoeyBpc0NhbGN1bGF0aW5nU2l0ZVJhdGluZzogZmFsc2UgfSlcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldCh7IGRpc2FibGVkOiBmYWxzZSB9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHRoaXMuZG9tYWluICYmIHRoaXMuZG9tYWluID09PSAnLScpIHRoaXMuc2V0KCdkaXNhYmxlZCcsIHRydWUpXG4gICAgICAgIH0sXG5cbiAgICAgICAgc2V0SHR0cHNNZXNzYWdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMudGFiKSByZXR1cm5cblxuICAgICAgICAgICAgaWYgKHRoaXMudGFiLnVwZ3JhZGVkSHR0cHMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmh0dHBzU3RhdGUgPSAndXBncmFkZWQnXG4gICAgICAgICAgICB9IGVsc2UgaWYgKC9eaHR0cHMvLmV4ZWModGhpcy50YWIudXJsKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuaHR0cHNTdGF0ZSA9ICdzZWN1cmUnXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuaHR0cHNTdGF0ZSA9ICdub25lJ1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmh0dHBzU3RhdHVzVGV4dCA9IGh0dHBzTWVzc2FnZXNbdGhpcy5odHRwc1N0YXRlXVxuICAgICAgICB9LFxuXG4gICAgICAgIGhhbmRsZUJhY2tncm91bmRNc2c6IGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnW21vZGVsXSBoYW5kbGVCYWNrZ3JvdW5kTXNnKCknKVxuICAgICAgICAgICAgaWYgKCF0aGlzLnRhYikgcmV0dXJuXG4gICAgICAgICAgICBpZiAobWVzc2FnZS5hY3Rpb24gJiYgbWVzc2FnZS5hY3Rpb24gPT09ICd1cGRhdGVUYWJEYXRhJykge1xuICAgICAgICAgICAgICAgIHRoaXMuZmV0Y2goeyBnZXRUYWI6IHRoaXMudGFiLmlkIH0pLnRoZW4oKGJhY2tncm91bmRUYWJPYmopID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50YWIgPSBiYWNrZ3JvdW5kVGFiT2JqXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlKClcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mZXRjaFNpdGVSYXRpbmcoKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gY2FsbHMgYHRoaXMuc2V0KClgIHRvIHRyaWdnZXIgdmlldyByZS1yZW5kZXJpbmdcbiAgICAgICAgdXBkYXRlOiBmdW5jdGlvbiAob3BzKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnW21vZGVsXSB1cGRhdGUoKScpXG4gICAgICAgICAgICBpZiAodGhpcy50YWIpIHtcbiAgICAgICAgICAgICAgICAvLyBnb3Qgc2l0ZVJhdGluZyBiYWNrIGZyb20gYmFja2dyb3VuZCBwcm9jZXNzXG4gICAgICAgICAgICAgICAgaWYgKG9wcyAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgb3BzLnNpdGVSYXRpbmcgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wcy5zaXRlUmF0aW5nLnNpdGUgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wcy5zaXRlUmF0aW5nLmVuaGFuY2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBiZWZvcmUgPSBvcHMuc2l0ZVJhdGluZy5zaXRlLmdyYWRlXG4gICAgICAgICAgICAgICAgICAgIGxldCBhZnRlciA9IG9wcy5zaXRlUmF0aW5nLmVuaGFuY2VkLmdyYWRlXG5cbiAgICAgICAgICAgICAgICAgICAgLy8gd2UgZG9uJ3QgY3VycmVudGx5IHNob3cgRC0gZ3JhZGVzXG4gICAgICAgICAgICAgICAgICAgIGlmIChiZWZvcmUgPT09ICdELScpIGJlZm9yZSA9ICdEJ1xuICAgICAgICAgICAgICAgICAgICBpZiAoYWZ0ZXIgPT09ICdELScpIGFmdGVyID0gJ0QnXG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGJlZm9yZSAhPT0gdGhpcy5zaXRlUmF0aW5nLmJlZm9yZSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgYWZ0ZXIgIT09IHRoaXMuc2l0ZVJhdGluZy5hZnRlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3U2l0ZVJhdGluZyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjc3NCZWZvcmU6IGJlZm9yZS5yZXBsYWNlKCcrJywgJy1wbHVzJykudG9Mb3dlckNhc2UoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjc3NBZnRlcjogYWZ0ZXIucmVwbGFjZSgnKycsICctcGx1cycpLnRvTG93ZXJDYXNlKCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmVmb3JlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFmdGVyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaXRlUmF0aW5nOiBuZXdTaXRlUmF0aW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzQ2FsY3VsYXRpbmdTaXRlUmF0aW5nOiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmlzQ2FsY3VsYXRpbmdTaXRlUmF0aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBnb3Qgc2l0ZSByYXRpbmcgZnJvbSBiYWNrZ3JvdW5kIHByb2Nlc3NcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0KCdpc0NhbGN1bGF0aW5nU2l0ZVJhdGluZycsIGZhbHNlKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VHJhY2tlcnNDb3VudCA9IHRoaXMuZ2V0VW5pcXVlVHJhY2tlcnNDb3VudCgpXG4gICAgICAgICAgICAgICAgaWYgKG5ld1RyYWNrZXJzQ291bnQgIT09IHRoaXMudHJhY2tlcnNDb3VudCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldCgndHJhY2tlcnNDb3VudCcsIG5ld1RyYWNrZXJzQ291bnQpXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VHJhY2tlcnNCbG9ja2VkQ291bnQgPSB0aGlzLmdldFVuaXF1ZVRyYWNrZXJzQmxvY2tlZENvdW50KClcbiAgICAgICAgICAgICAgICBpZiAobmV3VHJhY2tlcnNCbG9ja2VkQ291bnQgIT09IHRoaXMudHJhY2tlcnNCbG9ja2VkQ291bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXQoJ3RyYWNrZXJzQmxvY2tlZENvdW50JywgbmV3VHJhY2tlcnNCbG9ja2VkQ291bnQpXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VHJhY2tlck5ldHdvcmtzID0gdGhpcy5nZXRUcmFja2VyTmV0d29ya3NPblBhZ2UoKVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRyYWNrZXJOZXR3b3Jrcy5sZW5ndGggPT09IDAgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIChuZXdUcmFja2VyTmV0d29ya3MubGVuZ3RoICE9PSB0aGlzLnRyYWNrZXJOZXR3b3Jrcy5sZW5ndGgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0KCd0cmFja2VyTmV0d29ya3MnLCBuZXdUcmFja2VyTmV0d29ya3MpXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VW5rbm93blRyYWNrZXJzQ291bnQgPSB0aGlzLmdldFVua25vd25UcmFja2Vyc0NvdW50KClcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdUb3RhbFRyYWNrZXJOZXR3b3Jrc0NvdW50ID0gbmV3VW5rbm93blRyYWNrZXJzQ291bnQgKyBuZXdUcmFja2VyTmV0d29ya3MubGVuZ3RoXG4gICAgICAgICAgICAgICAgaWYgKG5ld1RvdGFsVHJhY2tlck5ldHdvcmtzQ291bnQgIT09IHRoaXMudG90YWxUcmFja2VyTmV0d29ya3NDb3VudCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldCgndG90YWxUcmFja2VyTmV0d29ya3NDb3VudCcsIG5ld1RvdGFsVHJhY2tlck5ldHdvcmtzQ291bnQpXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgbmV3TWFqb3JUcmFja2VyTmV0d29ya3NDb3VudCA9IHRoaXMuZ2V0TWFqb3JUcmFja2VyTmV0d29ya3NDb3VudCgpXG4gICAgICAgICAgICAgICAgaWYgKG5ld01ham9yVHJhY2tlck5ldHdvcmtzQ291bnQgIT09IHRoaXMubWFqb3JUcmFja2VyTmV0d29ya3NDb3VudCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldCgnbWFqb3JUcmFja2VyTmV0d29ya3NDb3VudCcsIG5ld01ham9yVHJhY2tlck5ldHdvcmtzQ291bnQpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGdldFVuaXF1ZVRyYWNrZXJzQ291bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdbbW9kZWxdIGdldFVuaXF1ZVRyYWNrZXJzQ291bnQoKScpXG4gICAgICAgICAgICBjb25zdCBjb3VudCA9IE9iamVjdC5rZXlzKHRoaXMudGFiLnRyYWNrZXJzKS5yZWR1Y2UoKHRvdGFsLCBuYW1lKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudGFiLnRyYWNrZXJzW25hbWVdLmNvdW50ICsgdG90YWxcbiAgICAgICAgICAgIH0sIDApXG5cbiAgICAgICAgICAgIHJldHVybiBjb3VudFxuICAgICAgICB9LFxuXG4gICAgICAgIGdldFVuaXF1ZVRyYWNrZXJzQmxvY2tlZENvdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnW21vZGVsXSBnZXRVbmlxdWVUcmFja2Vyc0Jsb2NrZWRDb3VudCgpJylcbiAgICAgICAgICAgIGNvbnN0IGNvdW50ID0gT2JqZWN0LmtleXModGhpcy50YWIudHJhY2tlcnNCbG9ja2VkKS5yZWR1Y2UoKHRvdGFsLCBuYW1lKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29tcGFueUJsb2NrZWQgPSB0aGlzLnRhYi50cmFja2Vyc0Jsb2NrZWRbbmFtZV1cblxuICAgICAgICAgICAgICAgIC8vIERvbid0IHRocm93IGEgVHlwZUVycm9yIGlmIHVybHMgYXJlIG5vdCB0aGVyZVxuICAgICAgICAgICAgICAgIGNvbnN0IHRyYWNrZXJzQmxvY2tlZCA9IGNvbXBhbnlCbG9ja2VkLnVybHMgPyBPYmplY3Qua2V5cyhjb21wYW55QmxvY2tlZC51cmxzKSA6IG51bGxcblxuICAgICAgICAgICAgICAgIC8vIENvdW50aW5nIHVuaXF1ZSBVUkxzIGluc3RlYWQgb2YgdXNpbmcgdGhlIGNvdW50XG4gICAgICAgICAgICAgICAgLy8gYmVjYXVzZSB0aGUgY291bnQgcmVmZXJzIHRvIGFsbCByZXF1ZXN0cyByYXRoZXIgdGhhbiB1bmlxdWUgbnVtYmVyIG9mIHRyYWNrZXJzXG4gICAgICAgICAgICAgICAgY29uc3QgdHJhY2tlcnNCbG9ja2VkQ291bnQgPSB0cmFja2Vyc0Jsb2NrZWQgPyB0cmFja2Vyc0Jsb2NrZWQubGVuZ3RoIDogMFxuICAgICAgICAgICAgICAgIHJldHVybiB0cmFja2Vyc0Jsb2NrZWRDb3VudCArIHRvdGFsXG4gICAgICAgICAgICB9LCAwKVxuXG4gICAgICAgICAgICByZXR1cm4gY291bnRcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRVbmtub3duVHJhY2tlcnNDb3VudDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ1ttb2RlbF0gZ2V0VW5rbm93blRyYWNrZXJzQ291bnQoKScpXG4gICAgICAgICAgICBjb25zdCB1bmtub3duVHJhY2tlcnMgPSB0aGlzLnRhYi50cmFja2VycyA/IHRoaXMudGFiLnRyYWNrZXJzLnVua25vd24gOiB7fVxuXG4gICAgICAgICAgICBsZXQgY291bnQgPSAwXG4gICAgICAgICAgICBpZiAodW5rbm93blRyYWNrZXJzICYmIHVua25vd25UcmFja2Vycy51cmxzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdW5rbm93blRyYWNrZXJzVXJscyA9IE9iamVjdC5rZXlzKHVua25vd25UcmFja2Vycy51cmxzKVxuICAgICAgICAgICAgICAgIGNvdW50ID0gdW5rbm93blRyYWNrZXJzVXJscyA/IHVua25vd25UcmFja2Vyc1VybHMubGVuZ3RoIDogMFxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gY291bnRcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRNYWpvclRyYWNrZXJOZXR3b3Jrc0NvdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnW21vZGVsXSBnZXRNYWpvclRyYWNrZXJOZXR3b3Jrc0NvdW50KCknKVxuICAgICAgICAgICAgLy8gU2hvdyBvbmx5IGJsb2NrZWQgbWFqb3IgdHJhY2tlcnMgY291bnQsIHVubGVzcyBzaXRlIGlzIHdoaXRlbGlzdGVkXG4gICAgICAgICAgICBjb25zdCB0cmFja2VycyA9IHRoaXMuaXNBbGxvd2xpc3RlZCA/IHRoaXMudGFiLnRyYWNrZXJzIDogdGhpcy50YWIudHJhY2tlcnNCbG9ja2VkXG4gICAgICAgICAgICBjb25zdCBjb3VudCA9IE9iamVjdC52YWx1ZXModHJhY2tlcnMpLnJlZHVjZSgodG90YWwsIHQpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBpc01ham9yID0gdC5wcmV2YWxlbmNlID4gTUFKT1JfVFJBQ0tFUl9USFJFU0hPTERfUENUXG4gICAgICAgICAgICAgICAgdG90YWwgKz0gaXNNYWpvciA/IDEgOiAwXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvdGFsXG4gICAgICAgICAgICB9LCAwKVxuXG4gICAgICAgICAgICByZXR1cm4gY291bnRcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRUcmFja2VyTmV0d29ya3NPblBhZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdbbW9kZWxdIGdldE1ham9yVHJhY2tlck5ldHdvcmtzT25QYWdlKCknKVxuICAgICAgICAgICAgLy8gYWxsIHRyYWNrZXIgbmV0d29ya3MgZm91bmQgb24gdGhpcyBwYWdlL3RhYlxuICAgICAgICAgICAgY29uc3QgbmV0d29ya3MgPSBPYmplY3Qua2V5cyh0aGlzLnRhYi50cmFja2VycylcbiAgICAgICAgICAgICAgICAubWFwKCh0KSA9PiB0LnRvTG93ZXJDYXNlKCkpXG4gICAgICAgICAgICAgICAgLmZpbHRlcigodCkgPT4gdCAhPT0gJ3Vua25vd24nKVxuICAgICAgICAgICAgcmV0dXJuIG5ldHdvcmtzXG4gICAgICAgIH0sXG5cbiAgICAgICAgaW5pdEFsbG93bGlzdGVkOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuaXNXaGl0ZWxpc3RlZCA9IHZhbHVlXG4gICAgICAgICAgICB0aGlzLmlzQnJva2VuID0gdGhpcy50YWIuc2l0ZS5pc0Jyb2tlbiB8fCB0aGlzLnRhYi5zaXRlLmJyb2tlbkZlYXR1cmVzLmluY2x1ZGVzKCdjb250ZW50QmxvY2tpbmcnKVxuICAgICAgICAgICAgdGhpcy5pc0FsbG93bGlzdGVkID0gdGhpcy5pc0Jyb2tlbiB8fCB0aGlzLmlzV2hpdGVsaXN0ZWRcbiAgICAgICAgfSxcblxuICAgICAgICB0b2dnbGVXaGl0ZWxpc3Q6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnRhYiAmJiB0aGlzLnRhYi5zaXRlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pbml0QWxsb3dsaXN0ZWQoIXRoaXMuaXNXaGl0ZWxpc3RlZClcbiAgICAgICAgICAgICAgICB0aGlzLnNldCgnd2hpdGVsaXN0ZWQnLCB0aGlzLmlzV2hpdGVsaXN0ZWQpXG4gICAgICAgICAgICAgICAgY29uc3Qgd2hpdGVsaXN0T25Pck9mZiA9IHRoaXMuaXNXaGl0ZWxpc3RlZCA/ICdvZmYnIDogJ29uJ1xuXG4gICAgICAgICAgICAgICAgLy8gZmlyZSBlcHQub24gcGl4ZWwgaWYganVzdCB0dXJuZWQgcHJpdmFjeSBwcm90ZWN0aW9uIG9uLFxuICAgICAgICAgICAgICAgIC8vIGZpcmUgZXB0Lm9mZiBwaXhlbCBpZiBqdXN0IHR1cm5lZCBwcml2YWN5IHByb3RlY3Rpb24gb2ZmLlxuICAgICAgICAgICAgICAgIGlmICh3aGl0ZWxpc3RPbk9yT2ZmID09PSAnb24nICYmIHRoaXMud2hpdGVsaXN0T3B0SW4pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgdXNlciByZXBvcnRlZCBicm9rZW4gc2l0ZSBhbmQgb3B0ZWQgdG8gc2hhcmUgZGF0YSBvbiBzaXRlLFxuICAgICAgICAgICAgICAgICAgICAvLyBhdHRhY2ggZG9tYWluIGFuZCBwYXRoIHRvIGVwdC5vbiBwaXhlbCBpZiB0aGV5IHR1cm4gcHJpdmFjeSBwcm90ZWN0aW9uIGJhY2sgb24uXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNpdGVVcmwgPSB0aGlzLnRhYi51cmwuc3BsaXQoJz8nKVswXS5zcGxpdCgnIycpWzBdXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0KCd3aGl0ZWxpc3RPcHRJbicsIGZhbHNlKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLmZldGNoKHsgZmlyZVBpeGVsOiBbJ2VwdCcsICdvbicsIHsgc2l0ZVVybDogZW5jb2RlVVJJQ29tcG9uZW50KHNpdGVVcmwpIH1dIH0pXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZmV0Y2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hpdGVsaXN0T3B0SW46XG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGlzdDogJ3doaXRlbGlzdE9wdEluJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb21haW46IHRoaXMudGFiLnNpdGUuZG9tYWluLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZmV0Y2goeyBmaXJlUGl4ZWw6IFsnZXB0Jywgd2hpdGVsaXN0T25Pck9mZl0gfSlcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLmZldGNoKHtcbiAgICAgICAgICAgICAgICAgICAgd2hpdGVsaXN0ZWQ6XG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3Q6ICd3aGl0ZWxpc3RlZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBkb21haW46IHRoaXMudGFiLnNpdGUuZG9tYWluLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuaXNXaGl0ZWxpc3RlZFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBzdWJtaXRCcmVha2FnZUZvcm06IGZ1bmN0aW9uIChjYXRlZ29yeSkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLnRhYikgcmV0dXJuXG5cbiAgICAgICAgICAgIGNvbnN0IGJsb2NrZWRUcmFja2VycyA9IFtdXG4gICAgICAgICAgICBjb25zdCBzdXJyb2dhdGVzID0gW11cbiAgICAgICAgICAgIGNvbnN0IHVwZ3JhZGVkSHR0cHMgPSB0aGlzLnRhYi51cGdyYWRlZEh0dHBzXG4gICAgICAgICAgICAvLyByZW1vdmUgcGFyYW1zIGFuZCBmcmFnbWVudHMgZnJvbSB1cmwgdG8gYXZvaWQgaW5jbHVkaW5nIHNlbnNpdGl2ZSBkYXRhXG4gICAgICAgICAgICBjb25zdCBzaXRlVXJsID0gdGhpcy50YWIudXJsLnNwbGl0KCc/JylbMF0uc3BsaXQoJyMnKVswXVxuICAgICAgICAgICAgY29uc3QgdHJhY2tlck9iamVjdHMgPSB0aGlzLnRhYi50cmFja2Vyc0Jsb2NrZWRcbiAgICAgICAgICAgIGNvbnN0IHBpeGVsUGFyYW1zID0gWydlcGJmJyxcbiAgICAgICAgICAgICAgICB7IGNhdGVnb3J5OiBjYXRlZ29yeSB9LFxuICAgICAgICAgICAgICAgIHsgc2l0ZVVybDogZW5jb2RlVVJJQ29tcG9uZW50KHNpdGVVcmwpIH0sXG4gICAgICAgICAgICAgICAgeyB1cGdyYWRlZEh0dHBzOiB1cGdyYWRlZEh0dHBzLnRvU3RyaW5nKCkgfSxcbiAgICAgICAgICAgICAgICB7IHRkczogdGhpcy50ZHMgfVxuICAgICAgICAgICAgXVxuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHRyYWNrZXIgaW4gdHJhY2tlck9iamVjdHMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0cmFja2VyRG9tYWlucyA9IHRyYWNrZXJPYmplY3RzW3RyYWNrZXJdLnVybHNcbiAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyh0cmFja2VyRG9tYWlucykuZm9yRWFjaCgoZG9tYWluKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0cmFja2VyRG9tYWluc1tkb21haW5dLmlzQmxvY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tlZFRyYWNrZXJzLnB1c2goZG9tYWluKVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRyYWNrZXJEb21haW5zW2RvbWFpbl0ucmVhc29uID09PSAnbWF0Y2hlZCBydWxlIC0gc3Vycm9nYXRlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1cnJvZ2F0ZXMucHVzaChkb21haW4pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcGl4ZWxQYXJhbXMucHVzaCh7IGJsb2NrZWRUcmFja2VyczogYmxvY2tlZFRyYWNrZXJzIH0sIHsgc3Vycm9nYXRlczogc3Vycm9nYXRlcyB9KVxuICAgICAgICAgICAgdGhpcy5mZXRjaCh7IGZpcmVQaXhlbDogcGl4ZWxQYXJhbXMgfSlcblxuICAgICAgICAgICAgLy8gcmVtZW1iZXIgdGhhdCB1c2VyIG9wdGVkIGludG8gc2hhcmluZyBzaXRlIGJyZWFrYWdlIGRhdGFcbiAgICAgICAgICAgIC8vIGZvciB0aGlzIGRvbWFpbiwgc28gdGhhdCB3ZSBjYW4gYXR0YWNoIGRvbWFpbiB3aGVuIHRoZXlcbiAgICAgICAgICAgIC8vIHJlbW92ZSBzaXRlIGZyb20gd2hpdGVsaXN0XG4gICAgICAgICAgICB0aGlzLnNldCgnd2hpdGVsaXN0T3B0SW4nLCB0cnVlKVxuICAgICAgICAgICAgdGhpcy5mZXRjaCh7XG4gICAgICAgICAgICAgICAgd2hpdGVsaXN0T3B0SW46XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBsaXN0OiAnd2hpdGVsaXN0T3B0SW4nLFxuICAgICAgICAgICAgICAgICAgICBkb21haW46IHRoaXMudGFiLnNpdGUuZG9tYWluLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdHJ1ZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9XG4pXG5cbm1vZHVsZS5leHBvcnRzID0gU2l0ZVxuIiwiY29uc3QgUGFyZW50ID0gd2luZG93LkRERy5iYXNlLk1vZGVsXG5jb25zdCBub3JtYWxpemVDb21wYW55TmFtZSA9IHJlcXVpcmUoJy4vbWl4aW5zL25vcm1hbGl6ZS1jb21wYW55LW5hbWUuZXM2JylcblxuZnVuY3Rpb24gVG9wQmxvY2tlZCAoYXR0cnMpIHtcbiAgICBhdHRycyA9IGF0dHJzIHx8IHt9XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXNlbGYtYXNzaWduXG4gICAgYXR0cnMubnVtQ29tcGFuaWVzID0gYXR0cnMubnVtQ29tcGFuaWVzXG4gICAgYXR0cnMuY29tcGFueUxpc3QgPSBbXVxuICAgIGF0dHJzLmNvbXBhbnlMaXN0TWFwID0gW11cbiAgICBhdHRycy5wY3RQYWdlc1dpdGhUcmFja2VycyA9IG51bGxcbiAgICBhdHRycy5sYXN0U3RhdHNSZXNldERhdGUgPSBudWxsXG4gICAgUGFyZW50LmNhbGwodGhpcywgYXR0cnMpXG59XG5cblRvcEJsb2NrZWQucHJvdG90eXBlID0gd2luZG93LiQuZXh0ZW5kKHt9LFxuICAgIFBhcmVudC5wcm90b3R5cGUsXG4gICAgbm9ybWFsaXplQ29tcGFueU5hbWUsXG4gICAge1xuXG4gICAgICAgIG1vZGVsTmFtZTogJ3RvcEJsb2NrZWQnLFxuXG4gICAgICAgIGdldFRvcEJsb2NrZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5mZXRjaCh7IGdldFRvcEJsb2NrZWRCeVBhZ2VzOiB0aGlzLm51bUNvbXBhbmllcyB9KVxuICAgICAgICAgICAgICAgICAgICAudGhlbigoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFkYXRhLnRvdGFsUGFnZXMgfHwgZGF0YS50b3RhbFBhZ2VzIDwgMzApIHJldHVybiByZXNvbHZlKClcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZGF0YS50b3BCbG9ja2VkIHx8IGRhdGEudG9wQmxvY2tlZC5sZW5ndGggPCAxKSByZXR1cm4gcmVzb2x2ZSgpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbXBhbnlMaXN0ID0gZGF0YS50b3BCbG9ja2VkXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbXBhbnlMaXN0TWFwID0gdGhpcy5jb21wYW55TGlzdC5tYXAoKGNvbXBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBjb21wYW55Lm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpc3BsYXlOYW1lOiBjb21wYW55LmRpc3BsYXlOYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub3JtYWxpemVkTmFtZTogdGhpcy5ub3JtYWxpemVDb21wYW55TmFtZShjb21wYW55Lm5hbWUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZXJjZW50OiBjb21wYW55LnBlcmNlbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNhbGMgZ3JhcGggYmFycyB1c2luZyBwaXhlbHMgaW5zdGVhZCBvZiAlIHRvXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1ha2UgbWFyZ2lucyBlYXNpZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWF4IHdpZHRoOiAxNDVweFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBweDogTWF0aC5mbG9vcihjb21wYW55LnBlcmNlbnQgLyAxMDAgKiAxNDUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLnBjdFBhZ2VzV2l0aFRyYWNrZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wY3RQYWdlc1dpdGhUcmFja2VycyA9IGRhdGEucGN0UGFnZXNXaXRoVHJhY2tlcnNcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmxhc3RTdGF0c1Jlc2V0RGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxhc3RTdGF0c1Jlc2V0RGF0ZSA9IGRhdGEubGFzdFN0YXRzUmVzZXREYXRlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9LFxuXG4gICAgICAgIHJlc2V0OiBmdW5jdGlvbiAocmVzZXREYXRlKSB7XG4gICAgICAgICAgICB0aGlzLmNvbXBhbnlMaXN0ID0gW11cbiAgICAgICAgICAgIHRoaXMuY29tcGFueUxpc3RNYXAgPSBbXVxuICAgICAgICAgICAgdGhpcy5wY3RQYWdlc1dpdGhUcmFja2VycyA9IG51bGxcbiAgICAgICAgICAgIHRoaXMubGFzdFN0YXRzUmVzZXREYXRlID0gcmVzZXREYXRlXG4gICAgICAgIH1cbiAgICB9XG4pXG5cbm1vZHVsZS5leHBvcnRzID0gVG9wQmxvY2tlZFxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgc2V0QnJvd3NlckNsYXNzT25Cb2R5VGFnOiByZXF1aXJlKCcuL3NldC1icm93c2VyLWNsYXNzLmVzNi5qcycpLFxuICAgIHBhcnNlUXVlcnlTdHJpbmc6IHJlcXVpcmUoJy4vcGFyc2UtcXVlcnktc3RyaW5nLmVzNi5qcycpXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBwYXJzZVF1ZXJ5U3RyaW5nOiAocXMpID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBxcyAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigndHJpZWQgdG8gcGFyc2UgYSBub24tc3RyaW5nIHF1ZXJ5IHN0cmluZycpXG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwYXJzZWQgPSB7fVxuXG4gICAgICAgIGlmIChxc1swXSA9PT0gJz8nKSB7XG4gICAgICAgICAgICBxcyA9IHFzLnN1YnN0cigxKVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcGFydHMgPSBxcy5zcGxpdCgnJicpXG5cbiAgICAgICAgcGFydHMuZm9yRWFjaCgocGFydCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgW2tleSwgdmFsXSA9IHBhcnQuc3BsaXQoJz0nKVxuXG4gICAgICAgICAgICBpZiAoa2V5ICYmIHZhbCkge1xuICAgICAgICAgICAgICAgIHBhcnNlZFtrZXldID0gdmFsXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICAgICAgcmV0dXJuIHBhcnNlZFxuICAgIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHNldEJyb3dzZXJDbGFzc09uQm9keVRhZzogZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW5kb3cuY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UoeyBnZXRCcm93c2VyOiB0cnVlIH0sIChicm93c2VyKSA9PiB7XG4gICAgICAgICAgICBpZiAoWydlZGcnLCAnZWRnZScsICdicmF2ZSddLmluY2x1ZGVzKGJyb3dzZXIpKSB7XG4gICAgICAgICAgICAgICAgYnJvd3NlciA9ICdjaHJvbWUnXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBURU1QT1JBUlkgRklYIEZPUiBTQUZBUklcbiAgICAgICAgICAgIGlmIChicm93c2VyID09PSB1bmRlZmluZWQpIGJyb3dzZXIgPSAnY2hyb21lJ1xuXG4gICAgICAgICAgICBjb25zdCBicm93c2VyQ2xhc3MgPSAnaXMtYnJvd3Nlci0tJyArIGJyb3dzZXJcbiAgICAgICAgICAgIHdpbmRvdy4kKCdodG1sJykuYWRkQ2xhc3MoYnJvd3NlckNsYXNzKVxuICAgICAgICAgICAgd2luZG93LiQoJ2JvZHknKS5hZGRDbGFzcyhicm93c2VyQ2xhc3MpXG4gICAgICAgIH0pXG4gICAgfVxufVxuIiwiY29uc3QgUGFyZW50ID0gd2luZG93LkRERy5iYXNlLlBhZ2VcbmNvbnN0IG1peGlucyA9IHJlcXVpcmUoJy4vbWl4aW5zL2luZGV4LmVzNi5qcycpXG5jb25zdCBIYW1idXJnZXJNZW51VmlldyA9IHJlcXVpcmUoJy4vLi4vdmlld3MvaGFtYnVyZ2VyLW1lbnUuZXM2LmpzJylcbmNvbnN0IEhhbWJ1cmdlck1lbnVNb2RlbCA9IHJlcXVpcmUoJy4vLi4vbW9kZWxzL2hhbWJ1cmdlci1tZW51LmVzNi5qcycpXG5jb25zdCBoYW1idXJnZXJNZW51VGVtcGxhdGUgPSByZXF1aXJlKCcuLy4uL3RlbXBsYXRlcy9oYW1idXJnZXItbWVudS5lczYuanMnKVxuY29uc3QgVG9wQmxvY2tlZFZpZXcgPSByZXF1aXJlKCcuLy4uL3ZpZXdzL3RvcC1ibG9ja2VkLXRydW5jYXRlZC5lczYuanMnKVxuY29uc3QgVG9wQmxvY2tlZE1vZGVsID0gcmVxdWlyZSgnLi8uLi9tb2RlbHMvdG9wLWJsb2NrZWQuZXM2LmpzJylcbmNvbnN0IHRvcEJsb2NrZWRUZW1wbGF0ZSA9IHJlcXVpcmUoJy4vLi4vdGVtcGxhdGVzL3RvcC1ibG9ja2VkLXRydW5jYXRlZC5lczYuanMnKVxuY29uc3QgU2l0ZVZpZXcgPSByZXF1aXJlKCcuLy4uL3ZpZXdzL3NpdGUuZXM2LmpzJylcbmNvbnN0IFNpdGVNb2RlbCA9IHJlcXVpcmUoJy4vLi4vbW9kZWxzL3NpdGUuZXM2LmpzJylcbmNvbnN0IHNpdGVUZW1wbGF0ZSA9IHJlcXVpcmUoJy4vLi4vdGVtcGxhdGVzL3NpdGUuZXM2LmpzJylcbmNvbnN0IFNlYXJjaFZpZXcgPSByZXF1aXJlKCcuLy4uL3ZpZXdzL3NlYXJjaC5lczYuanMnKVxuY29uc3QgU2VhcmNoTW9kZWwgPSByZXF1aXJlKCcuLy4uL21vZGVscy9zZWFyY2guZXM2LmpzJylcbmNvbnN0IHNlYXJjaFRlbXBsYXRlID0gcmVxdWlyZSgnLi8uLi90ZW1wbGF0ZXMvc2VhcmNoLmVzNi5qcycpXG5jb25zdCBBdXRvY29tcGxldGVWaWV3ID0gcmVxdWlyZSgnLi8uLi92aWV3cy9hdXRvY29tcGxldGUuZXM2LmpzJylcbmNvbnN0IEF1dG9jb21wbGV0ZU1vZGVsID0gcmVxdWlyZSgnLi8uLi9tb2RlbHMvYXV0b2NvbXBsZXRlLmVzNi5qcycpXG5jb25zdCBhdXRvY29tcGxldGVUZW1wbGF0ZSA9IHJlcXVpcmUoJy4vLi4vdGVtcGxhdGVzL2F1dG9jb21wbGV0ZS5lczYuanMnKVxuY29uc3QgQmFja2dyb3VuZE1lc3NhZ2VNb2RlbCA9IHJlcXVpcmUoJy4vLi4vbW9kZWxzL2JhY2tncm91bmQtbWVzc2FnZS5lczYuanMnKVxuY29uc3QgRW1haWxBbGlhc1ZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9lbWFpbC1hbGlhcy5lczYuanMnKVxuY29uc3QgRW1haWxBbGlhc01vZGVsID0gcmVxdWlyZSgnLi4vbW9kZWxzL2VtYWlsLWFsaWFzLmVzNi5qcycpXG5jb25zdCBFbWFpbEFsaWFzVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvZW1haWwtYWxpYXMuZXM2LmpzJylcblxuZnVuY3Rpb24gVHJhY2tlcnMgKG9wcykge1xuICAgIHRoaXMuJHBhcmVudCA9IHdpbmRvdy4kKCcjcG9wdXAtY29udGFpbmVyJylcbiAgICBQYXJlbnQuY2FsbCh0aGlzLCBvcHMpXG59XG5cblRyYWNrZXJzLnByb3RvdHlwZSA9IHdpbmRvdy4kLmV4dGVuZCh7fSxcbiAgICBQYXJlbnQucHJvdG90eXBlLFxuICAgIG1peGlucy5zZXRCcm93c2VyQ2xhc3NPbkJvZHlUYWcsXG4gICAge1xuXG4gICAgICAgIHBhZ2VOYW1lOiAncG9wdXAnLFxuXG4gICAgICAgIHJlYWR5OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBQYXJlbnQucHJvdG90eXBlLnJlYWR5LmNhbGwodGhpcylcbiAgICAgICAgICAgIHRoaXMubWVzc2FnZSA9IG5ldyBCYWNrZ3JvdW5kTWVzc2FnZU1vZGVsKClcbiAgICAgICAgICAgIHRoaXMuc2V0QnJvd3NlckNsYXNzT25Cb2R5VGFnKClcblxuICAgICAgICAgICAgdGhpcy52aWV3cy5zZWFyY2ggPSBuZXcgU2VhcmNoVmlldyh7XG4gICAgICAgICAgICAgICAgcGFnZVZpZXc6IHRoaXMsXG4gICAgICAgICAgICAgICAgbW9kZWw6IG5ldyBTZWFyY2hNb2RlbCh7IHNlYXJjaFRleHQ6ICcnIH0pLFxuICAgICAgICAgICAgICAgIGFwcGVuZFRvOiB3aW5kb3cuJCgnI3NlYXJjaC1mb3JtLWNvbnRhaW5lcicpLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlOiBzZWFyY2hUZW1wbGF0ZVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgdGhpcy52aWV3cy5oYW1idXJnZXJNZW51ID0gbmV3IEhhbWJ1cmdlck1lbnVWaWV3KHtcbiAgICAgICAgICAgICAgICBwYWdlVmlldzogdGhpcyxcbiAgICAgICAgICAgICAgICBtb2RlbDogbmV3IEhhbWJ1cmdlck1lbnVNb2RlbCgpLFxuICAgICAgICAgICAgICAgIGFwcGVuZFRvOiB3aW5kb3cuJCgnI2hhbWJ1cmdlci1tZW51LWNvbnRhaW5lcicpLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlOiBoYW1idXJnZXJNZW51VGVtcGxhdGVcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgIHRoaXMudmlld3Muc2l0ZSA9IG5ldyBTaXRlVmlldyh7XG4gICAgICAgICAgICAgICAgcGFnZVZpZXc6IHRoaXMsXG4gICAgICAgICAgICAgICAgbW9kZWw6IG5ldyBTaXRlTW9kZWwoKSxcbiAgICAgICAgICAgICAgICBhcHBlbmRUbzogd2luZG93LiQoJyNzaXRlLWluZm8tY29udGFpbmVyJyksXG4gICAgICAgICAgICAgICAgdGVtcGxhdGU6IHNpdGVUZW1wbGF0ZVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgdGhpcy52aWV3cy50b3BibG9ja2VkID0gbmV3IFRvcEJsb2NrZWRWaWV3KHtcbiAgICAgICAgICAgICAgICBwYWdlVmlldzogdGhpcyxcbiAgICAgICAgICAgICAgICBtb2RlbDogbmV3IFRvcEJsb2NrZWRNb2RlbCh7IG51bUNvbXBhbmllczogMyB9KSxcbiAgICAgICAgICAgICAgICBhcHBlbmRUbzogd2luZG93LiQoJyN0b3AtYmxvY2tlZC1jb250YWluZXInKSxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogdG9wQmxvY2tlZFRlbXBsYXRlXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICB0aGlzLnZpZXdzLmVtYWlsQWxpYXMgPSBuZXcgRW1haWxBbGlhc1ZpZXcoe1xuICAgICAgICAgICAgICAgIHBhZ2VWaWV3OiB0aGlzLFxuICAgICAgICAgICAgICAgIG1vZGVsOiBuZXcgRW1haWxBbGlhc01vZGVsKCksXG4gICAgICAgICAgICAgICAgYXBwZW5kVG86IHdpbmRvdy4kKCcjZW1haWwtYWxpYXMtY29udGFpbmVyJyksXG4gICAgICAgICAgICAgICAgdGVtcGxhdGU6IEVtYWlsQWxpYXNUZW1wbGF0ZVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgLy8gVE9ETzogaG9vayB1cCBtb2RlbCBxdWVyeSB0byBhY3R1YWwgZGRnIGFjIGVuZHBvaW50LlxuICAgICAgICAgICAgLy8gRm9yIG5vdyB0aGlzIGlzIGp1c3QgaGVyZSB0byBkZW1vbnN0cmF0ZSBob3cgdG9cbiAgICAgICAgICAgIC8vIGxpc3RlbiB0byBhbm90aGVyIGNvbXBvbmVudCB2aWEgbW9kZWwuc2V0KCkgK1xuICAgICAgICAgICAgLy8gc3RvcmUuc3Vic2NyaWJlKClcbiAgICAgICAgICAgIHRoaXMudmlld3MuYXV0b2NvbXBsZXRlID0gbmV3IEF1dG9jb21wbGV0ZVZpZXcoe1xuICAgICAgICAgICAgICAgIHBhZ2VWaWV3OiB0aGlzLFxuICAgICAgICAgICAgICAgIG1vZGVsOiBuZXcgQXV0b2NvbXBsZXRlTW9kZWwoeyBzdWdnZXN0aW9uczogW10gfSksXG4gICAgICAgICAgICAgICAgLy8gYXBwZW5kVG86IHRoaXMudmlld3Muc2VhcmNoLiRlbCxcbiAgICAgICAgICAgICAgICBhcHBlbmRUbzogbnVsbCxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogYXV0b2NvbXBsZXRlVGVtcGxhdGVcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9XG4pXG5cbi8vIGtpY2tvZmYhXG53aW5kb3cuRERHID0gd2luZG93LkRERyB8fCB7fVxud2luZG93LkRERy5wYWdlID0gbmV3IFRyYWNrZXJzKClcbiIsImNvbnN0IGJlbCA9IHJlcXVpcmUoJ2JlbCcpXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIFRPRE8vUkVNT1ZFOiByZW1vdmUgbWFyZ2luVG9wIHN0eWxlIHRhZyBvbmNlIHRoaXMgaXMgYWN0dWFsbHkgaG9va2VkIHVwXG4gICAgLy8gdGhpcyBpcyBqdXN0IHRvIGRlbW8gbW9kZWwgc3RvcmUgZm9yIG5vdyFcbiAgICAvLyAgLT4gdGhpcyBpcyBncm9zcywgZG9uJ3QgZG8gdGhpczpcbiAgICBjb25zdCBtYXJnaW5Ub3AgPSB0aGlzLm1vZGVsLnN1Z2dlc3Rpb25zICYmIHRoaXMubW9kZWwuc3VnZ2VzdGlvbnMubGVuZ3RoID4gMCA/ICdtYXJnaW4tdG9wOiA1MHB4OycgOiAnJ1xuXG4gICAgcmV0dXJuIGJlbGA8dWwgY2xhc3M9XCJqcy1hdXRvY29tcGxldGVcIiBzdHlsZT1cIiR7bWFyZ2luVG9wfVwiPlxuICAgICAgICAke3RoaXMubW9kZWwuc3VnZ2VzdGlvbnMubWFwKChzdWdnZXN0aW9uKSA9PiBiZWxgXG4gICAgICAgICAgICA8bGk+PGEgaHJlZj1cImphdmFzY3JpcHQ6dm9pZCgwKVwiPiR7c3VnZ2VzdGlvbn08L2E+PC9saT5gXG4gICAgKX1cbiAgICA8L3VsPmBcbn1cbiIsImNvbnN0IGJlbCA9IHJlcXVpcmUoJ2JlbCcpXG5jb25zdCBjYXRlZ29yaWVzID0gW1xuICAgIHsgY2F0ZWdvcnk6ICdWaWRlbyBvciBpbWFnZXMgZGlkblxcJ3QgbG9hZCcsIHZhbHVlOiAnaW1hZ2VzJyB9LFxuICAgIHsgY2F0ZWdvcnk6ICdDb250ZW50IGlzIG1pc3NpbmcnLCB2YWx1ZTogJ2NvbnRlbnQnIH0sXG4gICAgeyBjYXRlZ29yeTogJ0xpbmtzIG9yIGJ1dHRvbnMgZG9uXFwndCB3b3JrJywgdmFsdWU6ICdsaW5rcycgfSxcbiAgICB7IGNhdGVnb3J5OiAnQ2FuXFwndCBzaWduIGluJywgdmFsdWU6ICdsb2dpbicgfSxcbiAgICB7IGNhdGVnb3J5OiAnU2l0ZSBhc2tlZCBtZSB0byBkaXNhYmxlIHRoZSBleHRlbnNpb24nLCB2YWx1ZTogJ3BheXdhbGwnIH1cbl1cblxuZnVuY3Rpb24gc2h1ZmZsZSAoYXJyKSB7XG4gICAgbGV0IGxlbiA9IGFyci5sZW5ndGhcbiAgICBsZXQgdGVtcFxuICAgIGxldCBpbmRleFxuICAgIHdoaWxlIChsZW4gPiAwKSB7XG4gICAgICAgIGluZGV4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogbGVuKVxuICAgICAgICBsZW4tLVxuICAgICAgICB0ZW1wID0gYXJyW2xlbl1cbiAgICAgICAgYXJyW2xlbl0gPSBhcnJbaW5kZXhdXG4gICAgICAgIGFycltpbmRleF0gPSB0ZW1wXG4gICAgfVxuICAgIHJldHVybiBhcnJcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGJlbGA8ZGl2IGNsYXNzPVwiYnJlYWthZ2UtZm9ybSBqcy1icmVha2FnZS1mb3JtXCI+XG4gICAgPGRpdiBjbGFzcz1cImJyZWFrYWdlLWZvcm1fX2NvbnRlbnRcIj5cbiAgICAgICAgPG5hdiBjbGFzcz1cImJyZWFrYWdlLWZvcm1fX2Nsb3NlLWNvbnRhaW5lclwiPlxuICAgICAgICAgICAgPGEgaHJlZj1cImphdmFzY3JpcHQ6dm9pZCgwKVwiIGNsYXNzPVwiaWNvbiBpY29uX19jbG9zZSBqcy1icmVha2FnZS1mb3JtLWNsb3NlXCIgcm9sZT1cImJ1dHRvblwiIGFyaWEtbGFiZWw9XCJEaXNtaXNzIGZvcm1cIj48L2E+XG4gICAgICAgIDwvbmF2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiZm9ybV9faWNvbi0td3JhcHBlclwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZvcm1fX2ljb25cIj48L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJicmVha2FnZS1mb3JtX19lbGVtZW50IGpzLWJyZWFrYWdlLWZvcm0tZWxlbWVudFwiPlxuICAgICAgICAgICAgPGgyIGNsYXNzPVwiYnJlYWthZ2UtZm9ybV9fdGl0bGVcIj5Tb21ldGhpbmcgYnJva2VuPzwvaDI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYnJlYWthZ2UtZm9ybV9fZXhwbGFuYXRpb25cIj5TdWJtaXR0aW5nIGFuIGFub255bW91cyBicm9rZW4gc2l0ZSByZXBvcnQgaGVscHMgdXMgZGVidWcgdGhlc2UgaXNzdWVzIGFuZCBpbXByb3ZlIHRoZSBleHRlbnNpb24uPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZm9ybV9fc2VsZWN0IGJyZWFrYWdlLWZvcm1fX2lucHV0LS1kcm9wZG93blwiPlxuICAgICAgICAgICAgICAgIDxzZWxlY3QgY2xhc3M9XCJqcy1icmVha2FnZS1mb3JtLWRyb3Bkb3duXCI+XG4gICAgICAgICAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9J3Vuc3BlY2lmaWVkJyBkaXNhYmxlZCBzZWxlY3RlZD5TZWxlY3QgYSBjYXRlZ29yeSAob3B0aW9uYWwpPC9vcHRpb24+XG4gICAgICAgICAgICAgICAgICAgICR7c2h1ZmZsZShjYXRlZ29yaWVzKS5tYXAoZnVuY3Rpb24gKGl0ZW0pIHsgcmV0dXJuIGJlbGA8b3B0aW9uIHZhbHVlPSR7aXRlbS52YWx1ZX0+JHtpdGVtLmNhdGVnb3J5fTwvb3B0aW9uPmAgfSl9XG4gICAgICAgICAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9J290aGVyJz5Tb21ldGhpbmcgZWxzZTwvb3B0aW9uPlxuICAgICAgICAgICAgICAgIDwvc2VsZWN0PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8YnRuIGNsYXNzPVwiZm9ybV9fc3VibWl0IGpzLWJyZWFrYWdlLWZvcm0tc3VibWl0XCIgcm9sZT1cImJ1dHRvblwiPlNlbmQgcmVwb3J0PC9idG4+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYnJlYWthZ2UtZm9ybV9fZm9vdGVyXCI+UmVwb3J0cyBzZW50IHRvIER1Y2tEdWNrR28gYXJlIDEwMCUgYW5vbnltb3VzIGFuZCBvbmx5IGluY2x1ZGUgeW91ciBzZWxlY3Rpb24gYWJvdmUsIHRoZSBVUkwsIGFuZCBhIGxpc3Qgb2YgdHJhY2tlcnMgd2UgZm91bmQgb24gdGhlIHNpdGUuPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiYnJlYWthZ2UtZm9ybV9fbWVzc2FnZSBqcy1icmVha2FnZS1mb3JtLW1lc3NhZ2UgaXMtdHJhbnNwYXJlbnRcIj5cbiAgICAgICAgICAgIDxoMiBjbGFzcz1cImJyZWFrYWdlLWZvcm1fX3N1Y2Nlc3MtLXRpdGxlXCI+VGhhbmsgeW91ITwvaDI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYnJlYWthZ2UtZm9ybV9fc3VjY2Vzcy0tbWVzc2FnZVwiPllvdXIgcmVwb3J0IHdpbGwgaGVscCBpbXByb3ZlIHRoZSBleHRlbnNpb24gYW5kIG1ha2UgdGhlIGV4cGVyaWVuY2UgYmV0dGVyIGZvciBvdGhlciBwZW9wbGUuPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuPC9kaXY+YFxufVxuIiwiY29uc3QgYmVsID0gcmVxdWlyZSgnYmVsJylcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMubW9kZWwudXNlckRhdGEgJiYgdGhpcy5tb2RlbC51c2VyRGF0YS5uZXh0QWxpYXMpIHtcbiAgICAgICAgcmV0dXJuIGJlbGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJqcy1lbWFpbC1hbGlhcyBlbWFpbC1hbGlhcy1ibG9jayBwYWRkZWRcIj5cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImVtYWlsLWFsaWFzX19pY29uXCI+PC9zcGFuPlxuICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJsaW5rLXNlY29uZGFyeSBib2xkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwidGV4dC1saW5lLWFmdGVyLWljb25cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIENyZWF0ZSBuZXcgRHVjayBBZGRyZXNzXG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImpzLWFsaWFzLWNvcGllZCBhbGlhcy1jb3BpZWQtbGFiZWxcIj5Db3BpZWQgdG8gY2xpcGJvYXJkPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgPC9kaXY+YFxuICAgIH1cblxuICAgIHJldHVybiBudWxsXG59XG4iLCJjb25zdCBiZWwgPSByZXF1aXJlKCdiZWwnKVxuY29uc3QgcmVhc29ucyA9IHJlcXVpcmUoJy4vc2hhcmVkL2dyYWRlLXNjb3JlY2FyZC1yZWFzb25zLmVzNi5qcycpXG5jb25zdCBncmFkZXMgPSByZXF1aXJlKCcuL3NoYXJlZC9ncmFkZS1zY29yZWNhcmQtZ3JhZGVzLmVzNi5qcycpXG5jb25zdCByYXRpbmdIZXJvID0gcmVxdWlyZSgnLi9zaGFyZWQvcmF0aW5nLWhlcm8uZXM2LmpzJylcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGJlbGA8c2VjdGlvbiBjbGFzcz1cInNsaWRpbmctc3VidmlldyBncmFkZS1zY29yZWNhcmQgc2xpZGluZy1zdWJ2aWV3LS1oYXMtZml4ZWQtaGVhZGVyXCI+XG4gICAgPGRpdiBjbGFzcz1cInNpdGUtaW5mbyBzaXRlLWluZm8tLWZ1bGwtaGVpZ2h0IGNhcmRcIj5cbiAgICAgICAgJHtyYXRpbmdIZXJvKHRoaXMubW9kZWwsIHsgc2hvd0Nsb3NlOiB0cnVlIH0pfVxuICAgICAgICAke3JlYXNvbnModGhpcy5tb2RlbCl9XG4gICAgICAgICR7Z3JhZGVzKHRoaXMubW9kZWwpfVxuICAgIDwvZGl2PlxuPC9zZWN0aW9uPmBcbn1cbiIsImNvbnN0IGJlbCA9IHJlcXVpcmUoJ2JlbCcpXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBiZWxgPG5hdiBjbGFzcz1cImhhbWJ1cmdlci1tZW51IGpzLWhhbWJ1cmdlci1tZW51IGlzLWhpZGRlblwiPlxuICAgIDxkaXYgY2xhc3M9XCJoYW1idXJnZXItbWVudV9fYmdcIj48L2Rpdj5cbiAgICA8ZGl2IGNsYXNzPVwiaGFtYnVyZ2VyLW1lbnVfX2NvbnRlbnQgY2FyZCBwYWRkZWRcIj5cbiAgICAgICAgPGgyIGNsYXNzPVwibWVudS10aXRsZSBib3JkZXItLWJvdHRvbSBoYW1idXJnZXItbWVudV9fY29udGVudF9fbW9yZS1vcHRpb25zXCI+XG4gICAgICAgICAgICBNb3JlIG9wdGlvbnNcbiAgICAgICAgPC9oMj5cbiAgICAgICAgPG5hdiBjbGFzcz1cInB1bGwtcmlnaHQgaGFtYnVyZ2VyLW1lbnVfX2Nsb3NlLWNvbnRhaW5lclwiPlxuICAgICAgICAgICAgPGEgaHJlZj1cImphdmFzY3JpcHQ6dm9pZCgwKVwiIGNsYXNzPVwiaWNvbiBpY29uX19jbG9zZSBqcy1oYW1idXJnZXItbWVudS1jbG9zZVwiIHJvbGU9XCJidXR0b25cIiBhcmlhLWxhYmVsPVwiQ2xvc2Ugb3B0aW9uc1wiPjwvYT5cbiAgICAgICAgPC9uYXY+XG4gICAgICAgIDx1bCBjbGFzcz1cImhhbWJ1cmdlci1tZW51X19saW5rcyBwYWRkZWQgZGVmYXVsdC1saXN0XCI+XG4gICAgICAgICAgICA8bGk+XG4gICAgICAgICAgICAgICAgPGEgaHJlZj1cImphdmFzY3JpcHQ6dm9pZCgwKVwiIGNsYXNzPVwibWVudS10aXRsZSBqcy1oYW1idXJnZXItbWVudS1vcHRpb25zLWxpbmtcIj5cbiAgICAgICAgICAgICAgICAgICAgU2V0dGluZ3NcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4+TWFuYWdlIFVucHJvdGVjdGVkIFNpdGVzIGFuZCBvdGhlciBvcHRpb25zLjwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICA8L2xpPlxuICAgICAgICAgICAgPGxpPlxuICAgICAgICAgICAgICAgIDxhIGhyZWY9XCJqYXZhc2NyaXB0OnZvaWQoMClcIiBjbGFzcz1cIm1lbnUtdGl0bGUganMtaGFtYnVyZ2VyLW1lbnUtZmVlZGJhY2stbGlua1wiPlxuICAgICAgICAgICAgICAgICAgICBTaGFyZSBmZWVkYmFja1xuICAgICAgICAgICAgICAgICAgICA8c3Bhbj5Hb3QgaXNzdWVzIG9yIHN1Z2dlc3Rpb25zPyBMZXQgdXMga25vdyE8L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgPC9saT5cbiAgICAgICAgICAgIDxsaT5cbiAgICAgICAgICAgICAgICA8YSBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApXCIgY2xhc3M9XCJtZW51LXRpdGxlIGpzLWhhbWJ1cmdlci1tZW51LWJyb2tlbi1zaXRlLWxpbmtcIj5cbiAgICAgICAgICAgICAgICAgICAgUmVwb3J0IGJyb2tlbiBzaXRlXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuPklmIGEgc2l0ZSdzIG5vdCB3b3JraW5nLCBwbGVhc2UgdGVsbCB1cy48L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgPC9saT5cbiAgICAgICAgICAgIDxsaSBjbGFzcz1cImlzLWhpZGRlblwiIGlkPVwiZGVidWdnZXItcGFuZWxcIj5cbiAgICAgICAgICAgICAgICA8YSBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApXCIgY2xhc3M9XCJtZW51LXRpdGxlIGpzLWhhbWJ1cmdlci1tZW51LWRlYnVnZ2VyLXBhbmVsLWxpbmtcIj5cbiAgICAgICAgICAgICAgICAgICAgUHJvdGVjdGlvbiBkZWJ1Z2dlciBwYW5lbFxuICAgICAgICAgICAgICAgICAgICA8c3Bhbj5EZWJ1ZyBwcml2YWN5IHByb3RlY3Rpb25zIG9uIGEgcGFnZS48L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgPC9saT5cbiAgICAgICAgPC91bD5cbiAgICA8L2Rpdj5cbjwvbmF2PmBcbn1cbiIsImNvbnN0IGJlbCA9IHJlcXVpcmUoJ2JlbCcpXG5jb25zdCBoZXJvID0gcmVxdWlyZSgnLi9zaGFyZWQvaGVyby5lczYuanMnKVxuY29uc3Qgc3RhdHVzTGlzdCA9IHJlcXVpcmUoJy4vc2hhcmVkL3N0YXR1cy1saXN0LmVzNi5qcycpXG5jb25zdCBjb25zdGFudHMgPSByZXF1aXJlKCcuLi8uLi8uLi9kYXRhL2NvbnN0YW50cycpXG5jb25zdCBsaW5rID0gcmVxdWlyZSgnLi9zaGFyZWQvbGluay5lczYuanMnKVxuXG5mdW5jdGlvbiB1cHBlckNhc2VGaXJzdCAoc3RyaW5nKSB7XG4gICAgcmV0dXJuIHN0cmluZy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHN0cmluZy5zbGljZSgxKVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcbiAgICBjb25zdCBkb21haW4gPSB0aGlzLm1vZGVsICYmIHRoaXMubW9kZWwuZG9tYWluXG4gICAgY29uc3QgdG9zZHIgPSB0aGlzLm1vZGVsICYmIHRoaXMubW9kZWwudG9zZHJcblxuICAgIGNvbnN0IHRvc2RyTXNnID0gKHRvc2RyICYmIHRvc2RyLm1lc3NhZ2UpIHx8XG4gICAgY29uc3RhbnRzLnRvc2RyTWVzc2FnZXMudW5rbm93blxuICAgIGNvbnN0IHRvc2RyU3RhdHVzID0gdG9zZHJNc2cudG9Mb3dlckNhc2UoKVxuXG4gICAgcmV0dXJuIGJlbGA8c2VjdGlvbiBjbGFzcz1cInNsaWRpbmctc3VidmlldyBzbGlkaW5nLXN1YnZpZXctLWhhcy1maXhlZC1oZWFkZXJcIj5cbiAgICA8ZGl2IGNsYXNzPVwicHJpdmFjeS1wcmFjdGljZXMgc2l0ZS1pbmZvIHNpdGUtaW5mby0tZnVsbC1oZWlnaHQgY2FyZFwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwianMtcHJpdmFjeS1wcmFjdGljZXMtaGVyb1wiPlxuICAgICAgICAgICAgJHtoZXJvKHtcbiAgICAgICAgc3RhdHVzOiB0b3NkclN0YXR1cyxcbiAgICAgICAgdGl0bGU6IGRvbWFpbixcbiAgICAgICAgc3VidGl0bGU6IGAke3Rvc2RyTXNnfSBQcml2YWN5IFByYWN0aWNlc2AsXG4gICAgICAgIHNob3dDbG9zZTogdHJ1ZVxuICAgIH0pfVxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cInByaXZhY3ktcHJhY3RpY2VzX19leHBsYWluZXIgcGFkZGVkIGJvcmRlci0tYm90dG9tLS1pbm5lclxuICAgICAgICAgICAgdGV4dC0tY2VudGVyXCI+XG4gICAgICAgICAgICBQcml2YWN5IHByYWN0aWNlcyBpbmRpY2F0ZSBob3cgbXVjaCB0aGUgcGVyc29uYWwgaW5mb3JtYXRpb25cbiAgICAgICAgICAgIHRoYXQgeW91IHNoYXJlIHdpdGggYSB3ZWJzaXRlIGlzIHByb3RlY3RlZC5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJwcml2YWN5LXByYWN0aWNlc19fZGV0YWlscyBwYWRkZWRcbiAgICAgICAgICAgIGpzLXByaXZhY3ktcHJhY3RpY2VzLWRldGFpbHNcIj5cbiAgICAgICAgICAgICR7dG9zZHIgJiYgdG9zZHIucmVhc29ucyA/IHJlbmRlckRldGFpbHModG9zZHIucmVhc29ucykgOiByZW5kZXJOb0RldGFpbHMoKX1cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJwcml2YWN5LXByYWN0aWNlc19fYXR0cmliIHBhZGRlZCB0ZXh0LS1jZW50ZXIgYm9yZGVyLS10b3AtLWlubmVyXCI+XG4gICAgICAgICAgICBQcml2YWN5IFByYWN0aWNlcyBmcm9tICR7bGluaygnaHR0cHM6Ly90b3Nkci5vcmcvJywge1xuICAgICAgICBjbGFzc05hbWU6ICdib2xkJyxcbiAgICAgICAgdGFyZ2V0OiAnX2JsYW5rJyxcbiAgICAgICAgdGV4dDogJ1RvUztEUicsXG4gICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICdhcmlhLWxhYmVsJzogJ1Rlcm1zIG9mIFNlcnZpY2U7IERpZG5cXCd0IFJlYWQnXG4gICAgICAgIH1cbiAgICB9KX0uXG4gICAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuPC9zZWN0aW9uPmBcbn1cblxuZnVuY3Rpb24gcmVuZGVyRGV0YWlscyAocmVhc29ucykge1xuICAgIGxldCBnb29kID0gcmVhc29ucy5nb29kIHx8IFtdXG4gICAgbGV0IGJhZCA9IHJlYXNvbnMuYmFkIHx8IFtdXG5cbiAgICBpZiAoIWdvb2QubGVuZ3RoICYmICFiYWQubGVuZ3RoKSByZXR1cm4gcmVuZGVyTm9EZXRhaWxzKClcblxuICAgIC8vIGNvbnZlcnQgYXJyYXlzIHRvIHdvcmsgZm9yIHRoZSBzdGF0dXNMaXN0IHRlbXBsYXRlLFxuICAgIC8vIHdoaWNoIHVzZSBvYmplY3RzXG5cbiAgICBnb29kID0gZ29vZC5tYXAoaXRlbSA9PiAoe1xuICAgICAgICBtc2c6IHVwcGVyQ2FzZUZpcnN0KGl0ZW0pLFxuICAgICAgICBtb2RpZmllcjogJ2dvb2QnXG4gICAgfSkpXG5cbiAgICBiYWQgPSBiYWQubWFwKGl0ZW0gPT4gKHtcbiAgICAgICAgbXNnOiB1cHBlckNhc2VGaXJzdChpdGVtKSxcbiAgICAgICAgbW9kaWZpZXI6ICdiYWQnXG4gICAgfSkpXG5cbiAgICAvLyBsaXN0IGdvb2QgZmlyc3QsIHRoZW4gYmFkXG4gICAgcmV0dXJuIHN0YXR1c0xpc3QoZ29vZC5jb25jYXQoYmFkKSlcbn1cblxuZnVuY3Rpb24gcmVuZGVyTm9EZXRhaWxzICgpIHtcbiAgICByZXR1cm4gYmVsYDxkaXYgY2xhc3M9XCJ0ZXh0LS1jZW50ZXJcIj5cbiAgICA8aDEgY2xhc3M9XCJwcml2YWN5LXByYWN0aWNlc19fZGV0YWlsc19fdGl0bGVcIj5cbiAgICAgICAgTm8gcHJpdmFjeSBwcmFjdGljZXMgZm91bmRcbiAgICA8L2gxPlxuICAgIDxkaXYgY2xhc3M9XCJwcml2YWN5LXByYWN0aWNlc19fZGV0YWlsc19fbXNnXCI+XG4gICAgICAgIFRoZSBwcml2YWN5IHByYWN0aWNlcyBvZiB0aGlzIHdlYnNpdGUgaGF2ZSBub3QgYmVlbiByZXZpZXdlZC5cbiAgICA8L2Rpdj5cbjwvZGl2PmBcbn1cbiIsImNvbnN0IGJlbCA9IHJlcXVpcmUoJ2JlbCcpXG5jb25zdCBoYW1idXJnZXJCdXR0b24gPSByZXF1aXJlKCcuL3NoYXJlZC9oYW1idXJnZXItYnV0dG9uLmVzNi5qcycpXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBiZWxgXG4gICAgPGZvcm0gY2xhc3M9XCJzbGlkaW5nLXN1YnZpZXdfX2hlYWRlciBzZWFyY2gtZm9ybSBqcy1zZWFyY2gtZm9ybVwiIG5hbWU9XCJ4XCI+XG4gICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGF1dG9jb21wbGV0ZT1cIm9mZlwiIHBsYWNlaG9sZGVyPVwiU2VhcmNoIER1Y2tEdWNrR29cIlxuICAgICAgICAgICAgbmFtZT1cInFcIiBjbGFzcz1cInNlYXJjaC1mb3JtX19pbnB1dCBqcy1zZWFyY2gtaW5wdXRcIlxuICAgICAgICAgICAgdmFsdWU9XCIke3RoaXMubW9kZWwuc2VhcmNoVGV4dH1cIiAvPlxuICAgICAgICA8aW5wdXQgY2xhc3M9XCJzZWFyY2gtZm9ybV9fZ28ganMtc2VhcmNoLWdvXCIgdmFsdWU9XCJcIiB0eXBlPVwic3VibWl0XCIgYXJpYS1sYWJlbD1cIlNlYXJjaFwiIC8+XG4gICAgICAgICR7aGFtYnVyZ2VyQnV0dG9uKCdqcy1zZWFyY2gtaGFtYnVyZ2VyLWJ1dHRvbicpfVxuICAgIDwvZm9ybT5gXG59XG4iLCJjb25zdCBzdGF0dXNMaXN0ID0gcmVxdWlyZSgnLi9zdGF0dXMtbGlzdC5lczYuanMnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzaXRlKSB7XG4gICAgY29uc3QgZ3JhZGVzID0gZ2V0R3JhZGVzKHNpdGUuc2l0ZVJhdGluZywgc2l0ZS5pc0FsbG93bGlzdGVkKVxuXG4gICAgaWYgKCFncmFkZXMgfHwgIWdyYWRlcy5sZW5ndGgpIHJldHVyblxuXG4gICAgcmV0dXJuIHN0YXR1c0xpc3QoZ3JhZGVzLCAnc3RhdHVzLWxpc3QtLXJpZ2h0IHBhZGRlZCBqcy1ncmFkZS1zY29yZWNhcmQtZ3JhZGVzJylcbn1cblxuZnVuY3Rpb24gZ2V0R3JhZGVzIChyYXRpbmcsIGlzQWxsb3dsaXN0ZWQpIHtcbiAgICBpZiAoIXJhdGluZyB8fCAhcmF0aW5nLmJlZm9yZSB8fCAhcmF0aW5nLmFmdGVyKSByZXR1cm5cblxuICAgIC8vIHRyYW5zZm9ybSBzaXRlIHJhdGluZ3MgaW50byBncmFkZXNcbiAgICAvLyB0aGF0IHRoZSB0ZW1wbGF0ZSBjYW4gZGlzcGxheSBtb3JlIGVhc2lseVxuICAgIGNvbnN0IGJlZm9yZSA9IHJhdGluZy5jc3NCZWZvcmVcbiAgICBjb25zdCBhZnRlciA9IHJhdGluZy5jc3NBZnRlclxuXG4gICAgY29uc3QgZ3JhZGVzID0gW11cblxuICAgIGdyYWRlcy5wdXNoKHtcbiAgICAgICAgbXNnOiAnUHJpdmFjeSBHcmFkZScsXG4gICAgICAgIG1vZGlmaWVyOiBiZWZvcmUudG9Mb3dlckNhc2UoKVxuICAgIH0pXG5cbiAgICBpZiAoYmVmb3JlICE9PSBhZnRlciAmJiAhaXNBbGxvd2xpc3RlZCkge1xuICAgICAgICBncmFkZXMucHVzaCh7XG4gICAgICAgICAgICBtc2c6ICdFbmhhbmNlZCBHcmFkZScsXG4gICAgICAgICAgICBtb2RpZmllcjogYWZ0ZXIudG9Mb3dlckNhc2UoKSxcbiAgICAgICAgICAgIGhpZ2hsaWdodDogdHJ1ZVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIHJldHVybiBncmFkZXNcbn1cbiIsImNvbnN0IHN0YXR1c0xpc3QgPSByZXF1aXJlKCcuL3N0YXR1cy1saXN0LmVzNi5qcycpXG5jb25zdCBjb25zdGFudHMgPSByZXF1aXJlKCcuLi8uLi8uLi8uLi9kYXRhL2NvbnN0YW50cycpXG5jb25zdCB0cmFja2VyTmV0d29ya3NUZXh0ID0gcmVxdWlyZSgnLi90cmFja2VyLW5ldHdvcmtzLXRleHQuZXM2LmpzJylcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc2l0ZSkge1xuICAgIGNvbnN0IHJlYXNvbnMgPSBnZXRSZWFzb25zKHNpdGUpXG5cbiAgICBpZiAoIXJlYXNvbnMgfHwgIXJlYXNvbnMubGVuZ3RoKSByZXR1cm5cblxuICAgIHJldHVybiBzdGF0dXNMaXN0KHJlYXNvbnMsICdzdGF0dXMtbGlzdC0tcmlnaHQgcGFkZGVkIGJvcmRlci0tYm90dG9tLS1pbm5lciBqcy1ncmFkZS1zY29yZWNhcmQtcmVhc29ucycpXG59XG5cbmZ1bmN0aW9uIGdldFJlYXNvbnMgKHNpdGUpIHtcbiAgICBjb25zdCByZWFzb25zID0gW11cblxuICAgIC8vIGdyYWIgYWxsIHRoZSBkYXRhIGZyb20gdGhlIHNpdGUgdG8gY3JlYXRlXG4gICAgLy8gYSBsaXN0IG9mIHJlYXNvbnMgYmVoaW5kIHRoZSBncmFkZVxuXG4gICAgLy8gZW5jcnlwdGlvbiBzdGF0dXNcbiAgICBjb25zdCBodHRwc1N0YXRlID0gc2l0ZS5odHRwc1N0YXRlXG4gICAgaWYgKGh0dHBzU3RhdGUpIHtcbiAgICAgICAgY29uc3QgbW9kaWZpZXIgPSBodHRwc1N0YXRlID09PSAnbm9uZScgPyAnYmFkJyA6ICdnb29kJ1xuXG4gICAgICAgIHJlYXNvbnMucHVzaCh7XG4gICAgICAgICAgICBtb2RpZmllcixcbiAgICAgICAgICAgIG1zZzogc2l0ZS5odHRwc1N0YXR1c1RleHRcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICAvLyB0cmFja2luZyBuZXR3b3JrcyBibG9ja2VkIG9yIGZvdW5kLFxuICAgIC8vIG9ubHkgc2hvdyBhIG1lc3NhZ2UgaWYgdGhlcmUncyBhbnlcbiAgICBjb25zdCB0cmFja2Vyc0NvdW50ID0gc2l0ZS5pc0FsbG93bGlzdGVkID8gc2l0ZS50cmFja2Vyc0NvdW50IDogc2l0ZS50cmFja2Vyc0Jsb2NrZWRDb3VudFxuICAgIGNvbnN0IHRyYWNrZXJzQmFkT3JHb29kID0gKHRyYWNrZXJzQ291bnQgIT09IDApID8gJ2JhZCcgOiAnZ29vZCdcbiAgICByZWFzb25zLnB1c2goe1xuICAgICAgICBtb2RpZmllcjogdHJhY2tlcnNCYWRPckdvb2QsXG4gICAgICAgIG1zZzogYCR7dHJhY2tlck5ldHdvcmtzVGV4dChzaXRlKX1gXG4gICAgfSlcblxuICAgIC8vIG1ham9yIHRyYWNraW5nIG5ldHdvcmtzLFxuICAgIC8vIG9ubHkgc2hvdyBhIG1lc3NhZ2UgaWYgdGhlcmUgYXJlIGFueVxuICAgIGNvbnN0IG1ham9yVHJhY2tlcnNCYWRPckdvb2QgPSAoc2l0ZS5tYWpvclRyYWNrZXJOZXR3b3Jrc0NvdW50ICE9PSAwKSA/ICdiYWQnIDogJ2dvb2QnXG4gICAgcmVhc29ucy5wdXNoKHtcbiAgICAgICAgbW9kaWZpZXI6IG1ham9yVHJhY2tlcnNCYWRPckdvb2QsXG4gICAgICAgIG1zZzogYCR7dHJhY2tlck5ldHdvcmtzVGV4dChzaXRlLCB0cnVlKX1gXG4gICAgfSlcblxuICAgIC8vIElzIHRoZSBzaXRlIGl0c2VsZiBhIG1ham9yIHRyYWNraW5nIG5ldHdvcms/XG4gICAgLy8gb25seSBzaG93IGEgbWVzc2FnZSBpZiBpdCBpc1xuICAgIGlmIChzaXRlLmlzYU1ham9yVHJhY2tpbmdOZXR3b3JrKSB7XG4gICAgICAgIHJlYXNvbnMucHVzaCh7XG4gICAgICAgICAgICBtb2RpZmllcjogJ2JhZCcsXG4gICAgICAgICAgICBtc2c6ICdTaXRlIElzIGEgTWFqb3IgVHJhY2tlciBOZXR3b3JrJ1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIC8vIHByaXZhY3kgcHJhY3RpY2VzIGZyb20gdG9zZHJcbiAgICBjb25zdCB1bmtub3duUHJhY3RpY2VzID0gY29uc3RhbnRzLnRvc2RyTWVzc2FnZXMudW5rbm93blxuICAgIGNvbnN0IHByaXZhY3lNZXNzYWdlID0gKHNpdGUudG9zZHIgJiYgc2l0ZS50b3Nkci5tZXNzYWdlKSB8fCB1bmtub3duUHJhY3RpY2VzXG4gICAgY29uc3QgbW9kaWZpZXIgPSAocHJpdmFjeU1lc3NhZ2UgPT09IHVua25vd25QcmFjdGljZXMpID8gJ3Bvb3InIDogcHJpdmFjeU1lc3NhZ2UudG9Mb3dlckNhc2UoKVxuICAgIHJlYXNvbnMucHVzaCh7XG4gICAgICAgIG1vZGlmaWVyOiBtb2RpZmllcixcbiAgICAgICAgbXNnOiBgJHtwcml2YWN5TWVzc2FnZX0gUHJpdmFjeSBQcmFjdGljZXNgXG4gICAgfSlcblxuICAgIHJldHVybiByZWFzb25zXG59XG4iLCJjb25zdCBiZWwgPSByZXF1aXJlKCdiZWwnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChrbGFzcykge1xuICAgIGtsYXNzID0ga2xhc3MgfHwgJydcbiAgICByZXR1cm4gYmVsYDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiaGFtYnVyZ2VyLWJ1dHRvbiAke2tsYXNzfVwiIGFyaWEtbGFiZWw9XCJNb3JlIG9wdGlvbnNcIj5cbiAgICA8c3Bhbj48L3NwYW4+XG4gICAgPHNwYW4+PC9zcGFuPlxuICAgIDxzcGFuPjwvc3Bhbj5cbjwvYnV0dG9uPmBcbn1cbiIsImNvbnN0IGJlbCA9IHJlcXVpcmUoJ2JlbCcpXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9wcykge1xuICAgIGNvbnN0IHNsaWRpbmdTdWJ2aWV3Q2xhc3MgPSBvcHMuc2hvd0Nsb3NlID8gJ2pzLXNsaWRpbmctc3Vidmlldy1jbG9zZScgOiAnJ1xuICAgIHJldHVybiBiZWxgPGRpdiBjbGFzcz1cImhlcm8gdGV4dC0tY2VudGVyICR7c2xpZGluZ1N1YnZpZXdDbGFzc31cIj5cbiAgICA8ZGl2IGNsYXNzPVwiaGVyb19faWNvbiBoZXJvX19pY29uLS0ke29wcy5zdGF0dXN9XCI+XG4gICAgPC9kaXY+XG4gICAgPGgxIGNsYXNzPVwiaGVyb19fdGl0bGVcIj5cbiAgICAgICAgJHtvcHMudGl0bGV9XG4gICAgPC9oMT5cbiAgICA8aDIgY2xhc3M9XCJoZXJvX19zdWJ0aXRsZSAke29wcy5zdWJ0aXRsZSA9PT0gJycgPyAnaXMtaGlkZGVuJyA6ICcnfVwiIGFyaWEtbGFiZWw9XCIke29wcy5zdWJ0aXRsZUxhYmVsID8gb3BzLnN1YnRpdGxlTGFiZWwgOiBvcHMuc3VidGl0bGV9XCI+XG4gICAgICAgICR7b3BzLnN1YnRpdGxlfVxuICAgIDwvaDI+XG4gICAgJHtyZW5kZXJPcGVuT3JDbG9zZUJ1dHRvbihvcHMuc2hvd0Nsb3NlKX1cbjwvZGl2PmBcbn1cblxuZnVuY3Rpb24gcmVuZGVyT3Blbk9yQ2xvc2VCdXR0b24gKGlzQ2xvc2VCdXR0b24pIHtcbiAgICBjb25zdCBvcGVuT3JDbG9zZSA9IGlzQ2xvc2VCdXR0b24gPyAnY2xvc2UnIDogJ29wZW4nXG4gICAgY29uc3QgYXJyb3dJY29uQ2xhc3MgPSBpc0Nsb3NlQnV0dG9uID8gJ2ljb25fX2Fycm93LS1sZWZ0JyA6ICcnXG4gICAgcmV0dXJuIGJlbGA8YSBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApXCJcbiAgICAgICAgY2xhc3M9XCJoZXJvX18ke29wZW5PckNsb3NlfVwiXG4gICAgICAgIHJvbGU9XCJidXR0b25cIlxuICAgICAgICBhcmlhLWxhYmVsPVwiJHtpc0Nsb3NlQnV0dG9uID8gJ0dvIGJhY2snIDogJ01vcmUgZGV0YWlscyd9XCJcbiAgICAgICAgPlxuICAgIDxzcGFuIGNsYXNzPVwiaWNvbiBpY29uX19hcnJvdyBpY29uX19hcnJvdy0tbGFyZ2UgJHthcnJvd0ljb25DbGFzc31cIj5cbiAgICA8L3NwYW4+XG48L2E+YFxufVxuIiwiLyogR2VuZXJhdGVzIGEgbGluayB0YWdcbiAqIHVybDogaHJlZiB1cmxcbiAqIG9wdGlvbnM6IGFueSBhIHRhZyBhdHRyaWJ1dGVcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAodXJsLCBvcHRpb25zKSB7XG4gICAgY29uc3QgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKVxuICAgIGEuaHJlZiA9IHVybFxuXG4gICAgLy8gYXR0cmlidXRlcyBmb3IgdGhlIDxhPiB0YWcsIGUuZy4gXCJhcmlhLWxhYmVsXCJcbiAgICBpZiAob3B0aW9ucy5hdHRyaWJ1dGVzKSB7XG4gICAgICAgIGZvciAoY29uc3QgYXR0ciBpbiBvcHRpb25zLmF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIGEuc2V0QXR0cmlidXRlKGF0dHIsIG9wdGlvbnMuYXR0cmlidXRlc1thdHRyXSlcbiAgICAgICAgfVxuXG4gICAgICAgIGRlbGV0ZSBvcHRpb25zLmF0dHJpYnV0ZXNcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGtleSBpbiBvcHRpb25zKSB7XG4gICAgICAgIGFba2V5XSA9IG9wdGlvbnNba2V5XVxuICAgIH1cblxuICAgIHJldHVybiBhXG59XG4iLCJjb25zdCBiZWwgPSByZXF1aXJlKCdiZWwnKVxuY29uc3QgaGVybyA9IHJlcXVpcmUoJy4vaGVyby5lczYuanMnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzaXRlLCBvcHMpIHtcbiAgICBjb25zdCBzdGF0dXMgPSBzaXRlUmF0aW5nU3RhdHVzKFxuICAgICAgICBzaXRlLmlzQ2FsY3VsYXRpbmdTaXRlUmF0aW5nLFxuICAgICAgICBzaXRlLnNpdGVSYXRpbmcsXG4gICAgICAgIHNpdGUuaXNBbGxvd2xpc3RlZFxuICAgIClcbiAgICBjb25zdCBzdWJ0aXRsZSA9IHNpdGVSYXRpbmdTdWJ0aXRsZShcbiAgICAgICAgc2l0ZS5pc0NhbGN1bGF0aW5nU2l0ZVJhdGluZyxcbiAgICAgICAgc2l0ZS5zaXRlUmF0aW5nLFxuICAgICAgICBzaXRlLmlzQWxsb3dsaXN0ZWQsXG4gICAgICAgIHNpdGUuaXNCcm9rZW5cbiAgICApXG4gICAgY29uc3QgbGFiZWwgPSBzdWJ0aXRsZUxhYmVsKFxuICAgICAgICBzaXRlLmlzQ2FsY3VsYXRpbmdTaXRlUmF0aW5nLFxuICAgICAgICBzaXRlLnNpdGVSYXRpbmcsXG4gICAgICAgIHNpdGUuaXNBbGxvd2xpc3RlZFxuICAgIClcblxuICAgIHJldHVybiBiZWxgPGRpdiBjbGFzcz1cInJhdGluZy1oZXJvLWNvbnRhaW5lciBqcy1yYXRpbmctaGVyb1wiPlxuICAgICAke2hlcm8oe1xuICAgICAgICBzdGF0dXM6IHN0YXR1cyxcbiAgICAgICAgdGl0bGU6IHNpdGUuZG9tYWluLFxuICAgICAgICBzdWJ0aXRsZTogc3VidGl0bGUsXG4gICAgICAgIHN1YnRpdGxlTGFiZWw6IGxhYmVsLFxuICAgICAgICBzaG93Q2xvc2U6IG9wcy5zaG93Q2xvc2UsXG4gICAgICAgIHNob3dPcGVuOiBvcHMuc2hvd09wZW5cbiAgICB9KX1cbjwvZGl2PmBcbn1cblxuZnVuY3Rpb24gc2l0ZVJhdGluZ1N0YXR1cyAoaXNDYWxjdWxhdGluZywgcmF0aW5nLCBpc0FsbG93bGlzdGVkKSB7XG4gICAgbGV0IHN0YXR1c1xuICAgIGxldCBpc0FjdGl2ZSA9ICcnXG5cbiAgICBpZiAoaXNDYWxjdWxhdGluZykge1xuICAgICAgICBzdGF0dXMgPSAnY2FsY3VsYXRpbmcnXG4gICAgfSBlbHNlIGlmIChyYXRpbmcgJiYgcmF0aW5nLmJlZm9yZSkge1xuICAgICAgICBpc0FjdGl2ZSA9IGlzQWxsb3dsaXN0ZWQgPyAnJyA6ICctLWFjdGl2ZSdcblxuICAgICAgICBpZiAoaXNBY3RpdmUgJiYgcmF0aW5nLmFmdGVyKSB7XG4gICAgICAgICAgICBzdGF0dXMgPSByYXRpbmcuY3NzQWZ0ZXJcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN0YXR1cyA9IHJhdGluZy5jc3NCZWZvcmVcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YXR1cyA9ICdudWxsJ1xuICAgIH1cblxuICAgIHJldHVybiBzdGF0dXMgKyBpc0FjdGl2ZVxufVxuXG5mdW5jdGlvbiBzaXRlUmF0aW5nU3VidGl0bGUgKGlzQ2FsY3VsYXRpbmcsIHJhdGluZywgaXNBbGxvd2xpc3RlZCwgaXNCcm9rZW4pIHtcbiAgICBsZXQgaXNBY3RpdmUgPSB0cnVlXG4gICAgaWYgKGlzQnJva2VuKSB7XG4gICAgICAgIHJldHVybiAnJ1xuICAgIH1cbiAgICBpZiAoaXNBbGxvd2xpc3RlZCkgaXNBY3RpdmUgPSBmYWxzZVxuICAgIC8vIHNpdGUgZ3JhZGUvcmF0aW5nIHdhcyB1cGdyYWRlZCBieSBleHRlbnNpb25cbiAgICBpZiAoaXNBY3RpdmUgJiYgcmF0aW5nICYmIHJhdGluZy5iZWZvcmUgJiYgcmF0aW5nLmFmdGVyKSB7XG4gICAgICAgIGlmIChyYXRpbmcuYmVmb3JlICE9PSByYXRpbmcuYWZ0ZXIpIHtcbiAgICAgICAgICAgIC8vIHdyYXAgdGhpcyBpbiBhIHNpbmdsZSByb290IHNwYW4gb3RoZXJ3aXNlIGJlbCBjb21wbGFpbnNcbiAgICAgICAgICAgIHJldHVybiBiZWxgPHNwYW4+U2l0ZSBlbmhhbmNlZCBmcm9tXG4gICAgPHNwYW4gY2xhc3M9XCJyYXRpbmctbGV0dGVyIHJhdGluZy1sZXR0ZXItLSR7cmF0aW5nLmNzc0JlZm9yZX1cIj5cbiAgICA8L3NwYW4+XG48L3NwYW4+YFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gZGVhbCB3aXRoIG90aGVyIHN0YXRlc1xuICAgIGxldCBtc2cgPSAnUHJpdmFjeSBHcmFkZSdcbiAgICAvLyBzaXRlIGlzIHdoaXRlbGlzdGVkXG4gICAgaWYgKCFpc0FjdGl2ZSkge1xuICAgICAgICBtc2cgPSAnUHJpdmFjeSBQcm90ZWN0aW9uIERpc2FibGVkJ1xuICAgICAgICAvLyBcIm51bGxcIiBzdGF0ZSAoZW1wdHkgdGFiLCBicm93c2VyJ3MgXCJhYm91dDpcIiBwYWdlcylcbiAgICB9IGVsc2UgaWYgKCFpc0NhbGN1bGF0aW5nICYmICFyYXRpbmcuYmVmb3JlICYmICFyYXRpbmcuYWZ0ZXIpIHtcbiAgICAgICAgbXNnID0gJ1dlIG9ubHkgZ3JhZGUgcmVndWxhciB3ZWJzaXRlcydcbiAgICAgICAgLy8gcmF0aW5nIGlzIHN0aWxsIGNhbGN1bGF0aW5nXG4gICAgfSBlbHNlIGlmIChpc0NhbGN1bGF0aW5nKSB7XG4gICAgICAgIG1zZyA9ICdDYWxjdWxhdGluZy4uLidcbiAgICB9XG5cbiAgICByZXR1cm4gYmVsYCR7bXNnfWBcbn1cblxuLy8gdG8gYXZvaWQgZHVwbGljYXRpbmcgbWVzc2FnZXMgYmV0d2VlbiB0aGUgaWNvbiBhbmQgdGhlIHN1YnRpdGxlLFxuLy8gd2UgY29tYmluZSBpbmZvcm1hdGlvbiBmb3IgYm90aCBoZXJlXG5mdW5jdGlvbiBzdWJ0aXRsZUxhYmVsIChpc0NhbGN1bGF0aW5nLCByYXRpbmcsIGlzQWxsb3dsaXN0ZWQpIHtcbiAgICBpZiAoaXNDYWxjdWxhdGluZykgcmV0dXJuXG5cbiAgICBpZiAoaXNBbGxvd2xpc3RlZCAmJiByYXRpbmcuYmVmb3JlKSB7XG4gICAgICAgIHJldHVybiBgUHJpdmFjeSBQcm90ZWN0aW9uIERpc2FibGVkLCBQcml2YWN5IEdyYWRlICR7cmF0aW5nLmJlZm9yZX1gXG4gICAgfVxuXG4gICAgaWYgKHJhdGluZy5iZWZvcmUgJiYgcmF0aW5nLmJlZm9yZSA9PT0gcmF0aW5nLmFmdGVyKSB7XG4gICAgICAgIHJldHVybiBgUHJpdmFjeSBHcmFkZSAke3JhdGluZy5iZWZvcmV9YFxuICAgIH1cblxuICAgIGlmIChyYXRpbmcuYmVmb3JlICYmIHJhdGluZy5hZnRlcikge1xuICAgICAgICByZXR1cm4gYFNpdGUgZW5oYW5jZWQgZnJvbSAke3JhdGluZy5iZWZvcmV9YFxuICAgIH1cbn1cbiIsImNvbnN0IGJlbCA9IHJlcXVpcmUoJ2JlbCcpXG5jb25zdCBoYW1idXJnZXJCdXR0b24gPSByZXF1aXJlKCcuL2hhbWJ1cmdlci1idXR0b24uZXM2LmpzJylcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAodGl0bGUpIHtcbiAgICByZXR1cm4gYmVsYDxuYXYgY2xhc3M9XCJzbGlkaW5nLXN1YnZpZXdfX2hlYWRlciBjYXJkXCI+XG4gICAgPGEgaHJlZj1cImphdmFzY3JpcHQ6dm9pZCgwKVwiIGNsYXNzPVwic2xpZGluZy1zdWJ2aWV3X19oZWFkZXJfX2JhY2tcbiAgICAgICAgc2xpZGluZy1zdWJ2aWV3X19oZWFkZXJfX2JhY2stLWlzLWljb25cbiAgICAgICAganMtc2xpZGluZy1zdWJ2aWV3LWNsb3NlXCI+XG4gICAgICAgIDxzcGFuIGNsYXNzPVwiaWNvbiBpY29uX19hcnJvdyBpY29uX19hcnJvdy0tbGVmdCBwdWxsLWxlZnRcIj5cbiAgICAgICAgPC9zcGFuPlxuICAgIDwvYT5cbiAgICA8aDIgY2xhc3M9XCJzbGlkaW5nLXN1YnZpZXdfX2hlYWRlcl9fdGl0bGVcIj5cbiAgICAgICAgJHt0aXRsZX1cbiAgICA8L2gyPlxuICAgICR7aGFtYnVyZ2VyQnV0dG9uKCl9XG48L25hdj5gXG59XG4iLCJjb25zdCBiZWwgPSByZXF1aXJlKCdiZWwnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChpdGVtcywgZXh0cmFDbGFzc2VzKSB7XG4gICAgZXh0cmFDbGFzc2VzID0gZXh0cmFDbGFzc2VzIHx8ICcnXG5cbiAgICByZXR1cm4gYmVsYDx1bCBjbGFzcz1cInN0YXR1cy1saXN0ICR7ZXh0cmFDbGFzc2VzfVwiPlxuICAgICR7aXRlbXMubWFwKHJlbmRlckl0ZW0pfVxuPC91bD5gXG59XG5cbmZ1bmN0aW9uIHJlbmRlckl0ZW0gKGl0ZW0pIHtcbiAgICByZXR1cm4gYmVsYDxsaSBjbGFzcz1cInN0YXR1cy1saXN0X19pdGVtIHN0YXR1cy1saXN0X19pdGVtLS0ke2l0ZW0ubW9kaWZpZXJ9XG4gICAgYm9sZCAke2l0ZW0uaGlnaGxpZ2h0ID8gJ2lzLWhpZ2hsaWdodGVkJyA6ICcnfVwiPlxuICAgICR7aXRlbS5tc2d9XG48L2xpPmBcbn1cbiIsImNvbnN0IGJlbCA9IHJlcXVpcmUoJ2JlbCcpXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGlzQWN0aXZlQm9vbGVhbiwga2xhc3MsIGRhdGFLZXkpIHtcbiAgICAvLyBtYWtlIGBrbGFzc2AgYW5kIGBkYXRhS2V5YCBvcHRpb25hbDpcbiAgICBrbGFzcyA9IGtsYXNzIHx8ICcnXG4gICAgZGF0YUtleSA9IGRhdGFLZXkgfHwgJydcblxuICAgIHJldHVybiBiZWxgXG48YnV0dG9uIGNsYXNzPVwidG9nZ2xlLWJ1dHRvbiB0b2dnbGUtYnV0dG9uLS1pcy1hY3RpdmUtJHtpc0FjdGl2ZUJvb2xlYW59ICR7a2xhc3N9XCJcbiAgICBkYXRhLWtleT1cIiR7ZGF0YUtleX1cIlxuICAgIHR5cGU9XCJidXR0b25cIlxuICAgIGFyaWEtcHJlc3NlZD1cIiR7aXNBY3RpdmVCb29sZWFuID8gJ3RydWUnIDogJ2ZhbHNlJ31cIlxuICAgID5cbiAgICA8ZGl2IGNsYXNzPVwidG9nZ2xlLWJ1dHRvbl9fYmdcIj5cbiAgICA8L2Rpdj5cbiAgICA8ZGl2IGNsYXNzPVwidG9nZ2xlLWJ1dHRvbl9fa25vYlwiPjwvZGl2PlxuPC9idXR0b24+YFxufVxuIiwiY29uc3QgYmVsID0gcmVxdWlyZSgnYmVsJylcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGJlbGA8ZGl2IGNsYXNzPVwidG9wLWJsb2NrZWRfX25vLWRhdGFcIj5cbiAgICA8ZGl2IGNsYXNzPVwidG9wLWJsb2NrZWRfX25vLWRhdGFfX2dyYXBoXCI+XG4gICAgICAgIDxzcGFuIGNsYXNzPVwidG9wLWJsb2NrZWRfX25vLWRhdGFfX2dyYXBoX19iYXIgb25lXCI+PC9zcGFuPlxuICAgICAgICA8c3BhbiBjbGFzcz1cInRvcC1ibG9ja2VkX19uby1kYXRhX19ncmFwaF9fYmFyIHR3b1wiPjwvc3Bhbj5cbiAgICAgICAgPHNwYW4gY2xhc3M9XCJ0b3AtYmxvY2tlZF9fbm8tZGF0YV9fZ3JhcGhfX2JhciB0aHJlZVwiPjwvc3Bhbj5cbiAgICAgICAgPHNwYW4gY2xhc3M9XCJ0b3AtYmxvY2tlZF9fbm8tZGF0YV9fZ3JhcGhfX2JhciBmb3VyXCI+PC9zcGFuPlxuICAgIDwvZGl2PlxuICAgIDxwIGNsYXNzPVwidG9wLWJsb2NrZWRfX25vLWRhdGFfX2xlYWQgdGV4dC1jZW50ZXJcIj5UcmFja2VyIE5ldHdvcmtzIFRvcCBPZmZlbmRlcnM8L3A+XG4gICAgPHA+Tm8gZGF0YSBhdmFpbGFibGUgeWV0PC9wPlxuPC9kaXY+YFxufVxuIiwiY29uc3QgYmVsID0gcmVxdWlyZSgnYmVsJylcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc2l0ZVJhdGluZywgaXNBbGxvd2xpc3RlZCwgdG90YWxUcmFja2VyTmV0d29ya3NDb3VudCkge1xuICAgIGxldCBpY29uTmFtZU1vZGlmaWVyID0gJ2Jsb2NrZWQnXG5cbiAgICBpZiAoaXNBbGxvd2xpc3RlZCAmJiAoc2l0ZVJhdGluZy5iZWZvcmUgPT09ICdEJykgJiYgKHRvdGFsVHJhY2tlck5ldHdvcmtzQ291bnQgIT09IDApKSB7XG4gICAgICAgIGljb25OYW1lTW9kaWZpZXIgPSAnd2FybmluZydcbiAgICB9XG5cbiAgICBjb25zdCBpY29uTmFtZSA9ICdtYWpvci1uZXR3b3Jrcy0nICsgaWNvbk5hbWVNb2RpZmllclxuXG4gICAgcmV0dXJuIGJlbGAke2ljb25OYW1lfWBcbn1cbiIsImNvbnN0IGJlbCA9IHJlcXVpcmUoJ2JlbCcpXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHNpdGUsIGlzTWFqb3JOZXR3b3Jrc0NvdW50KSB7XG4gICAgLy8gU2hvdyBhbGwgdHJhY2tlcnMgZm91bmQgaWYgc2l0ZSBpcyB3aGl0ZWxpc3RlZFxuICAgIC8vIGJ1dCBvbmx5IHNob3cgdGhlIGJsb2NrZWQgb25lcyBvdGhlcndpc2VcbiAgICBsZXQgdHJhY2tlcnNDb3VudCA9IHNpdGUuaXNBbGxvd2xpc3RlZCA/IHNpdGUudHJhY2tlcnNDb3VudCA6IHNpdGUudHJhY2tlcnNCbG9ja2VkQ291bnQgfHwgMFxuICAgIGxldCB1bmlxdWVUcmFja2Vyc1RleHQgPSB0cmFja2Vyc0NvdW50ID09PSAxID8gJyBUcmFja2VyICcgOiAnIFRyYWNrZXJzICdcblxuICAgIGlmIChpc01ham9yTmV0d29ya3NDb3VudCkge1xuICAgICAgICB0cmFja2Vyc0NvdW50ID0gc2l0ZS5tYWpvclRyYWNrZXJOZXR3b3Jrc0NvdW50XG4gICAgICAgIHVuaXF1ZVRyYWNrZXJzVGV4dCA9IHRyYWNrZXJzQ291bnQgPT09IDEgPyAnIE1ham9yIFRyYWNrZXIgTmV0d29yayAnIDogJyBNYWpvciBUcmFja2VyIE5ldHdvcmtzICdcbiAgICB9XG4gICAgY29uc3QgZmluYWxUZXh0ID0gdHJhY2tlcnNDb3VudCArIHVuaXF1ZVRyYWNrZXJzVGV4dCArIHRyYWNrZXJzQmxvY2tlZE9yRm91bmQoc2l0ZSwgdHJhY2tlcnNDb3VudClcblxuICAgIHJldHVybiBiZWxgJHtmaW5hbFRleHR9YFxufVxuXG5mdW5jdGlvbiB0cmFja2Vyc0Jsb2NrZWRPckZvdW5kIChzaXRlLCB0cmFja2Vyc0NvdW50KSB7XG4gICAgbGV0IG1zZyA9ICcnXG4gICAgaWYgKHNpdGUgJiYgKHNpdGUuaXNBbGxvd2xpc3RlZCB8fCB0cmFja2Vyc0NvdW50ID09PSAwKSkge1xuICAgICAgICBtc2cgPSAnRm91bmQnXG4gICAgfSBlbHNlIHtcbiAgICAgICAgbXNnID0gJ0Jsb2NrZWQnXG4gICAgfVxuXG4gICAgcmV0dXJuIGJlbGAke21zZ31gXG59XG4iLCJjb25zdCBiZWwgPSByZXF1aXJlKCdiZWwnKVxuY29uc3QgdG9nZ2xlQnV0dG9uID0gcmVxdWlyZSgnLi9zaGFyZWQvdG9nZ2xlLWJ1dHRvbi5lczYuanMnKVxuY29uc3QgcmF0aW5nSGVybyA9IHJlcXVpcmUoJy4vc2hhcmVkL3JhdGluZy1oZXJvLmVzNi5qcycpXG5jb25zdCB0cmFja2VyTmV0d29ya3NJY29uID0gcmVxdWlyZSgnLi9zaGFyZWQvdHJhY2tlci1uZXR3b3JrLWljb24uZXM2LmpzJylcbmNvbnN0IHRyYWNrZXJOZXR3b3Jrc1RleHQgPSByZXF1aXJlKCcuL3NoYXJlZC90cmFja2VyLW5ldHdvcmtzLXRleHQuZXM2LmpzJylcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4uLy4uLy4uL2RhdGEvY29uc3RhbnRzJylcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgY29uc3QgdG9zZHJNc2cgPSAodGhpcy5tb2RlbC50b3NkciAmJiB0aGlzLm1vZGVsLnRvc2RyLm1lc3NhZ2UpIHx8XG4gICAgICAgIGNvbnN0YW50cy50b3Nkck1lc3NhZ2VzLnVua25vd25cblxuICAgIHJldHVybiBiZWxgPGRpdiBjbGFzcz1cInNpdGUtaW5mbyBzaXRlLWluZm8tLW1haW5cIj5cbiAgICA8dWwgY2xhc3M9XCJkZWZhdWx0LWxpc3RcIj5cbiAgICAgICAgPGxpIGNsYXNzPVwiYm9yZGVyLS1ib3R0b20gc2l0ZS1pbmZvX19yYXRpbmctbGkgbWFpbi1yYXRpbmcganMtaGVyby1vcGVuXCI+XG4gICAgICAgICAgICAke3JhdGluZ0hlcm8odGhpcy5tb2RlbCwge1xuICAgICAgICBzaG93T3BlbjogIXRoaXMubW9kZWwuZGlzYWJsZWRcbiAgICB9KX1cbiAgICAgICAgPC9saT5cbiAgICAgICAgPGxpIGNsYXNzPVwidGV4dC0tY2VudGVyIHBhZGRlZCBib3JkZXItLWJvdHRvbSB3YXJuaW5nX2JnIGJvbGQgJHt0aGlzLm1vZGVsLmlzQnJva2VuID8gJycgOiAnaXMtaGlkZGVuJ31cIj5cbiAgICAgICAgICAgIFdlIHRlbXBvcmFyaWx5IGRpc2FibGVkIFByaXZhY3kgUHJvdGVjdGlvbiBhcyBpdCBhcHBlYXJzIHRvIGJlIGJyZWFraW5nIHRoaXMgc2l0ZS5cbiAgICAgICAgPC9saT5cbiAgICAgICAgPGxpIGNsYXNzPVwic2l0ZS1pbmZvX19saS0taHR0cHMtc3RhdHVzIHBhZGRlZCBib3JkZXItLWJvdHRvbVwiPlxuICAgICAgICAgICAgPHAgY2xhc3M9XCJzaXRlLWluZm9fX2h0dHBzLXN0YXR1cyBib2xkXCI+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJzaXRlLWluZm9fX2h0dHBzLXN0YXR1c19faWNvblxuICAgICAgICAgICAgICAgICAgICBpcy0ke3RoaXMubW9kZWwuaHR0cHNTdGF0ZX1cIj5cbiAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJ0ZXh0LWxpbmUtYWZ0ZXItaWNvblwiPlxuICAgICAgICAgICAgICAgICAgICAke3RoaXMubW9kZWwuaHR0cHNTdGF0dXNUZXh0fVxuICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgIDwvcD5cbiAgICAgICAgPC9saT5cbiAgICAgICAgPGxpIGNsYXNzPVwianMtc2l0ZS10cmFja2VyLW5ldHdvcmtzIGpzLXNpdGUtc2hvdy1wYWdlLXRyYWNrZXJzIHNpdGUtaW5mb19fbGktLXRyYWNrZXJzIHBhZGRlZCBib3JkZXItLWJvdHRvbVwiPlxuICAgICAgICAgICAgPGEgaHJlZj1cImphdmFzY3JpcHQ6dm9pZCgwKVwiIGNsYXNzPVwibGluay1zZWNvbmRhcnkgYm9sZFwiIHJvbGU9XCJidXR0b25cIj5cbiAgICAgICAgICAgICAgICAke3JlbmRlclRyYWNrZXJOZXR3b3Jrcyh0aGlzLm1vZGVsKX1cbiAgICAgICAgICAgIDwvYT5cbiAgICAgICAgPC9saT5cbiAgICAgICAgPGxpIGNsYXNzPVwianMtc2l0ZS1wcml2YWN5LXByYWN0aWNlcyBzaXRlLWluZm9fX2xpLS1wcml2YWN5LXByYWN0aWNlcyBwYWRkZWQgYm9yZGVyLS1ib3R0b21cIj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwic2l0ZS1pbmZvX19wcml2YWN5LXByYWN0aWNlc19faWNvblxuICAgICAgICAgICAgICAgIGlzLSR7dG9zZHJNc2cudG9Mb3dlckNhc2UoKX1cIj5cbiAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgIDxhIGhyZWY9XCJqYXZhc2NyaXB0OnZvaWQoMClcIiBjbGFzcz1cImxpbmstc2Vjb25kYXJ5IGJvbGRcIiByb2xlPVwiYnV0dG9uXCI+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJ0ZXh0LWxpbmUtYWZ0ZXItaWNvblwiPiAke3Rvc2RyTXNnfSBQcml2YWN5IFByYWN0aWNlcyA8L3NwYW4+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJpY29uIGljb25fX2Fycm93IHB1bGwtcmlnaHRcIj48L3NwYW4+XG4gICAgICAgICAgICA8L2E+XG4gICAgICAgIDwvbGk+XG4gICAgICAgIDxsaSBjbGFzcz1cInNpdGUtaW5mb19fbGktLXRvZ2dsZSBqcy1zaXRlLXByb3RlY3Rpb24tcm93IHBhZGRlZCAke3RoaXMubW9kZWwuaXNBbGxvd2xpc3RlZCA/ICcnIDogJ2lzLWFjdGl2ZSd9ICR7dGhpcy5tb2RlbC5pc0Jyb2tlbiA/ICdpcy1kaXNhYmxlZCcgOiAnJ31cIj5cbiAgICAgICAgICAgIDxwIGNsYXNzPVwiaXMtdHJhbnNwYXJlbnQgc2l0ZS1pbmZvX193aGl0ZWxpc3Qtc3RhdHVzIGpzLXNpdGUtd2hpdGVsaXN0LXN0YXR1c1wiPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwidGV4dC1saW5lLWFmdGVyLWljb24gcHJpdmFjeS1vbi1vZmYtbWVzc2FnZSBib2xkXCI+XG4gICAgICAgICAgICAgICAgICAgICR7c2V0VHJhbnNpdGlvblRleHQoIXRoaXMubW9kZWwuaXNXaGl0ZWxpc3RlZCl9XG4gICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgPHAgY2xhc3M9XCJzaXRlLWluZm9fX3Byb3RlY3Rpb24ganMtc2l0ZS1wcm90ZWN0aW9uIGJvbGRcIj5TaXRlIFByaXZhY3kgUHJvdGVjdGlvbjwvcD5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzaXRlLWluZm9fX3RvZ2dsZS1jb250YWluZXJcIj5cbiAgICAgICAgICAgICAgICAke3RvZ2dsZUJ1dHRvbighdGhpcy5tb2RlbC5pc0FsbG93bGlzdGVkLCAnanMtc2l0ZS10b2dnbGUgcHVsbC1yaWdodCcpfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvbGk+XG4gICAgICAgIDxsaSBjbGFzcz1cImpzLXNpdGUtbWFuYWdlLXdoaXRlbGlzdC1saSBzaXRlLWluZm9fX2xpLS1tYW5hZ2Utd2hpdGVsaXN0IHBhZGRlZCAke3RoaXMubW9kZWwuaXNCcm9rZW4gPyAnaXMtaGlkZGVuJyA6ICcnfVwiPlxuICAgICAgICAgICAgJHtyZW5kZXJNYW5hZ2VBbGxvd2xpc3QodGhpcy5tb2RlbCl9XG4gICAgICAgIDwvbGk+XG4gICAgICAgIDxsaSBjbGFzcz1cImpzLXNpdGUtY29uZmlybS1icmVha2FnZS1saSBzaXRlLWluZm9fX2xpLS1jb25maXJtLWJyZWFrYWdlIGJvcmRlci0tYm90dG9tIHBhZGRlZCBpcy1oaWRkZW5cIj5cbiAgICAgICAgICAgPGRpdiBjbGFzcz1cImpzLXNpdGUtY29uZmlybS1icmVha2FnZS1tZXNzYWdlIHNpdGUtaW5mb19fY29uZmlybS10aGFua3MgaXMtdHJhbnNwYXJlbnRcIj5cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cInNpdGUtaW5mb19fbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgICAgICBUaGFua3MgZm9yIHRoZSBmZWVkYmFjayFcbiAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJqcy1zaXRlLWNvbmZpcm0tYnJlYWthZ2Ugc2l0ZS1pbmZvLS1jb25maXJtLWJyZWFrYWdlXCI+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJzaXRlLWluZm8tLWlzLXNpdGUtYnJva2VuIGJvbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgSXMgdGhpcyB3ZWJzaXRlIGJyb2tlbj9cbiAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgICAgPGJ0biBjbGFzcz1cImpzLXNpdGUtY29uZmlybS1icmVha2FnZS15ZXMgc2l0ZS1pbmZvX19jb25maXJtLWJyZWFrYWdlLXllcyBidG4tcGlsbFwiPlxuICAgICAgICAgICAgICAgICAgICBZZXNcbiAgICAgICAgICAgICAgICA8L2J0bj5cbiAgICAgICAgICAgICAgICA8YnRuIGNsYXNzPVwianMtc2l0ZS1jb25maXJtLWJyZWFrYWdlLW5vIHNpdGUtaW5mb19fY29uZmlybS1icmVha2FnZS1ubyBidG4tcGlsbFwiPlxuICAgICAgICAgICAgICAgICAgICBOb1xuICAgICAgICAgICAgICAgIDwvYnRuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvbGk+XG4gICAgPC91bD5cbjwvZGl2PmBcblxuICAgIGZ1bmN0aW9uIHNldFRyYW5zaXRpb25UZXh0IChpc1NpdGVBbGxvd2xpc3RlZCkge1xuICAgICAgICBpc1NpdGVBbGxvd2xpc3RlZCA9IGlzU2l0ZUFsbG93bGlzdGVkIHx8IGZhbHNlXG4gICAgICAgIGxldCB0ZXh0ID0gJ0FkZGVkIHRvIFVucHJvdGVjdGVkIFNpdGVzJ1xuXG4gICAgICAgIGlmIChpc1NpdGVBbGxvd2xpc3RlZCkge1xuICAgICAgICAgICAgdGV4dCA9ICdSZW1vdmVkIGZyb20gVW5wcm90ZWN0ZWQgU2l0ZXMnXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGV4dFxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlbmRlclRyYWNrZXJOZXR3b3JrcyAobW9kZWwpIHtcbiAgICAgICAgY29uc3QgaXNBY3RpdmUgPSAhbW9kZWwuaXNBbGxvd2xpc3RlZCA/ICdpcy1hY3RpdmUnIDogJydcblxuICAgICAgICByZXR1cm4gYmVsYDxhIGhyZWY9XCJqYXZhc2NyaXB0OnZvaWQoMClcIiBjbGFzcz1cInNpdGUtaW5mb19fdHJhY2tlcnMgbGluay1zZWNvbmRhcnkgYm9sZFwiPlxuICAgIDxzcGFuIGNsYXNzPVwic2l0ZS1pbmZvX190cmFja2Vycy1zdGF0dXNfX2ljb25cbiAgICAgICAgaWNvbi0ke3RyYWNrZXJOZXR3b3Jrc0ljb24obW9kZWwuc2l0ZVJhdGluZywgbW9kZWwuaXNBbGxvd2xpc3RlZCwgbW9kZWwudG90YWxUcmFja2VyTmV0d29ya3NDb3VudCl9XCI+PC9zcGFuPlxuICAgIDxzcGFuIGNsYXNzPVwiJHtpc0FjdGl2ZX0gdGV4dC1saW5lLWFmdGVyLWljb25cIj4gJHt0cmFja2VyTmV0d29ya3NUZXh0KG1vZGVsLCBmYWxzZSl9IDwvc3Bhbj5cbiAgICA8c3BhbiBjbGFzcz1cImljb24gaWNvbl9fYXJyb3cgcHVsbC1yaWdodFwiPjwvc3Bhbj5cbjwvYT5gXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVuZGVyTWFuYWdlQWxsb3dsaXN0IChtb2RlbCkge1xuICAgICAgICByZXR1cm4gYmVsYDxkaXY+XG4gICAgPGEgaHJlZj1cImphdmFzY3JpcHQ6dm9pZCgwKVwiIGNsYXNzPVwianMtc2l0ZS1tYW5hZ2Utd2hpdGVsaXN0IHNpdGUtaW5mb19fbWFuYWdlLXdoaXRlbGlzdCBsaW5rLXNlY29uZGFyeSBib2xkXCI+XG4gICAgICAgIFVucHJvdGVjdGVkIFNpdGVzXG4gICAgPC9hPlxuICAgIDxkaXYgY2xhc3M9XCJzZXBhcmF0b3JcIj48L2Rpdj5cbiAgICA8YSBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApXCIgY2xhc3M9XCJqcy1zaXRlLXJlcG9ydC1icm9rZW4gc2l0ZS1pbmZvX19yZXBvcnQtYnJva2VuIGxpbmstc2Vjb25kYXJ5IGJvbGRcIj5cbiAgICAgICAgUmVwb3J0IGJyb2tlbiBzaXRlXG4gICAgPC9hPlxuPC9kaXY+YFxuICAgIH1cbn1cbiIsImNvbnN0IGJlbCA9IHJlcXVpcmUoJ2JlbCcpXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGNvbXBhbnlMaXN0TWFwKSB7XG4gICAgcmV0dXJuIGNvbXBhbnlMaXN0TWFwLm1hcCgoZGF0YSkgPT4ge1xuICAgICAgICByZXR1cm4gYmVsYDxsaSBjbGFzcz1cInRvcC1ibG9ja2VkX19saVwiPlxuICAgIDxkaXYgdGl0bGU9XCIke2RhdGEubmFtZX1cIiBjbGFzcz1cInRvcC1ibG9ja2VkX19saV9fY29tcGFueS1uYW1lXCI+JHtkYXRhLmRpc3BsYXlOYW1lfTwvZGl2PlxuICAgIDxkaXYgY2xhc3M9XCJ0b3AtYmxvY2tlZF9fbGlfX2Jsb2NrZXItYmFyXCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJ0b3AtYmxvY2tlZF9fbGlfX2Jsb2NrZXItYmFyX19mZ1xuICAgICAgICAgICAganMtdG9wLWJsb2NrZWQtZ3JhcGgtYmFyLWZnXCJcbiAgICAgICAgICAgIHN0eWxlPVwid2lkdGg6IDBweFwiIGRhdGEtd2lkdGg9XCIke2RhdGEucGVyY2VudH1cIj5cbiAgICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICAgPGRpdiBjbGFzcz1cInRvcC1ibG9ja2VkX19saV9fYmxvY2tlci1wY3QganMtdG9wLWJsb2NrZWQtcGN0XCI+XG4gICAgICAgICR7ZGF0YS5wZXJjZW50fSVcbiAgICA8L2Rpdj5cbjwvbGk+YFxuICAgIH0pXG59XG4iLCJjb25zdCBiZWwgPSByZXF1aXJlKCdiZWwnKVxuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi4vLi4vLi4vZGF0YS9jb25zdGFudHMnKVxuY29uc3QgZW50aXR5SWNvbk1hcHBpbmcgPSBjb25zdGFudHMuZW50aXR5SWNvbk1hcHBpbmdcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoY29tcGFueUxpc3RNYXApIHtcbiAgICByZXR1cm4gY29tcGFueUxpc3RNYXAubWFwKChkYXRhKSA9PiB7XG4gICAgICAgIHJldHVybiBiZWxgPHNwYW4gY2xhc3M9XCJ0b3AtYmxvY2tlZF9fcGlsbC1zaXRlX19pY29uICR7Z2V0U2Nzc0NsYXNzKGRhdGEubmFtZSl9XCI+PC9zcGFuPmBcbiAgICB9KVxuXG4gICAgZnVuY3Rpb24gZ2V0U2Nzc0NsYXNzIChjb21wYW55TmFtZSkge1xuICAgICAgICBjb25zdCBpY29uQ2xhc3NOYW1lID0gZW50aXR5SWNvbk1hcHBpbmdbY29tcGFueU5hbWVdIHx8ICdnZW5lcmljJ1xuICAgICAgICByZXR1cm4gaWNvbkNsYXNzTmFtZVxuICAgIH1cbn1cbiIsImNvbnN0IGJlbCA9IHJlcXVpcmUoJ2JlbCcpXG5jb25zdCBsaXN0SXRlbXMgPSByZXF1aXJlKCcuL3RvcC1ibG9ja2VkLXRydW5jYXRlZC1saXN0LWl0ZW1zLmVzNi5qcycpXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLm1vZGVsLmNvbXBhbnlMaXN0TWFwICYmIHRoaXMubW9kZWwuY29tcGFueUxpc3RNYXAubGVuZ3RoID4gMCkge1xuICAgICAgICByZXR1cm4gYmVsYDxkaXYgY2xhc3M9XCJ0b3AtYmxvY2tlZCB0b3AtYmxvY2tlZC0tdHJ1bmNhdGVkXCI+XG4gICAgPGRpdiBjbGFzcz1cInRvcC1ibG9ja2VkX19zZWUtYWxsIGpzLXRvcC1ibG9ja2VkLXNlZS1hbGxcIj5cbiAgICAgICAgPGEgaHJlZj1cImphdmFzY3JpcHQ6dm9pZCgwKVwiIGNsYXNzPVwibGluay1zZWNvbmRhcnlcIj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiaWNvbiBpY29uX19hcnJvdyBwdWxsLXJpZ2h0XCI+PC9zcGFuPlxuICAgICAgICAgICAgVG9wIFRyYWNraW5nIE9mZmVuZGVyc1xuICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJ0b3AtYmxvY2tlZF9fbGlzdCB0b3AtYmxvY2tlZF9fbGlzdC0tdHJ1bmNhdGVkIHRvcC1ibG9ja2VkX19saXN0LS1pY29uc1wiPlxuICAgICAgICAgICAgICAgICR7bGlzdEl0ZW1zKHRoaXMubW9kZWwuY29tcGFueUxpc3RNYXApfVxuICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICA8L2E+XG4gICAgPC9kaXY+XG48L2Rpdj5gXG4gICAgfVxufVxuIiwiY29uc3QgYmVsID0gcmVxdWlyZSgnYmVsJylcbmNvbnN0IGhlYWRlciA9IHJlcXVpcmUoJy4vc2hhcmVkL3NsaWRpbmctc3Vidmlldy1oZWFkZXIuZXM2LmpzJylcbmNvbnN0IGxpc3RJdGVtcyA9IHJlcXVpcmUoJy4vdG9wLWJsb2NrZWQtbGlzdC1pdGVtcy5lczYuanMnKVxuY29uc3Qgbm9EYXRhID0gcmVxdWlyZSgnLi9zaGFyZWQvdG9wLWJsb2NrZWQtbm8tZGF0YS5lczYuanMnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMubW9kZWwpIHtcbiAgICAgICAgcmV0dXJuIGJlbGA8ZGl2IGNsYXNzPVwic2xpZGluZy1zdWJ2aWV3XG4gICAgc2xpZGluZy1zdWJ2aWV3LS1oYXMtZml4ZWQtaGVhZGVyIHRvcC1ibG9ja2VkLWhlYWRlclwiPlxuICAgICR7aGVhZGVyKCdBbGwgVHJhY2tlcnMnKX1cbjwvZGl2PmBcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gYmVsYDxkaXYgY2xhc3M9XCJqcy10b3AtYmxvY2tlZC1jb250ZW50XCI+XG4gICAgJHtyZW5kZXJQY3RQYWdlc1dpdGhUcmFja2Vycyh0aGlzLm1vZGVsKX1cbiAgICAke3JlbmRlckxpc3QodGhpcy5tb2RlbCl9XG4gICAgJHtyZW5kZXJSZXNldEJ1dHRvbih0aGlzLm1vZGVsKX1cbjwvZGl2PmBcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlbmRlclBjdFBhZ2VzV2l0aFRyYWNrZXJzIChtb2RlbCkge1xuICAgIGxldCBtc2cgPSAnJ1xuICAgIGlmIChtb2RlbC5sYXN0U3RhdHNSZXNldERhdGUpIHtcbiAgICAgICAgY29uc3QgZCA9IChuZXcgRGF0ZShtb2RlbC5sYXN0U3RhdHNSZXNldERhdGUpKS50b0xvY2FsZURhdGVTdHJpbmcoJ2RlZmF1bHQnLCB7IG1vbnRoOiAnbG9uZycsIGRheTogJ251bWVyaWMnLCB5ZWFyOiAnbnVtZXJpYycgfSlcbiAgICAgICAgaWYgKGQpIG1zZyA9IGAgc2luY2UgJHtkfWBcbiAgICB9XG4gICAgaWYgKG1vZGVsLnBjdFBhZ2VzV2l0aFRyYWNrZXJzKSB7XG4gICAgICAgIHJldHVybiBiZWxgPHAgY2xhc3M9XCJ0b3AtYmxvY2tlZF9fcGN0IGNhcmRcIj5cbiAgICBUcmFja2VycyB3ZXJlIGZvdW5kIG9uIDxiPiR7bW9kZWwucGN0UGFnZXNXaXRoVHJhY2tlcnN9JTwvYj5cbiAgICBvZiB3ZWJzaXRlcyB5b3UndmUgdmlzaXRlZCR7bXNnfS5cbjwvcD5gXG4gICAgfVxufVxuXG5mdW5jdGlvbiByZW5kZXJMaXN0IChtb2RlbCkge1xuICAgIGlmIChtb2RlbC5jb21wYW55TGlzdE1hcC5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldHVybiBiZWxgPG9sIGFyaWEtbGFiZWw9XCJMaXN0IG9mIFRyYWNrZXJzIEZvdW5kXCIgY2xhc3M9XCJkZWZhdWx0LWxpc3QgdG9wLWJsb2NrZWRfX2xpc3QgY2FyZCBib3JkZXItLWJvdHRvbVwiPlxuICAgICR7bGlzdEl0ZW1zKG1vZGVsLmNvbXBhbnlMaXN0TWFwKX1cbjwvb2w+YFxuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBiZWxgPG9sIGNsYXNzPVwiZGVmYXVsdC1saXN0IHRvcC1ibG9ja2VkX19saXN0XCI+XG4gICAgPGxpIGNsYXNzPVwidG9wLWJsb2NrZWRfX2xpIHRvcC1ibG9ja2VkX19saS0tbm8tZGF0YVwiPlxuICAgICAgICAke25vRGF0YSgpfVxuICAgIDwvbGk+XG48L29sPmBcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlbmRlclJlc2V0QnV0dG9uIChtb2RlbCkge1xuICAgIGlmIChtb2RlbC5jb21wYW55TGlzdE1hcC5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldHVybiBiZWxgPGRpdiBjbGFzcz1cInRvcC1ibG9ja2VkX19yZXNldC1zdGF0c1wiPlxuICAgIDxidXR0b24gY2xhc3M9XCJ0b3AtYmxvY2tlZF9fcmVzZXQtc3RhdHNfX2J1dHRvbiBibG9ja1xuICAgICAgICBqcy1yZXNldC10cmFja2Vycy1kYXRhXCI+XG4gICAgICAgIFJlc2V0IGdsb2JhbCBzdGF0c1xuICAgIDwvYnV0dG9uPlxuICAgIDxwPlRoZXNlIHN0YXRzIGFyZSBvbmx5IHN0b3JlZCBsb2NhbGx5IG9uIHlvdXIgZGV2aWNlLFxuICAgIGFuZCBhcmUgbm90IHNlbnQgYW55d2hlcmUsIGV2ZXIuPC9wPlxuPC9kaXY+YFxuICAgIH1cbn1cbiIsImNvbnN0IGJlbCA9IHJlcXVpcmUoJ2JlbCcpXG5jb25zdCBoZXJvID0gcmVxdWlyZSgnLi9zaGFyZWQvaGVyby5lczYuanMnKVxuY29uc3QgdHJhY2tlck5ldHdvcmtzSWNvbiA9IHJlcXVpcmUoJy4vc2hhcmVkL3RyYWNrZXItbmV0d29yay1pY29uLmVzNi5qcycpXG5jb25zdCB0cmFja2VyTmV0d29ya3NUZXh0ID0gcmVxdWlyZSgnLi9zaGFyZWQvdHJhY2tlci1uZXR3b3Jrcy10ZXh0LmVzNi5qcycpXG5jb25zdCBkaXNwbGF5Q2F0ZWdvcmllcyA9IHJlcXVpcmUoJy4vLi4vLi4vLi4vZGF0YS9jb25zdGFudHMuanMnKS5kaXNwbGF5Q2F0ZWdvcmllc1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMubW9kZWwpIHtcbiAgICAgICAgcmV0dXJuIGJlbGA8c2VjdGlvbiBjbGFzcz1cInNsaWRpbmctc3Vidmlld1xuICAgIHNsaWRpbmctc3Vidmlldy0taGFzLWZpeGVkLWhlYWRlclwiPlxuPC9zZWN0aW9uPmBcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gYmVsYDxkaXYgY2xhc3M9XCJ0cmFja2VyLW5ldHdvcmtzIHNpdGUtaW5mbyBzaXRlLWluZm8tLWZ1bGwtaGVpZ2h0IGNhcmRcIj5cbiAgICA8ZGl2IGNsYXNzPVwianMtdHJhY2tlci1uZXR3b3Jrcy1oZXJvXCI+XG4gICAgICAgICR7cmVuZGVySGVybyh0aGlzLm1vZGVsLnNpdGUpfVxuICAgIDwvZGl2PlxuICAgIDxkaXYgY2xhc3M9XCJ0cmFja2VyLW5ldHdvcmtzX19leHBsYWluZXIgYm9yZGVyLS1ib3R0b20tLWlubmVyXG4gICAgICAgIHRleHQtLWNlbnRlclwiPlxuICAgICAgICBUcmFja2VyIG5ldHdvcmtzIGFnZ3JlZ2F0ZSB5b3VyIHdlYiBoaXN0b3J5IGludG8gYSBkYXRhIHByb2ZpbGUgYWJvdXQgeW91LlxuICAgICAgICBNYWpvciB0cmFja2VyIG5ldHdvcmtzIGFyZSBtb3JlIGhhcm1mdWwgYmVjYXVzZSB0aGV5IGNhbiB0cmFjayBhbmQgdGFyZ2V0IHlvdSBhY3Jvc3MgbW9yZSBvZiB0aGUgSW50ZXJuZXQuXG4gICAgPC9kaXY+XG4gICAgPGRpdiBjbGFzcz1cInRyYWNrZXItbmV0d29ya3NfX2RldGFpbHMgcGFkZGVkXG4gICAgICAgIGpzLXRyYWNrZXItbmV0d29ya3MtZGV0YWlsc1wiPlxuICAgICAgICA8b2wgY2xhc3M9XCJkZWZhdWx0LWxpc3Qgc2l0ZS1pbmZvX190cmFja2Vyc19fY29tcGFueS1saXN0XCIgYXJpYS1sYWJlbD1cIkxpc3Qgb2YgdHJhY2tlciBuZXR3b3Jrc1wiPlxuICAgICAgICAgICAgJHtyZW5kZXJUcmFja2VyRGV0YWlscyhcbiAgICAgICAgdGhpcy5tb2RlbCxcbiAgICAgICAgdGhpcy5tb2RlbC5ET01BSU5fTUFQUElOR1NcbiAgICApfVxuICAgICAgICA8L29sPlxuICAgIDwvZGl2PlxuPC9kaXY+YFxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVuZGVySGVybyAoc2l0ZSkge1xuICAgIHNpdGUgPSBzaXRlIHx8IHt9XG5cbiAgICByZXR1cm4gYmVsYCR7aGVybyh7XG4gICAgICAgIHN0YXR1czogdHJhY2tlck5ldHdvcmtzSWNvbihzaXRlLnNpdGVSYXRpbmcsIHNpdGUuaXNBbGxvd2xpc3RlZCwgc2l0ZS50b3RhbFRyYWNrZXJOZXR3b3Jrc0NvdW50KSxcbiAgICAgICAgdGl0bGU6IHNpdGUuZG9tYWluLFxuICAgICAgICBzdWJ0aXRsZTogYCR7dHJhY2tlck5ldHdvcmtzVGV4dChzaXRlLCBmYWxzZSl9YCxcbiAgICAgICAgc2hvd0Nsb3NlOiB0cnVlXG4gICAgfSl9YFxufVxuXG5mdW5jdGlvbiByZW5kZXJUcmFja2VyRGV0YWlscyAobW9kZWwpIHtcbiAgICBjb25zdCBjb21wYW55TGlzdE1hcCA9IG1vZGVsLmNvbXBhbnlMaXN0TWFwIHx8IHt9XG4gICAgaWYgKGNvbXBhbnlMaXN0TWFwLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gYmVsYDxsaSBjbGFzcz1cImlzLWVtcHR5XCI+PC9saT5gXG4gICAgfVxuICAgIGlmIChjb21wYW55TGlzdE1hcCAmJiBjb21wYW55TGlzdE1hcC5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldHVybiBjb21wYW55TGlzdE1hcC5tYXAoKGMsIGkpID0+IHtcbiAgICAgICAgICAgIGxldCBib3JkZXJDbGFzcyA9ICcnXG4gICAgICAgICAgICBpZiAoYy5uYW1lICYmIGMubmFtZSA9PT0gJ3Vua25vd24nKSB7XG4gICAgICAgICAgICAgICAgYy5uYW1lID0gJyhUcmFja2VyIG5ldHdvcmsgdW5rbm93biknXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGMubmFtZSAmJiBtb2RlbC5oYXNVbmJsb2NrZWRUcmFja2VycyhjLCBjLnVybHNMaXN0KSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFkZGl0aW9uYWxUZXh0ID0gJyBhc3NvY2lhdGVkIGRvbWFpbnMnXG4gICAgICAgICAgICAgICAgY29uc3QgZG9tYWluID0gbW9kZWwuc2l0ZSA/IG1vZGVsLnNpdGUuZG9tYWluIDogYy5kaXNwbGF5TmFtZVxuICAgICAgICAgICAgICAgIGMuZGlzcGxheU5hbWUgPSBtb2RlbC5zaXRlLmlzQWxsb3dsaXN0ZWQgPyBkb21haW4gKyBhZGRpdGlvbmFsVGV4dCA6IGRvbWFpbiArIGFkZGl0aW9uYWxUZXh0ICsgJyAobm90IGJsb2NrZWQpJ1xuICAgICAgICAgICAgICAgIGJvcmRlckNsYXNzID0gY29tcGFueUxpc3RNYXAubGVuZ3RoID4gMSA/ICdib3JkZXItLXRvcCBwYWRkZWQtLXRvcCcgOiAnJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGJlbGA8bGkgY2xhc3M9XCIke2JvcmRlckNsYXNzfVwiPlxuICAgIDxkaXYgY2xhc3M9XCJzaXRlLWluZm9fX3RyYWNrZXJfX3dyYXBwZXIgJHtjLm5vcm1hbGl6ZWROYW1lfSBmbG9hdC1yaWdodFwiPlxuICAgICAgICA8c3BhbiBjbGFzcz1cInNpdGUtaW5mb19fdHJhY2tlcl9faWNvbiAke2Mubm9ybWFsaXplZE5hbWV9XCI+XG4gICAgICAgIDwvc3Bhbj5cbiAgICA8L2Rpdj5cbiAgICA8aDEgdGl0bGU9XCIke2MubmFtZX1cIiBjbGFzcz1cInNpdGUtaW5mb19fZG9tYWluIGJsb2NrXCI+JHtjLmRpc3BsYXlOYW1lfTwvaDE+XG4gICAgPG9sIGNsYXNzPVwiZGVmYXVsdC1saXN0IHNpdGUtaW5mb19fdHJhY2tlcnNfX2NvbXBhbnktbGlzdF9fdXJsLWxpc3RcIiBhcmlhLWxhYmVsPVwiVHJhY2tlciBkb21haW5zIGZvciAke2MubmFtZX1cIj5cbiAgICAgICAgJHtjLnVybHNMaXN0Lm1hcCgodXJsKSA9PiB7XG4gICAgICAgIC8vIGZpbmQgZmlyc3QgbWF0Y2hpZ24gY2F0ZWdvcnkgZnJvbSBvdXIgbGlzdCBvZiBhbGxvd2VkIGRpc3BsYXkgY2F0ZWdvcmllc1xuICAgICAgICBsZXQgY2F0ZWdvcnkgPSAnJ1xuICAgICAgICBpZiAoYy51cmxzW3VybF0gJiYgYy51cmxzW3VybF0uY2F0ZWdvcmllcykge1xuICAgICAgICAgICAgZGlzcGxheUNhdGVnb3JpZXMuc29tZShkaXNwbGF5Q2F0ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBtYXRjaCA9IGMudXJsc1t1cmxdLmNhdGVnb3JpZXMuZmluZChjYXQgPT4gY2F0ID09PSBkaXNwbGF5Q2F0KVxuICAgICAgICAgICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeSA9IG1hdGNoXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYmVsYDxsaT5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidXJsXCI+JHt1cmx9PC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNhdGVnb3J5XCI+JHtjYXRlZ29yeX08L2Rpdj5cbiAgICAgICAgICAgIDwvbGk+YFxuICAgIH0pfVxuICAgIDwvb2w+XG48L2xpPmBcbiAgICAgICAgfSlcbiAgICB9XG59XG4iLCJjb25zdCBQYXJlbnQgPSB3aW5kb3cuRERHLmJhc2UuVmlld1xuXG5mdW5jdGlvbiBBdXRvY29tcGxldGUgKG9wcykge1xuICAgIHRoaXMubW9kZWwgPSBvcHMubW9kZWxcbiAgICB0aGlzLnBhZ2VWaWV3ID0gb3BzLnBhZ2VWaWV3XG4gICAgdGhpcy50ZW1wbGF0ZSA9IG9wcy50ZW1wbGF0ZVxuICAgIFBhcmVudC5jYWxsKHRoaXMsIG9wcylcblxuICAgIHRoaXMuYmluZEV2ZW50cyhbXG4gICAgICAgIFt0aGlzLnN0b3JlLnN1YnNjcmliZSwgJ2NoYW5nZTpzZWFyY2gnLCB0aGlzLl9oYW5kbGVTZWFyY2hUZXh0XVxuICAgIF0pXG59XG5cbkF1dG9jb21wbGV0ZS5wcm90b3R5cGUgPSB3aW5kb3cuJC5leHRlbmQoe30sXG4gICAgUGFyZW50LnByb3RvdHlwZSxcbiAgICB7XG5cbiAgICAgICAgX2hhbmRsZVNlYXJjaFRleHQ6IGZ1bmN0aW9uIChub3RpZmljYXRpb24pIHtcbiAgICAgICAgICAgIGlmIChub3RpZmljYXRpb24uY2hhbmdlICYmIG5vdGlmaWNhdGlvbi5jaGFuZ2UuYXR0cmlidXRlID09PSAnc2VhcmNoVGV4dCcpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW5vdGlmaWNhdGlvbi5jaGFuZ2UudmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2RlbC5zdWdnZXN0aW9ucyA9IFtdXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3JlcmVuZGVyKClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhpcy5tb2RlbC5mZXRjaFN1Z2dlc3Rpb25zKG5vdGlmaWNhdGlvbi5jaGFuZ2UudmFsdWUpXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKCgpID0+IHRoaXMuX3JlcmVuZGVyKCkpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4pXG5cbm1vZHVsZS5leHBvcnRzID0gQXV0b2NvbXBsZXRlXG4iLCJjb25zdCBQYXJlbnQgPSB3aW5kb3cuRERHLmJhc2UuVmlld1xuXG5mdW5jdGlvbiBCcmVha2FnZUZvcm0gKG9wcykge1xuICAgIHRoaXMubW9kZWwgPSBvcHMubW9kZWxcbiAgICB0aGlzLnRlbXBsYXRlID0gb3BzLnRlbXBsYXRlXG4gICAgdGhpcy5zaXRlVmlldyA9IG9wcy5zaXRlVmlld1xuICAgIHRoaXMuY2xpY2tTb3VyY2UgPSBvcHMuY2xpY2tTb3VyY2VcbiAgICB0aGlzLiRyb290ID0gd2luZG93LiQoJy5qcy1icmVha2FnZS1mb3JtJylcbiAgICBQYXJlbnQuY2FsbCh0aGlzLCBvcHMpXG5cbiAgICB0aGlzLl9zZXR1cCgpXG59XG5cbkJyZWFrYWdlRm9ybS5wcm90b3R5cGUgPSB3aW5kb3cuJC5leHRlbmQoe30sXG4gICAgUGFyZW50LnByb3RvdHlwZSxcbiAgICB7XG4gICAgICAgIF9zZXR1cDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5fY2FjaGVFbGVtcygnLmpzLWJyZWFrYWdlLWZvcm0nLCBbXG4gICAgICAgICAgICAgICAgJ2Nsb3NlJyxcbiAgICAgICAgICAgICAgICAnc3VibWl0JyxcbiAgICAgICAgICAgICAgICAnZWxlbWVudCcsXG4gICAgICAgICAgICAgICAgJ21lc3NhZ2UnLFxuICAgICAgICAgICAgICAgICdkcm9wZG93bidcbiAgICAgICAgICAgIF0pXG4gICAgICAgICAgICB0aGlzLmJpbmRFdmVudHMoW1xuICAgICAgICAgICAgICAgIFt0aGlzLiRjbG9zZSwgJ2NsaWNrJywgdGhpcy5fY2xvc2VGb3JtXSxcbiAgICAgICAgICAgICAgICBbdGhpcy4kc3VibWl0LCAnY2xpY2snLCB0aGlzLl9zdWJtaXRGb3JtXSxcbiAgICAgICAgICAgICAgICBbdGhpcy4kZHJvcGRvd24sICdjaGFuZ2UnLCB0aGlzLl9zZWxlY3RDYXRlZ29yeV1cbiAgICAgICAgICAgIF0pXG4gICAgICAgIH0sXG5cbiAgICAgICAgX2Nsb3NlRm9ybTogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGlmIChlKSBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICAgIC8vIHJlbG9hZCBwYWdlIGFmdGVyIGNsb3NpbmcgZm9ybSBpZiB1c2VyIGdvdCB0byBmb3JtIGZyb21cbiAgICAgICAgICAgIC8vIHRvZ2dsaW5nIHByaXZhY3kgcHJvdGVjdGlvbi4gb3RoZXJ3aXNlIGRlc3Ryb3kgdmlldy5cbiAgICAgICAgICAgIGlmICh0aGlzLmNsaWNrU291cmNlID09PSAndG9nZ2xlJykge1xuICAgICAgICAgICAgICAgIHRoaXMuc2l0ZVZpZXcuY2xvc2VQb3B1cEFuZFJlbG9hZCg1MDApXG4gICAgICAgICAgICAgICAgdGhpcy5kZXN0cm95KClcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kZXN0cm95KClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBfc3VibWl0Rm9ybTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuJHN1Ym1pdC5oYXNDbGFzcygnYnRuLWRpc2FibGVkJykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSB0aGlzLiRkcm9wZG93bi52YWwoKVxuICAgICAgICAgICAgdGhpcy5tb2RlbC5zdWJtaXRCcmVha2FnZUZvcm0oY2F0ZWdvcnkpXG4gICAgICAgICAgICB0aGlzLl9zaG93VGhhbmtZb3VNZXNzYWdlKClcbiAgICAgICAgfSxcblxuICAgICAgICBfc2hvd1RoYW5rWW91TWVzc2FnZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcygnaXMtdHJhbnNwYXJlbnQnKVxuICAgICAgICAgICAgdGhpcy4kbWVzc2FnZS5yZW1vdmVDbGFzcygnaXMtdHJhbnNwYXJlbnQnKVxuICAgICAgICAgICAgLy8gcmVsb2FkIHBhZ2UgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uIGlmIHVzZXIgZ290IHRvIGZvcm0gZnJvbVxuICAgICAgICAgICAgLy8gdG9nZ2xpbmcgcHJpdmFjeSBwcm90ZWN0aW9uLCBvdGhlcndpc2UgZGVzdHJveSB2aWV3LlxuICAgICAgICAgICAgaWYgKHRoaXMuY2xpY2tTb3VyY2UgPT09ICd0b2dnbGUnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zaXRlVmlldy5jbG9zZVBvcHVwQW5kUmVsb2FkKDM1MDApXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgX3NlbGVjdENhdGVnb3J5OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIH1cbiAgICB9XG4pXG5cbm1vZHVsZS5leHBvcnRzID0gQnJlYWthZ2VGb3JtXG4iLCJjb25zdCB7IGZvcm1hdEFkZHJlc3MgfSA9IHJlcXVpcmUoJy4uLy4uL2JhY2tncm91bmQvZW1haWwtdXRpbHMuZXM2JylcblxuY29uc3QgUGFyZW50ID0gd2luZG93LkRERy5iYXNlLlZpZXdcblxuZnVuY3Rpb24gRW1haWxBbGlhc1ZpZXcgKG9wcykge1xuICAgIHRoaXMubW9kZWwgPSBvcHMubW9kZWxcbiAgICB0aGlzLnBhZ2VWaWV3ID0gb3BzLnBhZ2VWaWV3XG4gICAgdGhpcy50ZW1wbGF0ZSA9IG9wcy50ZW1wbGF0ZVxuXG4gICAgdGhpcy5tb2RlbC5nZXRVc2VyRGF0YSgpLnRoZW4odXNlckRhdGEgPT4ge1xuICAgICAgICB0aGlzLm1vZGVsLnNldCgndXNlckRhdGEnLCB1c2VyRGF0YSlcbiAgICAgICAgUGFyZW50LmNhbGwodGhpcywgb3BzKVxuICAgICAgICB0aGlzLl9zZXR1cCgpXG4gICAgfSlcbn1cblxuRW1haWxBbGlhc1ZpZXcucHJvdG90eXBlID0gd2luZG93LiQuZXh0ZW5kKHt9LFxuICAgIFBhcmVudC5wcm90b3R5cGUsXG4gICAge1xuICAgICAgICBfY29weUFsaWFzVG9DbGlwYm9hcmQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbnN0IGFsaWFzID0gdGhpcy5tb2RlbC51c2VyRGF0YS5uZXh0QWxpYXNcbiAgICAgICAgICAgIG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGZvcm1hdEFkZHJlc3MoYWxpYXMpKVxuICAgICAgICAgICAgdGhpcy4kZWwuYWRkQ2xhc3MoJ3Nob3ctY29waWVkLWxhYmVsJylcbiAgICAgICAgICAgIHRoaXMuJGVsLm9uZSgnYW5pbWF0aW9uZW5kJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuJGVsLnJlbW92ZUNsYXNzKCdzaG93LWNvcGllZC1sYWJlbCcpXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICB0aGlzLm1vZGVsLmZldGNoKHsgcmVmcmVzaEFsaWFzOiB0cnVlIH0pLnRoZW4oKHsgcHJpdmF0ZUFkZHJlc3MgfSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMubW9kZWwudXNlckRhdGEubmV4dEFsaWFzID0gcHJpdmF0ZUFkZHJlc3NcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0sXG5cbiAgICAgICAgX3NldHVwOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmJpbmRFdmVudHMoW1xuICAgICAgICAgICAgICAgIFt0aGlzLiRlbCwgJ2NsaWNrJywgdGhpcy5fY29weUFsaWFzVG9DbGlwYm9hcmRdXG4gICAgICAgICAgICBdKVxuICAgICAgICB9XG4gICAgfVxuKVxuXG5tb2R1bGUuZXhwb3J0cyA9IEVtYWlsQWxpYXNWaWV3XG4iLCJjb25zdCBQYXJlbnQgPSByZXF1aXJlKCcuL3NsaWRpbmctc3Vidmlldy5lczYuanMnKVxuY29uc3QgcmF0aW5nSGVyb1RlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3NoYXJlZC9yYXRpbmctaGVyby5lczYuanMnKVxuY29uc3QgZ3JhZGVzVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc2hhcmVkL2dyYWRlLXNjb3JlY2FyZC1ncmFkZXMuZXM2LmpzJylcbmNvbnN0IHJlYXNvbnNUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zaGFyZWQvZ3JhZGUtc2NvcmVjYXJkLXJlYXNvbnMuZXM2LmpzJylcblxuZnVuY3Rpb24gR3JhZGVTY29yZWNhcmQgKG9wcykge1xuICAgIHRoaXMubW9kZWwgPSBvcHMubW9kZWxcbiAgICB0aGlzLnRlbXBsYXRlID0gb3BzLnRlbXBsYXRlXG5cbiAgICBQYXJlbnQuY2FsbCh0aGlzLCBvcHMpXG5cbiAgICB0aGlzLl9zZXR1cCgpXG5cbiAgICB0aGlzLmJpbmRFdmVudHMoW1tcbiAgICAgICAgdGhpcy5zdG9yZS5zdWJzY3JpYmUsXG4gICAgICAgICdjaGFuZ2U6c2l0ZScsXG4gICAgICAgIHRoaXMuX29uU2l0ZUNoYW5nZVxuICAgIF1dKVxuXG4gICAgdGhpcy5zZXR1cENsb3NlKClcbn1cblxuR3JhZGVTY29yZWNhcmQucHJvdG90eXBlID0gd2luZG93LiQuZXh0ZW5kKHt9LFxuICAgIFBhcmVudC5wcm90b3R5cGUsXG4gICAge1xuICAgICAgICBfc2V0dXA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuX2NhY2hlRWxlbXMoJy5qcy1ncmFkZS1zY29yZWNhcmQnLCBbXG4gICAgICAgICAgICAgICAgJ3JlYXNvbnMnLFxuICAgICAgICAgICAgICAgICdncmFkZXMnXG4gICAgICAgICAgICBdKVxuICAgICAgICAgICAgdGhpcy4kaGVybyA9IHRoaXMuJCgnLmpzLXJhdGluZy1oZXJvJylcbiAgICAgICAgfSxcblxuICAgICAgICBfcmVyZW5kZXJIZXJvOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLiRoZXJvLnJlcGxhY2VXaXRoKHJhdGluZ0hlcm9UZW1wbGF0ZShcbiAgICAgICAgICAgICAgICB0aGlzLm1vZGVsLFxuICAgICAgICAgICAgICAgIHsgc2hvd0Nsb3NlOiB0cnVlIH1cbiAgICAgICAgICAgICkpXG4gICAgICAgIH0sXG5cbiAgICAgICAgX3JlcmVuZGVyR3JhZGVzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLiRncmFkZXMucmVwbGFjZVdpdGgoZ3JhZGVzVGVtcGxhdGUodGhpcy5tb2RlbCkpXG4gICAgICAgIH0sXG5cbiAgICAgICAgX3JlcmVuZGVyUmVhc29uczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy4kcmVhc29ucy5yZXBsYWNlV2l0aChyZWFzb25zVGVtcGxhdGUodGhpcy5tb2RlbCkpXG4gICAgICAgIH0sXG5cbiAgICAgICAgX29uU2l0ZUNoYW5nZTogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGlmIChlLmNoYW5nZS5hdHRyaWJ1dGUgPT09ICdzaXRlUmF0aW5nJykge1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlcmVuZGVySGVybygpXG4gICAgICAgICAgICAgICAgdGhpcy5fcmVyZW5kZXJHcmFkZXMoKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBhbGwgdGhlIG90aGVyIHN0dWZmIHdlIHVzZSBpbiB0aGUgcmVhc29uc1xuICAgICAgICAgICAgLy8gKGUuZy4gaHR0cHMsIHRvc2RyKVxuICAgICAgICAgICAgLy8gZG9lc24ndCBjaGFuZ2UgZHluYW1pY2FsbHlcbiAgICAgICAgICAgIGlmIChlLmNoYW5nZS5hdHRyaWJ1dGUgPT09ICd0cmFja2VyTmV0d29ya3MnIHx8XG4gICAgICAgICAgICAgICAgICAgIGUuY2hhbmdlLmF0dHJpYnV0ZSA9PT0gJ2lzYU1ham9yVHJhY2tpbmdOZXR3b3JrJykge1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlcmVuZGVyUmVhc29ucygpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHJlY2FjaGUgYW55IHNlbGVjdG9ycyB0aGF0IHdlcmUgcmVyZW5kZXJlZFxuICAgICAgICAgICAgdGhpcy5fc2V0dXAoKVxuICAgICAgICAgICAgdGhpcy5zZXR1cENsb3NlKClcbiAgICAgICAgfVxuICAgIH1cbilcblxubW9kdWxlLmV4cG9ydHMgPSBHcmFkZVNjb3JlY2FyZFxuIiwiY29uc3QgUGFyZW50ID0gd2luZG93LkRERy5iYXNlLlZpZXdcbmNvbnN0IG9wZW5PcHRpb25zUGFnZSA9IHJlcXVpcmUoJy4vbWl4aW5zL29wZW4tb3B0aW9ucy1wYWdlLmVzNi5qcycpXG5jb25zdCBicm93c2VyVUlXcmFwcGVyID0gcmVxdWlyZSgnLi8uLi9iYXNlL3VpLXdyYXBwZXIuZXM2LmpzJylcbmNvbnN0IHsgSVNfQkVUQSB9ID0gcmVxdWlyZSgnLi4vLi4vYmFja2dyb3VuZC9jaGFubmVsLmVzNi5qcycpXG5cbmZ1bmN0aW9uIEhhbWJ1cmdlck1lbnUgKG9wcykge1xuICAgIHRoaXMubW9kZWwgPSBvcHMubW9kZWxcbiAgICB0aGlzLnRlbXBsYXRlID0gb3BzLnRlbXBsYXRlXG4gICAgdGhpcy5wYWdlVmlldyA9IG9wcy5wYWdlVmlld1xuICAgIFBhcmVudC5jYWxsKHRoaXMsIG9wcylcblxuICAgIHRoaXMuX3NldHVwKClcbn1cblxuSGFtYnVyZ2VyTWVudS5wcm90b3R5cGUgPSB3aW5kb3cuJC5leHRlbmQoe30sXG4gICAgUGFyZW50LnByb3RvdHlwZSxcbiAgICBvcGVuT3B0aW9uc1BhZ2UsXG4gICAge1xuXG4gICAgICAgIF9zZXR1cDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5fY2FjaGVFbGVtcygnLmpzLWhhbWJ1cmdlci1tZW51JywgW1xuICAgICAgICAgICAgICAgICdjbG9zZScsXG4gICAgICAgICAgICAgICAgJ29wdGlvbnMtbGluaycsXG4gICAgICAgICAgICAgICAgJ2ZlZWRiYWNrLWxpbmsnLFxuICAgICAgICAgICAgICAgICdicm9rZW4tc2l0ZS1saW5rJyxcbiAgICAgICAgICAgICAgICAnZGVidWdnZXItcGFuZWwtbGluaydcbiAgICAgICAgICAgIF0pXG4gICAgICAgICAgICB0aGlzLmJpbmRFdmVudHMoW1xuICAgICAgICAgICAgICAgIFt0aGlzLiRjbG9zZSwgJ2NsaWNrJywgdGhpcy5fY2xvc2VNZW51XSxcbiAgICAgICAgICAgICAgICBbdGhpcy4kb3B0aW9uc2xpbmssICdjbGljaycsIHRoaXMub3Blbk9wdGlvbnNQYWdlXSxcbiAgICAgICAgICAgICAgICBbdGhpcy4kZmVlZGJhY2tsaW5rLCAnY2xpY2snLCB0aGlzLl9oYW5kbGVGZWVkYmFja0NsaWNrXSxcbiAgICAgICAgICAgICAgICBbdGhpcy4kYnJva2Vuc2l0ZWxpbmssICdjbGljaycsIHRoaXMuX2hhbmRsZUJyb2tlblNpdGVDbGlja10sXG4gICAgICAgICAgICAgICAgW3RoaXMubW9kZWwuc3RvcmUuc3Vic2NyaWJlLCAnYWN0aW9uOnNlYXJjaCcsIHRoaXMuX2hhbmRsZUFjdGlvbl0sXG4gICAgICAgICAgICAgICAgW3RoaXMubW9kZWwuc3RvcmUuc3Vic2NyaWJlLCAnY2hhbmdlOnNpdGUnLCB0aGlzLl9oYW5kbGVTaXRlVXBkYXRlXSxcbiAgICAgICAgICAgICAgICBbdGhpcy4kZGVidWdnZXJwYW5lbGxpbmssICdjbGljaycsIHRoaXMuX2hhbmRsZURlYnVnZ2VyQ2xpY2tdXG4gICAgICAgICAgICBdKVxuICAgICAgICAgICAgaWYgKElTX0JFVEEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLiQoJyNkZWJ1Z2dlci1wYW5lbCcpLnJlbW92ZUNsYXNzKCdpcy1oaWRkZW4nKVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIF9oYW5kbGVBY3Rpb246IGZ1bmN0aW9uIChub3RpZmljYXRpb24pIHtcbiAgICAgICAgICAgIGlmIChub3RpZmljYXRpb24uYWN0aW9uID09PSAnYnVyZ2VyQ2xpY2snKSB0aGlzLl9vcGVuTWVudSgpXG4gICAgICAgIH0sXG5cbiAgICAgICAgX29wZW5NZW51OiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgdGhpcy4kZWwucmVtb3ZlQ2xhc3MoJ2lzLWhpZGRlbicpXG4gICAgICAgIH0sXG5cbiAgICAgICAgX2Nsb3NlTWVudTogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGlmIChlKSBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICAgIHRoaXMuJGVsLmFkZENsYXNzKCdpcy1oaWRkZW4nKVxuICAgICAgICB9LFxuXG4gICAgICAgIF9oYW5kbGVGZWVkYmFja0NsaWNrOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICAgICAgICAgIGJyb3dzZXJVSVdyYXBwZXIub3BlbkV4dGVuc2lvblBhZ2UoJy9odG1sL2ZlZWRiYWNrLmh0bWwnKVxuICAgICAgICB9LFxuXG4gICAgICAgIF9oYW5kbGVCcm9rZW5TaXRlQ2xpY2s6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICAgIHRoaXMuJGVsLmFkZENsYXNzKCdpcy1oaWRkZW4nKVxuICAgICAgICAgICAgdGhpcy5wYWdlVmlldy52aWV3cy5zaXRlLnNob3dCcmVha2FnZUZvcm0oJ3JlcG9ydEJyb2tlblNpdGUnKVxuICAgICAgICB9LFxuXG4gICAgICAgIF9oYW5kbGVTaXRlVXBkYXRlOiBmdW5jdGlvbiAobm90aWZpY2F0aW9uKSB7XG4gICAgICAgICAgICBpZiAobm90aWZpY2F0aW9uICYmIG5vdGlmaWNhdGlvbi5jaGFuZ2UuYXR0cmlidXRlID09PSAndGFiJykge1xuICAgICAgICAgICAgICAgIHRoaXMubW9kZWwudGFiVXJsID0gbm90aWZpY2F0aW9uLmNoYW5nZS52YWx1ZS51cmxcbiAgICAgICAgICAgICAgICB0aGlzLl9yZXJlbmRlcigpXG4gICAgICAgICAgICAgICAgdGhpcy5fc2V0dXAoKVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIF9oYW5kbGVEZWJ1Z2dlckNsaWNrOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgICBjaHJvbWUudGFicy5xdWVyeSh7IGFjdGl2ZTogdHJ1ZSwgY3VycmVudFdpbmRvdzogdHJ1ZSB9LCAodGFicykgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRhYklkID0gdGFicy5sZW5ndGggPiAwID8gdGFic1swXS5pZCA6ICcnXG4gICAgICAgICAgICAgICAgY2hyb21lLnRhYnMuY3JlYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBjaHJvbWUucnVudGltZS5nZXRVUkwoYC9odG1sL2RldnRvb2xzLXBhbmVsLmh0bWw/dGFiSWQ9JHt0YWJJZH1gKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgfVxuKVxuXG5tb2R1bGUuZXhwb3J0cyA9IEhhbWJ1cmdlck1lbnVcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGFuaW1hdGVHcmFwaEJhcnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXNcblxuICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoIXNlbGYuJGdyYXBoYmFyZmcpIHJldHVyblxuICAgICAgICAgICAgc2VsZi4kZ3JhcGhiYXJmZy5lYWNoKGZ1bmN0aW9uIChpLCBlbCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRlbCA9IHdpbmRvdy4kKGVsKVxuICAgICAgICAgICAgICAgIGNvbnN0IHcgPSAkZWwuZGF0YSgpLndpZHRoXG4gICAgICAgICAgICAgICAgJGVsLmNzcygnd2lkdGgnLCB3ICsgJyUnKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSwgMjUwKVxuXG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICghc2VsZi4kcGN0KSByZXR1cm5cbiAgICAgICAgICAgIHNlbGYuJHBjdC5lYWNoKGZ1bmN0aW9uIChpLCBlbCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRlbCA9IHdpbmRvdy4kKGVsKVxuICAgICAgICAgICAgICAgICRlbC5jc3MoJ2NvbG9yJywgJyMzMzMzMzMnKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSwgNzAwKVxuICAgIH1cbn1cbiIsImNvbnN0IGJyb3dzZXJVSVdyYXBwZXIgPSByZXF1aXJlKCcuLy4uLy4uL2Jhc2UvdWktd3JhcHBlci5lczYuanMnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBvcGVuT3B0aW9uc1BhZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5tb2RlbC5mZXRjaCh7IGdldEJyb3dzZXI6IHRydWUgfSkudGhlbihicm93c2VyID0+IHtcbiAgICAgICAgICAgIGJyb3dzZXJVSVdyYXBwZXIub3Blbk9wdGlvbnNQYWdlKGJyb3dzZXIpXG4gICAgICAgIH0pXG4gICAgfVxufVxuIiwiY29uc3QgUGFyZW50U2xpZGluZ1N1YnZpZXcgPSByZXF1aXJlKCcuL3NsaWRpbmctc3Vidmlldy5lczYuanMnKVxuXG5mdW5jdGlvbiBQcml2YWN5UHJhY3RpY2VzIChvcHMpIHtcbiAgICB0aGlzLm1vZGVsID0gb3BzLm1vZGVsXG4gICAgdGhpcy50ZW1wbGF0ZSA9IG9wcy50ZW1wbGF0ZVxuXG4gICAgUGFyZW50U2xpZGluZ1N1YnZpZXcuY2FsbCh0aGlzLCBvcHMpXG5cbiAgICB0aGlzLnNldHVwQ2xvc2UoKVxufVxuXG5Qcml2YWN5UHJhY3RpY2VzLnByb3RvdHlwZSA9IHdpbmRvdy4kLmV4dGVuZCh7fSxcbiAgICBQYXJlbnRTbGlkaW5nU3Vidmlldy5wcm90b3R5cGUsXG4gICAge1xuICAgIH1cbilcblxubW9kdWxlLmV4cG9ydHMgPSBQcml2YWN5UHJhY3RpY2VzXG4iLCJjb25zdCBQYXJlbnQgPSB3aW5kb3cuRERHLmJhc2UuVmlld1xuY29uc3QgRk9DVVNfQ0xBU1MgPSAnZ28tLWZvY3VzZWQnXG5cbmZ1bmN0aW9uIFNlYXJjaCAob3BzKSB7XG4gICAgdGhpcy5tb2RlbCA9IG9wcy5tb2RlbFxuICAgIHRoaXMucGFnZVZpZXcgPSBvcHMucGFnZVZpZXdcbiAgICB0aGlzLnRlbXBsYXRlID0gb3BzLnRlbXBsYXRlXG4gICAgUGFyZW50LmNhbGwodGhpcywgb3BzKVxuXG4gICAgdGhpcy5fY2FjaGVFbGVtcygnLmpzLXNlYXJjaCcsIFtcbiAgICAgICAgJ2Zvcm0nLFxuICAgICAgICAnaW5wdXQnLFxuICAgICAgICAnZ28nLFxuICAgICAgICAnaGFtYnVyZ2VyLWJ1dHRvbidcbiAgICBdKVxuXG4gICAgdGhpcy5iaW5kRXZlbnRzKFtcbiAgICAgICAgW3RoaXMuJGlucHV0LCAnaW5wdXQnLCB0aGlzLl9oYW5kbGVJbnB1dF0sXG4gICAgICAgIFt0aGlzLiRpbnB1dCwgJ2JsdXInLCB0aGlzLl9oYW5kbGVCbHVyXSxcbiAgICAgICAgW3RoaXMuJGdvLCAnY2xpY2snLCB0aGlzLl9oYW5kbGVTdWJtaXRdLFxuICAgICAgICBbdGhpcy4kZm9ybSwgJ3N1Ym1pdCcsIHRoaXMuX2hhbmRsZVN1Ym1pdF0sXG4gICAgICAgIFt0aGlzLiRoYW1idXJnZXJidXR0b24sICdjbGljaycsIHRoaXMuX2hhbmRsZUJ1cmdlckNsaWNrXVxuICAgIF0pXG5cbiAgICB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB0aGlzLiRpbnB1dC5mb2N1cygpLCAyMDApXG59XG5cblNlYXJjaC5wcm90b3R5cGUgPSB3aW5kb3cuJC5leHRlbmQoe30sXG4gICAgUGFyZW50LnByb3RvdHlwZSxcbiAgICB7XG5cbiAgICAgICAgLy8gSG92ZXIgZWZmZWN0IG9uIHNlYXJjaCBidXR0b24gd2hpbGUgdHlwaW5nXG4gICAgICAgIF9hZGRIb3ZlckVmZmVjdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLiRnby5oYXNDbGFzcyhGT0NVU19DTEFTUykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLiRnby5hZGRDbGFzcyhGT0NVU19DTEFTUylcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBfcmVtb3ZlSG92ZXJFZmZlY3Q6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLiRnby5oYXNDbGFzcyhGT0NVU19DTEFTUykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLiRnby5yZW1vdmVDbGFzcyhGT0NVU19DTEFTUylcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBfaGFuZGxlQmx1cjogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIHRoaXMuX3JlbW92ZUhvdmVyRWZmZWN0KClcbiAgICAgICAgfSxcblxuICAgICAgICBfaGFuZGxlSW5wdXQ6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBjb25zdCBzZWFyY2hUZXh0ID0gdGhpcy4kaW5wdXQudmFsKClcbiAgICAgICAgICAgIHRoaXMubW9kZWwuc2V0KCdzZWFyY2hUZXh0Jywgc2VhcmNoVGV4dClcblxuICAgICAgICAgICAgaWYgKHNlYXJjaFRleHQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYWRkSG92ZXJFZmZlY3QoKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW1vdmVIb3ZlckVmZmVjdCgpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgX2hhbmRsZVN1Ym1pdDogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgICAgY29uc29sZS5sb2coYFNlYXJjaCBzdWJtaXQgZm9yICR7dGhpcy4kaW5wdXQudmFsKCl9YClcbiAgICAgICAgICAgIHRoaXMubW9kZWwuZmV0Y2goeyBmaXJlUGl4ZWw6ICdlcHEnIH0pXG4gICAgICAgICAgICB0aGlzLm1vZGVsLmRvU2VhcmNoKHRoaXMuJGlucHV0LnZhbCgpKVxuICAgICAgICAgICAgd2luZG93LmNsb3NlKClcbiAgICAgICAgfSxcblxuICAgICAgICBfaGFuZGxlQnVyZ2VyQ2xpY2s6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICAgIHRoaXMubW9kZWwuZmV0Y2goeyBmaXJlUGl4ZWw6ICdlcGgnIH0pXG4gICAgICAgICAgICB0aGlzLm1vZGVsLnNlbmQoJ2J1cmdlckNsaWNrJylcbiAgICAgICAgfVxuICAgIH1cbilcblxubW9kdWxlLmV4cG9ydHMgPSBTZWFyY2hcbiIsImNvbnN0IFBhcmVudCA9IHdpbmRvdy5EREcuYmFzZS5WaWV3XG5jb25zdCBHcmFkZVNjb3JlY2FyZFZpZXcgPSByZXF1aXJlKCcuLy4uL3ZpZXdzL2dyYWRlLXNjb3JlY2FyZC5lczYuanMnKVxuY29uc3QgVHJhY2tlck5ldHdvcmtzVmlldyA9IHJlcXVpcmUoJy4vLi4vdmlld3MvdHJhY2tlci1uZXR3b3Jrcy5lczYuanMnKVxuY29uc3QgUHJpdmFjeVByYWN0aWNlc1ZpZXcgPSByZXF1aXJlKCcuLy4uL3ZpZXdzL3ByaXZhY3ktcHJhY3RpY2VzLmVzNi5qcycpXG5jb25zdCBCcmVha2FnZUZvcm1WaWV3ID0gcmVxdWlyZSgnLi8uLi92aWV3cy9icmVha2FnZS1mb3JtLmVzNi5qcycpXG5jb25zdCBncmFkZVNjb3JlY2FyZFRlbXBsYXRlID0gcmVxdWlyZSgnLi8uLi90ZW1wbGF0ZXMvZ3JhZGUtc2NvcmVjYXJkLmVzNi5qcycpXG5jb25zdCB0cmFja2VyTmV0d29ya3NUZW1wbGF0ZSA9IHJlcXVpcmUoJy4vLi4vdGVtcGxhdGVzL3RyYWNrZXItbmV0d29ya3MuZXM2LmpzJylcbmNvbnN0IHByaXZhY3lQcmFjdGljZXNUZW1wbGF0ZSA9IHJlcXVpcmUoJy4vLi4vdGVtcGxhdGVzL3ByaXZhY3ktcHJhY3RpY2VzLmVzNi5qcycpXG5jb25zdCBicmVha2FnZUZvcm1UZW1wbGF0ZSA9IHJlcXVpcmUoJy4vLi4vdGVtcGxhdGVzL2JyZWFrYWdlLWZvcm0uZXM2LmpzJylcbmNvbnN0IG9wZW5PcHRpb25zUGFnZSA9IHJlcXVpcmUoJy4vbWl4aW5zL29wZW4tb3B0aW9ucy1wYWdlLmVzNi5qcycpXG5jb25zdCBicm93c2VyVUlXcmFwcGVyID0gcmVxdWlyZSgnLi8uLi9iYXNlL3VpLXdyYXBwZXIuZXM2LmpzJylcblxuZnVuY3Rpb24gU2l0ZSAob3BzKSB7XG4gICAgdGhpcy5tb2RlbCA9IG9wcy5tb2RlbFxuICAgIHRoaXMucGFnZVZpZXcgPSBvcHMucGFnZVZpZXdcbiAgICB0aGlzLnRlbXBsYXRlID0gb3BzLnRlbXBsYXRlXG5cbiAgICAvLyBjYWNoZSAnYm9keScgc2VsZWN0b3JcbiAgICB0aGlzLiRib2R5ID0gd2luZG93LiQoJ2JvZHknKVxuXG4gICAgLy8gZ2V0IGRhdGEgZnJvbSBiYWNrZ3JvdW5kIHByb2Nlc3MsIHRoZW4gcmUtcmVuZGVyIHRlbXBsYXRlIHdpdGggaXRcbiAgICB0aGlzLm1vZGVsLmdldEJhY2tncm91bmRUYWJEYXRhKCkudGhlbigoKSA9PiB7XG4gICAgICAgIGlmICh0aGlzLm1vZGVsLnRhYiAmJlxuICAgICAgICAgICAgICAgICh0aGlzLm1vZGVsLnRhYi5zdGF0dXMgPT09ICdjb21wbGV0ZScgfHwgdGhpcy5tb2RlbC5kb21haW4gPT09ICduZXcgdGFiJykpIHtcbiAgICAgICAgICAgIC8vIHJlbmRlciB0ZW1wbGF0ZSBmb3IgdGhlIGZpcnN0IHRpbWUgaGVyZVxuICAgICAgICAgICAgUGFyZW50LmNhbGwodGhpcywgb3BzKVxuICAgICAgICAgICAgdGhpcy5tb2RlbC5mZXRjaCh7IGZpcmVQaXhlbDogJ2VwJyB9KVxuICAgICAgICAgICAgdGhpcy5fc2V0dXAoKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gdGhlIHRpbWVvdXQgaGVscHMgYnVmZmVyIHRoZSByZS1yZW5kZXIgY3ljbGUgZHVyaW5nIGhlYXZ5XG4gICAgICAgICAgICAvLyBwYWdlIGxvYWRzIHdpdGggbG90cyBvZiB0cmFja2Vyc1xuICAgICAgICAgICAgUGFyZW50LmNhbGwodGhpcywgb3BzKVxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLnJlcmVuZGVyKCksIDc1MClcbiAgICAgICAgfVxuICAgIH0pXG59XG5cblNpdGUucHJvdG90eXBlID0gd2luZG93LiQuZXh0ZW5kKHt9LFxuICAgIFBhcmVudC5wcm90b3R5cGUsXG4gICAgb3Blbk9wdGlvbnNQYWdlLFxuICAgIHtcbiAgICAgICAgX29uV2hpdGVsaXN0Q2xpY2s6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBpZiAodGhpcy4kYm9keS5oYXNDbGFzcygnaXMtZGlzYWJsZWQnKSkgcmV0dXJuXG4gICAgICAgICAgICBpZiAodGhpcy4kcHJvdGVjdGlvbnJvdy5oYXNDbGFzcygnaXMtZGlzYWJsZWQnKSkgcmV0dXJuXG5cbiAgICAgICAgICAgIHRoaXMubW9kZWwudG9nZ2xlV2hpdGVsaXN0KClcbiAgICAgICAgICAgIGNvbnN0IHdoaXRlbGlzdGVkID0gdGhpcy5tb2RlbC5pc1doaXRlbGlzdGVkXG4gICAgICAgICAgICB0aGlzLl9zaG93V2hpdGVsaXN0ZWRTdGF0dXNNZXNzYWdlKCF3aGl0ZWxpc3RlZClcblxuICAgICAgICAgICAgaWYgKHdoaXRlbGlzdGVkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2hvd0JyZWFrYWdlQ29uZmlybWF0aW9uKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvLyBJZiB3ZSBqdXN0IHdoaXRlbGlzdGVkIGEgc2l0ZSwgc2hvdyBhIG1lc3NhZ2UgYnJpZWZseSBiZWZvcmUgcmVsb2FkaW5nXG4gICAgICAgIC8vIG90aGVyd2lzZSBqdXN0IHJlbG9hZCB0aGUgdGFiIGFuZCBjbG9zZSB0aGUgcG9wdXBcbiAgICAgICAgX3Nob3dXaGl0ZWxpc3RlZFN0YXR1c01lc3NhZ2U6IGZ1bmN0aW9uIChyZWxvYWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGlzVHJhbnNwYXJlbnRDbGFzcyA9ICdpcy10cmFuc3BhcmVudCdcbiAgICAgICAgICAgIC8vIFdhaXQgZm9yIHRoZSByZXJlbmRlcmluZyB0byBiZSBkb25lXG4gICAgICAgICAgICAvLyAxMG1zIHRpbWVvdXQgaXMgdGhlIG1pbmltdW0gdG8gcmVuZGVyIHRoZSB0cmFuc2l0aW9uIHNtb290aGx5XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMuJHdoaXRlbGlzdHN0YXR1cy5yZW1vdmVDbGFzcyhpc1RyYW5zcGFyZW50Q2xhc3MpLCAxMClcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy4kcHJvdGVjdGlvbi5hZGRDbGFzcyhpc1RyYW5zcGFyZW50Q2xhc3MpLCAxMClcblxuICAgICAgICAgICAgaWYgKHJlbG9hZCkge1xuICAgICAgICAgICAgICAgIC8vIFdhaXQgYSBiaXQgbW9yZSBiZWZvcmUgY2xvc2luZyB0aGUgcG9wdXAgYW5kIHJlbG9hZGluZyB0aGUgdGFiXG4gICAgICAgICAgICAgICAgdGhpcy5jbG9zZVBvcHVwQW5kUmVsb2FkKDE1MDApXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gTk9URTogYWZ0ZXIgLl9zZXR1cCgpIGlzIGNhbGxlZCB0aGlzIHZpZXcgbGlzdGVucyBmb3IgY2hhbmdlcyB0b1xuICAgICAgICAvLyBzaXRlIG1vZGVsIGFuZCByZS1yZW5kZXJzIGV2ZXJ5IHRpbWUgbW9kZWwgcHJvcGVydGllcyBjaGFuZ2VcbiAgICAgICAgX3NldHVwOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnW3NpdGUgdmlld10gX3NldHVwKCknKVxuICAgICAgICAgICAgdGhpcy5fY2FjaGVFbGVtcygnLmpzLXNpdGUnLCBbXG4gICAgICAgICAgICAgICAgJ3RvZ2dsZScsXG4gICAgICAgICAgICAgICAgJ3Byb3RlY3Rpb24nLFxuICAgICAgICAgICAgICAgICdwcm90ZWN0aW9uLXJvdycsXG4gICAgICAgICAgICAgICAgJ3doaXRlbGlzdC1zdGF0dXMnLFxuICAgICAgICAgICAgICAgICdzaG93LWFsbC10cmFja2VycycsXG4gICAgICAgICAgICAgICAgJ3Nob3ctcGFnZS10cmFja2VycycsXG4gICAgICAgICAgICAgICAgJ21hbmFnZS13aGl0ZWxpc3QnLFxuICAgICAgICAgICAgICAgICdtYW5hZ2Utd2hpdGVsaXN0LWxpJyxcbiAgICAgICAgICAgICAgICAncmVwb3J0LWJyb2tlbicsXG4gICAgICAgICAgICAgICAgJ3ByaXZhY3ktcHJhY3RpY2VzJyxcbiAgICAgICAgICAgICAgICAnY29uZmlybS1icmVha2FnZS1saScsXG4gICAgICAgICAgICAgICAgJ2NvbmZpcm0tYnJlYWthZ2UnLFxuICAgICAgICAgICAgICAgICdjb25maXJtLWJyZWFrYWdlLXllcycsXG4gICAgICAgICAgICAgICAgJ2NvbmZpcm0tYnJlYWthZ2Utbm8nLFxuICAgICAgICAgICAgICAgICdjb25maXJtLWJyZWFrYWdlLW1lc3NhZ2UnXG4gICAgICAgICAgICBdKVxuXG4gICAgICAgICAgICB0aGlzLiRncmFkZXNjb3JlY2FyZCA9IHRoaXMuJCgnLmpzLWhlcm8tb3BlbicpXG5cbiAgICAgICAgICAgIHRoaXMuYmluZEV2ZW50cyhbXG4gICAgICAgICAgICAgICAgW3RoaXMuJHRvZ2dsZSwgJ2NsaWNrJywgdGhpcy5fb25XaGl0ZWxpc3RDbGlja10sXG4gICAgICAgICAgICAgICAgW3RoaXMuJHNob3dwYWdldHJhY2tlcnMsICdjbGljaycsIHRoaXMuX3Nob3dQYWdlVHJhY2tlcnNdLFxuICAgICAgICAgICAgICAgIFt0aGlzLiRwcml2YWN5cHJhY3RpY2VzLCAnY2xpY2snLCB0aGlzLl9zaG93UHJpdmFjeVByYWN0aWNlc10sXG4gICAgICAgICAgICAgICAgW3RoaXMuJGNvbmZpcm1icmVha2FnZXllcywgJ2NsaWNrJywgdGhpcy5fb25Db25maXJtQnJva2VuQ2xpY2tdLFxuICAgICAgICAgICAgICAgIFt0aGlzLiRjb25maXJtYnJlYWthZ2VubywgJ2NsaWNrJywgdGhpcy5fb25Db25maXJtTm90QnJva2VuQ2xpY2tdLFxuICAgICAgICAgICAgICAgIFt0aGlzLiRncmFkZXNjb3JlY2FyZCwgJ2NsaWNrJywgdGhpcy5fc2hvd0dyYWRlU2NvcmVjYXJkXSxcbiAgICAgICAgICAgICAgICBbdGhpcy4kbWFuYWdld2hpdGVsaXN0LCAnY2xpY2snLCB0aGlzLl9vbk1hbmFnZVdoaXRlbGlzdENsaWNrXSxcbiAgICAgICAgICAgICAgICBbdGhpcy4kcmVwb3J0YnJva2VuLCAnY2xpY2snLCB0aGlzLl9vblJlcG9ydEJyb2tlblNpdGVDbGlja10sXG4gICAgICAgICAgICAgICAgW3RoaXMuc3RvcmUuc3Vic2NyaWJlLCAnY2hhbmdlOnNpdGUnLCB0aGlzLnJlcmVuZGVyXVxuICAgICAgICAgICAgXSlcbiAgICAgICAgfSxcblxuICAgICAgICByZXJlbmRlcjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gUHJldmVudCByZXJlbmRlcnMgd2hlbiBjb25maXJtYXRpb24gZm9ybSBpcyBhY3RpdmUsXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UgZm9ybSB3aWxsIGRpc2FwcGVhciBvbiByZXJlbmRlci5cbiAgICAgICAgICAgIGlmICh0aGlzLiRib2R5Lmhhc0NsYXNzKCdjb25maXJtYXRpb24tYWN0aXZlJykpIHJldHVyblxuXG4gICAgICAgICAgICBpZiAodGhpcy5tb2RlbCAmJiB0aGlzLm1vZGVsLmRpc2FibGVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLiRib2R5Lmhhc0NsYXNzKCdpcy1kaXNhYmxlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCckYm9keS5hZGRDbGFzcygpIGlzLWRpc2FibGVkJylcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kYm9keS5hZGRDbGFzcygnaXMtZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9yZXJlbmRlcigpXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3NldHVwKClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuJGJvZHkucmVtb3ZlQ2xhc3MoJ2lzLWRpc2FibGVkJylcbiAgICAgICAgICAgICAgICB0aGlzLnVuYmluZEV2ZW50cygpXG4gICAgICAgICAgICAgICAgdGhpcy5fcmVyZW5kZXIoKVxuICAgICAgICAgICAgICAgIHRoaXMuX3NldHVwKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBfb25NYW5hZ2VXaGl0ZWxpc3RDbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMubW9kZWwgJiYgdGhpcy5tb2RlbC5kaXNhYmxlZCkge1xuICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLm9wZW5PcHRpb25zUGFnZSgpXG4gICAgICAgIH0sXG5cbiAgICAgICAgX29uUmVwb3J0QnJva2VuU2l0ZUNsaWNrOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICAgICAgICAgIGlmICh0aGlzLm1vZGVsICYmIHRoaXMubW9kZWwuZGlzYWJsZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5zaG93QnJlYWthZ2VGb3JtKCdyZXBvcnRCcm9rZW5TaXRlJylcbiAgICAgICAgfSxcblxuICAgICAgICBfb25Db25maXJtQnJva2VuQ2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbnN0IGlzSGlkZGVuQ2xhc3MgPSAnaXMtaGlkZGVuJ1xuICAgICAgICAgICAgdGhpcy4kbWFuYWdld2hpdGVsaXN0bGkucmVtb3ZlQ2xhc3MoaXNIaWRkZW5DbGFzcylcbiAgICAgICAgICAgIHRoaXMuJGNvbmZpcm1icmVha2FnZWxpLmFkZENsYXNzKGlzSGlkZGVuQ2xhc3MpXG4gICAgICAgICAgICB0aGlzLiRib2R5LnJlbW92ZUNsYXNzKCdjb25maXJtYXRpb24tYWN0aXZlJylcbiAgICAgICAgICAgIHRoaXMuc2hvd0JyZWFrYWdlRm9ybSgndG9nZ2xlJylcbiAgICAgICAgfSxcblxuICAgICAgICBfb25Db25maXJtTm90QnJva2VuQ2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbnN0IGlzVHJhbnNwYXJlbnRDbGFzcyA9ICdpcy10cmFuc3BhcmVudCdcbiAgICAgICAgICAgIHRoaXMuJGNvbmZpcm1icmVha2FnZW1lc3NhZ2UucmVtb3ZlQ2xhc3MoaXNUcmFuc3BhcmVudENsYXNzKVxuICAgICAgICAgICAgdGhpcy4kY29uZmlybWJyZWFrYWdlLmFkZENsYXNzKGlzVHJhbnNwYXJlbnRDbGFzcylcbiAgICAgICAgICAgIHRoaXMuJGJvZHkucmVtb3ZlQ2xhc3MoJ2NvbmZpcm1hdGlvbi1hY3RpdmUnKVxuICAgICAgICAgICAgdGhpcy5jbG9zZVBvcHVwQW5kUmVsb2FkKDE1MDApXG4gICAgICAgIH0sXG5cbiAgICAgICAgX3Nob3dCcmVha2FnZUNvbmZpcm1hdGlvbjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy4kYm9keS5hZGRDbGFzcygnY29uZmlybWF0aW9uLWFjdGl2ZScpXG4gICAgICAgICAgICB0aGlzLiRjb25maXJtYnJlYWthZ2VsaS5yZW1vdmVDbGFzcygnaXMtaGlkZGVuJylcbiAgICAgICAgICAgIHRoaXMuJG1hbmFnZXdoaXRlbGlzdGxpLmFkZENsYXNzKCdpcy1oaWRkZW4nKVxuICAgICAgICB9LFxuXG4gICAgICAgIC8vIHBhc3MgY2xpY2tTb3VyY2UgdG8gc3BlY2lmeSB3aGV0aGVyIHBhZ2Ugc2hvdWxkIHJlbG9hZFxuICAgICAgICAvLyBhZnRlciBzdWJtaXR0aW5nIGJyZWFrYWdlIGZvcm0uXG4gICAgICAgIHNob3dCcmVha2FnZUZvcm06IGZ1bmN0aW9uIChjbGlja1NvdXJjZSkge1xuICAgICAgICAgICAgdGhpcy52aWV3cy5icmVha2FnZUZvcm0gPSBuZXcgQnJlYWthZ2VGb3JtVmlldyh7XG4gICAgICAgICAgICAgICAgc2l0ZVZpZXc6IHRoaXMsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGU6IGJyZWFrYWdlRm9ybVRlbXBsYXRlLFxuICAgICAgICAgICAgICAgIG1vZGVsOiB0aGlzLm1vZGVsLFxuICAgICAgICAgICAgICAgIGFwcGVuZFRvOiB0aGlzLiRib2R5LFxuICAgICAgICAgICAgICAgIGNsaWNrU291cmNlOiBjbGlja1NvdXJjZVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSxcblxuICAgICAgICBfc2hvd1BhZ2VUcmFja2VyczogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLiRib2R5Lmhhc0NsYXNzKCdpcy1kaXNhYmxlZCcpKSByZXR1cm5cbiAgICAgICAgICAgIHRoaXMubW9kZWwuZmV0Y2goeyBmaXJlUGl4ZWw6ICdlcG4nIH0pXG4gICAgICAgICAgICB0aGlzLnZpZXdzLnNsaWRpbmdTdWJ2aWV3ID0gbmV3IFRyYWNrZXJOZXR3b3Jrc1ZpZXcoe1xuICAgICAgICAgICAgICAgIHRlbXBsYXRlOiB0cmFja2VyTmV0d29ya3NUZW1wbGF0ZVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSxcblxuICAgICAgICBfc2hvd1ByaXZhY3lQcmFjdGljZXM6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5tb2RlbC5kaXNhYmxlZCkgcmV0dXJuXG4gICAgICAgICAgICB0aGlzLm1vZGVsLmZldGNoKHsgZmlyZVBpeGVsOiAnZXBwJyB9KVxuXG4gICAgICAgICAgICB0aGlzLnZpZXdzLnByaXZhY3lQcmFjdGljZXMgPSBuZXcgUHJpdmFjeVByYWN0aWNlc1ZpZXcoe1xuICAgICAgICAgICAgICAgIHRlbXBsYXRlOiBwcml2YWN5UHJhY3RpY2VzVGVtcGxhdGUsXG4gICAgICAgICAgICAgICAgbW9kZWw6IHRoaXMubW9kZWxcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0sXG5cbiAgICAgICAgX3Nob3dHcmFkZVNjb3JlY2FyZDogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLm1vZGVsLmRpc2FibGVkKSByZXR1cm5cbiAgICAgICAgICAgIHRoaXMubW9kZWwuZmV0Y2goeyBmaXJlUGl4ZWw6ICdlcGMnIH0pXG5cbiAgICAgICAgICAgIHRoaXMudmlld3MuZ3JhZGVTY29yZWNhcmQgPSBuZXcgR3JhZGVTY29yZWNhcmRWaWV3KHtcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogZ3JhZGVTY29yZWNhcmRUZW1wbGF0ZSxcbiAgICAgICAgICAgICAgICBtb2RlbDogdGhpcy5tb2RlbFxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSxcblxuICAgICAgICBjbG9zZVBvcHVwQW5kUmVsb2FkOiBmdW5jdGlvbiAoZGVsYXkpIHtcbiAgICAgICAgICAgIGRlbGF5ID0gZGVsYXkgfHwgMFxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgYnJvd3NlclVJV3JhcHBlci5yZWxvYWRUYWIodGhpcy5tb2RlbC50YWIuaWQpXG4gICAgICAgICAgICAgICAgYnJvd3NlclVJV3JhcHBlci5jbG9zZVBvcHVwKClcbiAgICAgICAgICAgIH0sIGRlbGF5KVxuICAgICAgICB9XG4gICAgfVxuKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNpdGVcbiIsImNvbnN0IFBhcmVudCA9IHdpbmRvdy5EREcuYmFzZS5WaWV3XG5cbmZ1bmN0aW9uIFNsaWRpbmdTdWJ2aWV3IChvcHMpIHtcbiAgICBvcHMuYXBwZW5kVG8gPSB3aW5kb3cuJCgnLnNsaWRpbmctc3Vidmlldy0tcm9vdCcpXG4gICAgUGFyZW50LmNhbGwodGhpcywgb3BzKVxuXG4gICAgdGhpcy4kcm9vdCA9IHdpbmRvdy4kKCcuc2xpZGluZy1zdWJ2aWV3LS1yb290JylcbiAgICB0aGlzLiRyb290LmFkZENsYXNzKCdzbGlkaW5nLXN1YnZpZXctLW9wZW4nKVxuXG4gICAgdGhpcy5zZXR1cENsb3NlKClcbn1cblxuU2xpZGluZ1N1YnZpZXcucHJvdG90eXBlID0gd2luZG93LiQuZXh0ZW5kKHt9LFxuICAgIFBhcmVudC5wcm90b3R5cGUsXG4gICAge1xuXG4gICAgICAgIHNldHVwQ2xvc2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuX2NhY2hlRWxlbXMoJy5qcy1zbGlkaW5nLXN1YnZpZXcnLCBbJ2Nsb3NlJ10pXG4gICAgICAgICAgICB0aGlzLmJpbmRFdmVudHMoW1xuICAgICAgICAgICAgICAgIFt0aGlzLiRjbG9zZSwgJ2NsaWNrJywgdGhpcy5fZGVzdHJveV1cbiAgICAgICAgICAgIF0pXG4gICAgICAgIH0sXG5cbiAgICAgICAgX2Rlc3Ryb3k6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuJHJvb3QucmVtb3ZlQ2xhc3MoJ3NsaWRpbmctc3Vidmlldy0tb3BlbicpXG4gICAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5kZXN0cm95KClcbiAgICAgICAgICAgIH0sIDQwMCkgLy8gNDAwbXMgPSAwLjM1cyBpbiAuc2xpZGluZy1zdWJ2aWV3LS1yb290IHRyYW5zaXRpb24gKyA1MG1zIHBhZGRpbmdcbiAgICAgICAgfVxuICAgIH1cbilcblxubW9kdWxlLmV4cG9ydHMgPSBTbGlkaW5nU3Vidmlld1xuIiwiY29uc3QgUGFyZW50ID0gd2luZG93LkRERy5iYXNlLlZpZXdcbmNvbnN0IFRvcEJsb2NrZWRGdWxsVmlldyA9IHJlcXVpcmUoJy4vdG9wLWJsb2NrZWQuZXM2LmpzJylcbmNvbnN0IHRvcEJsb2NrZWRGdWxsVGVtcGxhdGUgPSByZXF1aXJlKCcuLy4uL3RlbXBsYXRlcy90b3AtYmxvY2tlZC5lczYuanMnKVxuY29uc3QgVE9QX0JMT0NLRURfQ0xBU1MgPSAnaGFzLXRvcC1ibG9ja2VkLS10cnVuY2F0ZWQnXG5cbmZ1bmN0aW9uIFRydW5jYXRlZFRvcEJsb2NrZWQgKG9wcykge1xuICAgIHRoaXMubW9kZWwgPSBvcHMubW9kZWxcbiAgICB0aGlzLnBhZ2VWaWV3ID0gb3BzLnBhZ2VWaWV3XG4gICAgdGhpcy50ZW1wbGF0ZSA9IG9wcy50ZW1wbGF0ZVxuXG4gICAgdGhpcy5tb2RlbC5nZXRUb3BCbG9ja2VkKCkudGhlbigoKSA9PiB7XG4gICAgICAgIFBhcmVudC5jYWxsKHRoaXMsIG9wcylcbiAgICAgICAgdGhpcy5fc2V0dXAoKVxuICAgIH0pXG5cbiAgICB0aGlzLmJpbmRFdmVudHMoW1xuICAgICAgICBbdGhpcy5tb2RlbC5zdG9yZS5zdWJzY3JpYmUsICdhY3Rpb246YmFja2dyb3VuZE1lc3NhZ2UnLCB0aGlzLmhhbmRsZUJhY2tncm91bmRNc2ddXG4gICAgXSlcbn1cblxuVHJ1bmNhdGVkVG9wQmxvY2tlZC5wcm90b3R5cGUgPSB3aW5kb3cuJC5leHRlbmQoe30sXG4gICAgUGFyZW50LnByb3RvdHlwZSxcbiAgICB7XG5cbiAgICAgICAgX3NlZUFsbENsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLm1vZGVsLmZldGNoKHsgZmlyZVBpeGVsOiAnZXBzJyB9KVxuICAgICAgICAgICAgdGhpcy52aWV3cy5zbGlkaW5nU3VidmlldyA9IG5ldyBUb3BCbG9ja2VkRnVsbFZpZXcoe1xuICAgICAgICAgICAgICAgIHRlbXBsYXRlOiB0b3BCbG9ja2VkRnVsbFRlbXBsYXRlLFxuICAgICAgICAgICAgICAgIG51bUl0ZW1zOiAxMFxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSxcblxuICAgICAgICBfc2V0dXA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuX2NhY2hlRWxlbXMoJy5qcy10b3AtYmxvY2tlZCcsIFsnZ3JhcGgtYmFyLWZnJywgJ3BjdCcsICdzZWUtYWxsJ10pXG4gICAgICAgICAgICB0aGlzLmJpbmRFdmVudHMoW1xuICAgICAgICAgICAgICAgIFt0aGlzLiRzZWVhbGwsICdjbGljaycsIHRoaXMuX3NlZUFsbENsaWNrXVxuICAgICAgICAgICAgXSlcbiAgICAgICAgICAgIGlmICh3aW5kb3cuJCgnLnRvcC1ibG9ja2VkLS10cnVuY2F0ZWQnKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cuJCgnaHRtbCcpLmFkZENsYXNzKFRPUF9CTE9DS0VEX0NMQVNTKVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIHJlcmVuZGVyTGlzdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5fcmVyZW5kZXIoKVxuICAgICAgICAgICAgdGhpcy5fc2V0dXAoKVxuICAgICAgICB9LFxuXG4gICAgICAgIGhhbmRsZUJhY2tncm91bmRNc2c6IGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gICAgICAgICAgICBpZiAoIW1lc3NhZ2UgfHwgIW1lc3NhZ2UuYWN0aW9uKSByZXR1cm5cblxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuYWN0aW9uID09PSAnZGlkUmVzZXRUcmFja2Vyc0RhdGEnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tb2RlbC5yZXNldCgpXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLnJlcmVuZGVyTGlzdCgpLCA3NTApXG4gICAgICAgICAgICAgICAgdGhpcy5yZXJlbmRlckxpc3QoKVxuICAgICAgICAgICAgICAgIHdpbmRvdy4kKCdodG1sJykucmVtb3ZlQ2xhc3MoVE9QX0JMT0NLRURfQ0xBU1MpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4pXG5cbm1vZHVsZS5leHBvcnRzID0gVHJ1bmNhdGVkVG9wQmxvY2tlZFxuIiwiY29uc3QgUGFyZW50U2xpZGluZ1N1YnZpZXcgPSByZXF1aXJlKCcuL3NsaWRpbmctc3Vidmlldy5lczYuanMnKVxuY29uc3QgYW5pbWF0ZUdyYXBoQmFycyA9IHJlcXVpcmUoJy4vbWl4aW5zL2FuaW1hdGUtZ3JhcGgtYmFycy5lczYuanMnKVxuY29uc3QgVG9wQmxvY2tlZE1vZGVsID0gcmVxdWlyZSgnLi8uLi9tb2RlbHMvdG9wLWJsb2NrZWQuZXM2LmpzJylcblxuZnVuY3Rpb24gVG9wQmxvY2tlZCAob3BzKSB7XG4gICAgLy8gbW9kZWwgZGF0YSBpcyBhc3luY1xuICAgIHRoaXMubW9kZWwgPSBudWxsXG4gICAgdGhpcy5udW1JdGVtcyA9IG9wcy5udW1JdGVtc1xuICAgIHRoaXMudGVtcGxhdGUgPSBvcHMudGVtcGxhdGVcbiAgICBQYXJlbnRTbGlkaW5nU3Vidmlldy5jYWxsKHRoaXMsIG9wcylcblxuICAgIHRoaXMuc2V0dXBDbG9zZSgpXG4gICAgdGhpcy5yZW5kZXJBc3luY0NvbnRlbnQoKVxuXG4gICAgdGhpcy5iaW5kRXZlbnRzKFtcbiAgICAgICAgW3RoaXMubW9kZWwuc3RvcmUuc3Vic2NyaWJlLCAnYWN0aW9uOmJhY2tncm91bmRNZXNzYWdlJywgdGhpcy5oYW5kbGVCYWNrZ3JvdW5kTXNnXVxuICAgIF0pXG59XG5cblRvcEJsb2NrZWQucHJvdG90eXBlID0gd2luZG93LiQuZXh0ZW5kKHt9LFxuICAgIFBhcmVudFNsaWRpbmdTdWJ2aWV3LnByb3RvdHlwZSxcbiAgICBhbmltYXRlR3JhcGhCYXJzLFxuICAgIHtcblxuICAgICAgICBzZXR1cDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy4kY29udGVudCA9IHRoaXMuJGVsLmZpbmQoJy5qcy10b3AtYmxvY2tlZC1jb250ZW50JylcbiAgICAgICAgICAgIC8vIGxpc3RlbmVyIGZvciByZXNldCBzdGF0cyBjbGlja1xuICAgICAgICAgICAgdGhpcy4kcmVzZXQgPSB0aGlzLiRlbC5maW5kKCcuanMtcmVzZXQtdHJhY2tlcnMtZGF0YScpXG4gICAgICAgICAgICB0aGlzLmJpbmRFdmVudHMoW1xuICAgICAgICAgICAgICAgIFt0aGlzLiRyZXNldCwgJ2NsaWNrJywgdGhpcy5yZXNldFRyYWNrZXJzU3RhdHNdXG4gICAgICAgICAgICBdKVxuICAgICAgICB9LFxuXG4gICAgICAgIHJlbmRlckFzeW5jQ29udGVudDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29uc3QgcmFuZG9tID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMTAwMDAwKVxuICAgICAgICAgICAgdGhpcy5tb2RlbCA9IG5ldyBUb3BCbG9ja2VkTW9kZWwoe1xuICAgICAgICAgICAgICAgIG1vZGVsTmFtZTogJ3RvcEJsb2NrZWQnICsgcmFuZG9tLFxuICAgICAgICAgICAgICAgIG51bUNvbXBhbmllczogdGhpcy5udW1JdGVtc1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIHRoaXMubW9kZWwuZ2V0VG9wQmxvY2tlZCgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSB0aGlzLnRlbXBsYXRlKClcbiAgICAgICAgICAgICAgICB0aGlzLiRlbC5hcHBlbmQoY29udGVudClcbiAgICAgICAgICAgICAgICB0aGlzLnNldHVwKClcblxuICAgICAgICAgICAgICAgIC8vIGFuaW1hdGUgZ3JhcGggYmFycyBhbmQgcGN0XG4gICAgICAgICAgICAgICAgdGhpcy4kZ3JhcGhiYXJmZyA9IHRoaXMuJGVsLmZpbmQoJy5qcy10b3AtYmxvY2tlZC1ncmFwaC1iYXItZmcnKVxuICAgICAgICAgICAgICAgIHRoaXMuJHBjdCA9IHRoaXMuJGVsLmZpbmQoJy5qcy10b3AtYmxvY2tlZC1wY3QnKVxuICAgICAgICAgICAgICAgIHRoaXMuYW5pbWF0ZUdyYXBoQmFycygpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9LFxuXG4gICAgICAgIHJlc2V0VHJhY2tlcnNTdGF0czogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGlmIChlKSBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICAgIHRoaXMubW9kZWwuZmV0Y2goeyByZXNldFRyYWNrZXJzRGF0YTogdHJ1ZSB9KVxuICAgICAgICB9LFxuXG4gICAgICAgIGhhbmRsZUJhY2tncm91bmRNc2c6IGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gICAgICAgICAgICBpZiAoIW1lc3NhZ2UgfHwgIW1lc3NhZ2UuYWN0aW9uKSByZXR1cm5cblxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuYWN0aW9uID09PSAnZGlkUmVzZXRUcmFja2Vyc0RhdGEnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tb2RlbC5yZXNldChtZXNzYWdlLmRhdGEpXG4gICAgICAgICAgICAgICAgY29uc3QgY29udGVudCA9IHRoaXMudGVtcGxhdGUoKVxuICAgICAgICAgICAgICAgIHRoaXMuJGNvbnRlbnQucmVwbGFjZVdpdGgoY29udGVudClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbilcblxubW9kdWxlLmV4cG9ydHMgPSBUb3BCbG9ja2VkXG4iLCJjb25zdCBQYXJlbnRTbGlkaW5nU3VidmlldyA9IHJlcXVpcmUoJy4vc2xpZGluZy1zdWJ2aWV3LmVzNi5qcycpXG5jb25zdCBoZXJvVGVtcGxhdGUgPSByZXF1aXJlKCcuLy4uL3RlbXBsYXRlcy9zaGFyZWQvaGVyby5lczYuanMnKVxuY29uc3QgQ29tcGFueUxpc3RNb2RlbCA9IHJlcXVpcmUoJy4vLi4vbW9kZWxzL3NpdGUtY29tcGFueS1saXN0LmVzNi5qcycpXG5jb25zdCBTaXRlTW9kZWwgPSByZXF1aXJlKCcuLy4uL21vZGVscy9zaXRlLmVzNi5qcycpXG5jb25zdCB0cmFja2VyTmV0d29ya3NJY29uVGVtcGxhdGUgPSByZXF1aXJlKCcuLy4uL3RlbXBsYXRlcy9zaGFyZWQvdHJhY2tlci1uZXR3b3JrLWljb24uZXM2LmpzJylcbmNvbnN0IHRyYWNrZXJOZXR3b3Jrc1RleHRUZW1wbGF0ZSA9IHJlcXVpcmUoJy4vLi4vdGVtcGxhdGVzL3NoYXJlZC90cmFja2VyLW5ldHdvcmtzLXRleHQuZXM2LmpzJylcblxuZnVuY3Rpb24gVHJhY2tlck5ldHdvcmtzIChvcHMpIHtcbiAgICAvLyBtb2RlbCBkYXRhIGlzIGFzeW5jXG4gICAgdGhpcy5tb2RlbCA9IG51bGxcbiAgICB0aGlzLmN1cnJlbnRNb2RlbE5hbWUgPSBudWxsXG4gICAgdGhpcy5jdXJyZW50U2l0ZU1vZGVsTmFtZSA9IG51bGxcbiAgICB0aGlzLnRlbXBsYXRlID0gb3BzLnRlbXBsYXRlXG4gICAgUGFyZW50U2xpZGluZ1N1YnZpZXcuY2FsbCh0aGlzLCBvcHMpXG5cbiAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMuX3JlcmVuZGVyKCksIDc1MClcbiAgICB0aGlzLnJlbmRlckFzeW5jQ29udGVudCgpXG59XG5cblRyYWNrZXJOZXR3b3Jrcy5wcm90b3R5cGUgPSB3aW5kb3cuJC5leHRlbmQoe30sXG4gICAgUGFyZW50U2xpZGluZ1N1YnZpZXcucHJvdG90eXBlLFxuICAgIHtcblxuICAgICAgICBzZXR1cDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5fY2FjaGVFbGVtcygnLmpzLXRyYWNrZXItbmV0d29ya3MnLCBbXG4gICAgICAgICAgICAgICAgJ2hlcm8nLFxuICAgICAgICAgICAgICAgICdkZXRhaWxzJ1xuICAgICAgICAgICAgXSlcblxuICAgICAgICAgICAgLy8gc2l0ZSByYXRpbmcgYXJyaXZlcyBhc3luY1xuICAgICAgICAgICAgdGhpcy5iaW5kRXZlbnRzKFtbXG4gICAgICAgICAgICAgICAgdGhpcy5zdG9yZS5zdWJzY3JpYmUsXG4gICAgICAgICAgICAgICAgYGNoYW5nZToke3RoaXMuY3VycmVudFNpdGVNb2RlbE5hbWV9YCxcbiAgICAgICAgICAgICAgICB0aGlzLl9yZXJlbmRlclxuICAgICAgICAgICAgXV0pXG4gICAgICAgIH0sXG5cbiAgICAgICAgcmVuZGVyQXN5bmNDb250ZW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjb25zdCByYW5kb20gPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAxMDAwMDApXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRNb2RlbE5hbWUgPSAnc2l0ZUNvbXBhbnlMaXN0JyArIHJhbmRvbVxuICAgICAgICAgICAgdGhpcy5jdXJyZW50U2l0ZU1vZGVsTmFtZSA9ICdzaXRlJyArIHJhbmRvbVxuXG4gICAgICAgICAgICB0aGlzLm1vZGVsID0gbmV3IENvbXBhbnlMaXN0TW9kZWwoe1xuICAgICAgICAgICAgICAgIG1vZGVsTmFtZTogdGhpcy5jdXJyZW50TW9kZWxOYW1lXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgdGhpcy5tb2RlbC5mZXRjaEFzeW5jRGF0YSgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMubW9kZWwuc2l0ZSA9IG5ldyBTaXRlTW9kZWwoe1xuICAgICAgICAgICAgICAgICAgICBtb2RlbE5hbWU6IHRoaXMuY3VycmVudFNpdGVNb2RlbE5hbWVcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIHRoaXMubW9kZWwuc2l0ZS5nZXRCYWNrZ3JvdW5kVGFiRGF0YSgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50ID0gdGhpcy50ZW1wbGF0ZSgpXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJGVsLmFwcGVuZChjb250ZW50KVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHVwKClcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR1cENsb3NlKClcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSxcblxuICAgICAgICBfcmVuZGVySGVyb1RlbXBsYXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5tb2RlbC5zaXRlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdHJhY2tlck5ldHdvcmtzSWNvbk5hbWUgPSB0cmFja2VyTmV0d29ya3NJY29uVGVtcGxhdGUoXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW9kZWwuc2l0ZS5zaXRlUmF0aW5nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vZGVsLnNpdGUuaXNBbGxvd2xpc3RlZCxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2RlbC5zaXRlLnRvdGFsVHJhY2tlck5ldHdvcmtzQ291bnRcbiAgICAgICAgICAgICAgICApXG5cbiAgICAgICAgICAgICAgICBjb25zdCB0cmFja2VyTmV0d29ya3NUZXh0ID0gdHJhY2tlck5ldHdvcmtzVGV4dFRlbXBsYXRlKHRoaXMubW9kZWwuc2l0ZSwgZmFsc2UpXG5cbiAgICAgICAgICAgICAgICB0aGlzLiRoZXJvLmh0bWwoaGVyb1RlbXBsYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzOiB0cmFja2VyTmV0d29ya3NJY29uTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6IHRoaXMubW9kZWwuc2l0ZS5kb21haW4sXG4gICAgICAgICAgICAgICAgICAgIHN1YnRpdGxlOiB0cmFja2VyTmV0d29ya3NUZXh0LFxuICAgICAgICAgICAgICAgICAgICBzaG93Q2xvc2U6IHRydWVcbiAgICAgICAgICAgICAgICB9KSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBfcmVyZW5kZXI6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBpZiAoZSAmJiBlLmNoYW5nZSkge1xuICAgICAgICAgICAgICAgIGlmIChlLmNoYW5nZS5hdHRyaWJ1dGUgPT09ICdpc2FNYWpvclRyYWNraW5nTmV0d29yaycgfHxcbiAgICAgICAgICAgICAgICAgICAgZS5jaGFuZ2UuYXR0cmlidXRlID09PSAnaXNXaGl0ZWxpc3RlZCcgfHxcbiAgICAgICAgICAgICAgICAgICAgZS5jaGFuZ2UuYXR0cmlidXRlID09PSAndG90YWxUcmFja2VyTmV0d29ya3NDb3VudCcgfHxcbiAgICAgICAgICAgICAgICAgICAgZS5jaGFuZ2UuYXR0cmlidXRlID09PSAnc2l0ZVJhdGluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVySGVyb1RlbXBsYXRlKClcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51bmJpbmRFdmVudHMoKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHVwKClcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR1cENsb3NlKClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4pXG5cbm1vZHVsZS5leHBvcnRzID0gVHJhY2tlck5ldHdvcmtzXG4iXX0=
