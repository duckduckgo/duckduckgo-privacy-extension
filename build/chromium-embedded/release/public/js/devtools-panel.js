"use strict";
(() => {
  // node_modules/@duckduckgo/content-scope-scripts/injected/src/captured-globals.js
  var Set = globalThis.Set;
  var Reflect2 = globalThis.Reflect;
  var customElementsGet = globalThis.customElements?.get.bind(globalThis.customElements);
  var customElementsDefine = globalThis.customElements?.define.bind(globalThis.customElements);
  var URL2 = globalThis.URL;
  var Proxy = globalThis.Proxy;
  var functionToString = Function.prototype.toString;
  var TypeError = globalThis.TypeError;
  var Symbol = globalThis.Symbol;
  var dispatchEvent = globalThis.dispatchEvent?.bind(globalThis);
  var addEventListener = globalThis.addEventListener?.bind(globalThis);
  var removeEventListener = globalThis.removeEventListener?.bind(globalThis);
  var CustomEvent2 = globalThis.CustomEvent;
  var Promise2 = globalThis.Promise;
  var String2 = globalThis.String;
  var Map2 = globalThis.Map;
  var Error = globalThis.Error;
  var randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  var console2 = globalThis.console;
  var consoleLog = console2.log.bind(console2);
  var consoleWarn = console2.warn.bind(console2);
  var consoleError = console2.error.bind(console2);
  var TextEncoder = globalThis.TextEncoder;
  var TextDecoder = globalThis.TextDecoder;
  var Uint8Array = globalThis.Uint8Array;
  var Uint16Array = globalThis.Uint16Array;
  var Uint32Array = globalThis.Uint32Array;
  var ReflectDeleteProperty = Reflect2.deleteProperty.bind(Reflect2);
  var getRandomValues = globalThis.crypto?.getRandomValues?.bind(globalThis.crypto);
  var generateKey = globalThis.crypto?.subtle?.generateKey?.bind(globalThis.crypto?.subtle);
  var exportKey = globalThis.crypto?.subtle?.exportKey?.bind(globalThis.crypto?.subtle);
  var importKey = globalThis.crypto?.subtle?.importKey?.bind(globalThis.crypto?.subtle);
  var encrypt = globalThis.crypto?.subtle?.encrypt?.bind(globalThis.crypto?.subtle);
  var decrypt = globalThis.crypto?.subtle?.decrypt?.bind(globalThis.crypto?.subtle);

  // node_modules/@duckduckgo/content-scope-scripts/injected/src/utils.js
  var globalObj = typeof window === "undefined" ? globalThis : window;
  var Error2 = globalObj.Error;
  var originalWindowDispatchEvent = typeof window === "undefined" ? null : window.dispatchEvent.bind(window);
  var lineTest = /(\()?(https?:[^)]+):[0-9]+:[0-9]+(\))?/;
  function getStackTraceUrls(stack) {
    const urls = new Set();
    if (!stack) return urls;
    try {
      const errorLines = stack.split("\n");
      for (const line of errorLines) {
        const res = line.match(lineTest);
        if (res && res[2]) {
          urls.add(new URL(res[2], location.href));
        }
      }
    } catch (e) {
    }
    return urls;
  }
  function getStackTraceOrigins(stack) {
    const urls = getStackTraceUrls(stack);
    const origins = new Set();
    for (const url of urls) {
      origins.add(url.hostname);
    }
    return origins;
  }
  var DDGPromise = globalObj.Promise;
  var DDGReflect = globalObj.Reflect;

  // shared/js/devtools/panel.js
  var table = document.querySelector("#request-table");
  var clearButton = document.getElementById("clear");
  var refreshButton = document.getElementById("refresh");
  var protectionButton = document.getElementById("protection");
  var tabPicker = document.getElementById("tab-picker");
  var tdsOption = document.getElementById("tds");
  var devtoolsMessageResponseReceived = new EventTarget();
  var port;
  function openPort() {
    port = chrome.runtime.connect({ name: "devtools" });
    port.onDisconnect.addListener(openPort);
    port.onMessage.addListener((message) => {
      const m = JSON.parse(message);
      if (m.tabId === tabId) {
        if (devtoolsMessageHandlers[m.action]) {
          devtoolsMessageHandlers[m.action](m);
        } else if (m?.message?.isProxy) {
          displayProxyRow(m);
        }
        if (document.querySelector("tbody").lastChild) {
          setRowVisible(document.querySelector("tbody").lastChild);
        }
      }
    });
  }
  openPort();
  function sendDevtoolsMessage(message) {
    return new Promise((resolve) => {
      message.id = Math.random();
      devtoolsMessageResponseReceived.addEventListener(message.id, ({ detail: response }) => resolve(response), { once: true });
      port.postMessage(message);
    });
  }
  function sendMessage(messageType, options, callback) {
    chrome.runtime.sendMessage({ messageType, options }, callback);
  }
  function addNewRequestRow(row) {
    const counter = row.querySelector(".action-count");
    panelConfig.currentCounter = counter;
    panelConfig.lastRowTemplate = row.cloneNode(true);
    table.appendChild(row);
  }
  function addRequestRow(row) {
    const prevRowTemplate = panelConfig.lastRowTemplate;
    if (prevRowTemplate) {
      if (prevRowTemplate.innerHTML === row.innerHTML) {
        incrementCurrentRequestCounter();
      } else {
        addNewRequestRow(row);
      }
    } else {
      addNewRequestRow(row);
    }
  }
  function incrementCurrentRequestCounter() {
    const counter = panelConfig.currentCounter;
    const prevCount = parseInt(counter.textContent.replaceAll(/[ [\]]/g, "") || "1");
    counter.textContent = ` [${prevCount + 1}]`;
  }
  var tabId = chrome.devtools?.inspectedWindow?.tabId || parseInt(0 + new URL(document.location.href).searchParams.get("tabId"));
  var loadConfigurableFeatures = new Promise((resolve) => {
    sendMessage("getListContents", "config", ({ data: config }) => {
      const features = Object.keys(config.features);
      features.forEach((feature) => {
        const btn = document.createElement("button");
        btn.id = feature;
        btn.innerText = `${feature}: ???`;
        document.querySelector("#protections").appendChild(btn);
        btn.addEventListener("click", async () => {
          btn.disabled = true;
          await sendDevtoolsMessage({
            action: "toggleFeature",
            feature,
            tabId
          });
          reloadPage();
          btn.disabled = false;
        });
      });
      resolve(features);
    });
  });
  var actionIcons = {
    block: "\u{1F6AB}",
    redirect: "\u27A1\uFE0F",
    ignore: "\u26A0\uFE0F",
    none: "\u2705",
    "ad-attribution": "\u{1FA84}",
    "ignore-user": "\u{1F39B}\uFE0F"
  };
  function setupProtectionButton(element, textName, isEnabled) {
    element.innerText = `${textName}: ${isEnabled ? "ON" : "OFF"}`;
    element.classList.add(`protection-button-${isEnabled ? "on" : "off"}`);
    element.classList.remove(`protection-button-${isEnabled ? "off" : "on"}`);
  }
  var devtoolsMessageHandlers = {
    response: ({ message: { id, response } }) => {
      devtoolsMessageResponseReceived.dispatchEvent(new CustomEvent(id, { detail: response }));
    },
    tracker: (m) => {
      const { tracker, url, requestData, siteUrl, serviceWorkerInitiated } = m.message;
      const row = document.getElementById("request-row").content.firstElementChild.cloneNode(true);
      const cells = row.querySelectorAll("td");
      const toggleLink = row.querySelector(".block-toggle");
      toggleLink.href = "";
      if (tracker.action === "block") {
        toggleLink.innerText = "I";
      } else {
        toggleLink.innerText = "B";
      }
      toggleLink.addEventListener("click", (ev) => {
        ev.preventDefault();
        sendDevtoolsMessage({
          action: "toggleTracker",
          toggleType: toggleLink.innerText,
          tabId,
          tracker,
          requestData,
          siteUrl
        });
        row.classList.remove(tracker.action);
        row.classList.add(toggleLink.innerText === "I" ? "ignore" : "block");
      });
      cells[1].textContent = `${serviceWorkerInitiated ? "\u2699\uFE0F " : ""}${url}`;
      cells[2].querySelector(".request-action").textContent = `${actionIcons[tracker.action]} ${tracker.action} (${tracker.reason})`;
      cells[3].textContent = tracker.fullTrackerDomain;
      cells[4].textContent = requestData.type;
      row.classList.add(tracker.action);
      addRequestRow(row);
    },
    tabChange: (m) => {
      const tab = m.message;
      const protectionDisabled = tab.site?.allowlisted || tab.site?.isBroken;
      setupProtectionButton(protectionButton, "Protection", !protectionDisabled);
      loadConfigurableFeatures.then((features) => {
        features.forEach((feature) => {
          const featureEnabled = tab.site?.enabledFeatures.includes(feature);
          const featureButton = document.getElementById(feature);
          setupProtectionButton(featureButton, feature, featureEnabled);
        });
      });
    },
    cookie: (m) => {
      const { action, kind, url, requestId, type } = m.message;
      const rowId = `request-${requestId}`;
      if (document.getElementById(rowId) !== null) {
        const row = document.getElementById(rowId);
        const cells = row.querySelectorAll("td");
        row.classList.add(kind);
        cells[3].textContent = `${cells[3].textContent}, ${kind}`;
      } else {
        const row = document.getElementById("cookie-row").content.firstElementChild.cloneNode(true);
        row.id = rowId;
        const cells = row.querySelectorAll("td");
        const cleanUrl = new URL(url);
        cleanUrl.search = "";
        cleanUrl.hash = "";
        cells[1].textContent = cleanUrl.href;
        cells[2].querySelector(".request-action").textContent = `\u{1F36A} ${action}`;
        cells[3].textContent = kind;
        cells[4].textContent = type;
        row.classList.add(kind);
        addRequestRow(row);
      }
    },
    runtimeChecks: (m) => {
      const { documentUrl, matchType, matchedStackDomain, stack, scriptOrigins } = m.message;
      if (!matchType) return displayProxyRow(m);
      const row = document.getElementById("cookie-row").content.firstElementChild.cloneNode(true);
      const cells = row.querySelectorAll("td");
      cells[1].textContent = documentUrl;
      cells[2].querySelector(".request-action").textContent = `Runtime Checks\u{1F4E8} ${matchType}`;
      if (scriptOrigins) {
        cells[3].textContent = scriptOrigins.join(",");
      }
      if (stack) appendCallStack(cells[3], stack, 0);
      if (matchedStackDomain) {
        cells[4].textContent += `Matched: ${matchedStackDomain}`;
      }
      row.classList.add("runtimeChecks");
      addRequestRow(row);
    },
    jsException: (m) => {
      const { documentUrl, message, filename, lineno, colno, stack, scriptOrigins } = m.message;
      const row = document.getElementById("cookie-row").content.firstElementChild.cloneNode(true);
      const cells = row.querySelectorAll("td");
      cells[1].textContent = documentUrl;
      cells[2].querySelector(".request-action").textContent = `JS\u{1FAB2} ${message}`;
      if (scriptOrigins) cells[3].textContent = scriptOrigins.join(",");
      if (stack) appendCallStack(cells[3], stack, 0);
      cells[4].textContent = `${filename}:${lineno}:${colno}`;
      row.classList.add("jsException");
      addRequestRow(row);
    },
    jscookie: (m) => {
      const { documentUrl, action, reason, value, stack } = m.message;
      const scriptOrigins = [...getStackTraceOrigins(stack)];
      const row = document.getElementById("cookie-row").content.firstElementChild.cloneNode(true);
      const cells = row.querySelectorAll("td");
      cells[1].textContent = documentUrl;
      cells[2].querySelector(".request-action").textContent = `JS\u{1F36A} ${action} (${reason})`;
      cells[3].textContent = scriptOrigins.join(",");
      appendCallStack(cells[3], stack);
      cells[4].textContent = value.split(";")[0];
      row.classList.add("jscookie");
      addRequestRow(row);
    }
  };
  function displayProxyRow(m) {
    const { documentUrl, action, kind, stack, args } = m.message;
    const featureAction = m.action;
    const row = document.getElementById("cookie-row").content.firstElementChild.cloneNode(true);
    const cells = row.querySelectorAll("td");
    cells[1].textContent = documentUrl;
    cells[2].querySelector(".request-action").textContent = `${featureAction} proxy ${action}`;
    const argsOut = JSON.parse(args).join(", ");
    cells[3].setAttribute("colspan", 2);
    cells[4].remove();
    cells[3].textContent = `${kind}(${argsOut})`;
    appendCallStack(cells[3], stack);
    row.classList.add("proxyCall", featureAction);
    addRequestRow(row);
  }
  function appendCallStack(cell, stack, drop = 2) {
    if (stack) {
      const lines = stack.split("\n");
      for (let i = 0; i < drop; i++) lines.shift();
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = "Call stack";
      details.appendChild(summary);
      details.appendChild(document.createTextNode(lines.join("\n")));
      cell.appendChild(details);
    }
  }
  var panelConfig = {
    rowVisibility: {
      blocked: true,
      ignored: true,
      ignoredFirstParty: true,
      redirected: true,
      cookieHTTP: true,
      cookieJS: true,
      jsException: true,
      runtimeChecks: true,
      proxyCalls: false,
      noneRequest: true,
      ignoreUser: true
    },
    rowFilter: ""
  };
  function shouldShowRow(row) {
    if (panelConfig.rowFilter !== "") {
      if (!row.textContent.match(panelConfig.rowFilter)) {
        return false;
      }
    }
    const className = row.classList[0];
    switch (className) {
      case "ignore":
        if (row.querySelector(".request-action").textContent === `${actionIcons.ignore} ignore (first party)`) {
          return panelConfig.rowVisibility.ignored && panelConfig.rowVisibility.ignoredFirstParty;
        }
        return panelConfig.rowVisibility.ignored;
      case "block":
        return panelConfig.rowVisibility.blocked;
      case "redirect":
        return panelConfig.rowVisibility.redirected;
      case "cookie-tracker":
      case "set-cookie-tracker":
        return panelConfig.rowVisibility.cookieHTTP;
      case "jscookie":
        return panelConfig.rowVisibility.cookieJS;
      case "jsException":
        return panelConfig.rowVisibility.jsException;
      case "runtimeChecks":
        return panelConfig.rowVisibility.runtimeChecks;
      case "proxyCall":
        return panelConfig.rowVisibility.proxyCalls;
      case "none":
        return panelConfig.rowVisibility.noneRequest;
      case "ignore-user":
        return panelConfig.rowVisibility.ignoreUser;
    }
    return true;
  }
  function setRowVisible(row) {
    row.hidden = !shouldShowRow(row);
  }
  function updateTabSelector() {
    chrome.tabs.query({}, (tabs) => {
      while (tabPicker.firstChild !== null) {
        tabPicker.removeChild(tabPicker.firstChild);
      }
      const selectTabOption = document.createElement("option");
      selectTabOption.value = "";
      selectTabOption.innerText = "--Select Tab--";
      tabPicker.appendChild(selectTabOption);
      tabs.forEach((tab) => {
        if (tab.url.startsWith("http")) {
          const elem = document.createElement("option");
          elem.value = tab.id;
          elem.innerText = tab.title;
          if (tab.id === tabId) {
            elem.setAttribute("selected", true);
          }
          tabPicker.appendChild(elem);
        }
      });
    });
  }
  if (!chrome.devtools) {
    updateTabSelector();
    chrome.tabs.onUpdated.addListener(updateTabSelector);
    tabPicker.addEventListener("change", () => {
      tabId = parseInt(tabPicker.selectedOptions[0].value);
      clear();
      sendDevtoolsMessage({ action: "setTab", tabId });
    });
  } else {
    tabPicker.hidden = true;
  }
  if (tabId) {
    sendDevtoolsMessage({ action: "setTab", tabId });
  }
  function clear() {
    while (table.lastChild) {
      table.removeChild(table.lastChild);
    }
    panelConfig.lastRowTemplate = void 0;
    panelConfig.currentCounter = void 0;
  }
  function reloadPage() {
    clear();
    if (chrome.devtools) {
      chrome.devtools.inspectedWindow.eval("window.location.reload();");
    } else {
      chrome.tabs.reload(tabId);
    }
  }
  clearButton.addEventListener("click", clear);
  refreshButton.addEventListener("click", reloadPage);
  protectionButton.addEventListener("click", async () => {
    protectionButton.disabled = true;
    await sendDevtoolsMessage({
      action: "toggleProtections",
      tabId
    });
    reloadPage();
    protectionButton.disabled = false;
  });
  sendMessage("getSetting", { name: "tds-channel" }, (result) => {
    console.log("setting", result);
    const active = tdsOption.querySelector(`[value=${result}`);
    if (active) {
      active.setAttribute("selected", true);
    }
  });
  tdsOption.addEventListener("change", (e) => {
    sendMessage(
      "updateSetting",
      {
        name: "tds-channel",
        value: tdsOption.selectedOptions[0].value
      },
      () => {
        sendMessage("reloadList", "tds");
      }
    );
  });
  var displayFilters = document.querySelector("#table-filter").querySelectorAll("input");
  displayFilters.forEach((input) => {
    if (input.id === "search-box") {
      input.value = panelConfig.rowFilter;
    } else {
      input.checked = panelConfig.rowVisibility[input.dataset.filterToggle];
    }
    input.addEventListener("change", () => {
      if (input.id === "search-box") {
        panelConfig.rowFilter = input.value;
      }
      if (input.dataset.filterToggle) {
        panelConfig.rowVisibility[input.dataset.filterToggle] = input.checked;
      }
      document.querySelectorAll("tbody > tr").forEach(setRowVisible);
    });
  });
  var settingsResizeObserver = new ResizeObserver(function(entries) {
    const height = entries[0].contentRect.height;
    document.querySelector("thead").style.top = `${height}px`;
  });
  settingsResizeObserver.observe(document.getElementById("settings-panel"));
})();
