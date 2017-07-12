(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

/*
 * Load the abp-filter-parser node module and 
 * pre-process the easylists.
 *
 * This will be browserifyed and turned into abp.js by running 'grunt'
 */
abp = require('abp-filter-parser');

easylists = {
    privacy: {
        url: 'https://easylist.to/easylist/easyprivacy.txt',
        parsed: {}
    },
    general: {
        url: 'https://easylist.to/easylist/easylist.txt',
        whitelist: 'data/tracker_lists/general-whitelist.txt',
        parsed: {}
    }
};

/*
 * Get the list data and use abp to parse.
 * The parsed list data will be added to 
 * the easyLists object.
 */
for (var list in easylists) {
    var url = easylists[list].url;
    var listData = load.loadExtensionFile(url, '', 'external');
    var whitelistFile = easylists[list].whitelist;

    // append the whitelist entries before we process the list
    if (whitelistFile) {
        var whitelist = load.loadExtensionFile(whitelistFile);
        listData += whitelist;
    }

    abp.parse(listData, easylists[list].parsed);
}

easylists.loaded = true;

},{"abp-filter-parser":2}],2:[function(require,module,exports){
(function (global, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['exports', 'bloom-filter-js', './badFingerprints.js'], factory);
  } else if (typeof exports !== 'undefined') {
    factory(exports, require('bloom-filter-js'), require('./badFingerprints.js'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports, global.BloomFilterJS, global.badFingerprints);
    global.abpFilterParser = mod.exports;
  }
})(this, function (exports, _bloomFilterJs, _badFingerprintsJs) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true
  });
  exports.parseDomains = parseDomains;
  exports.parseOptions = parseOptions;
  exports.parseHTMLFilter = parseHTMLFilter;
  exports.parseFilter = parseFilter;
  exports.parse = parse;
  exports.matchesFilter = matchesFilter;
  exports.matches = matches;
  exports.getFingerprint = getFingerprint;

  /**
   * bitwise mask of different request types
   */
  var elementTypes = {
    SCRIPT: 1,
    IMAGE: 2,
    STYLESHEET: 4,
    OBJECT: 8,
    XMLHTTPREQUEST: 16,
    OBJECTSUBREQUEST: 32,
    SUBDOCUMENT: 64,
    DOCUMENT: 128,
    OTHER: 256
  };

  exports.elementTypes = elementTypes;
  // Maximum number of cached entries to keep for subsequent lookups
  var maxCached = 100;

  // Maximum number of URL chars to check in match clauses
  var maxUrlChars = 100;

  // Exact size for fingerprints, if you change also change fingerprintRegexs
  var fingerprintSize = 8;

  // Regexes used to create fingerprints
  // There's more than one because sometimes a fingerprint is determined to be a bad
  // one and would lead to a lot of collisions in the bloom filter). In those cases
  // we use the 2nd fingerprint.
  var fingerprintRegexs = [/.*([./&_\-=a-zA-Z0-9]{8})\$?.*/, /([./&_\-=a-zA-Z0-9]{8})\$?.*/];

  /**
   * Maps element types to type mask.
   */
  var elementTypeMaskMap = new Map([['script', elementTypes.SCRIPT], ['image', elementTypes.IMAGE], ['stylesheet', elementTypes.STYLESHEET], ['object', elementTypes.OBJECT], ['xmlhttprequest', elementTypes.XMLHTTPREQUEST], ['object-subrequest', elementTypes.OBJECTSUBREQUEST], ['subdocument', elementTypes.SUBDOCUMENT], ['document', elementTypes.DOCUMENT], ['other', elementTypes.OTHER]]);

  exports.elementTypeMaskMap = elementTypeMaskMap;
  var separatorCharacters = ':?/=^';

  /**
   * Parses the domain string using the passed in separator and
   * fills in options.
   */

  function parseDomains(input, separator, options) {
    options.domains = options.domains || [];
    options.skipDomains = options.skipDomains || [];
    var domains = input.split(separator);
    options.domains = options.domains.concat(domains.filter(function (domain) {
      return domain[0] !== '~';
    }));
    options.skipDomains = options.skipDomains.concat(domains.filter(function (domain) {
      return domain[0] === '~';
    }).map(function (domain) {
      return domain.substring(1);
    }));
  }

  /**
   * Parses options from the passed in input string
   */

  function parseOptions(input) {
    var output = {
      binaryOptions: new Set()
    };
    input.split(',').forEach(function (option) {
      option = option.trim();
      if (option.startsWith('domain=')) {
        var domainString = option.split('=')[1].trim();
        parseDomains(domainString, '|', output);
      } else {
        var optionWithoutPrefix = option[0] === '~' ? option.substring(1) : option;
        if (elementTypeMaskMap.has(optionWithoutPrefix)) {
          if (option[0] === '~') {
            output.skipElementTypeMask |= elementTypeMaskMap.get(optionWithoutPrefix);
          } else {
            output.elementTypeMask |= elementTypeMaskMap.get(optionWithoutPrefix);
          }
        }
        output.binaryOptions.add(option);
      }
    });
    return output;
  }

  /**
   * Finds the first separator character in the input string
   */
  function findFirstSeparatorChar(input, startPos) {
    for (var i = startPos; i < input.length; i++) {
      if (separatorCharacters.indexOf(input[i]) !== -1) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Parses an HTML filter and modifies the passed in parsedFilterData
   * as necessary.
   *
   * @param input: The entire input string to consider
   * @param index: Index of the first hash
   * @param parsedFilterData: The parsedFilterData object to fill
   */

  function parseHTMLFilter(input, index, parsedFilterData) {
    var domainsStr = input.substring(0, index);
    parsedFilterData.options = {};
    if (domainsStr.length > 0) {
      parseDomains(domainsStr, ',', parsedFilterData.options);
    }

    // The XOR parsedFilterData.elementHidingException is in case the rule already
    // was specified as exception handling with a prefixed @@
    parsedFilterData.isException = !!(input[index + 1] === '@' ^ parsedFilterData.isException);
    if (input[index + 1] === '@') {
      // Skip passed the first # since @# is 2 chars same as ##
      index++;
    }
    parsedFilterData.htmlRuleSelector = input.substring(index + 2);
  }

  function parseFilter(input, parsedFilterData, bloomFilter, exceptionBloomFilter) {
    input = input.trim();

    // Check for comment or nothing
    if (input.length === 0) {
      return false;
    }

    // Check for comments
    var beginIndex = 0;
    if (input[beginIndex] === '[' || input[beginIndex] === '!') {
      parsedFilterData.isComment = true;
      return false;
    }

    // Check for exception instead of filter
    parsedFilterData.isException = input[beginIndex] === '@' && input[beginIndex + 1] === '@';
    if (parsedFilterData.isException) {
      beginIndex = 2;
    }

    // Check for element hiding rules
    var index = input.indexOf('#', beginIndex);
    if (index !== -1) {
      if (input[index + 1] === '#' || input[index + 1] === '@') {
        parseHTMLFilter(input.substring(beginIndex), index - beginIndex, parsedFilterData);
        // HTML rules cannot be combined with other parsing,
        // other than @@ exception marking.
        return true;
      }
    }

    // Check for options, regex can have options too so check this before regex
    index = input.indexOf('$', beginIndex);
    if (index !== -1) {
      parsedFilterData.options = parseOptions(input.substring(index + 1));
      // Get rid of the trailing options for the rest of the parsing
      input = input.substring(0, index);
    } else {
      parsedFilterData.options = {};
    }

    // Check for a regex
    parsedFilterData.isRegex = input[beginIndex] === '/' && input[input.length - 1] === '/' && beginIndex !== input.length - 1;
    if (parsedFilterData.isRegex) {
        // check for escaped forward slashes
        if (input.match(/\/$/)) {
            parsedFilterData.data = input.slice(beginIndex + 1);
        } else {
            parsedFilterData.data = input.slice(beginIndex + 1, -1);
        }
      return true;
    }

    // Check if there's some kind of anchoring
    if (input[beginIndex] === '|') {
      // Check for an anchored domain name
      if (input[beginIndex + 1] === '|') {
        parsedFilterData.hostAnchored = true;
        var indexOfSep = findFirstSeparatorChar(input, beginIndex + 1);
        if (indexOfSep === -1) {
          indexOfSep = input.length;
        }
        beginIndex += 2;
        parsedFilterData.host = input.substring(beginIndex, indexOfSep);
      } else {
        parsedFilterData.leftAnchored = true;
        beginIndex++;
      }
    }
    if (input[input.length - 1] === '|') {
      parsedFilterData.rightAnchored = true;
      input = input.substring(0, input.length - 1);
    }

    parsedFilterData.data = input.substring(beginIndex) || '*';
    // Use the host bloom filter if the filter is a host anchored filter rule with no other data
    if (exceptionBloomFilter && parsedFilterData.isException) {
      exceptionBloomFilter.add(getFingerprint(parsedFilterData.data));
    } else if (bloomFilter) {
      // To check for duplicates
      //if (bloomFilter.exists(getFingerprint(parsedFilterData.data))) {
      // console.log('duplicate found for data: ' + getFingerprint(parsedFilterData.data));
      //}
      // console.log('parse:', parsedFilterData.data, 'fingerprint:', getFingerprint(parsedFilterData.data));
      bloomFilter.add(getFingerprint(parsedFilterData.data));
    }

    return true;
  }

  /**
   * Parses the set of filter rules and fills in parserData
   * @param input filter rules
   * @param parserData out parameter which will be filled
   *   with the filters, exceptionFilters and htmlRuleFilters.
   */

  function parse(input, parserData) {
    parserData.bloomFilter = parserData.bloomFilter || new _bloomFilterJs.BloomFilter();
    parserData.exceptionBloomFilter = parserData.exceptionBloomFilter || new _bloomFilterJs.BloomFilter();
    parserData.filters = parserData.filters || [];
    parserData.noFingerprintFilters = parserData.noFingerprintFilters || [];
    parserData.exceptionFilters = parserData.exceptionFilters || [];
    parserData.htmlRuleFilters = parserData.htmlRuleFilters || [];
    var startPos = 0;
    var endPos = input.length;
    var newline = '\n';
    while (startPos <= input.length) {
      endPos = input.indexOf(newline, startPos);
      if (endPos === -1) {
        newline = '\r';
        endPos = input.indexOf(newline, startPos);
      }
      if (endPos === -1) {
        endPos = input.length;
      }
      var filter = input.substring(startPos, endPos);
      var parsedFilterData = {};
      if (parseFilter(filter, parsedFilterData, parserData.bloomFilter, parserData.exceptionBloomFilter)) {
        var fingerprint = getFingerprint(parsedFilterData.data);
        if (parsedFilterData.htmlRuleSelector) {
          parserData.htmlRuleFilters.push(parsedFilterData);
        } else if (parsedFilterData.isException) {
          parserData.exceptionFilters.push(parsedFilterData);
        } else if (fingerprint.length > 0) {
          parserData.filters.push(parsedFilterData);
        } else {
          parserData.noFingerprintFilters.push(parsedFilterData);
        }
      }
      startPos = endPos + 1;
    }
  }

  /**
   * Obtains the domain index of the input filter line
   */
  function getDomainIndex(input) {
    var index = input.indexOf(':');
    ++index;
    while (input[index] === '/') {
      index++;
    }
    return index;
  }

  /**
   * Similar to str1.indexOf(filter, startingPos) but with
   * extra consideration to some ABP filter rules like ^.
   */
  function indexOfFilter(input, filter, startingPos) {
    if (filter.length > input.length) {
      return -1;
    }

    var filterParts = filter.split('^');
    var index = startingPos;
    var beginIndex = -1;
    var prefixedSeparatorChar = false;

    for (var f = 0; f < filterParts.length; f++) {
      if (filterParts[f] === '') {
        prefixedSeparatorChar = true;
        continue;
      }

      index = input.indexOf(filterParts[f], index);
      if (index === -1) {
        return -1;
      }
      if (beginIndex === -1) {
        beginIndex = index;
      }

      if (prefixedSeparatorChar) {
        if (separatorCharacters.indexOf(input[index - 1]) === -1) {
          return -1;
        }
      }
      // If we are in an in between filterPart
      if (f + 1 < filterParts.length &&
      // and we have some chars left in the input past the last filter match
      input.length > index + filterParts[f].length) {
        if (separatorCharacters.indexOf(input[index + filterParts[f].length]) === -1) {
          return -1;
        }
      }

      prefixedSeparatorChar = false;
    }
    return beginIndex;
  }

  function getUrlHost(input) {
    var domainIndexStart = getDomainIndex(input);
    var domainIndexEnd = findFirstSeparatorChar(input, domainIndexStart);
    if (domainIndexEnd === -1) {
      domainIndexEnd = input.length;
    }
    return input.substring(domainIndexStart, domainIndexEnd);
  }

  function filterDataContainsOption(parsedFilterData, option) {
    return parsedFilterData.options && parsedFilterData.options.binaryOptions && parsedFilterData.options.binaryOptions.has(option);
  }

  function isThirdPartyHost(baseContextHost, testHost) {
    if (!testHost.endsWith(baseContextHost)) {
      return true;
    }

    var c = testHost[testHost.length - baseContextHost.length - 1];
    return c !== '.' && c !== undefined;
  }

  // Determines if there's a match based on the options, this doesn't
  // mean that the filter rule shoudl be accepted, just that the filter rule
  // should be considered given the current context.
  // By specifying context params, you can filter out the number of rules which are
  // considered.
  function matchOptions(parsedFilterData, input) {
    var contextParams = arguments[2] === undefined ? {} : arguments[2];

    if (contextParams.elementTypeMask !== undefined && parsedFilterData.options) {
      if (parsedFilterData.options.elementTypeMask !== undefined && !(parsedFilterData.options.elementTypeMask & contextParams.elementTypeMask)) {
        return false;
      }if (parsedFilterData.options.skipElementTypeMask !== undefined && parsedFilterData.options.skipElementTypeMask & contextParams.elementTypeMask) {
        return false;
      }
    }

    // Domain option check
    if (contextParams.domain !== undefined && parsedFilterData.options) {
      if (parsedFilterData.options.domains || parsedFilterData.options.skipDomains) {
        var _ret = (function () {
          // Get the domains that should be considered
          var shouldBlockDomains = parsedFilterData.options.domains.filter(function (domain) {
            return !isThirdPartyHost(domain, contextParams.domain);
          });

          var shouldSkipDomains = parsedFilterData.options.skipDomains.filter(function (domain) {
            return !isThirdPartyHost(domain, contextParams.domain);
          });
          // Handle cases like: example.com|~foo.example.com should llow for foo.example.com
          // But ~example.com|foo.example.com should block for foo.example.com
          var leftOverBlocking = shouldBlockDomains.filter(function (shouldBlockDomain) {
            return shouldSkipDomains.every(function (shouldSkipDomain) {
              return isThirdPartyHost(shouldBlockDomain, shouldSkipDomain);
            });
          });
          var leftOverSkipping = shouldSkipDomains.filter(function (shouldSkipDomain) {
            return shouldBlockDomains.every(function (shouldBlockDomain) {
              return isThirdPartyHost(shouldSkipDomain, shouldBlockDomain);
            });
          });

          // If we have none left over, then we shouldn't consider this a match
          if (shouldBlockDomains.length === 0 && parsedFilterData.options.domains.length !== 0 || shouldBlockDomains.length > 0 && leftOverBlocking.length === 0 || shouldSkipDomains.length > 0 && leftOverSkipping.length > 0) {
            return {
              v: false
            };
          }
        })();

        if (typeof _ret === 'object') return _ret.v;
      }
    }

    // If we're in the context of third-party site, then consider third-party option checks
    if (contextParams['third-party'] !== undefined) {
      // Is the current rule check for third party only?
      if (filterDataContainsOption(parsedFilterData, 'third-party')) {
        var inputHost = getUrlHost(input);
        var inputHostIsThirdParty = isThirdPartyHost(parsedFilterData.host, inputHost);
        if (inputHostIsThirdParty || !contextParams['third-party']) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Given an individual parsed filter data determines if the input url should block.
   */

  function matchesFilter(parsedFilterData, input) {
    var contextParams = arguments[2] === undefined ? {} : arguments[2];
    var cachedInputData = arguments[3] === undefined ? {} : arguments[3];

    if (!matchOptions(parsedFilterData, input, contextParams)) {
      return false;
    }

    // Check for a regex match
    if (parsedFilterData.isRegex) {
      if (!parsedFilterData.regex) {
        parsedFilterData.regex = new RegExp(parsedFilterData.data);
      }
      return parsedFilterData.regex.test(input);
    }

    // Check for both left and right anchored
    if (parsedFilterData.leftAnchored && parsedFilterData.rightAnchored) {
      return parsedFilterData.data === input;
    }

    // Check for right anchored
    if (parsedFilterData.rightAnchored) {
      return input.slice(-parsedFilterData.data.length) === parsedFilterData.data;
    }

    // Check for left anchored
    if (parsedFilterData.leftAnchored) {
      return input.substring(0, parsedFilterData.data.length) === parsedFilterData.data;
    }

    // Check for domain name anchored
    if (parsedFilterData.hostAnchored) {
      if (!cachedInputData.currentHost) {
        cachedInputData.currentHost = getUrlHost(input);
      }

      return !isThirdPartyHost(parsedFilterData.host, cachedInputData.currentHost) && indexOfFilter(input, parsedFilterData.data) !== -1;
    }

    // Wildcard match comparison
    var parts = parsedFilterData.data.split('*');
    var index = 0;
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = parts[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var part = _step.value;

        var newIndex = indexOfFilter(input, part, index);
        if (newIndex === -1) {
          return false;
        }
        index = newIndex + part.length;
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator['return']) {
          _iterator['return']();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    return true;
  }

  function discoverMatchingPrefix(array, bloomFilter, str) {
    var prefixLen = arguments[3] === undefined ? fingerprintSize : arguments[3];

    for (var i = 0; i < str.length - prefixLen + 1; i++) {
      var sub = str.substring(i, i + prefixLen);
      if (bloomFilter.exists(sub)) {
        array.push({ badFingerprint: sub, src: str });
        // console.log('bad-fingerprint:', sub, 'for url:', str);
      } else {}
    }
  }

  function hasMatchingFilters(filterList, parsedFilterData, input, contextParams, cachedInputData) {
    return filterList.some(function (parsedFilterData) {
      return matchesFilter(parsedFilterData, input, contextParams, cachedInputData);
    });
  }

  /**
   * Using the parserData rules will try to see if the input URL should be blocked or not
   * @param parserData The filter data obtained from a call to parse
   * @param input The input URL
   * @return true if the URL should be blocked
   */

  function matches(parserData, input) {
    var contextParams = arguments[2] === undefined ? {} : arguments[2];
    var cachedInputData = arguments[3] === undefined ? {} : arguments[3];

    cachedInputData.bloomNegativeCount = cachedInputData.bloomNegativeCount || 0;
    cachedInputData.bloomPositiveCount = cachedInputData.bloomPositiveCount || 0;
    cachedInputData.notMatchCount = cachedInputData.notMatchCount || 0;
    cachedInputData.badFingerprints = cachedInputData.badFingerprints || [];
    cachedInputData.bloomFalsePositiveCount = cachedInputData.bloomFalsePositiveCount || 0;
    var hasMatchingNoFingerprintFilters = undefined;
    var cleanedInput = input.replace(/^https?:\/\//, '');
    if (cleanedInput.length > maxUrlChars) {
      cleanedInput = cleanedInput.substring(0, maxUrlChars);
    }
    if (parserData.bloomFilter) {
      if (!parserData.bloomFilter.substringExists(cleanedInput, fingerprintSize)) {
        cachedInputData.bloomNegativeCount++;
        cachedInputData.notMatchCount++;
        // console.log('early return because of bloom filter check!');
        hasMatchingNoFingerprintFilters = hasMatchingFilters(parserData.noFingerprintFilters, parserData, input, contextParams, cachedInputData);

        if (!hasMatchingNoFingerprintFilters) {
          return false;
        }
      }
      // console.log('looked for url in bloom filter and it said yes:', cleaned);
    }
    cachedInputData.bloomPositiveCount++;

    // console.log('not early return: ', input);
    delete cachedInputData.currentHost;
    cachedInputData.misses = cachedInputData.misses || new Set();
    cachedInputData.missList = cachedInputData.missList || [];
    if (cachedInputData.missList.length > maxCached) {
      cachedInputData.misses['delete'](cachedInputData.missList[0]);
      cachedInputData.missList = cachedInputData.missList.splice(1);
    }
    if (cachedInputData.misses.has(input)) {
      cachedInputData.notMatchCount++;
      // console.log('positive match for input: ', input);
      return false;
    }

    if (hasMatchingFilters(parserData.filters, parserData, input, contextParams, cachedInputData) || hasMatchingNoFingerprintFilters === true || hasMatchingNoFingerprintFilters === undefined && hasMatchingFilters(parserData.noFingerprintFilters, parserData, input, contextParams, cachedInputData)) {
      // Check for exceptions only when there's a match because matches are
      // rare compared to the volume of checks
      var exceptionBloomFilterMiss = parserData.exceptionBloomFilter && !parserData.exceptionBloomFilter.substringExists(cleanedInput, fingerprintSize);
      if (!exceptionBloomFilterMiss || hasMatchingFilters(parserData.exceptionFilters, parserData, input, contextParams, cachedInputData)) {
        cachedInputData.notMatchCount++;
        return false;
      }
      return true;
    }

    // The bloom filter had a false positive, se we checked for nothing! :'(
    // This is probably (but not always) an indication that the fingerprint selection should be tweaked!
    cachedInputData.missList.push(input);
    cachedInputData.misses.add(input);
    cachedInputData.notMatchCount++;
    cachedInputData.bloomFalsePositiveCount++;
    discoverMatchingPrefix(cachedInputData.badFingerprints, parserData.bloomFilter, cleanedInput);
    // console.log('positive match for input: ', input);
    return false;
  }

  /**
   * Obtains a fingerprint for the specified filter
   */

  function getFingerprint(_x7) {
    var _again = true;

    _function: while (_again) {
      var str = _x7;
      _loop = i = _ret2 = undefined;
      _again = false;

      var _loop = function () {
        var fingerprintRegex = fingerprintRegexs[i];
        var result = fingerprintRegex.exec(str);
        fingerprintRegex.lastIndex = 0;

        if (result && !_badFingerprintsJs.badFingerprints.includes(result[1]) && !_badFingerprintsJs.badSubstrings.find(function (badSubstring) {
          return result[1].includes(badSubstring);
        })) {
          return {
            v: result[1]
          };
        }
        if (result) {} else {}
      };

      for (var i = 0; i < fingerprintRegexs.length; i++) {
        var _ret2 = _loop();

        if (typeof _ret2 === 'object') return _ret2.v;
      }
      // This is pretty ugly but getting fingerprints is assumed to be used only when preprocessing and
      // in a live environment.
      if (str.length > 8) {
        // Remove first and last char
        _x7 = str.slice(1, -1);
        _again = true;
        continue _function;
      }
      // console.warn('Warning: Could not determine a good fingerprint for:', str);
      return '';
    }
  }
});

// console.log('good-fingerprint:', sub, 'for url:', str);

// console.log('checking again for str:', str, 'result:', result[1]);

// console.log('checking again for str, no result');

},{"./badFingerprints.js":3,"bloom-filter-js":4}],3:[function(require,module,exports){
(function (global, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['exports'], factory);
  } else if (typeof exports !== 'undefined') {
    factory(exports);
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports);
    global.badFingerprints = mod.exports;
  }
})(this, function (exports) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true
  });
  var badFingerprints = ['/google/', 'optimize', '/widget.', 'load.php', '95d2-d38', 'googleta', 'storage.', 'callback', 'leclick.', 'default_', 'lacement', '/assets/', 's/skins/', '/themes/', '-loader-', '/header-', '/public/', 'default/', 'd/jsonp/', 'gallery-', 'k/widget', '-curve-m', 'eloader/', 'tooltip/', '/footer/', '/footer-', 'oogletag', 'google.c', 'uv_I-qM8', 'oogle.co', 'ogletags', 'bleclick', 'gletagse', 'letagser', 'eclick.n', 'click.ne', 'googlesy', 'ooglesyn', 'arousel/', 'm-0.0.12', 'gallery/', 'es-heade', '-header-', 'message.', 'Callback', 'channel=', 'onp/pid=', 'ayer.swf', 'include.', 'amazonaw', 'allback&', 's/client', 'article_', '79942%22', 'allback_', '_wrapper', 'wrapper.', 'm/tools/', 'takeover', '_bottom_', 'mponent/', 'ference/', 's/index.', 'ebottom.', '&domain=', 'atic/js/', 'ad_type=', 'u4eSmzTp', 'ign=null', 'aterial.', '/upload/', 'amazon.c', 'b50c29dd', 'dformat=', 'rvices.c', 'eywords=', '2n%22:0,', 'C&v=404&', 'mazon.co', 'vices.co', 's/views/', 'hardware', 'es-heade'];
  exports.badFingerprints = badFingerprints;
  var badSubstrings = ['com', 'net', 'http', 'image', 'www', 'img', '.js', 'oogl', 'min.', 'que', 'synd', 'dicat', 'templ', 'tube', 'page', 'home', 'mepa', 'mplat', 'tati', 'user', 'aws', 'omp', 'icros', 'espon', 'org', 'nalyti', 'acebo', 'lead', 'con', 'count', 'vers', 'pres', 'aff', 'atio', 'tent', 'ative', 'en_', 'fr_', 'es_', 'ha1', 'ha2', 'live', 'odu', 'esh', 'adm', 'crip', 'ect', 'tics', 'edia', 'ini', 'yala', 'ana', 'rac', 'trol', 'tern', 'card', 'yah', 'tion', 'erv', '.co', 'lug', 'eat', 'ugi', 'ates', 'loud', 'ner', 'earc', 'atd', 'fro', 'ruct', 'sour', 'news', 'ddr', 'htm', 'fram', 'dar', 'flas', 'lay', 'orig', 'uble', 'om/', 'ext', 'link', '.png', 'com/', 'tri', 'but', 'vity', 'spri'];
  exports.badSubstrings = badSubstrings;
});

},{}],4:[function(require,module,exports){
(function (global, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['exports'], factory);
  } else if (typeof exports !== 'undefined') {
    factory(exports);
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports);
    global.main = mod.exports;
  }
})(this, function (exports) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true
  });

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  var toCharCodeArray = function toCharCodeArray(str) {
    return str.split('').map(function (c) {
      return c.charCodeAt(0);
    });
  };

  exports.toCharCodeArray = toCharCodeArray;
  /**
   * Returns a function that generates a Rabin fingerprint hash function
   * @param p The prime to use as a base for the Rabin fingerprint algorithm
   */
  var simpleHashFn = function simpleHashFn(p) {
    return function (arrayValues, lastHash, lastCharCode) {
      return lastHash ?
      // See the abracadabra example: https://en.wikipedia.org/wiki/Rabin%E2%80%93Karp_algorithm
      (lastHash - lastCharCode * Math.pow(p, arrayValues.length - 1)) * p + arrayValues[arrayValues.length - 1] : arrayValues.reduce(function (total, x, i) {
        return total + x * Math.pow(p, arrayValues.length - i - 1);
      }, 0);
    };
  };

  exports.simpleHashFn = simpleHashFn;
  /*
   * Sets the specific bit location
   */
  var setBit = function setBit(buffer, bitLocation) {
    return buffer[bitLocation / 8 | 0] |= 1 << bitLocation % 8;
  };

  exports.setBit = setBit;
  /**
   * Returns true if the specified bit location is set
   */
  var isBitSet = function isBitSet(buffer, bitLocation) {
    return !!(buffer[bitLocation / 8 | 0] & 1 << bitLocation % 8);
  };

  exports.isBitSet = isBitSet;

  var BloomFilter = (function () {
    /**
     * Constructs a new BloomFilter instance.
     * If you'd like to initialize with a specific size just call BloomFilter.from(Array.from(Uint8Array(size).values()))
     * Note that there is purposely no remove call because adding that would introduce false negatives.
     *
     * @param bitsPerElement Used along with estimatedNumberOfElements to figure out the size of the BloomFilter
     *   By using 10 bits per element you'll have roughly 1% chance of false positives.
     * @param estimatedNumberOfElements Used along with bitsPerElementto figure out the size of the BloomFilter
     * @param hashFns An array of hash functions to use. These can be custom but they should be of the form
     *   (arrayValues, lastHash, lastCharCode) where the last 2 parameters are optional and are used to make
     *   a rolling hash to save computation.
     */

    function BloomFilter(bitsPerElement, estimatedNumberOfElements, hashFns) {
      if (bitsPerElement === undefined) bitsPerElement = 10;
      if (estimatedNumberOfElements === undefined) estimatedNumberOfElements = 50000;

      _classCallCheck(this, BloomFilter);

      if (bitsPerElement.constructor === Uint8Array) {
        // Re-order params
        this.buffer = bitsPerElement;
        if (estimatedNumberOfElements.constructor === Array) {
          hashFns = estimatedNumberOfElements;
        }
        // Calculate new buffer size
        this.bufferBitSize = this.buffer.length * 8;
      } else if (bitsPerElement.constructor === Array) {
        // Re-order params
        var arrayLike = bitsPerElement;
        if (estimatedNumberOfElements.constructor === Array) {
          hashFns = estimatedNumberOfElements;
        }
        // Calculate new buffer size
        this.bufferBitSize = arrayLike.length * 8;
        this.buffer = new Uint8Array(arrayLike);
      } else {
        // Calculate the needed buffer size in bytes
        this.bufferBitSize = bitsPerElement * estimatedNumberOfElements;
        this.buffer = new Uint8Array(Math.ceil(this.bufferBitSize / 8));
      }
      this.hashFns = hashFns || [simpleHashFn(11), simpleHashFn(17), simpleHashFn(23)];
      this.setBit = setBit.bind(this, this.buffer);
      this.isBitSet = isBitSet.bind(this, this.buffer);
    }

    _createClass(BloomFilter, [{
      key: 'toJSON',

      /**
       * Serializing the current BloomFilter into a JSON friendly format.
       * You would typically pass the result into JSON.stringify.
       * Note that BloomFilter.from only works if the hash functions are the same.
       */
      value: function toJSON() {
        return Array.from(this.buffer.values());
      }
    }, {
      key: 'print',

      /**
       * Print the buffer, mostly used for debugging only
       */
      value: function print() {
        console.log(this.buffer);
      }
    }, {
      key: 'getLocationsForCharCodes',

      /**
       * Given a string gets all the locations to check/set in the buffer
       * for that string.
       * @param charCodes An array of the char codes to use for the hash
       */
      value: function getLocationsForCharCodes(charCodes) {
        var _this = this;

        return this.hashFns.map(function (h) {
          return h(charCodes) % _this.bufferBitSize;
        });
      }
    }, {
      key: 'getHashesForCharCodes',

      /**
       * Obtains the hashes for the specified charCodes
       * See "Rabin fingerprint" in https://en.wikipedia.org/wiki/Rabin%E2%80%93Karp_algorithm for more information.
       *
       * @param charCodes An array of the char codes to use for the hash
       * @param lastHashes If specified, it will pass the last hash to the hashing
       * function for a faster computation.  Must be called with lastCharCode.
       * @param lastCharCode if specified, it will pass the last char code
       *  to the hashing function for a faster computation. Must be called with lastHashes.
       */
      value: function getHashesForCharCodes(charCodes, lastHashes, lastCharCode) {
        var _this2 = this;

        return this.hashFns.map(function (h, i) {
          return h(charCodes, lastHashes ? lastHashes[i] : undefined, lastCharCode, _this2.bufferBitSize);
        });
      }
    }, {
      key: 'add',

      /**
       * Adds he specified string to the set
       */
      value: function add(data) {
        if (data.constructor !== Array) {
          data = toCharCodeArray(data);
        }

        this.getLocationsForCharCodes(data).forEach(this.setBit);
      }
    }, {
      key: 'exists',

      /**
       * Checks whether an element probably exists in the set, or definitely doesn't.
       * @param str Either a string to check for existance or an array of the string's char codes
       *   The main reason why you'd want to pass in a char code array is because passing a string
       *   will use JS directly to get the char codes which is very inneficient compared to calling
       *   into C++ code to get it and then making the call.
       *
       * Returns true if the element probably exists in the set
       * Returns false if the element definitely does not exist in the set
       */
      value: function exists(data) {
        if (data.constructor !== Array) {
          data = toCharCodeArray(data);
        }
        return this.getLocationsForCharCodes(data).every(this.isBitSet);
      }
    }, {
      key: 'substringExists',

      /**
       * Checks if any substring of length substringLenght probably exists or definitely doesn't
       * If false is returned then no substring of the specified string of the specified lengthis in the bloom filter
       * @param data The substring or char array to check substrings on.
       */
      value: function substringExists(data, substringLength) {
        var _this3 = this;

        if (data.constructor !== Uint8Array) {
          if (data.constructor !== Array) {
            data = toCharCodeArray(data);
          }
          data = new Uint8Array(data);
        }

        var lastHashes = undefined,
            lastCharCode = undefined;
        for (var i = 0; i < data.length - substringLength + 1; i++) {

          lastHashes = this.getHashesForCharCodes(data.subarray(i, i + substringLength), lastHashes, lastCharCode);
          if (lastHashes.map(function (x) {
            return x % _this3.bufferBitSize;
          }).every(this.isBitSet)) {
            return true;
          }
          lastCharCode = data[i];
        }
        return false;
      }
    }], [{
      key: 'from',

      /**
       * Construct a Bloom filter from a previous array of data
       * Note that the hash functions must be the same!
       */
      value: function from(arrayLike, hashFns) {
        return new BloomFilter(arrayLike, hashFns);
      }
    }]);

    return BloomFilter;
  })();

  exports.BloomFilter = BloomFilter;
});

},{}]},{},[1]);
