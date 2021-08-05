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
      }

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYmVsL2FwcGVuZENoaWxkLmpzIiwibm9kZV9tb2R1bGVzL2JlbC9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL2h5cGVyc2NyaXB0LWF0dHJpYnV0ZS10by1wcm9wZXJ0eS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9oeXBlcngvaW5kZXguanMiLCJzaGFyZWQvZGF0YS9jb25zdGFudHMuanMiLCJzaGFyZWQvZGF0YS9kZWZhdWx0U2V0dGluZ3MuanMiLCJzaGFyZWQvanMvYmFja2dyb3VuZC9jaGFubmVsLmVzNi5qcyIsInNoYXJlZC9qcy9iYWNrZ3JvdW5kL2VtYWlsLXV0aWxzLmVzNi5qcyIsInNoYXJlZC9qcy9iYWNrZ3JvdW5kL3NldHRpbmdzLmVzNi5qcyIsInNoYXJlZC9qcy9iYWNrZ3JvdW5kL3dyYXBwZXIuZXM2LmpzIiwic2hhcmVkL2pzL3VpL2Jhc2UvdWktd3JhcHBlci5lczYuanMiLCJzaGFyZWQvanMvdWkvbW9kZWxzL2F1dG9jb21wbGV0ZS5lczYuanMiLCJzaGFyZWQvanMvdWkvbW9kZWxzL2JhY2tncm91bmQtbWVzc2FnZS5lczYuanMiLCJzaGFyZWQvanMvdWkvbW9kZWxzL2VtYWlsLWFsaWFzLmVzNi5qcyIsInNoYXJlZC9qcy91aS9tb2RlbHMvaGFtYnVyZ2VyLW1lbnUuZXM2LmpzIiwic2hhcmVkL2pzL3VpL21vZGVscy9taXhpbnMvbm9ybWFsaXplLWNvbXBhbnktbmFtZS5lczYuanMiLCJzaGFyZWQvanMvdWkvbW9kZWxzL3NlYXJjaC5lczYuanMiLCJzaGFyZWQvanMvdWkvbW9kZWxzL3NpdGUtY29tcGFueS1saXN0LmVzNi5qcyIsInNoYXJlZC9qcy91aS9tb2RlbHMvc2l0ZS5lczYuanMiLCJzaGFyZWQvanMvdWkvbW9kZWxzL3RvcC1ibG9ja2VkLmVzNi5qcyIsInNoYXJlZC9qcy91aS9wYWdlcy9taXhpbnMvaW5kZXguZXM2LmpzIiwic2hhcmVkL2pzL3VpL3BhZ2VzL21peGlucy9wYXJzZS1xdWVyeS1zdHJpbmcuZXM2LmpzIiwic2hhcmVkL2pzL3VpL3BhZ2VzL21peGlucy9zZXQtYnJvd3Nlci1jbGFzcy5lczYuanMiLCJzaGFyZWQvanMvdWkvcGFnZXMvcG9wdXAuZXM2LmpzIiwic2hhcmVkL2pzL3VpL3RlbXBsYXRlcy9hdXRvY29tcGxldGUuZXM2LmpzIiwic2hhcmVkL2pzL3VpL3RlbXBsYXRlcy9icmVha2FnZS1mb3JtLmVzNi5qcyIsInNoYXJlZC9qcy91aS90ZW1wbGF0ZXMvZW1haWwtYWxpYXMuZXM2LmpzIiwic2hhcmVkL2pzL3VpL3RlbXBsYXRlcy9ncmFkZS1zY29yZWNhcmQuZXM2LmpzIiwic2hhcmVkL2pzL3VpL3RlbXBsYXRlcy9oYW1idXJnZXItbWVudS5lczYuanMiLCJzaGFyZWQvanMvdWkvdGVtcGxhdGVzL3ByaXZhY3ktcHJhY3RpY2VzLmVzNi5qcyIsInNoYXJlZC9qcy91aS90ZW1wbGF0ZXMvc2VhcmNoLmVzNi5qcyIsInNoYXJlZC9qcy91aS90ZW1wbGF0ZXMvc2hhcmVkL2dyYWRlLXNjb3JlY2FyZC1ncmFkZXMuZXM2LmpzIiwic2hhcmVkL2pzL3VpL3RlbXBsYXRlcy9zaGFyZWQvZ3JhZGUtc2NvcmVjYXJkLXJlYXNvbnMuZXM2LmpzIiwic2hhcmVkL2pzL3VpL3RlbXBsYXRlcy9zaGFyZWQvaGFtYnVyZ2VyLWJ1dHRvbi5lczYuanMiLCJzaGFyZWQvanMvdWkvdGVtcGxhdGVzL3NoYXJlZC9oZXJvLmVzNi5qcyIsInNoYXJlZC9qcy91aS90ZW1wbGF0ZXMvc2hhcmVkL2xpbmsuZXM2LmpzIiwic2hhcmVkL2pzL3VpL3RlbXBsYXRlcy9zaGFyZWQvcmF0aW5nLWhlcm8uZXM2LmpzIiwic2hhcmVkL2pzL3VpL3RlbXBsYXRlcy9zaGFyZWQvc2xpZGluZy1zdWJ2aWV3LWhlYWRlci5lczYuanMiLCJzaGFyZWQvanMvdWkvdGVtcGxhdGVzL3NoYXJlZC9zdGF0dXMtbGlzdC5lczYuanMiLCJzaGFyZWQvanMvdWkvdGVtcGxhdGVzL3NoYXJlZC90b2dnbGUtYnV0dG9uLmVzNi5qcyIsInNoYXJlZC9qcy91aS90ZW1wbGF0ZXMvc2hhcmVkL3RvcC1ibG9ja2VkLW5vLWRhdGEuZXM2LmpzIiwic2hhcmVkL2pzL3VpL3RlbXBsYXRlcy9zaGFyZWQvdHJhY2tlci1uZXR3b3JrLWljb24uZXM2LmpzIiwic2hhcmVkL2pzL3VpL3RlbXBsYXRlcy9zaGFyZWQvdHJhY2tlci1uZXR3b3Jrcy10ZXh0LmVzNi5qcyIsInNoYXJlZC9qcy91aS90ZW1wbGF0ZXMvc2l0ZS5lczYuanMiLCJzaGFyZWQvanMvdWkvdGVtcGxhdGVzL3RvcC1ibG9ja2VkLWxpc3QtaXRlbXMuZXM2LmpzIiwic2hhcmVkL2pzL3VpL3RlbXBsYXRlcy90b3AtYmxvY2tlZC10cnVuY2F0ZWQtbGlzdC1pdGVtcy5lczYuanMiLCJzaGFyZWQvanMvdWkvdGVtcGxhdGVzL3RvcC1ibG9ja2VkLXRydW5jYXRlZC5lczYuanMiLCJzaGFyZWQvanMvdWkvdGVtcGxhdGVzL3RvcC1ibG9ja2VkLmVzNi5qcyIsInNoYXJlZC9qcy91aS90ZW1wbGF0ZXMvdHJhY2tlci1uZXR3b3Jrcy5lczYuanMiLCJzaGFyZWQvanMvdWkvdmlld3MvYXV0b2NvbXBsZXRlLmVzNi5qcyIsInNoYXJlZC9qcy91aS92aWV3cy9icmVha2FnZS1mb3JtLmVzNi5qcyIsInNoYXJlZC9qcy91aS92aWV3cy9lbWFpbC1hbGlhcy5lczYuanMiLCJzaGFyZWQvanMvdWkvdmlld3MvZ3JhZGUtc2NvcmVjYXJkLmVzNi5qcyIsInNoYXJlZC9qcy91aS92aWV3cy9oYW1idXJnZXItbWVudS5lczYuanMiLCJzaGFyZWQvanMvdWkvdmlld3MvbWl4aW5zL2FuaW1hdGUtZ3JhcGgtYmFycy5lczYuanMiLCJzaGFyZWQvanMvdWkvdmlld3MvbWl4aW5zL29wZW4tb3B0aW9ucy1wYWdlLmVzNi5qcyIsInNoYXJlZC9qcy91aS92aWV3cy9wcml2YWN5LXByYWN0aWNlcy5lczYuanMiLCJzaGFyZWQvanMvdWkvdmlld3Mvc2VhcmNoLmVzNi5qcyIsInNoYXJlZC9qcy91aS92aWV3cy9zaXRlLmVzNi5qcyIsInNoYXJlZC9qcy91aS92aWV3cy9zbGlkaW5nLXN1YnZpZXcuZXM2LmpzIiwic2hhcmVkL2pzL3VpL3ZpZXdzL3RvcC1ibG9ja2VkLXRydW5jYXRlZC5lczYuanMiLCJzaGFyZWQvanMvdWkvdmlld3MvdG9wLWJsb2NrZWQuZXM2LmpzIiwic2hhcmVkL2pzL3VpL3ZpZXdzL3RyYWNrZXItbmV0d29ya3MuZXM2LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QUssWUFBTDtBQUNBLGFBQUssS0FBTDtBQUNBLGFBQUssVUFBTDtBQUNIO0FBQ0o7QUFDSjtBQXBFTCxDQUZ3QixDQUE1QjtBQTBFQSxNQUFNLENBQUMsT0FBUCxHQUFpQixlQUFqQiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsInZhciB0cmFpbGluZ05ld2xpbmVSZWdleCA9IC9cXG5bXFxzXSskL1xudmFyIGxlYWRpbmdOZXdsaW5lUmVnZXggPSAvXlxcbltcXHNdKy9cbnZhciB0cmFpbGluZ1NwYWNlUmVnZXggPSAvW1xcc10rJC9cbnZhciBsZWFkaW5nU3BhY2VSZWdleCA9IC9eW1xcc10rL1xudmFyIG11bHRpU3BhY2VSZWdleCA9IC9bXFxuXFxzXSsvZ1xuXG52YXIgVEVYVF9UQUdTID0gW1xuICAnYScsICdhYmJyJywgJ2InLCAnYmRpJywgJ2JkbycsICdicicsICdjaXRlJywgJ2RhdGEnLCAnZGZuJywgJ2VtJywgJ2knLFxuICAna2JkJywgJ21hcmsnLCAncScsICdycCcsICdydCcsICdydGMnLCAncnVieScsICdzJywgJ2FtcCcsICdzbWFsbCcsICdzcGFuJyxcbiAgJ3N0cm9uZycsICdzdWInLCAnc3VwJywgJ3RpbWUnLCAndScsICd2YXInLCAnd2JyJ1xuXVxuXG52YXIgVkVSQkFUSU1fVEFHUyA9IFtcbiAgJ2NvZGUnLCAncHJlJywgJ3RleHRhcmVhJ1xuXVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGFwcGVuZENoaWxkIChlbCwgY2hpbGRzKSB7XG4gIGlmICghQXJyYXkuaXNBcnJheShjaGlsZHMpKSByZXR1cm5cblxuICB2YXIgbm9kZU5hbWUgPSBlbC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpXG5cbiAgdmFyIGhhZFRleHQgPSBmYWxzZVxuICB2YXIgdmFsdWUsIGxlYWRlclxuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBjaGlsZHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICB2YXIgbm9kZSA9IGNoaWxkc1tpXVxuICAgIGlmIChBcnJheS5pc0FycmF5KG5vZGUpKSB7XG4gICAgICBhcHBlbmRDaGlsZChlbCwgbm9kZSlcbiAgICAgIGNvbnRpbnVlXG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBub2RlID09PSAnbnVtYmVyJyB8fFxuICAgICAgdHlwZW9mIG5vZGUgPT09ICdib29sZWFuJyB8fFxuICAgICAgdHlwZW9mIG5vZGUgPT09ICdmdW5jdGlvbicgfHxcbiAgICAgIG5vZGUgaW5zdGFuY2VvZiBEYXRlIHx8XG4gICAgICBub2RlIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICBub2RlID0gbm9kZS50b1N0cmluZygpXG4gICAgfVxuXG4gICAgdmFyIGxhc3RDaGlsZCA9IGVsLmNoaWxkTm9kZXNbZWwuY2hpbGROb2Rlcy5sZW5ndGggLSAxXVxuXG4gICAgLy8gSXRlcmF0ZSBvdmVyIHRleHQgbm9kZXNcbiAgICBpZiAodHlwZW9mIG5vZGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICBoYWRUZXh0ID0gdHJ1ZVxuXG4gICAgICAvLyBJZiB3ZSBhbHJlYWR5IGhhZCB0ZXh0LCBhcHBlbmQgdG8gdGhlIGV4aXN0aW5nIHRleHRcbiAgICAgIGlmIChsYXN0Q2hpbGQgJiYgbGFzdENoaWxkLm5vZGVOYW1lID09PSAnI3RleHQnKSB7XG4gICAgICAgIGxhc3RDaGlsZC5ub2RlVmFsdWUgKz0gbm9kZVxuXG4gICAgICAvLyBXZSBkaWRuJ3QgaGF2ZSBhIHRleHQgbm9kZSB5ZXQsIGNyZWF0ZSBvbmVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShub2RlKVxuICAgICAgICBlbC5hcHBlbmRDaGlsZChub2RlKVxuICAgICAgICBsYXN0Q2hpbGQgPSBub2RlXG4gICAgICB9XG5cbiAgICAgIC8vIElmIHRoaXMgaXMgdGhlIGxhc3Qgb2YgdGhlIGNoaWxkIG5vZGVzLCBtYWtlIHN1cmUgd2UgY2xvc2UgaXQgb3V0XG4gICAgICAvLyByaWdodFxuICAgICAgaWYgKGkgPT09IGxlbiAtIDEpIHtcbiAgICAgICAgaGFkVGV4dCA9IGZhbHNlXG4gICAgICAgIC8vIFRyaW0gdGhlIGNoaWxkIHRleHQgbm9kZXMgaWYgdGhlIGN1cnJlbnQgbm9kZSBpc24ndCBhXG4gICAgICAgIC8vIG5vZGUgd2hlcmUgd2hpdGVzcGFjZSBtYXR0ZXJzLlxuICAgICAgICBpZiAoVEVYVF9UQUdTLmluZGV4T2Yobm9kZU5hbWUpID09PSAtMSAmJlxuICAgICAgICAgIFZFUkJBVElNX1RBR1MuaW5kZXhPZihub2RlTmFtZSkgPT09IC0xKSB7XG4gICAgICAgICAgdmFsdWUgPSBsYXN0Q2hpbGQubm9kZVZhbHVlXG4gICAgICAgICAgICAucmVwbGFjZShsZWFkaW5nTmV3bGluZVJlZ2V4LCAnJylcbiAgICAgICAgICAgIC5yZXBsYWNlKHRyYWlsaW5nU3BhY2VSZWdleCwgJycpXG4gICAgICAgICAgICAucmVwbGFjZSh0cmFpbGluZ05ld2xpbmVSZWdleCwgJycpXG4gICAgICAgICAgICAucmVwbGFjZShtdWx0aVNwYWNlUmVnZXgsICcgJylcbiAgICAgICAgICBpZiAodmFsdWUgPT09ICcnKSB7XG4gICAgICAgICAgICBlbC5yZW1vdmVDaGlsZChsYXN0Q2hpbGQpXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxhc3RDaGlsZC5ub2RlVmFsdWUgPSB2YWx1ZVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChWRVJCQVRJTV9UQUdTLmluZGV4T2Yobm9kZU5hbWUpID09PSAtMSkge1xuICAgICAgICAgIC8vIFRoZSB2ZXJ5IGZpcnN0IG5vZGUgaW4gdGhlIGxpc3Qgc2hvdWxkIG5vdCBoYXZlIGxlYWRpbmdcbiAgICAgICAgICAvLyB3aGl0ZXNwYWNlLiBTaWJsaW5nIHRleHQgbm9kZXMgc2hvdWxkIGhhdmUgd2hpdGVzcGFjZSBpZiB0aGVyZVxuICAgICAgICAgIC8vIHdhcyBhbnkuXG4gICAgICAgICAgbGVhZGVyID0gaSA9PT0gMCA/ICcnIDogJyAnXG4gICAgICAgICAgdmFsdWUgPSBsYXN0Q2hpbGQubm9kZVZhbHVlXG4gICAgICAgICAgICAucmVwbGFjZShsZWFkaW5nTmV3bGluZVJlZ2V4LCBsZWFkZXIpXG4gICAgICAgICAgICAucmVwbGFjZShsZWFkaW5nU3BhY2VSZWdleCwgJyAnKVxuICAgICAgICAgICAgLnJlcGxhY2UodHJhaWxpbmdTcGFjZVJlZ2V4LCAnJylcbiAgICAgICAgICAgIC5yZXBsYWNlKHRyYWlsaW5nTmV3bGluZVJlZ2V4LCAnJylcbiAgICAgICAgICAgIC5yZXBsYWNlKG11bHRpU3BhY2VSZWdleCwgJyAnKVxuICAgICAgICAgIGxhc3RDaGlsZC5ub2RlVmFsdWUgPSB2YWx1ZVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAvLyBJdGVyYXRlIG92ZXIgRE9NIG5vZGVzXG4gICAgfSBlbHNlIGlmIChub2RlICYmIG5vZGUubm9kZVR5cGUpIHtcbiAgICAgIC8vIElmIHRoZSBsYXN0IG5vZGUgd2FzIGEgdGV4dCBub2RlLCBtYWtlIHN1cmUgaXQgaXMgcHJvcGVybHkgY2xvc2VkIG91dFxuICAgICAgaWYgKGhhZFRleHQpIHtcbiAgICAgICAgaGFkVGV4dCA9IGZhbHNlXG5cbiAgICAgICAgLy8gVHJpbSB0aGUgY2hpbGQgdGV4dCBub2RlcyBpZiB0aGUgY3VycmVudCBub2RlIGlzbid0IGFcbiAgICAgICAgLy8gdGV4dCBub2RlIG9yIGEgY29kZSBub2RlXG4gICAgICAgIGlmIChURVhUX1RBR1MuaW5kZXhPZihub2RlTmFtZSkgPT09IC0xICYmXG4gICAgICAgICAgVkVSQkFUSU1fVEFHUy5pbmRleE9mKG5vZGVOYW1lKSA9PT0gLTEpIHtcbiAgICAgICAgICB2YWx1ZSA9IGxhc3RDaGlsZC5ub2RlVmFsdWVcbiAgICAgICAgICAgIC5yZXBsYWNlKGxlYWRpbmdOZXdsaW5lUmVnZXgsICcnKVxuICAgICAgICAgICAgLnJlcGxhY2UodHJhaWxpbmdOZXdsaW5lUmVnZXgsICcnKVxuICAgICAgICAgICAgLnJlcGxhY2UobXVsdGlTcGFjZVJlZ2V4LCAnICcpXG5cbiAgICAgICAgICAvLyBSZW1vdmUgZW1wdHkgdGV4dCBub2RlcywgYXBwZW5kIG90aGVyd2lzZVxuICAgICAgICAgIGlmICh2YWx1ZSA9PT0gJycpIHtcbiAgICAgICAgICAgIGVsLnJlbW92ZUNoaWxkKGxhc3RDaGlsZClcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGFzdENoaWxkLm5vZGVWYWx1ZSA9IHZhbHVlXG4gICAgICAgICAgfVxuICAgICAgICAvLyBUcmltIHRoZSBjaGlsZCBub2RlcyBpZiB0aGUgY3VycmVudCBub2RlIGlzIG5vdCBhIG5vZGVcbiAgICAgICAgLy8gd2hlcmUgYWxsIHdoaXRlc3BhY2UgbXVzdCBiZSBwcmVzZXJ2ZWRcbiAgICAgICAgfSBlbHNlIGlmIChWRVJCQVRJTV9UQUdTLmluZGV4T2Yobm9kZU5hbWUpID09PSAtMSkge1xuICAgICAgICAgIHZhbHVlID0gbGFzdENoaWxkLm5vZGVWYWx1ZVxuICAgICAgICAgICAgLnJlcGxhY2UobGVhZGluZ1NwYWNlUmVnZXgsICcgJylcbiAgICAgICAgICAgIC5yZXBsYWNlKGxlYWRpbmdOZXdsaW5lUmVnZXgsICcnKVxuICAgICAgICAgICAgLnJlcGxhY2UodHJhaWxpbmdOZXdsaW5lUmVnZXgsICcnKVxuICAgICAgICAgICAgLnJlcGxhY2UobXVsdGlTcGFjZVJlZ2V4LCAnICcpXG4gICAgICAgICAgbGFzdENoaWxkLm5vZGVWYWx1ZSA9IHZhbHVlXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gU3RvcmUgdGhlIGxhc3Qgbm9kZW5hbWVcbiAgICAgIHZhciBfbm9kZU5hbWUgPSBub2RlLm5vZGVOYW1lXG4gICAgICBpZiAoX25vZGVOYW1lKSBub2RlTmFtZSA9IF9ub2RlTmFtZS50b0xvd2VyQ2FzZSgpXG5cbiAgICAgIC8vIEFwcGVuZCB0aGUgbm9kZSB0byB0aGUgRE9NXG4gICAgICBlbC5hcHBlbmRDaGlsZChub2RlKVxuICAgIH1cbiAgfVxufVxuIiwidmFyIGh5cGVyeCA9IHJlcXVpcmUoJ2h5cGVyeCcpXG52YXIgYXBwZW5kQ2hpbGQgPSByZXF1aXJlKCcuL2FwcGVuZENoaWxkJylcblxudmFyIFNWR05TID0gJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJ1xudmFyIFhMSU5LTlMgPSAnaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluaydcblxudmFyIEJPT0xfUFJPUFMgPSBbXG4gICdhdXRvZm9jdXMnLCAnY2hlY2tlZCcsICdkZWZhdWx0Y2hlY2tlZCcsICdkaXNhYmxlZCcsICdmb3Jtbm92YWxpZGF0ZScsXG4gICdpbmRldGVybWluYXRlJywgJ3JlYWRvbmx5JywgJ3JlcXVpcmVkJywgJ3NlbGVjdGVkJywgJ3dpbGx2YWxpZGF0ZSdcbl1cblxudmFyIENPTU1FTlRfVEFHID0gJyEtLSdcblxudmFyIFNWR19UQUdTID0gW1xuICAnc3ZnJywgJ2FsdEdseXBoJywgJ2FsdEdseXBoRGVmJywgJ2FsdEdseXBoSXRlbScsICdhbmltYXRlJywgJ2FuaW1hdGVDb2xvcicsXG4gICdhbmltYXRlTW90aW9uJywgJ2FuaW1hdGVUcmFuc2Zvcm0nLCAnY2lyY2xlJywgJ2NsaXBQYXRoJywgJ2NvbG9yLXByb2ZpbGUnLFxuICAnY3Vyc29yJywgJ2RlZnMnLCAnZGVzYycsICdlbGxpcHNlJywgJ2ZlQmxlbmQnLCAnZmVDb2xvck1hdHJpeCcsXG4gICdmZUNvbXBvbmVudFRyYW5zZmVyJywgJ2ZlQ29tcG9zaXRlJywgJ2ZlQ29udm9sdmVNYXRyaXgnLFxuICAnZmVEaWZmdXNlTGlnaHRpbmcnLCAnZmVEaXNwbGFjZW1lbnRNYXAnLCAnZmVEaXN0YW50TGlnaHQnLCAnZmVGbG9vZCcsXG4gICdmZUZ1bmNBJywgJ2ZlRnVuY0InLCAnZmVGdW5jRycsICdmZUZ1bmNSJywgJ2ZlR2F1c3NpYW5CbHVyJywgJ2ZlSW1hZ2UnLFxuICAnZmVNZXJnZScsICdmZU1lcmdlTm9kZScsICdmZU1vcnBob2xvZ3knLCAnZmVPZmZzZXQnLCAnZmVQb2ludExpZ2h0JyxcbiAgJ2ZlU3BlY3VsYXJMaWdodGluZycsICdmZVNwb3RMaWdodCcsICdmZVRpbGUnLCAnZmVUdXJidWxlbmNlJywgJ2ZpbHRlcicsXG4gICdmb250JywgJ2ZvbnQtZmFjZScsICdmb250LWZhY2UtZm9ybWF0JywgJ2ZvbnQtZmFjZS1uYW1lJywgJ2ZvbnQtZmFjZS1zcmMnLFxuICAnZm9udC1mYWNlLXVyaScsICdmb3JlaWduT2JqZWN0JywgJ2cnLCAnZ2x5cGgnLCAnZ2x5cGhSZWYnLCAnaGtlcm4nLCAnaW1hZ2UnLFxuICAnbGluZScsICdsaW5lYXJHcmFkaWVudCcsICdtYXJrZXInLCAnbWFzaycsICdtZXRhZGF0YScsICdtaXNzaW5nLWdseXBoJyxcbiAgJ21wYXRoJywgJ3BhdGgnLCAncGF0dGVybicsICdwb2x5Z29uJywgJ3BvbHlsaW5lJywgJ3JhZGlhbEdyYWRpZW50JywgJ3JlY3QnLFxuICAnc2V0JywgJ3N0b3AnLCAnc3dpdGNoJywgJ3N5bWJvbCcsICd0ZXh0JywgJ3RleHRQYXRoJywgJ3RpdGxlJywgJ3RyZWYnLFxuICAndHNwYW4nLCAndXNlJywgJ3ZpZXcnLCAndmtlcm4nXG5dXG5cbmZ1bmN0aW9uIGJlbENyZWF0ZUVsZW1lbnQgKHRhZywgcHJvcHMsIGNoaWxkcmVuKSB7XG4gIHZhciBlbFxuXG4gIC8vIElmIGFuIHN2ZyB0YWcsIGl0IG5lZWRzIGEgbmFtZXNwYWNlXG4gIGlmIChTVkdfVEFHUy5pbmRleE9mKHRhZykgIT09IC0xKSB7XG4gICAgcHJvcHMubmFtZXNwYWNlID0gU1ZHTlNcbiAgfVxuXG4gIC8vIElmIHdlIGFyZSB1c2luZyBhIG5hbWVzcGFjZVxuICB2YXIgbnMgPSBmYWxzZVxuICBpZiAocHJvcHMubmFtZXNwYWNlKSB7XG4gICAgbnMgPSBwcm9wcy5uYW1lc3BhY2VcbiAgICBkZWxldGUgcHJvcHMubmFtZXNwYWNlXG4gIH1cblxuICAvLyBDcmVhdGUgdGhlIGVsZW1lbnRcbiAgaWYgKG5zKSB7XG4gICAgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMobnMsIHRhZylcbiAgfSBlbHNlIGlmICh0YWcgPT09IENPTU1FTlRfVEFHKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQocHJvcHMuY29tbWVudClcbiAgfSBlbHNlIHtcbiAgICBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnKVxuICB9XG5cbiAgLy8gQ3JlYXRlIHRoZSBwcm9wZXJ0aWVzXG4gIGZvciAodmFyIHAgaW4gcHJvcHMpIHtcbiAgICBpZiAocHJvcHMuaGFzT3duUHJvcGVydHkocCkpIHtcbiAgICAgIHZhciBrZXkgPSBwLnRvTG93ZXJDYXNlKClcbiAgICAgIHZhciB2YWwgPSBwcm9wc1twXVxuICAgICAgLy8gTm9ybWFsaXplIGNsYXNzTmFtZVxuICAgICAgaWYgKGtleSA9PT0gJ2NsYXNzbmFtZScpIHtcbiAgICAgICAga2V5ID0gJ2NsYXNzJ1xuICAgICAgICBwID0gJ2NsYXNzJ1xuICAgICAgfVxuICAgICAgLy8gVGhlIGZvciBhdHRyaWJ1dGUgZ2V0cyB0cmFuc2Zvcm1lZCB0byBodG1sRm9yLCBidXQgd2UganVzdCBzZXQgYXMgZm9yXG4gICAgICBpZiAocCA9PT0gJ2h0bWxGb3InKSB7XG4gICAgICAgIHAgPSAnZm9yJ1xuICAgICAgfVxuICAgICAgLy8gSWYgYSBwcm9wZXJ0eSBpcyBib29sZWFuLCBzZXQgaXRzZWxmIHRvIHRoZSBrZXlcbiAgICAgIGlmIChCT09MX1BST1BTLmluZGV4T2Yoa2V5KSAhPT0gLTEpIHtcbiAgICAgICAgaWYgKHZhbCA9PT0gJ3RydWUnKSB2YWwgPSBrZXlcbiAgICAgICAgZWxzZSBpZiAodmFsID09PSAnZmFsc2UnKSBjb250aW51ZVxuICAgICAgfVxuICAgICAgLy8gSWYgYSBwcm9wZXJ0eSBwcmVmZXJzIGJlaW5nIHNldCBkaXJlY3RseSB2cyBzZXRBdHRyaWJ1dGVcbiAgICAgIGlmIChrZXkuc2xpY2UoMCwgMikgPT09ICdvbicpIHtcbiAgICAgICAgZWxbcF0gPSB2YWxcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChucykge1xuICAgICAgICAgIGlmIChwID09PSAneGxpbms6aHJlZicpIHtcbiAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZU5TKFhMSU5LTlMsIHAsIHZhbClcbiAgICAgICAgICB9IGVsc2UgaWYgKC9eeG1sbnMoJHw6KS9pLnRlc3QocCkpIHtcbiAgICAgICAgICAgIC8vIHNraXAgeG1sbnMgZGVmaW5pdGlvbnNcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZWwuc2V0QXR0cmlidXRlTlMobnVsbCwgcCwgdmFsKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUocCwgdmFsKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXBwZW5kQ2hpbGQoZWwsIGNoaWxkcmVuKVxuICByZXR1cm4gZWxcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBoeXBlcngoYmVsQ3JlYXRlRWxlbWVudCwge2NvbW1lbnRzOiB0cnVlfSlcbm1vZHVsZS5leHBvcnRzLmRlZmF1bHQgPSBtb2R1bGUuZXhwb3J0c1xubW9kdWxlLmV4cG9ydHMuY3JlYXRlRWxlbWVudCA9IGJlbENyZWF0ZUVsZW1lbnRcbiIsIm1vZHVsZS5leHBvcnRzID0gYXR0cmlidXRlVG9Qcm9wZXJ0eVxuXG52YXIgdHJhbnNmb3JtID0ge1xuICAnY2xhc3MnOiAnY2xhc3NOYW1lJyxcbiAgJ2Zvcic6ICdodG1sRm9yJyxcbiAgJ2h0dHAtZXF1aXYnOiAnaHR0cEVxdWl2J1xufVxuXG5mdW5jdGlvbiBhdHRyaWJ1dGVUb1Byb3BlcnR5IChoKSB7XG4gIHJldHVybiBmdW5jdGlvbiAodGFnTmFtZSwgYXR0cnMsIGNoaWxkcmVuKSB7XG4gICAgZm9yICh2YXIgYXR0ciBpbiBhdHRycykge1xuICAgICAgaWYgKGF0dHIgaW4gdHJhbnNmb3JtKSB7XG4gICAgICAgIGF0dHJzW3RyYW5zZm9ybVthdHRyXV0gPSBhdHRyc1thdHRyXVxuICAgICAgICBkZWxldGUgYXR0cnNbYXR0cl1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGgodGFnTmFtZSwgYXR0cnMsIGNoaWxkcmVuKVxuICB9XG59XG4iLCJ2YXIgYXR0clRvUHJvcCA9IHJlcXVpcmUoJ2h5cGVyc2NyaXB0LWF0dHJpYnV0ZS10by1wcm9wZXJ0eScpXG5cbnZhciBWQVIgPSAwLCBURVhUID0gMSwgT1BFTiA9IDIsIENMT1NFID0gMywgQVRUUiA9IDRcbnZhciBBVFRSX0tFWSA9IDUsIEFUVFJfS0VZX1cgPSA2XG52YXIgQVRUUl9WQUxVRV9XID0gNywgQVRUUl9WQUxVRSA9IDhcbnZhciBBVFRSX1ZBTFVFX1NRID0gOSwgQVRUUl9WQUxVRV9EUSA9IDEwXG52YXIgQVRUUl9FUSA9IDExLCBBVFRSX0JSRUFLID0gMTJcbnZhciBDT01NRU5UID0gMTNcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoaCwgb3B0cykge1xuICBpZiAoIW9wdHMpIG9wdHMgPSB7fVxuICB2YXIgY29uY2F0ID0gb3B0cy5jb25jYXQgfHwgZnVuY3Rpb24gKGEsIGIpIHtcbiAgICByZXR1cm4gU3RyaW5nKGEpICsgU3RyaW5nKGIpXG4gIH1cbiAgaWYgKG9wdHMuYXR0clRvUHJvcCAhPT0gZmFsc2UpIHtcbiAgICBoID0gYXR0clRvUHJvcChoKVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChzdHJpbmdzKSB7XG4gICAgdmFyIHN0YXRlID0gVEVYVCwgcmVnID0gJydcbiAgICB2YXIgYXJnbGVuID0gYXJndW1lbnRzLmxlbmd0aFxuICAgIHZhciBwYXJ0cyA9IFtdXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0cmluZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChpIDwgYXJnbGVuIC0gMSkge1xuICAgICAgICB2YXIgYXJnID0gYXJndW1lbnRzW2krMV1cbiAgICAgICAgdmFyIHAgPSBwYXJzZShzdHJpbmdzW2ldKVxuICAgICAgICB2YXIgeHN0YXRlID0gc3RhdGVcbiAgICAgICAgaWYgKHhzdGF0ZSA9PT0gQVRUUl9WQUxVRV9EUSkgeHN0YXRlID0gQVRUUl9WQUxVRVxuICAgICAgICBpZiAoeHN0YXRlID09PSBBVFRSX1ZBTFVFX1NRKSB4c3RhdGUgPSBBVFRSX1ZBTFVFXG4gICAgICAgIGlmICh4c3RhdGUgPT09IEFUVFJfVkFMVUVfVykgeHN0YXRlID0gQVRUUl9WQUxVRVxuICAgICAgICBpZiAoeHN0YXRlID09PSBBVFRSKSB4c3RhdGUgPSBBVFRSX0tFWVxuICAgICAgICBpZiAoeHN0YXRlID09PSBPUEVOKSB7XG4gICAgICAgICAgaWYgKHJlZyA9PT0gJy8nKSB7XG4gICAgICAgICAgICBwLnB1c2goWyBPUEVOLCAnLycsIGFyZyBdKVxuICAgICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcC5wdXNoKFsgT1BFTiwgYXJnIF0pXG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHhzdGF0ZSA9PT0gQ09NTUVOVCAmJiBvcHRzLmNvbW1lbnRzKSB7XG4gICAgICAgICAgcmVnICs9IFN0cmluZyhhcmcpXG4gICAgICAgIH0gZWxzZSBpZiAoeHN0YXRlICE9PSBDT01NRU5UKSB7XG4gICAgICAgICAgcC5wdXNoKFsgVkFSLCB4c3RhdGUsIGFyZyBdKVxuICAgICAgICB9XG4gICAgICAgIHBhcnRzLnB1c2guYXBwbHkocGFydHMsIHApXG4gICAgICB9IGVsc2UgcGFydHMucHVzaC5hcHBseShwYXJ0cywgcGFyc2Uoc3RyaW5nc1tpXSkpXG4gICAgfVxuXG4gICAgdmFyIHRyZWUgPSBbbnVsbCx7fSxbXV1cbiAgICB2YXIgc3RhY2sgPSBbW3RyZWUsLTFdXVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBjdXIgPSBzdGFja1tzdGFjay5sZW5ndGgtMV1bMF1cbiAgICAgIHZhciBwID0gcGFydHNbaV0sIHMgPSBwWzBdXG4gICAgICBpZiAocyA9PT0gT1BFTiAmJiAvXlxcLy8udGVzdChwWzFdKSkge1xuICAgICAgICB2YXIgaXggPSBzdGFja1tzdGFjay5sZW5ndGgtMV1bMV1cbiAgICAgICAgaWYgKHN0YWNrLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICBzdGFjay5wb3AoKVxuICAgICAgICAgIHN0YWNrW3N0YWNrLmxlbmd0aC0xXVswXVsyXVtpeF0gPSBoKFxuICAgICAgICAgICAgY3VyWzBdLCBjdXJbMV0sIGN1clsyXS5sZW5ndGggPyBjdXJbMl0gOiB1bmRlZmluZWRcbiAgICAgICAgICApXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gT1BFTikge1xuICAgICAgICB2YXIgYyA9IFtwWzFdLHt9LFtdXVxuICAgICAgICBjdXJbMl0ucHVzaChjKVxuICAgICAgICBzdGFjay5wdXNoKFtjLGN1clsyXS5sZW5ndGgtMV0pXG4gICAgICB9IGVsc2UgaWYgKHMgPT09IEFUVFJfS0VZIHx8IChzID09PSBWQVIgJiYgcFsxXSA9PT0gQVRUUl9LRVkpKSB7XG4gICAgICAgIHZhciBrZXkgPSAnJ1xuICAgICAgICB2YXIgY29weUtleVxuICAgICAgICBmb3IgKDsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKHBhcnRzW2ldWzBdID09PSBBVFRSX0tFWSkge1xuICAgICAgICAgICAga2V5ID0gY29uY2F0KGtleSwgcGFydHNbaV1bMV0pXG4gICAgICAgICAgfSBlbHNlIGlmIChwYXJ0c1tpXVswXSA9PT0gVkFSICYmIHBhcnRzW2ldWzFdID09PSBBVFRSX0tFWSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBwYXJ0c1tpXVsyXSA9PT0gJ29iamVjdCcgJiYgIWtleSkge1xuICAgICAgICAgICAgICBmb3IgKGNvcHlLZXkgaW4gcGFydHNbaV1bMl0pIHtcbiAgICAgICAgICAgICAgICBpZiAocGFydHNbaV1bMl0uaGFzT3duUHJvcGVydHkoY29weUtleSkgJiYgIWN1clsxXVtjb3B5S2V5XSkge1xuICAgICAgICAgICAgICAgICAgY3VyWzFdW2NvcHlLZXldID0gcGFydHNbaV1bMl1bY29weUtleV1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGtleSA9IGNvbmNhdChrZXksIHBhcnRzW2ldWzJdKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBicmVha1xuICAgICAgICB9XG4gICAgICAgIGlmIChwYXJ0c1tpXVswXSA9PT0gQVRUUl9FUSkgaSsrXG4gICAgICAgIHZhciBqID0gaVxuICAgICAgICBmb3IgKDsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKHBhcnRzW2ldWzBdID09PSBBVFRSX1ZBTFVFIHx8IHBhcnRzW2ldWzBdID09PSBBVFRSX0tFWSkge1xuICAgICAgICAgICAgaWYgKCFjdXJbMV1ba2V5XSkgY3VyWzFdW2tleV0gPSBzdHJmbihwYXJ0c1tpXVsxXSlcbiAgICAgICAgICAgIGVsc2UgcGFydHNbaV1bMV09PT1cIlwiIHx8IChjdXJbMV1ba2V5XSA9IGNvbmNhdChjdXJbMV1ba2V5XSwgcGFydHNbaV1bMV0pKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHBhcnRzW2ldWzBdID09PSBWQVJcbiAgICAgICAgICAmJiAocGFydHNbaV1bMV0gPT09IEFUVFJfVkFMVUUgfHwgcGFydHNbaV1bMV0gPT09IEFUVFJfS0VZKSkge1xuICAgICAgICAgICAgaWYgKCFjdXJbMV1ba2V5XSkgY3VyWzFdW2tleV0gPSBzdHJmbihwYXJ0c1tpXVsyXSlcbiAgICAgICAgICAgIGVsc2UgcGFydHNbaV1bMl09PT1cIlwiIHx8IChjdXJbMV1ba2V5XSA9IGNvbmNhdChjdXJbMV1ba2V5XSwgcGFydHNbaV1bMl0pKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGtleS5sZW5ndGggJiYgIWN1clsxXVtrZXldICYmIGkgPT09IGpcbiAgICAgICAgICAgICYmIChwYXJ0c1tpXVswXSA9PT0gQ0xPU0UgfHwgcGFydHNbaV1bMF0gPT09IEFUVFJfQlJFQUspKSB7XG4gICAgICAgICAgICAgIC8vIGh0dHBzOi8vaHRtbC5zcGVjLndoYXR3Zy5vcmcvbXVsdGlwYWdlL2luZnJhc3RydWN0dXJlLmh0bWwjYm9vbGVhbi1hdHRyaWJ1dGVzXG4gICAgICAgICAgICAgIC8vIGVtcHR5IHN0cmluZyBpcyBmYWxzeSwgbm90IHdlbGwgYmVoYXZlZCB2YWx1ZSBpbiBicm93c2VyXG4gICAgICAgICAgICAgIGN1clsxXVtrZXldID0ga2V5LnRvTG93ZXJDYXNlKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwYXJ0c1tpXVswXSA9PT0gQ0xPU0UpIHtcbiAgICAgICAgICAgICAgaS0tXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChzID09PSBBVFRSX0tFWSkge1xuICAgICAgICBjdXJbMV1bcFsxXV0gPSB0cnVlXG4gICAgICB9IGVsc2UgaWYgKHMgPT09IFZBUiAmJiBwWzFdID09PSBBVFRSX0tFWSkge1xuICAgICAgICBjdXJbMV1bcFsyXV0gPSB0cnVlXG4gICAgICB9IGVsc2UgaWYgKHMgPT09IENMT1NFKSB7XG4gICAgICAgIGlmIChzZWxmQ2xvc2luZyhjdXJbMF0pICYmIHN0YWNrLmxlbmd0aCkge1xuICAgICAgICAgIHZhciBpeCA9IHN0YWNrW3N0YWNrLmxlbmd0aC0xXVsxXVxuICAgICAgICAgIHN0YWNrLnBvcCgpXG4gICAgICAgICAgc3RhY2tbc3RhY2subGVuZ3RoLTFdWzBdWzJdW2l4XSA9IGgoXG4gICAgICAgICAgICBjdXJbMF0sIGN1clsxXSwgY3VyWzJdLmxlbmd0aCA/IGN1clsyXSA6IHVuZGVmaW5lZFxuICAgICAgICAgIClcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChzID09PSBWQVIgJiYgcFsxXSA9PT0gVEVYVCkge1xuICAgICAgICBpZiAocFsyXSA9PT0gdW5kZWZpbmVkIHx8IHBbMl0gPT09IG51bGwpIHBbMl0gPSAnJ1xuICAgICAgICBlbHNlIGlmICghcFsyXSkgcFsyXSA9IGNvbmNhdCgnJywgcFsyXSlcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkocFsyXVswXSkpIHtcbiAgICAgICAgICBjdXJbMl0ucHVzaC5hcHBseShjdXJbMl0sIHBbMl0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY3VyWzJdLnB1c2gocFsyXSlcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChzID09PSBURVhUKSB7XG4gICAgICAgIGN1clsyXS5wdXNoKHBbMV0pXG4gICAgICB9IGVsc2UgaWYgKHMgPT09IEFUVFJfRVEgfHwgcyA9PT0gQVRUUl9CUkVBSykge1xuICAgICAgICAvLyBuby1vcFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bmhhbmRsZWQ6ICcgKyBzKVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0cmVlWzJdLmxlbmd0aCA+IDEgJiYgL15cXHMqJC8udGVzdCh0cmVlWzJdWzBdKSkge1xuICAgICAgdHJlZVsyXS5zaGlmdCgpXG4gICAgfVxuXG4gICAgaWYgKHRyZWVbMl0ubGVuZ3RoID4gMlxuICAgIHx8ICh0cmVlWzJdLmxlbmd0aCA9PT0gMiAmJiAvXFxTLy50ZXN0KHRyZWVbMl1bMV0pKSkge1xuICAgICAgaWYgKG9wdHMuY3JlYXRlRnJhZ21lbnQpIHJldHVybiBvcHRzLmNyZWF0ZUZyYWdtZW50KHRyZWVbMl0pXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdtdWx0aXBsZSByb290IGVsZW1lbnRzIG11c3QgYmUgd3JhcHBlZCBpbiBhbiBlbmNsb3NpbmcgdGFnJ1xuICAgICAgKVxuICAgIH1cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh0cmVlWzJdWzBdKSAmJiB0eXBlb2YgdHJlZVsyXVswXVswXSA9PT0gJ3N0cmluZydcbiAgICAmJiBBcnJheS5pc0FycmF5KHRyZWVbMl1bMF1bMl0pKSB7XG4gICAgICB0cmVlWzJdWzBdID0gaCh0cmVlWzJdWzBdWzBdLCB0cmVlWzJdWzBdWzFdLCB0cmVlWzJdWzBdWzJdKVxuICAgIH1cbiAgICByZXR1cm4gdHJlZVsyXVswXVxuXG4gICAgZnVuY3Rpb24gcGFyc2UgKHN0cikge1xuICAgICAgdmFyIHJlcyA9IFtdXG4gICAgICBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUVfVykgc3RhdGUgPSBBVFRSXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgYyA9IHN0ci5jaGFyQXQoaSlcbiAgICAgICAgaWYgKHN0YXRlID09PSBURVhUICYmIGMgPT09ICc8Jykge1xuICAgICAgICAgIGlmIChyZWcubGVuZ3RoKSByZXMucHVzaChbVEVYVCwgcmVnXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gT1BFTlxuICAgICAgICB9IGVsc2UgaWYgKGMgPT09ICc+JyAmJiAhcXVvdChzdGF0ZSkgJiYgc3RhdGUgIT09IENPTU1FTlQpIHtcbiAgICAgICAgICBpZiAoc3RhdGUgPT09IE9QRU4gJiYgcmVnLmxlbmd0aCkge1xuICAgICAgICAgICAgcmVzLnB1c2goW09QRU4scmVnXSlcbiAgICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX0tFWSkge1xuICAgICAgICAgICAgcmVzLnB1c2goW0FUVFJfS0VZLHJlZ10pXG4gICAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRSAmJiByZWcubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWddKVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXMucHVzaChbQ0xPU0VdKVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBURVhUXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IENPTU1FTlQgJiYgLy0kLy50ZXN0KHJlZykgJiYgYyA9PT0gJy0nKSB7XG4gICAgICAgICAgaWYgKG9wdHMuY29tbWVudHMpIHtcbiAgICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX1ZBTFVFLHJlZy5zdWJzdHIoMCwgcmVnLmxlbmd0aCAtIDEpXSlcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IFRFWFRcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gT1BFTiAmJiAvXiEtLSQvLnRlc3QocmVnKSkge1xuICAgICAgICAgIGlmIChvcHRzLmNvbW1lbnRzKSB7XG4gICAgICAgICAgICByZXMucHVzaChbT1BFTiwgcmVnXSxbQVRUUl9LRVksJ2NvbW1lbnQnXSxbQVRUUl9FUV0pXG4gICAgICAgICAgfVxuICAgICAgICAgIHJlZyA9IGNcbiAgICAgICAgICBzdGF0ZSA9IENPTU1FTlRcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gVEVYVCB8fCBzdGF0ZSA9PT0gQ09NTUVOVCkge1xuICAgICAgICAgIHJlZyArPSBjXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IE9QRU4gJiYgYyA9PT0gJy8nICYmIHJlZy5sZW5ndGgpIHtcbiAgICAgICAgICAvLyBuby1vcCwgc2VsZiBjbG9zaW5nIHRhZyB3aXRob3V0IGEgc3BhY2UgPGJyLz5cbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gT1BFTiAmJiAvXFxzLy50ZXN0KGMpKSB7XG4gICAgICAgICAgaWYgKHJlZy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJlcy5wdXNoKFtPUEVOLCByZWddKVxuICAgICAgICAgIH1cbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gQVRUUlxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBPUEVOKSB7XG4gICAgICAgICAgcmVnICs9IGNcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUiAmJiAvW15cXHNcIic9L10vLnRlc3QoYykpIHtcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJfS0VZXG4gICAgICAgICAgcmVnID0gY1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSICYmIC9cXHMvLnRlc3QoYykpIHtcbiAgICAgICAgICBpZiAocmVnLmxlbmd0aCkgcmVzLnB1c2goW0FUVFJfS0VZLHJlZ10pXG4gICAgICAgICAgcmVzLnB1c2goW0FUVFJfQlJFQUtdKVxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX0tFWSAmJiAvXFxzLy50ZXN0KGMpKSB7XG4gICAgICAgICAgcmVzLnB1c2goW0FUVFJfS0VZLHJlZ10pXG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJfS0VZX1dcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9LRVkgJiYgYyA9PT0gJz0nKSB7XG4gICAgICAgICAgcmVzLnB1c2goW0FUVFJfS0VZLHJlZ10sW0FUVFJfRVFdKVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBBVFRSX1ZBTFVFX1dcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgICByZWcgKz0gY1xuICAgICAgICB9IGVsc2UgaWYgKChzdGF0ZSA9PT0gQVRUUl9LRVlfVyB8fCBzdGF0ZSA9PT0gQVRUUikgJiYgYyA9PT0gJz0nKSB7XG4gICAgICAgICAgcmVzLnB1c2goW0FUVFJfRVFdKVxuICAgICAgICAgIHN0YXRlID0gQVRUUl9WQUxVRV9XXG4gICAgICAgIH0gZWxzZSBpZiAoKHN0YXRlID09PSBBVFRSX0tFWV9XIHx8IHN0YXRlID09PSBBVFRSKSAmJiAhL1xccy8udGVzdChjKSkge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX0JSRUFLXSlcbiAgICAgICAgICBpZiAoL1tcXHctXS8udGVzdChjKSkge1xuICAgICAgICAgICAgcmVnICs9IGNcbiAgICAgICAgICAgIHN0YXRlID0gQVRUUl9LRVlcbiAgICAgICAgICB9IGVsc2Ugc3RhdGUgPSBBVFRSXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUVfVyAmJiBjID09PSAnXCInKSB7XG4gICAgICAgICAgc3RhdGUgPSBBVFRSX1ZBTFVFX0RRXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUVfVyAmJiBjID09PSBcIidcIikge1xuICAgICAgICAgIHN0YXRlID0gQVRUUl9WQUxVRV9TUVxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX0RRICYmIGMgPT09ICdcIicpIHtcbiAgICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWddLFtBVFRSX0JSRUFLXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gQVRUUlxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX1NRICYmIGMgPT09IFwiJ1wiKSB7XG4gICAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnXSxbQVRUUl9CUkVBS10pXG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9XICYmICEvXFxzLy50ZXN0KGMpKSB7XG4gICAgICAgICAgc3RhdGUgPSBBVFRSX1ZBTFVFXG4gICAgICAgICAgaS0tXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUUgJiYgL1xccy8udGVzdChjKSkge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX1ZBTFVFLHJlZ10sW0FUVFJfQlJFQUtdKVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBBVFRSXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUUgfHwgc3RhdGUgPT09IEFUVFJfVkFMVUVfU1FcbiAgICAgICAgfHwgc3RhdGUgPT09IEFUVFJfVkFMVUVfRFEpIHtcbiAgICAgICAgICByZWcgKz0gY1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoc3RhdGUgPT09IFRFWFQgJiYgcmVnLmxlbmd0aCkge1xuICAgICAgICByZXMucHVzaChbVEVYVCxyZWddKVxuICAgICAgICByZWcgPSAnJ1xuICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRSAmJiByZWcubGVuZ3RoKSB7XG4gICAgICAgIHJlcy5wdXNoKFtBVFRSX1ZBTFVFLHJlZ10pXG4gICAgICAgIHJlZyA9ICcnXG4gICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX0RRICYmIHJlZy5sZW5ndGgpIHtcbiAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnXSlcbiAgICAgICAgcmVnID0gJydcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUVfU1EgJiYgcmVnLmxlbmd0aCkge1xuICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWddKVxuICAgICAgICByZWcgPSAnJ1xuICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgcmVzLnB1c2goW0FUVFJfS0VZLHJlZ10pXG4gICAgICAgIHJlZyA9ICcnXG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc3RyZm4gKHgpIHtcbiAgICBpZiAodHlwZW9mIHggPT09ICdmdW5jdGlvbicpIHJldHVybiB4XG4gICAgZWxzZSBpZiAodHlwZW9mIHggPT09ICdzdHJpbmcnKSByZXR1cm4geFxuICAgIGVsc2UgaWYgKHggJiYgdHlwZW9mIHggPT09ICdvYmplY3QnKSByZXR1cm4geFxuICAgIGVsc2UgaWYgKHggPT09IG51bGwgfHwgeCA9PT0gdW5kZWZpbmVkKSByZXR1cm4geFxuICAgIGVsc2UgcmV0dXJuIGNvbmNhdCgnJywgeClcbiAgfVxufVxuXG5mdW5jdGlvbiBxdW90IChzdGF0ZSkge1xuICByZXR1cm4gc3RhdGUgPT09IEFUVFJfVkFMVUVfU1EgfHwgc3RhdGUgPT09IEFUVFJfVkFMVUVfRFFcbn1cblxudmFyIGNsb3NlUkUgPSBSZWdFeHAoJ14oJyArIFtcbiAgJ2FyZWEnLCAnYmFzZScsICdiYXNlZm9udCcsICdiZ3NvdW5kJywgJ2JyJywgJ2NvbCcsICdjb21tYW5kJywgJ2VtYmVkJyxcbiAgJ2ZyYW1lJywgJ2hyJywgJ2ltZycsICdpbnB1dCcsICdpc2luZGV4JywgJ2tleWdlbicsICdsaW5rJywgJ21ldGEnLCAncGFyYW0nLFxuICAnc291cmNlJywgJ3RyYWNrJywgJ3dicicsICchLS0nLFxuICAvLyBTVkcgVEFHU1xuICAnYW5pbWF0ZScsICdhbmltYXRlVHJhbnNmb3JtJywgJ2NpcmNsZScsICdjdXJzb3InLCAnZGVzYycsICdlbGxpcHNlJyxcbiAgJ2ZlQmxlbmQnLCAnZmVDb2xvck1hdHJpeCcsICdmZUNvbXBvc2l0ZScsXG4gICdmZUNvbnZvbHZlTWF0cml4JywgJ2ZlRGlmZnVzZUxpZ2h0aW5nJywgJ2ZlRGlzcGxhY2VtZW50TWFwJyxcbiAgJ2ZlRGlzdGFudExpZ2h0JywgJ2ZlRmxvb2QnLCAnZmVGdW5jQScsICdmZUZ1bmNCJywgJ2ZlRnVuY0cnLCAnZmVGdW5jUicsXG4gICdmZUdhdXNzaWFuQmx1cicsICdmZUltYWdlJywgJ2ZlTWVyZ2VOb2RlJywgJ2ZlTW9ycGhvbG9neScsXG4gICdmZU9mZnNldCcsICdmZVBvaW50TGlnaHQnLCAnZmVTcGVjdWxhckxpZ2h0aW5nJywgJ2ZlU3BvdExpZ2h0JywgJ2ZlVGlsZScsXG4gICdmZVR1cmJ1bGVuY2UnLCAnZm9udC1mYWNlLWZvcm1hdCcsICdmb250LWZhY2UtbmFtZScsICdmb250LWZhY2UtdXJpJyxcbiAgJ2dseXBoJywgJ2dseXBoUmVmJywgJ2hrZXJuJywgJ2ltYWdlJywgJ2xpbmUnLCAnbWlzc2luZy1nbHlwaCcsICdtcGF0aCcsXG4gICdwYXRoJywgJ3BvbHlnb24nLCAncG9seWxpbmUnLCAncmVjdCcsICdzZXQnLCAnc3RvcCcsICd0cmVmJywgJ3VzZScsICd2aWV3JyxcbiAgJ3ZrZXJuJ1xuXS5qb2luKCd8JykgKyAnKSg/OltcXC4jXVthLXpBLVowLTlcXHUwMDdGLVxcdUZGRkZfOi1dKykqJCcpXG5mdW5jdGlvbiBzZWxmQ2xvc2luZyAodGFnKSB7IHJldHVybiBjbG9zZVJFLnRlc3QodGFnKSB9XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBcImVudGl0eUxpc3RcIjogXCJodHRwczovL2R1Y2tkdWNrZ28uY29tL2NvbnRlbnRibG9ja2luZy5qcz9sPWVudGl0eWxpc3QyXCIsXG4gICAgXCJlbnRpdHlNYXBcIjogXCJkYXRhL3RyYWNrZXJfbGlzdHMvZW50aXR5TWFwLmpzb25cIixcbiAgICBcImRpc3BsYXlDYXRlZ29yaWVzXCI6IFtcIkFuYWx5dGljc1wiLCBcIkFkdmVydGlzaW5nXCIsIFwiU29jaWFsIE5ldHdvcmtcIl0sXG4gICAgXCJyZXF1ZXN0TGlzdGVuZXJUeXBlc1wiOiBbXCJtYWluX2ZyYW1lXCIsXCJzdWJfZnJhbWVcIixcInN0eWxlc2hlZXRcIixcInNjcmlwdFwiLFwiaW1hZ2VcIixcIm9iamVjdFwiLFwieG1saHR0cHJlcXVlc3RcIixcIm90aGVyXCJdLFxuICAgIFwiZmVlZGJhY2tVcmxcIjogXCJodHRwczovL2R1Y2tkdWNrZ28uY29tL2ZlZWRiYWNrLmpzP3R5cGU9ZXh0ZW5zaW9uLWZlZWRiYWNrXCIsXG4gICAgXCJ0b3Nkck1lc3NhZ2VzXCIgOiB7XG4gICAgICAgIFwiQVwiOiBcIkdvb2RcIixcbiAgICAgICAgXCJCXCI6IFwiTWl4ZWRcIixcbiAgICAgICAgXCJDXCI6IFwiUG9vclwiLFxuICAgICAgICBcIkRcIjogXCJQb29yXCIsXG4gICAgICAgIFwiRVwiOiBcIlBvb3JcIixcbiAgICAgICAgXCJnb29kXCI6IFwiR29vZFwiLFxuICAgICAgICBcImJhZFwiOiBcIlBvb3JcIixcbiAgICAgICAgXCJ1bmtub3duXCI6IFwiVW5rbm93blwiLFxuICAgICAgICBcIm1peGVkXCI6IFwiTWl4ZWRcIlxuICAgIH0sXG4gICAgXCJodHRwc1NlcnZpY2VcIjogXCJodHRwczovL2R1Y2tkdWNrZ28uY29tL3NtYXJ0ZXJfZW5jcnlwdGlvbi5qc1wiLFxuICAgIFwiZHVja0R1Y2tHb1NlcnBIb3N0bmFtZVwiOiBcImR1Y2tkdWNrZ28uY29tXCIsXG4gICAgXCJodHRwc01lc3NhZ2VzXCI6IHtcbiAgICAgICAgXCJzZWN1cmVcIjogXCJFbmNyeXB0ZWQgQ29ubmVjdGlvblwiLFxuICAgICAgICBcInVwZ3JhZGVkXCI6IFwiRm9yY2VkIEVuY3J5cHRpb25cIixcbiAgICAgICAgXCJub25lXCI6IFwiVW5lbmNyeXB0ZWQgQ29ubmVjdGlvblwiLFxuICAgIH0sXG4gICAgLyoqXG4gICAgICogTWFqb3IgdHJhY2tpbmcgbmV0d29ya3MgZGF0YTpcbiAgICAgKiBwZXJjZW50IG9mIHRoZSB0b3AgMSBtaWxsaW9uIHNpdGVzIGEgdHJhY2tpbmcgbmV0d29yayBoYXMgYmVlbiBzZWVuIG9uLlxuICAgICAqIHNlZTogaHR0cHM6Ly93ZWJ0cmFuc3BhcmVuY3kuY3MucHJpbmNldG9uLmVkdS93ZWJjZW5zdXMvXG4gICAgICovXG4gICAgXCJtYWpvclRyYWNraW5nTmV0d29ya3NcIjoge1xuICAgICAgICBcImdvb2dsZVwiOiA4NCxcbiAgICAgICAgXCJmYWNlYm9va1wiOiAzNixcbiAgICAgICAgXCJ0d2l0dGVyXCI6IDE2LFxuICAgICAgICBcImFtYXpvblwiOiAxNCxcbiAgICAgICAgXCJhcHBuZXh1c1wiOiAxMCxcbiAgICAgICAgXCJvcmFjbGVcIjogMTAsXG4gICAgICAgIFwibWVkaWFtYXRoXCI6IDksXG4gICAgICAgIFwib2F0aFwiOiA5LFxuICAgICAgICBcIm1heGNkblwiOiA3LFxuICAgICAgICBcImF1dG9tYXR0aWNcIjogN1xuICAgIH0sXG4gICAgLypcbiAgICAgKiBNYXBwaW5nIGVudGl0eSBuYW1lcyB0byBDU1MgY2xhc3MgbmFtZSBmb3IgcG9wdXAgaWNvbnNcbiAgICAgKi9cbiAgICBcImVudGl0eUljb25NYXBwaW5nXCI6IHtcbiAgICAgICAgXCJHb29nbGUgTExDXCI6IFwiZ29vZ2xlXCIsXG4gICAgICAgIFwiRmFjZWJvb2ssIEluYy5cIjogXCJmYWNlYm9va1wiLFxuICAgICAgICBcIlR3aXR0ZXIsIEluYy5cIjogXCJ0d2l0dGVyXCIsXG4gICAgICAgIFwiQW1hem9uIFRlY2hub2xvZ2llcywgSW5jLlwiOiBcImFtYXpvblwiLFxuICAgICAgICBcIkFwcE5leHVzLCBJbmMuXCI6IFwiYXBwbmV4dXNcIixcbiAgICAgICAgXCJNZWRpYU1hdGgsIEluYy5cIjogXCJtZWRpYW1hdGhcIixcbiAgICAgICAgXCJTdGFja1BhdGgsIExMQ1wiOiBcIm1heGNkblwiLFxuICAgICAgICBcIkF1dG9tYXR0aWMsIEluYy5cIjogXCJhdXRvbWF0dGljXCIsXG4gICAgICAgIFwiQWRvYmUgSW5jLlwiOiBcImFkb2JlXCIsXG4gICAgICAgIFwiUXVhbnRjYXN0IENvcnBvcmF0aW9uXCI6IFwicXVhbnRjYXN0XCIsXG4gICAgICAgIFwiVGhlIE5pZWxzZW4gQ29tcGFueVwiOiBcIm5pZWxzZW5cIlxuICAgIH0sXG4gICAgXCJodHRwc0RCTmFtZVwiOiBcImh0dHBzXCIsXG4gICAgXCJodHRwc0xpc3RzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidXBncmFkZSBibG9vbSBmaWx0ZXJcIixcbiAgICAgICAgICAgIFwibmFtZVwiOiBcImh0dHBzVXBncmFkZUJsb29tRmlsdGVyXCIsXG4gICAgICAgICAgICBcInVybFwiOiBcImh0dHBzOi8vc3RhdGljY2RuLmR1Y2tkdWNrZ28uY29tL2h0dHBzL2h0dHBzLWJsb29tLmpzb25cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJkb25cXCd0IHVwZ3JhZGUgYmxvb20gZmlsdGVyXCIsXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJodHRwc0RvbnRVcGdyYWRlQmxvb21GaWx0ZXJzXCIsXG4gICAgICAgICAgICBcInVybFwiOiBcImh0dHBzOi8vc3RhdGljY2RuLmR1Y2tkdWNrZ28uY29tL2h0dHBzL25lZ2F0aXZlLWh0dHBzLWJsb29tLmpzb25cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJ1cGdyYWRlIHNhZmVsaXN0XCIsXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJodHRwc1VwZ3JhZGVMaXN0XCIsXG4gICAgICAgICAgICBcInVybFwiOiBcImh0dHBzOi8vc3RhdGljY2RuLmR1Y2tkdWNrZ28uY29tL2h0dHBzL25lZ2F0aXZlLWh0dHBzLXdoaXRlbGlzdC5qc29uXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZG9uXFwndCB1cGdyYWRlIHNhZmVsaXN0XCIsXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJodHRwc0RvbnRVcGdyYWRlTGlzdFwiLFxuICAgICAgICAgICAgXCJ1cmxcIjogXCJodHRwczovL3N0YXRpY2Nkbi5kdWNrZHVja2dvLmNvbS9odHRwcy9odHRwcy13aGl0ZWxpc3QuanNvblwiXG4gICAgICAgIH0sXG4gICAgXSxcbiAgICBcInRkc0xpc3RzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwic3Vycm9nYXRlc1wiLFxuICAgICAgICAgICAgXCJ1cmxcIjogXCIvZGF0YS9zdXJyb2dhdGVzLnR4dFwiLFxuICAgICAgICAgICAgXCJmb3JtYXRcIjogXCJ0ZXh0XCIsXG4gICAgICAgICAgICBcInNvdXJjZVwiOiBcImxvY2FsXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwidGRzXCIsXG4gICAgICAgICAgICBcInVybFwiOiBcImh0dHBzOi8vc3RhdGljY2RuLmR1Y2tkdWNrZ28uY29tL3RyYWNrZXJibG9ja2luZy92Mi4xL3Rkcy5qc29uXCIsXG4gICAgICAgICAgICBcImZvcm1hdFwiOiBcImpzb25cIixcbiAgICAgICAgICAgIFwic291cmNlXCI6IFwiZXh0ZXJuYWxcIixcbiAgICAgICAgICAgIFwiY2hhbm5lbHNcIjoge1xuICAgICAgICAgICAgICAgIFwibGl2ZVwiOiBcImh0dHBzOi8vc3RhdGljY2RuLmR1Y2tkdWNrZ28uY29tL3RyYWNrZXJibG9ja2luZy92Mi4xL3Rkcy5qc29uXCIsXG4gICAgICAgICAgICAgICAgXCJuZXh0XCI6IFwiaHR0cHM6Ly9zdGF0aWNjZG4uZHVja2R1Y2tnby5jb20vdHJhY2tlcmJsb2NraW5nL3YyLjEvdGRzLW5leHQuanNvblwiLFxuICAgICAgICAgICAgICAgIFwiYmV0YVwiOiBcImh0dHBzOi8vc3RhdGljY2RuLmR1Y2tkdWNrZ28uY29tL3RyYWNrZXJibG9ja2luZy9iZXRhL3Rkcy5qc29uXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiQ2xpY2tUb0xvYWRDb25maWdcIixcbiAgICAgICAgICAgIFwidXJsXCI6IFwiaHR0cHM6Ly9zdGF0aWNjZG4uZHVja2R1Y2tnby5jb20vdXNlcmFnZW50cy9zb2NpYWxfY3RwX2NvbmZpZ3VyYXRpb24uanNvblwiLFxuICAgICAgICAgICAgXCJmb3JtYXRcIjogXCJqc29uXCIsXG4gICAgICAgICAgICBcInNvdXJjZVwiOiBcImV4dGVybmFsXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiY29uZmlnXCIsXG4gICAgICAgICAgICBcInVybFwiOiBcImh0dHBzOi8vc3RhdGljY2RuLmR1Y2tkdWNrZ28uY29tL3RyYWNrZXJibG9ja2luZy9jb25maWcvdjEvZXh0ZW5zaW9uLWNvbmZpZy5qc29uXCIsXG4gICAgICAgICAgICBcImZvcm1hdFwiOiBcImpzb25cIixcbiAgICAgICAgICAgIFwic291cmNlXCI6IFwiZXh0ZXJuYWxcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcImh0dHBzRXJyb3JDb2Rlc1wiOiB7XG4gICAgICAgIFwibmV0OjpFUlJfQ09OTkVDVElPTl9SRUZVU0VEXCI6IDEsXG4gICAgICAgIFwibmV0OjpFUlJfQUJPUlRFRFwiOiAyLFxuICAgICAgICBcIm5ldDo6RVJSX1NTTF9QUk9UT0NPTF9FUlJPUlwiOiAzLFxuICAgICAgICBcIm5ldDo6RVJSX1NTTF9WRVJTSU9OX09SX0NJUEhFUl9NSVNNQVRDSFwiOiA0LFxuICAgICAgICBcIm5ldDo6RVJSX05BTUVfTk9UX1JFU09MVkVEXCI6IDUsXG4gICAgICAgIFwiTlNfRVJST1JfQ09OTkVDVElPTl9SRUZVU0VEXCI6IDYsXG4gICAgICAgIFwiTlNfRVJST1JfVU5LTk9XTl9IT1NUXCI6IDcsXG4gICAgICAgIFwiQW4gYWRkaXRpb25hbCBwb2xpY3kgY29uc3RyYWludCBmYWlsZWQgd2hlbiB2YWxpZGF0aW5nIHRoaXMgY2VydGlmaWNhdGUuXCI6IDgsXG4gICAgICAgIFwiVW5hYmxlIHRvIGNvbW11bmljYXRlIHNlY3VyZWx5IHdpdGggcGVlcjogcmVxdWVzdGVkIGRvbWFpbiBuYW1lIGRvZXMgbm90IG1hdGNoIHRoZSBzZXJ2ZXLigJlzIGNlcnRpZmljYXRlLlwiOiA5LFxuICAgICAgICBcIkNhbm5vdCBjb21tdW5pY2F0ZSBzZWN1cmVseSB3aXRoIHBlZXI6IG5vIGNvbW1vbiBlbmNyeXB0aW9uIGFsZ29yaXRobShzKS5cIjogMTAsXG4gICAgICAgIFwiU1NMIHJlY2VpdmVkIGEgcmVjb3JkIHRoYXQgZXhjZWVkZWQgdGhlIG1heGltdW0gcGVybWlzc2libGUgbGVuZ3RoLlwiOiAxMSxcbiAgICAgICAgXCJUaGUgY2VydGlmaWNhdGUgaXMgbm90IHRydXN0ZWQgYmVjYXVzZSBpdCBpcyBzZWxmLXNpZ25lZC5cIjogMTIsXG4gICAgICAgIFwiZG93bmdyYWRlX3JlZGlyZWN0X2xvb3BcIjogMTNcbiAgICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBcImV4dGVuc2lvbklzRW5hYmxlZFwiOiB0cnVlLFxuICAgIFwic29jaWFsQmxvY2tpbmdJc0VuYWJsZWRcIjogZmFsc2UsXG4gICAgXCJ0cmFja2VyQmxvY2tpbmdFbmFibGVkXCI6IHRydWUsXG4gICAgXCJodHRwc0V2ZXJ5d2hlcmVFbmFibGVkXCI6IHRydWUsXG4gICAgXCJlbWJlZGRlZFR3ZWV0c0VuYWJsZWRcIjogZmFsc2UsXG4gICAgXCJHUENcIjogdHJ1ZSxcbiAgICBcIm1lYW5pbmdzXCI6IHRydWUsXG4gICAgXCJhZHZhbmNlZF9vcHRpb25zXCI6IHRydWUsXG4gICAgXCJsYXN0X3NlYXJjaFwiOiBcIlwiLFxuICAgIFwibGFzdHNlYXJjaF9lbmFibGVkXCI6IHRydWUsXG4gICAgXCJzYWZlc2VhcmNoXCI6IHRydWUsXG4gICAgXCJ1c2VfcG9zdFwiOiBmYWxzZSxcbiAgICBcImR1Y2t5XCI6IGZhbHNlLFxuICAgIFwiZGV2XCI6IGZhbHNlLFxuICAgIFwiemVyb2NsaWNrX2dvb2dsZV9yaWdodFwiOiBmYWxzZSxcbiAgICBcInZlcnNpb25cIjogbnVsbCxcbiAgICBcImF0YlwiOiBudWxsLFxuICAgIFwic2V0X2F0YlwiOiBudWxsLFxuICAgIFwidHJhY2tlcnNXaGl0ZWxpc3RUZW1wb3JhcnktZXRhZ1wiOiBudWxsLFxuICAgIFwidHJhY2tlcnNXaGl0ZWxpc3QtZXRhZ1wiOiBudWxsLFxuICAgIFwic3Vycm9nYXRlTGlzdC1ldGFnXCI6IG51bGwsXG4gICAgXCJodHRwc1VwZ3JhZGVCbG9vbUZpbHRlci1ldGFnXCI6IG51bGwsXG4gICAgXCJodHRwc0RvbnRVcGdyYWRlQmxvb21GaWx0ZXJzLWV0YWdcIjogbnVsbCxcbiAgICBcImh0dHBzVXBncmFkZUxpc3QtZXRhZ1wiOiBudWxsLFxuICAgIFwiaHR0cHNEb250VXBncmFkZUxpc3QtZXRhZ1wiOiBudWxsLFxuICAgIFwiaGFzU2VlblBvc3RJbnN0YWxsXCI6IGZhbHNlLFxuICAgIFwiZXh0aVNlbnRcIjogZmFsc2UsXG4gICAgXCJmYWlsZWRVcGdyYWRlc1wiOiAwLFxuICAgIFwidG90YWxVcGdyYWRlc1wiOiAwLFxuICAgIFwidGRzLWV0YWdcIjogbnVsbCxcbiAgICBcInN1cnJvZ2F0ZXMtZXRhZ1wiOiBudWxsLFxuICAgIFwiYnJva2VuU2l0ZUxpc3QtZXRhZ1wiOiBudWxsLFxuICAgIFwibGFzdFRkc1VwZGF0ZVwiOiAwXG59XG4iLCJcbmNvbnN0IFJFTEVBU0VfRVhURU5TSU9OX0lEUyA9IFtcbiAgICAnY2FvYWNiaW1kYmJsamFrZmhnaWtvb2Rla2RubGNncGsnLCAvLyBlZGdlIHN0b3JlXG4gICAgJ2JrZGdmbGNsZG5ubmFwYmxraHBoYmdwZ2dkaWlrcHBnJywgLy8gY2hyb21lIHN0b3JlXG4gICAgJ2ppZDEtWkFkSUVVQjdYT3pPSndAamV0cGFjaycgLy8gZmlyZWZveFxuXVxuY29uc3QgSVNfQkVUQSA9IFJFTEVBU0VfRVhURU5TSU9OX0lEUy5pbmRleE9mKGNocm9tZS5ydW50aW1lLmlkKSA9PT0gLTFcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgSVNfQkVUQVxufVxuIiwiY29uc3QgeyBnZXRTZXR0aW5nLCB1cGRhdGVTZXR0aW5nIH0gPSByZXF1aXJlKCcuL3NldHRpbmdzLmVzNicpXG5jb25zdCBSRUZFVENIX0FMSUFTX0FMQVJNID0gJ3JlZmV0Y2hBbGlhcydcblxuLy8gS2VlcCB0cmFjayBvZiB0aGUgbnVtYmVyIG9mIGF0dGVtcHRlZCBmZXRjaGVzLiBTdG9wIHRyeWluZyBhZnRlciA1LlxubGV0IGF0dGVtcHRzID0gMVxuXG5jb25zdCBmZXRjaEFsaWFzID0gKCkgPT4ge1xuICAgIC8vIGlmIGFub3RoZXIgZmV0Y2ggd2FzIHByZXZpb3VzbHkgc2NoZWR1bGVkLCBjbGVhciB0aGF0IGFuZCBleGVjdXRlIG5vd1xuICAgIGNocm9tZS5hbGFybXMuZ2V0KFJFRkVUQ0hfQUxJQVNfQUxBUk0sICgpID0+IGNocm9tZS5hbGFybXMuY2xlYXIoUkVGRVRDSF9BTElBU19BTEFSTSkpXG5cbiAgICBjb25zdCB1c2VyRGF0YSA9IGdldFNldHRpbmcoJ3VzZXJEYXRhJylcblxuICAgIGlmICghdXNlckRhdGE/LnRva2VuKSByZXR1cm5cblxuICAgIHJldHVybiBmZXRjaCgnaHR0cHM6Ly9xdWFjay5kdWNrZHVja2dvLmNvbS9hcGkvZW1haWwvYWRkcmVzc2VzJywge1xuICAgICAgICBtZXRob2Q6ICdwb3N0JyxcbiAgICAgICAgaGVhZGVyczogeyBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7dXNlckRhdGEudG9rZW59YCB9XG4gICAgfSlcbiAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKS50aGVuKCh7IGFkZHJlc3MgfSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIS9eW2EtejAtOV0rJC8udGVzdChhZGRyZXNzKSkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGFkZHJlc3MnKVxuXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZVNldHRpbmcoJ3VzZXJEYXRhJywgT2JqZWN0LmFzc2lnbih1c2VyRGF0YSwgeyBuZXh0QWxpYXM6IGAke2FkZHJlc3N9YCB9KSlcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVzZXQgYXR0ZW1wdHNcbiAgICAgICAgICAgICAgICAgICAgYXR0ZW1wdHMgPSAxXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQW4gZXJyb3Igb2NjdXJyZWQgd2hpbGUgZmV0Y2hpbmcgdGhlIGFsaWFzJylcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGUgPT4ge1xuICAgICAgICAgICAgLy8gVE9ETzogRG8gd2Ugd2FudCB0byBsb2dvdXQgaWYgdGhlIGVycm9yIGlzIGEgNDAxIHVuYXV0aG9yaXplZD9cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvciBmZXRjaGluZyBuZXcgYWxpYXMnLCBlKVxuICAgICAgICAgICAgLy8gRG9uJ3QgdHJ5IGZldGNoaW5nIG1vcmUgdGhhbiA1IHRpbWVzIGluIGEgcm93XG4gICAgICAgICAgICBpZiAoYXR0ZW1wdHMgPCA1KSB7XG4gICAgICAgICAgICAgICAgY2hyb21lLmFsYXJtcy5jcmVhdGUoUkVGRVRDSF9BTElBU19BTEFSTSwgeyBkZWxheUluTWludXRlczogMiB9KVxuICAgICAgICAgICAgICAgIGF0dGVtcHRzKytcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFJldHVybiB0aGUgZXJyb3Igc28gd2UgY2FuIGhhbmRsZSBpdFxuICAgICAgICAgICAgcmV0dXJuIHsgZXJyb3I6IGUgfVxuICAgICAgICB9KVxufVxuXG5jb25zdCBNRU5VX0lURU1fSUQgPSAnZGRnLWF1dG9maWxsLWNvbnRleHQtbWVudS1pdGVtJ1xuY29uc3QgY3JlYXRlQXV0b2ZpbGxDb250ZXh0TWVudUl0ZW0gPSAoKSA9PiB7XG4gICAgLy8gQ3JlYXRlIHRoZSBjb250ZXh0dWFsIG1lbnUgaGlkZGVuIGJ5IGRlZmF1bHRcbiAgICBjaHJvbWUuY29udGV4dE1lbnVzLmNyZWF0ZSh7XG4gICAgICAgIGlkOiBNRU5VX0lURU1fSUQsXG4gICAgICAgIHRpdGxlOiAnVXNlIER1Y2sgQWRkcmVzcycsXG4gICAgICAgIGNvbnRleHRzOiBbJ2VkaXRhYmxlJ10sXG4gICAgICAgIHZpc2libGU6IGZhbHNlLFxuICAgICAgICBvbmNsaWNrOiAoaW5mbywgdGFiKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB1c2VyRGF0YSA9IGdldFNldHRpbmcoJ3VzZXJEYXRhJylcbiAgICAgICAgICAgIGlmICh1c2VyRGF0YS5uZXh0QWxpYXMpIHtcbiAgICAgICAgICAgICAgICBjaHJvbWUudGFicy5zZW5kTWVzc2FnZSh0YWIuaWQsIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NvbnRleHR1YWxBdXRvZmlsbCcsXG4gICAgICAgICAgICAgICAgICAgIGFsaWFzOiB1c2VyRGF0YS5uZXh0QWxpYXNcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSlcbn1cblxuY29uc3Qgc2hvd0NvbnRleHRNZW51QWN0aW9uID0gKCkgPT4gY2hyb21lLmNvbnRleHRNZW51cy51cGRhdGUoTUVOVV9JVEVNX0lELCB7IHZpc2libGU6IHRydWUgfSlcblxuY29uc3QgaGlkZUNvbnRleHRNZW51QWN0aW9uID0gKCkgPT4gY2hyb21lLmNvbnRleHRNZW51cy51cGRhdGUoTUVOVV9JVEVNX0lELCB7IHZpc2libGU6IGZhbHNlIH0pXG5cbmNvbnN0IGdldEFkZHJlc3NlcyA9ICgpID0+IHtcbiAgICBjb25zdCB1c2VyRGF0YSA9IGdldFNldHRpbmcoJ3VzZXJEYXRhJylcbiAgICByZXR1cm4ge1xuICAgICAgICBwZXJzb25hbEFkZHJlc3M6IHVzZXJEYXRhPy51c2VyTmFtZSxcbiAgICAgICAgcHJpdmF0ZUFkZHJlc3M6IHVzZXJEYXRhPy5uZXh0QWxpYXNcbiAgICB9XG59XG5cbi8qKlxuICogR2l2ZW4gYSB1c2VybmFtZSwgcmV0dXJucyBhIHZhbGlkIGVtYWlsIGFkZHJlc3Mgd2l0aCB0aGUgZHVjayBkb21haW5cbiAqIEBwYXJhbSB7c3RyaW5nfSBhZGRyZXNzXG4gKiBAcmV0dXJucyB7c3RyaW5nfVxuICovXG5jb25zdCBmb3JtYXRBZGRyZXNzID0gKGFkZHJlc3MpID0+IGFkZHJlc3MgKyAnQGR1Y2suY29tJ1xuXG4vKipcbiAqIENoZWNrcyBmb3JtYWwgdXNlcm5hbWUgdmFsaWRpdHlcbiAqIEBwYXJhbSB7c3RyaW5nfSB1c2VyTmFtZVxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmNvbnN0IGlzVmFsaWRVc2VybmFtZSA9ICh1c2VyTmFtZSkgPT4gL15bYS16MC05X10rJC8udGVzdCh1c2VyTmFtZSlcblxuLyoqXG4gKiBDaGVja3MgZm9ybWFsIHRva2VuIHZhbGlkaXR5XG4gKiBAcGFyYW0ge3N0cmluZ30gdG9rZW5cbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5jb25zdCBpc1ZhbGlkVG9rZW4gPSAodG9rZW4pID0+IC9eW2EtejAtOV0rJC8udGVzdCh0b2tlbilcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgUkVGRVRDSF9BTElBU19BTEFSTSxcbiAgICBmZXRjaEFsaWFzLFxuICAgIGNyZWF0ZUF1dG9maWxsQ29udGV4dE1lbnVJdGVtLFxuICAgIHNob3dDb250ZXh0TWVudUFjdGlvbixcbiAgICBoaWRlQ29udGV4dE1lbnVBY3Rpb24sXG4gICAgZ2V0QWRkcmVzc2VzLFxuICAgIGZvcm1hdEFkZHJlc3MsXG4gICAgaXNWYWxpZFVzZXJuYW1lLFxuICAgIGlzVmFsaWRUb2tlblxufVxuIiwiY29uc3QgZGVmYXVsdFNldHRpbmdzID0gcmVxdWlyZSgnLi4vLi4vZGF0YS9kZWZhdWx0U2V0dGluZ3MnKVxuY29uc3QgYnJvd3NlcldyYXBwZXIgPSByZXF1aXJlKCcuL3dyYXBwZXIuZXM2JylcblxuLyoqXG4gKiBTZXR0aW5ncyB3aG9zZSBkZWZhdWx0cyBjYW4gYnkgbWFuYWdlZCBieSB0aGUgc3lzdGVtIGFkbWluaXN0cmF0b3JcbiAqL1xuY29uc3QgTUFOQUdFRF9TRVRUSU5HUyA9IFsnaGFzU2VlblBvc3RJbnN0YWxsJ11cbi8qKlxuICogUHVibGljIGFwaVxuICogVXNhZ2U6XG4gKiBZb3UgY2FuIHVzZSBwcm9taXNlIGNhbGxiYWNrcyB0byBjaGVjayByZWFkeW5lc3MgYmVmb3JlIGdldHRpbmcgYW5kIHVwZGF0aW5nXG4gKiBzZXR0aW5ncy5yZWFkeSgpLnRoZW4oKCkgPT4gc2V0dGluZ3MudXBkYXRlU2V0dGluZygnc2V0dGluZ05hbWUnLCBzZXR0aW5nVmFsdWUpKVxuICovXG5sZXQgc2V0dGluZ3MgPSB7fVxubGV0IGlzUmVhZHkgPSBmYWxzZVxuY29uc3QgX3JlYWR5ID0gaW5pdCgpLnRoZW4oKCkgPT4ge1xuICAgIGlzUmVhZHkgPSB0cnVlXG4gICAgY29uc29sZS5sb2coJ1NldHRpbmdzIGFyZSBsb2FkZWQnKVxufSlcblxuZnVuY3Rpb24gaW5pdCAoKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgIGJ1aWxkU2V0dGluZ3NGcm9tRGVmYXVsdHMoKVxuICAgICAgICBidWlsZFNldHRpbmdzRnJvbU1hbmFnZWRTdG9yYWdlKClcbiAgICAgICAgICAgIC50aGVuKGJ1aWxkU2V0dGluZ3NGcm9tTG9jYWxTdG9yYWdlKVxuICAgICAgICAgICAgLnRoZW4oKCkgPT4gcmVzb2x2ZSgpKVxuICAgIH0pXG59XG5cbmZ1bmN0aW9uIHJlYWR5ICgpIHtcbiAgICByZXR1cm4gX3JlYWR5XG59XG5cbmZ1bmN0aW9uIGJ1aWxkU2V0dGluZ3NGcm9tTG9jYWxTdG9yYWdlICgpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgYnJvd3NlcldyYXBwZXIuZ2V0RnJvbVN0b3JhZ2UoWydzZXR0aW5ncyddLCBmdW5jdGlvbiAocmVzdWx0cykge1xuICAgICAgICAgICAgLy8gY29weSBvdmVyIHNhdmVkIHNldHRpbmdzIGZyb20gc3RvcmFnZVxuICAgICAgICAgICAgaWYgKCFyZXN1bHRzKSByZXNvbHZlKClcbiAgICAgICAgICAgIHNldHRpbmdzID0gYnJvd3NlcldyYXBwZXIubWVyZ2VTYXZlZFNldHRpbmdzKHNldHRpbmdzLCByZXN1bHRzKVxuICAgICAgICAgICAgcmVzb2x2ZSgpXG4gICAgICAgIH0pXG4gICAgfSlcbn1cblxuZnVuY3Rpb24gYnVpbGRTZXR0aW5nc0Zyb21NYW5hZ2VkU3RvcmFnZSAoKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgIGJyb3dzZXJXcmFwcGVyLmdldEZyb21NYW5hZ2VkU3RvcmFnZShNQU5BR0VEX1NFVFRJTkdTLCAocmVzdWx0cykgPT4ge1xuICAgICAgICAgICAgc2V0dGluZ3MgPSBicm93c2VyV3JhcHBlci5tZXJnZVNhdmVkU2V0dGluZ3Moc2V0dGluZ3MsIHJlc3VsdHMpXG4gICAgICAgICAgICByZXNvbHZlKClcbiAgICAgICAgfSlcbiAgICB9KVxufVxuXG5mdW5jdGlvbiBidWlsZFNldHRpbmdzRnJvbURlZmF1bHRzICgpIHtcbiAgICAvLyBpbml0aWFsIHNldHRpbmdzIGFyZSBhIGNvcHkgb2YgZGVmYXVsdCBzZXR0aW5nc1xuICAgIHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdFNldHRpbmdzKVxufVxuXG5mdW5jdGlvbiBzeW5jU2V0dGluZ1RvbG9jYWxTdG9yYWdlICgpIHtcbiAgICBicm93c2VyV3JhcHBlci5zeW5jVG9TdG9yYWdlKHsgc2V0dGluZ3M6IHNldHRpbmdzIH0pXG59XG5cbmZ1bmN0aW9uIGdldFNldHRpbmcgKG5hbWUpIHtcbiAgICBpZiAoIWlzUmVhZHkpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBTZXR0aW5nczogZ2V0U2V0dGluZygpIFNldHRpbmdzIG5vdCBsb2FkZWQ6ICR7bmFtZX1gKVxuICAgICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBsZXQgYWxsIGFuZCBudWxsIHJldHVybiBhbGwgc2V0dGluZ3NcbiAgICBpZiAobmFtZSA9PT0gJ2FsbCcpIG5hbWUgPSBudWxsXG5cbiAgICBpZiAobmFtZSkge1xuICAgICAgICByZXR1cm4gc2V0dGluZ3NbbmFtZV1cbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gc2V0dGluZ3NcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVNldHRpbmcgKG5hbWUsIHZhbHVlKSB7XG4gICAgaWYgKCFpc1JlYWR5KSB7XG4gICAgICAgIGNvbnNvbGUud2FybihgU2V0dGluZ3M6IHVwZGF0ZVNldHRpbmcoKSBTZXR0aW5nIG5vdCBsb2FkZWQ6ICR7bmFtZX1gKVxuICAgICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBzZXR0aW5nc1tuYW1lXSA9IHZhbHVlXG4gICAgc3luY1NldHRpbmdUb2xvY2FsU3RvcmFnZSgpXG59XG5cbmZ1bmN0aW9uIHJlbW92ZVNldHRpbmcgKG5hbWUpIHtcbiAgICBpZiAoIWlzUmVhZHkpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBTZXR0aW5nczogcmVtb3ZlU2V0dGluZygpIFNldHRpbmcgbm90IGxvYWRlZDogJHtuYW1lfWApXG4gICAgICAgIHJldHVyblxuICAgIH1cbiAgICBpZiAoc2V0dGluZ3NbbmFtZV0pIHtcbiAgICAgICAgZGVsZXRlIHNldHRpbmdzW25hbWVdXG4gICAgICAgIHN5bmNTZXR0aW5nVG9sb2NhbFN0b3JhZ2UoKVxuICAgIH1cbn1cblxuZnVuY3Rpb24gbG9nU2V0dGluZ3MgKCkge1xuICAgIGJyb3dzZXJXcmFwcGVyLmdldEZyb21TdG9yYWdlKFsnc2V0dGluZ3MnXSwgZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgY29uc29sZS5sb2cocy5zZXR0aW5ncylcbiAgICB9KVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBnZXRTZXR0aW5nOiBnZXRTZXR0aW5nLFxuICAgIHVwZGF0ZVNldHRpbmc6IHVwZGF0ZVNldHRpbmcsXG4gICAgcmVtb3ZlU2V0dGluZzogcmVtb3ZlU2V0dGluZyxcbiAgICBsb2dTZXR0aW5nczogbG9nU2V0dGluZ3MsXG4gICAgcmVhZHk6IHJlYWR5XG59XG4iLCJjb25zdCBnZXRFeHRlbnNpb25VUkwgPSAocGF0aCkgPT4ge1xuICAgIHJldHVybiBjaHJvbWUucnVudGltZS5nZXRVUkwocGF0aClcbn1cblxuY29uc3QgZ2V0RXh0ZW5zaW9uVmVyc2lvbiA9ICgpID0+IHtcbiAgICBjb25zdCBtYW5pZmVzdCA9IHdpbmRvdy5jaHJvbWUgJiYgY2hyb21lLnJ1bnRpbWUuZ2V0TWFuaWZlc3QoKVxuICAgIHJldHVybiBtYW5pZmVzdC52ZXJzaW9uXG59XG5cbmNvbnN0IHNldEJhZGdlSWNvbiA9IChiYWRnZURhdGEpID0+IHtcbiAgICBjaHJvbWUuYnJvd3NlckFjdGlvbi5zZXRJY29uKGJhZGdlRGF0YSlcbn1cblxuY29uc3Qgc3luY1RvU3RvcmFnZSA9IChkYXRhKSA9PiB7XG4gICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KGRhdGEsIGZ1bmN0aW9uICgpIHsgfSlcbn1cblxuY29uc3QgZ2V0RnJvbVN0b3JhZ2UgPSAoa2V5LCBjYikgPT4ge1xuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChrZXksIChyZXN1bHQpID0+IHtcbiAgICAgICAgY2IocmVzdWx0W2tleV0pXG4gICAgfSlcbn1cbmNvbnN0IGdldEZyb21NYW5hZ2VkU3RvcmFnZSA9IChrZXlzLCBjYikgPT4ge1xuICAgIGdldEZyb21TdG9yYWdlKGtleXMsIGNiKVxuICAgIC8vIGNocm9tZS5zdG9yYWdlLm1hbmFnZWQuZ2V0KGtleXMsIChyZXN1bHQpID0+IHtcbiAgICAvLyAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgIC8vICAgICAgICAgY29uc29sZS53YXJuKCdNYW5hZ2VkIHN0b3JhZ2Ugbm90IGF2YWlsYWJsZS4nLCBicm93c2VyLnJ1bnRpbWUubGFzdEVycm9yKVxuICAgIC8vICAgICB9XG4gICAgLy8gICAgIGNiKHJlc3VsdCB8fCB7fSlcbiAgICAvLyB9KVxufVxuXG5jb25zdCBnZXRFeHRlbnNpb25JZCA9ICgpID0+IHtcbiAgICByZXR1cm4gY2hyb21lLnJ1bnRpbWUuaWRcbn1cblxuY29uc3Qgbm90aWZ5UG9wdXAgPSAobWVzc2FnZSkgPT4ge1xuICAgIC8vIHRoaXMgY2FuIHNlbmQgYW4gZXJyb3IgbWVzc2FnZSB3aGVuIHRoZSBwb3B1cCBpcyBub3Qgb3Blbi4gY2hlY2sgbGFzdEVycm9yIHRvIGhpZGUgaXRcbiAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZShtZXNzYWdlLCAoKSA9PiBjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpXG59XG5cbmNvbnN0IG5vcm1hbGl6ZVRhYkRhdGEgPSAodGFiRGF0YSkgPT4ge1xuICAgIHJldHVybiB0YWJEYXRhXG59XG5cbmNvbnN0IG1lcmdlU2F2ZWRTZXR0aW5ncyA9IChzZXR0aW5ncywgcmVzdWx0cykgPT4ge1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHNldHRpbmdzLCByZXN1bHRzKVxufVxuXG5jb25zdCBnZXREREdUYWJVcmxzID0gKCkgPT4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICBjaHJvbWUudGFicy5xdWVyeSh7IHVybDogJ2h0dHBzOi8vKi5kdWNrZHVja2dvLmNvbS8qJyB9LCAodGFicykgPT4ge1xuICAgICAgICAgICAgdGFicyA9IHRhYnMgfHwgW11cblxuICAgICAgICAgICAgdGFicy5mb3JFYWNoKHRhYiA9PiB7XG4gICAgICAgICAgICAgICAgY2hyb21lLnRhYnMuaW5zZXJ0Q1NTKHRhYi5pZCwge1xuICAgICAgICAgICAgICAgICAgICBmaWxlOiAnL3B1YmxpYy9jc3Mvbm9hdGIuY3NzJ1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICByZXNvbHZlKHRhYnMubWFwKHRhYiA9PiB0YWIudXJsKSlcbiAgICAgICAgfSlcbiAgICB9KVxufVxuXG5jb25zdCBzZXRVbmluc3RhbGxVUkwgPSAodXJsKSA9PiB7XG4gICAgY2hyb21lLnJ1bnRpbWUuc2V0VW5pbnN0YWxsVVJMKHVybClcbn1cblxuY29uc3QgY2hhbmdlVGFiVVJMID0gKHRhYklkLCB1cmwpID0+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgY2hyb21lLnRhYnMudXBkYXRlKHRhYklkLCB7IHVybCB9LCByZXNvbHZlKVxuICAgIH0pXG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGdldEV4dGVuc2lvblVSTDogZ2V0RXh0ZW5zaW9uVVJMLFxuICAgIGdldEV4dGVuc2lvblZlcnNpb246IGdldEV4dGVuc2lvblZlcnNpb24sXG4gICAgc2V0QmFkZ2VJY29uOiBzZXRCYWRnZUljb24sXG4gICAgc3luY1RvU3RvcmFnZTogc3luY1RvU3RvcmFnZSxcbiAgICBnZXRGcm9tU3RvcmFnZTogZ2V0RnJvbVN0b3JhZ2UsXG4gICAgbm90aWZ5UG9wdXA6IG5vdGlmeVBvcHVwLFxuICAgIG5vcm1hbGl6ZVRhYkRhdGE6IG5vcm1hbGl6ZVRhYkRhdGEsXG4gICAgbWVyZ2VTYXZlZFNldHRpbmdzOiBtZXJnZVNhdmVkU2V0dGluZ3MsXG4gICAgZ2V0RERHVGFiVXJsczogZ2V0RERHVGFiVXJscyxcbiAgICBzZXRVbmluc3RhbGxVUkw6IHNldFVuaW5zdGFsbFVSTCxcbiAgICBnZXRFeHRlbnNpb25JZDogZ2V0RXh0ZW5zaW9uSWQsXG4gICAgY2hhbmdlVGFiVVJMLFxuICAgIGdldEZyb21NYW5hZ2VkU3RvcmFnZVxufVxuIiwiY29uc3QgZmV0Y2ggPSAobWVzc2FnZSkgPT4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIHdpbmRvdy5jaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZShtZXNzYWdlLCAocmVzdWx0KSA9PiByZXNvbHZlKHJlc3VsdCkpXG4gICAgfSlcbn1cblxuY29uc3QgYmFja2dyb3VuZE1lc3NhZ2UgPSAodGhpc01vZGVsKSA9PiB7XG4gICAgLy8gbGlzdGVuIGZvciBtZXNzYWdlcyBmcm9tIGJhY2tncm91bmQgYW5kXG4gICAgLy8gLy8gbm90aWZ5IHN1YnNjcmliZXJzXG4gICAgd2luZG93LmNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigocmVxLCBzZW5kZXIpID0+IHtcbiAgICAgICAgaWYgKHNlbmRlci5pZCAhPT0gY2hyb21lLnJ1bnRpbWUuaWQpIHJldHVyblxuICAgICAgICBpZiAocmVxLndoaXRlbGlzdENoYW5nZWQpIHRoaXNNb2RlbC5zZW5kKCd3aGl0ZWxpc3RDaGFuZ2VkJylcbiAgICAgICAgaWYgKHJlcS51cGRhdGVUYWJEYXRhKSB0aGlzTW9kZWwuc2VuZCgndXBkYXRlVGFiRGF0YScpXG4gICAgICAgIGlmIChyZXEuZGlkUmVzZXRUcmFja2Vyc0RhdGEpIHRoaXNNb2RlbC5zZW5kKCdkaWRSZXNldFRyYWNrZXJzRGF0YScsIHJlcS5kaWRSZXNldFRyYWNrZXJzRGF0YSlcbiAgICAgICAgaWYgKHJlcS5jbG9zZVBvcHVwKSB3aW5kb3cuY2xvc2UoKVxuICAgIH0pXG59XG5cbmNvbnN0IGdldEJhY2tncm91bmRUYWJEYXRhID0gKCkgPT4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGZldGNoKHsgZ2V0Q3VycmVudFRhYjogdHJ1ZSB9KS50aGVuKCh0YWIpID0+IHtcbiAgICAgICAgICAgIGlmICh0YWIpIHtcbiAgICAgICAgICAgICAgICBmZXRjaCh7IGdldFRhYjogdGFiLmlkIH0pLnRoZW4oKGJhY2tncm91bmRUYWJPYmopID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShiYWNrZ3JvdW5kVGFiT2JqKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfSlcbn1cblxuY29uc3Qgc2VhcmNoID0gKHVybCkgPT4ge1xuICAgIHdpbmRvdy5jaHJvbWUudGFicy5jcmVhdGUoeyB1cmw6IGBodHRwczovL2R1Y2tkdWNrZ28uY29tLz9xPSR7dXJsfSZiZXh0PSR7d2luZG93LmxvY2FsU3RvcmFnZS5vc31jcmAgfSlcbn1cblxuY29uc3QgZ2V0RXh0ZW5zaW9uVVJMID0gKHBhdGgpID0+IHtcbiAgICByZXR1cm4gY2hyb21lLnJ1bnRpbWUuZ2V0VVJMKHBhdGgpXG59XG5cbmNvbnN0IG9wZW5FeHRlbnNpb25QYWdlID0gKHBhdGgpID0+IHtcbiAgICB3aW5kb3cuY2hyb21lLnRhYnMuY3JlYXRlKHsgdXJsOiBnZXRFeHRlbnNpb25VUkwocGF0aCkgfSlcbn1cblxuY29uc3Qgb3Blbk9wdGlvbnNQYWdlID0gKGJyb3dzZXIpID0+IHtcbiAgICBpZiAoYnJvd3NlciA9PT0gJ21veicpIHtcbiAgICAgICAgb3BlbkV4dGVuc2lvblBhZ2UoJy9odG1sL29wdGlvbnMuaHRtbCcpXG4gICAgICAgIHdpbmRvdy5jbG9zZSgpXG4gICAgfSBlbHNlIHtcbiAgICAgICAgd2luZG93LmNocm9tZS5ydW50aW1lLm9wZW5PcHRpb25zUGFnZSgpXG4gICAgfVxufVxuXG5jb25zdCByZWxvYWRUYWIgPSAoaWQpID0+IHtcbiAgICB3aW5kb3cuY2hyb21lLnRhYnMucmVsb2FkKGlkKVxufVxuXG5jb25zdCBjbG9zZVBvcHVwID0gKCkgPT4ge1xuICAgIGNvbnN0IHcgPSB3aW5kb3cuY2hyb21lLmV4dGVuc2lvbi5nZXRWaWV3cyh7IHR5cGU6ICdwb3B1cCcgfSlbMF1cbiAgICB3LmNsb3NlKClcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZmV0Y2g6IGZldGNoLFxuICAgIHJlbG9hZFRhYjogcmVsb2FkVGFiLFxuICAgIGNsb3NlUG9wdXA6IGNsb3NlUG9wdXAsXG4gICAgYmFja2dyb3VuZE1lc3NhZ2U6IGJhY2tncm91bmRNZXNzYWdlLFxuICAgIGdldEJhY2tncm91bmRUYWJEYXRhOiBnZXRCYWNrZ3JvdW5kVGFiRGF0YSxcbiAgICBzZWFyY2g6IHNlYXJjaCxcbiAgICBvcGVuT3B0aW9uc1BhZ2U6IG9wZW5PcHRpb25zUGFnZSxcbiAgICBvcGVuRXh0ZW5zaW9uUGFnZTogb3BlbkV4dGVuc2lvblBhZ2UsXG4gICAgZ2V0RXh0ZW5zaW9uVVJMOiBnZXRFeHRlbnNpb25VUkxcbn1cbiIsImNvbnN0IFBhcmVudCA9IHdpbmRvdy5EREcuYmFzZS5Nb2RlbFxuXG5mdW5jdGlvbiBBdXRvY29tcGxldGUgKGF0dHJzKSB7XG4gICAgUGFyZW50LmNhbGwodGhpcywgYXR0cnMpXG59XG5cbkF1dG9jb21wbGV0ZS5wcm90b3R5cGUgPSB3aW5kb3cuJC5leHRlbmQoe30sXG4gICAgUGFyZW50LnByb3RvdHlwZSxcbiAgICB7XG5cbiAgICAgICAgbW9kZWxOYW1lOiAnYXV0b2NvbXBsZXRlJyxcblxuICAgICAgICBmZXRjaFN1Z2dlc3Rpb25zOiBmdW5jdGlvbiAoc2VhcmNoVGV4dCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiBhamF4IGNhbGwgaGVyZSB0byBkZGcgYXV0b2NvbXBsZXRlIHNlcnZpY2VcbiAgICAgICAgICAgICAgICAvLyBmb3Igbm93IHdlJ2xsIGp1c3QgbW9jayB1cCBhbiBhc3luYyB4aHIgcXVlcnkgcmVzdWx0OlxuICAgICAgICAgICAgICAgIHRoaXMuc3VnZ2VzdGlvbnMgPSBbYCR7c2VhcmNoVGV4dH0gd29ybGRgLCBgJHtzZWFyY2hUZXh0fSB1bml0ZWRgLCBgJHtzZWFyY2hUZXh0fSBmYW1mYW1gXVxuICAgICAgICAgICAgICAgIHJlc29sdmUoKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgIH1cbilcblxubW9kdWxlLmV4cG9ydHMgPSBBdXRvY29tcGxldGVcbiIsImNvbnN0IFBhcmVudCA9IHdpbmRvdy5EREcuYmFzZS5Nb2RlbFxuY29uc3QgYnJvd3NlclVJV3JhcHBlciA9IHJlcXVpcmUoJy4vLi4vYmFzZS91aS13cmFwcGVyLmVzNi5qcycpXG5cbi8qKlxuICogQmFja2dyb3VuZCBtZXNzYWdpbmcgaXMgZG9uZSB2aWEgdHdvIG1ldGhvZHM6XG4gKlxuICogMS4gUGFzc2l2ZSBtZXNzYWdlcyBmcm9tIGJhY2tncm91bmQgLT4gYmFja2dyb3VuZE1lc3NhZ2UgbW9kZWwgLT4gc3Vic2NyaWJpbmcgbW9kZWxcbiAqXG4gKiAgVGhlIGJhY2tncm91bmQgc2VuZHMgdGhlc2UgbWVzc2FnZXMgdXNpbmcgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UoeyduYW1lJzogJ3ZhbHVlJ30pXG4gKiAgVGhlIGJhY2tncm91bmRNZXNzYWdlIG1vZGVsIChoZXJlKSByZWNlaXZlcyB0aGUgbWVzc2FnZSBhbmQgZm9yd2FyZHMgdGhlXG4gKiAgaXQgdG8gdGhlIGdsb2JhbCBldmVudCBzdG9yZSB2aWEgbW9kZWwuc2VuZChtc2cpXG4gKiAgT3RoZXIgbW9kdWxlcyB0aGF0IGFyZSBzdWJzY3JpYmVkIHRvIHN0YXRlIGNoYW5nZXMgaW4gYmFja2dyb3VuZE1lc3NhZ2UgYXJlIG5vdGlmaWVkXG4gKlxuICogMi4gVHdvLXdheSBtZXNzYWdpbmcgdXNpbmcgdGhpcy5tb2RlbC5mZXRjaCgpIGFzIGEgcGFzc3Rocm91Z2hcbiAqXG4gKiAgRWFjaCBtb2RlbCBjYW4gdXNlIGEgZmV0Y2ggbWV0aG9kIHRvIHNlbmQgYW5kIHJlY2VpdmUgYSByZXNwb25zZSBmcm9tIHRoZSBiYWNrZ3JvdW5kLlxuICogIEV4OiB0aGlzLm1vZGVsLmZldGNoKHsnbmFtZSc6ICd2YWx1ZSd9KS50aGVuKChyZXNwb25zZSkgPT4gY29uc29sZS5sb2cocmVzcG9uc2UpKVxuICogIExpc3RlbmVycyBtdXN0IGJlIHJlZ2lzdGVyZWQgaW4gdGhlIGJhY2tncm91bmQgdG8gcmVzcG9uZCB0byBtZXNzYWdlcyB3aXRoIHRoaXMgJ25hbWUnLlxuICpcbiAqICBUaGUgY29tbW9uIGZldGNoIG1ldGhvZCBpcyBkZWZpbmVkIGluIGJhc2UvbW9kZWwuZXM2LmpzXG4gKi9cbmZ1bmN0aW9uIEJhY2tncm91bmRNZXNzYWdlIChhdHRycykge1xuICAgIFBhcmVudC5jYWxsKHRoaXMsIGF0dHJzKVxuICAgIGNvbnN0IHRoaXNNb2RlbCA9IHRoaXNcbiAgICBicm93c2VyVUlXcmFwcGVyLmJhY2tncm91bmRNZXNzYWdlKHRoaXNNb2RlbClcbn1cblxuQmFja2dyb3VuZE1lc3NhZ2UucHJvdG90eXBlID0gd2luZG93LiQuZXh0ZW5kKHt9LFxuICAgIFBhcmVudC5wcm90b3R5cGUsXG4gICAge1xuICAgICAgICBtb2RlbE5hbWU6ICdiYWNrZ3JvdW5kTWVzc2FnZSdcbiAgICB9XG4pXG5cbm1vZHVsZS5leHBvcnRzID0gQmFja2dyb3VuZE1lc3NhZ2VcbiIsImNvbnN0IFBhcmVudCA9IHdpbmRvdy5EREcuYmFzZS5Nb2RlbFxuXG5mdW5jdGlvbiBFbWFpbEFsaWFzTW9kZWwgKGF0dHJzKSB7XG4gICAgYXR0cnMgPSBhdHRycyB8fCB7fVxuICAgIFBhcmVudC5jYWxsKHRoaXMsIGF0dHJzKVxufVxuXG5FbWFpbEFsaWFzTW9kZWwucHJvdG90eXBlID0gd2luZG93LiQuZXh0ZW5kKHt9LFxuICAgIFBhcmVudC5wcm90b3R5cGUsXG4gICAge1xuICAgICAgICBtb2RlbE5hbWU6ICdlbWFpbEFsaWFzJyxcblxuICAgICAgICBnZXRVc2VyRGF0YTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2goeyBnZXRTZXR0aW5nOiB7IG5hbWU6ICd1c2VyRGF0YScgfSB9KS50aGVuKHVzZXJEYXRhID0+IHVzZXJEYXRhKVxuICAgICAgICB9LFxuXG4gICAgICAgIGxvZ291dDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2goeyBsb2dvdXQ6IHRydWUgfSkudGhlbigoKSA9PiB0aGlzLnNldCgndXNlckRhdGEnLCB1bmRlZmluZWQpKVxuICAgICAgICB9XG4gICAgfVxuKVxuXG5tb2R1bGUuZXhwb3J0cyA9IEVtYWlsQWxpYXNNb2RlbFxuIiwiY29uc3QgUGFyZW50ID0gd2luZG93LkRERy5iYXNlLk1vZGVsXG5cbmZ1bmN0aW9uIEhhbWJ1cmdlck1lbnUgKGF0dHJzKSB7XG4gICAgYXR0cnMgPSBhdHRycyB8fCB7fVxuICAgIGF0dHJzLnRhYlVybCA9ICcnXG4gICAgUGFyZW50LmNhbGwodGhpcywgYXR0cnMpXG59XG5cbkhhbWJ1cmdlck1lbnUucHJvdG90eXBlID0gd2luZG93LiQuZXh0ZW5kKHt9LFxuICAgIFBhcmVudC5wcm90b3R5cGUsXG4gICAge1xuICAgICAgICBtb2RlbE5hbWU6ICdoYW1idXJnZXJNZW51J1xuICAgIH1cbilcblxubW9kdWxlLmV4cG9ydHMgPSBIYW1idXJnZXJNZW51XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAvLyBGaXhlcyBjYXNlcyBsaWtlIFwiQW1hem9uLmNvbVwiLCB3aGljaCBicmVhayB0aGUgY29tcGFueSBpY29uXG4gICAgbm9ybWFsaXplQ29tcGFueU5hbWUgKGNvbXBhbnlOYW1lKSB7XG4gICAgICAgIGNvbXBhbnlOYW1lID0gY29tcGFueU5hbWUgfHwgJydcbiAgICAgICAgY29uc3Qgbm9ybWFsaXplZE5hbWUgPSBjb21wYW55TmFtZS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1xcLlthLXpdKyQvLCAnJylcbiAgICAgICAgcmV0dXJuIG5vcm1hbGl6ZWROYW1lXG4gICAgfVxufVxuIiwiY29uc3QgUGFyZW50ID0gd2luZG93LkRERy5iYXNlLk1vZGVsXG5jb25zdCBicm93c2VyVUlXcmFwcGVyID0gcmVxdWlyZSgnLi8uLi9iYXNlL3VpLXdyYXBwZXIuZXM2LmpzJylcblxuZnVuY3Rpb24gU2VhcmNoIChhdHRycykge1xuICAgIFBhcmVudC5jYWxsKHRoaXMsIGF0dHJzKVxufVxuXG5TZWFyY2gucHJvdG90eXBlID0gd2luZG93LiQuZXh0ZW5kKHt9LFxuICAgIFBhcmVudC5wcm90b3R5cGUsXG4gICAge1xuXG4gICAgICAgIG1vZGVsTmFtZTogJ3NlYXJjaCcsXG5cbiAgICAgICAgZG9TZWFyY2g6IGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICB0aGlzLnNlYXJjaFRleHQgPSBzXG4gICAgICAgICAgICBzID0gZW5jb2RlVVJJQ29tcG9uZW50KHMpXG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBkb1NlYXJjaCgpIGZvciAke3N9YClcblxuICAgICAgICAgICAgYnJvd3NlclVJV3JhcHBlci5zZWFyY2gocylcbiAgICAgICAgfVxuICAgIH1cbilcblxubW9kdWxlLmV4cG9ydHMgPSBTZWFyY2hcbiIsImNvbnN0IFBhcmVudCA9IHdpbmRvdy5EREcuYmFzZS5Nb2RlbFxuY29uc3Qgbm9ybWFsaXplQ29tcGFueU5hbWUgPSByZXF1aXJlKCcuL21peGlucy9ub3JtYWxpemUtY29tcGFueS1uYW1lLmVzNicpXG5cbmZ1bmN0aW9uIFNpdGVDb21wYW55TGlzdCAoYXR0cnMpIHtcbiAgICBhdHRycyA9IGF0dHJzIHx8IHt9XG4gICAgYXR0cnMudGFiID0gbnVsbFxuICAgIGF0dHJzLmNvbXBhbnlMaXN0TWFwID0gW11cbiAgICBQYXJlbnQuY2FsbCh0aGlzLCBhdHRycylcbn1cblxuU2l0ZUNvbXBhbnlMaXN0LnByb3RvdHlwZSA9IHdpbmRvdy4kLmV4dGVuZCh7fSxcbiAgICBQYXJlbnQucHJvdG90eXBlLFxuICAgIG5vcm1hbGl6ZUNvbXBhbnlOYW1lLFxuICAgIHtcblxuICAgICAgICBtb2RlbE5hbWU6ICdzaXRlQ29tcGFueUxpc3QnLFxuXG4gICAgICAgIGZldGNoQXN5bmNEYXRhOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuZmV0Y2goeyBnZXRDdXJyZW50VGFiOiB0cnVlIH0pLnRoZW4oKHRhYikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGFiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZldGNoKHsgZ2V0VGFiOiB0YWIuaWQgfSkudGhlbigoYmtnVGFiKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YWIgPSBia2dUYWJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRvbWFpbiA9IHRoaXMudGFiICYmIHRoaXMudGFiLnNpdGUgPyB0aGlzLnRhYi5zaXRlLmRvbWFpbiA6ICcnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fdXBkYXRlQ29tcGFuaWVzTGlzdCgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnU2l0ZURldGFpbHMgbW9kZWw6IG5vIHRhYicpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKClcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9LFxuXG4gICAgICAgIF91cGRhdGVDb21wYW5pZXNMaXN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBsaXN0IG9mIGFsbCB0cmFja2VycyBvbiBwYWdlICh3aGV0aGVyIHdlIGJsb2NrZWQgdGhlbSBvciBub3QpXG4gICAgICAgICAgICB0aGlzLnRyYWNrZXJzID0gdGhpcy50YWIudHJhY2tlcnMgfHwge31cbiAgICAgICAgICAgIGNvbnN0IGNvbXBhbnlOYW1lcyA9IE9iamVjdC5rZXlzKHRoaXMudHJhY2tlcnMpXG4gICAgICAgICAgICBsZXQgdW5rbm93blNhbWVEb21haW5Db21wYW55ID0gbnVsbFxuXG4gICAgICAgICAgICAvLyBzZXQgdHJhY2tlcmxpc3QgbWV0YWRhdGEgZm9yIGxpc3QgZGlzcGxheSBieSBjb21wYW55OlxuICAgICAgICAgICAgdGhpcy5jb21wYW55TGlzdE1hcCA9IGNvbXBhbnlOYW1lc1xuICAgICAgICAgICAgICAgIC5tYXAoKGNvbXBhbnlOYW1lKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBhbnkgPSB0aGlzLnRyYWNrZXJzW2NvbXBhbnlOYW1lXVxuICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmxzTGlzdCA9IGNvbXBhbnkudXJscyA/IE9iamVjdC5rZXlzKGNvbXBhbnkudXJscykgOiBbXVxuICAgICAgICAgICAgICAgICAgICAvLyBVbmtub3duIHNhbWUgZG9tYWluIHRyYWNrZXJzIG5lZWQgdG8gYmUgaW5kaXZpZHVhbGx5IGZldGNoZWQgYW5kIHB1dFxuICAgICAgICAgICAgICAgICAgICAvLyBpbiB0aGUgdW5ibG9ja2VkIGxpc3RcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXBhbnlOYW1lID09PSAndW5rbm93bicgJiYgdGhpcy5oYXNVbmJsb2NrZWRUcmFja2Vycyhjb21wYW55LCB1cmxzTGlzdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVua25vd25TYW1lRG9tYWluQ29tcGFueSA9IHRoaXMuY3JlYXRlVW5ibG9ja2VkTGlzdChjb21wYW55LCB1cmxzTGlzdClcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIGNhbGMgbWF4IHVzaW5nIHBpeGVscyBpbnN0ZWFkIG9mICUgdG8gbWFrZSBtYXJnaW5zIGVhc2llclxuICAgICAgICAgICAgICAgICAgICAvLyBtYXggd2lkdGg6IDMwMCAtIChob3Jpem9udGFsIHBhZGRpbmcgaW4gY3NzKSA9IDI2MFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogY29tcGFueU5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNwbGF5TmFtZTogY29tcGFueS5kaXNwbGF5TmFtZSB8fCBjb21wYW55TmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vcm1hbGl6ZWROYW1lOiB0aGlzLm5vcm1hbGl6ZUNvbXBhbnlOYW1lKGNvbXBhbnlOYW1lKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50OiB0aGlzLl9zZXRDb3VudChjb21wYW55LCBjb21wYW55TmFtZSwgdXJsc0xpc3QpLFxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsczogY29tcGFueS51cmxzLFxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsc0xpc3Q6IHVybHNMaXN0XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCB0aGlzKVxuICAgICAgICAgICAgICAgIC5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBiLmNvdW50IC0gYS5jb3VudFxuICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgIGlmICh1bmtub3duU2FtZURvbWFpbkNvbXBhbnkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbXBhbnlMaXN0TWFwLnB1c2godW5rbm93blNhbWVEb21haW5Db21wYW55KVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8vIE1ha2UgYWQtaG9jIHVuYmxvY2tlZCBsaXN0XG4gICAgICAgIC8vIHVzZWQgdG8gY2hlcnJ5IHBpY2sgdW5ibG9ja2VkIHRyYWNrZXJzIGZyb20gdW5rbm93biBjb21wYW5pZXNcbiAgICAgICAgLy8gdGhlIG5hbWUgaXMgdGhlIHNpdGUgZG9tYWluLCBjb3VudCBpcyAtMiB0byBzaG93IHRoZSBsaXN0IGF0IHRoZSBib3R0b21cbiAgICAgICAgY3JlYXRlVW5ibG9ja2VkTGlzdDogZnVuY3Rpb24gKGNvbXBhbnksIHVybHNMaXN0KSB7XG4gICAgICAgICAgICBjb25zdCB1bmJsb2NrZWRUcmFja2VycyA9IHRoaXMuc3BsaWNlVW5ibG9ja2VkVHJhY2tlcnMoY29tcGFueSwgdXJsc0xpc3QpXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIG5hbWU6IHRoaXMuZG9tYWluLFxuICAgICAgICAgICAgICAgIGljb25OYW1lOiAnJywgLy8gd2Ugd29uJ3QgaGF2ZSBhbiBpY29uIGZvciB1bmtub3duIGZpcnN0IHBhcnR5IHRyYWNrZXJzXG4gICAgICAgICAgICAgICAgY291bnQ6IC0yLFxuICAgICAgICAgICAgICAgIHVybHM6IHVuYmxvY2tlZFRyYWNrZXJzLFxuICAgICAgICAgICAgICAgIHVybHNMaXN0OiBPYmplY3Qua2V5cyh1bmJsb2NrZWRUcmFja2VycylcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvLyBSZXR1cm4gYW4gYXJyYXkgb2YgdW5ibG9ja2VkIHRyYWNrZXJzXG4gICAgICAgIC8vIGFuZCByZW1vdmUgdGhvc2UgZW50cmllcyBmcm9tIHRoZSBzcGVjaWZpZWQgY29tcGFueVxuICAgICAgICAvLyBvbmx5IG5lZWRlZCBmb3IgdW5rbm93biB0cmFja2Vycywgc28gZmFyXG4gICAgICAgIHNwbGljZVVuYmxvY2tlZFRyYWNrZXJzOiBmdW5jdGlvbiAoY29tcGFueSwgdXJsc0xpc3QpIHtcbiAgICAgICAgICAgIGlmICghY29tcGFueSB8fCAhY29tcGFueS51cmxzIHx8ICF1cmxzTGlzdCkgcmV0dXJuIG51bGxcblxuICAgICAgICAgICAgcmV0dXJuIHVybHNMaXN0LmZpbHRlcigodXJsKSA9PiBjb21wYW55LnVybHNbdXJsXS5pc0Jsb2NrZWQgPT09IGZhbHNlKVxuICAgICAgICAgICAgICAgIC5yZWR1Y2UoKHVuYmxvY2tlZFRyYWNrZXJzLCB1cmwpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdW5ibG9ja2VkVHJhY2tlcnNbdXJsXSA9IGNvbXBhbnkudXJsc1t1cmxdXG5cbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBjb21wYW55IHVybHMgYW5kIHVybHNMaXN0XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBjb21wYW55LnVybHNbdXJsXVxuICAgICAgICAgICAgICAgICAgICB1cmxzTGlzdC5zcGxpY2UodXJsc0xpc3QuaW5kZXhPZih1cmwpLCAxKVxuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmJsb2NrZWRUcmFja2Vyc1xuICAgICAgICAgICAgICAgIH0sIHt9KVxuICAgICAgICB9LFxuXG4gICAgICAgIC8vIFJldHVybiB0cnVlIGlmIGNvbXBhbnkgaGFzIHVuYmxvY2tlZCB0cmFja2VycyBpbiB0aGUgY3VycmVudCB0YWJcbiAgICAgICAgaGFzVW5ibG9ja2VkVHJhY2tlcnM6IGZ1bmN0aW9uIChjb21wYW55LCB1cmxzTGlzdCkge1xuICAgICAgICAgICAgaWYgKCFjb21wYW55IHx8ICFjb21wYW55LnVybHMgfHwgIXVybHNMaXN0KSByZXR1cm4gZmFsc2VcblxuICAgICAgICAgICAgcmV0dXJuIHVybHNMaXN0LnNvbWUoKHVybCkgPT4gY29tcGFueS51cmxzW3VybF0uaXNCbG9ja2VkID09PSBmYWxzZSlcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBEZXRlcm1pbmVzIHNvcnRpbmcgb3JkZXIgb2YgdGhlIGNvbXBhbnkgbGlzdFxuICAgICAgICBfc2V0Q291bnQ6IGZ1bmN0aW9uIChjb21wYW55LCBjb21wYW55TmFtZSwgdXJsc0xpc3QpIHtcbiAgICAgICAgICAgIGxldCBjb3VudCA9IGNvbXBhbnkuY291bnRcbiAgICAgICAgICAgIC8vIFVua25vd24gdHJhY2tlcnMsIGZvbGxvd2VkIGJ5IHVuYmxvY2tlZCBmaXJzdCBwYXJ0eSxcbiAgICAgICAgICAgIC8vIHNob3VsZCBiZSBhdCB0aGUgYm90dG9tIG9mIHRoZSBsaXN0XG4gICAgICAgICAgICBpZiAoY29tcGFueU5hbWUgPT09ICd1bmtub3duJykge1xuICAgICAgICAgICAgICAgIGNvdW50ID0gLTFcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5oYXNVbmJsb2NrZWRUcmFja2Vycyhjb21wYW55LCB1cmxzTGlzdCkpIHtcbiAgICAgICAgICAgICAgICBjb3VudCA9IC0yXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBjb3VudFxuICAgICAgICB9XG4gICAgfVxuKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNpdGVDb21wYW55TGlzdFxuIiwiY29uc3QgUGFyZW50ID0gd2luZG93LkRERy5iYXNlLk1vZGVsXG5jb25zdCBjb25zdGFudHMgPSByZXF1aXJlKCcuLi8uLi8uLi9kYXRhL2NvbnN0YW50cycpXG5jb25zdCBodHRwc01lc3NhZ2VzID0gY29uc3RhbnRzLmh0dHBzTWVzc2FnZXNcbmNvbnN0IGJyb3dzZXJVSVdyYXBwZXIgPSByZXF1aXJlKCcuLy4uL2Jhc2UvdWktd3JhcHBlci5lczYuanMnKVxuXG4vLyBmb3Igbm93IHdlIGNvbnNpZGVyIHRyYWNrZXIgbmV0d29ya3MgZm91bmQgb24gbW9yZSB0aGFuIDclIG9mIHNpdGVzXG4vLyBhcyBcIm1ham9yXCJcbmNvbnN0IE1BSk9SX1RSQUNLRVJfVEhSRVNIT0xEX1BDVCA9IDdcblxuZnVuY3Rpb24gU2l0ZSAoYXR0cnMpIHtcbiAgICBhdHRycyA9IGF0dHJzIHx8IHt9XG4gICAgYXR0cnMuZGlzYWJsZWQgPSB0cnVlIC8vIGRpc2FibGVkIGJ5IGRlZmF1bHRcbiAgICBhdHRycy50YWIgPSBudWxsXG4gICAgYXR0cnMuZG9tYWluID0gJy0nXG4gICAgYXR0cnMuaXNXaGl0ZWxpc3RlZCA9IGZhbHNlXG4gICAgYXR0cnMuaXNBbGxvd2xpc3RlZCA9IGZhbHNlXG4gICAgYXR0cnMuaXNCcm9rZW4gPSBmYWxzZVxuICAgIGF0dHJzLndoaXRlbGlzdE9wdEluID0gZmFsc2VcbiAgICBhdHRycy5pc0NhbGN1bGF0aW5nU2l0ZVJhdGluZyA9IHRydWVcbiAgICBhdHRycy5zaXRlUmF0aW5nID0ge31cbiAgICBhdHRycy5odHRwc1N0YXRlID0gJ25vbmUnXG4gICAgYXR0cnMuaHR0cHNTdGF0dXNUZXh0ID0gJydcbiAgICBhdHRycy50cmFja2Vyc0NvdW50ID0gMCAvLyB1bmlxdWUgdHJhY2tlcnMgY291bnRcbiAgICBhdHRycy5tYWpvclRyYWNrZXJOZXR3b3Jrc0NvdW50ID0gMFxuICAgIGF0dHJzLnRvdGFsVHJhY2tlck5ldHdvcmtzQ291bnQgPSAwXG4gICAgYXR0cnMudHJhY2tlck5ldHdvcmtzID0gW11cbiAgICBhdHRycy50b3NkciA9IHt9XG4gICAgYXR0cnMuaXNhTWFqb3JUcmFja2luZ05ldHdvcmsgPSBmYWxzZVxuICAgIFBhcmVudC5jYWxsKHRoaXMsIGF0dHJzKVxuXG4gICAgdGhpcy5iaW5kRXZlbnRzKFtcbiAgICAgICAgW3RoaXMuc3RvcmUuc3Vic2NyaWJlLCAnYWN0aW9uOmJhY2tncm91bmRNZXNzYWdlJywgdGhpcy5oYW5kbGVCYWNrZ3JvdW5kTXNnXVxuICAgIF0pXG59XG5cblNpdGUucHJvdG90eXBlID0gd2luZG93LiQuZXh0ZW5kKHt9LFxuICAgIFBhcmVudC5wcm90b3R5cGUsXG4gICAge1xuXG4gICAgICAgIG1vZGVsTmFtZTogJ3NpdGUnLFxuXG4gICAgICAgIGdldEJhY2tncm91bmRUYWJEYXRhOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgICAgICBicm93c2VyVUlXcmFwcGVyLmdldEJhY2tncm91bmRUYWJEYXRhKCkudGhlbigodGFiKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0YWIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0KCd0YWInLCB0YWIpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRvbWFpbiA9IHRhYi5zaXRlLmRvbWFpblxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5mZXRjaFNpdGVSYXRpbmcoKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXQoJ3Rvc2RyJywgdGFiLnNpdGUudG9zZHIpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldCgnaXNhTWFqb3JUcmFja2luZ05ldHdvcmsnLCB0YWIuc2l0ZS5wYXJlbnRQcmV2YWxlbmNlID49IE1BSk9SX1RSQUNLRVJfVEhSRVNIT0xEX1BDVClcblxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5mZXRjaCh7IGdldFNldHRpbmc6IHsgbmFtZTogJ3Rkcy1ldGFnJyB9IH0pLnRoZW4oZXRhZyA9PiB0aGlzLnNldCgndGRzJywgZXRhZykpXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKCdTaXRlIG1vZGVsOiBubyB0YWInKVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTaXRlUHJvcGVydGllcygpXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0SHR0cHNNZXNzYWdlKClcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGUoKVxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKClcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSxcblxuICAgICAgICBmZXRjaFNpdGVSYXRpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdbbW9kZWxdIGZldGNoU2l0ZVJhdGluZygpJylcbiAgICAgICAgICAgIGlmICh0aGlzLnRhYikge1xuICAgICAgICAgICAgICAgIHRoaXMuZmV0Y2goeyBnZXRTaXRlR3JhZGU6IHRoaXMudGFiLmlkIH0pLnRoZW4oKHJhdGluZykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZmV0Y2hTaXRlUmF0aW5nOiAnLCByYXRpbmcpXG4gICAgICAgICAgICAgICAgICAgIGlmIChyYXRpbmcpIHRoaXMudXBkYXRlKHsgc2l0ZVJhdGluZzogcmF0aW5nIH0pXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBzZXRTaXRlUHJvcGVydGllczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLnRhYikge1xuICAgICAgICAgICAgICAgIHRoaXMuZG9tYWluID0gJ25ldyB0YWInIC8vIHRhYiBjYW4gYmUgbnVsbCBmb3IgZmlyZWZveCBuZXcgdGFic1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0KHsgaXNDYWxjdWxhdGluZ1NpdGVSYXRpbmc6IGZhbHNlIH0pXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuaW5pdEFsbG93bGlzdGVkKHRoaXMudGFiLnNpdGUud2hpdGVsaXN0ZWQpXG4gICAgICAgICAgICAgICAgdGhpcy53aGl0ZWxpc3RPcHRJbiA9IHRoaXMudGFiLnNpdGUud2hpdGVsaXN0T3B0SW5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy50YWIuc2l0ZS5zcGVjaWFsRG9tYWluTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmRvbWFpbiA9IHRoaXMudGFiLnNpdGUuc3BlY2lhbERvbWFpbk5hbWUgLy8gZWcgXCJleHRlbnNpb25zXCIsIFwib3B0aW9uc1wiLCBcIm5ldyB0YWJcIlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldCh7IGlzQ2FsY3VsYXRpbmdTaXRlUmF0aW5nOiBmYWxzZSB9KVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0KHsgZGlzYWJsZWQ6IGZhbHNlIH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy5kb21haW4gJiYgdGhpcy5kb21haW4gPT09ICctJykgdGhpcy5zZXQoJ2Rpc2FibGVkJywgdHJ1ZSlcbiAgICAgICAgfSxcblxuICAgICAgICBzZXRIdHRwc01lc3NhZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy50YWIpIHJldHVyblxuXG4gICAgICAgICAgICBpZiAodGhpcy50YWIudXBncmFkZWRIdHRwcykge1xuICAgICAgICAgICAgICAgIHRoaXMuaHR0cHNTdGF0ZSA9ICd1cGdyYWRlZCdcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoL15odHRwcy8uZXhlYyh0aGlzLnRhYi51cmwpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5odHRwc1N0YXRlID0gJ3NlY3VyZSdcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5odHRwc1N0YXRlID0gJ25vbmUnXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuaHR0cHNTdGF0dXNUZXh0ID0gaHR0cHNNZXNzYWdlc1t0aGlzLmh0dHBzU3RhdGVdXG4gICAgICAgIH0sXG5cbiAgICAgICAgaGFuZGxlQmFja2dyb3VuZE1zZzogZnVuY3Rpb24gKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdbbW9kZWxdIGhhbmRsZUJhY2tncm91bmRNc2coKScpXG4gICAgICAgICAgICBpZiAoIXRoaXMudGFiKSByZXR1cm5cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmFjdGlvbiAmJiBtZXNzYWdlLmFjdGlvbiA9PT0gJ3VwZGF0ZVRhYkRhdGEnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5mZXRjaCh7IGdldFRhYjogdGhpcy50YWIuaWQgfSkudGhlbigoYmFja2dyb3VuZFRhYk9iaikgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRhYiA9IGJhY2tncm91bmRUYWJPYmpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGUoKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLmZldGNoU2l0ZVJhdGluZygpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvLyBjYWxscyBgdGhpcy5zZXQoKWAgdG8gdHJpZ2dlciB2aWV3IHJlLXJlbmRlcmluZ1xuICAgICAgICB1cGRhdGU6IGZ1bmN0aW9uIChvcHMpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdbbW9kZWxdIHVwZGF0ZSgpJylcbiAgICAgICAgICAgIGlmICh0aGlzLnRhYikge1xuICAgICAgICAgICAgICAgIC8vIGdvdCBzaXRlUmF0aW5nIGJhY2sgZnJvbSBiYWNrZ3JvdW5kIHByb2Nlc3NcbiAgICAgICAgICAgICAgICBpZiAob3BzICYmXG4gICAgICAgICAgICAgICAgICAgICAgICBvcHMuc2l0ZVJhdGluZyAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgb3BzLnNpdGVSYXRpbmcuc2l0ZSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgb3BzLnNpdGVSYXRpbmcuZW5oYW5jZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGJlZm9yZSA9IG9wcy5zaXRlUmF0aW5nLnNpdGUuZ3JhZGVcbiAgICAgICAgICAgICAgICAgICAgbGV0IGFmdGVyID0gb3BzLnNpdGVSYXRpbmcuZW5oYW5jZWQuZ3JhZGVcblxuICAgICAgICAgICAgICAgICAgICAvLyB3ZSBkb24ndCBjdXJyZW50bHkgc2hvdyBELSBncmFkZXNcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJlZm9yZSA9PT0gJ0QtJykgYmVmb3JlID0gJ0QnXG4gICAgICAgICAgICAgICAgICAgIGlmIChhZnRlciA9PT0gJ0QtJykgYWZ0ZXIgPSAnRCdcblxuICAgICAgICAgICAgICAgICAgICBpZiAoYmVmb3JlICE9PSB0aGlzLnNpdGVSYXRpbmcuYmVmb3JlIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBhZnRlciAhPT0gdGhpcy5zaXRlUmF0aW5nLmFmdGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdTaXRlUmF0aW5nID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNzc0JlZm9yZTogYmVmb3JlLnJlcGxhY2UoJysnLCAnLXBsdXMnKS50b0xvd2VyQ2FzZSgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNzc0FmdGVyOiBhZnRlci5yZXBsYWNlKCcrJywgJy1wbHVzJykudG9Mb3dlckNhc2UoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZWZvcmUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWZ0ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNpdGVSYXRpbmc6IG5ld1NpdGVSYXRpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNDYWxjdWxhdGluZ1NpdGVSYXRpbmc6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaXNDYWxjdWxhdGluZ1NpdGVSYXRpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGdvdCBzaXRlIHJhdGluZyBmcm9tIGJhY2tncm91bmQgcHJvY2Vzc1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXQoJ2lzQ2FsY3VsYXRpbmdTaXRlUmF0aW5nJywgZmFsc2UpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBuZXdUcmFja2Vyc0NvdW50ID0gdGhpcy5nZXRVbmlxdWVUcmFja2Vyc0NvdW50KClcbiAgICAgICAgICAgICAgICBpZiAobmV3VHJhY2tlcnNDb3VudCAhPT0gdGhpcy50cmFja2Vyc0NvdW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0KCd0cmFja2Vyc0NvdW50JywgbmV3VHJhY2tlcnNDb3VudClcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBuZXdUcmFja2Vyc0Jsb2NrZWRDb3VudCA9IHRoaXMuZ2V0VW5pcXVlVHJhY2tlcnNCbG9ja2VkQ291bnQoKVxuICAgICAgICAgICAgICAgIGlmIChuZXdUcmFja2Vyc0Jsb2NrZWRDb3VudCAhPT0gdGhpcy50cmFja2Vyc0Jsb2NrZWRDb3VudCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldCgndHJhY2tlcnNCbG9ja2VkQ291bnQnLCBuZXdUcmFja2Vyc0Jsb2NrZWRDb3VudClcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBuZXdUcmFja2VyTmV0d29ya3MgPSB0aGlzLmdldFRyYWNrZXJOZXR3b3Jrc09uUGFnZSgpXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudHJhY2tlck5ldHdvcmtzLmxlbmd0aCA9PT0gMCB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgKG5ld1RyYWNrZXJOZXR3b3Jrcy5sZW5ndGggIT09IHRoaXMudHJhY2tlck5ldHdvcmtzLmxlbmd0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXQoJ3RyYWNrZXJOZXR3b3JrcycsIG5ld1RyYWNrZXJOZXR3b3JrcylcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBuZXdVbmtub3duVHJhY2tlcnNDb3VudCA9IHRoaXMuZ2V0VW5rbm93blRyYWNrZXJzQ291bnQoKVxuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1RvdGFsVHJhY2tlck5ldHdvcmtzQ291bnQgPSBuZXdVbmtub3duVHJhY2tlcnNDb3VudCArIG5ld1RyYWNrZXJOZXR3b3Jrcy5sZW5ndGhcbiAgICAgICAgICAgICAgICBpZiAobmV3VG90YWxUcmFja2VyTmV0d29ya3NDb3VudCAhPT0gdGhpcy50b3RhbFRyYWNrZXJOZXR3b3Jrc0NvdW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0KCd0b3RhbFRyYWNrZXJOZXR3b3Jrc0NvdW50JywgbmV3VG90YWxUcmFja2VyTmV0d29ya3NDb3VudClcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBuZXdNYWpvclRyYWNrZXJOZXR3b3Jrc0NvdW50ID0gdGhpcy5nZXRNYWpvclRyYWNrZXJOZXR3b3Jrc0NvdW50KClcbiAgICAgICAgICAgICAgICBpZiAobmV3TWFqb3JUcmFja2VyTmV0d29ya3NDb3VudCAhPT0gdGhpcy5tYWpvclRyYWNrZXJOZXR3b3Jrc0NvdW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0KCdtYWpvclRyYWNrZXJOZXR3b3Jrc0NvdW50JywgbmV3TWFqb3JUcmFja2VyTmV0d29ya3NDb3VudClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0VW5pcXVlVHJhY2tlcnNDb3VudDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ1ttb2RlbF0gZ2V0VW5pcXVlVHJhY2tlcnNDb3VudCgpJylcbiAgICAgICAgICAgIGNvbnN0IGNvdW50ID0gT2JqZWN0LmtleXModGhpcy50YWIudHJhY2tlcnMpLnJlZHVjZSgodG90YWwsIG5hbWUpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy50YWIudHJhY2tlcnNbbmFtZV0uY291bnQgKyB0b3RhbFxuICAgICAgICAgICAgfSwgMClcblxuICAgICAgICAgICAgcmV0dXJuIGNvdW50XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0VW5pcXVlVHJhY2tlcnNCbG9ja2VkQ291bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdbbW9kZWxdIGdldFVuaXF1ZVRyYWNrZXJzQmxvY2tlZENvdW50KCknKVxuICAgICAgICAgICAgY29uc3QgY291bnQgPSBPYmplY3Qua2V5cyh0aGlzLnRhYi50cmFja2Vyc0Jsb2NrZWQpLnJlZHVjZSgodG90YWwsIG5hbWUpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb21wYW55QmxvY2tlZCA9IHRoaXMudGFiLnRyYWNrZXJzQmxvY2tlZFtuYW1lXVxuXG4gICAgICAgICAgICAgICAgLy8gRG9uJ3QgdGhyb3cgYSBUeXBlRXJyb3IgaWYgdXJscyBhcmUgbm90IHRoZXJlXG4gICAgICAgICAgICAgICAgY29uc3QgdHJhY2tlcnNCbG9ja2VkID0gY29tcGFueUJsb2NrZWQudXJscyA/IE9iamVjdC5rZXlzKGNvbXBhbnlCbG9ja2VkLnVybHMpIDogbnVsbFxuXG4gICAgICAgICAgICAgICAgLy8gQ291bnRpbmcgdW5pcXVlIFVSTHMgaW5zdGVhZCBvZiB1c2luZyB0aGUgY291bnRcbiAgICAgICAgICAgICAgICAvLyBiZWNhdXNlIHRoZSBjb3VudCByZWZlcnMgdG8gYWxsIHJlcXVlc3RzIHJhdGhlciB0aGFuIHVuaXF1ZSBudW1iZXIgb2YgdHJhY2tlcnNcbiAgICAgICAgICAgICAgICBjb25zdCB0cmFja2Vyc0Jsb2NrZWRDb3VudCA9IHRyYWNrZXJzQmxvY2tlZCA/IHRyYWNrZXJzQmxvY2tlZC5sZW5ndGggOiAwXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRyYWNrZXJzQmxvY2tlZENvdW50ICsgdG90YWxcbiAgICAgICAgICAgIH0sIDApXG5cbiAgICAgICAgICAgIHJldHVybiBjb3VudFxuICAgICAgICB9LFxuXG4gICAgICAgIGdldFVua25vd25UcmFja2Vyc0NvdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnW21vZGVsXSBnZXRVbmtub3duVHJhY2tlcnNDb3VudCgpJylcbiAgICAgICAgICAgIGNvbnN0IHVua25vd25UcmFja2VycyA9IHRoaXMudGFiLnRyYWNrZXJzID8gdGhpcy50YWIudHJhY2tlcnMudW5rbm93biA6IHt9XG5cbiAgICAgICAgICAgIGxldCBjb3VudCA9IDBcbiAgICAgICAgICAgIGlmICh1bmtub3duVHJhY2tlcnMgJiYgdW5rbm93blRyYWNrZXJzLnVybHMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB1bmtub3duVHJhY2tlcnNVcmxzID0gT2JqZWN0LmtleXModW5rbm93blRyYWNrZXJzLnVybHMpXG4gICAgICAgICAgICAgICAgY291bnQgPSB1bmtub3duVHJhY2tlcnNVcmxzID8gdW5rbm93blRyYWNrZXJzVXJscy5sZW5ndGggOiAwXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBjb3VudFxuICAgICAgICB9LFxuXG4gICAgICAgIGdldE1ham9yVHJhY2tlck5ldHdvcmtzQ291bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdbbW9kZWxdIGdldE1ham9yVHJhY2tlck5ldHdvcmtzQ291bnQoKScpXG4gICAgICAgICAgICAvLyBTaG93IG9ubHkgYmxvY2tlZCBtYWpvciB0cmFja2VycyBjb3VudCwgdW5sZXNzIHNpdGUgaXMgd2hpdGVsaXN0ZWRcbiAgICAgICAgICAgIGNvbnN0IHRyYWNrZXJzID0gdGhpcy5pc0FsbG93bGlzdGVkID8gdGhpcy50YWIudHJhY2tlcnMgOiB0aGlzLnRhYi50cmFja2Vyc0Jsb2NrZWRcbiAgICAgICAgICAgIGNvbnN0IGNvdW50ID0gT2JqZWN0LnZhbHVlcyh0cmFja2VycykucmVkdWNlKCh0b3RhbCwgdCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzTWFqb3IgPSB0LnByZXZhbGVuY2UgPiBNQUpPUl9UUkFDS0VSX1RIUkVTSE9MRF9QQ1RcbiAgICAgICAgICAgICAgICB0b3RhbCArPSBpc01ham9yID8gMSA6IDBcbiAgICAgICAgICAgICAgICByZXR1cm4gdG90YWxcbiAgICAgICAgICAgIH0sIDApXG5cbiAgICAgICAgICAgIHJldHVybiBjb3VudFxuICAgICAgICB9LFxuXG4gICAgICAgIGdldFRyYWNrZXJOZXR3b3Jrc09uUGFnZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ1ttb2RlbF0gZ2V0TWFqb3JUcmFja2VyTmV0d29ya3NPblBhZ2UoKScpXG4gICAgICAgICAgICAvLyBhbGwgdHJhY2tlciBuZXR3b3JrcyBmb3VuZCBvbiB0aGlzIHBhZ2UvdGFiXG4gICAgICAgICAgICBjb25zdCBuZXR3b3JrcyA9IE9iamVjdC5rZXlzKHRoaXMudGFiLnRyYWNrZXJzKVxuICAgICAgICAgICAgICAgIC5tYXAoKHQpID0+IHQudG9Mb3dlckNhc2UoKSlcbiAgICAgICAgICAgICAgICAuZmlsdGVyKCh0KSA9PiB0ICE9PSAndW5rbm93bicpXG4gICAgICAgICAgICByZXR1cm4gbmV0d29ya3NcbiAgICAgICAgfSxcblxuICAgICAgICBpbml0QWxsb3dsaXN0ZWQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5pc1doaXRlbGlzdGVkID0gdmFsdWVcbiAgICAgICAgICAgIHRoaXMuaXNCcm9rZW4gPSB0aGlzLnRhYi5zaXRlLmlzQnJva2VuIHx8IHRoaXMudGFiLnNpdGUuYnJva2VuRmVhdHVyZXMuaW5jbHVkZXMoJ2NvbnRlbnRCbG9ja2luZycpXG4gICAgICAgICAgICB0aGlzLmlzQWxsb3dsaXN0ZWQgPSB0aGlzLmlzQnJva2VuIHx8IHRoaXMuaXNXaGl0ZWxpc3RlZFxuICAgICAgICB9LFxuXG4gICAgICAgIHRvZ2dsZVdoaXRlbGlzdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMudGFiICYmIHRoaXMudGFiLnNpdGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmluaXRBbGxvd2xpc3RlZCghdGhpcy5pc1doaXRlbGlzdGVkKVxuICAgICAgICAgICAgICAgIHRoaXMuc2V0KCd3aGl0ZWxpc3RlZCcsIHRoaXMuaXNXaGl0ZWxpc3RlZClcbiAgICAgICAgICAgICAgICBjb25zdCB3aGl0ZWxpc3RPbk9yT2ZmID0gdGhpcy5pc1doaXRlbGlzdGVkID8gJ29mZicgOiAnb24nXG5cbiAgICAgICAgICAgICAgICAvLyBmaXJlIGVwdC5vbiBwaXhlbCBpZiBqdXN0IHR1cm5lZCBwcml2YWN5IHByb3RlY3Rpb24gb24sXG4gICAgICAgICAgICAgICAgLy8gZmlyZSBlcHQub2ZmIHBpeGVsIGlmIGp1c3QgdHVybmVkIHByaXZhY3kgcHJvdGVjdGlvbiBvZmYuXG4gICAgICAgICAgICAgICAgaWYgKHdoaXRlbGlzdE9uT3JPZmYgPT09ICdvbicgJiYgdGhpcy53aGl0ZWxpc3RPcHRJbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiB1c2VyIHJlcG9ydGVkIGJyb2tlbiBzaXRlIGFuZCBvcHRlZCB0byBzaGFyZSBkYXRhIG9uIHNpdGUsXG4gICAgICAgICAgICAgICAgICAgIC8vIGF0dGFjaCBkb21haW4gYW5kIHBhdGggdG8gZXB0Lm9uIHBpeGVsIGlmIHRoZXkgdHVybiBwcml2YWN5IHByb3RlY3Rpb24gYmFjayBvbi5cbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2l0ZVVybCA9IHRoaXMudGFiLnVybC5zcGxpdCgnPycpWzBdLnNwbGl0KCcjJylbMF1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXQoJ3doaXRlbGlzdE9wdEluJywgZmFsc2UpXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZmV0Y2goeyBmaXJlUGl4ZWw6IFsnZXB0JywgJ29uJywgeyBzaXRlVXJsOiBlbmNvZGVVUklDb21wb25lbnQoc2l0ZVVybCkgfV0gfSlcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mZXRjaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGl0ZWxpc3RPcHRJbjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaXN0OiAnd2hpdGVsaXN0T3B0SW4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvbWFpbjogdGhpcy50YWIuc2l0ZS5kb21haW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mZXRjaCh7IGZpcmVQaXhlbDogWydlcHQnLCB3aGl0ZWxpc3RPbk9yT2ZmXSB9KVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRoaXMuZmV0Y2goe1xuICAgICAgICAgICAgICAgICAgICB3aGl0ZWxpc3RlZDpcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdDogJ3doaXRlbGlzdGVkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbWFpbjogdGhpcy50YWIuc2l0ZS5kb21haW4sXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdGhpcy5pc1doaXRlbGlzdGVkXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIHN1Ym1pdEJyZWFrYWdlRm9ybTogZnVuY3Rpb24gKGNhdGVnb3J5KSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMudGFiKSByZXR1cm5cblxuICAgICAgICAgICAgY29uc3QgYmxvY2tlZFRyYWNrZXJzID0gW11cbiAgICAgICAgICAgIGNvbnN0IHN1cnJvZ2F0ZXMgPSBbXVxuICAgICAgICAgICAgY29uc3QgdXBncmFkZWRIdHRwcyA9IHRoaXMudGFiLnVwZ3JhZGVkSHR0cHNcbiAgICAgICAgICAgIC8vIHJlbW92ZSBwYXJhbXMgYW5kIGZyYWdtZW50cyBmcm9tIHVybCB0byBhdm9pZCBpbmNsdWRpbmcgc2Vuc2l0aXZlIGRhdGFcbiAgICAgICAgICAgIGNvbnN0IHNpdGVVcmwgPSB0aGlzLnRhYi51cmwuc3BsaXQoJz8nKVswXS5zcGxpdCgnIycpWzBdXG4gICAgICAgICAgICBjb25zdCB0cmFja2VyT2JqZWN0cyA9IHRoaXMudGFiLnRyYWNrZXJzQmxvY2tlZFxuICAgICAgICAgICAgY29uc3QgcGl4ZWxQYXJhbXMgPSBbJ2VwYmYnLFxuICAgICAgICAgICAgICAgIHsgY2F0ZWdvcnk6IGNhdGVnb3J5IH0sXG4gICAgICAgICAgICAgICAgeyBzaXRlVXJsOiBlbmNvZGVVUklDb21wb25lbnQoc2l0ZVVybCkgfSxcbiAgICAgICAgICAgICAgICB7IHVwZ3JhZGVkSHR0cHM6IHVwZ3JhZGVkSHR0cHMudG9TdHJpbmcoKSB9LFxuICAgICAgICAgICAgICAgIHsgdGRzOiB0aGlzLnRkcyB9XG4gICAgICAgICAgICBdXG5cbiAgICAgICAgICAgIGZvciAoY29uc3QgdHJhY2tlciBpbiB0cmFja2VyT2JqZWN0cykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRyYWNrZXJEb21haW5zID0gdHJhY2tlck9iamVjdHNbdHJhY2tlcl0udXJsc1xuICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKHRyYWNrZXJEb21haW5zKS5mb3JFYWNoKChkb21haW4pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRyYWNrZXJEb21haW5zW2RvbWFpbl0uaXNCbG9ja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBibG9ja2VkVHJhY2tlcnMucHVzaChkb21haW4pXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHJhY2tlckRvbWFpbnNbZG9tYWluXS5yZWFzb24gPT09ICdtYXRjaGVkIHJ1bGUgLSBzdXJyb2dhdGUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3Vycm9nYXRlcy5wdXNoKGRvbWFpbilcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwaXhlbFBhcmFtcy5wdXNoKHsgYmxvY2tlZFRyYWNrZXJzOiBibG9ja2VkVHJhY2tlcnMgfSwgeyBzdXJyb2dhdGVzOiBzdXJyb2dhdGVzIH0pXG4gICAgICAgICAgICB0aGlzLmZldGNoKHsgZmlyZVBpeGVsOiBwaXhlbFBhcmFtcyB9KVxuXG4gICAgICAgICAgICAvLyByZW1lbWJlciB0aGF0IHVzZXIgb3B0ZWQgaW50byBzaGFyaW5nIHNpdGUgYnJlYWthZ2UgZGF0YVxuICAgICAgICAgICAgLy8gZm9yIHRoaXMgZG9tYWluLCBzbyB0aGF0IHdlIGNhbiBhdHRhY2ggZG9tYWluIHdoZW4gdGhleVxuICAgICAgICAgICAgLy8gcmVtb3ZlIHNpdGUgZnJvbSB3aGl0ZWxpc3RcbiAgICAgICAgICAgIHRoaXMuc2V0KCd3aGl0ZWxpc3RPcHRJbicsIHRydWUpXG4gICAgICAgICAgICB0aGlzLmZldGNoKHtcbiAgICAgICAgICAgICAgICB3aGl0ZWxpc3RPcHRJbjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3Q6ICd3aGl0ZWxpc3RPcHRJbicsXG4gICAgICAgICAgICAgICAgICAgIGRvbWFpbjogdGhpcy50YWIuc2l0ZS5kb21haW4sXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0cnVlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgIH1cbilcblxubW9kdWxlLmV4cG9ydHMgPSBTaXRlXG4iLCJjb25zdCBQYXJlbnQgPSB3aW5kb3cuRERHLmJhc2UuTW9kZWxcbmNvbnN0IG5vcm1hbGl6ZUNvbXBhbnlOYW1lID0gcmVxdWlyZSgnLi9taXhpbnMvbm9ybWFsaXplLWNvbXBhbnktbmFtZS5lczYnKVxuXG5mdW5jdGlvbiBUb3BCbG9ja2VkIChhdHRycykge1xuICAgIGF0dHJzID0gYXR0cnMgfHwge31cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tc2VsZi1hc3NpZ25cbiAgICBhdHRycy5udW1Db21wYW5pZXMgPSBhdHRycy5udW1Db21wYW5pZXNcbiAgICBhdHRycy5jb21wYW55TGlzdCA9IFtdXG4gICAgYXR0cnMuY29tcGFueUxpc3RNYXAgPSBbXVxuICAgIGF0dHJzLnBjdFBhZ2VzV2l0aFRyYWNrZXJzID0gbnVsbFxuICAgIGF0dHJzLmxhc3RTdGF0c1Jlc2V0RGF0ZSA9IG51bGxcbiAgICBQYXJlbnQuY2FsbCh0aGlzLCBhdHRycylcbn1cblxuVG9wQmxvY2tlZC5wcm90b3R5cGUgPSB3aW5kb3cuJC5leHRlbmQoe30sXG4gICAgUGFyZW50LnByb3RvdHlwZSxcbiAgICBub3JtYWxpemVDb21wYW55TmFtZSxcbiAgICB7XG5cbiAgICAgICAgbW9kZWxOYW1lOiAndG9wQmxvY2tlZCcsXG5cbiAgICAgICAgZ2V0VG9wQmxvY2tlZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmZldGNoKHsgZ2V0VG9wQmxvY2tlZEJ5UGFnZXM6IHRoaXMubnVtQ29tcGFuaWVzIH0pXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWRhdGEudG90YWxQYWdlcyB8fCBkYXRhLnRvdGFsUGFnZXMgPCAzMCkgcmV0dXJuIHJlc29sdmUoKVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFkYXRhLnRvcEJsb2NrZWQgfHwgZGF0YS50b3BCbG9ja2VkLmxlbmd0aCA8IDEpIHJldHVybiByZXNvbHZlKClcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29tcGFueUxpc3QgPSBkYXRhLnRvcEJsb2NrZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29tcGFueUxpc3RNYXAgPSB0aGlzLmNvbXBhbnlMaXN0Lm1hcCgoY29tcGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGNvbXBhbnkubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlzcGxheU5hbWU6IGNvbXBhbnkuZGlzcGxheU5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vcm1hbGl6ZWROYW1lOiB0aGlzLm5vcm1hbGl6ZUNvbXBhbnlOYW1lKGNvbXBhbnkubmFtZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlcmNlbnQ6IGNvbXBhbnkucGVyY2VudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2FsYyBncmFwaCBiYXJzIHVzaW5nIHBpeGVscyBpbnN0ZWFkIG9mICUgdG9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWFrZSBtYXJnaW5zIGVhc2llclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBtYXggd2lkdGg6IDE0NXB4XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHB4OiBNYXRoLmZsb29yKGNvbXBhbnkucGVyY2VudCAvIDEwMCAqIDE0NSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEucGN0UGFnZXNXaXRoVHJhY2tlcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBjdFBhZ2VzV2l0aFRyYWNrZXJzID0gZGF0YS5wY3RQYWdlc1dpdGhUcmFja2Vyc1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEubGFzdFN0YXRzUmVzZXREYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubGFzdFN0YXRzUmVzZXREYXRlID0gZGF0YS5sYXN0U3RhdHNSZXNldERhdGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKClcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0sXG5cbiAgICAgICAgcmVzZXQ6IGZ1bmN0aW9uIChyZXNldERhdGUpIHtcbiAgICAgICAgICAgIHRoaXMuY29tcGFueUxpc3QgPSBbXVxuICAgICAgICAgICAgdGhpcy5jb21wYW55TGlzdE1hcCA9IFtdXG4gICAgICAgICAgICB0aGlzLnBjdFBhZ2VzV2l0aFRyYWNrZXJzID0gbnVsbFxuICAgICAgICAgICAgdGhpcy5sYXN0U3RhdHNSZXNldERhdGUgPSByZXNldERhdGVcbiAgICAgICAgfVxuICAgIH1cbilcblxubW9kdWxlLmV4cG9ydHMgPSBUb3BCbG9ja2VkXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBzZXRCcm93c2VyQ2xhc3NPbkJvZHlUYWc6IHJlcXVpcmUoJy4vc2V0LWJyb3dzZXItY2xhc3MuZXM2LmpzJyksXG4gICAgcGFyc2VRdWVyeVN0cmluZzogcmVxdWlyZSgnLi9wYXJzZS1xdWVyeS1zdHJpbmcuZXM2LmpzJylcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHBhcnNlUXVlcnlTdHJpbmc6IChxcykgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIHFzICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd0cmllZCB0byBwYXJzZSBhIG5vbi1zdHJpbmcgcXVlcnkgc3RyaW5nJylcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHBhcnNlZCA9IHt9XG5cbiAgICAgICAgaWYgKHFzWzBdID09PSAnPycpIHtcbiAgICAgICAgICAgIHFzID0gcXMuc3Vic3RyKDEpXG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwYXJ0cyA9IHFzLnNwbGl0KCcmJylcblxuICAgICAgICBwYXJ0cy5mb3JFYWNoKChwYXJ0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBba2V5LCB2YWxdID0gcGFydC5zcGxpdCgnPScpXG5cbiAgICAgICAgICAgIGlmIChrZXkgJiYgdmFsKSB7XG4gICAgICAgICAgICAgICAgcGFyc2VkW2tleV0gPSB2YWxcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgICByZXR1cm4gcGFyc2VkXG4gICAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgc2V0QnJvd3NlckNsYXNzT25Cb2R5VGFnOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHdpbmRvdy5jaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7IGdldEJyb3dzZXI6IHRydWUgfSwgKGJyb3dzZXIpID0+IHtcbiAgICAgICAgICAgIGlmIChbJ2VkZycsICdlZGdlJywgJ2JyYXZlJ10uaW5jbHVkZXMoYnJvd3NlcikpIHtcbiAgICAgICAgICAgICAgICBicm93c2VyID0gJ2Nocm9tZSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGJyb3dzZXJDbGFzcyA9ICdpcy1icm93c2VyLS0nICsgYnJvd3NlclxuICAgICAgICAgICAgd2luZG93LiQoJ2h0bWwnKS5hZGRDbGFzcyhicm93c2VyQ2xhc3MpXG4gICAgICAgICAgICB3aW5kb3cuJCgnYm9keScpLmFkZENsYXNzKGJyb3dzZXJDbGFzcylcbiAgICAgICAgfSlcbiAgICB9XG59XG4iLCJjb25zdCBQYXJlbnQgPSB3aW5kb3cuRERHLmJhc2UuUGFnZVxuY29uc3QgbWl4aW5zID0gcmVxdWlyZSgnLi9taXhpbnMvaW5kZXguZXM2LmpzJylcbmNvbnN0IEhhbWJ1cmdlck1lbnVWaWV3ID0gcmVxdWlyZSgnLi8uLi92aWV3cy9oYW1idXJnZXItbWVudS5lczYuanMnKVxuY29uc3QgSGFtYnVyZ2VyTWVudU1vZGVsID0gcmVxdWlyZSgnLi8uLi9tb2RlbHMvaGFtYnVyZ2VyLW1lbnUuZXM2LmpzJylcbmNvbnN0IGhhbWJ1cmdlck1lbnVUZW1wbGF0ZSA9IHJlcXVpcmUoJy4vLi4vdGVtcGxhdGVzL2hhbWJ1cmdlci1tZW51LmVzNi5qcycpXG5jb25zdCBUb3BCbG9ja2VkVmlldyA9IHJlcXVpcmUoJy4vLi4vdmlld3MvdG9wLWJsb2NrZWQtdHJ1bmNhdGVkLmVzNi5qcycpXG5jb25zdCBUb3BCbG9ja2VkTW9kZWwgPSByZXF1aXJlKCcuLy4uL21vZGVscy90b3AtYmxvY2tlZC5lczYuanMnKVxuY29uc3QgdG9wQmxvY2tlZFRlbXBsYXRlID0gcmVxdWlyZSgnLi8uLi90ZW1wbGF0ZXMvdG9wLWJsb2NrZWQtdHJ1bmNhdGVkLmVzNi5qcycpXG5jb25zdCBTaXRlVmlldyA9IHJlcXVpcmUoJy4vLi4vdmlld3Mvc2l0ZS5lczYuanMnKVxuY29uc3QgU2l0ZU1vZGVsID0gcmVxdWlyZSgnLi8uLi9tb2RlbHMvc2l0ZS5lczYuanMnKVxuY29uc3Qgc2l0ZVRlbXBsYXRlID0gcmVxdWlyZSgnLi8uLi90ZW1wbGF0ZXMvc2l0ZS5lczYuanMnKVxuY29uc3QgU2VhcmNoVmlldyA9IHJlcXVpcmUoJy4vLi4vdmlld3Mvc2VhcmNoLmVzNi5qcycpXG5jb25zdCBTZWFyY2hNb2RlbCA9IHJlcXVpcmUoJy4vLi4vbW9kZWxzL3NlYXJjaC5lczYuanMnKVxuY29uc3Qgc2VhcmNoVGVtcGxhdGUgPSByZXF1aXJlKCcuLy4uL3RlbXBsYXRlcy9zZWFyY2guZXM2LmpzJylcbmNvbnN0IEF1dG9jb21wbGV0ZVZpZXcgPSByZXF1aXJlKCcuLy4uL3ZpZXdzL2F1dG9jb21wbGV0ZS5lczYuanMnKVxuY29uc3QgQXV0b2NvbXBsZXRlTW9kZWwgPSByZXF1aXJlKCcuLy4uL21vZGVscy9hdXRvY29tcGxldGUuZXM2LmpzJylcbmNvbnN0IGF1dG9jb21wbGV0ZVRlbXBsYXRlID0gcmVxdWlyZSgnLi8uLi90ZW1wbGF0ZXMvYXV0b2NvbXBsZXRlLmVzNi5qcycpXG5jb25zdCBCYWNrZ3JvdW5kTWVzc2FnZU1vZGVsID0gcmVxdWlyZSgnLi8uLi9tb2RlbHMvYmFja2dyb3VuZC1tZXNzYWdlLmVzNi5qcycpXG5jb25zdCBFbWFpbEFsaWFzVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL2VtYWlsLWFsaWFzLmVzNi5qcycpXG5jb25zdCBFbWFpbEFsaWFzTW9kZWwgPSByZXF1aXJlKCcuLi9tb2RlbHMvZW1haWwtYWxpYXMuZXM2LmpzJylcbmNvbnN0IEVtYWlsQWxpYXNUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9lbWFpbC1hbGlhcy5lczYuanMnKVxuXG5mdW5jdGlvbiBUcmFja2VycyAob3BzKSB7XG4gICAgdGhpcy4kcGFyZW50ID0gd2luZG93LiQoJyNwb3B1cC1jb250YWluZXInKVxuICAgIFBhcmVudC5jYWxsKHRoaXMsIG9wcylcbn1cblxuVHJhY2tlcnMucHJvdG90eXBlID0gd2luZG93LiQuZXh0ZW5kKHt9LFxuICAgIFBhcmVudC5wcm90b3R5cGUsXG4gICAgbWl4aW5zLnNldEJyb3dzZXJDbGFzc09uQm9keVRhZyxcbiAgICB7XG5cbiAgICAgICAgcGFnZU5hbWU6ICdwb3B1cCcsXG5cbiAgICAgICAgcmVhZHk6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIFBhcmVudC5wcm90b3R5cGUucmVhZHkuY2FsbCh0aGlzKVxuICAgICAgICAgICAgdGhpcy5tZXNzYWdlID0gbmV3IEJhY2tncm91bmRNZXNzYWdlTW9kZWwoKVxuICAgICAgICAgICAgdGhpcy5zZXRCcm93c2VyQ2xhc3NPbkJvZHlUYWcoKVxuXG4gICAgICAgICAgICB0aGlzLnZpZXdzLnNlYXJjaCA9IG5ldyBTZWFyY2hWaWV3KHtcbiAgICAgICAgICAgICAgICBwYWdlVmlldzogdGhpcyxcbiAgICAgICAgICAgICAgICBtb2RlbDogbmV3IFNlYXJjaE1vZGVsKHsgc2VhcmNoVGV4dDogJycgfSksXG4gICAgICAgICAgICAgICAgYXBwZW5kVG86IHdpbmRvdy4kKCcjc2VhcmNoLWZvcm0tY29udGFpbmVyJyksXG4gICAgICAgICAgICAgICAgdGVtcGxhdGU6IHNlYXJjaFRlbXBsYXRlXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICB0aGlzLnZpZXdzLmhhbWJ1cmdlck1lbnUgPSBuZXcgSGFtYnVyZ2VyTWVudVZpZXcoe1xuICAgICAgICAgICAgICAgIHBhZ2VWaWV3OiB0aGlzLFxuICAgICAgICAgICAgICAgIG1vZGVsOiBuZXcgSGFtYnVyZ2VyTWVudU1vZGVsKCksXG4gICAgICAgICAgICAgICAgYXBwZW5kVG86IHdpbmRvdy4kKCcjaGFtYnVyZ2VyLW1lbnUtY29udGFpbmVyJyksXG4gICAgICAgICAgICAgICAgdGVtcGxhdGU6IGhhbWJ1cmdlck1lbnVUZW1wbGF0ZVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgdGhpcy52aWV3cy5zaXRlID0gbmV3IFNpdGVWaWV3KHtcbiAgICAgICAgICAgICAgICBwYWdlVmlldzogdGhpcyxcbiAgICAgICAgICAgICAgICBtb2RlbDogbmV3IFNpdGVNb2RlbCgpLFxuICAgICAgICAgICAgICAgIGFwcGVuZFRvOiB3aW5kb3cuJCgnI3NpdGUtaW5mby1jb250YWluZXInKSxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogc2l0ZVRlbXBsYXRlXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICB0aGlzLnZpZXdzLnRvcGJsb2NrZWQgPSBuZXcgVG9wQmxvY2tlZFZpZXcoe1xuICAgICAgICAgICAgICAgIHBhZ2VWaWV3OiB0aGlzLFxuICAgICAgICAgICAgICAgIG1vZGVsOiBuZXcgVG9wQmxvY2tlZE1vZGVsKHsgbnVtQ29tcGFuaWVzOiAzIH0pLFxuICAgICAgICAgICAgICAgIGFwcGVuZFRvOiB3aW5kb3cuJCgnI3RvcC1ibG9ja2VkLWNvbnRhaW5lcicpLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlOiB0b3BCbG9ja2VkVGVtcGxhdGVcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgIHRoaXMudmlld3MuZW1haWxBbGlhcyA9IG5ldyBFbWFpbEFsaWFzVmlldyh7XG4gICAgICAgICAgICAgICAgcGFnZVZpZXc6IHRoaXMsXG4gICAgICAgICAgICAgICAgbW9kZWw6IG5ldyBFbWFpbEFsaWFzTW9kZWwoKSxcbiAgICAgICAgICAgICAgICBhcHBlbmRUbzogd2luZG93LiQoJyNlbWFpbC1hbGlhcy1jb250YWluZXInKSxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogRW1haWxBbGlhc1RlbXBsYXRlXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAvLyBUT0RPOiBob29rIHVwIG1vZGVsIHF1ZXJ5IHRvIGFjdHVhbCBkZGcgYWMgZW5kcG9pbnQuXG4gICAgICAgICAgICAvLyBGb3Igbm93IHRoaXMgaXMganVzdCBoZXJlIHRvIGRlbW9uc3RyYXRlIGhvdyB0b1xuICAgICAgICAgICAgLy8gbGlzdGVuIHRvIGFub3RoZXIgY29tcG9uZW50IHZpYSBtb2RlbC5zZXQoKSArXG4gICAgICAgICAgICAvLyBzdG9yZS5zdWJzY3JpYmUoKVxuICAgICAgICAgICAgdGhpcy52aWV3cy5hdXRvY29tcGxldGUgPSBuZXcgQXV0b2NvbXBsZXRlVmlldyh7XG4gICAgICAgICAgICAgICAgcGFnZVZpZXc6IHRoaXMsXG4gICAgICAgICAgICAgICAgbW9kZWw6IG5ldyBBdXRvY29tcGxldGVNb2RlbCh7IHN1Z2dlc3Rpb25zOiBbXSB9KSxcbiAgICAgICAgICAgICAgICAvLyBhcHBlbmRUbzogdGhpcy52aWV3cy5zZWFyY2guJGVsLFxuICAgICAgICAgICAgICAgIGFwcGVuZFRvOiBudWxsLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlOiBhdXRvY29tcGxldGVUZW1wbGF0ZVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgIH1cbilcblxuLy8ga2lja29mZiFcbndpbmRvdy5EREcgPSB3aW5kb3cuRERHIHx8IHt9XG53aW5kb3cuRERHLnBhZ2UgPSBuZXcgVHJhY2tlcnMoKVxuIiwiY29uc3QgYmVsID0gcmVxdWlyZSgnYmVsJylcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gVE9ETy9SRU1PVkU6IHJlbW92ZSBtYXJnaW5Ub3Agc3R5bGUgdGFnIG9uY2UgdGhpcyBpcyBhY3R1YWxseSBob29rZWQgdXBcbiAgICAvLyB0aGlzIGlzIGp1c3QgdG8gZGVtbyBtb2RlbCBzdG9yZSBmb3Igbm93IVxuICAgIC8vICAtPiB0aGlzIGlzIGdyb3NzLCBkb24ndCBkbyB0aGlzOlxuICAgIGNvbnN0IG1hcmdpblRvcCA9IHRoaXMubW9kZWwuc3VnZ2VzdGlvbnMgJiYgdGhpcy5tb2RlbC5zdWdnZXN0aW9ucy5sZW5ndGggPiAwID8gJ21hcmdpbi10b3A6IDUwcHg7JyA6ICcnXG5cbiAgICByZXR1cm4gYmVsYDx1bCBjbGFzcz1cImpzLWF1dG9jb21wbGV0ZVwiIHN0eWxlPVwiJHttYXJnaW5Ub3B9XCI+XG4gICAgICAgICR7dGhpcy5tb2RlbC5zdWdnZXN0aW9ucy5tYXAoKHN1Z2dlc3Rpb24pID0+IGJlbGBcbiAgICAgICAgICAgIDxsaT48YSBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApXCI+JHtzdWdnZXN0aW9ufTwvYT48L2xpPmBcbiAgICApfVxuICAgIDwvdWw+YFxufVxuIiwiY29uc3QgYmVsID0gcmVxdWlyZSgnYmVsJylcbmNvbnN0IGNhdGVnb3JpZXMgPSBbXG4gICAgeyBjYXRlZ29yeTogJ1ZpZGVvIG9yIGltYWdlcyBkaWRuXFwndCBsb2FkJywgdmFsdWU6ICdpbWFnZXMnIH0sXG4gICAgeyBjYXRlZ29yeTogJ0NvbnRlbnQgaXMgbWlzc2luZycsIHZhbHVlOiAnY29udGVudCcgfSxcbiAgICB7IGNhdGVnb3J5OiAnTGlua3Mgb3IgYnV0dG9ucyBkb25cXCd0IHdvcmsnLCB2YWx1ZTogJ2xpbmtzJyB9LFxuICAgIHsgY2F0ZWdvcnk6ICdDYW5cXCd0IHNpZ24gaW4nLCB2YWx1ZTogJ2xvZ2luJyB9LFxuICAgIHsgY2F0ZWdvcnk6ICdTaXRlIGFza2VkIG1lIHRvIGRpc2FibGUgdGhlIGV4dGVuc2lvbicsIHZhbHVlOiAncGF5d2FsbCcgfVxuXVxuXG5mdW5jdGlvbiBzaHVmZmxlIChhcnIpIHtcbiAgICBsZXQgbGVuID0gYXJyLmxlbmd0aFxuICAgIGxldCB0ZW1wXG4gICAgbGV0IGluZGV4XG4gICAgd2hpbGUgKGxlbiA+IDApIHtcbiAgICAgICAgaW5kZXggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBsZW4pXG4gICAgICAgIGxlbi0tXG4gICAgICAgIHRlbXAgPSBhcnJbbGVuXVxuICAgICAgICBhcnJbbGVuXSA9IGFycltpbmRleF1cbiAgICAgICAgYXJyW2luZGV4XSA9IHRlbXBcbiAgICB9XG4gICAgcmV0dXJuIGFyclxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gYmVsYDxkaXYgY2xhc3M9XCJicmVha2FnZS1mb3JtIGpzLWJyZWFrYWdlLWZvcm1cIj5cbiAgICA8ZGl2IGNsYXNzPVwiYnJlYWthZ2UtZm9ybV9fY29udGVudFwiPlxuICAgICAgICA8bmF2IGNsYXNzPVwiYnJlYWthZ2UtZm9ybV9fY2xvc2UtY29udGFpbmVyXCI+XG4gICAgICAgICAgICA8YSBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApXCIgY2xhc3M9XCJpY29uIGljb25fX2Nsb3NlIGpzLWJyZWFrYWdlLWZvcm0tY2xvc2VcIiByb2xlPVwiYnV0dG9uXCIgYXJpYS1sYWJlbD1cIkRpc21pc3MgZm9ybVwiPjwvYT5cbiAgICAgICAgPC9uYXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJmb3JtX19pY29uLS13cmFwcGVyXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZm9ybV9faWNvblwiPjwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImJyZWFrYWdlLWZvcm1fX2VsZW1lbnQganMtYnJlYWthZ2UtZm9ybS1lbGVtZW50XCI+XG4gICAgICAgICAgICA8aDIgY2xhc3M9XCJicmVha2FnZS1mb3JtX190aXRsZVwiPlNvbWV0aGluZyBicm9rZW4/PC9oMj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJicmVha2FnZS1mb3JtX19leHBsYW5hdGlvblwiPlN1Ym1pdHRpbmcgYW4gYW5vbnltb3VzIGJyb2tlbiBzaXRlIHJlcG9ydCBoZWxwcyB1cyBkZWJ1ZyB0aGVzZSBpc3N1ZXMgYW5kIGltcHJvdmUgdGhlIGV4dGVuc2lvbi48L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmb3JtX19zZWxlY3QgYnJlYWthZ2UtZm9ybV9faW5wdXQtLWRyb3Bkb3duXCI+XG4gICAgICAgICAgICAgICAgPHNlbGVjdCBjbGFzcz1cImpzLWJyZWFrYWdlLWZvcm0tZHJvcGRvd25cIj5cbiAgICAgICAgICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT0ndW5zcGVjaWZpZWQnIGRpc2FibGVkIHNlbGVjdGVkPlNlbGVjdCBhIGNhdGVnb3J5IChvcHRpb25hbCk8L29wdGlvbj5cbiAgICAgICAgICAgICAgICAgICAgJHtzaHVmZmxlKGNhdGVnb3JpZXMpLm1hcChmdW5jdGlvbiAoaXRlbSkgeyByZXR1cm4gYmVsYDxvcHRpb24gdmFsdWU9JHtpdGVtLnZhbHVlfT4ke2l0ZW0uY2F0ZWdvcnl9PC9vcHRpb24+YCB9KX1cbiAgICAgICAgICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT0nb3RoZXInPlNvbWV0aGluZyBlbHNlPC9vcHRpb24+XG4gICAgICAgICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxidG4gY2xhc3M9XCJmb3JtX19zdWJtaXQganMtYnJlYWthZ2UtZm9ybS1zdWJtaXRcIiByb2xlPVwiYnV0dG9uXCI+U2VuZCByZXBvcnQ8L2J0bj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJicmVha2FnZS1mb3JtX19mb290ZXJcIj5SZXBvcnRzIHNlbnQgdG8gRHVja0R1Y2tHbyBhcmUgMTAwJSBhbm9ueW1vdXMgYW5kIG9ubHkgaW5jbHVkZSB5b3VyIHNlbGVjdGlvbiBhYm92ZSwgdGhlIFVSTCwgYW5kIGEgbGlzdCBvZiB0cmFja2VycyB3ZSBmb3VuZCBvbiB0aGUgc2l0ZS48L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJicmVha2FnZS1mb3JtX19tZXNzYWdlIGpzLWJyZWFrYWdlLWZvcm0tbWVzc2FnZSBpcy10cmFuc3BhcmVudFwiPlxuICAgICAgICAgICAgPGgyIGNsYXNzPVwiYnJlYWthZ2UtZm9ybV9fc3VjY2Vzcy0tdGl0bGVcIj5UaGFuayB5b3UhPC9oMj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJicmVha2FnZS1mb3JtX19zdWNjZXNzLS1tZXNzYWdlXCI+WW91ciByZXBvcnQgd2lsbCBoZWxwIGltcHJvdmUgdGhlIGV4dGVuc2lvbiBhbmQgbWFrZSB0aGUgZXhwZXJpZW5jZSBiZXR0ZXIgZm9yIG90aGVyIHBlb3BsZS48L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG48L2Rpdj5gXG59XG4iLCJjb25zdCBiZWwgPSByZXF1aXJlKCdiZWwnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5tb2RlbC51c2VyRGF0YSAmJiB0aGlzLm1vZGVsLnVzZXJEYXRhLm5leHRBbGlhcykge1xuICAgICAgICByZXR1cm4gYmVsYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImpzLWVtYWlsLWFsaWFzIGVtYWlsLWFsaWFzLWJsb2NrIHBhZGRlZFwiPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiZW1haWwtYWxpYXNfX2ljb25cIj48L3NwYW4+XG4gICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBjbGFzcz1cImxpbmstc2Vjb25kYXJ5IGJvbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJ0ZXh0LWxpbmUtYWZ0ZXItaWNvblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgQ3JlYXRlIG5ldyBEdWNrIEFkZHJlc3NcbiAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwianMtYWxpYXMtY29waWVkIGFsaWFzLWNvcGllZC1sYWJlbFwiPkNvcGllZCB0byBjbGlwYm9hcmQ8L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICA8L2Rpdj5gXG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGxcbn1cbiIsImNvbnN0IGJlbCA9IHJlcXVpcmUoJ2JlbCcpXG5jb25zdCByZWFzb25zID0gcmVxdWlyZSgnLi9zaGFyZWQvZ3JhZGUtc2NvcmVjYXJkLXJlYXNvbnMuZXM2LmpzJylcbmNvbnN0IGdyYWRlcyA9IHJlcXVpcmUoJy4vc2hhcmVkL2dyYWRlLXNjb3JlY2FyZC1ncmFkZXMuZXM2LmpzJylcbmNvbnN0IHJhdGluZ0hlcm8gPSByZXF1aXJlKCcuL3NoYXJlZC9yYXRpbmctaGVyby5lczYuanMnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gYmVsYDxzZWN0aW9uIGNsYXNzPVwic2xpZGluZy1zdWJ2aWV3IGdyYWRlLXNjb3JlY2FyZCBzbGlkaW5nLXN1YnZpZXctLWhhcy1maXhlZC1oZWFkZXJcIj5cbiAgICA8ZGl2IGNsYXNzPVwic2l0ZS1pbmZvIHNpdGUtaW5mby0tZnVsbC1oZWlnaHQgY2FyZFwiPlxuICAgICAgICAke3JhdGluZ0hlcm8odGhpcy5tb2RlbCwgeyBzaG93Q2xvc2U6IHRydWUgfSl9XG4gICAgICAgICR7cmVhc29ucyh0aGlzLm1vZGVsKX1cbiAgICAgICAgJHtncmFkZXModGhpcy5tb2RlbCl9XG4gICAgPC9kaXY+XG48L3NlY3Rpb24+YFxufVxuIiwiY29uc3QgYmVsID0gcmVxdWlyZSgnYmVsJylcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGJlbGA8bmF2IGNsYXNzPVwiaGFtYnVyZ2VyLW1lbnUganMtaGFtYnVyZ2VyLW1lbnUgaXMtaGlkZGVuXCI+XG4gICAgPGRpdiBjbGFzcz1cImhhbWJ1cmdlci1tZW51X19iZ1wiPjwvZGl2PlxuICAgIDxkaXYgY2xhc3M9XCJoYW1idXJnZXItbWVudV9fY29udGVudCBjYXJkIHBhZGRlZFwiPlxuICAgICAgICA8aDIgY2xhc3M9XCJtZW51LXRpdGxlIGJvcmRlci0tYm90dG9tIGhhbWJ1cmdlci1tZW51X19jb250ZW50X19tb3JlLW9wdGlvbnNcIj5cbiAgICAgICAgICAgIE1vcmUgb3B0aW9uc1xuICAgICAgICA8L2gyPlxuICAgICAgICA8bmF2IGNsYXNzPVwicHVsbC1yaWdodCBoYW1idXJnZXItbWVudV9fY2xvc2UtY29udGFpbmVyXCI+XG4gICAgICAgICAgICA8YSBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApXCIgY2xhc3M9XCJpY29uIGljb25fX2Nsb3NlIGpzLWhhbWJ1cmdlci1tZW51LWNsb3NlXCIgcm9sZT1cImJ1dHRvblwiIGFyaWEtbGFiZWw9XCJDbG9zZSBvcHRpb25zXCI+PC9hPlxuICAgICAgICA8L25hdj5cbiAgICAgICAgPHVsIGNsYXNzPVwiaGFtYnVyZ2VyLW1lbnVfX2xpbmtzIHBhZGRlZCBkZWZhdWx0LWxpc3RcIj5cbiAgICAgICAgICAgIDxsaT5cbiAgICAgICAgICAgICAgICA8YSBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApXCIgY2xhc3M9XCJtZW51LXRpdGxlIGpzLWhhbWJ1cmdlci1tZW51LW9wdGlvbnMtbGlua1wiPlxuICAgICAgICAgICAgICAgICAgICBTZXR0aW5nc1xuICAgICAgICAgICAgICAgICAgICA8c3Bhbj5NYW5hZ2UgVW5wcm90ZWN0ZWQgU2l0ZXMgYW5kIG90aGVyIG9wdGlvbnMuPC9zcGFuPlxuICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgIDwvbGk+XG4gICAgICAgICAgICA8bGk+XG4gICAgICAgICAgICAgICAgPGEgaHJlZj1cImphdmFzY3JpcHQ6dm9pZCgwKVwiIGNsYXNzPVwibWVudS10aXRsZSBqcy1oYW1idXJnZXItbWVudS1mZWVkYmFjay1saW5rXCI+XG4gICAgICAgICAgICAgICAgICAgIFNoYXJlIGZlZWRiYWNrXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuPkdvdCBpc3N1ZXMgb3Igc3VnZ2VzdGlvbnM/IExldCB1cyBrbm93ITwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICA8L2xpPlxuICAgICAgICAgICAgPGxpPlxuICAgICAgICAgICAgICAgIDxhIGhyZWY9XCJqYXZhc2NyaXB0OnZvaWQoMClcIiBjbGFzcz1cIm1lbnUtdGl0bGUganMtaGFtYnVyZ2VyLW1lbnUtYnJva2VuLXNpdGUtbGlua1wiPlxuICAgICAgICAgICAgICAgICAgICBSZXBvcnQgYnJva2VuIHNpdGVcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4+SWYgYSBzaXRlJ3Mgbm90IHdvcmtpbmcsIHBsZWFzZSB0ZWxsIHVzLjwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICA8L2xpPlxuICAgICAgICAgICAgPGxpIGNsYXNzPVwiaXMtaGlkZGVuXCIgaWQ9XCJkZWJ1Z2dlci1wYW5lbFwiPlxuICAgICAgICAgICAgICAgIDxhIGhyZWY9XCJqYXZhc2NyaXB0OnZvaWQoMClcIiBjbGFzcz1cIm1lbnUtdGl0bGUganMtaGFtYnVyZ2VyLW1lbnUtZGVidWdnZXItcGFuZWwtbGlua1wiPlxuICAgICAgICAgICAgICAgICAgICBQcm90ZWN0aW9uIGRlYnVnZ2VyIHBhbmVsXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuPkRlYnVnIHByaXZhY3kgcHJvdGVjdGlvbnMgb24gYSBwYWdlLjwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICA8L2xpPlxuICAgICAgICA8L3VsPlxuICAgIDwvZGl2PlxuPC9uYXY+YFxufVxuIiwiY29uc3QgYmVsID0gcmVxdWlyZSgnYmVsJylcbmNvbnN0IGhlcm8gPSByZXF1aXJlKCcuL3NoYXJlZC9oZXJvLmVzNi5qcycpXG5jb25zdCBzdGF0dXNMaXN0ID0gcmVxdWlyZSgnLi9zaGFyZWQvc3RhdHVzLWxpc3QuZXM2LmpzJylcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4uLy4uLy4uL2RhdGEvY29uc3RhbnRzJylcbmNvbnN0IGxpbmsgPSByZXF1aXJlKCcuL3NoYXJlZC9saW5rLmVzNi5qcycpXG5cbmZ1bmN0aW9uIHVwcGVyQ2FzZUZpcnN0IChzdHJpbmcpIHtcbiAgICByZXR1cm4gc3RyaW5nLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgc3RyaW5nLnNsaWNlKDEpXG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuICAgIGNvbnN0IGRvbWFpbiA9IHRoaXMubW9kZWwgJiYgdGhpcy5tb2RlbC5kb21haW5cbiAgICBjb25zdCB0b3NkciA9IHRoaXMubW9kZWwgJiYgdGhpcy5tb2RlbC50b3NkclxuXG4gICAgY29uc3QgdG9zZHJNc2cgPSAodG9zZHIgJiYgdG9zZHIubWVzc2FnZSkgfHxcbiAgICBjb25zdGFudHMudG9zZHJNZXNzYWdlcy51bmtub3duXG4gICAgY29uc3QgdG9zZHJTdGF0dXMgPSB0b3Nkck1zZy50b0xvd2VyQ2FzZSgpXG5cbiAgICByZXR1cm4gYmVsYDxzZWN0aW9uIGNsYXNzPVwic2xpZGluZy1zdWJ2aWV3IHNsaWRpbmctc3Vidmlldy0taGFzLWZpeGVkLWhlYWRlclwiPlxuICAgIDxkaXYgY2xhc3M9XCJwcml2YWN5LXByYWN0aWNlcyBzaXRlLWluZm8gc2l0ZS1pbmZvLS1mdWxsLWhlaWdodCBjYXJkXCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJqcy1wcml2YWN5LXByYWN0aWNlcy1oZXJvXCI+XG4gICAgICAgICAgICAke2hlcm8oe1xuICAgICAgICBzdGF0dXM6IHRvc2RyU3RhdHVzLFxuICAgICAgICB0aXRsZTogZG9tYWluLFxuICAgICAgICBzdWJ0aXRsZTogYCR7dG9zZHJNc2d9IFByaXZhY3kgUHJhY3RpY2VzYCxcbiAgICAgICAgc2hvd0Nsb3NlOiB0cnVlXG4gICAgfSl9XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwicHJpdmFjeS1wcmFjdGljZXNfX2V4cGxhaW5lciBwYWRkZWQgYm9yZGVyLS1ib3R0b20tLWlubmVyXG4gICAgICAgICAgICB0ZXh0LS1jZW50ZXJcIj5cbiAgICAgICAgICAgIFByaXZhY3kgcHJhY3RpY2VzIGluZGljYXRlIGhvdyBtdWNoIHRoZSBwZXJzb25hbCBpbmZvcm1hdGlvblxuICAgICAgICAgICAgdGhhdCB5b3Ugc2hhcmUgd2l0aCBhIHdlYnNpdGUgaXMgcHJvdGVjdGVkLlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cInByaXZhY3ktcHJhY3RpY2VzX19kZXRhaWxzIHBhZGRlZFxuICAgICAgICAgICAganMtcHJpdmFjeS1wcmFjdGljZXMtZGV0YWlsc1wiPlxuICAgICAgICAgICAgJHt0b3NkciAmJiB0b3Nkci5yZWFzb25zID8gcmVuZGVyRGV0YWlscyh0b3Nkci5yZWFzb25zKSA6IHJlbmRlck5vRGV0YWlscygpfVxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cInByaXZhY3ktcHJhY3RpY2VzX19hdHRyaWIgcGFkZGVkIHRleHQtLWNlbnRlciBib3JkZXItLXRvcC0taW5uZXJcIj5cbiAgICAgICAgICAgIFByaXZhY3kgUHJhY3RpY2VzIGZyb20gJHtsaW5rKCdodHRwczovL3Rvc2RyLm9yZy8nLCB7XG4gICAgICAgIGNsYXNzTmFtZTogJ2JvbGQnLFxuICAgICAgICB0YXJnZXQ6ICdfYmxhbmsnLFxuICAgICAgICB0ZXh0OiAnVG9TO0RSJyxcbiAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgJ2FyaWEtbGFiZWwnOiAnVGVybXMgb2YgU2VydmljZTsgRGlkblxcJ3QgUmVhZCdcbiAgICAgICAgfVxuICAgIH0pfS5cbiAgICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG48L3NlY3Rpb24+YFxufVxuXG5mdW5jdGlvbiByZW5kZXJEZXRhaWxzIChyZWFzb25zKSB7XG4gICAgbGV0IGdvb2QgPSByZWFzb25zLmdvb2QgfHwgW11cbiAgICBsZXQgYmFkID0gcmVhc29ucy5iYWQgfHwgW11cblxuICAgIGlmICghZ29vZC5sZW5ndGggJiYgIWJhZC5sZW5ndGgpIHJldHVybiByZW5kZXJOb0RldGFpbHMoKVxuXG4gICAgLy8gY29udmVydCBhcnJheXMgdG8gd29yayBmb3IgdGhlIHN0YXR1c0xpc3QgdGVtcGxhdGUsXG4gICAgLy8gd2hpY2ggdXNlIG9iamVjdHNcblxuICAgIGdvb2QgPSBnb29kLm1hcChpdGVtID0+ICh7XG4gICAgICAgIG1zZzogdXBwZXJDYXNlRmlyc3QoaXRlbSksXG4gICAgICAgIG1vZGlmaWVyOiAnZ29vZCdcbiAgICB9KSlcblxuICAgIGJhZCA9IGJhZC5tYXAoaXRlbSA9PiAoe1xuICAgICAgICBtc2c6IHVwcGVyQ2FzZUZpcnN0KGl0ZW0pLFxuICAgICAgICBtb2RpZmllcjogJ2JhZCdcbiAgICB9KSlcblxuICAgIC8vIGxpc3QgZ29vZCBmaXJzdCwgdGhlbiBiYWRcbiAgICByZXR1cm4gc3RhdHVzTGlzdChnb29kLmNvbmNhdChiYWQpKVxufVxuXG5mdW5jdGlvbiByZW5kZXJOb0RldGFpbHMgKCkge1xuICAgIHJldHVybiBiZWxgPGRpdiBjbGFzcz1cInRleHQtLWNlbnRlclwiPlxuICAgIDxoMSBjbGFzcz1cInByaXZhY3ktcHJhY3RpY2VzX19kZXRhaWxzX190aXRsZVwiPlxuICAgICAgICBObyBwcml2YWN5IHByYWN0aWNlcyBmb3VuZFxuICAgIDwvaDE+XG4gICAgPGRpdiBjbGFzcz1cInByaXZhY3ktcHJhY3RpY2VzX19kZXRhaWxzX19tc2dcIj5cbiAgICAgICAgVGhlIHByaXZhY3kgcHJhY3RpY2VzIG9mIHRoaXMgd2Vic2l0ZSBoYXZlIG5vdCBiZWVuIHJldmlld2VkLlxuICAgIDwvZGl2PlxuPC9kaXY+YFxufVxuIiwiY29uc3QgYmVsID0gcmVxdWlyZSgnYmVsJylcbmNvbnN0IGhhbWJ1cmdlckJ1dHRvbiA9IHJlcXVpcmUoJy4vc2hhcmVkL2hhbWJ1cmdlci1idXR0b24uZXM2LmpzJylcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGJlbGBcbiAgICA8Zm9ybSBjbGFzcz1cInNsaWRpbmctc3Vidmlld19faGVhZGVyIHNlYXJjaC1mb3JtIGpzLXNlYXJjaC1mb3JtXCIgbmFtZT1cInhcIj5cbiAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgYXV0b2NvbXBsZXRlPVwib2ZmXCIgcGxhY2Vob2xkZXI9XCJTZWFyY2ggRHVja0R1Y2tHb1wiXG4gICAgICAgICAgICBuYW1lPVwicVwiIGNsYXNzPVwic2VhcmNoLWZvcm1fX2lucHV0IGpzLXNlYXJjaC1pbnB1dFwiXG4gICAgICAgICAgICB2YWx1ZT1cIiR7dGhpcy5tb2RlbC5zZWFyY2hUZXh0fVwiIC8+XG4gICAgICAgIDxpbnB1dCBjbGFzcz1cInNlYXJjaC1mb3JtX19nbyBqcy1zZWFyY2gtZ29cIiB2YWx1ZT1cIlwiIHR5cGU9XCJzdWJtaXRcIiBhcmlhLWxhYmVsPVwiU2VhcmNoXCIgLz5cbiAgICAgICAgJHtoYW1idXJnZXJCdXR0b24oJ2pzLXNlYXJjaC1oYW1idXJnZXItYnV0dG9uJyl9XG4gICAgPC9mb3JtPmBcbn1cbiIsImNvbnN0IHN0YXR1c0xpc3QgPSByZXF1aXJlKCcuL3N0YXR1cy1saXN0LmVzNi5qcycpXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHNpdGUpIHtcbiAgICBjb25zdCBncmFkZXMgPSBnZXRHcmFkZXMoc2l0ZS5zaXRlUmF0aW5nLCBzaXRlLmlzQWxsb3dsaXN0ZWQpXG5cbiAgICBpZiAoIWdyYWRlcyB8fCAhZ3JhZGVzLmxlbmd0aCkgcmV0dXJuXG5cbiAgICByZXR1cm4gc3RhdHVzTGlzdChncmFkZXMsICdzdGF0dXMtbGlzdC0tcmlnaHQgcGFkZGVkIGpzLWdyYWRlLXNjb3JlY2FyZC1ncmFkZXMnKVxufVxuXG5mdW5jdGlvbiBnZXRHcmFkZXMgKHJhdGluZywgaXNBbGxvd2xpc3RlZCkge1xuICAgIGlmICghcmF0aW5nIHx8ICFyYXRpbmcuYmVmb3JlIHx8ICFyYXRpbmcuYWZ0ZXIpIHJldHVyblxuXG4gICAgLy8gdHJhbnNmb3JtIHNpdGUgcmF0aW5ncyBpbnRvIGdyYWRlc1xuICAgIC8vIHRoYXQgdGhlIHRlbXBsYXRlIGNhbiBkaXNwbGF5IG1vcmUgZWFzaWx5XG4gICAgY29uc3QgYmVmb3JlID0gcmF0aW5nLmNzc0JlZm9yZVxuICAgIGNvbnN0IGFmdGVyID0gcmF0aW5nLmNzc0FmdGVyXG5cbiAgICBjb25zdCBncmFkZXMgPSBbXVxuXG4gICAgZ3JhZGVzLnB1c2goe1xuICAgICAgICBtc2c6ICdQcml2YWN5IEdyYWRlJyxcbiAgICAgICAgbW9kaWZpZXI6IGJlZm9yZS50b0xvd2VyQ2FzZSgpXG4gICAgfSlcblxuICAgIGlmIChiZWZvcmUgIT09IGFmdGVyICYmICFpc0FsbG93bGlzdGVkKSB7XG4gICAgICAgIGdyYWRlcy5wdXNoKHtcbiAgICAgICAgICAgIG1zZzogJ0VuaGFuY2VkIEdyYWRlJyxcbiAgICAgICAgICAgIG1vZGlmaWVyOiBhZnRlci50b0xvd2VyQ2FzZSgpLFxuICAgICAgICAgICAgaGlnaGxpZ2h0OiB0cnVlXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcmV0dXJuIGdyYWRlc1xufVxuIiwiY29uc3Qgc3RhdHVzTGlzdCA9IHJlcXVpcmUoJy4vc3RhdHVzLWxpc3QuZXM2LmpzJylcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4uLy4uLy4uLy4uL2RhdGEvY29uc3RhbnRzJylcbmNvbnN0IHRyYWNrZXJOZXR3b3Jrc1RleHQgPSByZXF1aXJlKCcuL3RyYWNrZXItbmV0d29ya3MtdGV4dC5lczYuanMnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzaXRlKSB7XG4gICAgY29uc3QgcmVhc29ucyA9IGdldFJlYXNvbnMoc2l0ZSlcblxuICAgIGlmICghcmVhc29ucyB8fCAhcmVhc29ucy5sZW5ndGgpIHJldHVyblxuXG4gICAgcmV0dXJuIHN0YXR1c0xpc3QocmVhc29ucywgJ3N0YXR1cy1saXN0LS1yaWdodCBwYWRkZWQgYm9yZGVyLS1ib3R0b20tLWlubmVyIGpzLWdyYWRlLXNjb3JlY2FyZC1yZWFzb25zJylcbn1cblxuZnVuY3Rpb24gZ2V0UmVhc29ucyAoc2l0ZSkge1xuICAgIGNvbnN0IHJlYXNvbnMgPSBbXVxuXG4gICAgLy8gZ3JhYiBhbGwgdGhlIGRhdGEgZnJvbSB0aGUgc2l0ZSB0byBjcmVhdGVcbiAgICAvLyBhIGxpc3Qgb2YgcmVhc29ucyBiZWhpbmQgdGhlIGdyYWRlXG5cbiAgICAvLyBlbmNyeXB0aW9uIHN0YXR1c1xuICAgIGNvbnN0IGh0dHBzU3RhdGUgPSBzaXRlLmh0dHBzU3RhdGVcbiAgICBpZiAoaHR0cHNTdGF0ZSkge1xuICAgICAgICBjb25zdCBtb2RpZmllciA9IGh0dHBzU3RhdGUgPT09ICdub25lJyA/ICdiYWQnIDogJ2dvb2QnXG5cbiAgICAgICAgcmVhc29ucy5wdXNoKHtcbiAgICAgICAgICAgIG1vZGlmaWVyLFxuICAgICAgICAgICAgbXNnOiBzaXRlLmh0dHBzU3RhdHVzVGV4dFxuICAgICAgICB9KVxuICAgIH1cblxuICAgIC8vIHRyYWNraW5nIG5ldHdvcmtzIGJsb2NrZWQgb3IgZm91bmQsXG4gICAgLy8gb25seSBzaG93IGEgbWVzc2FnZSBpZiB0aGVyZSdzIGFueVxuICAgIGNvbnN0IHRyYWNrZXJzQ291bnQgPSBzaXRlLmlzQWxsb3dsaXN0ZWQgPyBzaXRlLnRyYWNrZXJzQ291bnQgOiBzaXRlLnRyYWNrZXJzQmxvY2tlZENvdW50XG4gICAgY29uc3QgdHJhY2tlcnNCYWRPckdvb2QgPSAodHJhY2tlcnNDb3VudCAhPT0gMCkgPyAnYmFkJyA6ICdnb29kJ1xuICAgIHJlYXNvbnMucHVzaCh7XG4gICAgICAgIG1vZGlmaWVyOiB0cmFja2Vyc0JhZE9yR29vZCxcbiAgICAgICAgbXNnOiBgJHt0cmFja2VyTmV0d29ya3NUZXh0KHNpdGUpfWBcbiAgICB9KVxuXG4gICAgLy8gbWFqb3IgdHJhY2tpbmcgbmV0d29ya3MsXG4gICAgLy8gb25seSBzaG93IGEgbWVzc2FnZSBpZiB0aGVyZSBhcmUgYW55XG4gICAgY29uc3QgbWFqb3JUcmFja2Vyc0JhZE9yR29vZCA9IChzaXRlLm1ham9yVHJhY2tlck5ldHdvcmtzQ291bnQgIT09IDApID8gJ2JhZCcgOiAnZ29vZCdcbiAgICByZWFzb25zLnB1c2goe1xuICAgICAgICBtb2RpZmllcjogbWFqb3JUcmFja2Vyc0JhZE9yR29vZCxcbiAgICAgICAgbXNnOiBgJHt0cmFja2VyTmV0d29ya3NUZXh0KHNpdGUsIHRydWUpfWBcbiAgICB9KVxuXG4gICAgLy8gSXMgdGhlIHNpdGUgaXRzZWxmIGEgbWFqb3IgdHJhY2tpbmcgbmV0d29yaz9cbiAgICAvLyBvbmx5IHNob3cgYSBtZXNzYWdlIGlmIGl0IGlzXG4gICAgaWYgKHNpdGUuaXNhTWFqb3JUcmFja2luZ05ldHdvcmspIHtcbiAgICAgICAgcmVhc29ucy5wdXNoKHtcbiAgICAgICAgICAgIG1vZGlmaWVyOiAnYmFkJyxcbiAgICAgICAgICAgIG1zZzogJ1NpdGUgSXMgYSBNYWpvciBUcmFja2VyIE5ldHdvcmsnXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgLy8gcHJpdmFjeSBwcmFjdGljZXMgZnJvbSB0b3NkclxuICAgIGNvbnN0IHVua25vd25QcmFjdGljZXMgPSBjb25zdGFudHMudG9zZHJNZXNzYWdlcy51bmtub3duXG4gICAgY29uc3QgcHJpdmFjeU1lc3NhZ2UgPSAoc2l0ZS50b3NkciAmJiBzaXRlLnRvc2RyLm1lc3NhZ2UpIHx8IHVua25vd25QcmFjdGljZXNcbiAgICBjb25zdCBtb2RpZmllciA9IChwcml2YWN5TWVzc2FnZSA9PT0gdW5rbm93blByYWN0aWNlcykgPyAncG9vcicgOiBwcml2YWN5TWVzc2FnZS50b0xvd2VyQ2FzZSgpXG4gICAgcmVhc29ucy5wdXNoKHtcbiAgICAgICAgbW9kaWZpZXI6IG1vZGlmaWVyLFxuICAgICAgICBtc2c6IGAke3ByaXZhY3lNZXNzYWdlfSBQcml2YWN5IFByYWN0aWNlc2BcbiAgICB9KVxuXG4gICAgcmV0dXJuIHJlYXNvbnNcbn1cbiIsImNvbnN0IGJlbCA9IHJlcXVpcmUoJ2JlbCcpXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGtsYXNzKSB7XG4gICAga2xhc3MgPSBrbGFzcyB8fCAnJ1xuICAgIHJldHVybiBiZWxgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJoYW1idXJnZXItYnV0dG9uICR7a2xhc3N9XCIgYXJpYS1sYWJlbD1cIk1vcmUgb3B0aW9uc1wiPlxuICAgIDxzcGFuPjwvc3Bhbj5cbiAgICA8c3Bhbj48L3NwYW4+XG4gICAgPHNwYW4+PC9zcGFuPlxuPC9idXR0b24+YFxufVxuIiwiY29uc3QgYmVsID0gcmVxdWlyZSgnYmVsJylcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob3BzKSB7XG4gICAgY29uc3Qgc2xpZGluZ1N1YnZpZXdDbGFzcyA9IG9wcy5zaG93Q2xvc2UgPyAnanMtc2xpZGluZy1zdWJ2aWV3LWNsb3NlJyA6ICcnXG4gICAgcmV0dXJuIGJlbGA8ZGl2IGNsYXNzPVwiaGVybyB0ZXh0LS1jZW50ZXIgJHtzbGlkaW5nU3Vidmlld0NsYXNzfVwiPlxuICAgIDxkaXYgY2xhc3M9XCJoZXJvX19pY29uIGhlcm9fX2ljb24tLSR7b3BzLnN0YXR1c31cIj5cbiAgICA8L2Rpdj5cbiAgICA8aDEgY2xhc3M9XCJoZXJvX190aXRsZVwiPlxuICAgICAgICAke29wcy50aXRsZX1cbiAgICA8L2gxPlxuICAgIDxoMiBjbGFzcz1cImhlcm9fX3N1YnRpdGxlICR7b3BzLnN1YnRpdGxlID09PSAnJyA/ICdpcy1oaWRkZW4nIDogJyd9XCIgYXJpYS1sYWJlbD1cIiR7b3BzLnN1YnRpdGxlTGFiZWwgPyBvcHMuc3VidGl0bGVMYWJlbCA6IG9wcy5zdWJ0aXRsZX1cIj5cbiAgICAgICAgJHtvcHMuc3VidGl0bGV9XG4gICAgPC9oMj5cbiAgICAke3JlbmRlck9wZW5PckNsb3NlQnV0dG9uKG9wcy5zaG93Q2xvc2UpfVxuPC9kaXY+YFxufVxuXG5mdW5jdGlvbiByZW5kZXJPcGVuT3JDbG9zZUJ1dHRvbiAoaXNDbG9zZUJ1dHRvbikge1xuICAgIGNvbnN0IG9wZW5PckNsb3NlID0gaXNDbG9zZUJ1dHRvbiA/ICdjbG9zZScgOiAnb3BlbidcbiAgICBjb25zdCBhcnJvd0ljb25DbGFzcyA9IGlzQ2xvc2VCdXR0b24gPyAnaWNvbl9fYXJyb3ctLWxlZnQnIDogJydcbiAgICByZXR1cm4gYmVsYDxhIGhyZWY9XCJqYXZhc2NyaXB0OnZvaWQoMClcIlxuICAgICAgICBjbGFzcz1cImhlcm9fXyR7b3Blbk9yQ2xvc2V9XCJcbiAgICAgICAgcm9sZT1cImJ1dHRvblwiXG4gICAgICAgIGFyaWEtbGFiZWw9XCIke2lzQ2xvc2VCdXR0b24gPyAnR28gYmFjaycgOiAnTW9yZSBkZXRhaWxzJ31cIlxuICAgICAgICA+XG4gICAgPHNwYW4gY2xhc3M9XCJpY29uIGljb25fX2Fycm93IGljb25fX2Fycm93LS1sYXJnZSAke2Fycm93SWNvbkNsYXNzfVwiPlxuICAgIDwvc3Bhbj5cbjwvYT5gXG59XG4iLCIvKiBHZW5lcmF0ZXMgYSBsaW5rIHRhZ1xuICogdXJsOiBocmVmIHVybFxuICogb3B0aW9uczogYW55IGEgdGFnIGF0dHJpYnV0ZVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh1cmwsIG9wdGlvbnMpIHtcbiAgICBjb25zdCBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpXG4gICAgYS5ocmVmID0gdXJsXG5cbiAgICAvLyBhdHRyaWJ1dGVzIGZvciB0aGUgPGE+IHRhZywgZS5nLiBcImFyaWEtbGFiZWxcIlxuICAgIGlmIChvcHRpb25zLmF0dHJpYnV0ZXMpIHtcbiAgICAgICAgZm9yIChjb25zdCBhdHRyIGluIG9wdGlvbnMuYXR0cmlidXRlcykge1xuICAgICAgICAgICAgYS5zZXRBdHRyaWJ1dGUoYXR0ciwgb3B0aW9ucy5hdHRyaWJ1dGVzW2F0dHJdKVxuICAgICAgICB9XG5cbiAgICAgICAgZGVsZXRlIG9wdGlvbnMuYXR0cmlidXRlc1xuICAgIH1cblxuICAgIGZvciAoY29uc3Qga2V5IGluIG9wdGlvbnMpIHtcbiAgICAgICAgYVtrZXldID0gb3B0aW9uc1trZXldXG4gICAgfVxuXG4gICAgcmV0dXJuIGFcbn1cbiIsImNvbnN0IGJlbCA9IHJlcXVpcmUoJ2JlbCcpXG5jb25zdCBoZXJvID0gcmVxdWlyZSgnLi9oZXJvLmVzNi5qcycpXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHNpdGUsIG9wcykge1xuICAgIGNvbnN0IHN0YXR1cyA9IHNpdGVSYXRpbmdTdGF0dXMoXG4gICAgICAgIHNpdGUuaXNDYWxjdWxhdGluZ1NpdGVSYXRpbmcsXG4gICAgICAgIHNpdGUuc2l0ZVJhdGluZyxcbiAgICAgICAgc2l0ZS5pc0FsbG93bGlzdGVkXG4gICAgKVxuICAgIGNvbnN0IHN1YnRpdGxlID0gc2l0ZVJhdGluZ1N1YnRpdGxlKFxuICAgICAgICBzaXRlLmlzQ2FsY3VsYXRpbmdTaXRlUmF0aW5nLFxuICAgICAgICBzaXRlLnNpdGVSYXRpbmcsXG4gICAgICAgIHNpdGUuaXNBbGxvd2xpc3RlZCxcbiAgICAgICAgc2l0ZS5pc0Jyb2tlblxuICAgIClcbiAgICBjb25zdCBsYWJlbCA9IHN1YnRpdGxlTGFiZWwoXG4gICAgICAgIHNpdGUuaXNDYWxjdWxhdGluZ1NpdGVSYXRpbmcsXG4gICAgICAgIHNpdGUuc2l0ZVJhdGluZyxcbiAgICAgICAgc2l0ZS5pc0FsbG93bGlzdGVkXG4gICAgKVxuXG4gICAgcmV0dXJuIGJlbGA8ZGl2IGNsYXNzPVwicmF0aW5nLWhlcm8tY29udGFpbmVyIGpzLXJhdGluZy1oZXJvXCI+XG4gICAgICR7aGVybyh7XG4gICAgICAgIHN0YXR1czogc3RhdHVzLFxuICAgICAgICB0aXRsZTogc2l0ZS5kb21haW4sXG4gICAgICAgIHN1YnRpdGxlOiBzdWJ0aXRsZSxcbiAgICAgICAgc3VidGl0bGVMYWJlbDogbGFiZWwsXG4gICAgICAgIHNob3dDbG9zZTogb3BzLnNob3dDbG9zZSxcbiAgICAgICAgc2hvd09wZW46IG9wcy5zaG93T3BlblxuICAgIH0pfVxuPC9kaXY+YFxufVxuXG5mdW5jdGlvbiBzaXRlUmF0aW5nU3RhdHVzIChpc0NhbGN1bGF0aW5nLCByYXRpbmcsIGlzQWxsb3dsaXN0ZWQpIHtcbiAgICBsZXQgc3RhdHVzXG4gICAgbGV0IGlzQWN0aXZlID0gJydcblxuICAgIGlmIChpc0NhbGN1bGF0aW5nKSB7XG4gICAgICAgIHN0YXR1cyA9ICdjYWxjdWxhdGluZydcbiAgICB9IGVsc2UgaWYgKHJhdGluZyAmJiByYXRpbmcuYmVmb3JlKSB7XG4gICAgICAgIGlzQWN0aXZlID0gaXNBbGxvd2xpc3RlZCA/ICcnIDogJy0tYWN0aXZlJ1xuXG4gICAgICAgIGlmIChpc0FjdGl2ZSAmJiByYXRpbmcuYWZ0ZXIpIHtcbiAgICAgICAgICAgIHN0YXR1cyA9IHJhdGluZy5jc3NBZnRlclxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3RhdHVzID0gcmF0aW5nLmNzc0JlZm9yZVxuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgc3RhdHVzID0gJ251bGwnXG4gICAgfVxuXG4gICAgcmV0dXJuIHN0YXR1cyArIGlzQWN0aXZlXG59XG5cbmZ1bmN0aW9uIHNpdGVSYXRpbmdTdWJ0aXRsZSAoaXNDYWxjdWxhdGluZywgcmF0aW5nLCBpc0FsbG93bGlzdGVkLCBpc0Jyb2tlbikge1xuICAgIGxldCBpc0FjdGl2ZSA9IHRydWVcbiAgICBpZiAoaXNCcm9rZW4pIHtcbiAgICAgICAgcmV0dXJuICcnXG4gICAgfVxuICAgIGlmIChpc0FsbG93bGlzdGVkKSBpc0FjdGl2ZSA9IGZhbHNlXG4gICAgLy8gc2l0ZSBncmFkZS9yYXRpbmcgd2FzIHVwZ3JhZGVkIGJ5IGV4dGVuc2lvblxuICAgIGlmIChpc0FjdGl2ZSAmJiByYXRpbmcgJiYgcmF0aW5nLmJlZm9yZSAmJiByYXRpbmcuYWZ0ZXIpIHtcbiAgICAgICAgaWYgKHJhdGluZy5iZWZvcmUgIT09IHJhdGluZy5hZnRlcikge1xuICAgICAgICAgICAgLy8gd3JhcCB0aGlzIGluIGEgc2luZ2xlIHJvb3Qgc3BhbiBvdGhlcndpc2UgYmVsIGNvbXBsYWluc1xuICAgICAgICAgICAgcmV0dXJuIGJlbGA8c3Bhbj5TaXRlIGVuaGFuY2VkIGZyb21cbiAgICA8c3BhbiBjbGFzcz1cInJhdGluZy1sZXR0ZXIgcmF0aW5nLWxldHRlci0tJHtyYXRpbmcuY3NzQmVmb3JlfVwiPlxuICAgIDwvc3Bhbj5cbjwvc3Bhbj5gXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBkZWFsIHdpdGggb3RoZXIgc3RhdGVzXG4gICAgbGV0IG1zZyA9ICdQcml2YWN5IEdyYWRlJ1xuICAgIC8vIHNpdGUgaXMgd2hpdGVsaXN0ZWRcbiAgICBpZiAoIWlzQWN0aXZlKSB7XG4gICAgICAgIG1zZyA9ICdQcml2YWN5IFByb3RlY3Rpb24gRGlzYWJsZWQnXG4gICAgICAgIC8vIFwibnVsbFwiIHN0YXRlIChlbXB0eSB0YWIsIGJyb3dzZXIncyBcImFib3V0OlwiIHBhZ2VzKVxuICAgIH0gZWxzZSBpZiAoIWlzQ2FsY3VsYXRpbmcgJiYgIXJhdGluZy5iZWZvcmUgJiYgIXJhdGluZy5hZnRlcikge1xuICAgICAgICBtc2cgPSAnV2Ugb25seSBncmFkZSByZWd1bGFyIHdlYnNpdGVzJ1xuICAgICAgICAvLyByYXRpbmcgaXMgc3RpbGwgY2FsY3VsYXRpbmdcbiAgICB9IGVsc2UgaWYgKGlzQ2FsY3VsYXRpbmcpIHtcbiAgICAgICAgbXNnID0gJ0NhbGN1bGF0aW5nLi4uJ1xuICAgIH1cblxuICAgIHJldHVybiBiZWxgJHttc2d9YFxufVxuXG4vLyB0byBhdm9pZCBkdXBsaWNhdGluZyBtZXNzYWdlcyBiZXR3ZWVuIHRoZSBpY29uIGFuZCB0aGUgc3VidGl0bGUsXG4vLyB3ZSBjb21iaW5lIGluZm9ybWF0aW9uIGZvciBib3RoIGhlcmVcbmZ1bmN0aW9uIHN1YnRpdGxlTGFiZWwgKGlzQ2FsY3VsYXRpbmcsIHJhdGluZywgaXNBbGxvd2xpc3RlZCkge1xuICAgIGlmIChpc0NhbGN1bGF0aW5nKSByZXR1cm5cblxuICAgIGlmIChpc0FsbG93bGlzdGVkICYmIHJhdGluZy5iZWZvcmUpIHtcbiAgICAgICAgcmV0dXJuIGBQcml2YWN5IFByb3RlY3Rpb24gRGlzYWJsZWQsIFByaXZhY3kgR3JhZGUgJHtyYXRpbmcuYmVmb3JlfWBcbiAgICB9XG5cbiAgICBpZiAocmF0aW5nLmJlZm9yZSAmJiByYXRpbmcuYmVmb3JlID09PSByYXRpbmcuYWZ0ZXIpIHtcbiAgICAgICAgcmV0dXJuIGBQcml2YWN5IEdyYWRlICR7cmF0aW5nLmJlZm9yZX1gXG4gICAgfVxuXG4gICAgaWYgKHJhdGluZy5iZWZvcmUgJiYgcmF0aW5nLmFmdGVyKSB7XG4gICAgICAgIHJldHVybiBgU2l0ZSBlbmhhbmNlZCBmcm9tICR7cmF0aW5nLmJlZm9yZX1gXG4gICAgfVxufVxuIiwiY29uc3QgYmVsID0gcmVxdWlyZSgnYmVsJylcbmNvbnN0IGhhbWJ1cmdlckJ1dHRvbiA9IHJlcXVpcmUoJy4vaGFtYnVyZ2VyLWJ1dHRvbi5lczYuanMnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh0aXRsZSkge1xuICAgIHJldHVybiBiZWxgPG5hdiBjbGFzcz1cInNsaWRpbmctc3Vidmlld19faGVhZGVyIGNhcmRcIj5cbiAgICA8YSBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApXCIgY2xhc3M9XCJzbGlkaW5nLXN1YnZpZXdfX2hlYWRlcl9fYmFja1xuICAgICAgICBzbGlkaW5nLXN1YnZpZXdfX2hlYWRlcl9fYmFjay0taXMtaWNvblxuICAgICAgICBqcy1zbGlkaW5nLXN1YnZpZXctY2xvc2VcIj5cbiAgICAgICAgPHNwYW4gY2xhc3M9XCJpY29uIGljb25fX2Fycm93IGljb25fX2Fycm93LS1sZWZ0IHB1bGwtbGVmdFwiPlxuICAgICAgICA8L3NwYW4+XG4gICAgPC9hPlxuICAgIDxoMiBjbGFzcz1cInNsaWRpbmctc3Vidmlld19faGVhZGVyX190aXRsZVwiPlxuICAgICAgICAke3RpdGxlfVxuICAgIDwvaDI+XG4gICAgJHtoYW1idXJnZXJCdXR0b24oKX1cbjwvbmF2PmBcbn1cbiIsImNvbnN0IGJlbCA9IHJlcXVpcmUoJ2JlbCcpXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGl0ZW1zLCBleHRyYUNsYXNzZXMpIHtcbiAgICBleHRyYUNsYXNzZXMgPSBleHRyYUNsYXNzZXMgfHwgJydcblxuICAgIHJldHVybiBiZWxgPHVsIGNsYXNzPVwic3RhdHVzLWxpc3QgJHtleHRyYUNsYXNzZXN9XCI+XG4gICAgJHtpdGVtcy5tYXAocmVuZGVySXRlbSl9XG48L3VsPmBcbn1cblxuZnVuY3Rpb24gcmVuZGVySXRlbSAoaXRlbSkge1xuICAgIHJldHVybiBiZWxgPGxpIGNsYXNzPVwic3RhdHVzLWxpc3RfX2l0ZW0gc3RhdHVzLWxpc3RfX2l0ZW0tLSR7aXRlbS5tb2RpZmllcn1cbiAgICBib2xkICR7aXRlbS5oaWdobGlnaHQgPyAnaXMtaGlnaGxpZ2h0ZWQnIDogJyd9XCI+XG4gICAgJHtpdGVtLm1zZ31cbjwvbGk+YFxufVxuIiwiY29uc3QgYmVsID0gcmVxdWlyZSgnYmVsJylcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoaXNBY3RpdmVCb29sZWFuLCBrbGFzcywgZGF0YUtleSkge1xuICAgIC8vIG1ha2UgYGtsYXNzYCBhbmQgYGRhdGFLZXlgIG9wdGlvbmFsOlxuICAgIGtsYXNzID0ga2xhc3MgfHwgJydcbiAgICBkYXRhS2V5ID0gZGF0YUtleSB8fCAnJ1xuXG4gICAgcmV0dXJuIGJlbGBcbjxidXR0b24gY2xhc3M9XCJ0b2dnbGUtYnV0dG9uIHRvZ2dsZS1idXR0b24tLWlzLWFjdGl2ZS0ke2lzQWN0aXZlQm9vbGVhbn0gJHtrbGFzc31cIlxuICAgIGRhdGEta2V5PVwiJHtkYXRhS2V5fVwiXG4gICAgdHlwZT1cImJ1dHRvblwiXG4gICAgYXJpYS1wcmVzc2VkPVwiJHtpc0FjdGl2ZUJvb2xlYW4gPyAndHJ1ZScgOiAnZmFsc2UnfVwiXG4gICAgPlxuICAgIDxkaXYgY2xhc3M9XCJ0b2dnbGUtYnV0dG9uX19iZ1wiPlxuICAgIDwvZGl2PlxuICAgIDxkaXYgY2xhc3M9XCJ0b2dnbGUtYnV0dG9uX19rbm9iXCI+PC9kaXY+XG48L2J1dHRvbj5gXG59XG4iLCJjb25zdCBiZWwgPSByZXF1aXJlKCdiZWwnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gYmVsYDxkaXYgY2xhc3M9XCJ0b3AtYmxvY2tlZF9fbm8tZGF0YVwiPlxuICAgIDxkaXYgY2xhc3M9XCJ0b3AtYmxvY2tlZF9fbm8tZGF0YV9fZ3JhcGhcIj5cbiAgICAgICAgPHNwYW4gY2xhc3M9XCJ0b3AtYmxvY2tlZF9fbm8tZGF0YV9fZ3JhcGhfX2JhciBvbmVcIj48L3NwYW4+XG4gICAgICAgIDxzcGFuIGNsYXNzPVwidG9wLWJsb2NrZWRfX25vLWRhdGFfX2dyYXBoX19iYXIgdHdvXCI+PC9zcGFuPlxuICAgICAgICA8c3BhbiBjbGFzcz1cInRvcC1ibG9ja2VkX19uby1kYXRhX19ncmFwaF9fYmFyIHRocmVlXCI+PC9zcGFuPlxuICAgICAgICA8c3BhbiBjbGFzcz1cInRvcC1ibG9ja2VkX19uby1kYXRhX19ncmFwaF9fYmFyIGZvdXJcIj48L3NwYW4+XG4gICAgPC9kaXY+XG4gICAgPHAgY2xhc3M9XCJ0b3AtYmxvY2tlZF9fbm8tZGF0YV9fbGVhZCB0ZXh0LWNlbnRlclwiPlRyYWNrZXIgTmV0d29ya3MgVG9wIE9mZmVuZGVyczwvcD5cbiAgICA8cD5ObyBkYXRhIGF2YWlsYWJsZSB5ZXQ8L3A+XG48L2Rpdj5gXG59XG4iLCJjb25zdCBiZWwgPSByZXF1aXJlKCdiZWwnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzaXRlUmF0aW5nLCBpc0FsbG93bGlzdGVkLCB0b3RhbFRyYWNrZXJOZXR3b3Jrc0NvdW50KSB7XG4gICAgbGV0IGljb25OYW1lTW9kaWZpZXIgPSAnYmxvY2tlZCdcblxuICAgIGlmIChpc0FsbG93bGlzdGVkICYmIChzaXRlUmF0aW5nLmJlZm9yZSA9PT0gJ0QnKSAmJiAodG90YWxUcmFja2VyTmV0d29ya3NDb3VudCAhPT0gMCkpIHtcbiAgICAgICAgaWNvbk5hbWVNb2RpZmllciA9ICd3YXJuaW5nJ1xuICAgIH1cblxuICAgIGNvbnN0IGljb25OYW1lID0gJ21ham9yLW5ldHdvcmtzLScgKyBpY29uTmFtZU1vZGlmaWVyXG5cbiAgICByZXR1cm4gYmVsYCR7aWNvbk5hbWV9YFxufVxuIiwiY29uc3QgYmVsID0gcmVxdWlyZSgnYmVsJylcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc2l0ZSwgaXNNYWpvck5ldHdvcmtzQ291bnQpIHtcbiAgICAvLyBTaG93IGFsbCB0cmFja2VycyBmb3VuZCBpZiBzaXRlIGlzIHdoaXRlbGlzdGVkXG4gICAgLy8gYnV0IG9ubHkgc2hvdyB0aGUgYmxvY2tlZCBvbmVzIG90aGVyd2lzZVxuICAgIGxldCB0cmFja2Vyc0NvdW50ID0gc2l0ZS5pc0FsbG93bGlzdGVkID8gc2l0ZS50cmFja2Vyc0NvdW50IDogc2l0ZS50cmFja2Vyc0Jsb2NrZWRDb3VudCB8fCAwXG4gICAgbGV0IHVuaXF1ZVRyYWNrZXJzVGV4dCA9IHRyYWNrZXJzQ291bnQgPT09IDEgPyAnIFRyYWNrZXIgJyA6ICcgVHJhY2tlcnMgJ1xuXG4gICAgaWYgKGlzTWFqb3JOZXR3b3Jrc0NvdW50KSB7XG4gICAgICAgIHRyYWNrZXJzQ291bnQgPSBzaXRlLm1ham9yVHJhY2tlck5ldHdvcmtzQ291bnRcbiAgICAgICAgdW5pcXVlVHJhY2tlcnNUZXh0ID0gdHJhY2tlcnNDb3VudCA9PT0gMSA/ICcgTWFqb3IgVHJhY2tlciBOZXR3b3JrICcgOiAnIE1ham9yIFRyYWNrZXIgTmV0d29ya3MgJ1xuICAgIH1cbiAgICBjb25zdCBmaW5hbFRleHQgPSB0cmFja2Vyc0NvdW50ICsgdW5pcXVlVHJhY2tlcnNUZXh0ICsgdHJhY2tlcnNCbG9ja2VkT3JGb3VuZChzaXRlLCB0cmFja2Vyc0NvdW50KVxuXG4gICAgcmV0dXJuIGJlbGAke2ZpbmFsVGV4dH1gXG59XG5cbmZ1bmN0aW9uIHRyYWNrZXJzQmxvY2tlZE9yRm91bmQgKHNpdGUsIHRyYWNrZXJzQ291bnQpIHtcbiAgICBsZXQgbXNnID0gJydcbiAgICBpZiAoc2l0ZSAmJiAoc2l0ZS5pc0FsbG93bGlzdGVkIHx8IHRyYWNrZXJzQ291bnQgPT09IDApKSB7XG4gICAgICAgIG1zZyA9ICdGb3VuZCdcbiAgICB9IGVsc2Uge1xuICAgICAgICBtc2cgPSAnQmxvY2tlZCdcbiAgICB9XG5cbiAgICByZXR1cm4gYmVsYCR7bXNnfWBcbn1cbiIsImNvbnN0IGJlbCA9IHJlcXVpcmUoJ2JlbCcpXG5jb25zdCB0b2dnbGVCdXR0b24gPSByZXF1aXJlKCcuL3NoYXJlZC90b2dnbGUtYnV0dG9uLmVzNi5qcycpXG5jb25zdCByYXRpbmdIZXJvID0gcmVxdWlyZSgnLi9zaGFyZWQvcmF0aW5nLWhlcm8uZXM2LmpzJylcbmNvbnN0IHRyYWNrZXJOZXR3b3Jrc0ljb24gPSByZXF1aXJlKCcuL3NoYXJlZC90cmFja2VyLW5ldHdvcmstaWNvbi5lczYuanMnKVxuY29uc3QgdHJhY2tlck5ldHdvcmtzVGV4dCA9IHJlcXVpcmUoJy4vc2hhcmVkL3RyYWNrZXItbmV0d29ya3MtdGV4dC5lczYuanMnKVxuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi4vLi4vLi4vZGF0YS9jb25zdGFudHMnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcbiAgICBjb25zdCB0b3Nkck1zZyA9ICh0aGlzLm1vZGVsLnRvc2RyICYmIHRoaXMubW9kZWwudG9zZHIubWVzc2FnZSkgfHxcbiAgICAgICAgY29uc3RhbnRzLnRvc2RyTWVzc2FnZXMudW5rbm93blxuXG4gICAgcmV0dXJuIGJlbGA8ZGl2IGNsYXNzPVwic2l0ZS1pbmZvIHNpdGUtaW5mby0tbWFpblwiPlxuICAgIDx1bCBjbGFzcz1cImRlZmF1bHQtbGlzdFwiPlxuICAgICAgICA8bGkgY2xhc3M9XCJib3JkZXItLWJvdHRvbSBzaXRlLWluZm9fX3JhdGluZy1saSBtYWluLXJhdGluZyBqcy1oZXJvLW9wZW5cIj5cbiAgICAgICAgICAgICR7cmF0aW5nSGVybyh0aGlzLm1vZGVsLCB7XG4gICAgICAgIHNob3dPcGVuOiAhdGhpcy5tb2RlbC5kaXNhYmxlZFxuICAgIH0pfVxuICAgICAgICA8L2xpPlxuICAgICAgICA8bGkgY2xhc3M9XCJ0ZXh0LS1jZW50ZXIgcGFkZGVkIGJvcmRlci0tYm90dG9tIHdhcm5pbmdfYmcgYm9sZCAke3RoaXMubW9kZWwuaXNCcm9rZW4gPyAnJyA6ICdpcy1oaWRkZW4nfVwiPlxuICAgICAgICAgICAgV2UgdGVtcG9yYXJpbHkgZGlzYWJsZWQgUHJpdmFjeSBQcm90ZWN0aW9uIGFzIGl0IGFwcGVhcnMgdG8gYmUgYnJlYWtpbmcgdGhpcyBzaXRlLlxuICAgICAgICA8L2xpPlxuICAgICAgICA8bGkgY2xhc3M9XCJzaXRlLWluZm9fX2xpLS1odHRwcy1zdGF0dXMgcGFkZGVkIGJvcmRlci0tYm90dG9tXCI+XG4gICAgICAgICAgICA8cCBjbGFzcz1cInNpdGUtaW5mb19faHR0cHMtc3RhdHVzIGJvbGRcIj5cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cInNpdGUtaW5mb19faHR0cHMtc3RhdHVzX19pY29uXG4gICAgICAgICAgICAgICAgICAgIGlzLSR7dGhpcy5tb2RlbC5odHRwc1N0YXRlfVwiPlxuICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cInRleHQtbGluZS1hZnRlci1pY29uXCI+XG4gICAgICAgICAgICAgICAgICAgICR7dGhpcy5tb2RlbC5odHRwc1N0YXR1c1RleHR9XG4gICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgPC9wPlxuICAgICAgICA8L2xpPlxuICAgICAgICA8bGkgY2xhc3M9XCJqcy1zaXRlLXRyYWNrZXItbmV0d29ya3MganMtc2l0ZS1zaG93LXBhZ2UtdHJhY2tlcnMgc2l0ZS1pbmZvX19saS0tdHJhY2tlcnMgcGFkZGVkIGJvcmRlci0tYm90dG9tXCI+XG4gICAgICAgICAgICA8YSBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApXCIgY2xhc3M9XCJsaW5rLXNlY29uZGFyeSBib2xkXCIgcm9sZT1cImJ1dHRvblwiPlxuICAgICAgICAgICAgICAgICR7cmVuZGVyVHJhY2tlck5ldHdvcmtzKHRoaXMubW9kZWwpfVxuICAgICAgICAgICAgPC9hPlxuICAgICAgICA8L2xpPlxuICAgICAgICA8bGkgY2xhc3M9XCJqcy1zaXRlLXByaXZhY3ktcHJhY3RpY2VzIHNpdGUtaW5mb19fbGktLXByaXZhY3ktcHJhY3RpY2VzIHBhZGRlZCBib3JkZXItLWJvdHRvbVwiPlxuICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJzaXRlLWluZm9fX3ByaXZhY3ktcHJhY3RpY2VzX19pY29uXG4gICAgICAgICAgICAgICAgaXMtJHt0b3Nkck1zZy50b0xvd2VyQ2FzZSgpfVwiPlxuICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgPGEgaHJlZj1cImphdmFzY3JpcHQ6dm9pZCgwKVwiIGNsYXNzPVwibGluay1zZWNvbmRhcnkgYm9sZFwiIHJvbGU9XCJidXR0b25cIj5cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cInRleHQtbGluZS1hZnRlci1pY29uXCI+ICR7dG9zZHJNc2d9IFByaXZhY3kgUHJhY3RpY2VzIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImljb24gaWNvbl9fYXJyb3cgcHVsbC1yaWdodFwiPjwvc3Bhbj5cbiAgICAgICAgICAgIDwvYT5cbiAgICAgICAgPC9saT5cbiAgICAgICAgPGxpIGNsYXNzPVwic2l0ZS1pbmZvX19saS0tdG9nZ2xlIGpzLXNpdGUtcHJvdGVjdGlvbi1yb3cgcGFkZGVkICR7dGhpcy5tb2RlbC5pc0FsbG93bGlzdGVkID8gJycgOiAnaXMtYWN0aXZlJ30gJHt0aGlzLm1vZGVsLmlzQnJva2VuID8gJ2lzLWRpc2FibGVkJyA6ICcnfVwiPlxuICAgICAgICAgICAgPHAgY2xhc3M9XCJpcy10cmFuc3BhcmVudCBzaXRlLWluZm9fX3doaXRlbGlzdC1zdGF0dXMganMtc2l0ZS13aGl0ZWxpc3Qtc3RhdHVzXCI+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJ0ZXh0LWxpbmUtYWZ0ZXItaWNvbiBwcml2YWN5LW9uLW9mZi1tZXNzYWdlIGJvbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgJHtzZXRUcmFuc2l0aW9uVGV4dCghdGhpcy5tb2RlbC5pc1doaXRlbGlzdGVkKX1cbiAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICA8cCBjbGFzcz1cInNpdGUtaW5mb19fcHJvdGVjdGlvbiBqcy1zaXRlLXByb3RlY3Rpb24gYm9sZFwiPlNpdGUgUHJpdmFjeSBQcm90ZWN0aW9uPC9wPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInNpdGUtaW5mb19fdG9nZ2xlLWNvbnRhaW5lclwiPlxuICAgICAgICAgICAgICAgICR7dG9nZ2xlQnV0dG9uKCF0aGlzLm1vZGVsLmlzQWxsb3dsaXN0ZWQsICdqcy1zaXRlLXRvZ2dsZSBwdWxsLXJpZ2h0Jyl9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9saT5cbiAgICAgICAgPGxpIGNsYXNzPVwianMtc2l0ZS1tYW5hZ2Utd2hpdGVsaXN0LWxpIHNpdGUtaW5mb19fbGktLW1hbmFnZS13aGl0ZWxpc3QgcGFkZGVkICR7dGhpcy5tb2RlbC5pc0Jyb2tlbiA/ICdpcy1oaWRkZW4nIDogJyd9XCI+XG4gICAgICAgICAgICAke3JlbmRlck1hbmFnZUFsbG93bGlzdCh0aGlzLm1vZGVsKX1cbiAgICAgICAgPC9saT5cbiAgICAgICAgPGxpIGNsYXNzPVwianMtc2l0ZS1jb25maXJtLWJyZWFrYWdlLWxpIHNpdGUtaW5mb19fbGktLWNvbmZpcm0tYnJlYWthZ2UgYm9yZGVyLS1ib3R0b20gcGFkZGVkIGlzLWhpZGRlblwiPlxuICAgICAgICAgICA8ZGl2IGNsYXNzPVwianMtc2l0ZS1jb25maXJtLWJyZWFrYWdlLW1lc3NhZ2Ugc2l0ZS1pbmZvX19jb25maXJtLXRoYW5rcyBpcy10cmFuc3BhcmVudFwiPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwic2l0ZS1pbmZvX19tZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgICAgIFRoYW5rcyBmb3IgdGhlIGZlZWRiYWNrIVxuICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImpzLXNpdGUtY29uZmlybS1icmVha2FnZSBzaXRlLWluZm8tLWNvbmZpcm0tYnJlYWthZ2VcIj5cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cInNpdGUtaW5mby0taXMtc2l0ZS1icm9rZW4gYm9sZFwiPlxuICAgICAgICAgICAgICAgICAgICBJcyB0aGlzIHdlYnNpdGUgYnJva2VuP1xuICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8YnRuIGNsYXNzPVwianMtc2l0ZS1jb25maXJtLWJyZWFrYWdlLXllcyBzaXRlLWluZm9fX2NvbmZpcm0tYnJlYWthZ2UteWVzIGJ0bi1waWxsXCI+XG4gICAgICAgICAgICAgICAgICAgIFllc1xuICAgICAgICAgICAgICAgIDwvYnRuPlxuICAgICAgICAgICAgICAgIDxidG4gY2xhc3M9XCJqcy1zaXRlLWNvbmZpcm0tYnJlYWthZ2Utbm8gc2l0ZS1pbmZvX19jb25maXJtLWJyZWFrYWdlLW5vIGJ0bi1waWxsXCI+XG4gICAgICAgICAgICAgICAgICAgIE5vXG4gICAgICAgICAgICAgICAgPC9idG4+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9saT5cbiAgICA8L3VsPlxuPC9kaXY+YFxuXG4gICAgZnVuY3Rpb24gc2V0VHJhbnNpdGlvblRleHQgKGlzU2l0ZUFsbG93bGlzdGVkKSB7XG4gICAgICAgIGlzU2l0ZUFsbG93bGlzdGVkID0gaXNTaXRlQWxsb3dsaXN0ZWQgfHwgZmFsc2VcbiAgICAgICAgbGV0IHRleHQgPSAnQWRkZWQgdG8gVW5wcm90ZWN0ZWQgU2l0ZXMnXG5cbiAgICAgICAgaWYgKGlzU2l0ZUFsbG93bGlzdGVkKSB7XG4gICAgICAgICAgICB0ZXh0ID0gJ1JlbW92ZWQgZnJvbSBVbnByb3RlY3RlZCBTaXRlcydcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0ZXh0XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVuZGVyVHJhY2tlck5ldHdvcmtzIChtb2RlbCkge1xuICAgICAgICBjb25zdCBpc0FjdGl2ZSA9ICFtb2RlbC5pc0FsbG93bGlzdGVkID8gJ2lzLWFjdGl2ZScgOiAnJ1xuXG4gICAgICAgIHJldHVybiBiZWxgPGEgaHJlZj1cImphdmFzY3JpcHQ6dm9pZCgwKVwiIGNsYXNzPVwic2l0ZS1pbmZvX190cmFja2VycyBsaW5rLXNlY29uZGFyeSBib2xkXCI+XG4gICAgPHNwYW4gY2xhc3M9XCJzaXRlLWluZm9fX3RyYWNrZXJzLXN0YXR1c19faWNvblxuICAgICAgICBpY29uLSR7dHJhY2tlck5ldHdvcmtzSWNvbihtb2RlbC5zaXRlUmF0aW5nLCBtb2RlbC5pc0FsbG93bGlzdGVkLCBtb2RlbC50b3RhbFRyYWNrZXJOZXR3b3Jrc0NvdW50KX1cIj48L3NwYW4+XG4gICAgPHNwYW4gY2xhc3M9XCIke2lzQWN0aXZlfSB0ZXh0LWxpbmUtYWZ0ZXItaWNvblwiPiAke3RyYWNrZXJOZXR3b3Jrc1RleHQobW9kZWwsIGZhbHNlKX0gPC9zcGFuPlxuICAgIDxzcGFuIGNsYXNzPVwiaWNvbiBpY29uX19hcnJvdyBwdWxsLXJpZ2h0XCI+PC9zcGFuPlxuPC9hPmBcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZW5kZXJNYW5hZ2VBbGxvd2xpc3QgKG1vZGVsKSB7XG4gICAgICAgIHJldHVybiBiZWxgPGRpdj5cbiAgICA8YSBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApXCIgY2xhc3M9XCJqcy1zaXRlLW1hbmFnZS13aGl0ZWxpc3Qgc2l0ZS1pbmZvX19tYW5hZ2Utd2hpdGVsaXN0IGxpbmstc2Vjb25kYXJ5IGJvbGRcIj5cbiAgICAgICAgVW5wcm90ZWN0ZWQgU2l0ZXNcbiAgICA8L2E+XG4gICAgPGRpdiBjbGFzcz1cInNlcGFyYXRvclwiPjwvZGl2PlxuICAgIDxhIGhyZWY9XCJqYXZhc2NyaXB0OnZvaWQoMClcIiBjbGFzcz1cImpzLXNpdGUtcmVwb3J0LWJyb2tlbiBzaXRlLWluZm9fX3JlcG9ydC1icm9rZW4gbGluay1zZWNvbmRhcnkgYm9sZFwiPlxuICAgICAgICBSZXBvcnQgYnJva2VuIHNpdGVcbiAgICA8L2E+XG48L2Rpdj5gXG4gICAgfVxufVxuIiwiY29uc3QgYmVsID0gcmVxdWlyZSgnYmVsJylcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoY29tcGFueUxpc3RNYXApIHtcbiAgICByZXR1cm4gY29tcGFueUxpc3RNYXAubWFwKChkYXRhKSA9PiB7XG4gICAgICAgIHJldHVybiBiZWxgPGxpIGNsYXNzPVwidG9wLWJsb2NrZWRfX2xpXCI+XG4gICAgPGRpdiB0aXRsZT1cIiR7ZGF0YS5uYW1lfVwiIGNsYXNzPVwidG9wLWJsb2NrZWRfX2xpX19jb21wYW55LW5hbWVcIj4ke2RhdGEuZGlzcGxheU5hbWV9PC9kaXY+XG4gICAgPGRpdiBjbGFzcz1cInRvcC1ibG9ja2VkX19saV9fYmxvY2tlci1iYXJcIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cInRvcC1ibG9ja2VkX19saV9fYmxvY2tlci1iYXJfX2ZnXG4gICAgICAgICAgICBqcy10b3AtYmxvY2tlZC1ncmFwaC1iYXItZmdcIlxuICAgICAgICAgICAgc3R5bGU9XCJ3aWR0aDogMHB4XCIgZGF0YS13aWR0aD1cIiR7ZGF0YS5wZXJjZW50fVwiPlxuICAgICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgICA8ZGl2IGNsYXNzPVwidG9wLWJsb2NrZWRfX2xpX19ibG9ja2VyLXBjdCBqcy10b3AtYmxvY2tlZC1wY3RcIj5cbiAgICAgICAgJHtkYXRhLnBlcmNlbnR9JVxuICAgIDwvZGl2PlxuPC9saT5gXG4gICAgfSlcbn1cbiIsImNvbnN0IGJlbCA9IHJlcXVpcmUoJ2JlbCcpXG5jb25zdCBjb25zdGFudHMgPSByZXF1aXJlKCcuLi8uLi8uLi9kYXRhL2NvbnN0YW50cycpXG5jb25zdCBlbnRpdHlJY29uTWFwcGluZyA9IGNvbnN0YW50cy5lbnRpdHlJY29uTWFwcGluZ1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjb21wYW55TGlzdE1hcCkge1xuICAgIHJldHVybiBjb21wYW55TGlzdE1hcC5tYXAoKGRhdGEpID0+IHtcbiAgICAgICAgcmV0dXJuIGJlbGA8c3BhbiBjbGFzcz1cInRvcC1ibG9ja2VkX19waWxsLXNpdGVfX2ljb24gJHtnZXRTY3NzQ2xhc3MoZGF0YS5uYW1lKX1cIj48L3NwYW4+YFxuICAgIH0pXG5cbiAgICBmdW5jdGlvbiBnZXRTY3NzQ2xhc3MgKGNvbXBhbnlOYW1lKSB7XG4gICAgICAgIGNvbnN0IGljb25DbGFzc05hbWUgPSBlbnRpdHlJY29uTWFwcGluZ1tjb21wYW55TmFtZV0gfHwgJ2dlbmVyaWMnXG4gICAgICAgIHJldHVybiBpY29uQ2xhc3NOYW1lXG4gICAgfVxufVxuIiwiY29uc3QgYmVsID0gcmVxdWlyZSgnYmVsJylcbmNvbnN0IGxpc3RJdGVtcyA9IHJlcXVpcmUoJy4vdG9wLWJsb2NrZWQtdHJ1bmNhdGVkLWxpc3QtaXRlbXMuZXM2LmpzJylcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMubW9kZWwuY29tcGFueUxpc3RNYXAgJiYgdGhpcy5tb2RlbC5jb21wYW55TGlzdE1hcC5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldHVybiBiZWxgPGRpdiBjbGFzcz1cInRvcC1ibG9ja2VkIHRvcC1ibG9ja2VkLS10cnVuY2F0ZWRcIj5cbiAgICA8ZGl2IGNsYXNzPVwidG9wLWJsb2NrZWRfX3NlZS1hbGwganMtdG9wLWJsb2NrZWQtc2VlLWFsbFwiPlxuICAgICAgICA8YSBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApXCIgY2xhc3M9XCJsaW5rLXNlY29uZGFyeVwiPlxuICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJpY29uIGljb25fX2Fycm93IHB1bGwtcmlnaHRcIj48L3NwYW4+XG4gICAgICAgICAgICBUb3AgVHJhY2tpbmcgT2ZmZW5kZXJzXG4gICAgICAgICAgICA8c3BhbiBjbGFzcz1cInRvcC1ibG9ja2VkX19saXN0IHRvcC1ibG9ja2VkX19saXN0LS10cnVuY2F0ZWQgdG9wLWJsb2NrZWRfX2xpc3QtLWljb25zXCI+XG4gICAgICAgICAgICAgICAgJHtsaXN0SXRlbXModGhpcy5tb2RlbC5jb21wYW55TGlzdE1hcCl9XG4gICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgIDwvYT5cbiAgICA8L2Rpdj5cbjwvZGl2PmBcbiAgICB9XG59XG4iLCJjb25zdCBiZWwgPSByZXF1aXJlKCdiZWwnKVxuY29uc3QgaGVhZGVyID0gcmVxdWlyZSgnLi9zaGFyZWQvc2xpZGluZy1zdWJ2aWV3LWhlYWRlci5lczYuanMnKVxuY29uc3QgbGlzdEl0ZW1zID0gcmVxdWlyZSgnLi90b3AtYmxvY2tlZC1saXN0LWl0ZW1zLmVzNi5qcycpXG5jb25zdCBub0RhdGEgPSByZXF1aXJlKCcuL3NoYXJlZC90b3AtYmxvY2tlZC1uby1kYXRhLmVzNi5qcycpXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5tb2RlbCkge1xuICAgICAgICByZXR1cm4gYmVsYDxkaXYgY2xhc3M9XCJzbGlkaW5nLXN1YnZpZXdcbiAgICBzbGlkaW5nLXN1YnZpZXctLWhhcy1maXhlZC1oZWFkZXIgdG9wLWJsb2NrZWQtaGVhZGVyXCI+XG4gICAgJHtoZWFkZXIoJ0FsbCBUcmFja2VycycpfVxuPC9kaXY+YFxuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBiZWxgPGRpdiBjbGFzcz1cImpzLXRvcC1ibG9ja2VkLWNvbnRlbnRcIj5cbiAgICAke3JlbmRlclBjdFBhZ2VzV2l0aFRyYWNrZXJzKHRoaXMubW9kZWwpfVxuICAgICR7cmVuZGVyTGlzdCh0aGlzLm1vZGVsKX1cbiAgICAke3JlbmRlclJlc2V0QnV0dG9uKHRoaXMubW9kZWwpfVxuPC9kaXY+YFxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVuZGVyUGN0UGFnZXNXaXRoVHJhY2tlcnMgKG1vZGVsKSB7XG4gICAgbGV0IG1zZyA9ICcnXG4gICAgaWYgKG1vZGVsLmxhc3RTdGF0c1Jlc2V0RGF0ZSkge1xuICAgICAgICBjb25zdCBkID0gKG5ldyBEYXRlKG1vZGVsLmxhc3RTdGF0c1Jlc2V0RGF0ZSkpLnRvTG9jYWxlRGF0ZVN0cmluZygnZGVmYXVsdCcsIHsgbW9udGg6ICdsb25nJywgZGF5OiAnbnVtZXJpYycsIHllYXI6ICdudW1lcmljJyB9KVxuICAgICAgICBpZiAoZCkgbXNnID0gYCBzaW5jZSAke2R9YFxuICAgIH1cbiAgICBpZiAobW9kZWwucGN0UGFnZXNXaXRoVHJhY2tlcnMpIHtcbiAgICAgICAgcmV0dXJuIGJlbGA8cCBjbGFzcz1cInRvcC1ibG9ja2VkX19wY3QgY2FyZFwiPlxuICAgIFRyYWNrZXJzIHdlcmUgZm91bmQgb24gPGI+JHttb2RlbC5wY3RQYWdlc1dpdGhUcmFja2Vyc30lPC9iPlxuICAgIG9mIHdlYnNpdGVzIHlvdSd2ZSB2aXNpdGVkJHttc2d9LlxuPC9wPmBcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlbmRlckxpc3QgKG1vZGVsKSB7XG4gICAgaWYgKG1vZGVsLmNvbXBhbnlMaXN0TWFwLmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmV0dXJuIGJlbGA8b2wgYXJpYS1sYWJlbD1cIkxpc3Qgb2YgVHJhY2tlcnMgRm91bmRcIiBjbGFzcz1cImRlZmF1bHQtbGlzdCB0b3AtYmxvY2tlZF9fbGlzdCBjYXJkIGJvcmRlci0tYm90dG9tXCI+XG4gICAgJHtsaXN0SXRlbXMobW9kZWwuY29tcGFueUxpc3RNYXApfVxuPC9vbD5gXG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGJlbGA8b2wgY2xhc3M9XCJkZWZhdWx0LWxpc3QgdG9wLWJsb2NrZWRfX2xpc3RcIj5cbiAgICA8bGkgY2xhc3M9XCJ0b3AtYmxvY2tlZF9fbGkgdG9wLWJsb2NrZWRfX2xpLS1uby1kYXRhXCI+XG4gICAgICAgICR7bm9EYXRhKCl9XG4gICAgPC9saT5cbjwvb2w+YFxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVuZGVyUmVzZXRCdXR0b24gKG1vZGVsKSB7XG4gICAgaWYgKG1vZGVsLmNvbXBhbnlMaXN0TWFwLmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmV0dXJuIGJlbGA8ZGl2IGNsYXNzPVwidG9wLWJsb2NrZWRfX3Jlc2V0LXN0YXRzXCI+XG4gICAgPGJ1dHRvbiBjbGFzcz1cInRvcC1ibG9ja2VkX19yZXNldC1zdGF0c19fYnV0dG9uIGJsb2NrXG4gICAgICAgIGpzLXJlc2V0LXRyYWNrZXJzLWRhdGFcIj5cbiAgICAgICAgUmVzZXQgZ2xvYmFsIHN0YXRzXG4gICAgPC9idXR0b24+XG4gICAgPHA+VGhlc2Ugc3RhdHMgYXJlIG9ubHkgc3RvcmVkIGxvY2FsbHkgb24geW91ciBkZXZpY2UsXG4gICAgYW5kIGFyZSBub3Qgc2VudCBhbnl3aGVyZSwgZXZlci48L3A+XG48L2Rpdj5gXG4gICAgfVxufVxuIiwiY29uc3QgYmVsID0gcmVxdWlyZSgnYmVsJylcbmNvbnN0IGhlcm8gPSByZXF1aXJlKCcuL3NoYXJlZC9oZXJvLmVzNi5qcycpXG5jb25zdCB0cmFja2VyTmV0d29ya3NJY29uID0gcmVxdWlyZSgnLi9zaGFyZWQvdHJhY2tlci1uZXR3b3JrLWljb24uZXM2LmpzJylcbmNvbnN0IHRyYWNrZXJOZXR3b3Jrc1RleHQgPSByZXF1aXJlKCcuL3NoYXJlZC90cmFja2VyLW5ldHdvcmtzLXRleHQuZXM2LmpzJylcbmNvbnN0IGRpc3BsYXlDYXRlZ29yaWVzID0gcmVxdWlyZSgnLi8uLi8uLi8uLi9kYXRhL2NvbnN0YW50cy5qcycpLmRpc3BsYXlDYXRlZ29yaWVzXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5tb2RlbCkge1xuICAgICAgICByZXR1cm4gYmVsYDxzZWN0aW9uIGNsYXNzPVwic2xpZGluZy1zdWJ2aWV3XG4gICAgc2xpZGluZy1zdWJ2aWV3LS1oYXMtZml4ZWQtaGVhZGVyXCI+XG48L3NlY3Rpb24+YFxuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBiZWxgPGRpdiBjbGFzcz1cInRyYWNrZXItbmV0d29ya3Mgc2l0ZS1pbmZvIHNpdGUtaW5mby0tZnVsbC1oZWlnaHQgY2FyZFwiPlxuICAgIDxkaXYgY2xhc3M9XCJqcy10cmFja2VyLW5ldHdvcmtzLWhlcm9cIj5cbiAgICAgICAgJHtyZW5kZXJIZXJvKHRoaXMubW9kZWwuc2l0ZSl9XG4gICAgPC9kaXY+XG4gICAgPGRpdiBjbGFzcz1cInRyYWNrZXItbmV0d29ya3NfX2V4cGxhaW5lciBib3JkZXItLWJvdHRvbS0taW5uZXJcbiAgICAgICAgdGV4dC0tY2VudGVyXCI+XG4gICAgICAgIFRyYWNrZXIgbmV0d29ya3MgYWdncmVnYXRlIHlvdXIgd2ViIGhpc3RvcnkgaW50byBhIGRhdGEgcHJvZmlsZSBhYm91dCB5b3UuXG4gICAgICAgIE1ham9yIHRyYWNrZXIgbmV0d29ya3MgYXJlIG1vcmUgaGFybWZ1bCBiZWNhdXNlIHRoZXkgY2FuIHRyYWNrIGFuZCB0YXJnZXQgeW91IGFjcm9zcyBtb3JlIG9mIHRoZSBJbnRlcm5ldC5cbiAgICA8L2Rpdj5cbiAgICA8ZGl2IGNsYXNzPVwidHJhY2tlci1uZXR3b3Jrc19fZGV0YWlscyBwYWRkZWRcbiAgICAgICAganMtdHJhY2tlci1uZXR3b3Jrcy1kZXRhaWxzXCI+XG4gICAgICAgIDxvbCBjbGFzcz1cImRlZmF1bHQtbGlzdCBzaXRlLWluZm9fX3RyYWNrZXJzX19jb21wYW55LWxpc3RcIiBhcmlhLWxhYmVsPVwiTGlzdCBvZiB0cmFja2VyIG5ldHdvcmtzXCI+XG4gICAgICAgICAgICAke3JlbmRlclRyYWNrZXJEZXRhaWxzKFxuICAgICAgICB0aGlzLm1vZGVsLFxuICAgICAgICB0aGlzLm1vZGVsLkRPTUFJTl9NQVBQSU5HU1xuICAgICl9XG4gICAgICAgIDwvb2w+XG4gICAgPC9kaXY+XG48L2Rpdj5gXG4gICAgfVxufVxuXG5mdW5jdGlvbiByZW5kZXJIZXJvIChzaXRlKSB7XG4gICAgc2l0ZSA9IHNpdGUgfHwge31cblxuICAgIHJldHVybiBiZWxgJHtoZXJvKHtcbiAgICAgICAgc3RhdHVzOiB0cmFja2VyTmV0d29ya3NJY29uKHNpdGUuc2l0ZVJhdGluZywgc2l0ZS5pc0FsbG93bGlzdGVkLCBzaXRlLnRvdGFsVHJhY2tlck5ldHdvcmtzQ291bnQpLFxuICAgICAgICB0aXRsZTogc2l0ZS5kb21haW4sXG4gICAgICAgIHN1YnRpdGxlOiBgJHt0cmFja2VyTmV0d29ya3NUZXh0KHNpdGUsIGZhbHNlKX1gLFxuICAgICAgICBzaG93Q2xvc2U6IHRydWVcbiAgICB9KX1gXG59XG5cbmZ1bmN0aW9uIHJlbmRlclRyYWNrZXJEZXRhaWxzIChtb2RlbCkge1xuICAgIGNvbnN0IGNvbXBhbnlMaXN0TWFwID0gbW9kZWwuY29tcGFueUxpc3RNYXAgfHwge31cbiAgICBpZiAoY29tcGFueUxpc3RNYXAubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBiZWxgPGxpIGNsYXNzPVwiaXMtZW1wdHlcIj48L2xpPmBcbiAgICB9XG4gICAgaWYgKGNvbXBhbnlMaXN0TWFwICYmIGNvbXBhbnlMaXN0TWFwLmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmV0dXJuIGNvbXBhbnlMaXN0TWFwLm1hcCgoYywgaSkgPT4ge1xuICAgICAgICAgICAgbGV0IGJvcmRlckNsYXNzID0gJydcbiAgICAgICAgICAgIGlmIChjLm5hbWUgJiYgYy5uYW1lID09PSAndW5rbm93bicpIHtcbiAgICAgICAgICAgICAgICBjLm5hbWUgPSAnKFRyYWNrZXIgbmV0d29yayB1bmtub3duKSdcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYy5uYW1lICYmIG1vZGVsLmhhc1VuYmxvY2tlZFRyYWNrZXJzKGMsIGMudXJsc0xpc3QpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYWRkaXRpb25hbFRleHQgPSAnIGFzc29jaWF0ZWQgZG9tYWlucydcbiAgICAgICAgICAgICAgICBjb25zdCBkb21haW4gPSBtb2RlbC5zaXRlID8gbW9kZWwuc2l0ZS5kb21haW4gOiBjLmRpc3BsYXlOYW1lXG4gICAgICAgICAgICAgICAgYy5kaXNwbGF5TmFtZSA9IG1vZGVsLnNpdGUuaXNBbGxvd2xpc3RlZCA/IGRvbWFpbiArIGFkZGl0aW9uYWxUZXh0IDogZG9tYWluICsgYWRkaXRpb25hbFRleHQgKyAnIChub3QgYmxvY2tlZCknXG4gICAgICAgICAgICAgICAgYm9yZGVyQ2xhc3MgPSBjb21wYW55TGlzdE1hcC5sZW5ndGggPiAxID8gJ2JvcmRlci0tdG9wIHBhZGRlZC0tdG9wJyA6ICcnXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYmVsYDxsaSBjbGFzcz1cIiR7Ym9yZGVyQ2xhc3N9XCI+XG4gICAgPGRpdiBjbGFzcz1cInNpdGUtaW5mb19fdHJhY2tlcl9fd3JhcHBlciAke2Mubm9ybWFsaXplZE5hbWV9IGZsb2F0LXJpZ2h0XCI+XG4gICAgICAgIDxzcGFuIGNsYXNzPVwic2l0ZS1pbmZvX190cmFja2VyX19pY29uICR7Yy5ub3JtYWxpemVkTmFtZX1cIj5cbiAgICAgICAgPC9zcGFuPlxuICAgIDwvZGl2PlxuICAgIDxoMSB0aXRsZT1cIiR7Yy5uYW1lfVwiIGNsYXNzPVwic2l0ZS1pbmZvX19kb21haW4gYmxvY2tcIj4ke2MuZGlzcGxheU5hbWV9PC9oMT5cbiAgICA8b2wgY2xhc3M9XCJkZWZhdWx0LWxpc3Qgc2l0ZS1pbmZvX190cmFja2Vyc19fY29tcGFueS1saXN0X191cmwtbGlzdFwiIGFyaWEtbGFiZWw9XCJUcmFja2VyIGRvbWFpbnMgZm9yICR7Yy5uYW1lfVwiPlxuICAgICAgICAke2MudXJsc0xpc3QubWFwKCh1cmwpID0+IHtcbiAgICAgICAgLy8gZmluZCBmaXJzdCBtYXRjaGlnbiBjYXRlZ29yeSBmcm9tIG91ciBsaXN0IG9mIGFsbG93ZWQgZGlzcGxheSBjYXRlZ29yaWVzXG4gICAgICAgIGxldCBjYXRlZ29yeSA9ICcnXG4gICAgICAgIGlmIChjLnVybHNbdXJsXSAmJiBjLnVybHNbdXJsXS5jYXRlZ29yaWVzKSB7XG4gICAgICAgICAgICBkaXNwbGF5Q2F0ZWdvcmllcy5zb21lKGRpc3BsYXlDYXQgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gYy51cmxzW3VybF0uY2F0ZWdvcmllcy5maW5kKGNhdCA9PiBjYXQgPT09IGRpc3BsYXlDYXQpXG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5ID0gbWF0Y2hcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBiZWxgPGxpPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1cmxcIj4ke3VybH08L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY2F0ZWdvcnlcIj4ke2NhdGVnb3J5fTwvZGl2PlxuICAgICAgICAgICAgPC9saT5gXG4gICAgfSl9XG4gICAgPC9vbD5cbjwvbGk+YFxuICAgICAgICB9KVxuICAgIH1cbn1cbiIsImNvbnN0IFBhcmVudCA9IHdpbmRvdy5EREcuYmFzZS5WaWV3XG5cbmZ1bmN0aW9uIEF1dG9jb21wbGV0ZSAob3BzKSB7XG4gICAgdGhpcy5tb2RlbCA9IG9wcy5tb2RlbFxuICAgIHRoaXMucGFnZVZpZXcgPSBvcHMucGFnZVZpZXdcbiAgICB0aGlzLnRlbXBsYXRlID0gb3BzLnRlbXBsYXRlXG4gICAgUGFyZW50LmNhbGwodGhpcywgb3BzKVxuXG4gICAgdGhpcy5iaW5kRXZlbnRzKFtcbiAgICAgICAgW3RoaXMuc3RvcmUuc3Vic2NyaWJlLCAnY2hhbmdlOnNlYXJjaCcsIHRoaXMuX2hhbmRsZVNlYXJjaFRleHRdXG4gICAgXSlcbn1cblxuQXV0b2NvbXBsZXRlLnByb3RvdHlwZSA9IHdpbmRvdy4kLmV4dGVuZCh7fSxcbiAgICBQYXJlbnQucHJvdG90eXBlLFxuICAgIHtcblxuICAgICAgICBfaGFuZGxlU2VhcmNoVGV4dDogZnVuY3Rpb24gKG5vdGlmaWNhdGlvbikge1xuICAgICAgICAgICAgaWYgKG5vdGlmaWNhdGlvbi5jaGFuZ2UgJiYgbm90aWZpY2F0aW9uLmNoYW5nZS5hdHRyaWJ1dGUgPT09ICdzZWFyY2hUZXh0Jykge1xuICAgICAgICAgICAgICAgIGlmICghbm90aWZpY2F0aW9uLmNoYW5nZS52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vZGVsLnN1Z2dlc3Rpb25zID0gW11cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcmVyZW5kZXIoKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLm1vZGVsLmZldGNoU3VnZ2VzdGlvbnMobm90aWZpY2F0aW9uLmNoYW5nZS52YWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oKCkgPT4gdGhpcy5fcmVyZW5kZXIoKSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbilcblxubW9kdWxlLmV4cG9ydHMgPSBBdXRvY29tcGxldGVcbiIsImNvbnN0IFBhcmVudCA9IHdpbmRvdy5EREcuYmFzZS5WaWV3XG5cbmZ1bmN0aW9uIEJyZWFrYWdlRm9ybSAob3BzKSB7XG4gICAgdGhpcy5tb2RlbCA9IG9wcy5tb2RlbFxuICAgIHRoaXMudGVtcGxhdGUgPSBvcHMudGVtcGxhdGVcbiAgICB0aGlzLnNpdGVWaWV3ID0gb3BzLnNpdGVWaWV3XG4gICAgdGhpcy5jbGlja1NvdXJjZSA9IG9wcy5jbGlja1NvdXJjZVxuICAgIHRoaXMuJHJvb3QgPSB3aW5kb3cuJCgnLmpzLWJyZWFrYWdlLWZvcm0nKVxuICAgIFBhcmVudC5jYWxsKHRoaXMsIG9wcylcblxuICAgIHRoaXMuX3NldHVwKClcbn1cblxuQnJlYWthZ2VGb3JtLnByb3RvdHlwZSA9IHdpbmRvdy4kLmV4dGVuZCh7fSxcbiAgICBQYXJlbnQucHJvdG90eXBlLFxuICAgIHtcbiAgICAgICAgX3NldHVwOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLl9jYWNoZUVsZW1zKCcuanMtYnJlYWthZ2UtZm9ybScsIFtcbiAgICAgICAgICAgICAgICAnY2xvc2UnLFxuICAgICAgICAgICAgICAgICdzdWJtaXQnLFxuICAgICAgICAgICAgICAgICdlbGVtZW50JyxcbiAgICAgICAgICAgICAgICAnbWVzc2FnZScsXG4gICAgICAgICAgICAgICAgJ2Ryb3Bkb3duJ1xuICAgICAgICAgICAgXSlcbiAgICAgICAgICAgIHRoaXMuYmluZEV2ZW50cyhbXG4gICAgICAgICAgICAgICAgW3RoaXMuJGNsb3NlLCAnY2xpY2snLCB0aGlzLl9jbG9zZUZvcm1dLFxuICAgICAgICAgICAgICAgIFt0aGlzLiRzdWJtaXQsICdjbGljaycsIHRoaXMuX3N1Ym1pdEZvcm1dLFxuICAgICAgICAgICAgICAgIFt0aGlzLiRkcm9wZG93biwgJ2NoYW5nZScsIHRoaXMuX3NlbGVjdENhdGVnb3J5XVxuICAgICAgICAgICAgXSlcbiAgICAgICAgfSxcblxuICAgICAgICBfY2xvc2VGb3JtOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgaWYgKGUpIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgICAgLy8gcmVsb2FkIHBhZ2UgYWZ0ZXIgY2xvc2luZyBmb3JtIGlmIHVzZXIgZ290IHRvIGZvcm0gZnJvbVxuICAgICAgICAgICAgLy8gdG9nZ2xpbmcgcHJpdmFjeSBwcm90ZWN0aW9uLiBvdGhlcndpc2UgZGVzdHJveSB2aWV3LlxuICAgICAgICAgICAgaWYgKHRoaXMuY2xpY2tTb3VyY2UgPT09ICd0b2dnbGUnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zaXRlVmlldy5jbG9zZVBvcHVwQW5kUmVsb2FkKDUwMClcbiAgICAgICAgICAgICAgICB0aGlzLmRlc3Ryb3koKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRlc3Ryb3koKVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIF9zdWJtaXRGb3JtOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy4kc3VibWl0Lmhhc0NsYXNzKCdidG4tZGlzYWJsZWQnKSkge1xuICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBjYXRlZ29yeSA9IHRoaXMuJGRyb3Bkb3duLnZhbCgpXG4gICAgICAgICAgICB0aGlzLm1vZGVsLnN1Ym1pdEJyZWFrYWdlRm9ybShjYXRlZ29yeSlcbiAgICAgICAgICAgIHRoaXMuX3Nob3dUaGFua1lvdU1lc3NhZ2UoKVxuICAgICAgICB9LFxuXG4gICAgICAgIF9zaG93VGhhbmtZb3VNZXNzYWdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKCdpcy10cmFuc3BhcmVudCcpXG4gICAgICAgICAgICB0aGlzLiRtZXNzYWdlLnJlbW92ZUNsYXNzKCdpcy10cmFuc3BhcmVudCcpXG4gICAgICAgICAgICAvLyByZWxvYWQgcGFnZSBhZnRlciBmb3JtIHN1Ym1pc3Npb24gaWYgdXNlciBnb3QgdG8gZm9ybSBmcm9tXG4gICAgICAgICAgICAvLyB0b2dnbGluZyBwcml2YWN5IHByb3RlY3Rpb24sIG90aGVyd2lzZSBkZXN0cm95IHZpZXcuXG4gICAgICAgICAgICBpZiAodGhpcy5jbGlja1NvdXJjZSA9PT0gJ3RvZ2dsZScpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNpdGVWaWV3LmNsb3NlUG9wdXBBbmRSZWxvYWQoMzUwMClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBfc2VsZWN0Q2F0ZWdvcnk6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgfVxuICAgIH1cbilcblxubW9kdWxlLmV4cG9ydHMgPSBCcmVha2FnZUZvcm1cbiIsImNvbnN0IHsgZm9ybWF0QWRkcmVzcyB9ID0gcmVxdWlyZSgnLi4vLi4vYmFja2dyb3VuZC9lbWFpbC11dGlscy5lczYnKVxuXG5jb25zdCBQYXJlbnQgPSB3aW5kb3cuRERHLmJhc2UuVmlld1xuXG5mdW5jdGlvbiBFbWFpbEFsaWFzVmlldyAob3BzKSB7XG4gICAgdGhpcy5tb2RlbCA9IG9wcy5tb2RlbFxuICAgIHRoaXMucGFnZVZpZXcgPSBvcHMucGFnZVZpZXdcbiAgICB0aGlzLnRlbXBsYXRlID0gb3BzLnRlbXBsYXRlXG5cbiAgICB0aGlzLm1vZGVsLmdldFVzZXJEYXRhKCkudGhlbih1c2VyRGF0YSA9PiB7XG4gICAgICAgIHRoaXMubW9kZWwuc2V0KCd1c2VyRGF0YScsIHVzZXJEYXRhKVxuICAgICAgICBQYXJlbnQuY2FsbCh0aGlzLCBvcHMpXG4gICAgICAgIHRoaXMuX3NldHVwKClcbiAgICB9KVxufVxuXG5FbWFpbEFsaWFzVmlldy5wcm90b3R5cGUgPSB3aW5kb3cuJC5leHRlbmQoe30sXG4gICAgUGFyZW50LnByb3RvdHlwZSxcbiAgICB7XG4gICAgICAgIF9jb3B5QWxpYXNUb0NsaXBib2FyZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29uc3QgYWxpYXMgPSB0aGlzLm1vZGVsLnVzZXJEYXRhLm5leHRBbGlhc1xuICAgICAgICAgICAgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoZm9ybWF0QWRkcmVzcyhhbGlhcykpXG4gICAgICAgICAgICB0aGlzLiRlbC5hZGRDbGFzcygnc2hvdy1jb3BpZWQtbGFiZWwnKVxuICAgICAgICAgICAgdGhpcy4kZWwub25lKCdhbmltYXRpb25lbmQnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy4kZWwucmVtb3ZlQ2xhc3MoJ3Nob3ctY29waWVkLWxhYmVsJylcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgIHRoaXMubW9kZWwuZmV0Y2goeyByZWZyZXNoQWxpYXM6IHRydWUgfSkudGhlbigoeyBwcml2YXRlQWRkcmVzcyB9KSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5tb2RlbC51c2VyRGF0YS5uZXh0QWxpYXMgPSBwcml2YXRlQWRkcmVzc1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSxcblxuICAgICAgICBfc2V0dXA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuYmluZEV2ZW50cyhbXG4gICAgICAgICAgICAgICAgW3RoaXMuJGVsLCAnY2xpY2snLCB0aGlzLl9jb3B5QWxpYXNUb0NsaXBib2FyZF1cbiAgICAgICAgICAgIF0pXG4gICAgICAgIH1cbiAgICB9XG4pXG5cbm1vZHVsZS5leHBvcnRzID0gRW1haWxBbGlhc1ZpZXdcbiIsImNvbnN0IFBhcmVudCA9IHJlcXVpcmUoJy4vc2xpZGluZy1zdWJ2aWV3LmVzNi5qcycpXG5jb25zdCByYXRpbmdIZXJvVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc2hhcmVkL3JhdGluZy1oZXJvLmVzNi5qcycpXG5jb25zdCBncmFkZXNUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zaGFyZWQvZ3JhZGUtc2NvcmVjYXJkLWdyYWRlcy5lczYuanMnKVxuY29uc3QgcmVhc29uc1RlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3NoYXJlZC9ncmFkZS1zY29yZWNhcmQtcmVhc29ucy5lczYuanMnKVxuXG5mdW5jdGlvbiBHcmFkZVNjb3JlY2FyZCAob3BzKSB7XG4gICAgdGhpcy5tb2RlbCA9IG9wcy5tb2RlbFxuICAgIHRoaXMudGVtcGxhdGUgPSBvcHMudGVtcGxhdGVcblxuICAgIFBhcmVudC5jYWxsKHRoaXMsIG9wcylcblxuICAgIHRoaXMuX3NldHVwKClcblxuICAgIHRoaXMuYmluZEV2ZW50cyhbW1xuICAgICAgICB0aGlzLnN0b3JlLnN1YnNjcmliZSxcbiAgICAgICAgJ2NoYW5nZTpzaXRlJyxcbiAgICAgICAgdGhpcy5fb25TaXRlQ2hhbmdlXG4gICAgXV0pXG5cbiAgICB0aGlzLnNldHVwQ2xvc2UoKVxufVxuXG5HcmFkZVNjb3JlY2FyZC5wcm90b3R5cGUgPSB3aW5kb3cuJC5leHRlbmQoe30sXG4gICAgUGFyZW50LnByb3RvdHlwZSxcbiAgICB7XG4gICAgICAgIF9zZXR1cDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5fY2FjaGVFbGVtcygnLmpzLWdyYWRlLXNjb3JlY2FyZCcsIFtcbiAgICAgICAgICAgICAgICAncmVhc29ucycsXG4gICAgICAgICAgICAgICAgJ2dyYWRlcydcbiAgICAgICAgICAgIF0pXG4gICAgICAgICAgICB0aGlzLiRoZXJvID0gdGhpcy4kKCcuanMtcmF0aW5nLWhlcm8nKVxuICAgICAgICB9LFxuXG4gICAgICAgIF9yZXJlbmRlckhlcm86IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuJGhlcm8ucmVwbGFjZVdpdGgocmF0aW5nSGVyb1RlbXBsYXRlKFxuICAgICAgICAgICAgICAgIHRoaXMubW9kZWwsXG4gICAgICAgICAgICAgICAgeyBzaG93Q2xvc2U6IHRydWUgfVxuICAgICAgICAgICAgKSlcbiAgICAgICAgfSxcblxuICAgICAgICBfcmVyZW5kZXJHcmFkZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuJGdyYWRlcy5yZXBsYWNlV2l0aChncmFkZXNUZW1wbGF0ZSh0aGlzLm1vZGVsKSlcbiAgICAgICAgfSxcblxuICAgICAgICBfcmVyZW5kZXJSZWFzb25zOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLiRyZWFzb25zLnJlcGxhY2VXaXRoKHJlYXNvbnNUZW1wbGF0ZSh0aGlzLm1vZGVsKSlcbiAgICAgICAgfSxcblxuICAgICAgICBfb25TaXRlQ2hhbmdlOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgaWYgKGUuY2hhbmdlLmF0dHJpYnV0ZSA9PT0gJ3NpdGVSYXRpbmcnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVyZW5kZXJIZXJvKClcbiAgICAgICAgICAgICAgICB0aGlzLl9yZXJlbmRlckdyYWRlcygpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGFsbCB0aGUgb3RoZXIgc3R1ZmYgd2UgdXNlIGluIHRoZSByZWFzb25zXG4gICAgICAgICAgICAvLyAoZS5nLiBodHRwcywgdG9zZHIpXG4gICAgICAgICAgICAvLyBkb2Vzbid0IGNoYW5nZSBkeW5hbWljYWxseVxuICAgICAgICAgICAgaWYgKGUuY2hhbmdlLmF0dHJpYnV0ZSA9PT0gJ3RyYWNrZXJOZXR3b3JrcycgfHxcbiAgICAgICAgICAgICAgICAgICAgZS5jaGFuZ2UuYXR0cmlidXRlID09PSAnaXNhTWFqb3JUcmFja2luZ05ldHdvcmsnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVyZW5kZXJSZWFzb25zKClcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcmVjYWNoZSBhbnkgc2VsZWN0b3JzIHRoYXQgd2VyZSByZXJlbmRlcmVkXG4gICAgICAgICAgICB0aGlzLl9zZXR1cCgpXG4gICAgICAgICAgICB0aGlzLnNldHVwQ2xvc2UoKVxuICAgICAgICB9XG4gICAgfVxuKVxuXG5tb2R1bGUuZXhwb3J0cyA9IEdyYWRlU2NvcmVjYXJkXG4iLCJjb25zdCBQYXJlbnQgPSB3aW5kb3cuRERHLmJhc2UuVmlld1xuY29uc3Qgb3Blbk9wdGlvbnNQYWdlID0gcmVxdWlyZSgnLi9taXhpbnMvb3Blbi1vcHRpb25zLXBhZ2UuZXM2LmpzJylcbmNvbnN0IGJyb3dzZXJVSVdyYXBwZXIgPSByZXF1aXJlKCcuLy4uL2Jhc2UvdWktd3JhcHBlci5lczYuanMnKVxuY29uc3QgeyBJU19CRVRBIH0gPSByZXF1aXJlKCcuLi8uLi9iYWNrZ3JvdW5kL2NoYW5uZWwuZXM2LmpzJylcblxuZnVuY3Rpb24gSGFtYnVyZ2VyTWVudSAob3BzKSB7XG4gICAgdGhpcy5tb2RlbCA9IG9wcy5tb2RlbFxuICAgIHRoaXMudGVtcGxhdGUgPSBvcHMudGVtcGxhdGVcbiAgICB0aGlzLnBhZ2VWaWV3ID0gb3BzLnBhZ2VWaWV3XG4gICAgUGFyZW50LmNhbGwodGhpcywgb3BzKVxuXG4gICAgdGhpcy5fc2V0dXAoKVxufVxuXG5IYW1idXJnZXJNZW51LnByb3RvdHlwZSA9IHdpbmRvdy4kLmV4dGVuZCh7fSxcbiAgICBQYXJlbnQucHJvdG90eXBlLFxuICAgIG9wZW5PcHRpb25zUGFnZSxcbiAgICB7XG5cbiAgICAgICAgX3NldHVwOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLl9jYWNoZUVsZW1zKCcuanMtaGFtYnVyZ2VyLW1lbnUnLCBbXG4gICAgICAgICAgICAgICAgJ2Nsb3NlJyxcbiAgICAgICAgICAgICAgICAnb3B0aW9ucy1saW5rJyxcbiAgICAgICAgICAgICAgICAnZmVlZGJhY2stbGluaycsXG4gICAgICAgICAgICAgICAgJ2Jyb2tlbi1zaXRlLWxpbmsnLFxuICAgICAgICAgICAgICAgICdkZWJ1Z2dlci1wYW5lbC1saW5rJ1xuICAgICAgICAgICAgXSlcbiAgICAgICAgICAgIHRoaXMuYmluZEV2ZW50cyhbXG4gICAgICAgICAgICAgICAgW3RoaXMuJGNsb3NlLCAnY2xpY2snLCB0aGlzLl9jbG9zZU1lbnVdLFxuICAgICAgICAgICAgICAgIFt0aGlzLiRvcHRpb25zbGluaywgJ2NsaWNrJywgdGhpcy5vcGVuT3B0aW9uc1BhZ2VdLFxuICAgICAgICAgICAgICAgIFt0aGlzLiRmZWVkYmFja2xpbmssICdjbGljaycsIHRoaXMuX2hhbmRsZUZlZWRiYWNrQ2xpY2tdLFxuICAgICAgICAgICAgICAgIFt0aGlzLiRicm9rZW5zaXRlbGluaywgJ2NsaWNrJywgdGhpcy5faGFuZGxlQnJva2VuU2l0ZUNsaWNrXSxcbiAgICAgICAgICAgICAgICBbdGhpcy5tb2RlbC5zdG9yZS5zdWJzY3JpYmUsICdhY3Rpb246c2VhcmNoJywgdGhpcy5faGFuZGxlQWN0aW9uXSxcbiAgICAgICAgICAgICAgICBbdGhpcy5tb2RlbC5zdG9yZS5zdWJzY3JpYmUsICdjaGFuZ2U6c2l0ZScsIHRoaXMuX2hhbmRsZVNpdGVVcGRhdGVdLFxuICAgICAgICAgICAgICAgIFt0aGlzLiRkZWJ1Z2dlcnBhbmVsbGluaywgJ2NsaWNrJywgdGhpcy5faGFuZGxlRGVidWdnZXJDbGlja11cbiAgICAgICAgICAgIF0pXG4gICAgICAgICAgICBpZiAoSVNfQkVUQSkge1xuICAgICAgICAgICAgICAgIHRoaXMuJCgnI2RlYnVnZ2VyLXBhbmVsJykucmVtb3ZlQ2xhc3MoJ2lzLWhpZGRlbicpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgX2hhbmRsZUFjdGlvbjogZnVuY3Rpb24gKG5vdGlmaWNhdGlvbikge1xuICAgICAgICAgICAgaWYgKG5vdGlmaWNhdGlvbi5hY3Rpb24gPT09ICdidXJnZXJDbGljaycpIHRoaXMuX29wZW5NZW51KClcbiAgICAgICAgfSxcblxuICAgICAgICBfb3Blbk1lbnU6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICB0aGlzLiRlbC5yZW1vdmVDbGFzcygnaXMtaGlkZGVuJylcbiAgICAgICAgfSxcblxuICAgICAgICBfY2xvc2VNZW51OiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgaWYgKGUpIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgICAgdGhpcy4kZWwuYWRkQ2xhc3MoJ2lzLWhpZGRlbicpXG4gICAgICAgIH0sXG5cbiAgICAgICAgX2hhbmRsZUZlZWRiYWNrQ2xpY2s6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICAgICAgICAgYnJvd3NlclVJV3JhcHBlci5vcGVuRXh0ZW5zaW9uUGFnZSgnL2h0bWwvZmVlZGJhY2suaHRtbCcpXG4gICAgICAgIH0sXG5cbiAgICAgICAgX2hhbmRsZUJyb2tlblNpdGVDbGljazogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgICAgdGhpcy4kZWwuYWRkQ2xhc3MoJ2lzLWhpZGRlbicpXG4gICAgICAgICAgICB0aGlzLnBhZ2VWaWV3LnZpZXdzLnNpdGUuc2hvd0JyZWFrYWdlRm9ybSgncmVwb3J0QnJva2VuU2l0ZScpXG4gICAgICAgIH0sXG5cbiAgICAgICAgX2hhbmRsZVNpdGVVcGRhdGU6IGZ1bmN0aW9uIChub3RpZmljYXRpb24pIHtcbiAgICAgICAgICAgIGlmIChub3RpZmljYXRpb24gJiYgbm90aWZpY2F0aW9uLmNoYW5nZS5hdHRyaWJ1dGUgPT09ICd0YWInKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tb2RlbC50YWJVcmwgPSBub3RpZmljYXRpb24uY2hhbmdlLnZhbHVlLnVybFxuICAgICAgICAgICAgICAgIHRoaXMuX3JlcmVuZGVyKClcbiAgICAgICAgICAgICAgICB0aGlzLl9zZXR1cCgpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgX2hhbmRsZURlYnVnZ2VyQ2xpY2s6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICAgIGNocm9tZS50YWJzLnF1ZXJ5KHsgYWN0aXZlOiB0cnVlLCBjdXJyZW50V2luZG93OiB0cnVlIH0sICh0YWJzKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGFiSWQgPSB0YWJzLmxlbmd0aCA+IDAgPyB0YWJzWzBdLmlkIDogJydcbiAgICAgICAgICAgICAgICBjaHJvbWUudGFicy5jcmVhdGUoe1xuICAgICAgICAgICAgICAgICAgICB1cmw6IGNocm9tZS5ydW50aW1lLmdldFVSTChgL2h0bWwvZGV2dG9vbHMtcGFuZWwuaHRtbD90YWJJZD0ke3RhYklkfWApXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9XG4pXG5cbm1vZHVsZS5leHBvcnRzID0gSGFtYnVyZ2VyTWVudVxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgYW5pbWF0ZUdyYXBoQmFyczogZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpc1xuXG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICghc2VsZi4kZ3JhcGhiYXJmZykgcmV0dXJuXG4gICAgICAgICAgICBzZWxmLiRncmFwaGJhcmZnLmVhY2goZnVuY3Rpb24gKGksIGVsKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJGVsID0gd2luZG93LiQoZWwpXG4gICAgICAgICAgICAgICAgY29uc3QgdyA9ICRlbC5kYXRhKCkud2lkdGhcbiAgICAgICAgICAgICAgICAkZWwuY3NzKCd3aWR0aCcsIHcgKyAnJScpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9LCAyNTApXG5cbiAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKCFzZWxmLiRwY3QpIHJldHVyblxuICAgICAgICAgICAgc2VsZi4kcGN0LmVhY2goZnVuY3Rpb24gKGksIGVsKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJGVsID0gd2luZG93LiQoZWwpXG4gICAgICAgICAgICAgICAgJGVsLmNzcygnY29sb3InLCAnIzMzMzMzMycpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9LCA3MDApXG4gICAgfVxufVxuIiwiY29uc3QgYnJvd3NlclVJV3JhcHBlciA9IHJlcXVpcmUoJy4vLi4vLi4vYmFzZS91aS13cmFwcGVyLmVzNi5qcycpXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIG9wZW5PcHRpb25zUGFnZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLm1vZGVsLmZldGNoKHsgZ2V0QnJvd3NlcjogdHJ1ZSB9KS50aGVuKGJyb3dzZXIgPT4ge1xuICAgICAgICAgICAgYnJvd3NlclVJV3JhcHBlci5vcGVuT3B0aW9uc1BhZ2UoYnJvd3NlcilcbiAgICAgICAgfSlcbiAgICB9XG59XG4iLCJjb25zdCBQYXJlbnRTbGlkaW5nU3VidmlldyA9IHJlcXVpcmUoJy4vc2xpZGluZy1zdWJ2aWV3LmVzNi5qcycpXG5cbmZ1bmN0aW9uIFByaXZhY3lQcmFjdGljZXMgKG9wcykge1xuICAgIHRoaXMubW9kZWwgPSBvcHMubW9kZWxcbiAgICB0aGlzLnRlbXBsYXRlID0gb3BzLnRlbXBsYXRlXG5cbiAgICBQYXJlbnRTbGlkaW5nU3Vidmlldy5jYWxsKHRoaXMsIG9wcylcblxuICAgIHRoaXMuc2V0dXBDbG9zZSgpXG59XG5cblByaXZhY3lQcmFjdGljZXMucHJvdG90eXBlID0gd2luZG93LiQuZXh0ZW5kKHt9LFxuICAgIFBhcmVudFNsaWRpbmdTdWJ2aWV3LnByb3RvdHlwZSxcbiAgICB7XG4gICAgfVxuKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFByaXZhY3lQcmFjdGljZXNcbiIsImNvbnN0IFBhcmVudCA9IHdpbmRvdy5EREcuYmFzZS5WaWV3XG5jb25zdCBGT0NVU19DTEFTUyA9ICdnby0tZm9jdXNlZCdcblxuZnVuY3Rpb24gU2VhcmNoIChvcHMpIHtcbiAgICB0aGlzLm1vZGVsID0gb3BzLm1vZGVsXG4gICAgdGhpcy5wYWdlVmlldyA9IG9wcy5wYWdlVmlld1xuICAgIHRoaXMudGVtcGxhdGUgPSBvcHMudGVtcGxhdGVcbiAgICBQYXJlbnQuY2FsbCh0aGlzLCBvcHMpXG5cbiAgICB0aGlzLl9jYWNoZUVsZW1zKCcuanMtc2VhcmNoJywgW1xuICAgICAgICAnZm9ybScsXG4gICAgICAgICdpbnB1dCcsXG4gICAgICAgICdnbycsXG4gICAgICAgICdoYW1idXJnZXItYnV0dG9uJ1xuICAgIF0pXG5cbiAgICB0aGlzLmJpbmRFdmVudHMoW1xuICAgICAgICBbdGhpcy4kaW5wdXQsICdpbnB1dCcsIHRoaXMuX2hhbmRsZUlucHV0XSxcbiAgICAgICAgW3RoaXMuJGlucHV0LCAnYmx1cicsIHRoaXMuX2hhbmRsZUJsdXJdLFxuICAgICAgICBbdGhpcy4kZ28sICdjbGljaycsIHRoaXMuX2hhbmRsZVN1Ym1pdF0sXG4gICAgICAgIFt0aGlzLiRmb3JtLCAnc3VibWl0JywgdGhpcy5faGFuZGxlU3VibWl0XSxcbiAgICAgICAgW3RoaXMuJGhhbWJ1cmdlcmJ1dHRvbiwgJ2NsaWNrJywgdGhpcy5faGFuZGxlQnVyZ2VyQ2xpY2tdXG4gICAgXSlcblxuICAgIHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHRoaXMuJGlucHV0LmZvY3VzKCksIDIwMClcbn1cblxuU2VhcmNoLnByb3RvdHlwZSA9IHdpbmRvdy4kLmV4dGVuZCh7fSxcbiAgICBQYXJlbnQucHJvdG90eXBlLFxuICAgIHtcblxuICAgICAgICAvLyBIb3ZlciBlZmZlY3Qgb24gc2VhcmNoIGJ1dHRvbiB3aGlsZSB0eXBpbmdcbiAgICAgICAgX2FkZEhvdmVyRWZmZWN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuJGdvLmhhc0NsYXNzKEZPQ1VTX0NMQVNTKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuJGdvLmFkZENsYXNzKEZPQ1VTX0NMQVNTKVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIF9yZW1vdmVIb3ZlckVmZmVjdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuJGdvLmhhc0NsYXNzKEZPQ1VTX0NMQVNTKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuJGdvLnJlbW92ZUNsYXNzKEZPQ1VTX0NMQVNTKVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIF9oYW5kbGVCbHVyOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgdGhpcy5fcmVtb3ZlSG92ZXJFZmZlY3QoKVxuICAgICAgICB9LFxuXG4gICAgICAgIF9oYW5kbGVJbnB1dDogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGNvbnN0IHNlYXJjaFRleHQgPSB0aGlzLiRpbnB1dC52YWwoKVxuICAgICAgICAgICAgdGhpcy5tb2RlbC5zZXQoJ3NlYXJjaFRleHQnLCBzZWFyY2hUZXh0KVxuXG4gICAgICAgICAgICBpZiAoc2VhcmNoVGV4dC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9hZGRIb3ZlckVmZmVjdCgpXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlbW92ZUhvdmVyRWZmZWN0KClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBfaGFuZGxlU3VibWl0OiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgU2VhcmNoIHN1Ym1pdCBmb3IgJHt0aGlzLiRpbnB1dC52YWwoKX1gKVxuICAgICAgICAgICAgdGhpcy5tb2RlbC5mZXRjaCh7IGZpcmVQaXhlbDogJ2VwcScgfSlcbiAgICAgICAgICAgIHRoaXMubW9kZWwuZG9TZWFyY2godGhpcy4kaW5wdXQudmFsKCkpXG4gICAgICAgICAgICB3aW5kb3cuY2xvc2UoKVxuICAgICAgICB9LFxuXG4gICAgICAgIF9oYW5kbGVCdXJnZXJDbGljazogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgICAgdGhpcy5tb2RlbC5mZXRjaCh7IGZpcmVQaXhlbDogJ2VwaCcgfSlcbiAgICAgICAgICAgIHRoaXMubW9kZWwuc2VuZCgnYnVyZ2VyQ2xpY2snKVxuICAgICAgICB9XG4gICAgfVxuKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlYXJjaFxuIiwiY29uc3QgUGFyZW50ID0gd2luZG93LkRERy5iYXNlLlZpZXdcbmNvbnN0IEdyYWRlU2NvcmVjYXJkVmlldyA9IHJlcXVpcmUoJy4vLi4vdmlld3MvZ3JhZGUtc2NvcmVjYXJkLmVzNi5qcycpXG5jb25zdCBUcmFja2VyTmV0d29ya3NWaWV3ID0gcmVxdWlyZSgnLi8uLi92aWV3cy90cmFja2VyLW5ldHdvcmtzLmVzNi5qcycpXG5jb25zdCBQcml2YWN5UHJhY3RpY2VzVmlldyA9IHJlcXVpcmUoJy4vLi4vdmlld3MvcHJpdmFjeS1wcmFjdGljZXMuZXM2LmpzJylcbmNvbnN0IEJyZWFrYWdlRm9ybVZpZXcgPSByZXF1aXJlKCcuLy4uL3ZpZXdzL2JyZWFrYWdlLWZvcm0uZXM2LmpzJylcbmNvbnN0IGdyYWRlU2NvcmVjYXJkVGVtcGxhdGUgPSByZXF1aXJlKCcuLy4uL3RlbXBsYXRlcy9ncmFkZS1zY29yZWNhcmQuZXM2LmpzJylcbmNvbnN0IHRyYWNrZXJOZXR3b3Jrc1RlbXBsYXRlID0gcmVxdWlyZSgnLi8uLi90ZW1wbGF0ZXMvdHJhY2tlci1uZXR3b3Jrcy5lczYuanMnKVxuY29uc3QgcHJpdmFjeVByYWN0aWNlc1RlbXBsYXRlID0gcmVxdWlyZSgnLi8uLi90ZW1wbGF0ZXMvcHJpdmFjeS1wcmFjdGljZXMuZXM2LmpzJylcbmNvbnN0IGJyZWFrYWdlRm9ybVRlbXBsYXRlID0gcmVxdWlyZSgnLi8uLi90ZW1wbGF0ZXMvYnJlYWthZ2UtZm9ybS5lczYuanMnKVxuY29uc3Qgb3Blbk9wdGlvbnNQYWdlID0gcmVxdWlyZSgnLi9taXhpbnMvb3Blbi1vcHRpb25zLXBhZ2UuZXM2LmpzJylcbmNvbnN0IGJyb3dzZXJVSVdyYXBwZXIgPSByZXF1aXJlKCcuLy4uL2Jhc2UvdWktd3JhcHBlci5lczYuanMnKVxuXG5mdW5jdGlvbiBTaXRlIChvcHMpIHtcbiAgICB0aGlzLm1vZGVsID0gb3BzLm1vZGVsXG4gICAgdGhpcy5wYWdlVmlldyA9IG9wcy5wYWdlVmlld1xuICAgIHRoaXMudGVtcGxhdGUgPSBvcHMudGVtcGxhdGVcblxuICAgIC8vIGNhY2hlICdib2R5JyBzZWxlY3RvclxuICAgIHRoaXMuJGJvZHkgPSB3aW5kb3cuJCgnYm9keScpXG5cbiAgICAvLyBnZXQgZGF0YSBmcm9tIGJhY2tncm91bmQgcHJvY2VzcywgdGhlbiByZS1yZW5kZXIgdGVtcGxhdGUgd2l0aCBpdFxuICAgIHRoaXMubW9kZWwuZ2V0QmFja2dyb3VuZFRhYkRhdGEoKS50aGVuKCgpID0+IHtcbiAgICAgICAgaWYgKHRoaXMubW9kZWwudGFiICYmXG4gICAgICAgICAgICAgICAgKHRoaXMubW9kZWwudGFiLnN0YXR1cyA9PT0gJ2NvbXBsZXRlJyB8fCB0aGlzLm1vZGVsLmRvbWFpbiA9PT0gJ25ldyB0YWInKSkge1xuICAgICAgICAgICAgLy8gcmVuZGVyIHRlbXBsYXRlIGZvciB0aGUgZmlyc3QgdGltZSBoZXJlXG4gICAgICAgICAgICBQYXJlbnQuY2FsbCh0aGlzLCBvcHMpXG4gICAgICAgICAgICB0aGlzLm1vZGVsLmZldGNoKHsgZmlyZVBpeGVsOiAnZXAnIH0pXG4gICAgICAgICAgICB0aGlzLl9zZXR1cCgpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyB0aGUgdGltZW91dCBoZWxwcyBidWZmZXIgdGhlIHJlLXJlbmRlciBjeWNsZSBkdXJpbmcgaGVhdnlcbiAgICAgICAgICAgIC8vIHBhZ2UgbG9hZHMgd2l0aCBsb3RzIG9mIHRyYWNrZXJzXG4gICAgICAgICAgICBQYXJlbnQuY2FsbCh0aGlzLCBvcHMpXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMucmVyZW5kZXIoKSwgNzUwKVxuICAgICAgICB9XG4gICAgfSlcbn1cblxuU2l0ZS5wcm90b3R5cGUgPSB3aW5kb3cuJC5leHRlbmQoe30sXG4gICAgUGFyZW50LnByb3RvdHlwZSxcbiAgICBvcGVuT3B0aW9uc1BhZ2UsXG4gICAge1xuICAgICAgICBfb25XaGl0ZWxpc3RDbGljazogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLiRib2R5Lmhhc0NsYXNzKCdpcy1kaXNhYmxlZCcpKSByZXR1cm5cbiAgICAgICAgICAgIGlmICh0aGlzLiRwcm90ZWN0aW9ucm93Lmhhc0NsYXNzKCdpcy1kaXNhYmxlZCcpKSByZXR1cm5cblxuICAgICAgICAgICAgdGhpcy5tb2RlbC50b2dnbGVXaGl0ZWxpc3QoKVxuICAgICAgICAgICAgY29uc3Qgd2hpdGVsaXN0ZWQgPSB0aGlzLm1vZGVsLmlzV2hpdGVsaXN0ZWRcbiAgICAgICAgICAgIHRoaXMuX3Nob3dXaGl0ZWxpc3RlZFN0YXR1c01lc3NhZ2UoIXdoaXRlbGlzdGVkKVxuXG4gICAgICAgICAgICBpZiAod2hpdGVsaXN0ZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zaG93QnJlYWthZ2VDb25maXJtYXRpb24oKVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8vIElmIHdlIGp1c3Qgd2hpdGVsaXN0ZWQgYSBzaXRlLCBzaG93IGEgbWVzc2FnZSBicmllZmx5IGJlZm9yZSByZWxvYWRpbmdcbiAgICAgICAgLy8gb3RoZXJ3aXNlIGp1c3QgcmVsb2FkIHRoZSB0YWIgYW5kIGNsb3NlIHRoZSBwb3B1cFxuICAgICAgICBfc2hvd1doaXRlbGlzdGVkU3RhdHVzTWVzc2FnZTogZnVuY3Rpb24gKHJlbG9hZCkge1xuICAgICAgICAgICAgY29uc3QgaXNUcmFuc3BhcmVudENsYXNzID0gJ2lzLXRyYW5zcGFyZW50J1xuICAgICAgICAgICAgLy8gV2FpdCBmb3IgdGhlIHJlcmVuZGVyaW5nIHRvIGJlIGRvbmVcbiAgICAgICAgICAgIC8vIDEwbXMgdGltZW91dCBpcyB0aGUgbWluaW11bSB0byByZW5kZXIgdGhlIHRyYW5zaXRpb24gc21vb3RobHlcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy4kd2hpdGVsaXN0c3RhdHVzLnJlbW92ZUNsYXNzKGlzVHJhbnNwYXJlbnRDbGFzcyksIDEwKVxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLiRwcm90ZWN0aW9uLmFkZENsYXNzKGlzVHJhbnNwYXJlbnRDbGFzcyksIDEwKVxuXG4gICAgICAgICAgICBpZiAocmVsb2FkKSB7XG4gICAgICAgICAgICAgICAgLy8gV2FpdCBhIGJpdCBtb3JlIGJlZm9yZSBjbG9zaW5nIHRoZSBwb3B1cCBhbmQgcmVsb2FkaW5nIHRoZSB0YWJcbiAgICAgICAgICAgICAgICB0aGlzLmNsb3NlUG9wdXBBbmRSZWxvYWQoMTUwMClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvLyBOT1RFOiBhZnRlciAuX3NldHVwKCkgaXMgY2FsbGVkIHRoaXMgdmlldyBsaXN0ZW5zIGZvciBjaGFuZ2VzIHRvXG4gICAgICAgIC8vIHNpdGUgbW9kZWwgYW5kIHJlLXJlbmRlcnMgZXZlcnkgdGltZSBtb2RlbCBwcm9wZXJ0aWVzIGNoYW5nZVxuICAgICAgICBfc2V0dXA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdbc2l0ZSB2aWV3XSBfc2V0dXAoKScpXG4gICAgICAgICAgICB0aGlzLl9jYWNoZUVsZW1zKCcuanMtc2l0ZScsIFtcbiAgICAgICAgICAgICAgICAndG9nZ2xlJyxcbiAgICAgICAgICAgICAgICAncHJvdGVjdGlvbicsXG4gICAgICAgICAgICAgICAgJ3Byb3RlY3Rpb24tcm93JyxcbiAgICAgICAgICAgICAgICAnd2hpdGVsaXN0LXN0YXR1cycsXG4gICAgICAgICAgICAgICAgJ3Nob3ctYWxsLXRyYWNrZXJzJyxcbiAgICAgICAgICAgICAgICAnc2hvdy1wYWdlLXRyYWNrZXJzJyxcbiAgICAgICAgICAgICAgICAnbWFuYWdlLXdoaXRlbGlzdCcsXG4gICAgICAgICAgICAgICAgJ21hbmFnZS13aGl0ZWxpc3QtbGknLFxuICAgICAgICAgICAgICAgICdyZXBvcnQtYnJva2VuJyxcbiAgICAgICAgICAgICAgICAncHJpdmFjeS1wcmFjdGljZXMnLFxuICAgICAgICAgICAgICAgICdjb25maXJtLWJyZWFrYWdlLWxpJyxcbiAgICAgICAgICAgICAgICAnY29uZmlybS1icmVha2FnZScsXG4gICAgICAgICAgICAgICAgJ2NvbmZpcm0tYnJlYWthZ2UteWVzJyxcbiAgICAgICAgICAgICAgICAnY29uZmlybS1icmVha2FnZS1ubycsXG4gICAgICAgICAgICAgICAgJ2NvbmZpcm0tYnJlYWthZ2UtbWVzc2FnZSdcbiAgICAgICAgICAgIF0pXG5cbiAgICAgICAgICAgIHRoaXMuJGdyYWRlc2NvcmVjYXJkID0gdGhpcy4kKCcuanMtaGVyby1vcGVuJylcblxuICAgICAgICAgICAgdGhpcy5iaW5kRXZlbnRzKFtcbiAgICAgICAgICAgICAgICBbdGhpcy4kdG9nZ2xlLCAnY2xpY2snLCB0aGlzLl9vbldoaXRlbGlzdENsaWNrXSxcbiAgICAgICAgICAgICAgICBbdGhpcy4kc2hvd3BhZ2V0cmFja2VycywgJ2NsaWNrJywgdGhpcy5fc2hvd1BhZ2VUcmFja2Vyc10sXG4gICAgICAgICAgICAgICAgW3RoaXMuJHByaXZhY3lwcmFjdGljZXMsICdjbGljaycsIHRoaXMuX3Nob3dQcml2YWN5UHJhY3RpY2VzXSxcbiAgICAgICAgICAgICAgICBbdGhpcy4kY29uZmlybWJyZWFrYWdleWVzLCAnY2xpY2snLCB0aGlzLl9vbkNvbmZpcm1Ccm9rZW5DbGlja10sXG4gICAgICAgICAgICAgICAgW3RoaXMuJGNvbmZpcm1icmVha2FnZW5vLCAnY2xpY2snLCB0aGlzLl9vbkNvbmZpcm1Ob3RCcm9rZW5DbGlja10sXG4gICAgICAgICAgICAgICAgW3RoaXMuJGdyYWRlc2NvcmVjYXJkLCAnY2xpY2snLCB0aGlzLl9zaG93R3JhZGVTY29yZWNhcmRdLFxuICAgICAgICAgICAgICAgIFt0aGlzLiRtYW5hZ2V3aGl0ZWxpc3QsICdjbGljaycsIHRoaXMuX29uTWFuYWdlV2hpdGVsaXN0Q2xpY2tdLFxuICAgICAgICAgICAgICAgIFt0aGlzLiRyZXBvcnRicm9rZW4sICdjbGljaycsIHRoaXMuX29uUmVwb3J0QnJva2VuU2l0ZUNsaWNrXSxcbiAgICAgICAgICAgICAgICBbdGhpcy5zdG9yZS5zdWJzY3JpYmUsICdjaGFuZ2U6c2l0ZScsIHRoaXMucmVyZW5kZXJdXG4gICAgICAgICAgICBdKVxuICAgICAgICB9LFxuXG4gICAgICAgIHJlcmVuZGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBQcmV2ZW50IHJlcmVuZGVycyB3aGVuIGNvbmZpcm1hdGlvbiBmb3JtIGlzIGFjdGl2ZSxcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSBmb3JtIHdpbGwgZGlzYXBwZWFyIG9uIHJlcmVuZGVyLlxuICAgICAgICAgICAgaWYgKHRoaXMuJGJvZHkuaGFzQ2xhc3MoJ2NvbmZpcm1hdGlvbi1hY3RpdmUnKSkgcmV0dXJuXG5cbiAgICAgICAgICAgIGlmICh0aGlzLm1vZGVsICYmIHRoaXMubW9kZWwuZGlzYWJsZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuJGJvZHkuaGFzQ2xhc3MoJ2lzLWRpc2FibGVkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJyRib2R5LmFkZENsYXNzKCkgaXMtZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLiRib2R5LmFkZENsYXNzKCdpcy1kaXNhYmxlZCcpXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3JlcmVuZGVyKClcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2V0dXAoKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kYm9keS5yZW1vdmVDbGFzcygnaXMtZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgIHRoaXMudW5iaW5kRXZlbnRzKClcbiAgICAgICAgICAgICAgICB0aGlzLl9yZXJlbmRlcigpXG4gICAgICAgICAgICAgICAgdGhpcy5fc2V0dXAoKVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIF9vbk1hbmFnZVdoaXRlbGlzdENsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5tb2RlbCAmJiB0aGlzLm1vZGVsLmRpc2FibGVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMub3Blbk9wdGlvbnNQYWdlKClcbiAgICAgICAgfSxcblxuICAgICAgICBfb25SZXBvcnRCcm9rZW5TaXRlQ2xpY2s6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICAgICAgICAgaWYgKHRoaXMubW9kZWwgJiYgdGhpcy5tb2RlbC5kaXNhYmxlZCkge1xuICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnNob3dCcmVha2FnZUZvcm0oJ3JlcG9ydEJyb2tlblNpdGUnKVxuICAgICAgICB9LFxuXG4gICAgICAgIF9vbkNvbmZpcm1Ccm9rZW5DbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29uc3QgaXNIaWRkZW5DbGFzcyA9ICdpcy1oaWRkZW4nXG4gICAgICAgICAgICB0aGlzLiRtYW5hZ2V3aGl0ZWxpc3RsaS5yZW1vdmVDbGFzcyhpc0hpZGRlbkNsYXNzKVxuICAgICAgICAgICAgdGhpcy4kY29uZmlybWJyZWFrYWdlbGkuYWRkQ2xhc3MoaXNIaWRkZW5DbGFzcylcbiAgICAgICAgICAgIHRoaXMuJGJvZHkucmVtb3ZlQ2xhc3MoJ2NvbmZpcm1hdGlvbi1hY3RpdmUnKVxuICAgICAgICAgICAgdGhpcy5zaG93QnJlYWthZ2VGb3JtKCd0b2dnbGUnKVxuICAgICAgICB9LFxuXG4gICAgICAgIF9vbkNvbmZpcm1Ob3RCcm9rZW5DbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29uc3QgaXNUcmFuc3BhcmVudENsYXNzID0gJ2lzLXRyYW5zcGFyZW50J1xuICAgICAgICAgICAgdGhpcy4kY29uZmlybWJyZWFrYWdlbWVzc2FnZS5yZW1vdmVDbGFzcyhpc1RyYW5zcGFyZW50Q2xhc3MpXG4gICAgICAgICAgICB0aGlzLiRjb25maXJtYnJlYWthZ2UuYWRkQ2xhc3MoaXNUcmFuc3BhcmVudENsYXNzKVxuICAgICAgICAgICAgdGhpcy4kYm9keS5yZW1vdmVDbGFzcygnY29uZmlybWF0aW9uLWFjdGl2ZScpXG4gICAgICAgICAgICB0aGlzLmNsb3NlUG9wdXBBbmRSZWxvYWQoMTUwMClcbiAgICAgICAgfSxcblxuICAgICAgICBfc2hvd0JyZWFrYWdlQ29uZmlybWF0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLiRib2R5LmFkZENsYXNzKCdjb25maXJtYXRpb24tYWN0aXZlJylcbiAgICAgICAgICAgIHRoaXMuJGNvbmZpcm1icmVha2FnZWxpLnJlbW92ZUNsYXNzKCdpcy1oaWRkZW4nKVxuICAgICAgICAgICAgdGhpcy4kbWFuYWdld2hpdGVsaXN0bGkuYWRkQ2xhc3MoJ2lzLWhpZGRlbicpXG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gcGFzcyBjbGlja1NvdXJjZSB0byBzcGVjaWZ5IHdoZXRoZXIgcGFnZSBzaG91bGQgcmVsb2FkXG4gICAgICAgIC8vIGFmdGVyIHN1Ym1pdHRpbmcgYnJlYWthZ2UgZm9ybS5cbiAgICAgICAgc2hvd0JyZWFrYWdlRm9ybTogZnVuY3Rpb24gKGNsaWNrU291cmNlKSB7XG4gICAgICAgICAgICB0aGlzLnZpZXdzLmJyZWFrYWdlRm9ybSA9IG5ldyBCcmVha2FnZUZvcm1WaWV3KHtcbiAgICAgICAgICAgICAgICBzaXRlVmlldzogdGhpcyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogYnJlYWthZ2VGb3JtVGVtcGxhdGUsXG4gICAgICAgICAgICAgICAgbW9kZWw6IHRoaXMubW9kZWwsXG4gICAgICAgICAgICAgICAgYXBwZW5kVG86IHRoaXMuJGJvZHksXG4gICAgICAgICAgICAgICAgY2xpY2tTb3VyY2U6IGNsaWNrU291cmNlXG4gICAgICAgICAgICB9KVxuICAgICAgICB9LFxuXG4gICAgICAgIF9zaG93UGFnZVRyYWNrZXJzOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuJGJvZHkuaGFzQ2xhc3MoJ2lzLWRpc2FibGVkJykpIHJldHVyblxuICAgICAgICAgICAgdGhpcy5tb2RlbC5mZXRjaCh7IGZpcmVQaXhlbDogJ2VwbicgfSlcbiAgICAgICAgICAgIHRoaXMudmlld3Muc2xpZGluZ1N1YnZpZXcgPSBuZXcgVHJhY2tlck5ldHdvcmtzVmlldyh7XG4gICAgICAgICAgICAgICAgdGVtcGxhdGU6IHRyYWNrZXJOZXR3b3Jrc1RlbXBsYXRlXG4gICAgICAgICAgICB9KVxuICAgICAgICB9LFxuXG4gICAgICAgIF9zaG93UHJpdmFjeVByYWN0aWNlczogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLm1vZGVsLmRpc2FibGVkKSByZXR1cm5cbiAgICAgICAgICAgIHRoaXMubW9kZWwuZmV0Y2goeyBmaXJlUGl4ZWw6ICdlcHAnIH0pXG5cbiAgICAgICAgICAgIHRoaXMudmlld3MucHJpdmFjeVByYWN0aWNlcyA9IG5ldyBQcml2YWN5UHJhY3RpY2VzVmlldyh7XG4gICAgICAgICAgICAgICAgdGVtcGxhdGU6IHByaXZhY3lQcmFjdGljZXNUZW1wbGF0ZSxcbiAgICAgICAgICAgICAgICBtb2RlbDogdGhpcy5tb2RlbFxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSxcblxuICAgICAgICBfc2hvd0dyYWRlU2NvcmVjYXJkOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMubW9kZWwuZGlzYWJsZWQpIHJldHVyblxuICAgICAgICAgICAgdGhpcy5tb2RlbC5mZXRjaCh7IGZpcmVQaXhlbDogJ2VwYycgfSlcblxuICAgICAgICAgICAgdGhpcy52aWV3cy5ncmFkZVNjb3JlY2FyZCA9IG5ldyBHcmFkZVNjb3JlY2FyZFZpZXcoe1xuICAgICAgICAgICAgICAgIHRlbXBsYXRlOiBncmFkZVNjb3JlY2FyZFRlbXBsYXRlLFxuICAgICAgICAgICAgICAgIG1vZGVsOiB0aGlzLm1vZGVsXG4gICAgICAgICAgICB9KVxuICAgICAgICB9LFxuXG4gICAgICAgIGNsb3NlUG9wdXBBbmRSZWxvYWQ6IGZ1bmN0aW9uIChkZWxheSkge1xuICAgICAgICAgICAgZGVsYXkgPSBkZWxheSB8fCAwXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBicm93c2VyVUlXcmFwcGVyLnJlbG9hZFRhYih0aGlzLm1vZGVsLnRhYi5pZClcbiAgICAgICAgICAgICAgICBicm93c2VyVUlXcmFwcGVyLmNsb3NlUG9wdXAoKVxuICAgICAgICAgICAgfSwgZGVsYXkpXG4gICAgICAgIH1cbiAgICB9XG4pXG5cbm1vZHVsZS5leHBvcnRzID0gU2l0ZVxuIiwiY29uc3QgUGFyZW50ID0gd2luZG93LkRERy5iYXNlLlZpZXdcblxuZnVuY3Rpb24gU2xpZGluZ1N1YnZpZXcgKG9wcykge1xuICAgIG9wcy5hcHBlbmRUbyA9IHdpbmRvdy4kKCcuc2xpZGluZy1zdWJ2aWV3LS1yb290JylcbiAgICBQYXJlbnQuY2FsbCh0aGlzLCBvcHMpXG5cbiAgICB0aGlzLiRyb290ID0gd2luZG93LiQoJy5zbGlkaW5nLXN1YnZpZXctLXJvb3QnKVxuICAgIHRoaXMuJHJvb3QuYWRkQ2xhc3MoJ3NsaWRpbmctc3Vidmlldy0tb3BlbicpXG5cbiAgICB0aGlzLnNldHVwQ2xvc2UoKVxufVxuXG5TbGlkaW5nU3Vidmlldy5wcm90b3R5cGUgPSB3aW5kb3cuJC5leHRlbmQoe30sXG4gICAgUGFyZW50LnByb3RvdHlwZSxcbiAgICB7XG5cbiAgICAgICAgc2V0dXBDbG9zZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5fY2FjaGVFbGVtcygnLmpzLXNsaWRpbmctc3VidmlldycsIFsnY2xvc2UnXSlcbiAgICAgICAgICAgIHRoaXMuYmluZEV2ZW50cyhbXG4gICAgICAgICAgICAgICAgW3RoaXMuJGNsb3NlLCAnY2xpY2snLCB0aGlzLl9kZXN0cm95XVxuICAgICAgICAgICAgXSlcbiAgICAgICAgfSxcblxuICAgICAgICBfZGVzdHJveTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy4kcm9vdC5yZW1vdmVDbGFzcygnc2xpZGluZy1zdWJ2aWV3LS1vcGVuJylcbiAgICAgICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmRlc3Ryb3koKVxuICAgICAgICAgICAgfSwgNDAwKSAvLyA0MDBtcyA9IDAuMzVzIGluIC5zbGlkaW5nLXN1YnZpZXctLXJvb3QgdHJhbnNpdGlvbiArIDUwbXMgcGFkZGluZ1xuICAgICAgICB9XG4gICAgfVxuKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNsaWRpbmdTdWJ2aWV3XG4iLCJjb25zdCBQYXJlbnQgPSB3aW5kb3cuRERHLmJhc2UuVmlld1xuY29uc3QgVG9wQmxvY2tlZEZ1bGxWaWV3ID0gcmVxdWlyZSgnLi90b3AtYmxvY2tlZC5lczYuanMnKVxuY29uc3QgdG9wQmxvY2tlZEZ1bGxUZW1wbGF0ZSA9IHJlcXVpcmUoJy4vLi4vdGVtcGxhdGVzL3RvcC1ibG9ja2VkLmVzNi5qcycpXG5jb25zdCBUT1BfQkxPQ0tFRF9DTEFTUyA9ICdoYXMtdG9wLWJsb2NrZWQtLXRydW5jYXRlZCdcblxuZnVuY3Rpb24gVHJ1bmNhdGVkVG9wQmxvY2tlZCAob3BzKSB7XG4gICAgdGhpcy5tb2RlbCA9IG9wcy5tb2RlbFxuICAgIHRoaXMucGFnZVZpZXcgPSBvcHMucGFnZVZpZXdcbiAgICB0aGlzLnRlbXBsYXRlID0gb3BzLnRlbXBsYXRlXG5cbiAgICB0aGlzLm1vZGVsLmdldFRvcEJsb2NrZWQoKS50aGVuKCgpID0+IHtcbiAgICAgICAgUGFyZW50LmNhbGwodGhpcywgb3BzKVxuICAgICAgICB0aGlzLl9zZXR1cCgpXG4gICAgfSlcblxuICAgIHRoaXMuYmluZEV2ZW50cyhbXG4gICAgICAgIFt0aGlzLm1vZGVsLnN0b3JlLnN1YnNjcmliZSwgJ2FjdGlvbjpiYWNrZ3JvdW5kTWVzc2FnZScsIHRoaXMuaGFuZGxlQmFja2dyb3VuZE1zZ11cbiAgICBdKVxufVxuXG5UcnVuY2F0ZWRUb3BCbG9ja2VkLnByb3RvdHlwZSA9IHdpbmRvdy4kLmV4dGVuZCh7fSxcbiAgICBQYXJlbnQucHJvdG90eXBlLFxuICAgIHtcblxuICAgICAgICBfc2VlQWxsQ2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMubW9kZWwuZmV0Y2goeyBmaXJlUGl4ZWw6ICdlcHMnIH0pXG4gICAgICAgICAgICB0aGlzLnZpZXdzLnNsaWRpbmdTdWJ2aWV3ID0gbmV3IFRvcEJsb2NrZWRGdWxsVmlldyh7XG4gICAgICAgICAgICAgICAgdGVtcGxhdGU6IHRvcEJsb2NrZWRGdWxsVGVtcGxhdGUsXG4gICAgICAgICAgICAgICAgbnVtSXRlbXM6IDEwXG4gICAgICAgICAgICB9KVxuICAgICAgICB9LFxuXG4gICAgICAgIF9zZXR1cDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5fY2FjaGVFbGVtcygnLmpzLXRvcC1ibG9ja2VkJywgWydncmFwaC1iYXItZmcnLCAncGN0JywgJ3NlZS1hbGwnXSlcbiAgICAgICAgICAgIHRoaXMuYmluZEV2ZW50cyhbXG4gICAgICAgICAgICAgICAgW3RoaXMuJHNlZWFsbCwgJ2NsaWNrJywgdGhpcy5fc2VlQWxsQ2xpY2tdXG4gICAgICAgICAgICBdKVxuICAgICAgICAgICAgaWYgKHdpbmRvdy4kKCcudG9wLWJsb2NrZWQtLXRydW5jYXRlZCcpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy4kKCdodG1sJykuYWRkQ2xhc3MoVE9QX0JMT0NLRURfQ0xBU1MpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgcmVyZW5kZXJMaXN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLl9yZXJlbmRlcigpXG4gICAgICAgICAgICB0aGlzLl9zZXR1cCgpXG4gICAgICAgIH0sXG5cbiAgICAgICAgaGFuZGxlQmFja2dyb3VuZE1zZzogZnVuY3Rpb24gKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIGlmICghbWVzc2FnZSB8fCAhbWVzc2FnZS5hY3Rpb24pIHJldHVyblxuXG4gICAgICAgICAgICBpZiAobWVzc2FnZS5hY3Rpb24gPT09ICdkaWRSZXNldFRyYWNrZXJzRGF0YScpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1vZGVsLnJlc2V0KClcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMucmVyZW5kZXJMaXN0KCksIDc1MClcbiAgICAgICAgICAgICAgICB0aGlzLnJlcmVuZGVyTGlzdCgpXG4gICAgICAgICAgICAgICAgd2luZG93LiQoJ2h0bWwnKS5yZW1vdmVDbGFzcyhUT1BfQkxPQ0tFRF9DTEFTUylcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbilcblxubW9kdWxlLmV4cG9ydHMgPSBUcnVuY2F0ZWRUb3BCbG9ja2VkXG4iLCJjb25zdCBQYXJlbnRTbGlkaW5nU3VidmlldyA9IHJlcXVpcmUoJy4vc2xpZGluZy1zdWJ2aWV3LmVzNi5qcycpXG5jb25zdCBhbmltYXRlR3JhcGhCYXJzID0gcmVxdWlyZSgnLi9taXhpbnMvYW5pbWF0ZS1ncmFwaC1iYXJzLmVzNi5qcycpXG5jb25zdCBUb3BCbG9ja2VkTW9kZWwgPSByZXF1aXJlKCcuLy4uL21vZGVscy90b3AtYmxvY2tlZC5lczYuanMnKVxuXG5mdW5jdGlvbiBUb3BCbG9ja2VkIChvcHMpIHtcbiAgICAvLyBtb2RlbCBkYXRhIGlzIGFzeW5jXG4gICAgdGhpcy5tb2RlbCA9IG51bGxcbiAgICB0aGlzLm51bUl0ZW1zID0gb3BzLm51bUl0ZW1zXG4gICAgdGhpcy50ZW1wbGF0ZSA9IG9wcy50ZW1wbGF0ZVxuICAgIFBhcmVudFNsaWRpbmdTdWJ2aWV3LmNhbGwodGhpcywgb3BzKVxuXG4gICAgdGhpcy5zZXR1cENsb3NlKClcbiAgICB0aGlzLnJlbmRlckFzeW5jQ29udGVudCgpXG5cbiAgICB0aGlzLmJpbmRFdmVudHMoW1xuICAgICAgICBbdGhpcy5tb2RlbC5zdG9yZS5zdWJzY3JpYmUsICdhY3Rpb246YmFja2dyb3VuZE1lc3NhZ2UnLCB0aGlzLmhhbmRsZUJhY2tncm91bmRNc2ddXG4gICAgXSlcbn1cblxuVG9wQmxvY2tlZC5wcm90b3R5cGUgPSB3aW5kb3cuJC5leHRlbmQoe30sXG4gICAgUGFyZW50U2xpZGluZ1N1YnZpZXcucHJvdG90eXBlLFxuICAgIGFuaW1hdGVHcmFwaEJhcnMsXG4gICAge1xuXG4gICAgICAgIHNldHVwOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLiRjb250ZW50ID0gdGhpcy4kZWwuZmluZCgnLmpzLXRvcC1ibG9ja2VkLWNvbnRlbnQnKVxuICAgICAgICAgICAgLy8gbGlzdGVuZXIgZm9yIHJlc2V0IHN0YXRzIGNsaWNrXG4gICAgICAgICAgICB0aGlzLiRyZXNldCA9IHRoaXMuJGVsLmZpbmQoJy5qcy1yZXNldC10cmFja2Vycy1kYXRhJylcbiAgICAgICAgICAgIHRoaXMuYmluZEV2ZW50cyhbXG4gICAgICAgICAgICAgICAgW3RoaXMuJHJlc2V0LCAnY2xpY2snLCB0aGlzLnJlc2V0VHJhY2tlcnNTdGF0c11cbiAgICAgICAgICAgIF0pXG4gICAgICAgIH0sXG5cbiAgICAgICAgcmVuZGVyQXN5bmNDb250ZW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjb25zdCByYW5kb20gPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAxMDAwMDApXG4gICAgICAgICAgICB0aGlzLm1vZGVsID0gbmV3IFRvcEJsb2NrZWRNb2RlbCh7XG4gICAgICAgICAgICAgICAgbW9kZWxOYW1lOiAndG9wQmxvY2tlZCcgKyByYW5kb20sXG4gICAgICAgICAgICAgICAgbnVtQ29tcGFuaWVzOiB0aGlzLm51bUl0ZW1zXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgdGhpcy5tb2RlbC5nZXRUb3BCbG9ja2VkKCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGVudCA9IHRoaXMudGVtcGxhdGUoKVxuICAgICAgICAgICAgICAgIHRoaXMuJGVsLmFwcGVuZChjb250ZW50KVxuICAgICAgICAgICAgICAgIHRoaXMuc2V0dXAoKVxuXG4gICAgICAgICAgICAgICAgLy8gYW5pbWF0ZSBncmFwaCBiYXJzIGFuZCBwY3RcbiAgICAgICAgICAgICAgICB0aGlzLiRncmFwaGJhcmZnID0gdGhpcy4kZWwuZmluZCgnLmpzLXRvcC1ibG9ja2VkLWdyYXBoLWJhci1mZycpXG4gICAgICAgICAgICAgICAgdGhpcy4kcGN0ID0gdGhpcy4kZWwuZmluZCgnLmpzLXRvcC1ibG9ja2VkLXBjdCcpXG4gICAgICAgICAgICAgICAgdGhpcy5hbmltYXRlR3JhcGhCYXJzKClcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0sXG5cbiAgICAgICAgcmVzZXRUcmFja2Vyc1N0YXRzOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgaWYgKGUpIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgICAgdGhpcy5tb2RlbC5mZXRjaCh7IHJlc2V0VHJhY2tlcnNEYXRhOiB0cnVlIH0pXG4gICAgICAgIH0sXG5cbiAgICAgICAgaGFuZGxlQmFja2dyb3VuZE1zZzogZnVuY3Rpb24gKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIGlmICghbWVzc2FnZSB8fCAhbWVzc2FnZS5hY3Rpb24pIHJldHVyblxuXG4gICAgICAgICAgICBpZiAobWVzc2FnZS5hY3Rpb24gPT09ICdkaWRSZXNldFRyYWNrZXJzRGF0YScpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1vZGVsLnJlc2V0KG1lc3NhZ2UuZGF0YSlcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50ID0gdGhpcy50ZW1wbGF0ZSgpXG4gICAgICAgICAgICAgICAgdGhpcy4kY29udGVudC5yZXBsYWNlV2l0aChjb250ZW50KVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFRvcEJsb2NrZWRcbiIsImNvbnN0IFBhcmVudFNsaWRpbmdTdWJ2aWV3ID0gcmVxdWlyZSgnLi9zbGlkaW5nLXN1YnZpZXcuZXM2LmpzJylcbmNvbnN0IGhlcm9UZW1wbGF0ZSA9IHJlcXVpcmUoJy4vLi4vdGVtcGxhdGVzL3NoYXJlZC9oZXJvLmVzNi5qcycpXG5jb25zdCBDb21wYW55TGlzdE1vZGVsID0gcmVxdWlyZSgnLi8uLi9tb2RlbHMvc2l0ZS1jb21wYW55LWxpc3QuZXM2LmpzJylcbmNvbnN0IFNpdGVNb2RlbCA9IHJlcXVpcmUoJy4vLi4vbW9kZWxzL3NpdGUuZXM2LmpzJylcbmNvbnN0IHRyYWNrZXJOZXR3b3Jrc0ljb25UZW1wbGF0ZSA9IHJlcXVpcmUoJy4vLi4vdGVtcGxhdGVzL3NoYXJlZC90cmFja2VyLW5ldHdvcmstaWNvbi5lczYuanMnKVxuY29uc3QgdHJhY2tlck5ldHdvcmtzVGV4dFRlbXBsYXRlID0gcmVxdWlyZSgnLi8uLi90ZW1wbGF0ZXMvc2hhcmVkL3RyYWNrZXItbmV0d29ya3MtdGV4dC5lczYuanMnKVxuXG5mdW5jdGlvbiBUcmFja2VyTmV0d29ya3MgKG9wcykge1xuICAgIC8vIG1vZGVsIGRhdGEgaXMgYXN5bmNcbiAgICB0aGlzLm1vZGVsID0gbnVsbFxuICAgIHRoaXMuY3VycmVudE1vZGVsTmFtZSA9IG51bGxcbiAgICB0aGlzLmN1cnJlbnRTaXRlTW9kZWxOYW1lID0gbnVsbFxuICAgIHRoaXMudGVtcGxhdGUgPSBvcHMudGVtcGxhdGVcbiAgICBQYXJlbnRTbGlkaW5nU3Vidmlldy5jYWxsKHRoaXMsIG9wcylcblxuICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy5fcmVyZW5kZXIoKSwgNzUwKVxuICAgIHRoaXMucmVuZGVyQXN5bmNDb250ZW50KClcbn1cblxuVHJhY2tlck5ldHdvcmtzLnByb3RvdHlwZSA9IHdpbmRvdy4kLmV4dGVuZCh7fSxcbiAgICBQYXJlbnRTbGlkaW5nU3Vidmlldy5wcm90b3R5cGUsXG4gICAge1xuXG4gICAgICAgIHNldHVwOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLl9jYWNoZUVsZW1zKCcuanMtdHJhY2tlci1uZXR3b3JrcycsIFtcbiAgICAgICAgICAgICAgICAnaGVybycsXG4gICAgICAgICAgICAgICAgJ2RldGFpbHMnXG4gICAgICAgICAgICBdKVxuXG4gICAgICAgICAgICAvLyBzaXRlIHJhdGluZyBhcnJpdmVzIGFzeW5jXG4gICAgICAgICAgICB0aGlzLmJpbmRFdmVudHMoW1tcbiAgICAgICAgICAgICAgICB0aGlzLnN0b3JlLnN1YnNjcmliZSxcbiAgICAgICAgICAgICAgICBgY2hhbmdlOiR7dGhpcy5jdXJyZW50U2l0ZU1vZGVsTmFtZX1gLFxuICAgICAgICAgICAgICAgIHRoaXMuX3JlcmVuZGVyXG4gICAgICAgICAgICBdXSlcbiAgICAgICAgfSxcblxuICAgICAgICByZW5kZXJBc3luY0NvbnRlbnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbnN0IHJhbmRvbSA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDEwMDAwMClcbiAgICAgICAgICAgIHRoaXMuY3VycmVudE1vZGVsTmFtZSA9ICdzaXRlQ29tcGFueUxpc3QnICsgcmFuZG9tXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRTaXRlTW9kZWxOYW1lID0gJ3NpdGUnICsgcmFuZG9tXG5cbiAgICAgICAgICAgIHRoaXMubW9kZWwgPSBuZXcgQ29tcGFueUxpc3RNb2RlbCh7XG4gICAgICAgICAgICAgICAgbW9kZWxOYW1lOiB0aGlzLmN1cnJlbnRNb2RlbE5hbWVcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB0aGlzLm1vZGVsLmZldGNoQXN5bmNEYXRhKCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5tb2RlbC5zaXRlID0gbmV3IFNpdGVNb2RlbCh7XG4gICAgICAgICAgICAgICAgICAgIG1vZGVsTmFtZTogdGhpcy5jdXJyZW50U2l0ZU1vZGVsTmFtZVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgdGhpcy5tb2RlbC5zaXRlLmdldEJhY2tncm91bmRUYWJEYXRhKCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSB0aGlzLnRlbXBsYXRlKClcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kZWwuYXBwZW5kKGNvbnRlbnQpXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dXAoKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHVwQ2xvc2UoKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9LFxuXG4gICAgICAgIF9yZW5kZXJIZXJvVGVtcGxhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLm1vZGVsLnNpdGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0cmFja2VyTmV0d29ya3NJY29uTmFtZSA9IHRyYWNrZXJOZXR3b3Jrc0ljb25UZW1wbGF0ZShcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2RlbC5zaXRlLnNpdGVSYXRpbmcsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW9kZWwuc2l0ZS5pc0FsbG93bGlzdGVkLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vZGVsLnNpdGUudG90YWxUcmFja2VyTmV0d29ya3NDb3VudFxuICAgICAgICAgICAgICAgIClcblxuICAgICAgICAgICAgICAgIGNvbnN0IHRyYWNrZXJOZXR3b3Jrc1RleHQgPSB0cmFja2VyTmV0d29ya3NUZXh0VGVtcGxhdGUodGhpcy5tb2RlbC5zaXRlLCBmYWxzZSlcblxuICAgICAgICAgICAgICAgIHRoaXMuJGhlcm8uaHRtbChoZXJvVGVtcGxhdGUoe1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXM6IHRyYWNrZXJOZXR3b3Jrc0ljb25OYW1lLFxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogdGhpcy5tb2RlbC5zaXRlLmRvbWFpbixcbiAgICAgICAgICAgICAgICAgICAgc3VidGl0bGU6IHRyYWNrZXJOZXR3b3Jrc1RleHQsXG4gICAgICAgICAgICAgICAgICAgIHNob3dDbG9zZTogdHJ1ZVxuICAgICAgICAgICAgICAgIH0pKVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIF9yZXJlbmRlcjogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGlmIChlICYmIGUuY2hhbmdlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGUuY2hhbmdlLmF0dHJpYnV0ZSA9PT0gJ2lzYU1ham9yVHJhY2tpbmdOZXR3b3JrJyB8fFxuICAgICAgICAgICAgICAgICAgICBlLmNoYW5nZS5hdHRyaWJ1dGUgPT09ICdpc1doaXRlbGlzdGVkJyB8fFxuICAgICAgICAgICAgICAgICAgICBlLmNoYW5nZS5hdHRyaWJ1dGUgPT09ICd0b3RhbFRyYWNrZXJOZXR3b3Jrc0NvdW50JyB8fFxuICAgICAgICAgICAgICAgICAgICBlLmNoYW5nZS5hdHRyaWJ1dGUgPT09ICdzaXRlUmF0aW5nJykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJIZXJvVGVtcGxhdGUoKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnVuYmluZEV2ZW50cygpXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dXAoKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHVwQ2xvc2UoKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbilcblxubW9kdWxlLmV4cG9ydHMgPSBUcmFja2VyTmV0d29ya3NcbiJdfQ==
