"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

  // shared/js/shared-utils/parse-user-agent-string.js
  var require_parse_user_agent_string = __commonJS({
    "shared/js/shared-utils/parse-user-agent-string.js"(exports, module) {
      "use strict";
      module.exports = (uaString) => {
        if (!globalThis.navigator) return {};
        if (!uaString) uaString = globalThis.navigator.userAgent;
        let browser;
        let version;
        try {
          let parsedUaParts = uaString.match(/(Firefox|Chrome|Edg)\/([0-9]+)/);
          const isEdge = /(Edge?)\/([0-9]+)/;
          const isOpera = /(OPR)\/([0-9]+)/;
          if (uaString.match(isEdge)) {
            parsedUaParts = uaString.match(isEdge);
          } else if (uaString.match(isOpera)) {
            parsedUaParts = uaString.match(isOpera);
            parsedUaParts[1] = "Opera";
          }
          browser = parsedUaParts[1];
          version = parsedUaParts[2];
          if (globalThis.navigator.brave) {
            browser = "Brave";
          }
        } catch (e) {
          browser = version = "";
        }
        let os = "o";
        if (globalThis.navigator.userAgent.indexOf("Windows") !== -1) os = "w";
        if (globalThis.navigator.userAgent.indexOf("Mac") !== -1) os = "m";
        if (globalThis.navigator.userAgent.indexOf("Linux") !== -1) os = "l";
        return {
          os,
          browser,
          version
        };
      };
    }
  });

  // shared/data/constants.js
  var require_constants = __commonJS({
    "shared/data/constants.js"(exports, module) {
      "use strict";
      var parseUserAgentString = require_parse_user_agent_string();
      var browserInfo = parseUserAgentString();
      var trackerBlockingEndpointBase = "https://staticcdn.duckduckgo.com/trackerblocking";
      function isMV3() {
        if (typeof chrome !== "undefined") {
          return chrome?.runtime.getManifest().manifest_version === 3;
        }
        return false;
      }
      function getConfigFileName() {
        let configName;
        if (true) {
          configName = "windows-config";
        } else {
          let browserName = browserInfo?.browser?.toLowerCase() || "";
          if (!["chrome", "firefox", "brave", "edg"].includes(browserName)) {
            browserName = "";
          } else {
            browserName = "-" + browserName + (isMV3() ? "mv3" : "");
          }
          configName = `extension${browserName}-config`;
        }
        return `${trackerBlockingEndpointBase}/config/v4/${configName}.json`;
      }
      function getPlatformName() {
        if (true) {
          return "windows";
        }
        return "extension";
      }
      function getTDSEndpoint(version) {
        const thisPlatform = `extension${isMV3() ? "-mv3" : ""}`;
        return `${trackerBlockingEndpointBase}/${version}/${thisPlatform}-tds.json`;
      }
      module.exports = {
        displayCategories: ["Analytics", "Advertising", "Social Network", "Content Delivery", "Embedded Content"],
        feedbackUrl: "https://duckduckgo.com/feedback.js?type=extension-feedback",
        tosdrMessages: {
          A: "Good",
          B: "Mixed",
          C: "Poor",
          D: "Poor",
          E: "Poor",
          good: "Good",
          bad: "Poor",
          unknown: "Unknown",
          mixed: "Mixed"
        },
        httpsService: "https://duckduckgo.com/smarter_encryption.js",
        duckDuckGoSerpHostname: "duckduckgo.com",
        httpsMessages: {
          secure: "Encrypted Connection",
          upgraded: "Forced Encryption",
          none: "Unencrypted Connection"
        },
        /**
         * Major tracking networks data:
         * percent of the top 1 million sites a tracking network has been seen on.
         * see: https://webtransparency.cs.princeton.edu/webcensus/
         */
        majorTrackingNetworks: {
          google: 84,
          facebook: 36,
          twitter: 16,
          amazon: 14,
          appnexus: 10,
          oracle: 10,
          mediamath: 9,
          oath: 9,
          maxcdn: 7,
          automattic: 7
        },
        /*
         * Mapping entity names to CSS class name for popup icons
         */
        entityIconMapping: {
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
        httpsDBName: "https",
        httpsLists: [
          {
            type: "upgrade bloom filter",
            name: "httpsUpgradeBloomFilter",
            url: "https://staticcdn.duckduckgo.com/https/https-bloom.json"
          },
          {
            type: "don't upgrade bloom filter",
            name: "httpsDontUpgradeBloomFilters",
            url: "https://staticcdn.duckduckgo.com/https/negative-https-bloom.json"
          },
          {
            type: "upgrade safelist",
            name: "httpsUpgradeList",
            url: "https://staticcdn.duckduckgo.com/https/negative-https-allowlist.json"
          },
          {
            type: "don't upgrade safelist",
            name: "httpsDontUpgradeList",
            url: "https://staticcdn.duckduckgo.com/https/https-allowlist.json"
          }
        ],
        tdsLists: [
          {
            name: "surrogates",
            url: "/data/surrogates.txt",
            format: "text",
            source: "local"
          },
          {
            name: "tds",
            url: getTDSEndpoint("v6/current"),
            format: "json",
            source: "external",
            channels: {
              live: getTDSEndpoint("v6/current"),
              next: getTDSEndpoint("v6/next"),
              beta: getTDSEndpoint("beta")
            }
          },
          {
            name: "config",
            url: getConfigFileName(),
            format: "json",
            source: "external"
          }
        ],
        httpsErrorCodes: {
          "net::ERR_CONNECTION_REFUSED": 1,
          "net::ERR_ABORTED": 2,
          "net::ERR_SSL_PROTOCOL_ERROR": 3,
          "net::ERR_SSL_VERSION_OR_CIPHER_MISMATCH": 4,
          "net::ERR_NAME_NOT_RESOLVED": 5,
          NS_ERROR_CONNECTION_REFUSED: 6,
          NS_ERROR_UNKNOWN_HOST: 7,
          "An additional policy constraint failed when validating this certificate.": 8,
          "Unable to communicate securely with peer: requested domain name does not match the server\u2019s certificate.": 9,
          "Cannot communicate securely with peer: no common encryption algorithm(s).": 10,
          "SSL received a record that exceeded the maximum permissible length.": 11,
          "The certificate is not trusted because it is self-signed.": 12,
          downgrade_redirect_loop: 13
        },
        iconPaths: (
          /** @type {const} */
          {
            regular: "/img/icon_browser_action.png",
            withSpecialState: "/img/icon_browser_action_special.png"
          }
        ),
        platform: {
          name: getPlatformName()
        },
        trackerStats: (
          /** @type {const} */
          {
            allowedOrigin: "https://duckduckgo.com",
            allowedPathname: "ntp-tracker-stats.html",
            redirectTarget: "html/tracker-stats.html",
            clientPortName: "newtab-tracker-stats",
            /** @type {ReadonlyArray<string>} */
            excludedCompanies: ["ExoClick"],
            events: {
              incoming: {
                newTabPage_heartbeat: "newTabPage_heartbeat"
              },
              outgoing: {
                newTabPage_data: "newTabPage_data",
                newTabPage_disconnect: "newTabPage_disconnect"
              }
            }
          }
        )
      };
    }
  });

  // shared/js/devtools/list-editor.js
  var constants = require_constants();
  var listPicker = document.getElementById("list-picker");
  var listEditor = document.getElementById("list-content");
  var saveButton = document.getElementById("save");
  var lists = constants.tdsLists;
  var selected = lists[0].name;
  function getListFormat(name) {
    return lists.find((l) => l.name === name)?.format;
  }
  lists.forEach(({ name }) => {
    const button = document.createElement("button");
    button.innerText = name;
    button.classList.add("silver-bg");
    button.addEventListener("click", listSwitcher);
    listPicker.appendChild(button);
  });
  function listSwitcher(event) {
    document.querySelectorAll("#list-picker button").forEach((btn) => {
      btn.classList.remove("selected");
    });
    event.target.classList.add("selected");
    selected = event.target.innerText.toLowerCase();
    loadList(selected);
    saveButton.removeAttribute("disabled");
  }
  document.querySelector("#list-picker button").click();
  function sendMessage(messageType, options, callback) {
    chrome.runtime.sendMessage({ messageType, options }, callback);
  }
  function loadList(name) {
    sendMessage("getListContents", name, ({ etag, data }) => {
      const value = getListFormat(name) === "json" ? JSON.stringify(data, null, "  ") : data;
      document.querySelector("#list-content").value = value;
    });
  }
  function saveList(name) {
    const value = listEditor.value;
    sendMessage(
      "setListContents",
      {
        name,
        value: getListFormat(name) === "json" ? JSON.parse(value) : value
      },
      () => loadList(name)
    );
  }
  function reloadList(name) {
    sendMessage("reloadList", name, () => loadList(name));
  }
  saveButton.addEventListener("click", () => {
    saveList(selected);
  });
  document.getElementById("reload").addEventListener("click", () => {
    reloadList(selected);
  });
  listEditor.addEventListener("keypress", () => {
    setTimeout(() => {
      console.log("changed", getListFormat(selected));
      if (getListFormat(selected) === "json") {
        try {
          saveButton.removeAttribute("disabled");
        } catch (e) {
          console.log("parse error");
          saveButton.setAttribute("disabled", true);
        }
      } else {
        saveButton.removeAttribute("disabled");
      }
    }, 0);
  });
})();
