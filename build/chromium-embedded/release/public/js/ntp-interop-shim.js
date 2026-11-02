"use strict";
(() => {
  // shared/js/ntp/constants.js
  var NTP_PORT_NAME = "ntp-windows-interop";
  var NTP_RECONNECT_MESSAGE = "ntpReconnect";

  // shared/js/ntp/interop-shim.js
  var messageHandlers = /* @__PURE__ */ new Set();
  var pendingRequests = /* @__PURE__ */ new Map();
  var port = null;
  function connect() {
    port = chrome.runtime.connect({ name: NTP_PORT_NAME });
    port.onMessage.addListener((msg) => {
      pendingRequests.delete(msg.id);
      for (const handler of messageHandlers) {
        handler({ data: msg });
      }
    });
    port.onDisconnect.addListener(() => {
      port = null;
      if (pendingRequests.size > 0) {
        connect();
      }
    });
    for (const msg of pendingRequests.values()) {
      port.postMessage(msg);
    }
  }
  globalThis.windowsInteropPostMessage = (msg) => {
    if (!port) {
      connect();
    }
    if (msg.Id) {
      pendingRequests.set(msg.Id, msg);
    }
    port?.postMessage(msg);
  };
  globalThis.windowsInteropAddEventListener = (_name, handler) => {
    messageHandlers.add(handler);
  };
  globalThis.windowsInteropRemoveEventListener = (_name, handler) => {
    messageHandlers.delete(handler);
  };
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.[NTP_RECONNECT_MESSAGE] && !port) {
      connect();
    }
  });
  connect();
})();
