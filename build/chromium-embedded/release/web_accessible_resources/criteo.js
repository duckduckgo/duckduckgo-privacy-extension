"use strict";

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Based on https://searchfox.org/mozilla-central/source/browser/extensions/webcompat/shims/criteo.js

/* eslint indent: ["error", 2], quotes: ["error", "double"],
   comma-dangle: ["error", "only-multiline"], space-before-function-paren: ["error", "never"] */

/**
 * Bug 1713720 - Shim Criteo
 *
 * Sites relying on window.Criteo to be loaded can experience
 * breakage if it is blocked. Stubbing out the API in a shim can
 * mitigate this breakage.
 */

if (!(window.Criteo && window.Criteo.CallRTA)) {
  window.Criteo = {
    CallRTA() {},
    ComputeStandaloneDFPTargeting() {},
    DisplayAcceptableAdIfAdblocked() {},
    DisplayAd() {},
    GetBids() {},
    GetBidsForAdUnit() {},
    Passback: {
      RequestBids() {},
      RenderAd() {},
    },
    PubTag: {
      Adapters: {
        AMP() {},
        Prebid() {},
      },
      Context: {
        GetIdfs() {},
        SetIdfs() {},
      },
      DirectBidding: {
        DirectBiddingEvent() {},
        DirectBiddingSlot() {},
        DirectBiddingUrlBuilder() {},
        Size() {},
      },
      RTA: {
        DefaultCrtgContentName: "crtg_content",
        DefaultCrtgRtaCookieName: "crtg_rta",
      },
    },
    RenderAd() {},
    RequestBids() {},
    RequestBidsOnGoogleTagSlots() {},
    SetCCPAExplicitOptOut() {},
    SetCeh() {},
    SetDFPKeyValueTargeting() {},
    SetLineItemRanges() {},
    SetPublisherExt() {},
    SetSlotsExt() {},
    SetTargeting() {},
    SetUserExt() {},
    events: {
      push() {},
    },
    passbackEvents: [],
    usePrebidEvents: true,
  };
}
