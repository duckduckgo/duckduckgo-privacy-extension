(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
"use strict";

var constants = require('../../data/constants');

var listPicker = document.getElementById('list-picker');
var listEditor = document.getElementById('list-content');
var saveButton = document.getElementById('save');
var lists = constants.tdsLists;
var selected = lists[0].name;

function getListFormat(name) {
  var _lists$find;

  return (_lists$find = lists.find(function (l) {
    return l.name === name;
  })) === null || _lists$find === void 0 ? void 0 : _lists$find.format;
} // build switcher options


lists.forEach(function (_ref) {
  var name = _ref.name;
  var option = document.createElement('option');
  option.value = name;
  option.innerText = name;
  listPicker.appendChild(option);
});

function listSwitcher() {
  selected = listPicker.selectedOptions[0].value;
  loadList(selected);
  saveButton.removeAttribute('disabled');
}

listPicker.addEventListener('change', listSwitcher);
listSwitcher();

function loadList(name) {
  chrome.runtime.sendMessage({
    getListContents: name
  }, function (_ref2) {
    var etag = _ref2.etag,
        data = _ref2.data;
    var value = getListFormat(name) === 'json' ? JSON.stringify(data, null, '  ') : data;
    document.querySelector('#list-content').value = value;
  });
}

function saveList(name) {
  var value = listEditor.value;
  chrome.runtime.sendMessage({
    setListContents: name,
    value: getListFormat(name) === 'json' ? JSON.parse(value) : value
  }, function () {
    return loadList(name);
  });
}

function reloadList(name) {
  chrome.runtime.sendMessage({
    reloadList: name
  }, function () {
    return loadList(name);
  });
}

saveButton.addEventListener('click', function () {
  saveList(selected);
});
document.getElementById('reload').addEventListener('click', function () {
  reloadList(selected);
});
listEditor.addEventListener('keypress', function () {
  setTimeout(function () {
    console.log('changed', getListFormat(selected));

    if (getListFormat(selected) === 'json') {
      try {
        saveButton.removeAttribute('disabled');
      } catch (e) {
        console.log('parse error');
        saveButton.setAttribute('disabled', true);
      }
    } else {
      saveButton.removeAttribute('disabled');
    }
  }, 0);
});

},{"../../data/constants":1}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzaGFyZWQvZGF0YS9jb25zdGFudHMuanMiLCJzaGFyZWQvanMvZGV2dG9vbHMvbGlzdC1lZGl0b3IuZXM2LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNBQSxNQUFNLENBQUMsT0FBUCxHQUFpQjtBQUNiLGdCQUFjLHlEQUREO0FBRWIsZUFBYSxtQ0FGQTtBQUdiLHVCQUFxQixDQUFDLFdBQUQsRUFBYyxhQUFkLEVBQTZCLGdCQUE3QixDQUhSO0FBSWIsMEJBQXdCLENBQUMsWUFBRCxFQUFjLFdBQWQsRUFBMEIsWUFBMUIsRUFBdUMsUUFBdkMsRUFBZ0QsT0FBaEQsRUFBd0QsUUFBeEQsRUFBaUUsZ0JBQWpFLEVBQWtGLE9BQWxGLENBSlg7QUFLYixpQkFBZSw0REFMRjtBQU1iLG1CQUFrQjtBQUNkLFNBQUssTUFEUztBQUVkLFNBQUssT0FGUztBQUdkLFNBQUssTUFIUztBQUlkLFNBQUssTUFKUztBQUtkLFNBQUssTUFMUztBQU1kLFlBQVEsTUFOTTtBQU9kLFdBQU8sTUFQTztBQVFkLGVBQVcsU0FSRztBQVNkLGFBQVM7QUFUSyxHQU5MO0FBaUJiLGtCQUFnQiw4Q0FqQkg7QUFrQmIsNEJBQTBCLGdCQWxCYjtBQW1CYixtQkFBaUI7QUFDYixjQUFVLHNCQURHO0FBRWIsZ0JBQVksbUJBRkM7QUFHYixZQUFRO0FBSEssR0FuQko7O0FBd0JiO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSSwyQkFBeUI7QUFDckIsY0FBVSxFQURXO0FBRXJCLGdCQUFZLEVBRlM7QUFHckIsZUFBVyxFQUhVO0FBSXJCLGNBQVUsRUFKVztBQUtyQixnQkFBWSxFQUxTO0FBTXJCLGNBQVUsRUFOVztBQU9yQixpQkFBYSxDQVBRO0FBUXJCLFlBQVEsQ0FSYTtBQVNyQixjQUFVLENBVFc7QUFVckIsa0JBQWM7QUFWTyxHQTdCWjs7QUF5Q2I7QUFDSjtBQUNBO0FBQ0ksdUJBQXFCO0FBQ2pC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TUFBTSxDQUFDLE9BQVAsQ0FBZSxXQUFmLENBQTJCO0FBQ3ZCLElBQUEsVUFBVSxFQUFFO0FBRFcsR0FBM0IsRUFFRztBQUFBLFdBQU0sUUFBUSxDQUFDLElBQUQsQ0FBZDtBQUFBLEdBRkg7QUFHSDs7QUFFRCxVQUFVLENBQUMsZ0JBQVgsQ0FBNEIsT0FBNUIsRUFBcUMsWUFBTTtBQUN2QyxFQUFBLFFBQVEsQ0FBQyxRQUFELENBQVI7QUFDSCxDQUZEO0FBSUEsUUFBUSxDQUFDLGNBQVQsQ0FBd0IsUUFBeEIsRUFBa0MsZ0JBQWxDLENBQW1ELE9BQW5ELEVBQTRELFlBQU07QUFDOUQsRUFBQSxVQUFVLENBQUMsUUFBRCxDQUFWO0FBQ0gsQ0FGRDtBQUlBLFVBQVUsQ0FBQyxnQkFBWCxDQUE0QixVQUE1QixFQUF3QyxZQUFNO0FBQzFDLEVBQUEsVUFBVSxDQUFDLFlBQU07QUFDYixJQUFBLE9BQU8sQ0FBQyxHQUFSLENBQVksU0FBWixFQUF1QixhQUFhLENBQUMsUUFBRCxDQUFwQzs7QUFDQSxRQUFJLGFBQWEsQ0FBQyxRQUFELENBQWIsS0FBNEIsTUFBaEMsRUFBd0M7QUFDcEMsVUFBSTtBQUNBLFFBQUEsVUFBVSxDQUFDLGVBQVgsQ0FBMkIsVUFBM0I7QUFDSCxPQUZELENBRUUsT0FBTyxDQUFQLEVBQVU7QUFDUixRQUFBLE9BQU8sQ0FBQyxHQUFSLENBQVksYUFBWjtBQUNBLFFBQUEsVUFBVSxDQUFDLFlBQVgsQ0FBd0IsVUFBeEIsRUFBb0MsSUFBcEM7QUFDSDtBQUNKLEtBUEQsTUFPTztBQUNILE1BQUEsVUFBVSxDQUFDLGVBQVgsQ0FBMkIsVUFBM0I7QUFDSDtBQUNKLEdBWlMsRUFZUCxDQVpPLENBQVY7QUFhSCxDQWREIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgXCJlbnRpdHlMaXN0XCI6IFwiaHR0cHM6Ly9kdWNrZHVja2dvLmNvbS9jb250ZW50YmxvY2tpbmcuanM/bD1lbnRpdHlsaXN0MlwiLFxuICAgIFwiZW50aXR5TWFwXCI6IFwiZGF0YS90cmFja2VyX2xpc3RzL2VudGl0eU1hcC5qc29uXCIsXG4gICAgXCJkaXNwbGF5Q2F0ZWdvcmllc1wiOiBbXCJBbmFseXRpY3NcIiwgXCJBZHZlcnRpc2luZ1wiLCBcIlNvY2lhbCBOZXR3b3JrXCJdLFxuICAgIFwicmVxdWVzdExpc3RlbmVyVHlwZXNcIjogW1wibWFpbl9mcmFtZVwiLFwic3ViX2ZyYW1lXCIsXCJzdHlsZXNoZWV0XCIsXCJzY3JpcHRcIixcImltYWdlXCIsXCJvYmplY3RcIixcInhtbGh0dHByZXF1ZXN0XCIsXCJvdGhlclwiXSxcbiAgICBcImZlZWRiYWNrVXJsXCI6IFwiaHR0cHM6Ly9kdWNrZHVja2dvLmNvbS9mZWVkYmFjay5qcz90eXBlPWV4dGVuc2lvbi1mZWVkYmFja1wiLFxuICAgIFwidG9zZHJNZXNzYWdlc1wiIDoge1xuICAgICAgICBcIkFcIjogXCJHb29kXCIsXG4gICAgICAgIFwiQlwiOiBcIk1peGVkXCIsXG4gICAgICAgIFwiQ1wiOiBcIlBvb3JcIixcbiAgICAgICAgXCJEXCI6IFwiUG9vclwiLFxuICAgICAgICBcIkVcIjogXCJQb29yXCIsXG4gICAgICAgIFwiZ29vZFwiOiBcIkdvb2RcIixcbiAgICAgICAgXCJiYWRcIjogXCJQb29yXCIsXG4gICAgICAgIFwidW5rbm93blwiOiBcIlVua25vd25cIixcbiAgICAgICAgXCJtaXhlZFwiOiBcIk1peGVkXCJcbiAgICB9LFxuICAgIFwiaHR0cHNTZXJ2aWNlXCI6IFwiaHR0cHM6Ly9kdWNrZHVja2dvLmNvbS9zbWFydGVyX2VuY3J5cHRpb24uanNcIixcbiAgICBcImR1Y2tEdWNrR29TZXJwSG9zdG5hbWVcIjogXCJkdWNrZHVja2dvLmNvbVwiLFxuICAgIFwiaHR0cHNNZXNzYWdlc1wiOiB7XG4gICAgICAgIFwic2VjdXJlXCI6IFwiRW5jcnlwdGVkIENvbm5lY3Rpb25cIixcbiAgICAgICAgXCJ1cGdyYWRlZFwiOiBcIkZvcmNlZCBFbmNyeXB0aW9uXCIsXG4gICAgICAgIFwibm9uZVwiOiBcIlVuZW5jcnlwdGVkIENvbm5lY3Rpb25cIixcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIE1ham9yIHRyYWNraW5nIG5ldHdvcmtzIGRhdGE6XG4gICAgICogcGVyY2VudCBvZiB0aGUgdG9wIDEgbWlsbGlvbiBzaXRlcyBhIHRyYWNraW5nIG5ldHdvcmsgaGFzIGJlZW4gc2VlbiBvbi5cbiAgICAgKiBzZWU6IGh0dHBzOi8vd2VidHJhbnNwYXJlbmN5LmNzLnByaW5jZXRvbi5lZHUvd2ViY2Vuc3VzL1xuICAgICAqL1xuICAgIFwibWFqb3JUcmFja2luZ05ldHdvcmtzXCI6IHtcbiAgICAgICAgXCJnb29nbGVcIjogODQsXG4gICAgICAgIFwiZmFjZWJvb2tcIjogMzYsXG4gICAgICAgIFwidHdpdHRlclwiOiAxNixcbiAgICAgICAgXCJhbWF6b25cIjogMTQsXG4gICAgICAgIFwiYXBwbmV4dXNcIjogMTAsXG4gICAgICAgIFwib3JhY2xlXCI6IDEwLFxuICAgICAgICBcIm1lZGlhbWF0aFwiOiA5LFxuICAgICAgICBcIm9hdGhcIjogOSxcbiAgICAgICAgXCJtYXhjZG5cIjogNyxcbiAgICAgICAgXCJhdXRvbWF0dGljXCI6IDdcbiAgICB9LFxuICAgIC8qXG4gICAgICogTWFwcGluZyBlbnRpdHkgbmFtZXMgdG8gQ1NTIGNsYXNzIG5hbWUgZm9yIHBvcHVwIGljb25zXG4gICAgICovXG4gICAgXCJlbnRpdHlJY29uTWFwcGluZ1wiOiB7XG4gICAgICAgIFwiR29vZ2xlIExMQ1wiOiBcImdvb2dsZVwiLFxuICAgICAgICBcIkZhY2Vib29rLCBJbmMuXCI6IFwiZmFjZWJvb2tcIixcbiAgICAgICAgXCJUd2l0dGVyLCBJbmMuXCI6IFwidHdpdHRlclwiLFxuICAgICAgICBcIkFtYXpvbiBUZWNobm9sb2dpZXMsIEluYy5cIjogXCJhbWF6b25cIixcbiAgICAgICAgXCJBcHBOZXh1cywgSW5jLlwiOiBcImFwcG5leHVzXCIsXG4gICAgICAgIFwiTWVkaWFNYXRoLCBJbmMuXCI6IFwibWVkaWFtYXRoXCIsXG4gICAgICAgIFwiU3RhY2tQYXRoLCBMTENcIjogXCJtYXhjZG5cIixcbiAgICAgICAgXCJBdXRvbWF0dGljLCBJbmMuXCI6IFwiYXV0b21hdHRpY1wiLFxuICAgICAgICBcIkFkb2JlIEluYy5cIjogXCJhZG9iZVwiLFxuICAgICAgICBcIlF1YW50Y2FzdCBDb3Jwb3JhdGlvblwiOiBcInF1YW50Y2FzdFwiLFxuICAgICAgICBcIlRoZSBOaWVsc2VuIENvbXBhbnlcIjogXCJuaWVsc2VuXCJcbiAgICB9LFxuICAgIFwiaHR0cHNEQk5hbWVcIjogXCJodHRwc1wiLFxuICAgIFwiaHR0cHNMaXN0c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVwZ3JhZGUgYmxvb20gZmlsdGVyXCIsXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJodHRwc1VwZ3JhZGVCbG9vbUZpbHRlclwiLFxuICAgICAgICAgICAgXCJ1cmxcIjogXCJodHRwczovL3N0YXRpY2Nkbi5kdWNrZHVja2dvLmNvbS9odHRwcy9odHRwcy1ibG9vbS5qc29uXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZG9uXFwndCB1cGdyYWRlIGJsb29tIGZpbHRlclwiLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiaHR0cHNEb250VXBncmFkZUJsb29tRmlsdGVyc1wiLFxuICAgICAgICAgICAgXCJ1cmxcIjogXCJodHRwczovL3N0YXRpY2Nkbi5kdWNrZHVja2dvLmNvbS9odHRwcy9uZWdhdGl2ZS1odHRwcy1ibG9vbS5qc29uXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidXBncmFkZSBzYWZlbGlzdFwiLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiaHR0cHNVcGdyYWRlTGlzdFwiLFxuICAgICAgICAgICAgXCJ1cmxcIjogXCJodHRwczovL3N0YXRpY2Nkbi5kdWNrZHVja2dvLmNvbS9odHRwcy9uZWdhdGl2ZS1odHRwcy13aGl0ZWxpc3QuanNvblwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImRvblxcJ3QgdXBncmFkZSBzYWZlbGlzdFwiLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiaHR0cHNEb250VXBncmFkZUxpc3RcIixcbiAgICAgICAgICAgIFwidXJsXCI6IFwiaHR0cHM6Ly9zdGF0aWNjZG4uZHVja2R1Y2tnby5jb20vaHR0cHMvaHR0cHMtd2hpdGVsaXN0Lmpzb25cIlxuICAgICAgICB9LFxuICAgIF0sXG4gICAgXCJ0ZHNMaXN0c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInN1cnJvZ2F0ZXNcIixcbiAgICAgICAgICAgIFwidXJsXCI6IFwiL2RhdGEvc3Vycm9nYXRlcy50eHRcIixcbiAgICAgICAgICAgIFwiZm9ybWF0XCI6IFwidGV4dFwiLFxuICAgICAgICAgICAgXCJzb3VyY2VcIjogXCJsb2NhbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInRkc1wiLFxuICAgICAgICAgICAgXCJ1cmxcIjogXCJodHRwczovL3N0YXRpY2Nkbi5kdWNrZHVja2dvLmNvbS90cmFja2VyYmxvY2tpbmcvdjIuMS90ZHMuanNvblwiLFxuICAgICAgICAgICAgXCJmb3JtYXRcIjogXCJqc29uXCIsXG4gICAgICAgICAgICBcInNvdXJjZVwiOiBcImV4dGVybmFsXCIsXG4gICAgICAgICAgICBcImNoYW5uZWxzXCI6IHtcbiAgICAgICAgICAgICAgICBcImxpdmVcIjogXCJodHRwczovL3N0YXRpY2Nkbi5kdWNrZHVja2dvLmNvbS90cmFja2VyYmxvY2tpbmcvdjIuMS90ZHMuanNvblwiLFxuICAgICAgICAgICAgICAgIFwibmV4dFwiOiBcImh0dHBzOi8vc3RhdGljY2RuLmR1Y2tkdWNrZ28uY29tL3RyYWNrZXJibG9ja2luZy92Mi4xL3Rkcy1uZXh0Lmpzb25cIixcbiAgICAgICAgICAgICAgICBcImJldGFcIjogXCJodHRwczovL3N0YXRpY2Nkbi5kdWNrZHVja2dvLmNvbS90cmFja2VyYmxvY2tpbmcvYmV0YS90ZHMuanNvblwiXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkNsaWNrVG9Mb2FkQ29uZmlnXCIsXG4gICAgICAgICAgICBcInVybFwiOiBcImh0dHBzOi8vc3RhdGljY2RuLmR1Y2tkdWNrZ28uY29tL3VzZXJhZ2VudHMvc29jaWFsX2N0cF9jb25maWd1cmF0aW9uLmpzb25cIixcbiAgICAgICAgICAgIFwiZm9ybWF0XCI6IFwianNvblwiLFxuICAgICAgICAgICAgXCJzb3VyY2VcIjogXCJleHRlcm5hbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcImNvbmZpZ1wiLFxuICAgICAgICAgICAgXCJ1cmxcIjogXCJodHRwczovL3N0YXRpY2Nkbi5kdWNrZHVja2dvLmNvbS90cmFja2VyYmxvY2tpbmcvY29uZmlnL3YxL2V4dGVuc2lvbi1jb25maWcuanNvblwiLFxuICAgICAgICAgICAgXCJmb3JtYXRcIjogXCJqc29uXCIsXG4gICAgICAgICAgICBcInNvdXJjZVwiOiBcImV4dGVybmFsXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJodHRwc0Vycm9yQ29kZXNcIjoge1xuICAgICAgICBcIm5ldDo6RVJSX0NPTk5FQ1RJT05fUkVGVVNFRFwiOiAxLFxuICAgICAgICBcIm5ldDo6RVJSX0FCT1JURURcIjogMixcbiAgICAgICAgXCJuZXQ6OkVSUl9TU0xfUFJPVE9DT0xfRVJST1JcIjogMyxcbiAgICAgICAgXCJuZXQ6OkVSUl9TU0xfVkVSU0lPTl9PUl9DSVBIRVJfTUlTTUFUQ0hcIjogNCxcbiAgICAgICAgXCJuZXQ6OkVSUl9OQU1FX05PVF9SRVNPTFZFRFwiOiA1LFxuICAgICAgICBcIk5TX0VSUk9SX0NPTk5FQ1RJT05fUkVGVVNFRFwiOiA2LFxuICAgICAgICBcIk5TX0VSUk9SX1VOS05PV05fSE9TVFwiOiA3LFxuICAgICAgICBcIkFuIGFkZGl0aW9uYWwgcG9saWN5IGNvbnN0cmFpbnQgZmFpbGVkIHdoZW4gdmFsaWRhdGluZyB0aGlzIGNlcnRpZmljYXRlLlwiOiA4LFxuICAgICAgICBcIlVuYWJsZSB0byBjb21tdW5pY2F0ZSBzZWN1cmVseSB3aXRoIHBlZXI6IHJlcXVlc3RlZCBkb21haW4gbmFtZSBkb2VzIG5vdCBtYXRjaCB0aGUgc2VydmVy4oCZcyBjZXJ0aWZpY2F0ZS5cIjogOSxcbiAgICAgICAgXCJDYW5ub3QgY29tbXVuaWNhdGUgc2VjdXJlbHkgd2l0aCBwZWVyOiBubyBjb21tb24gZW5jcnlwdGlvbiBhbGdvcml0aG0ocykuXCI6IDEwLFxuICAgICAgICBcIlNTTCByZWNlaXZlZCBhIHJlY29yZCB0aGF0IGV4Y2VlZGVkIHRoZSBtYXhpbXVtIHBlcm1pc3NpYmxlIGxlbmd0aC5cIjogMTEsXG4gICAgICAgIFwiVGhlIGNlcnRpZmljYXRlIGlzIG5vdCB0cnVzdGVkIGJlY2F1c2UgaXQgaXMgc2VsZi1zaWduZWQuXCI6IDEyLFxuICAgICAgICBcImRvd25ncmFkZV9yZWRpcmVjdF9sb29wXCI6IDEzXG4gICAgfVxufVxuIiwiY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi4vLi4vZGF0YS9jb25zdGFudHMnKVxuXG5jb25zdCBsaXN0UGlja2VyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xpc3QtcGlja2VyJylcbmNvbnN0IGxpc3RFZGl0b3IgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbGlzdC1jb250ZW50JylcbmNvbnN0IHNhdmVCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2F2ZScpXG5cbmNvbnN0IGxpc3RzID0gY29uc3RhbnRzLnRkc0xpc3RzXG5sZXQgc2VsZWN0ZWQgPSBsaXN0c1swXS5uYW1lXG5cbmZ1bmN0aW9uIGdldExpc3RGb3JtYXQgKG5hbWUpIHtcbiAgICByZXR1cm4gbGlzdHMuZmluZChsID0+IGwubmFtZSA9PT0gbmFtZSk/LmZvcm1hdFxufVxuXG4vLyBidWlsZCBzd2l0Y2hlciBvcHRpb25zXG5saXN0cy5mb3JFYWNoKCh7IG5hbWUgfSkgPT4ge1xuICAgIGNvbnN0IG9wdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ29wdGlvbicpXG4gICAgb3B0aW9uLnZhbHVlID0gbmFtZVxuICAgIG9wdGlvbi5pbm5lclRleHQgPSBuYW1lXG4gICAgbGlzdFBpY2tlci5hcHBlbmRDaGlsZChvcHRpb24pXG59KVxuXG5mdW5jdGlvbiBsaXN0U3dpdGNoZXIgKCkge1xuICAgIHNlbGVjdGVkID0gbGlzdFBpY2tlci5zZWxlY3RlZE9wdGlvbnNbMF0udmFsdWVcbiAgICBsb2FkTGlzdChzZWxlY3RlZClcbiAgICBzYXZlQnV0dG9uLnJlbW92ZUF0dHJpYnV0ZSgnZGlzYWJsZWQnKVxufVxubGlzdFBpY2tlci5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBsaXN0U3dpdGNoZXIpXG5saXN0U3dpdGNoZXIoKVxuXG5mdW5jdGlvbiBsb2FkTGlzdCAobmFtZSkge1xuICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgZ2V0TGlzdENvbnRlbnRzOiBuYW1lXG4gICAgfSwgKHsgZXRhZywgZGF0YSB9KSA9PiB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gZ2V0TGlzdEZvcm1hdChuYW1lKSA9PT0gJ2pzb24nID8gSlNPTi5zdHJpbmdpZnkoZGF0YSwgbnVsbCwgJyAgJykgOiBkYXRhXG4gICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNsaXN0LWNvbnRlbnQnKS52YWx1ZSA9IHZhbHVlXG4gICAgfSlcbn1cblxuZnVuY3Rpb24gc2F2ZUxpc3QgKG5hbWUpIHtcbiAgICBjb25zdCB2YWx1ZSA9IGxpc3RFZGl0b3IudmFsdWVcbiAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XG4gICAgICAgIHNldExpc3RDb250ZW50czogbmFtZSxcbiAgICAgICAgdmFsdWU6IGdldExpc3RGb3JtYXQobmFtZSkgPT09ICdqc29uJyA/IEpTT04ucGFyc2UodmFsdWUpIDogdmFsdWVcbiAgICB9LCAoKSA9PiBsb2FkTGlzdChuYW1lKSlcbn1cblxuZnVuY3Rpb24gcmVsb2FkTGlzdCAobmFtZSkge1xuICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgcmVsb2FkTGlzdDogbmFtZVxuICAgIH0sICgpID0+IGxvYWRMaXN0KG5hbWUpKVxufVxuXG5zYXZlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgIHNhdmVMaXN0KHNlbGVjdGVkKVxufSlcblxuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3JlbG9hZCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgIHJlbG9hZExpc3Qoc2VsZWN0ZWQpXG59KVxuXG5saXN0RWRpdG9yLmFkZEV2ZW50TGlzdGVuZXIoJ2tleXByZXNzJywgKCkgPT4ge1xuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZygnY2hhbmdlZCcsIGdldExpc3RGb3JtYXQoc2VsZWN0ZWQpKVxuICAgICAgICBpZiAoZ2V0TGlzdEZvcm1hdChzZWxlY3RlZCkgPT09ICdqc29uJykge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBzYXZlQnV0dG9uLnJlbW92ZUF0dHJpYnV0ZSgnZGlzYWJsZWQnKVxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwYXJzZSBlcnJvcicpXG4gICAgICAgICAgICAgICAgc2F2ZUJ1dHRvbi5zZXRBdHRyaWJ1dGUoJ2Rpc2FibGVkJywgdHJ1ZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNhdmVCdXR0b24ucmVtb3ZlQXR0cmlidXRlKCdkaXNhYmxlZCcpXG4gICAgICAgIH1cbiAgICB9LCAwKVxufSlcbiJdfQ==
