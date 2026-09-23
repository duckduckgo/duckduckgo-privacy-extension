"use strict";

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Based on https://searchfox.org/mozilla-central/source/browser/extensions/webcompat/shims/nielsen.js

/* eslint indent: ["error", 2], quotes: ["error", "double"],
   comma-dangle: ["error", "only-multiline"], space-before-function-paren: ["error", "never"],
   lines-between-class-members: ["off"] */

/**
 * Bug 1760754 - Shim Nielsen tracker
 *
 * Sites expecting the Nielsen tracker to load properly can break if it
 * is blocked. This shim mitigates that breakage by loading a stand-in.
 */

if (!window.nol_t) {
  const cid = "";

  let domain = "";
  let schemeHost = "";
  let scriptName = "";
  try {
    const url = document?.currentScript?.src;
    const { pathname, protocol, host } = new URL(url);
    domain = host.split(".").slice(0, -2).join(".");
    schemeHost = `${protocol}//${host}/`;
    scriptName = pathname.split("/").pop();
  } catch (_) {}

  class NolTracker {
    constructor() {
      this.CONST = {
        max_tags: 20,
      };
      this.feat = {};
      this.globals = {
        cid,
        content: "0",
        defaultApidFile: "config250",
        defaultErrorParams: {
          nol_vcid: "c00",
          nol_clientid: "",
        },
        domain,
        fpidSfCodeList: [""],
        init() {},
        tagCurrRetry: -1,
        tagMaxRetry: 3,
        wlCurrRetry: -1,
        wlMaxRetry: 3,
      };
      this.pmap = [];
      this.pvar = {
        cid,
        content: "0",
        cookies_enabled: "n",
        server: domain,
      };
      this.scriptName = [scriptName];
      this.version = "6.0.107";
    }
    addScript() {}
    catchLinkOverlay() {}
    clickEvent() {}
    clickTrack() {}
    // eslint-disable-next-line camelcase
    do_sample() {}
    downloadEvent() {}
    eventTrack() {}
    filter() {}
    fireToUrl() {}
    getSchemeHost() {
      return schemeHost;
    }
    getVersion() {}
    iframe() {}
    // eslint-disable-next-line camelcase
    in_sample() {
      return true;
    }
    injectBsdk() {}
    invite() {}
    linkTrack() {}
    mergeFeatures() {}
    pageEvent() {}
    pause() {}
    populateWhitelist() {}
    post() {}
    postClickTrack() {}
    postData() {}
    postEvent() {}
    postEventTrack() {}
    postLinkTrack() {}
    prefix() {
      return "";
    }
    processDdrsSvc() {}
    random() {}
    record() {
      return this;
    }
    regLinkOverlay() {}
    regListen() {}
    retrieveCiFileViaCors() {}
    sectionEvent() {}
    sendALink() {}
    sendForm() {}
    sendIt() {}
    slideEvent() {}
    whitelistAssigned() {}
  };

  window.nol_t = () => {
    return new NolTracker();
  };
}
