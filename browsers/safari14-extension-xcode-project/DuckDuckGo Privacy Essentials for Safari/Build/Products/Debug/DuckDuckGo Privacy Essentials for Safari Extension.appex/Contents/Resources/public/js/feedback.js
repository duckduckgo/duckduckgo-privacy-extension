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

module.exports = function (uaString) {
  if (!uaString) uaString = window.navigator.userAgent;
  var browser;
  var version;

  try {
    var parsedUaParts = uaString.match(/(Firefox|Chrome|Edg)\/([0-9]+)/);

    if (uaString.match(/(Edge?)\/([0-9]+)/)) {
      // Above regex matches on Chrome first, so check if this is really Edge
      parsedUaParts = uaString.match(/(Edge?)\/([0-9]+)/);
    }

    browser = parsedUaParts[1];
    version = parsedUaParts[2]; // Brave doesn't include any information in the UserAgent

    if (window.navigator.brave) {
      browser = 'Brave';
    }
  } catch (e) {
    // unlikely, prevent extension from exploding if we don't recognize the UA
    browser = version = '';
  }

  return {
    browser: browser,
    version: version
  };
};

},{}],7:[function(require,module,exports){
"use strict";

var Parent = window.DDG.base.Model;

var constants = require('../../../data/constants');

function FeedbackForm(attrs) {
  var _this = this;

  attrs = attrs || {};
  attrs.isBrokenSite = attrs.isBrokenSite || false;
  attrs.url = attrs.url || '';
  attrs.message = attrs.message || '';
  attrs.canSubmit = false;
  attrs.submitted = false;
  attrs.browser = attrs.browser || '';
  attrs.browserVersion = attrs.browserVersion || '';
  Parent.call(this, attrs);
  this.updateCanSubmit(); // grab atb value from background process

  this.fetch({
    getSetting: {
      name: 'atb'
    }
  }).then(function (atb) {
    _this.atb = atb;
  });
  this.fetch({
    getExtensionVersion: true
  }).then(function (extensionVersion) {
    _this.extensionVersion = extensionVersion;
  });
  this.fetch({
    getSetting: {
      name: 'tds-etag'
    }
  }).then(function (etag) {
    _this.tds = etag;
  });
}

FeedbackForm.prototype = window.$.extend({}, Parent.prototype, {
  modelName: 'feedbackForm',
  submit: function submit() {
    var _this2 = this;

    if (!this.canSubmit || this._submitting) {
      return;
    }

    this._submitting = true;
    window.$.ajax(constants.feedbackUrl, {
      method: 'POST',
      data: {
        reason: this.isBrokenSite ? 'broken_site' : 'general',
        url: this.url || '',
        comment: this.message || '',
        browser: this.browser || '',
        browser_version: this.browserVersion || '',
        v: this.extensionVersion || '',
        atb: this.atb || '',
        tds: this.tsd || ''
      },
      success: function success(data) {
        if (data && data.status === 'success') {
          _this2.set('submitted', true);
        } else {
          _this2.set('errored', true);
        }
      },
      error: function error() {
        _this2.set('errored', true);
      }
    });
  },
  toggleBrokenSite: function toggleBrokenSite(val) {
    this.set('isBrokenSite', val);
    this.updateCanSubmit();
    this.reset();
  },
  updateCanSubmit: function updateCanSubmit() {
    if (this.isBrokenSite) {
      this.set('canSubmit', !!(this.url && this.message));
    } else {
      this.set('canSubmit', !!this.message);
    }
  },
  reset: function reset() {
    this.set('url', '');
    this.set('message', '');
    this.set('canSubmit', false);
  }
});
module.exports = FeedbackForm;

},{"../../../data/constants":5}],8:[function(require,module,exports){
"use strict";

var Parent = window.DDG.base.Page;

var mixins = require('./mixins/index.es6');

var parseUserAgentString = require('../../shared-utils/parse-user-agent-string.es6.js');

var FeedbackFormView = require('../views/feedback-form.es6');

var FeedbackFormModel = require('../models/feedback-form.es6');

function Feedback(ops) {
  Parent.call(this, ops);
}

Feedback.prototype = window.$.extend({}, Parent.prototype, mixins.setBrowserClassOnBodyTag, mixins.parseQueryString, {
  pageName: 'feedback',
  ready: function ready() {
    Parent.prototype.ready.call(this);
    this.setBrowserClassOnBodyTag();
    var params = this.parseQueryString(window.location.search);
    var browserInfo = parseUserAgentString();
    this.form = new FeedbackFormView({
      appendTo: window.$('.js-feedback-form'),
      model: new FeedbackFormModel({
        isBrokenSite: params.broken,
        url: decodeURIComponent(params.url || ''),
        browser: browserInfo.browser,
        browserVersion: browserInfo.version
      })
    });
  }
}); // kickoff!

window.DDG = window.DDG || {};
window.DDG.page = new Feedback();

},{"../../shared-utils/parse-user-agent-string.es6.js":6,"../models/feedback-form.es6":7,"../views/feedback-form.es6":13,"./mixins/index.es6":9}],9:[function(require,module,exports){
"use strict";

module.exports = {
  setBrowserClassOnBodyTag: require('./set-browser-class.es6.js'),
  parseQueryString: require('./parse-query-string.es6.js')
};

},{"./parse-query-string.es6.js":10,"./set-browser-class.es6.js":11}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
"use strict";

module.exports = {
  setBrowserClassOnBodyTag: function setBrowserClassOnBodyTag() {
    window.chrome.runtime.sendMessage({
      getBrowser: true
    }, function (browser) {
      if (['edg', 'edge', 'brave'].includes(browser)) {
        browser = 'chrome';
      }

      var browserClass = 'is-browser--' + browser;
      window.$('html').addClass(browserClass);
      window.$('body').addClass(browserClass);
    });
  }
};

},{}],12:[function(require,module,exports){
"use strict";

var _templateObject, _templateObject2, _templateObject3, _templateObject4, _templateObject5;

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('bel');

module.exports = function () {
  var fields;

  if (this.model.submitted || this.model.errored) {
    return showThankYou(this.model.isBrokenSite);
  }

  if (this.model.isBrokenSite) {
    fields = bel(_templateObject || (_templateObject = _taggedTemplateLiteral(["<div>\n            <label class='frm__label'>Which website is broken?</label>\n            <input class='js-feedback-url frm__input' type='text' placeholder='Copy and paste your URL' value='", "'/>\n            <label class='frm__label'>Describe the issue you encountered:</label>\n            <textarea class='frm__text js-feedback-message' required placeholder='Which website content or functionality is broken? Please be as specific as possible.'></textarea>\n        </div>"])), this.model.url);
  } else {
    fields = bel(_templateObject2 || (_templateObject2 = _taggedTemplateLiteral(["<div>\n            <label class='frm__label'>What do you love? What isn't working? How could the extension be improved?</label>\n            <textarea class='frm__text js-feedback-message' placeholder='Which features or functionality does your feedback refer to? Please be as specific as possible.'></textarea>\n        </div>"])));
  }

  return bel(_templateObject3 || (_templateObject3 = _taggedTemplateLiteral(["<form class='frm'>\n        <p>Submitting anonymous feedback helps us improve DuckDuckGo Privacy Essentials.</p>\n        <label class='frm__label'>\n            <input type='checkbox' class='js-feedback-broken-site frm__label__chk'\n                ", "/>\n            I want to report a broken site\n        </label>\n        ", "\n        <input class='btn js-feedback-submit ", "'\n            type='submit' value='Submit' ", "/>\n    </form>"])), this.model.isBrokenSite ? 'checked' : '', fields, this.model.canSubmit ? '' : 'is-disabled', this.model.canSubmit ? '' : 'disabled');
};

function showThankYou(isBrokenSite) {
  if (isBrokenSite) {
    return bel(_templateObject4 || (_templateObject4 = _taggedTemplateLiteral(["<div>\n            <p>Thank you for your feedback!</p>\n            <p>Your broken site reports help our development team fix these breakages.</p>\n        </div>"])));
  } else {
    return bel(_templateObject5 || (_templateObject5 = _taggedTemplateLiteral(["<p>Thank you for your feedback!</p>"])));
  }
}

},{"bel":2}],13:[function(require,module,exports){
"use strict";

var Parent = window.DDG.base.View;

var feedbackFormTemplate = require('../templates/feedback-form.es6');

function FeedbackForm(ops) {
  this.model = ops.model;
  this.template = feedbackFormTemplate;
  Parent.call(this, ops);

  this._setup();
}

FeedbackForm.prototype = window.$.extend({}, Parent.prototype, {
  _setup: function _setup() {
    this._cacheElems('.js-feedback', ['url', 'message', 'broken-site', 'submit']);

    this.bindEvents([[this.store.subscribe, 'change:feedbackForm', this._onModelChange], [this.$url, 'input', this._onUrlChange], [this.$message, 'input', this._onMessageChange], [this.$brokensite, 'change', this._onBrokenSiteChange], [this.$submit, 'click', this._onSubmitClick]]);
  },
  _onModelChange: function _onModelChange(e) {
    if (e.change.attribute === 'isBrokenSite' || e.change.attribute === 'submitted' || e.change.attribute === 'errored') {
      this.unbindEvents();

      this._rerender();

      this._setup();
    } else if (e.change.attribute === 'canSubmit') {
      this.$submit.toggleClass('is-disabled', !this.model.canSubmit);
      this.$submit.attr('disabled', !this.model.canSubmit);
    }
  },
  _onBrokenSiteChange: function _onBrokenSiteChange(e) {
    this.model.toggleBrokenSite(e.target.checked);
  },
  _onUrlChange: function _onUrlChange() {
    this.model.set('url', this.$url.val());
    this.model.updateCanSubmit();
  },
  _onMessageChange: function _onMessageChange() {
    this.model.set('message', this.$message.val());
    this.model.updateCanSubmit();
  },
  _onSubmitClick: function _onSubmitClick(e) {
    e.preventDefault();

    if (!this.model.canSubmit) {
      return;
    }

    this.model.submit();
    this.$submit.addClass('is-disabled');
    this.$submit.val('Sending...');
  }
});
module.exports = FeedbackForm;

},{"../templates/feedback-form.es6":12}]},{},[8])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYmVsL2FwcGVuZENoaWxkLmpzIiwibm9kZV9tb2R1bGVzL2JlbC9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL2h5cGVyc2NyaXB0LWF0dHJpYnV0ZS10by1wcm9wZXJ0eS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9oeXBlcngvaW5kZXguanMiLCJzaGFyZWQvZGF0YS9jb25zdGFudHMuanMiLCJzaGFyZWQvanMvc2hhcmVkLXV0aWxzL3BhcnNlLXVzZXItYWdlbnQtc3RyaW5nLmVzNi5qcyIsInNoYXJlZC9qcy91aS9tb2RlbHMvZmVlZGJhY2stZm9ybS5lczYuanMiLCJzaGFyZWQvanMvdWkvcGFnZXMvZmVlZGJhY2suZXM2LmpzIiwic2hhcmVkL2pzL3VpL3BhZ2VzL21peGlucy9pbmRleC5lczYuanMiLCJzaGFyZWQvanMvdWkvcGFnZXMvbWl4aW5zL3BhcnNlLXF1ZXJ5LXN0cmluZy5lczYuanMiLCJzaGFyZWQvanMvdWkvcGFnZXMvbWl4aW5zL3NldC1icm93c2VyLWNsYXNzLmVzNi5qcyIsInNoYXJlZC9qcy91aS90ZW1wbGF0ZXMvZmVlZGJhY2stZm9ybS5lczYuanMiLCJzaGFyZWQvanMvdWkvdmlld3MvZmVlZGJhY2stZm9ybS5lczYuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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YixDQUFrQixVQUFsQixFQUE4QixDQUFDLEtBQUssS0FBTCxDQUFXLFNBQTFDO0FBQ0g7QUFDSixHQTdCTDtBQStCSSxFQUFBLG1CQUFtQixFQUFFLDZCQUFVLENBQVYsRUFBYTtBQUM5QixTQUFLLEtBQUwsQ0FBVyxnQkFBWCxDQUE0QixDQUFDLENBQUMsTUFBRixDQUFTLE9BQXJDO0FBQ0gsR0FqQ0w7QUFtQ0ksRUFBQSxZQUFZLEVBQUUsd0JBQVk7QUFDdEIsU0FBSyxLQUFMLENBQVcsR0FBWCxDQUFlLEtBQWYsRUFBc0IsS0FBSyxJQUFMLENBQVUsR0FBVixFQUF0QjtBQUNBLFNBQUssS0FBTCxDQUFXLGVBQVg7QUFDSCxHQXRDTDtBQXdDSSxFQUFBLGdCQUFnQixFQUFFLDRCQUFZO0FBQzFCLFNBQUssS0FBTCxDQUFXLEdBQVgsQ0FBZSxTQUFmLEVBQTBCLEtBQUssUUFBTCxDQUFjLEdBQWQsRUFBMUI7QUFDQSxTQUFLLEtBQUwsQ0FBVyxlQUFYO0FBQ0gsR0EzQ0w7QUE2Q0ksRUFBQSxjQUFjLEVBQUUsd0JBQVUsQ0FBVixFQUFhO0FBQ3pCLElBQUEsQ0FBQyxDQUFDLGNBQUY7O0FBRUEsUUFBSSxDQUFDLEtBQUssS0FBTCxDQUFXLFNBQWhCLEVBQTJCO0FBQUU7QUFBUTs7QUFFckMsU0FBSyxLQUFMLENBQVcsTUFBWDtBQUVBLFNBQUssT0FBTCxDQUFhLFFBQWIsQ0FBc0IsYUFBdEI7QUFDQSxTQUFLLE9BQUwsQ0FBYSxHQUFiLENBQWlCLFlBQWpCO0FBQ0g7QUF0REwsQ0FGcUIsQ0FBekI7QUE0REEsTUFBTSxDQUFDLE9BQVAsR0FBaUIsWUFBakIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJ2YXIgdHJhaWxpbmdOZXdsaW5lUmVnZXggPSAvXFxuW1xcc10rJC9cbnZhciBsZWFkaW5nTmV3bGluZVJlZ2V4ID0gL15cXG5bXFxzXSsvXG52YXIgdHJhaWxpbmdTcGFjZVJlZ2V4ID0gL1tcXHNdKyQvXG52YXIgbGVhZGluZ1NwYWNlUmVnZXggPSAvXltcXHNdKy9cbnZhciBtdWx0aVNwYWNlUmVnZXggPSAvW1xcblxcc10rL2dcblxudmFyIFRFWFRfVEFHUyA9IFtcbiAgJ2EnLCAnYWJicicsICdiJywgJ2JkaScsICdiZG8nLCAnYnInLCAnY2l0ZScsICdkYXRhJywgJ2RmbicsICdlbScsICdpJyxcbiAgJ2tiZCcsICdtYXJrJywgJ3EnLCAncnAnLCAncnQnLCAncnRjJywgJ3J1YnknLCAncycsICdhbXAnLCAnc21hbGwnLCAnc3BhbicsXG4gICdzdHJvbmcnLCAnc3ViJywgJ3N1cCcsICd0aW1lJywgJ3UnLCAndmFyJywgJ3dicidcbl1cblxudmFyIFZFUkJBVElNX1RBR1MgPSBbXG4gICdjb2RlJywgJ3ByZScsICd0ZXh0YXJlYSdcbl1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBhcHBlbmRDaGlsZCAoZWwsIGNoaWxkcykge1xuICBpZiAoIUFycmF5LmlzQXJyYXkoY2hpbGRzKSkgcmV0dXJuXG5cbiAgdmFyIG5vZGVOYW1lID0gZWwubm9kZU5hbWUudG9Mb3dlckNhc2UoKVxuXG4gIHZhciBoYWRUZXh0ID0gZmFsc2VcbiAgdmFyIHZhbHVlLCBsZWFkZXJcblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gY2hpbGRzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgdmFyIG5vZGUgPSBjaGlsZHNbaV1cbiAgICBpZiAoQXJyYXkuaXNBcnJheShub2RlKSkge1xuICAgICAgYXBwZW5kQ2hpbGQoZWwsIG5vZGUpXG4gICAgICBjb250aW51ZVxuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygbm9kZSA9PT0gJ251bWJlcicgfHxcbiAgICAgIHR5cGVvZiBub2RlID09PSAnYm9vbGVhbicgfHxcbiAgICAgIHR5cGVvZiBub2RlID09PSAnZnVuY3Rpb24nIHx8XG4gICAgICBub2RlIGluc3RhbmNlb2YgRGF0ZSB8fFxuICAgICAgbm9kZSBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgbm9kZSA9IG5vZGUudG9TdHJpbmcoKVxuICAgIH1cblxuICAgIHZhciBsYXN0Q2hpbGQgPSBlbC5jaGlsZE5vZGVzW2VsLmNoaWxkTm9kZXMubGVuZ3RoIC0gMV1cblxuICAgIC8vIEl0ZXJhdGUgb3ZlciB0ZXh0IG5vZGVzXG4gICAgaWYgKHR5cGVvZiBub2RlID09PSAnc3RyaW5nJykge1xuICAgICAgaGFkVGV4dCA9IHRydWVcblxuICAgICAgLy8gSWYgd2UgYWxyZWFkeSBoYWQgdGV4dCwgYXBwZW5kIHRvIHRoZSBleGlzdGluZyB0ZXh0XG4gICAgICBpZiAobGFzdENoaWxkICYmIGxhc3RDaGlsZC5ub2RlTmFtZSA9PT0gJyN0ZXh0Jykge1xuICAgICAgICBsYXN0Q2hpbGQubm9kZVZhbHVlICs9IG5vZGVcblxuICAgICAgLy8gV2UgZGlkbid0IGhhdmUgYSB0ZXh0IG5vZGUgeWV0LCBjcmVhdGUgb25lXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBub2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUobm9kZSlcbiAgICAgICAgZWwuYXBwZW5kQ2hpbGQobm9kZSlcbiAgICAgICAgbGFzdENoaWxkID0gbm9kZVxuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGlzIGlzIHRoZSBsYXN0IG9mIHRoZSBjaGlsZCBub2RlcywgbWFrZSBzdXJlIHdlIGNsb3NlIGl0IG91dFxuICAgICAgLy8gcmlnaHRcbiAgICAgIGlmIChpID09PSBsZW4gLSAxKSB7XG4gICAgICAgIGhhZFRleHQgPSBmYWxzZVxuICAgICAgICAvLyBUcmltIHRoZSBjaGlsZCB0ZXh0IG5vZGVzIGlmIHRoZSBjdXJyZW50IG5vZGUgaXNuJ3QgYVxuICAgICAgICAvLyBub2RlIHdoZXJlIHdoaXRlc3BhY2UgbWF0dGVycy5cbiAgICAgICAgaWYgKFRFWFRfVEFHUy5pbmRleE9mKG5vZGVOYW1lKSA9PT0gLTEgJiZcbiAgICAgICAgICBWRVJCQVRJTV9UQUdTLmluZGV4T2Yobm9kZU5hbWUpID09PSAtMSkge1xuICAgICAgICAgIHZhbHVlID0gbGFzdENoaWxkLm5vZGVWYWx1ZVxuICAgICAgICAgICAgLnJlcGxhY2UobGVhZGluZ05ld2xpbmVSZWdleCwgJycpXG4gICAgICAgICAgICAucmVwbGFjZSh0cmFpbGluZ1NwYWNlUmVnZXgsICcnKVxuICAgICAgICAgICAgLnJlcGxhY2UodHJhaWxpbmdOZXdsaW5lUmVnZXgsICcnKVxuICAgICAgICAgICAgLnJlcGxhY2UobXVsdGlTcGFjZVJlZ2V4LCAnICcpXG4gICAgICAgICAgaWYgKHZhbHVlID09PSAnJykge1xuICAgICAgICAgICAgZWwucmVtb3ZlQ2hpbGQobGFzdENoaWxkKVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsYXN0Q2hpbGQubm9kZVZhbHVlID0gdmFsdWVcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoVkVSQkFUSU1fVEFHUy5pbmRleE9mKG5vZGVOYW1lKSA9PT0gLTEpIHtcbiAgICAgICAgICAvLyBUaGUgdmVyeSBmaXJzdCBub2RlIGluIHRoZSBsaXN0IHNob3VsZCBub3QgaGF2ZSBsZWFkaW5nXG4gICAgICAgICAgLy8gd2hpdGVzcGFjZS4gU2libGluZyB0ZXh0IG5vZGVzIHNob3VsZCBoYXZlIHdoaXRlc3BhY2UgaWYgdGhlcmVcbiAgICAgICAgICAvLyB3YXMgYW55LlxuICAgICAgICAgIGxlYWRlciA9IGkgPT09IDAgPyAnJyA6ICcgJ1xuICAgICAgICAgIHZhbHVlID0gbGFzdENoaWxkLm5vZGVWYWx1ZVxuICAgICAgICAgICAgLnJlcGxhY2UobGVhZGluZ05ld2xpbmVSZWdleCwgbGVhZGVyKVxuICAgICAgICAgICAgLnJlcGxhY2UobGVhZGluZ1NwYWNlUmVnZXgsICcgJylcbiAgICAgICAgICAgIC5yZXBsYWNlKHRyYWlsaW5nU3BhY2VSZWdleCwgJycpXG4gICAgICAgICAgICAucmVwbGFjZSh0cmFpbGluZ05ld2xpbmVSZWdleCwgJycpXG4gICAgICAgICAgICAucmVwbGFjZShtdWx0aVNwYWNlUmVnZXgsICcgJylcbiAgICAgICAgICBsYXN0Q2hpbGQubm9kZVZhbHVlID0gdmFsdWVcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgLy8gSXRlcmF0ZSBvdmVyIERPTSBub2Rlc1xuICAgIH0gZWxzZSBpZiAobm9kZSAmJiBub2RlLm5vZGVUeXBlKSB7XG4gICAgICAvLyBJZiB0aGUgbGFzdCBub2RlIHdhcyBhIHRleHQgbm9kZSwgbWFrZSBzdXJlIGl0IGlzIHByb3Blcmx5IGNsb3NlZCBvdXRcbiAgICAgIGlmIChoYWRUZXh0KSB7XG4gICAgICAgIGhhZFRleHQgPSBmYWxzZVxuXG4gICAgICAgIC8vIFRyaW0gdGhlIGNoaWxkIHRleHQgbm9kZXMgaWYgdGhlIGN1cnJlbnQgbm9kZSBpc24ndCBhXG4gICAgICAgIC8vIHRleHQgbm9kZSBvciBhIGNvZGUgbm9kZVxuICAgICAgICBpZiAoVEVYVF9UQUdTLmluZGV4T2Yobm9kZU5hbWUpID09PSAtMSAmJlxuICAgICAgICAgIFZFUkJBVElNX1RBR1MuaW5kZXhPZihub2RlTmFtZSkgPT09IC0xKSB7XG4gICAgICAgICAgdmFsdWUgPSBsYXN0Q2hpbGQubm9kZVZhbHVlXG4gICAgICAgICAgICAucmVwbGFjZShsZWFkaW5nTmV3bGluZVJlZ2V4LCAnJylcbiAgICAgICAgICAgIC5yZXBsYWNlKHRyYWlsaW5nTmV3bGluZVJlZ2V4LCAnJylcbiAgICAgICAgICAgIC5yZXBsYWNlKG11bHRpU3BhY2VSZWdleCwgJyAnKVxuXG4gICAgICAgICAgLy8gUmVtb3ZlIGVtcHR5IHRleHQgbm9kZXMsIGFwcGVuZCBvdGhlcndpc2VcbiAgICAgICAgICBpZiAodmFsdWUgPT09ICcnKSB7XG4gICAgICAgICAgICBlbC5yZW1vdmVDaGlsZChsYXN0Q2hpbGQpXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxhc3RDaGlsZC5ub2RlVmFsdWUgPSB2YWx1ZVxuICAgICAgICAgIH1cbiAgICAgICAgLy8gVHJpbSB0aGUgY2hpbGQgbm9kZXMgaWYgdGhlIGN1cnJlbnQgbm9kZSBpcyBub3QgYSBub2RlXG4gICAgICAgIC8vIHdoZXJlIGFsbCB3aGl0ZXNwYWNlIG11c3QgYmUgcHJlc2VydmVkXG4gICAgICAgIH0gZWxzZSBpZiAoVkVSQkFUSU1fVEFHUy5pbmRleE9mKG5vZGVOYW1lKSA9PT0gLTEpIHtcbiAgICAgICAgICB2YWx1ZSA9IGxhc3RDaGlsZC5ub2RlVmFsdWVcbiAgICAgICAgICAgIC5yZXBsYWNlKGxlYWRpbmdTcGFjZVJlZ2V4LCAnICcpXG4gICAgICAgICAgICAucmVwbGFjZShsZWFkaW5nTmV3bGluZVJlZ2V4LCAnJylcbiAgICAgICAgICAgIC5yZXBsYWNlKHRyYWlsaW5nTmV3bGluZVJlZ2V4LCAnJylcbiAgICAgICAgICAgIC5yZXBsYWNlKG11bHRpU3BhY2VSZWdleCwgJyAnKVxuICAgICAgICAgIGxhc3RDaGlsZC5ub2RlVmFsdWUgPSB2YWx1ZVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIFN0b3JlIHRoZSBsYXN0IG5vZGVuYW1lXG4gICAgICB2YXIgX25vZGVOYW1lID0gbm9kZS5ub2RlTmFtZVxuICAgICAgaWYgKF9ub2RlTmFtZSkgbm9kZU5hbWUgPSBfbm9kZU5hbWUudG9Mb3dlckNhc2UoKVxuXG4gICAgICAvLyBBcHBlbmQgdGhlIG5vZGUgdG8gdGhlIERPTVxuICAgICAgZWwuYXBwZW5kQ2hpbGQobm9kZSlcbiAgICB9XG4gIH1cbn1cbiIsInZhciBoeXBlcnggPSByZXF1aXJlKCdoeXBlcngnKVxudmFyIGFwcGVuZENoaWxkID0gcmVxdWlyZSgnLi9hcHBlbmRDaGlsZCcpXG5cbnZhciBTVkdOUyA9ICdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZydcbnZhciBYTElOS05TID0gJ2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsnXG5cbnZhciBCT09MX1BST1BTID0gW1xuICAnYXV0b2ZvY3VzJywgJ2NoZWNrZWQnLCAnZGVmYXVsdGNoZWNrZWQnLCAnZGlzYWJsZWQnLCAnZm9ybW5vdmFsaWRhdGUnLFxuICAnaW5kZXRlcm1pbmF0ZScsICdyZWFkb25seScsICdyZXF1aXJlZCcsICdzZWxlY3RlZCcsICd3aWxsdmFsaWRhdGUnXG5dXG5cbnZhciBDT01NRU5UX1RBRyA9ICchLS0nXG5cbnZhciBTVkdfVEFHUyA9IFtcbiAgJ3N2ZycsICdhbHRHbHlwaCcsICdhbHRHbHlwaERlZicsICdhbHRHbHlwaEl0ZW0nLCAnYW5pbWF0ZScsICdhbmltYXRlQ29sb3InLFxuICAnYW5pbWF0ZU1vdGlvbicsICdhbmltYXRlVHJhbnNmb3JtJywgJ2NpcmNsZScsICdjbGlwUGF0aCcsICdjb2xvci1wcm9maWxlJyxcbiAgJ2N1cnNvcicsICdkZWZzJywgJ2Rlc2MnLCAnZWxsaXBzZScsICdmZUJsZW5kJywgJ2ZlQ29sb3JNYXRyaXgnLFxuICAnZmVDb21wb25lbnRUcmFuc2ZlcicsICdmZUNvbXBvc2l0ZScsICdmZUNvbnZvbHZlTWF0cml4JyxcbiAgJ2ZlRGlmZnVzZUxpZ2h0aW5nJywgJ2ZlRGlzcGxhY2VtZW50TWFwJywgJ2ZlRGlzdGFudExpZ2h0JywgJ2ZlRmxvb2QnLFxuICAnZmVGdW5jQScsICdmZUZ1bmNCJywgJ2ZlRnVuY0cnLCAnZmVGdW5jUicsICdmZUdhdXNzaWFuQmx1cicsICdmZUltYWdlJyxcbiAgJ2ZlTWVyZ2UnLCAnZmVNZXJnZU5vZGUnLCAnZmVNb3JwaG9sb2d5JywgJ2ZlT2Zmc2V0JywgJ2ZlUG9pbnRMaWdodCcsXG4gICdmZVNwZWN1bGFyTGlnaHRpbmcnLCAnZmVTcG90TGlnaHQnLCAnZmVUaWxlJywgJ2ZlVHVyYnVsZW5jZScsICdmaWx0ZXInLFxuICAnZm9udCcsICdmb250LWZhY2UnLCAnZm9udC1mYWNlLWZvcm1hdCcsICdmb250LWZhY2UtbmFtZScsICdmb250LWZhY2Utc3JjJyxcbiAgJ2ZvbnQtZmFjZS11cmknLCAnZm9yZWlnbk9iamVjdCcsICdnJywgJ2dseXBoJywgJ2dseXBoUmVmJywgJ2hrZXJuJywgJ2ltYWdlJyxcbiAgJ2xpbmUnLCAnbGluZWFyR3JhZGllbnQnLCAnbWFya2VyJywgJ21hc2snLCAnbWV0YWRhdGEnLCAnbWlzc2luZy1nbHlwaCcsXG4gICdtcGF0aCcsICdwYXRoJywgJ3BhdHRlcm4nLCAncG9seWdvbicsICdwb2x5bGluZScsICdyYWRpYWxHcmFkaWVudCcsICdyZWN0JyxcbiAgJ3NldCcsICdzdG9wJywgJ3N3aXRjaCcsICdzeW1ib2wnLCAndGV4dCcsICd0ZXh0UGF0aCcsICd0aXRsZScsICd0cmVmJyxcbiAgJ3RzcGFuJywgJ3VzZScsICd2aWV3JywgJ3ZrZXJuJ1xuXVxuXG5mdW5jdGlvbiBiZWxDcmVhdGVFbGVtZW50ICh0YWcsIHByb3BzLCBjaGlsZHJlbikge1xuICB2YXIgZWxcblxuICAvLyBJZiBhbiBzdmcgdGFnLCBpdCBuZWVkcyBhIG5hbWVzcGFjZVxuICBpZiAoU1ZHX1RBR1MuaW5kZXhPZih0YWcpICE9PSAtMSkge1xuICAgIHByb3BzLm5hbWVzcGFjZSA9IFNWR05TXG4gIH1cblxuICAvLyBJZiB3ZSBhcmUgdXNpbmcgYSBuYW1lc3BhY2VcbiAgdmFyIG5zID0gZmFsc2VcbiAgaWYgKHByb3BzLm5hbWVzcGFjZSkge1xuICAgIG5zID0gcHJvcHMubmFtZXNwYWNlXG4gICAgZGVsZXRlIHByb3BzLm5hbWVzcGFjZVxuICB9XG5cbiAgLy8gQ3JlYXRlIHRoZSBlbGVtZW50XG4gIGlmIChucykge1xuICAgIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKG5zLCB0YWcpXG4gIH0gZWxzZSBpZiAodGFnID09PSBDT01NRU5UX1RBRykge1xuICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVDb21tZW50KHByb3BzLmNvbW1lbnQpXG4gIH0gZWxzZSB7XG4gICAgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZylcbiAgfVxuXG4gIC8vIENyZWF0ZSB0aGUgcHJvcGVydGllc1xuICBmb3IgKHZhciBwIGluIHByb3BzKSB7XG4gICAgaWYgKHByb3BzLmhhc093blByb3BlcnR5KHApKSB7XG4gICAgICB2YXIga2V5ID0gcC50b0xvd2VyQ2FzZSgpXG4gICAgICB2YXIgdmFsID0gcHJvcHNbcF1cbiAgICAgIC8vIE5vcm1hbGl6ZSBjbGFzc05hbWVcbiAgICAgIGlmIChrZXkgPT09ICdjbGFzc25hbWUnKSB7XG4gICAgICAgIGtleSA9ICdjbGFzcydcbiAgICAgICAgcCA9ICdjbGFzcydcbiAgICAgIH1cbiAgICAgIC8vIFRoZSBmb3IgYXR0cmlidXRlIGdldHMgdHJhbnNmb3JtZWQgdG8gaHRtbEZvciwgYnV0IHdlIGp1c3Qgc2V0IGFzIGZvclxuICAgICAgaWYgKHAgPT09ICdodG1sRm9yJykge1xuICAgICAgICBwID0gJ2ZvcidcbiAgICAgIH1cbiAgICAgIC8vIElmIGEgcHJvcGVydHkgaXMgYm9vbGVhbiwgc2V0IGl0c2VsZiB0byB0aGUga2V5XG4gICAgICBpZiAoQk9PTF9QUk9QUy5pbmRleE9mKGtleSkgIT09IC0xKSB7XG4gICAgICAgIGlmICh2YWwgPT09ICd0cnVlJykgdmFsID0ga2V5XG4gICAgICAgIGVsc2UgaWYgKHZhbCA9PT0gJ2ZhbHNlJykgY29udGludWVcbiAgICAgIH1cbiAgICAgIC8vIElmIGEgcHJvcGVydHkgcHJlZmVycyBiZWluZyBzZXQgZGlyZWN0bHkgdnMgc2V0QXR0cmlidXRlXG4gICAgICBpZiAoa2V5LnNsaWNlKDAsIDIpID09PSAnb24nKSB7XG4gICAgICAgIGVsW3BdID0gdmFsXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAobnMpIHtcbiAgICAgICAgICBpZiAocCA9PT0gJ3hsaW5rOmhyZWYnKSB7XG4gICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGVOUyhYTElOS05TLCBwLCB2YWwpXG4gICAgICAgICAgfSBlbHNlIGlmICgvXnhtbG5zKCR8OikvaS50ZXN0KHApKSB7XG4gICAgICAgICAgICAvLyBza2lwIHhtbG5zIGRlZmluaXRpb25zXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZU5TKG51bGwsIHAsIHZhbClcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZWwuc2V0QXR0cmlidXRlKHAsIHZhbClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFwcGVuZENoaWxkKGVsLCBjaGlsZHJlbilcbiAgcmV0dXJuIGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gaHlwZXJ4KGJlbENyZWF0ZUVsZW1lbnQsIHtjb21tZW50czogdHJ1ZX0pXG5tb2R1bGUuZXhwb3J0cy5kZWZhdWx0ID0gbW9kdWxlLmV4cG9ydHNcbm1vZHVsZS5leHBvcnRzLmNyZWF0ZUVsZW1lbnQgPSBiZWxDcmVhdGVFbGVtZW50XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGF0dHJpYnV0ZVRvUHJvcGVydHlcblxudmFyIHRyYW5zZm9ybSA9IHtcbiAgJ2NsYXNzJzogJ2NsYXNzTmFtZScsXG4gICdmb3InOiAnaHRtbEZvcicsXG4gICdodHRwLWVxdWl2JzogJ2h0dHBFcXVpdidcbn1cblxuZnVuY3Rpb24gYXR0cmlidXRlVG9Qcm9wZXJ0eSAoaCkge1xuICByZXR1cm4gZnVuY3Rpb24gKHRhZ05hbWUsIGF0dHJzLCBjaGlsZHJlbikge1xuICAgIGZvciAodmFyIGF0dHIgaW4gYXR0cnMpIHtcbiAgICAgIGlmIChhdHRyIGluIHRyYW5zZm9ybSkge1xuICAgICAgICBhdHRyc1t0cmFuc2Zvcm1bYXR0cl1dID0gYXR0cnNbYXR0cl1cbiAgICAgICAgZGVsZXRlIGF0dHJzW2F0dHJdXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBoKHRhZ05hbWUsIGF0dHJzLCBjaGlsZHJlbilcbiAgfVxufVxuIiwidmFyIGF0dHJUb1Byb3AgPSByZXF1aXJlKCdoeXBlcnNjcmlwdC1hdHRyaWJ1dGUtdG8tcHJvcGVydHknKVxuXG52YXIgVkFSID0gMCwgVEVYVCA9IDEsIE9QRU4gPSAyLCBDTE9TRSA9IDMsIEFUVFIgPSA0XG52YXIgQVRUUl9LRVkgPSA1LCBBVFRSX0tFWV9XID0gNlxudmFyIEFUVFJfVkFMVUVfVyA9IDcsIEFUVFJfVkFMVUUgPSA4XG52YXIgQVRUUl9WQUxVRV9TUSA9IDksIEFUVFJfVkFMVUVfRFEgPSAxMFxudmFyIEFUVFJfRVEgPSAxMSwgQVRUUl9CUkVBSyA9IDEyXG52YXIgQ09NTUVOVCA9IDEzXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGgsIG9wdHMpIHtcbiAgaWYgKCFvcHRzKSBvcHRzID0ge31cbiAgdmFyIGNvbmNhdCA9IG9wdHMuY29uY2F0IHx8IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgcmV0dXJuIFN0cmluZyhhKSArIFN0cmluZyhiKVxuICB9XG4gIGlmIChvcHRzLmF0dHJUb1Byb3AgIT09IGZhbHNlKSB7XG4gICAgaCA9IGF0dHJUb1Byb3AoaClcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbiAoc3RyaW5ncykge1xuICAgIHZhciBzdGF0ZSA9IFRFWFQsIHJlZyA9ICcnXG4gICAgdmFyIGFyZ2xlbiA9IGFyZ3VtZW50cy5sZW5ndGhcbiAgICB2YXIgcGFydHMgPSBbXVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHJpbmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoaSA8IGFyZ2xlbiAtIDEpIHtcbiAgICAgICAgdmFyIGFyZyA9IGFyZ3VtZW50c1tpKzFdXG4gICAgICAgIHZhciBwID0gcGFyc2Uoc3RyaW5nc1tpXSlcbiAgICAgICAgdmFyIHhzdGF0ZSA9IHN0YXRlXG4gICAgICAgIGlmICh4c3RhdGUgPT09IEFUVFJfVkFMVUVfRFEpIHhzdGF0ZSA9IEFUVFJfVkFMVUVcbiAgICAgICAgaWYgKHhzdGF0ZSA9PT0gQVRUUl9WQUxVRV9TUSkgeHN0YXRlID0gQVRUUl9WQUxVRVxuICAgICAgICBpZiAoeHN0YXRlID09PSBBVFRSX1ZBTFVFX1cpIHhzdGF0ZSA9IEFUVFJfVkFMVUVcbiAgICAgICAgaWYgKHhzdGF0ZSA9PT0gQVRUUikgeHN0YXRlID0gQVRUUl9LRVlcbiAgICAgICAgaWYgKHhzdGF0ZSA9PT0gT1BFTikge1xuICAgICAgICAgIGlmIChyZWcgPT09ICcvJykge1xuICAgICAgICAgICAgcC5wdXNoKFsgT1BFTiwgJy8nLCBhcmcgXSlcbiAgICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHAucHVzaChbIE9QRU4sIGFyZyBdKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh4c3RhdGUgPT09IENPTU1FTlQgJiYgb3B0cy5jb21tZW50cykge1xuICAgICAgICAgIHJlZyArPSBTdHJpbmcoYXJnKVxuICAgICAgICB9IGVsc2UgaWYgKHhzdGF0ZSAhPT0gQ09NTUVOVCkge1xuICAgICAgICAgIHAucHVzaChbIFZBUiwgeHN0YXRlLCBhcmcgXSlcbiAgICAgICAgfVxuICAgICAgICBwYXJ0cy5wdXNoLmFwcGx5KHBhcnRzLCBwKVxuICAgICAgfSBlbHNlIHBhcnRzLnB1c2guYXBwbHkocGFydHMsIHBhcnNlKHN0cmluZ3NbaV0pKVxuICAgIH1cblxuICAgIHZhciB0cmVlID0gW251bGwse30sW11dXG4gICAgdmFyIHN0YWNrID0gW1t0cmVlLC0xXV1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgY3VyID0gc3RhY2tbc3RhY2subGVuZ3RoLTFdWzBdXG4gICAgICB2YXIgcCA9IHBhcnRzW2ldLCBzID0gcFswXVxuICAgICAgaWYgKHMgPT09IE9QRU4gJiYgL15cXC8vLnRlc3QocFsxXSkpIHtcbiAgICAgICAgdmFyIGl4ID0gc3RhY2tbc3RhY2subGVuZ3RoLTFdWzFdXG4gICAgICAgIGlmIChzdGFjay5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgc3RhY2sucG9wKClcbiAgICAgICAgICBzdGFja1tzdGFjay5sZW5ndGgtMV1bMF1bMl1baXhdID0gaChcbiAgICAgICAgICAgIGN1clswXSwgY3VyWzFdLCBjdXJbMl0ubGVuZ3RoID8gY3VyWzJdIDogdW5kZWZpbmVkXG4gICAgICAgICAgKVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHMgPT09IE9QRU4pIHtcbiAgICAgICAgdmFyIGMgPSBbcFsxXSx7fSxbXV1cbiAgICAgICAgY3VyWzJdLnB1c2goYylcbiAgICAgICAgc3RhY2sucHVzaChbYyxjdXJbMl0ubGVuZ3RoLTFdKVxuICAgICAgfSBlbHNlIGlmIChzID09PSBBVFRSX0tFWSB8fCAocyA9PT0gVkFSICYmIHBbMV0gPT09IEFUVFJfS0VZKSkge1xuICAgICAgICB2YXIga2V5ID0gJydcbiAgICAgICAgdmFyIGNvcHlLZXlcbiAgICAgICAgZm9yICg7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChwYXJ0c1tpXVswXSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgICAgIGtleSA9IGNvbmNhdChrZXksIHBhcnRzW2ldWzFdKVxuICAgICAgICAgIH0gZWxzZSBpZiAocGFydHNbaV1bMF0gPT09IFZBUiAmJiBwYXJ0c1tpXVsxXSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcGFydHNbaV1bMl0gPT09ICdvYmplY3QnICYmICFrZXkpIHtcbiAgICAgICAgICAgICAgZm9yIChjb3B5S2V5IGluIHBhcnRzW2ldWzJdKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnRzW2ldWzJdLmhhc093blByb3BlcnR5KGNvcHlLZXkpICYmICFjdXJbMV1bY29weUtleV0pIHtcbiAgICAgICAgICAgICAgICAgIGN1clsxXVtjb3B5S2V5XSA9IHBhcnRzW2ldWzJdW2NvcHlLZXldXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBrZXkgPSBjb25jYXQoa2V5LCBwYXJ0c1tpXVsyXSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgYnJlYWtcbiAgICAgICAgfVxuICAgICAgICBpZiAocGFydHNbaV1bMF0gPT09IEFUVFJfRVEpIGkrK1xuICAgICAgICB2YXIgaiA9IGlcbiAgICAgICAgZm9yICg7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChwYXJ0c1tpXVswXSA9PT0gQVRUUl9WQUxVRSB8fCBwYXJ0c1tpXVswXSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgICAgIGlmICghY3VyWzFdW2tleV0pIGN1clsxXVtrZXldID0gc3RyZm4ocGFydHNbaV1bMV0pXG4gICAgICAgICAgICBlbHNlIHBhcnRzW2ldWzFdPT09XCJcIiB8fCAoY3VyWzFdW2tleV0gPSBjb25jYXQoY3VyWzFdW2tleV0sIHBhcnRzW2ldWzFdKSk7XG4gICAgICAgICAgfSBlbHNlIGlmIChwYXJ0c1tpXVswXSA9PT0gVkFSXG4gICAgICAgICAgJiYgKHBhcnRzW2ldWzFdID09PSBBVFRSX1ZBTFVFIHx8IHBhcnRzW2ldWzFdID09PSBBVFRSX0tFWSkpIHtcbiAgICAgICAgICAgIGlmICghY3VyWzFdW2tleV0pIGN1clsxXVtrZXldID0gc3RyZm4ocGFydHNbaV1bMl0pXG4gICAgICAgICAgICBlbHNlIHBhcnRzW2ldWzJdPT09XCJcIiB8fCAoY3VyWzFdW2tleV0gPSBjb25jYXQoY3VyWzFdW2tleV0sIHBhcnRzW2ldWzJdKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChrZXkubGVuZ3RoICYmICFjdXJbMV1ba2V5XSAmJiBpID09PSBqXG4gICAgICAgICAgICAmJiAocGFydHNbaV1bMF0gPT09IENMT1NFIHx8IHBhcnRzW2ldWzBdID09PSBBVFRSX0JSRUFLKSkge1xuICAgICAgICAgICAgICAvLyBodHRwczovL2h0bWwuc3BlYy53aGF0d2cub3JnL211bHRpcGFnZS9pbmZyYXN0cnVjdHVyZS5odG1sI2Jvb2xlYW4tYXR0cmlidXRlc1xuICAgICAgICAgICAgICAvLyBlbXB0eSBzdHJpbmcgaXMgZmFsc3ksIG5vdCB3ZWxsIGJlaGF2ZWQgdmFsdWUgaW4gYnJvd3NlclxuICAgICAgICAgICAgICBjdXJbMV1ba2V5XSA9IGtleS50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocGFydHNbaV1bMF0gPT09IENMT1NFKSB7XG4gICAgICAgICAgICAgIGktLVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgY3VyWzFdW3BbMV1dID0gdHJ1ZVxuICAgICAgfSBlbHNlIGlmIChzID09PSBWQVIgJiYgcFsxXSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgY3VyWzFdW3BbMl1dID0gdHJ1ZVxuICAgICAgfSBlbHNlIGlmIChzID09PSBDTE9TRSkge1xuICAgICAgICBpZiAoc2VsZkNsb3NpbmcoY3VyWzBdKSAmJiBzdGFjay5sZW5ndGgpIHtcbiAgICAgICAgICB2YXIgaXggPSBzdGFja1tzdGFjay5sZW5ndGgtMV1bMV1cbiAgICAgICAgICBzdGFjay5wb3AoKVxuICAgICAgICAgIHN0YWNrW3N0YWNrLmxlbmd0aC0xXVswXVsyXVtpeF0gPSBoKFxuICAgICAgICAgICAgY3VyWzBdLCBjdXJbMV0sIGN1clsyXS5sZW5ndGggPyBjdXJbMl0gOiB1bmRlZmluZWRcbiAgICAgICAgICApXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gVkFSICYmIHBbMV0gPT09IFRFWFQpIHtcbiAgICAgICAgaWYgKHBbMl0gPT09IHVuZGVmaW5lZCB8fCBwWzJdID09PSBudWxsKSBwWzJdID0gJydcbiAgICAgICAgZWxzZSBpZiAoIXBbMl0pIHBbMl0gPSBjb25jYXQoJycsIHBbMl0pXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHBbMl1bMF0pKSB7XG4gICAgICAgICAgY3VyWzJdLnB1c2guYXBwbHkoY3VyWzJdLCBwWzJdKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGN1clsyXS5wdXNoKHBbMl0pXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gVEVYVCkge1xuICAgICAgICBjdXJbMl0ucHVzaChwWzFdKVxuICAgICAgfSBlbHNlIGlmIChzID09PSBBVFRSX0VRIHx8IHMgPT09IEFUVFJfQlJFQUspIHtcbiAgICAgICAgLy8gbm8tb3BcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigndW5oYW5kbGVkOiAnICsgcylcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodHJlZVsyXS5sZW5ndGggPiAxICYmIC9eXFxzKiQvLnRlc3QodHJlZVsyXVswXSkpIHtcbiAgICAgIHRyZWVbMl0uc2hpZnQoKVxuICAgIH1cblxuICAgIGlmICh0cmVlWzJdLmxlbmd0aCA+IDJcbiAgICB8fCAodHJlZVsyXS5sZW5ndGggPT09IDIgJiYgL1xcUy8udGVzdCh0cmVlWzJdWzFdKSkpIHtcbiAgICAgIGlmIChvcHRzLmNyZWF0ZUZyYWdtZW50KSByZXR1cm4gb3B0cy5jcmVhdGVGcmFnbWVudCh0cmVlWzJdKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnbXVsdGlwbGUgcm9vdCBlbGVtZW50cyBtdXN0IGJlIHdyYXBwZWQgaW4gYW4gZW5jbG9zaW5nIHRhZydcbiAgICAgIClcbiAgICB9XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodHJlZVsyXVswXSkgJiYgdHlwZW9mIHRyZWVbMl1bMF1bMF0gPT09ICdzdHJpbmcnXG4gICAgJiYgQXJyYXkuaXNBcnJheSh0cmVlWzJdWzBdWzJdKSkge1xuICAgICAgdHJlZVsyXVswXSA9IGgodHJlZVsyXVswXVswXSwgdHJlZVsyXVswXVsxXSwgdHJlZVsyXVswXVsyXSlcbiAgICB9XG4gICAgcmV0dXJuIHRyZWVbMl1bMF1cblxuICAgIGZ1bmN0aW9uIHBhcnNlIChzdHIpIHtcbiAgICAgIHZhciByZXMgPSBbXVxuICAgICAgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX1cpIHN0YXRlID0gQVRUUlxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGMgPSBzdHIuY2hhckF0KGkpXG4gICAgICAgIGlmIChzdGF0ZSA9PT0gVEVYVCAmJiBjID09PSAnPCcpIHtcbiAgICAgICAgICBpZiAocmVnLmxlbmd0aCkgcmVzLnB1c2goW1RFWFQsIHJlZ10pXG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IE9QRU5cbiAgICAgICAgfSBlbHNlIGlmIChjID09PSAnPicgJiYgIXF1b3Qoc3RhdGUpICYmIHN0YXRlICE9PSBDT01NRU5UKSB7XG4gICAgICAgICAgaWYgKHN0YXRlID09PSBPUEVOICYmIHJlZy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJlcy5wdXNoKFtPUEVOLHJlZ10pXG4gICAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX0tFWSxyZWddKVxuICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUUgJiYgcmVnLmxlbmd0aCkge1xuICAgICAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnXSlcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzLnB1c2goW0NMT1NFXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gVEVYVFxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBDT01NRU5UICYmIC8tJC8udGVzdChyZWcpICYmIGMgPT09ICctJykge1xuICAgICAgICAgIGlmIChvcHRzLmNvbW1lbnRzKSB7XG4gICAgICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWcuc3Vic3RyKDAsIHJlZy5sZW5ndGggLSAxKV0pXG4gICAgICAgICAgfVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBURVhUXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IE9QRU4gJiYgL14hLS0kLy50ZXN0KHJlZykpIHtcbiAgICAgICAgICBpZiAob3B0cy5jb21tZW50cykge1xuICAgICAgICAgICAgcmVzLnB1c2goW09QRU4sIHJlZ10sW0FUVFJfS0VZLCdjb21tZW50J10sW0FUVFJfRVFdKVxuICAgICAgICAgIH1cbiAgICAgICAgICByZWcgPSBjXG4gICAgICAgICAgc3RhdGUgPSBDT01NRU5UXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IFRFWFQgfHwgc3RhdGUgPT09IENPTU1FTlQpIHtcbiAgICAgICAgICByZWcgKz0gY1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBPUEVOICYmIGMgPT09ICcvJyAmJiByZWcubGVuZ3RoKSB7XG4gICAgICAgICAgLy8gbm8tb3AsIHNlbGYgY2xvc2luZyB0YWcgd2l0aG91dCBhIHNwYWNlIDxici8+XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IE9QRU4gJiYgL1xccy8udGVzdChjKSkge1xuICAgICAgICAgIGlmIChyZWcubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXMucHVzaChbT1BFTiwgcmVnXSlcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gT1BFTikge1xuICAgICAgICAgIHJlZyArPSBjXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFIgJiYgL1teXFxzXCInPS9dLy50ZXN0KGMpKSB7XG4gICAgICAgICAgc3RhdGUgPSBBVFRSX0tFWVxuICAgICAgICAgIHJlZyA9IGNcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUiAmJiAvXFxzLy50ZXN0KGMpKSB7XG4gICAgICAgICAgaWYgKHJlZy5sZW5ndGgpIHJlcy5wdXNoKFtBVFRSX0tFWSxyZWddKVxuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX0JSRUFLXSlcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9LRVkgJiYgL1xccy8udGVzdChjKSkge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX0tFWSxyZWddKVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBBVFRSX0tFWV9XXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfS0VZICYmIGMgPT09ICc9Jykge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX0tFWSxyZWddLFtBVFRSX0VRXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gQVRUUl9WQUxVRV9XXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfS0VZKSB7XG4gICAgICAgICAgcmVnICs9IGNcbiAgICAgICAgfSBlbHNlIGlmICgoc3RhdGUgPT09IEFUVFJfS0VZX1cgfHwgc3RhdGUgPT09IEFUVFIpICYmIGMgPT09ICc9Jykge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX0VRXSlcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJfVkFMVUVfV1xuICAgICAgICB9IGVsc2UgaWYgKChzdGF0ZSA9PT0gQVRUUl9LRVlfVyB8fCBzdGF0ZSA9PT0gQVRUUikgJiYgIS9cXHMvLnRlc3QoYykpIHtcbiAgICAgICAgICByZXMucHVzaChbQVRUUl9CUkVBS10pXG4gICAgICAgICAgaWYgKC9bXFx3LV0vLnRlc3QoYykpIHtcbiAgICAgICAgICAgIHJlZyArPSBjXG4gICAgICAgICAgICBzdGF0ZSA9IEFUVFJfS0VZXG4gICAgICAgICAgfSBlbHNlIHN0YXRlID0gQVRUUlxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX1cgJiYgYyA9PT0gJ1wiJykge1xuICAgICAgICAgIHN0YXRlID0gQVRUUl9WQUxVRV9EUVxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX1cgJiYgYyA9PT0gXCInXCIpIHtcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJfVkFMVUVfU1FcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9EUSAmJiBjID09PSAnXCInKSB7XG4gICAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnXSxbQVRUUl9CUkVBS10pXG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9TUSAmJiBjID09PSBcIidcIikge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX1ZBTFVFLHJlZ10sW0FUVFJfQlJFQUtdKVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBBVFRSXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUVfVyAmJiAhL1xccy8udGVzdChjKSkge1xuICAgICAgICAgIHN0YXRlID0gQVRUUl9WQUxVRVxuICAgICAgICAgIGktLVxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFICYmIC9cXHMvLnRlc3QoYykpIHtcbiAgICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWddLFtBVFRSX0JSRUFLXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gQVRUUlxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFIHx8IHN0YXRlID09PSBBVFRSX1ZBTFVFX1NRXG4gICAgICAgIHx8IHN0YXRlID09PSBBVFRSX1ZBTFVFX0RRKSB7XG4gICAgICAgICAgcmVnICs9IGNcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHN0YXRlID09PSBURVhUICYmIHJlZy5sZW5ndGgpIHtcbiAgICAgICAgcmVzLnB1c2goW1RFWFQscmVnXSlcbiAgICAgICAgcmVnID0gJydcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUUgJiYgcmVnLmxlbmd0aCkge1xuICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWddKVxuICAgICAgICByZWcgPSAnJ1xuICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9EUSAmJiByZWcubGVuZ3RoKSB7XG4gICAgICAgIHJlcy5wdXNoKFtBVFRSX1ZBTFVFLHJlZ10pXG4gICAgICAgIHJlZyA9ICcnXG4gICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX1NRICYmIHJlZy5sZW5ndGgpIHtcbiAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnXSlcbiAgICAgICAgcmVnID0gJydcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfS0VZKSB7XG4gICAgICAgIHJlcy5wdXNoKFtBVFRSX0tFWSxyZWddKVxuICAgICAgICByZWcgPSAnJ1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHN0cmZuICh4KSB7XG4gICAgaWYgKHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nKSByZXR1cm4geFxuICAgIGVsc2UgaWYgKHR5cGVvZiB4ID09PSAnc3RyaW5nJykgcmV0dXJuIHhcbiAgICBlbHNlIGlmICh4ICYmIHR5cGVvZiB4ID09PSAnb2JqZWN0JykgcmV0dXJuIHhcbiAgICBlbHNlIGlmICh4ID09PSBudWxsIHx8IHggPT09IHVuZGVmaW5lZCkgcmV0dXJuIHhcbiAgICBlbHNlIHJldHVybiBjb25jYXQoJycsIHgpXG4gIH1cbn1cblxuZnVuY3Rpb24gcXVvdCAoc3RhdGUpIHtcbiAgcmV0dXJuIHN0YXRlID09PSBBVFRSX1ZBTFVFX1NRIHx8IHN0YXRlID09PSBBVFRSX1ZBTFVFX0RRXG59XG5cbnZhciBjbG9zZVJFID0gUmVnRXhwKCdeKCcgKyBbXG4gICdhcmVhJywgJ2Jhc2UnLCAnYmFzZWZvbnQnLCAnYmdzb3VuZCcsICdicicsICdjb2wnLCAnY29tbWFuZCcsICdlbWJlZCcsXG4gICdmcmFtZScsICdocicsICdpbWcnLCAnaW5wdXQnLCAnaXNpbmRleCcsICdrZXlnZW4nLCAnbGluaycsICdtZXRhJywgJ3BhcmFtJyxcbiAgJ3NvdXJjZScsICd0cmFjaycsICd3YnInLCAnIS0tJyxcbiAgLy8gU1ZHIFRBR1NcbiAgJ2FuaW1hdGUnLCAnYW5pbWF0ZVRyYW5zZm9ybScsICdjaXJjbGUnLCAnY3Vyc29yJywgJ2Rlc2MnLCAnZWxsaXBzZScsXG4gICdmZUJsZW5kJywgJ2ZlQ29sb3JNYXRyaXgnLCAnZmVDb21wb3NpdGUnLFxuICAnZmVDb252b2x2ZU1hdHJpeCcsICdmZURpZmZ1c2VMaWdodGluZycsICdmZURpc3BsYWNlbWVudE1hcCcsXG4gICdmZURpc3RhbnRMaWdodCcsICdmZUZsb29kJywgJ2ZlRnVuY0EnLCAnZmVGdW5jQicsICdmZUZ1bmNHJywgJ2ZlRnVuY1InLFxuICAnZmVHYXVzc2lhbkJsdXInLCAnZmVJbWFnZScsICdmZU1lcmdlTm9kZScsICdmZU1vcnBob2xvZ3knLFxuICAnZmVPZmZzZXQnLCAnZmVQb2ludExpZ2h0JywgJ2ZlU3BlY3VsYXJMaWdodGluZycsICdmZVNwb3RMaWdodCcsICdmZVRpbGUnLFxuICAnZmVUdXJidWxlbmNlJywgJ2ZvbnQtZmFjZS1mb3JtYXQnLCAnZm9udC1mYWNlLW5hbWUnLCAnZm9udC1mYWNlLXVyaScsXG4gICdnbHlwaCcsICdnbHlwaFJlZicsICdoa2VybicsICdpbWFnZScsICdsaW5lJywgJ21pc3NpbmctZ2x5cGgnLCAnbXBhdGgnLFxuICAncGF0aCcsICdwb2x5Z29uJywgJ3BvbHlsaW5lJywgJ3JlY3QnLCAnc2V0JywgJ3N0b3AnLCAndHJlZicsICd1c2UnLCAndmlldycsXG4gICd2a2Vybidcbl0uam9pbignfCcpICsgJykoPzpbXFwuI11bYS16QS1aMC05XFx1MDA3Ri1cXHVGRkZGXzotXSspKiQnKVxuZnVuY3Rpb24gc2VsZkNsb3NpbmcgKHRhZykgeyByZXR1cm4gY2xvc2VSRS50ZXN0KHRhZykgfVxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgXCJlbnRpdHlMaXN0XCI6IFwiaHR0cHM6Ly9kdWNrZHVja2dvLmNvbS9jb250ZW50YmxvY2tpbmcuanM/bD1lbnRpdHlsaXN0MlwiLFxuICAgIFwiZW50aXR5TWFwXCI6IFwiZGF0YS90cmFja2VyX2xpc3RzL2VudGl0eU1hcC5qc29uXCIsXG4gICAgXCJkaXNwbGF5Q2F0ZWdvcmllc1wiOiBbXCJBbmFseXRpY3NcIiwgXCJBZHZlcnRpc2luZ1wiLCBcIlNvY2lhbCBOZXR3b3JrXCJdLFxuICAgIFwicmVxdWVzdExpc3RlbmVyVHlwZXNcIjogW1wibWFpbl9mcmFtZVwiLFwic3ViX2ZyYW1lXCIsXCJzdHlsZXNoZWV0XCIsXCJzY3JpcHRcIixcImltYWdlXCIsXCJvYmplY3RcIixcInhtbGh0dHByZXF1ZXN0XCIsXCJvdGhlclwiXSxcbiAgICBcImZlZWRiYWNrVXJsXCI6IFwiaHR0cHM6Ly9kdWNrZHVja2dvLmNvbS9mZWVkYmFjay5qcz90eXBlPWV4dGVuc2lvbi1mZWVkYmFja1wiLFxuICAgIFwidG9zZHJNZXNzYWdlc1wiIDoge1xuICAgICAgICBcIkFcIjogXCJHb29kXCIsXG4gICAgICAgIFwiQlwiOiBcIk1peGVkXCIsXG4gICAgICAgIFwiQ1wiOiBcIlBvb3JcIixcbiAgICAgICAgXCJEXCI6IFwiUG9vclwiLFxuICAgICAgICBcIkVcIjogXCJQb29yXCIsXG4gICAgICAgIFwiZ29vZFwiOiBcIkdvb2RcIixcbiAgICAgICAgXCJiYWRcIjogXCJQb29yXCIsXG4gICAgICAgIFwidW5rbm93blwiOiBcIlVua25vd25cIixcbiAgICAgICAgXCJtaXhlZFwiOiBcIk1peGVkXCJcbiAgICB9LFxuICAgIFwiaHR0cHNTZXJ2aWNlXCI6IFwiaHR0cHM6Ly9kdWNrZHVja2dvLmNvbS9zbWFydGVyX2VuY3J5cHRpb24uanNcIixcbiAgICBcImR1Y2tEdWNrR29TZXJwSG9zdG5hbWVcIjogXCJkdWNrZHVja2dvLmNvbVwiLFxuICAgIFwiaHR0cHNNZXNzYWdlc1wiOiB7XG4gICAgICAgIFwic2VjdXJlXCI6IFwiRW5jcnlwdGVkIENvbm5lY3Rpb25cIixcbiAgICAgICAgXCJ1cGdyYWRlZFwiOiBcIkZvcmNlZCBFbmNyeXB0aW9uXCIsXG4gICAgICAgIFwibm9uZVwiOiBcIlVuZW5jcnlwdGVkIENvbm5lY3Rpb25cIixcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIE1ham9yIHRyYWNraW5nIG5ldHdvcmtzIGRhdGE6XG4gICAgICogcGVyY2VudCBvZiB0aGUgdG9wIDEgbWlsbGlvbiBzaXRlcyBhIHRyYWNraW5nIG5ldHdvcmsgaGFzIGJlZW4gc2VlbiBvbi5cbiAgICAgKiBzZWU6IGh0dHBzOi8vd2VidHJhbnNwYXJlbmN5LmNzLnByaW5jZXRvbi5lZHUvd2ViY2Vuc3VzL1xuICAgICAqL1xuICAgIFwibWFqb3JUcmFja2luZ05ldHdvcmtzXCI6IHtcbiAgICAgICAgXCJnb29nbGVcIjogODQsXG4gICAgICAgIFwiZmFjZWJvb2tcIjogMzYsXG4gICAgICAgIFwidHdpdHRlclwiOiAxNixcbiAgICAgICAgXCJhbWF6b25cIjogMTQsXG4gICAgICAgIFwiYXBwbmV4dXNcIjogMTAsXG4gICAgICAgIFwib3JhY2xlXCI6IDEwLFxuICAgICAgICBcIm1lZGlhbWF0aFwiOiA5LFxuICAgICAgICBcIm9hdGhcIjogOSxcbiAgICAgICAgXCJtYXhjZG5cIjogNyxcbiAgICAgICAgXCJhdXRvbWF0dGljXCI6IDdcbiAgICB9LFxuICAgIC8qXG4gICAgICogTWFwcGluZyBlbnRpdHkgbmFtZXMgdG8gQ1NTIGNsYXNzIG5hbWUgZm9yIHBvcHVwIGljb25zXG4gICAgICovXG4gICAgXCJlbnRpdHlJY29uTWFwcGluZ1wiOiB7XG4gICAgICAgIFwiR29vZ2xlIExMQ1wiOiBcImdvb2dsZVwiLFxuICAgICAgICBcIkZhY2Vib29rLCBJbmMuXCI6IFwiZmFjZWJvb2tcIixcbiAgICAgICAgXCJUd2l0dGVyLCBJbmMuXCI6IFwidHdpdHRlclwiLFxuICAgICAgICBcIkFtYXpvbiBUZWNobm9sb2dpZXMsIEluYy5cIjogXCJhbWF6b25cIixcbiAgICAgICAgXCJBcHBOZXh1cywgSW5jLlwiOiBcImFwcG5leHVzXCIsXG4gICAgICAgIFwiTWVkaWFNYXRoLCBJbmMuXCI6IFwibWVkaWFtYXRoXCIsXG4gICAgICAgIFwiU3RhY2tQYXRoLCBMTENcIjogXCJtYXhjZG5cIixcbiAgICAgICAgXCJBdXRvbWF0dGljLCBJbmMuXCI6IFwiYXV0b21hdHRpY1wiLFxuICAgICAgICBcIkFkb2JlIEluYy5cIjogXCJhZG9iZVwiLFxuICAgICAgICBcIlF1YW50Y2FzdCBDb3Jwb3JhdGlvblwiOiBcInF1YW50Y2FzdFwiLFxuICAgICAgICBcIlRoZSBOaWVsc2VuIENvbXBhbnlcIjogXCJuaWVsc2VuXCJcbiAgICB9LFxuICAgIFwiaHR0cHNEQk5hbWVcIjogXCJodHRwc1wiLFxuICAgIFwiaHR0cHNMaXN0c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVwZ3JhZGUgYmxvb20gZmlsdGVyXCIsXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJodHRwc1VwZ3JhZGVCbG9vbUZpbHRlclwiLFxuICAgICAgICAgICAgXCJ1cmxcIjogXCJodHRwczovL3N0YXRpY2Nkbi5kdWNrZHVja2dvLmNvbS9odHRwcy9odHRwcy1ibG9vbS5qc29uXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZG9uXFwndCB1cGdyYWRlIGJsb29tIGZpbHRlclwiLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiaHR0cHNEb250VXBncmFkZUJsb29tRmlsdGVyc1wiLFxuICAgICAgICAgICAgXCJ1cmxcIjogXCJodHRwczovL3N0YXRpY2Nkbi5kdWNrZHVja2dvLmNvbS9odHRwcy9uZWdhdGl2ZS1odHRwcy1ibG9vbS5qc29uXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidXBncmFkZSBzYWZlbGlzdFwiLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiaHR0cHNVcGdyYWRlTGlzdFwiLFxuICAgICAgICAgICAgXCJ1cmxcIjogXCJodHRwczovL3N0YXRpY2Nkbi5kdWNrZHVja2dvLmNvbS9odHRwcy9uZWdhdGl2ZS1odHRwcy13aGl0ZWxpc3QuanNvblwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImRvblxcJ3QgdXBncmFkZSBzYWZlbGlzdFwiLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiaHR0cHNEb250VXBncmFkZUxpc3RcIixcbiAgICAgICAgICAgIFwidXJsXCI6IFwiaHR0cHM6Ly9zdGF0aWNjZG4uZHVja2R1Y2tnby5jb20vaHR0cHMvaHR0cHMtd2hpdGVsaXN0Lmpzb25cIlxuICAgICAgICB9LFxuICAgIF0sXG4gICAgXCJ0ZHNMaXN0c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInN1cnJvZ2F0ZXNcIixcbiAgICAgICAgICAgIFwidXJsXCI6IFwiL2RhdGEvc3Vycm9nYXRlcy50eHRcIixcbiAgICAgICAgICAgIFwiZm9ybWF0XCI6IFwidGV4dFwiLFxuICAgICAgICAgICAgXCJzb3VyY2VcIjogXCJsb2NhbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInRkc1wiLFxuICAgICAgICAgICAgXCJ1cmxcIjogXCJodHRwczovL3N0YXRpY2Nkbi5kdWNrZHVja2dvLmNvbS90cmFja2VyYmxvY2tpbmcvdjIuMS90ZHMuanNvblwiLFxuICAgICAgICAgICAgXCJmb3JtYXRcIjogXCJqc29uXCIsXG4gICAgICAgICAgICBcInNvdXJjZVwiOiBcImV4dGVybmFsXCIsXG4gICAgICAgICAgICBcImNoYW5uZWxzXCI6IHtcbiAgICAgICAgICAgICAgICBcImxpdmVcIjogXCJodHRwczovL3N0YXRpY2Nkbi5kdWNrZHVja2dvLmNvbS90cmFja2VyYmxvY2tpbmcvdjIuMS90ZHMuanNvblwiLFxuICAgICAgICAgICAgICAgIFwibmV4dFwiOiBcImh0dHBzOi8vc3RhdGljY2RuLmR1Y2tkdWNrZ28uY29tL3RyYWNrZXJibG9ja2luZy92Mi4xL3Rkcy1uZXh0Lmpzb25cIixcbiAgICAgICAgICAgICAgICBcImJldGFcIjogXCJodHRwczovL3N0YXRpY2Nkbi5kdWNrZHVja2dvLmNvbS90cmFja2VyYmxvY2tpbmcvYmV0YS90ZHMuanNvblwiXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkNsaWNrVG9Mb2FkQ29uZmlnXCIsXG4gICAgICAgICAgICBcInVybFwiOiBcImh0dHBzOi8vc3RhdGljY2RuLmR1Y2tkdWNrZ28uY29tL3VzZXJhZ2VudHMvc29jaWFsX2N0cF9jb25maWd1cmF0aW9uLmpzb25cIixcbiAgICAgICAgICAgIFwiZm9ybWF0XCI6IFwianNvblwiLFxuICAgICAgICAgICAgXCJzb3VyY2VcIjogXCJleHRlcm5hbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcImNvbmZpZ1wiLFxuICAgICAgICAgICAgXCJ1cmxcIjogXCJodHRwczovL3N0YXRpY2Nkbi5kdWNrZHVja2dvLmNvbS90cmFja2VyYmxvY2tpbmcvY29uZmlnL3YxL2V4dGVuc2lvbi1jb25maWcuanNvblwiLFxuICAgICAgICAgICAgXCJmb3JtYXRcIjogXCJqc29uXCIsXG4gICAgICAgICAgICBcInNvdXJjZVwiOiBcImV4dGVybmFsXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJodHRwc0Vycm9yQ29kZXNcIjoge1xuICAgICAgICBcIm5ldDo6RVJSX0NPTk5FQ1RJT05fUkVGVVNFRFwiOiAxLFxuICAgICAgICBcIm5ldDo6RVJSX0FCT1JURURcIjogMixcbiAgICAgICAgXCJuZXQ6OkVSUl9TU0xfUFJPVE9DT0xfRVJST1JcIjogMyxcbiAgICAgICAgXCJuZXQ6OkVSUl9TU0xfVkVSU0lPTl9PUl9DSVBIRVJfTUlTTUFUQ0hcIjogNCxcbiAgICAgICAgXCJuZXQ6OkVSUl9OQU1FX05PVF9SRVNPTFZFRFwiOiA1LFxuICAgICAgICBcIk5TX0VSUk9SX0NPTk5FQ1RJT05fUkVGVVNFRFwiOiA2LFxuICAgICAgICBcIk5TX0VSUk9SX1VOS05PV05fSE9TVFwiOiA3LFxuICAgICAgICBcIkFuIGFkZGl0aW9uYWwgcG9saWN5IGNvbnN0cmFpbnQgZmFpbGVkIHdoZW4gdmFsaWRhdGluZyB0aGlzIGNlcnRpZmljYXRlLlwiOiA4LFxuICAgICAgICBcIlVuYWJsZSB0byBjb21tdW5pY2F0ZSBzZWN1cmVseSB3aXRoIHBlZXI6IHJlcXVlc3RlZCBkb21haW4gbmFtZSBkb2VzIG5vdCBtYXRjaCB0aGUgc2VydmVy4oCZcyBjZXJ0aWZpY2F0ZS5cIjogOSxcbiAgICAgICAgXCJDYW5ub3QgY29tbXVuaWNhdGUgc2VjdXJlbHkgd2l0aCBwZWVyOiBubyBjb21tb24gZW5jcnlwdGlvbiBhbGdvcml0aG0ocykuXCI6IDEwLFxuICAgICAgICBcIlNTTCByZWNlaXZlZCBhIHJlY29yZCB0aGF0IGV4Y2VlZGVkIHRoZSBtYXhpbXVtIHBlcm1pc3NpYmxlIGxlbmd0aC5cIjogMTEsXG4gICAgICAgIFwiVGhlIGNlcnRpZmljYXRlIGlzIG5vdCB0cnVzdGVkIGJlY2F1c2UgaXQgaXMgc2VsZi1zaWduZWQuXCI6IDEyLFxuICAgICAgICBcImRvd25ncmFkZV9yZWRpcmVjdF9sb29wXCI6IDEzXG4gICAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSAodWFTdHJpbmcpID0+IHtcbiAgICBpZiAoIXVhU3RyaW5nKSB1YVN0cmluZyA9IHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50XG5cbiAgICBsZXQgYnJvd3NlclxuICAgIGxldCB2ZXJzaW9uXG5cbiAgICB0cnkge1xuICAgICAgICBsZXQgcGFyc2VkVWFQYXJ0cyA9IHVhU3RyaW5nLm1hdGNoKC8oRmlyZWZveHxDaHJvbWV8RWRnKVxcLyhbMC05XSspLylcbiAgICAgICAgaWYgKHVhU3RyaW5nLm1hdGNoKC8oRWRnZT8pXFwvKFswLTldKykvKSkge1xuICAgICAgICAgICAgLy8gQWJvdmUgcmVnZXggbWF0Y2hlcyBvbiBDaHJvbWUgZmlyc3QsIHNvIGNoZWNrIGlmIHRoaXMgaXMgcmVhbGx5IEVkZ2VcbiAgICAgICAgICAgIHBhcnNlZFVhUGFydHMgPSB1YVN0cmluZy5tYXRjaCgvKEVkZ2U/KVxcLyhbMC05XSspLylcbiAgICAgICAgfVxuICAgICAgICBicm93c2VyID0gcGFyc2VkVWFQYXJ0c1sxXVxuICAgICAgICB2ZXJzaW9uID0gcGFyc2VkVWFQYXJ0c1syXVxuXG4gICAgICAgIC8vIEJyYXZlIGRvZXNuJ3QgaW5jbHVkZSBhbnkgaW5mb3JtYXRpb24gaW4gdGhlIFVzZXJBZ2VudFxuICAgICAgICBpZiAod2luZG93Lm5hdmlnYXRvci5icmF2ZSkge1xuICAgICAgICAgICAgYnJvd3NlciA9ICdCcmF2ZSdcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gdW5saWtlbHksIHByZXZlbnQgZXh0ZW5zaW9uIGZyb20gZXhwbG9kaW5nIGlmIHdlIGRvbid0IHJlY29nbml6ZSB0aGUgVUFcbiAgICAgICAgYnJvd3NlciA9IHZlcnNpb24gPSAnJ1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIGJyb3dzZXI6IGJyb3dzZXIsXG4gICAgICAgIHZlcnNpb246IHZlcnNpb25cbiAgICB9XG59XG4iLCJjb25zdCBQYXJlbnQgPSB3aW5kb3cuRERHLmJhc2UuTW9kZWxcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4uLy4uLy4uL2RhdGEvY29uc3RhbnRzJylcblxuZnVuY3Rpb24gRmVlZGJhY2tGb3JtIChhdHRycykge1xuICAgIGF0dHJzID0gYXR0cnMgfHwge31cbiAgICBhdHRycy5pc0Jyb2tlblNpdGUgPSBhdHRycy5pc0Jyb2tlblNpdGUgfHwgZmFsc2VcbiAgICBhdHRycy51cmwgPSBhdHRycy51cmwgfHwgJydcbiAgICBhdHRycy5tZXNzYWdlID0gYXR0cnMubWVzc2FnZSB8fCAnJ1xuICAgIGF0dHJzLmNhblN1Ym1pdCA9IGZhbHNlXG4gICAgYXR0cnMuc3VibWl0dGVkID0gZmFsc2VcblxuICAgIGF0dHJzLmJyb3dzZXIgPSBhdHRycy5icm93c2VyIHx8ICcnXG4gICAgYXR0cnMuYnJvd3NlclZlcnNpb24gPSBhdHRycy5icm93c2VyVmVyc2lvbiB8fCAnJ1xuXG4gICAgUGFyZW50LmNhbGwodGhpcywgYXR0cnMpXG5cbiAgICB0aGlzLnVwZGF0ZUNhblN1Ym1pdCgpXG5cbiAgICAvLyBncmFiIGF0YiB2YWx1ZSBmcm9tIGJhY2tncm91bmQgcHJvY2Vzc1xuICAgIHRoaXMuZmV0Y2goeyBnZXRTZXR0aW5nOiB7IG5hbWU6ICdhdGInIH0gfSlcbiAgICAgICAgLnRoZW4oKGF0YikgPT4geyB0aGlzLmF0YiA9IGF0YiB9KVxuICAgIHRoaXMuZmV0Y2goeyBnZXRFeHRlbnNpb25WZXJzaW9uOiB0cnVlIH0pXG4gICAgICAgIC50aGVuKChleHRlbnNpb25WZXJzaW9uKSA9PiB7IHRoaXMuZXh0ZW5zaW9uVmVyc2lvbiA9IGV4dGVuc2lvblZlcnNpb24gfSlcbiAgICB0aGlzLmZldGNoKHsgZ2V0U2V0dGluZzogeyBuYW1lOiAndGRzLWV0YWcnIH0gfSlcbiAgICAgICAgLnRoZW4oKGV0YWcpID0+IHsgdGhpcy50ZHMgPSBldGFnIH0pXG59XG5cbkZlZWRiYWNrRm9ybS5wcm90b3R5cGUgPSB3aW5kb3cuJC5leHRlbmQoe30sXG4gICAgUGFyZW50LnByb3RvdHlwZSxcbiAgICB7XG4gICAgICAgIG1vZGVsTmFtZTogJ2ZlZWRiYWNrRm9ybScsXG5cbiAgICAgICAgc3VibWl0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuY2FuU3VibWl0IHx8IHRoaXMuX3N1Ym1pdHRpbmcpIHsgcmV0dXJuIH1cblxuICAgICAgICAgICAgdGhpcy5fc3VibWl0dGluZyA9IHRydWVcblxuICAgICAgICAgICAgd2luZG93LiQuYWpheChjb25zdGFudHMuZmVlZGJhY2tVcmwsIHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHJlYXNvbjogdGhpcy5pc0Jyb2tlblNpdGUgPyAnYnJva2VuX3NpdGUnIDogJ2dlbmVyYWwnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IHRoaXMudXJsIHx8ICcnLFxuICAgICAgICAgICAgICAgICAgICBjb21tZW50OiB0aGlzLm1lc3NhZ2UgfHwgJycsXG4gICAgICAgICAgICAgICAgICAgIGJyb3dzZXI6IHRoaXMuYnJvd3NlciB8fCAnJyxcbiAgICAgICAgICAgICAgICAgICAgYnJvd3Nlcl92ZXJzaW9uOiB0aGlzLmJyb3dzZXJWZXJzaW9uIHx8ICcnLFxuICAgICAgICAgICAgICAgICAgICB2OiB0aGlzLmV4dGVuc2lvblZlcnNpb24gfHwgJycsXG4gICAgICAgICAgICAgICAgICAgIGF0YjogdGhpcy5hdGIgfHwgJycsXG4gICAgICAgICAgICAgICAgICAgIHRkczogdGhpcy50c2QgfHwgJydcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhICYmIGRhdGEuc3RhdHVzID09PSAnc3VjY2VzcycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0KCdzdWJtaXR0ZWQnLCB0cnVlKVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXQoJ2Vycm9yZWQnLCB0cnVlKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBlcnJvcjogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldCgnZXJyb3JlZCcsIHRydWUpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSxcblxuICAgICAgICB0b2dnbGVCcm9rZW5TaXRlOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICB0aGlzLnNldCgnaXNCcm9rZW5TaXRlJywgdmFsKVxuICAgICAgICAgICAgdGhpcy51cGRhdGVDYW5TdWJtaXQoKVxuICAgICAgICAgICAgdGhpcy5yZXNldCgpXG4gICAgICAgIH0sXG5cbiAgICAgICAgdXBkYXRlQ2FuU3VibWl0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pc0Jyb2tlblNpdGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldCgnY2FuU3VibWl0JywgISEodGhpcy51cmwgJiYgdGhpcy5tZXNzYWdlKSlcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXQoJ2NhblN1Ym1pdCcsICEhdGhpcy5tZXNzYWdlKVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIHJlc2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLnNldCgndXJsJywgJycpXG4gICAgICAgICAgICB0aGlzLnNldCgnbWVzc2FnZScsICcnKVxuICAgICAgICAgICAgdGhpcy5zZXQoJ2NhblN1Ym1pdCcsIGZhbHNlKVxuICAgICAgICB9XG4gICAgfVxuKVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZlZWRiYWNrRm9ybVxuIiwiY29uc3QgUGFyZW50ID0gd2luZG93LkRERy5iYXNlLlBhZ2VcbmNvbnN0IG1peGlucyA9IHJlcXVpcmUoJy4vbWl4aW5zL2luZGV4LmVzNicpXG5jb25zdCBwYXJzZVVzZXJBZ2VudFN0cmluZyA9IHJlcXVpcmUoJy4uLy4uL3NoYXJlZC11dGlscy9wYXJzZS11c2VyLWFnZW50LXN0cmluZy5lczYuanMnKVxuY29uc3QgRmVlZGJhY2tGb3JtVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL2ZlZWRiYWNrLWZvcm0uZXM2JylcbmNvbnN0IEZlZWRiYWNrRm9ybU1vZGVsID0gcmVxdWlyZSgnLi4vbW9kZWxzL2ZlZWRiYWNrLWZvcm0uZXM2JylcblxuZnVuY3Rpb24gRmVlZGJhY2sgKG9wcykge1xuICAgIFBhcmVudC5jYWxsKHRoaXMsIG9wcylcbn1cblxuRmVlZGJhY2sucHJvdG90eXBlID0gd2luZG93LiQuZXh0ZW5kKHt9LFxuICAgIFBhcmVudC5wcm90b3R5cGUsXG4gICAgbWl4aW5zLnNldEJyb3dzZXJDbGFzc09uQm9keVRhZyxcbiAgICBtaXhpbnMucGFyc2VRdWVyeVN0cmluZyxcbiAgICB7XG5cbiAgICAgICAgcGFnZU5hbWU6ICdmZWVkYmFjaycsXG5cbiAgICAgICAgcmVhZHk6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIFBhcmVudC5wcm90b3R5cGUucmVhZHkuY2FsbCh0aGlzKVxuICAgICAgICAgICAgdGhpcy5zZXRCcm93c2VyQ2xhc3NPbkJvZHlUYWcoKVxuXG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB0aGlzLnBhcnNlUXVlcnlTdHJpbmcod2luZG93LmxvY2F0aW9uLnNlYXJjaClcbiAgICAgICAgICAgIGNvbnN0IGJyb3dzZXJJbmZvID0gcGFyc2VVc2VyQWdlbnRTdHJpbmcoKVxuXG4gICAgICAgICAgICB0aGlzLmZvcm0gPSBuZXcgRmVlZGJhY2tGb3JtVmlldyh7XG4gICAgICAgICAgICAgICAgYXBwZW5kVG86IHdpbmRvdy4kKCcuanMtZmVlZGJhY2stZm9ybScpLFxuICAgICAgICAgICAgICAgIG1vZGVsOiBuZXcgRmVlZGJhY2tGb3JtTW9kZWwoe1xuICAgICAgICAgICAgICAgICAgICBpc0Jyb2tlblNpdGU6IHBhcmFtcy5icm9rZW4sXG4gICAgICAgICAgICAgICAgICAgIHVybDogZGVjb2RlVVJJQ29tcG9uZW50KHBhcmFtcy51cmwgfHwgJycpLFxuICAgICAgICAgICAgICAgICAgICBicm93c2VyOiBicm93c2VySW5mby5icm93c2VyLFxuICAgICAgICAgICAgICAgICAgICBicm93c2VyVmVyc2lvbjogYnJvd3NlckluZm8udmVyc2lvblxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgfVxuKVxuXG4vLyBraWNrb2ZmIVxud2luZG93LkRERyA9IHdpbmRvdy5EREcgfHwge31cbndpbmRvdy5EREcucGFnZSA9IG5ldyBGZWVkYmFjaygpXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBzZXRCcm93c2VyQ2xhc3NPbkJvZHlUYWc6IHJlcXVpcmUoJy4vc2V0LWJyb3dzZXItY2xhc3MuZXM2LmpzJyksXG4gICAgcGFyc2VRdWVyeVN0cmluZzogcmVxdWlyZSgnLi9wYXJzZS1xdWVyeS1zdHJpbmcuZXM2LmpzJylcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHBhcnNlUXVlcnlTdHJpbmc6IChxcykgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIHFzICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd0cmllZCB0byBwYXJzZSBhIG5vbi1zdHJpbmcgcXVlcnkgc3RyaW5nJylcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHBhcnNlZCA9IHt9XG5cbiAgICAgICAgaWYgKHFzWzBdID09PSAnPycpIHtcbiAgICAgICAgICAgIHFzID0gcXMuc3Vic3RyKDEpXG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwYXJ0cyA9IHFzLnNwbGl0KCcmJylcblxuICAgICAgICBwYXJ0cy5mb3JFYWNoKChwYXJ0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBba2V5LCB2YWxdID0gcGFydC5zcGxpdCgnPScpXG5cbiAgICAgICAgICAgIGlmIChrZXkgJiYgdmFsKSB7XG4gICAgICAgICAgICAgICAgcGFyc2VkW2tleV0gPSB2YWxcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgICByZXR1cm4gcGFyc2VkXG4gICAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgc2V0QnJvd3NlckNsYXNzT25Cb2R5VGFnOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHdpbmRvdy5jaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7IGdldEJyb3dzZXI6IHRydWUgfSwgKGJyb3dzZXIpID0+IHtcbiAgICAgICAgICAgIGlmIChbJ2VkZycsICdlZGdlJywgJ2JyYXZlJ10uaW5jbHVkZXMoYnJvd3NlcikpIHtcbiAgICAgICAgICAgICAgICBicm93c2VyID0gJ2Nocm9tZSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGJyb3dzZXJDbGFzcyA9ICdpcy1icm93c2VyLS0nICsgYnJvd3NlclxuICAgICAgICAgICAgd2luZG93LiQoJ2h0bWwnKS5hZGRDbGFzcyhicm93c2VyQ2xhc3MpXG4gICAgICAgICAgICB3aW5kb3cuJCgnYm9keScpLmFkZENsYXNzKGJyb3dzZXJDbGFzcylcbiAgICAgICAgfSlcbiAgICB9XG59XG4iLCJjb25zdCBiZWwgPSByZXF1aXJlKCdiZWwnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcbiAgICBsZXQgZmllbGRzXG5cbiAgICBpZiAodGhpcy5tb2RlbC5zdWJtaXR0ZWQgfHwgdGhpcy5tb2RlbC5lcnJvcmVkKSB7XG4gICAgICAgIHJldHVybiBzaG93VGhhbmtZb3UodGhpcy5tb2RlbC5pc0Jyb2tlblNpdGUpXG4gICAgfVxuXG4gICAgaWYgKHRoaXMubW9kZWwuaXNCcm9rZW5TaXRlKSB7XG4gICAgICAgIGZpZWxkcyA9IGJlbGA8ZGl2PlxuICAgICAgICAgICAgPGxhYmVsIGNsYXNzPSdmcm1fX2xhYmVsJz5XaGljaCB3ZWJzaXRlIGlzIGJyb2tlbj88L2xhYmVsPlxuICAgICAgICAgICAgPGlucHV0IGNsYXNzPSdqcy1mZWVkYmFjay11cmwgZnJtX19pbnB1dCcgdHlwZT0ndGV4dCcgcGxhY2Vob2xkZXI9J0NvcHkgYW5kIHBhc3RlIHlvdXIgVVJMJyB2YWx1ZT0nJHt0aGlzLm1vZGVsLnVybH0nLz5cbiAgICAgICAgICAgIDxsYWJlbCBjbGFzcz0nZnJtX19sYWJlbCc+RGVzY3JpYmUgdGhlIGlzc3VlIHlvdSBlbmNvdW50ZXJlZDo8L2xhYmVsPlxuICAgICAgICAgICAgPHRleHRhcmVhIGNsYXNzPSdmcm1fX3RleHQganMtZmVlZGJhY2stbWVzc2FnZScgcmVxdWlyZWQgcGxhY2Vob2xkZXI9J1doaWNoIHdlYnNpdGUgY29udGVudCBvciBmdW5jdGlvbmFsaXR5IGlzIGJyb2tlbj8gUGxlYXNlIGJlIGFzIHNwZWNpZmljIGFzIHBvc3NpYmxlLic+PC90ZXh0YXJlYT5cbiAgICAgICAgPC9kaXY+YFxuICAgIH0gZWxzZSB7XG4gICAgICAgIGZpZWxkcyA9IGJlbGA8ZGl2PlxuICAgICAgICAgICAgPGxhYmVsIGNsYXNzPSdmcm1fX2xhYmVsJz5XaGF0IGRvIHlvdSBsb3ZlPyBXaGF0IGlzbid0IHdvcmtpbmc/IEhvdyBjb3VsZCB0aGUgZXh0ZW5zaW9uIGJlIGltcHJvdmVkPzwvbGFiZWw+XG4gICAgICAgICAgICA8dGV4dGFyZWEgY2xhc3M9J2ZybV9fdGV4dCBqcy1mZWVkYmFjay1tZXNzYWdlJyBwbGFjZWhvbGRlcj0nV2hpY2ggZmVhdHVyZXMgb3IgZnVuY3Rpb25hbGl0eSBkb2VzIHlvdXIgZmVlZGJhY2sgcmVmZXIgdG8/IFBsZWFzZSBiZSBhcyBzcGVjaWZpYyBhcyBwb3NzaWJsZS4nPjwvdGV4dGFyZWE+XG4gICAgICAgIDwvZGl2PmBcbiAgICB9XG5cbiAgICByZXR1cm4gYmVsYDxmb3JtIGNsYXNzPSdmcm0nPlxuICAgICAgICA8cD5TdWJtaXR0aW5nIGFub255bW91cyBmZWVkYmFjayBoZWxwcyB1cyBpbXByb3ZlIER1Y2tEdWNrR28gUHJpdmFjeSBFc3NlbnRpYWxzLjwvcD5cbiAgICAgICAgPGxhYmVsIGNsYXNzPSdmcm1fX2xhYmVsJz5cbiAgICAgICAgICAgIDxpbnB1dCB0eXBlPSdjaGVja2JveCcgY2xhc3M9J2pzLWZlZWRiYWNrLWJyb2tlbi1zaXRlIGZybV9fbGFiZWxfX2NoaydcbiAgICAgICAgICAgICAgICAke3RoaXMubW9kZWwuaXNCcm9rZW5TaXRlID8gJ2NoZWNrZWQnIDogJyd9Lz5cbiAgICAgICAgICAgIEkgd2FudCB0byByZXBvcnQgYSBicm9rZW4gc2l0ZVxuICAgICAgICA8L2xhYmVsPlxuICAgICAgICAke2ZpZWxkc31cbiAgICAgICAgPGlucHV0IGNsYXNzPSdidG4ganMtZmVlZGJhY2stc3VibWl0ICR7dGhpcy5tb2RlbC5jYW5TdWJtaXQgPyAnJyA6ICdpcy1kaXNhYmxlZCd9J1xuICAgICAgICAgICAgdHlwZT0nc3VibWl0JyB2YWx1ZT0nU3VibWl0JyAke3RoaXMubW9kZWwuY2FuU3VibWl0ID8gJycgOiAnZGlzYWJsZWQnfS8+XG4gICAgPC9mb3JtPmBcbn1cblxuZnVuY3Rpb24gc2hvd1RoYW5rWW91IChpc0Jyb2tlblNpdGUpIHtcbiAgICBpZiAoaXNCcm9rZW5TaXRlKSB7XG4gICAgICAgIHJldHVybiBiZWxgPGRpdj5cbiAgICAgICAgICAgIDxwPlRoYW5rIHlvdSBmb3IgeW91ciBmZWVkYmFjayE8L3A+XG4gICAgICAgICAgICA8cD5Zb3VyIGJyb2tlbiBzaXRlIHJlcG9ydHMgaGVscCBvdXIgZGV2ZWxvcG1lbnQgdGVhbSBmaXggdGhlc2UgYnJlYWthZ2VzLjwvcD5cbiAgICAgICAgPC9kaXY+YFxuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBiZWxgPHA+VGhhbmsgeW91IGZvciB5b3VyIGZlZWRiYWNrITwvcD5gXG4gICAgfVxufVxuIiwiY29uc3QgUGFyZW50ID0gd2luZG93LkRERy5iYXNlLlZpZXdcbmNvbnN0IGZlZWRiYWNrRm9ybVRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL2ZlZWRiYWNrLWZvcm0uZXM2JylcblxuZnVuY3Rpb24gRmVlZGJhY2tGb3JtIChvcHMpIHtcbiAgICB0aGlzLm1vZGVsID0gb3BzLm1vZGVsXG4gICAgdGhpcy50ZW1wbGF0ZSA9IGZlZWRiYWNrRm9ybVRlbXBsYXRlXG5cbiAgICBQYXJlbnQuY2FsbCh0aGlzLCBvcHMpXG5cbiAgICB0aGlzLl9zZXR1cCgpXG59XG5cbkZlZWRiYWNrRm9ybS5wcm90b3R5cGUgPSB3aW5kb3cuJC5leHRlbmQoe30sXG4gICAgUGFyZW50LnByb3RvdHlwZSxcbiAgICB7XG4gICAgICAgIF9zZXR1cDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5fY2FjaGVFbGVtcygnLmpzLWZlZWRiYWNrJywgW1xuICAgICAgICAgICAgICAgICd1cmwnLFxuICAgICAgICAgICAgICAgICdtZXNzYWdlJyxcbiAgICAgICAgICAgICAgICAnYnJva2VuLXNpdGUnLFxuICAgICAgICAgICAgICAgICdzdWJtaXQnXG4gICAgICAgICAgICBdKVxuXG4gICAgICAgICAgICB0aGlzLmJpbmRFdmVudHMoW1xuICAgICAgICAgICAgICAgIFt0aGlzLnN0b3JlLnN1YnNjcmliZSwgJ2NoYW5nZTpmZWVkYmFja0Zvcm0nLCB0aGlzLl9vbk1vZGVsQ2hhbmdlXSxcbiAgICAgICAgICAgICAgICBbdGhpcy4kdXJsLCAnaW5wdXQnLCB0aGlzLl9vblVybENoYW5nZV0sXG4gICAgICAgICAgICAgICAgW3RoaXMuJG1lc3NhZ2UsICdpbnB1dCcsIHRoaXMuX29uTWVzc2FnZUNoYW5nZV0sXG4gICAgICAgICAgICAgICAgW3RoaXMuJGJyb2tlbnNpdGUsICdjaGFuZ2UnLCB0aGlzLl9vbkJyb2tlblNpdGVDaGFuZ2VdLFxuICAgICAgICAgICAgICAgIFt0aGlzLiRzdWJtaXQsICdjbGljaycsIHRoaXMuX29uU3VibWl0Q2xpY2tdXG4gICAgICAgICAgICBdKVxuICAgICAgICB9LFxuXG4gICAgICAgIF9vbk1vZGVsQ2hhbmdlOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgaWYgKGUuY2hhbmdlLmF0dHJpYnV0ZSA9PT0gJ2lzQnJva2VuU2l0ZScgfHxcbiAgICAgICAgICAgICAgICAgICAgZS5jaGFuZ2UuYXR0cmlidXRlID09PSAnc3VibWl0dGVkJyB8fFxuICAgICAgICAgICAgICAgICAgICBlLmNoYW5nZS5hdHRyaWJ1dGUgPT09ICdlcnJvcmVkJykge1xuICAgICAgICAgICAgICAgIHRoaXMudW5iaW5kRXZlbnRzKClcbiAgICAgICAgICAgICAgICB0aGlzLl9yZXJlbmRlcigpXG4gICAgICAgICAgICAgICAgdGhpcy5fc2V0dXAoKVxuICAgICAgICAgICAgfSBlbHNlIGlmIChlLmNoYW5nZS5hdHRyaWJ1dGUgPT09ICdjYW5TdWJtaXQnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kc3VibWl0LnRvZ2dsZUNsYXNzKCdpcy1kaXNhYmxlZCcsICF0aGlzLm1vZGVsLmNhblN1Ym1pdClcbiAgICAgICAgICAgICAgICB0aGlzLiRzdWJtaXQuYXR0cignZGlzYWJsZWQnLCAhdGhpcy5tb2RlbC5jYW5TdWJtaXQpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgX29uQnJva2VuU2l0ZUNoYW5nZTogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIHRoaXMubW9kZWwudG9nZ2xlQnJva2VuU2l0ZShlLnRhcmdldC5jaGVja2VkKVxuICAgICAgICB9LFxuXG4gICAgICAgIF9vblVybENoYW5nZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5tb2RlbC5zZXQoJ3VybCcsIHRoaXMuJHVybC52YWwoKSlcbiAgICAgICAgICAgIHRoaXMubW9kZWwudXBkYXRlQ2FuU3VibWl0KClcbiAgICAgICAgfSxcblxuICAgICAgICBfb25NZXNzYWdlQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLm1vZGVsLnNldCgnbWVzc2FnZScsIHRoaXMuJG1lc3NhZ2UudmFsKCkpXG4gICAgICAgICAgICB0aGlzLm1vZGVsLnVwZGF0ZUNhblN1Ym1pdCgpXG4gICAgICAgIH0sXG5cbiAgICAgICAgX29uU3VibWl0Q2xpY2s6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICAgICAgICAgaWYgKCF0aGlzLm1vZGVsLmNhblN1Ym1pdCkgeyByZXR1cm4gfVxuXG4gICAgICAgICAgICB0aGlzLm1vZGVsLnN1Ym1pdCgpXG5cbiAgICAgICAgICAgIHRoaXMuJHN1Ym1pdC5hZGRDbGFzcygnaXMtZGlzYWJsZWQnKVxuICAgICAgICAgICAgdGhpcy4kc3VibWl0LnZhbCgnU2VuZGluZy4uLicpXG4gICAgICAgIH1cbiAgICB9XG4pXG5cbm1vZHVsZS5leHBvcnRzID0gRmVlZGJhY2tGb3JtXG4iXX0=
