"use strict";

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Based on https://searchfox.org/mozilla-central/source/browser/extensions/webcompat/shims/apstag.js

/* eslint indent: ["error", 2, {"SwitchCase": 1}], quotes: ["error", "double"],
   comma-dangle: ["error", "only-multiline"], space-before-function-paren: ["error", "never"] */

/**
 * Bug 1713698 - Shim Amazon Transparent Ad Marketplace's apstag.js
 *
 * Some sites such as politico.com rely on Amazon TAM tracker to serve ads,
 * breaking functionality like galleries if it is blocked. This shim helps
 * mitigate major breakage in that case.
 */

if (!(window.apstag && window.apstag._getSlotIdToNameMapping)) {
  const _Q = (window.apstag && window.apstag._Q) || [];

  const newBid = config => {
    return {
      amznbid: "",
      amzniid: "",
      amznp: "",
      amznsz: "0x0",
      size: "0x0",
      slotID: config.slotID,
    };
  };

  window.apstag = {
    _Q,
    _getSlotIdToNameMapping() {},
    bids() {},
    debug() {},
    deleteId() {},
    fetchBids(cfg, cb) {
      if (!Array.isArray(cfg && cfg.slots)) {
        return;
      }
      setTimeout(() => {
        cb(cfg.slots.map(s => newBid(s)));
      }, 1);
    },
    init() {},
    punt() {},
    renderImp() {},
    renewId() {},
    setDisplayBids() {},
    targetingKeys: () => [],
    thirdPartyData: {},
    updateId() {},
  };

  window.apstagLOADED = true;

  const isIterable =
    a => Array.isArray(a) ||
         (typeof Symbol !== "undefined" && Symbol.iterator && a[Symbol.iterator]) ||
         a.toString() === "[object Arguments]";

  _Q.push = function(prefix, args) {
    // TODO: Check if this code path ever _isn't_ hit, seems like a bug in the
    //       original shim implementation?
    if (isIterable(prefix) && typeof args === "undefined") {
      [prefix, ...args] = Array.from(prefix);
    }

    if (args && args.length === 1 && isIterable(args[0])) {
      args = Array.from(args[0]);
    }

    try {
      switch (prefix) {
        case "f":
          window.apstag.fetchBids(...args);
          break;
        case "i":
          window.apstag.init(...args);
          break;
      }
    } catch (e) {
      console.trace(e);
    }
  };

  for (const cmd of _Q) {
    _Q.push(cmd);
  }
}
