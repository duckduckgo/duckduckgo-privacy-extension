"use strict";
(() => {
  // node_modules/@duckduckgo/autoconsent/dist/autoconsent.esm.js
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
  var SUPPORTED_RULE_STEP_VERSION = 3;
  function getRandomID() {
    if (crypto && typeof crypto.randomUUID !== "undefined") {
      return crypto.randomUUID();
    }
    return Math.random().toString();
  }
  var Deferred = class {
    constructor(id, timeout = 1e3) {
      this.id = id;
      this.promise = new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
      });
      this.timer = window.setTimeout(() => {
        this.reject(new Error("timeout"));
      }, timeout);
    }
  };
  var evalState = {
    pending: /* @__PURE__ */ new Map(),
    sendContentMessage: null
  };
  function requestEval(code, snippetId) {
    if (!evalState.sendContentMessage) {
      return Promise.reject(new Error("AutoConsent is not initialized yet"));
    }
    const id = getRandomID();
    evalState.sendContentMessage({
      type: "eval",
      id,
      code,
      snippetId
    });
    const deferred = new Deferred(id);
    evalState.pending.set(deferred.id, deferred);
    return deferred.promise;
  }
  function resolveEval(id, value) {
    const deferred = evalState.pending.get(id);
    if (deferred) {
      evalState.pending.delete(id);
      deferred.timer && window.clearTimeout(deferred.timer);
      deferred.resolve(value);
    } else {
      console.warn("no eval #", id);
    }
  }
  function getStyleElement(styleOverrideElementId = "autoconsent-css-rules") {
    const styleSelector = `style#${styleOverrideElementId}`;
    const existingElement = document.querySelector(styleSelector);
    if (existingElement && existingElement instanceof HTMLStyleElement) {
      return existingElement;
    } else {
      const parent = document.head || document.getElementsByTagName("head")[0] || document.documentElement;
      const css = document.createElement("style");
      css.id = styleOverrideElementId;
      parent.appendChild(css);
      return css;
    }
  }
  function getHidingStyle(method) {
    const hidingSnippet = method === "opacity" ? `opacity: 0` : `display: none`;
    return `${hidingSnippet} !important; z-index: -1 !important; pointer-events: none !important;`;
  }
  function hideElements(styleEl, selector, method = "display") {
    const rule = `${selector} { ${getHidingStyle(method)} } `;
    if (styleEl instanceof HTMLStyleElement) {
      styleEl.innerText += rule;
      return selector.length > 0;
    }
    return false;
  }
  function appendStylesheetRule(styleEl, cssRule, marker) {
    if (!(styleEl instanceof HTMLStyleElement) || cssRule.length === 0) {
      return false;
    }
    const markerComment = marker ? `/* autoconsent:${marker} */` : "";
    if (markerComment && styleEl.innerText.includes(markerComment)) {
      return true;
    }
    if (!markerComment && styleEl.innerText.includes(cssRule.trim())) {
      return true;
    }
    styleEl.innerText += `${markerComment}${markerComment ? " " : ""}${cssRule} `;
    return true;
  }
  async function waitFor(predicate, maxTimes, interval) {
    const result = await predicate();
    if (!result && maxTimes > 0) {
      return new Promise((resolve) => {
        setTimeout(async () => {
          resolve(waitFor(predicate, maxTimes - 1, interval));
        }, interval);
      });
    }
    return Promise.resolve(result);
  }
  function isElementVisible(elem) {
    if (!elem) {
      return false;
    }
    if (elem.offsetParent !== null) {
      return true;
    } else {
      const css = window.getComputedStyle(elem);
      if (css.position === "fixed" && css.display !== "none") {
        return true;
      }
    }
    return false;
  }
  function copyObject(data) {
    if (globalThis.structuredClone) {
      return structuredClone(data);
    }
    return JSON.parse(JSON.stringify(data));
  }
  function normalizeConfig(providedConfig) {
    const defaultConfig = {
      enabled: true,
      autoAction: "optOut",
      // if falsy, the extension will wait for an explicit user signal before opting in/out
      disabledCmps: [],
      enablePrehide: true,
      enableCosmeticRules: true,
      enableGeneratedRules: true,
      enableHeuristicDetection: false,
      enablePopupMutationObserver: false,
      detectRetries: 20,
      isMainWorld: false,
      prehideTimeout: 2e3,
      visualTest: false,
      logs: {
        lifecycle: false,
        rulesteps: false,
        detectionsteps: false,
        evals: false,
        errors: true,
        messages: false,
        waits: false
      },
      performanceLoggingEnabled: false,
      heuristicPopupSearchTimeout: 100,
      enableHeuristicHitTest: false,
      heuristicMode: "off"
      // heuristic disabled by default
    };
    const updatedConfig = copyObject(defaultConfig);
    for (const key of Object.keys(defaultConfig)) {
      if (typeof providedConfig[key] !== "undefined") {
        updatedConfig[key] = providedConfig[key];
      }
    }
    return updatedConfig;
  }
  function scheduleWhenIdle(callback, timeout = 500) {
    if (globalThis.requestIdleCallback) {
      requestIdleCallback(callback, { timeout });
    } else {
      setTimeout(callback, 0);
    }
  }
  function highlightNode(node) {
    const highlightedNode = node;
    if (!node.style) return;
    if (highlightedNode.__oldStyles !== void 0) {
      return;
    }
    if (node.hasAttribute("style")) {
      highlightedNode.__oldStyles = node.style.cssText;
    }
    node.style.animation = "pulsate .5s infinite";
    node.style.outline = "solid red";
    let styleTag = document.querySelector("style#autoconsent-debug-styles");
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = "autoconsent-debug-styles";
    }
    styleTag.textContent = `
      @keyframes pulsate {
        0% {
          outline-width: 8px;
          outline-offset: -4px;
        }
        50% {
          outline-width: 4px;
          outline-offset: -2px;
        }
        100% {
          outline-width: 8px;
          outline-offset: -4px;
        }
      }
    `;
    document.head.appendChild(styleTag);
  }
  function unhighlightNode(node) {
    const highlightedNode = node;
    if (!node.style || !node.hasAttribute("style")) return;
    if (highlightedNode.__oldStyles !== void 0) {
      node.style.cssText = highlightedNode.__oldStyles;
      delete highlightedNode.__oldStyles;
    } else {
      node.removeAttribute("style");
    }
  }
  function isTopFrame() {
    return window.top === window && (!globalThis.location.ancestorOrigins || globalThis.location.ancestorOrigins.length === 0);
  }
  var snippets = {
    // code-based rules
    EVAL_0: () => console.log(1),
    EVAL_DIDOMI_OPT_OUT: () => {
      if (window.Didomi) {
        window.Didomi.setUserDisagreeToAll();
        return true;
      }
      return false;
    },
    EVAL_DIDOMI_TEST: () => {
      const purposes = window.Didomi?.getCurrentUserStatus?.()?.purposes;
      if (purposes) {
        return Object.values(purposes).some((p) => !p.enabled);
      }
      const disabled = window.Didomi?.getUserConsentStatusForAll?.()?.purposes?.disabled;
      return Array.isArray(disabled) && disabled.length > 0;
    },
    EVAL_CONSENTMANAGER_1: () => {
      const cmpData = window.__cmp?.("getCMPData");
      return !!cmpData && typeof cmpData === "object";
    },
    EVAL_CONSENTMANAGER_2: () => window.__cmp?.("consentStatus")?.userChoiceExists === false,
    EVAL_CONSENTMANAGER_3: () => __cmp("setConsent", 0),
    EVAL_CONSENTMANAGER_4: () => __cmp("setConsent", 1),
    EVAL_CONSENTMANAGER_5: () => __cmp("consentStatus").userChoiceExists,
    EVAL_CONSENTMANAGER_NCMP_REJECT: () => {
      if (typeof window.__npcmp !== "function") return false;
      window.__npcmp("reject");
      return true;
    },
    EVAL_CONSENTMANAGER_NCMP_ACCEPT: () => {
      if (typeof window.__npcmp !== "function") return false;
      window.__npcmp("save");
      return true;
    },
    EVAL_COOKIEBOT_1: () => !!window.Cookiebot,
    EVAL_COOKIEBOT_2: () => !window.Cookiebot.hasResponse && window.Cookiebot.dialog?.visible === true,
    EVAL_COOKIEBOT_3: () => window.Cookiebot.withdraw() || true,
    EVAL_COOKIEBOT_4: () => window.Cookiebot.hide() || true,
    EVAL_COOKIEBOT_5: () => window.Cookiebot.declined === true,
    EVAL_KLARO_1: () => {
      const config = globalThis.klaroConfig || globalThis.klaro?.getManager && globalThis.klaro.getManager().config;
      if (!config) {
        return true;
      }
      const optionalServices = (config.services || config.apps).filter((s) => !s.required).map((s) => s.name);
      if (klaro && klaro.getManager) {
        const manager = klaro.getManager();
        return optionalServices.every((name) => !manager.consents[name]);
      } else if (klaroConfig && klaroConfig.storageMethod === "cookie") {
        const cookieName = klaroConfig.cookieName || klaroConfig.storageName;
        const consents = JSON.parse(
          decodeURIComponent(
            document.cookie.split(";").find((c) => c.trim().startsWith(cookieName)).split("=")[1]
          )
        );
        return Object.keys(consents).filter((k) => optionalServices.includes(k)).every((k) => consents[k] === false);
      }
    },
    EVAL_KLARO_OPEN_POPUP: () => {
      klaro.show(void 0, true);
    },
    EVAL_KLARO_TRY_API_OPT_OUT: () => {
      if (window.klaro && typeof klaro.show === "function" && typeof klaro.getManager === "function") {
        try {
          klaro.getManager().changeAll(false);
          klaro.getManager().saveAndApplyConsents();
          return true;
        } catch (e) {
          console.warn(e);
          return false;
        }
      }
      return false;
    },
    EVAL_ONETRUST_1: () => window.OnetrustActiveGroups.split(",").filter((s) => s.length > 0).length <= 1,
    EVAL_TRUSTARC_TOP: () => window && window.truste && window.truste.eu.bindMap.prefCookie === "0",
    EVAL_TRUSTARC_FRAME_TEST: () => window && window.QueryString && window.QueryString.preferences === "0",
    EVAL_TRUSTARC_FRAME_GTM: () => window && window.QueryString && window.QueryString.gtm === "1",
    // declarative rules
    EVAL_ADOPT_TEST: () => !!localStorage.getItem("adoptConsentMode"),
    EVAL_ADULTFRIENDFINDER_TEST: () => !!localStorage.getItem("cookieConsent"),
    EVAL_AYLO_COOKIE_MANAGER_READY: () => !!(window.wl_cookie_consent_manager || window._Cookie_Consent_Manager_brand),
    EVAL_BAHN_TEST: () => utag.gdpr.getSelectedCategories().length === 1,
    // the close handler listens for mouseup, which element.click() does not dispatch
    EVAL_BING_NOTICE_CLOSE: () => {
      const close = document.querySelector("#bnp_ttc_close");
      close.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
      close.click();
      return true;
    },
    EVAL_BIGCOMMERCE_CONSENT_MANAGER_DETECT: () => !!(window.consentManager && window.consentManager.version),
    EVAL_BORLABS_0: () => !JSON.parse(
      decodeURIComponent(
        document.cookie.split(";").find((c) => c.indexOf("borlabs-cookie") !== -1).split("=", 2)[1]
      )
    ).consents.statistics,
    EVAL_CC_BANNER2_0: () => !!document.cookie.match(/sncc=[^;]+D%3Dtrue/),
    EVAL_COINBASE_0: () => JSON.parse(decodeURIComponent(document.cookie.match(/cm_(eu|default)_preferences=([0-9a-zA-Z\\{\\}\\[\\]%:]*);?/)[2])).consent.length <= 1,
    // the close icon is an SVG, which has no click() method
    EVAL_COOKIE_POPUP_CLOSE: () => document.querySelector("#cookie-popup #close-cookies").dispatchEvent(new MouseEvent("click", { bubbles: true })) || true,
    EVAL_COOKIE_LAW_INFO_0: () => {
      if (CLI.disableAllCookies) CLI.disableAllCookies();
      if (CLI.reject_close) CLI.reject_close();
      document.body.classList.remove("cli-barmodal-open");
      return true;
    },
    EVAL_COOKIE_LAW_INFO_DETECT: () => !!window.CLI,
    EVAL_COOKIE_MANAGER_POPUP_0: () => JSON.parse(
      document.cookie.split(";").find((c) => c.trim().startsWith("CookieLevel")).split("=")[1]
    ).social === false,
    EVAL_COOKIEALERT_0: () => document.querySelector("body").removeAttribute("style") || true,
    EVAL_COOKIEALERT_1: () => document.querySelector("body").removeAttribute("style") || true,
    EVAL_COOKIEALERT_2: () => window.CookieConsent.declined === true,
    EVAL_COOKIEFIRST_0: () => ((o) => o.performance === false && o.functional === false && o.advertising === false)(
      JSON.parse(
        decodeURIComponent(
          document.cookie.split(";").find((c) => c.indexOf("cookiefirst") !== -1).trim()
        ).split("=")[1]
      )
    ),
    EVAL_COOKIEFIRST_1: () => document.querySelectorAll("button[data-cookiefirst-accent-color=true][role=checkbox]:not([disabled])").forEach((i) => i.getAttribute("aria-checked") === "true" && i.click()) || true,
    EVAL_COOKIEINFORMATION_0: () => CookieInformation.declineAllCategories() || true,
    EVAL_COOKIEINFORMATION_1: () => CookieInformation.submitAllCategories() || true,
    // banner button order and meaning are configurable per site, so set the consent levels through the public API
    EVAL_COOKIEREPORTS_OPT_OUT: () => {
      const cr = window._cookiereports;
      if (typeof cr?.saveConsent !== "function") return false;
      cr.saveConsent({ 1: true, 2: false, 3: false, 4: false, 5: false });
      cr.processConsent("banner", { trigger: "ok" });
      cr.hideBanner();
      return true;
    },
    EVAL_COOKIEREPORTS_OPT_IN: () => {
      const cr = window._cookiereports;
      if (typeof cr?.saveConsent !== "function") return false;
      cr.saveConsent({ 1: true, 2: true, 3: true, 4: true, 5: true });
      cr.processConsent("banner", { trigger: "ok" });
      cr.hideBanner();
      return true;
    },
    EVAL_COOKIEREPORTS_TEST: () => {
      const levels = window._cookiereports?.loadConsent?.();
      return !!levels && Object.keys(levels).length > 0 && Object.values(levels).every((v) => !v);
    },
    // turn the single-button form into a decline submission, same fields as the CMP's own decline form
    EVAL_EE_CONSENT_DECLINE_0: () => document.querySelectorAll('#cookieConsentFormAccept input[name^="ee:cookies_"]').forEach((i) => i.value = "n") || true,
    EVAL_ETSY_0: () => document.querySelectorAll(".gdpr-overlay-body input").forEach((toggle) => {
      toggle.checked = false;
    }) || true,
    EVAL_ETSY_1: () => document.querySelector(".gdpr-overlay-view button[data-wt-overlay-close]").click() || true,
    EVAL_EZOIC_0: () => ezCMP.handleAcceptAllClick(),
    EVAL_FIDES_DETECT_POPUP: () => window.Fides?.initialized,
    EVAL_GDPR_LEGAL_COOKIE_DETECT_CMP: () => !!window.GDPR_LC,
    EVAL_GDPR_LEGAL_COOKIE_TEST: () => !!window.GDPR_LC?.userConsentSetting,
    EVAL_IUBENDA_0: () => document.querySelectorAll(".purposes-item input[type=checkbox]:not([disabled])").forEach((x) => {
      if (x.checked) x.click();
    }) || true,
    EVAL_IUBENDA_1: () => !!document.cookie.match(/_iub_cs-\d+=/),
    EVAL_KROWN_COOKIE_BANNER_TEST: () => localStorage.getItem("krown-cookie-banner") === "true",
    EVAL_MICROSOFT_0: () => Array.from(document.querySelectorAll("div > button")).filter((el) => el.innerText.match("Reject|Ablehnen"))[0].click() || true,
    EVAL_MICROSOFT_1: () => Array.from(document.querySelectorAll("div > button")).filter((el) => el.innerText.match("Accept|Annehmen"))[0].click() || true,
    EVAL_MICROSOFT_2: () => !!document.cookie.match("MSCC|GHCC"),
    EVAL_MOOVE_0: () => document.querySelectorAll("#moove_gdpr_cookie_modal input").forEach((i) => {
      if (!i.disabled) i.checked = i.name === "moove_gdpr_strict_cookies" || i.id === "moove_gdpr_strict_cookies";
    }) || true,
    EVAL_NHNIEUWS_TEST: () => !!localStorage.getItem("psh:cookies-seen"),
    EVAL_OSANO_DETECT: () => !!window.Osano?.cm?.dialogOpen,
    EVAL_PANDECTES_TEST: () => document.cookie.includes("_pandectes_gdpr=") && JSON.parse(
      atob(
        document.cookie.split(";").find((s) => s.trim().startsWith("_pandectes_gdpr")).split("=")[1]
      )
    ).status === "deny",
    EVAL_POVR_GOBACK: () => window.history.back() || true,
    EVAL_PUBTECH_0: () => document.cookie.includes("euconsent-v2") && (document.cookie.match(/.YAAAAAAAAAAA/) || document.cookie.match(/.aAAAAAAAAAAA/) || document.cookie.match(/.YAAACFgAAAAA/)),
    EVAL_SHOPIFY_TEST: () => document.cookie.includes("gdpr_cookie_consent=0") || document.cookie.includes("_tracking_consent=") && JSON.parse(
      decodeURIComponent(
        document.cookie.split(";").find((s) => s.trim().startsWith("_tracking_consent")).split("=")[1]
      )
    ).purposes.a === false,
    EVAL_SKYSCANNER_TEST: () => document.cookie.match(/gdpr=[^;]*adverts:::false/) && !document.cookie.match(/gdpr=[^;]*init:::true/),
    EVAL_SIRDATA_UNBLOCK_SCROLL: () => {
      document.documentElement.classList.forEach((cls) => {
        if (cls.startsWith("sd-cmp-")) document.documentElement.classList.remove(cls);
      });
      return true;
    },
    EVAL_SOURCEPOINT_RESTORE_SCROLL: () => {
      const root = document.documentElement;
      const saved = root.dataset.previousScrollY;
      if (saved && saved !== "null") {
        root.dataset.previousScrollY = "null";
        const y = -parseInt(saved, 10);
        if (y > 0 && window.scrollY === 0) {
          const behavior = root.style.scrollBehavior;
          root.style.scrollBehavior = "auto";
          window.scrollTo(0, y);
          root.style.scrollBehavior = behavior;
        }
      }
      window.addEventListener("pagehide", () => {
        if (root.dataset.previousScrollY) root.dataset.previousScrollY = "null";
      });
      return true;
    },
    EVAL_STEAMPOWERED_0: () => JSON.parse(
      decodeURIComponent(
        document.cookie.split(";").find((s) => s.trim().startsWith("cookieSettings")).split("=")[1]
      )
    ).preference_state === 2,
    EVAL_TAKEALOT_0: () => document.body.classList.remove("freeze") || (document.body.style = "") || true,
    EVAL_TARTEAUCITRON_0: () => tarteaucitron.userInterface.respondAll(false) || true,
    EVAL_TARTEAUCITRON_1: () => tarteaucitron.userInterface.respondAll(true) || true,
    EVAL_TARTEAUCITRON_2: () => document.cookie.match(/tarteaucitron=[^;]*/)?.[0].includes("false"),
    EVAL_TEALIUM_0: () => typeof window.utag !== "undefined" && typeof utag.gdpr === "object",
    EVAL_TEALIUM_1: () => utag.gdpr.setConsentValue(false) || true,
    EVAL_TEALIUM_DONOTSELL: () => utag.gdpr.dns?.setDnsState(false) || true,
    EVAL_TEALIUM_2: () => utag.gdpr.setConsentValue(true) || true,
    EVAL_TEALIUM_3: () => utag.gdpr.getConsentState() !== 1,
    EVAL_TEALIUM_DONOTSELL_CHECK: () => utag.gdpr.dns?.getDnsState() !== 1,
    // 0 means no stored decision; otherwise the user reopened the prompt themselves
    EVAL_TEALIUM_NO_DECISION: () => utag.gdpr.getConsentState() === 0,
    EVAL_TESTCMP_STEP: () => !!document.querySelector("#reject-all"),
    EVAL_TESTCMP_0: () => window.results.results[0] === "button_clicked",
    EVAL_TESTCMP_COSMETIC_0: () => window.results.results[0] === "banner_hidden",
    EVAL_THEFREEDICTIONARY_0: () => cmpUi.showPurposes() || cmpUi.rejectAll() || true,
    EVAL_THEFREEDICTIONARY_1: () => cmpUi.allowAll() || true,
    EVAL_USERCENTRICS_API_0: () => typeof UC_UI === "object",
    EVAL_USERCENTRICS_API_1: () => !!UC_UI.closeCMP(),
    EVAL_USERCENTRICS_API_2: () => !!UC_UI.denyAllConsents(),
    EVAL_USERCENTRICS_API_3: () => !!UC_UI.acceptAllConsents(),
    EVAL_USERCENTRICS_API_4: () => !!UC_UI.closeCMP(),
    EVAL_USERCENTRICS_API_5: () => UC_UI.areAllConsentsAccepted() === true,
    EVAL_USERCENTRICS_API_6: () => UC_UI.areAllConsentsAccepted() === false,
    EVAL_USERCENTRICS_BUTTON_0: () => JSON.parse(localStorage.getItem("usercentrics")).consents.every((c) => c.isEssential || !c.consentStatus),
    EVAL_WAITROSE_0: () => Array.from(document.querySelectorAll("label[id$=cookies-deny-label]")).forEach((e) => e.click()) || true,
    EVAL_WBD_LTP_CLOSE: () => document.querySelector("dialog#ltp-dialog").close() || true
  };
  function getFunctionBody(snippetFunc) {
    const snippetStr = snippetFunc.toString();
    return `(${snippetStr})()`;
  }
  var patternOf = (p) => p instanceof RegExp ? p : p.pattern;
  var BY_CONTINUING_PRIVACY = /(?:by continuing.{0,100}privacy)|(?:privacy.{0,100}by continuing)/gi;
  var ACCEPT_ALL = /accept all/gi;
  var USE_OF_COOKIES = /use of cookies/gi;
  var UTILISATION_DES_COOKIES = /utilisation.{0,100}des.{0,100}cookies/gi;
  var ACCEPTEZ_UTILISATION = /acceptez.{0,100}l.{0,100}utilisation/gi;
  var VERWENDUNG_VON_COOKIES = /verwendung.{0,100}von.{0,100}cookies/gi;
  var DE_COOKIE_VERB = /\b(?:nutzen|nutzt|verwenden|verwendet|setzen|setzt|benutzen|benutzt|speichert|platzieren)\b(?: \S+){0,4} cookies\b/gi;
  var GEBRUIK_VAN_COOKIES = /gebruik.{0,100}van.{0,100}cookies/gi;
  var DETECT_PATTERNS = [
    /accept cookies/gi,
    ACCEPT_ALL,
    /reject all/gi,
    /only necessary cookies/gi,
    // "only necessary" is probably too broad
    /(?:by continuing.{0,100}cookie)|(?:cookie.{0,100}by continuing)/gi,
    BY_CONTINUING_PRIVACY,
    // up to two qualifiers are common: "optional", "essential", "analytics", "google analytics", "third party", ...
    /we (?:use|serve)(?: \w+){0,2} cookies/gi,
    /we are using cookies/gi,
    USE_OF_COOKIES,
    /website uses cookies to enhance your browsing experience/gi,
    /(?:this|our) (?:web)?site.{0,100}cookies/gi,
    /cookies (?:and|or) .{0,100} technologies/gi,
    /such as cookies/gi,
    /read more about.{0,100}cookies/gi,
    /consent to.{0,100}cookies/gi,
    /we and our partners.{0,100}cookies/gi,
    /we.{0,100}store.{0,100}information.{0,100}such as.{0,100}cookies/gi,
    /store and\/or access information.{0,100}on a device/gi,
    /personalised ads and content, ad and content measurement/gi,
    // TCF wording: "store and/or access information", "and our partners ask for your consent", "we and our N partners"
    /\b(?:store|stores|storing) and\/or access(?:ing)? information\b/gi,
    /\band our partners ask for your consent\b/gi,
    /\bwe and (?:our|up to) (?:\d+ )?(?:partners|vendors)\b/gi,
    // a partner count, in each language: "our 186 partners", "unseren 107 Partnern", "nuestros 1064 socios"
    /\b(?:our|unseren|onze|nos|nuestros|i nostri) \d{2,4} (?:partners|partnern|partner|partenaires|socios|vendors|fornitori)\b/gi,
    /\b\d{2,4} iab[- ]partner/gi,
    // "technologies like cookies", in each language
    /\btechnolog(?:ies|ien|ieën|ías|ie) (?:like|such as|wie|zoals|como(?: las)?|telles que(?: les)?|come(?: i)?) cookies?\b/gi,
    /\buses (?:\S+ ){0,2}cookies\b/gi,
    /\b(?:like|want) to (?:use|set) (?:\S+ ){0,2}cookies\b/gi,
    /\b(?:optional|additional|non-essential) cookies\b/gi,
    /\bstoring of cookies\b|\bplaced cookies\b/gi,
    /\b(?:store|stores) and access (?:data|information) on your device\b|\baccess and store (?:data|information) on your device\b/gi,
    /\bwe use (?:\S+ ){1,4}cookies\b/gi,
    // US privacy notices: opt-out sentences, not the footer link labels
    /\byou (?:can|may) opt[- ]out of (?:the |this )?(?:sale|sharing|use|selling)\b/gi,
    /\b(?:if you wish to|to) opt[- ]out of the sale\b/gi,
    /\bthis website or its third[- ]party tools (?:process|use)\b/gi,
    /["“]?(?:share|sell)["”]? or ["“]?(?:sell|share)["”]? (?:your )?(?:personal )?information\b/gi,
    /\bresidents have (?:certain )?rights with regard to the sale\b/gi,
    /\bwe use technologies (?:on this website )?(?:that may )?(?:to )?collect\b/gi,
    // pay-or-consent walls
    /\bcontinue reading with advertising\b|\b(?:with|mit) (?:advertising|werbung) (?:and|und) tracking\b/gi,
    /\bconsent and continue\b/gi,
    // preference centres are often in the page but hidden, so popup text only
    { pattern: /\bstore or retrieve information on your browser\b|\bstockées dans votre navigateur ou récupérées\b/gi, input: "popup" },
    // it might be tempting to add the patterns below, but they cause too many false positives. Don't do it :)
    // /cookies? settings/i,
    // /cookies? preferences/i,
    // FR
    /utilisons.{0,100}des.{0,100}cookies/gi,
    /des.{0,100}cookies.{0,100}pour/gi,
    /retirer.{0,100}votre.{0,100}consentement/gi,
    /et.{0,100}nos.{0,100}partenaires/gi,
    /publicités.{0,100}et.{0,100}du.{0,100}contenu/gi,
    /utilise.{0,100}des.{0,100}cookies/gi,
    /utilisent.{0,100}des.{0,100}cookies/gi,
    /stocker.{0,100}et.{0,100}ou.{0,100}accéder/gi,
    /consentement.{0,100}à.{0,100}tout.{0,100}moment/gi,
    /votre.{0,100}consentement/gi,
    /accepter.{0,100}tout/gi,
    UTILISATION_DES_COOKIES,
    /cookies.{0,100}ou.{0,100}technologies/gi,
    ACCEPTEZ_UTILISATION,
    /continuer sans accepter/gi,
    /tout refuser/gi,
    /(?:refuser|rejeter) tous les cookies/gi,
    // not "je refuse d'…" in a headline
    /je refuse(?! d['’e])/gi,
    /refuser et continuer/gi,
    /refuser les cookies/gi,
    /seulement nécessaires/gi,
    /je désactive les finalités non essentielles/gi,
    /cookies essentiels uniquement/gi,
    /nécessaires uniquement/gi,
    /\b(?:stocker|stockons) et\/ou (?:accéder|accédons)\b/gi,
    /\bnos partenaires demandent votre consentement\b/gi,
    /\bconsentez à l.utilisation (?:de |des )?cookies\b|\bdépôt (?:de|des) cookies\b/gi,
    /\bles cookies nous permettent\b|\bnos partenaires et nous(?:-mêmes)?\b/gi,
    /\baccepter (?:&|et) fermer\b/gi,
    // DE
    /wir.{0,100}verwenden.{0,100}cookies/gi,
    /wir.{0,100}und.{0,100}unsere.{0,100}partner/gi,
    /zugriff auf informationen auf/gi,
    /inhalte.{0,100}messung.{0,100}von.{0,100}werbeleistung.{0,100}und/gi,
    /cookies.{0,100}und.{0,100}andere/gi,
    VERWENDUNG_VON_COOKIES,
    /wir.{0,100}nutzen.{0,100}cookies/gi,
    /verwendet.{0,100}cookies/gi,
    /sie.{0,100}können.{0,100}ihre.{0,100}auswahl/gi,
    /und.{0,100}ähnliche.{0,100}technologien/gi,
    /cookies.{0,100}wir.{0,100}verwenden/gi,
    /alles?.{0,100}ablehnen/gi,
    /(?:nur|nicht).{0,100}(?:zusätzliche|essenzielle|funktionale|notwendige|erforderliche).{0,100}(?:cookies|akzeptieren|erlauben|ablehnen)/gi,
    /weiter.{0,100}(?:ohne|mit).{0,100}(?:einwilligung|zustimmung|cookies)/gi,
    /(?:cookies|einwilligung).{0,100}ablehnen/gi,
    /nur funktionale cookies akzeptieren/gi,
    /optionale ablehnen/gi,
    /zustimmung verweigern/gi,
    /\bspeichern und\/oder (?:zugreifen|abrufen)\b/gi,
    /\bunsere partner bitten um ihre zustimmung\b/gi,
    DE_COOKIE_VERB,
    /\b(?:werden|wird) (?:\S+ ){0,3}cookies (?:verwendet|eingesetzt|gesetzt|genutzt)\b/gi,
    /\bcookies? zum einsatz\b|\beinsatz von cookies\b/gi,
    /\beinverstanden\b.{0,60}\bcookies\b|\bcookies\b.{0,80}\beinverstanden\b/gi,
    /\b(?:alle|alles) (?:cookies |optionalen \S+ )?(?:akzeptieren|zulassen|erlauben|zustimmen)\b/gi,
    /\bzustimmen und weiter\b|\bweiter,? ohne zu (?:akzeptieren|zustimmen)\b/gi,
    /\b(?:einwilligung|zustimmung) (?:zu|zur|in die) (?:\S+ )?cookies\b|\bcookie-(?:zustimmung|einwilligung)\b/gi,
    /\btracking-technologien\b/gi,
    /\bakzeptier\w* (?:du |sie )?(?:die )?verwendung (?:\S+ )?cookies\b/gi,
    /\bmit werbetracking weiterlesen\b|\bweiter mit werbung\b|\bcon tracking e annunci\b/gi,
    // NL
    GEBRUIK_VAN_COOKIES,
    /(?:we|wij).{0,100}gebruiken.{0,100}cookies.{0,100}om/gi,
    /cookies.{0,100}en.{0,100}vergelijkbare/gi,
    /(?:alles|cookies).{0,100}(?:afwijzen|weigeren|verwerpen)/gi,
    /alleen.{0,100}noodzakelijke?\b/gi,
    /cookies weigeren/gi,
    /weiger.{0,100}(?:cookies|alles)/gi,
    /doorgaan zonder (?:te accepteren|akkoord te gaan)/gi,
    /alleen.{0,100}(?:optionele|functionele|functioneel|noodzakelijke|essentiële).{0,100}cookies/gi,
    /wijs alles af/gi,
    /\b(?:op te slaan en\/of te (?:raadplegen|openen|lezen)|opslaan en\/of (?:openen|raadplegen|lezen)|slaan informatie\b.{0,60}\bop en\/of)\b/gi,
    /\bonze partners vragen om (?:jouw|uw|je) toestemming\b/gi,
    /\bwij en onze (?:\d+ )?partners\b/gi,
    /\b(?:gebruiken|gebruikt|plaatsen|plaatst)\b(?: \S+){0,3} cookies\b/gi,
    /\baccepteer (?:alles|alle cookies)\b/gi,
    // Dutch words only: "tracking cookies" and "marketing cookies" are also English prose and footer links
    /\b(?:analytische|functionele|essentiële|noodzakelijke) cookies\b/gi,
    // Spanish (ES)
    /(si|al) contin[úu]a[sr]?( navegando)?.{0,100} cookie/gi,
    /(usamos|utilizar?|utilizamos)( (tanto|las))?.{0,20}cookie/gi,
    /\b(hacemos|hace) uso de cookies\b/gi,
    /\busa cookies de google\b/gi,
    /acepta.{0,80} uso de cookies/gi,
    /al utilizar nuestro sitio web.{0,80}cookie/gi,
    /almacenar la información en un dispositivo y\/?o acceder a ella/gi,
    /cookie.{0,30} utiliza/gi,
    /cookies propias y de/gi,
    /cookies.{0,80}son necesarias/gi,
    /est[ea] (sitio|página|web)( web)?( también)? (usa|utiliza|requiere del uso de|se sirven|emplea) cookies?/gi,
    /navegando.{0,100}cookie/gi,
    /nosotros y nuestros( \d+)? (socios|proveedores).{0,180} cookies/gi,
    /recopilamos y almacenamos datos de usted y de su dispositivo/gi,
    /utilizamos tecnolog[ií]as como las cookies/gi,
    /\b(?:almacenar|almacenamos) y\/o (?:acceder|accedemos)\b/gi,
    /\bnuestros socios solicitan su consentimiento\b/gi,
    /\b(?:tanto nosotros como|nosotros y) nuestros (?:\d+ )?socios\b/gi,
    /\b(?:aceptar|rechazar) todas\b|\bcontinuar sin aceptar\b|\bsolo las necesarias\b/gi,
    /\bacept\w* (?:\S+ ){0,3}uso de (?:las )?cookies\b/gi,
    /\bcookies (?:técnicas|analíticas|propias|de terceros|opcionales|necesarias)\b/gi,
    /\blas cookies nos (?:ayudan|permiten)\b/gi,
    /\b(?:instalamos|empleamos)\b(?: \S+){0,4} cookies\b/gi,
    /\bacept(?:a|ar|as)? (?:el uso de |las )?(?:\S+ )?cookies\b|\bnecesitamos usar cookies\b/gi,
    // Polish (PL)
    // examples:
    //  wykorzystuje pliki cookie (uses cookies)
    //  Wykorzystujemy informacje w plikach cookie (We use information in cookies)
    /(używamy|stosujemy|stosuje|wykorzystujemy|wykorzyst(uje|ywane))( są)?.{0,20} plik(i|ów|ach) cookie/gi,
    /(używać|używamy).{0,80} (ciasteczek|cookie)/gi,
    /cele przetwarzania twoich danych przez zaufanych partnerów iab/gi,
    /dzięki (plikom cookie|ciasteczkom|cookie)/gi,
    /korzysta.{0,80} plików cookie/gi,
    /korzystamy z technologii, takich jak pliki cookie/gi,
    /korzystamy.{0,50} cookies/gi,
    /niektóre pliki cookies/gi,
    /pliki cookies i pokrewne im technologie umożliwiają poprawne działanie strony i pomagają nam dostosować ofertę do twoich potrzeb/gi,
    /przechowywanie informacji na urządzeniu lub dostęp do nich/gi,
    /przechowywanie plików cookie na swoim urządzeniu/gi,
    /przechowywać i uzyskiwać dostęp do informacji na twoich urządzeniach/gi,
    /przetwarzamy.{0,80} cookie/gi,
    /strona.{0,50} używa (ciasteczek|cookie)/gi,
    /ta strona korzysta z ciasteczek/gi,
    /uzyskujemy dostęp i przechowujemy informacje na urządzeniu/gi,
    /używa plik[ió]w? cookie/gi,
    /używamy plików.{0,20}cookie/gi,
    /wykorzystują .{0,100}cookie/gi,
    /za pomocą plików cookies.{0,100} my lub nasi partnerzy/gi,
    /zgodą my i nasi partnerzy możemy wykorzystywać precyzyjne dane geolokalizacyjne i identyfikację/gi,
    // Catalan (CA)
    /cookies pròpies i de tercers/gi,
    /utilitzem galetes/gi,
    /únicament utilitza galetes pròpies amb finalitat tècnica\b/gi,
    /este lloc web utilitza només cookies tècniques necessàries per al seu funcionament/gi,
    /utilitza cookies tècniques,\s*de personalització i anàlisi/gi,
    /utilitzem cookies i altres tecnologies/gi,
    /\b(?:utilitz\w*|fa servir|fem servir|usem)\b(?: \S+){0,3} (?:cookies|galetes)\b/gi,
    // Basque (EU)
    /cookie propio eta hirugarrenenak helburu teknikoarekin erabiltzen ditu/gi,
    /cookie propioak eta hirugarrenen cookieak erabiltzen ditugu/gi,
    /cookie propioak eta hirugarrenenak helburu teknikoarekin erabiltzen ditu/gi,
    /cookie[-\s]*ak erabiltzen ditu/gi,
    /cookieak erabiltzen ditu/gi,
    /guk eta gure \d+ bazkideek cookieak eta identifikadoreak erabiltzen ditugu/gi,
    /norberaren eta hirugarrenen cookie-?ak baino ez ditu erabiltzen/gi,
    /web orri honek cookieak erabiltzen ditu/gi,
    /webgune honek cookie propioak eta hirugarrenen cookie-fitxategiak erabiltzen ditu/gi,
    // Galician (GL)
    /^\s*empregamos cookies propias\b/gi,
    /este portal emprega cookies propias ou de terceiros con fins analíticos/gi,
    // Russian (RU)
    // e.g. "мы используем файлы cookie", "сайт использует куки", "используются технологии cookie"
    // note: \w does not match Cyrillic, so these use explicit character ranges
    /использу[а-яё]*.{0,40}(?:файл[а-яё]*[\s-]+)?(?:cookie|куки)/gi,
    /(?:cookie|куки).{0,40}использу[а-яё]*/gi,
    /(?:использовани[а-яё]*|обработк[а-яё]*|хранени[а-яё]*).{0,20}(?:файл(?:ов|ы)[\s-]+)?(?:cookie|куки)/gi,
    /технологи[а-яё]*\s+(?:cookie|куки)/gi,
    // e.g. "сайт собирает cookie", "мы применяем файлы cookie", "сохраняем куки на вашем устройстве"
    /(?:собира[а-яё]*|сбор|применя[а-яё]*|сохраня[а-яё]*|размеща[а-яё]*|устанавлива[а-яё]*).{0,30}(?:файл[а-яё]*[\s-]+)?(?:cookie|куки)/gi,
    // "файлы cookie" / "cookie-файлы" / "куки-файлы" in any phrasing
    /(?:файл[а-яё]*[\s-]+(?:cookie|куки)|(?:cookie|куки)[\s-]+файл[а-яё]*)/gi,
    // Italian (IT)
    // e.g. "usiamo i cookie", "utilizziamo cookie tecnici", "questo sito utilizza i cookie", "noi e i nostri partner utilizziamo i cookie"
    /(?:usiamo|utilizziamo).{0,20}cookie/gi,
    /sito.{0,50}(?:usa|utilizza).{0,20}cookie/gi,
    /noi e i nostri.{0,20}partner.{0,100}cookie/gi,
    /\b(?:utilizziamo|usiamo|impieghiamo|installiamo)\b(?: \S+){0,3} cookies?\b/gi,
    /\b(?:utilizza|utilizzano|usa|usano|impiega|installa|fa uso di)\b(?: \S+){0,3} cookies?\b/gi,
    /\bcookies? (?:tecnici|di profilazione|di terze parti|analitici|statistici|di marketing)\b/gi,
    /\b(?:acconsent|accett)\w*\b.{0,40}\b(?:uso|utilizzo|installazione)\b.{0,15}\bcookies?\b/gi,
    /\b(?:continuando|proseguendo)(?: la| nella)? navigazione\b.{0,80}\b(?:accett|acconsent)\w*/gi,
    /\b(?:accetta|accetto|accettare|rifiuta|rifiuto|rifiutare)(?: tutti| tutto)\b/gi,
    /\b(?:continua|prosegui|chiudi) senza accettare\b/gi,
    /\brifiuta e abbonati\b/gi,
    /\bconsenso (?:all.(?:uso|utilizzo) (?:dei |di )?)?cookies?\b/gi,
    /\b(?:insieme ai|con i) nostri (?:\d+ )?partner\b/gi,
    /\bterze parti selezionate\b/gi,
    /\b(?:archiviare|archiviamo|memorizzare|memorizziamo) e\/o (?:accedere|accediamo)\b/gi,
    // Swedish (SV)
    // e.g. "vi använder cookies", "vi använder spårningstekniker såsom cookies", "webbplatsen använder kakor"
    /(?:vi|webbplatsen|webbplats|sajten|sidan)\s+använder.{0,60}(?:cookies|kakor)/gi,
    // Japanese (JA)
    // e.g. "当サイトはCookieを使用しています", "クッキー（Cookie）を利用しています"
    /(?:cookie|クッキー).{0,10}を(?:使用|利用)/gi,
    // Danish (DA)
    // e.g. "vi bruger cookies", "hjemmesiden bruger cookies til at ..."
    /bruger cookies/gi,
    // Norwegian (NO)
    // e.g. "vi bruker informasjonskapsler", "kan vi bruke valgfrie informasjonskapsler", "nettstedet bruker cookies"
    /\b(?:vi|nettstedet|nettsiden|siden)\s+bruker?\s.{0,60}?(?:informasjonskapsler|cookies)/gi
  ];
  var REJECT_PATTERNS_ENGLISH = [
    // e.g. "reject", "reject all", "reject all cookies", "deny all", "refuse cookies", "decline",
    // "reject non-essential cookies", "reject unnecessary cookies", "reject all but necessary", "reject all and close"
    // note that "reject and subscribe" and "reject and pay" are excluded via BUTTON_NEVER_MATCH_PATTERNS
    /^\s*(no,?\s*)?(i\s+)?(reject|deny|refuse|decline|disable)\s*(all)?\s*(but|except)?\s*(non[- ]?essential|un(necessary|required)|optional|additional|targeting|analytics|marketing|non[- ]?necessary|extra|tracking|advertising|necessary|essential)?\s*(cookies)?\s*(and\s+close)?\s*$/is,
    // e.g. "i do not accept", "do not accept cookies", "i do not accept the use of cookies"
    /^\s*(no,?\s*)?(i\s+)?do\s+not\s+accept\s*(the\s+use\s+of\s+)?(any\s+)?(cookies)?\s*$/is,
    // e.g. "continue without accepting", "continue without agreeing", "continue without agreeing →"
    /^\s*(continue|proceed|continue\s+browsing)\s+without\s+(accepting|agreeing|consent|cookies|tracking)(\s*→)?\s*$/is,
    // essential/necessary/functional-only, e.g. "essential cookies only", "accept only essential cookies",
    // "allow necessary cookies continue", "use essential cookies only", "functional only", "essential only cookies", "i confirm necessary"
    /^\s*(i\s+)?(want\s+to\s+)?(only\s+)?(use|accept|allow|keep|enable|choose|continue\s+with|i\s+confirm)\s*(only\s+)?(strictly\s+)?(necessary|essential|essentials|functional|required|minimal)\s*(cookies)?\s*(continue|only)?\s*$/is,
    /^\s*(i\s+)?(want\s+to\s+)?only\s+(strictly\s+)?(necessary|essential|essentials|functional|required|minimal)\s*(cookies)?\s*(continue|only)?\s*$/is,
    /^\s*(strictly\s+)?(necessary|essential|essentials|functional|required|minimal)\s+((cookies\s+)?only|only\s+cookies)\s*$/is,
    // e.g. "do not sell or share my personal information", "do not share my personal information", "opt out of sale ..." (CCPA)
    // "do not sell page" is a link; "do not sellcookie settings" is two concatenated buttons
    /do\s+not\s+sell(?!\s*(page|cookie settings))|do\s+not\s+share\s+my\s+(personal\s+)?(information|info|data)|opt\s+out\s+of\s+sale/is,
    // e.g. "opt-out of sale/share or targeted advertising", "opt-out of advertising/social media cookies"
    /^opt[ -]?out of /is,
    // e.g. "reject all except strictly necessary", "reject all (except necessary cookies)"
    /except\s+(strictly\s+)?necessary/is,
    // e.g. "disagree", "i disagree", "disagree and close"
    /^(i\s+)?disagree\s*(and\s+close)?$/i,
    "no",
    /^no,? thank(s| you)$/is,
    /^opt[ -]out$/is,
    "dont enable",
    "i do not agree"
  ];
  var REJECT_PATTERNS_DUTCH = [
    // weigeren / afwijzen / verwerpen (reject verbs, any position)
    /weiger|afwijz|verwerp/is,
    // "wijs (alles/ze) af" (reject verb with split particle)
    /wijs\b.*\baf\b/is,
    // "alleen/enkel/uitsluitend ... (noodzakelijk|functioneel|essentieel|...)"
    /(^|\s)(alleen|enkel|uitsluitend)\s+.{0,20}(noodzakelijk|functione|essenti|vereiste|verplichte|strikt|minimale|basis|basic|standaard)/is,
    // essential/necessary-only nouns
    /^\s*(accepteer\s+|aanvaard\s+|gebruik\s+|sta\s+|ik wil\s+)?(alleen\s+|enkel\s+|uitsluitend\s+|strikt\s+)?(de\s+)?(noodzakelijke?|functionele?|functioneel|essentiële|essentieel|vereiste|verplichte|minimale|basiscookies|basis|standaard)\s*(cookies?)?\s*(accepteren|toestaan|aanvaarden)?\s*$/is,
    // continue without accepting / consent
    /(doorgaan|ga door|ga verder|verder)\s+.{0,15}(zonder|aanvaard)/is,
    // "nee" refusals (but not "nee, sluiten" → acknowledge)
    /^nee(,?\s+(bedankt|dank je|dankje|liever niet|liever geen cookies|geen persoonlijke cookies|geen cookies.*|weigeren?))?$/is,
    "niet accepteren",
    "niet akkoord",
    "ik ga niet akkoord",
    "liever niet",
    "geen cookies toestaan",
    "liever geen cookies",
    "functioneel altijd actief"
  ];
  var REJECT_PATTERNS_FRENCH = [
    // refuser / rejeter / interdire / décliner (reject verbs, any position)
    // "refuser et s'abonner" / "refuser et payer" are excluded via BUTTON_NEVER_MATCH_PATTERNS
    // skip English prose such as "cookies that you can refuse"
    /^(?!.*\bcan refuse\b)(.*\s)?(refus|rejet|rejeter|interdire|interdis|déclin|declin)/is,
    // only necessary / essential / technical / functional
    /^(?=.*(cookie|nécessaire|essentiel|techni|requis|obligatoire|fonctionnel|indispensable|sdk)).*(uniquement|seulement|indispensable|strictement nécessaire|que les cookies\s+(nécessaires|techniques|essentiels|indispensables|fonctionnels))/is,
    // continue/proceed without accepting; refuse everything; disable purposes
    /(sans accepter|ne pas accepter|je naccepte rien|je désactive)/is,
    // "non" / "non, merci"
    /^non(,?\s+merci\.?)?$/is
  ];
  var REJECT_PATTERNS_GERMAN = [
    // "... ablehnen" / "ablehnen ..." (reject/decline). Exclude the settings-list phrase "einstell(ungen|en) oder ablehnen".
    /^(?!einstell(ungen|en) oder ablehnen$).*ablehnen/is,
    // verweigern / verweigere / verweigert (refuse)
    /verweiger/is,
    // essential/necessary/functional-only variants (accepting only necessary → reject)
    /^\s*(nur|ausschließlich|lediglich|weiter\s+mit|mit|akzeptiere?n?|unbedingt|es\s+werden\s+nur)?\s*(technisch\s+)?(notwendige?[nrs]?|essenzielle?[nrs]?|essentielle?[nrs]?|erforderliche?[nrs]?|funktionale?[nrs]?|funktionelle?[nrs]?|wesentliche?[nrs]?)\s*(cookies?|technologien|funktionscookies|dienste)?\s*(akzeptieren|erlauben|zulassen|verwenden|annehmen|setzen|speichern|zustimmen|auswählen)?\.?\s*$/is,
    // continue without consent
    /(^|\s)(ohne\s+(zu\s+)?(einwilligung|zustimmung|einverständnis|annahme|annehmen|akzeptanz|akzeptieren)|(weiter|fortfahren)\s+ohne)/is,
    // negations / refusals not covered by the regexes above
    "nein, danke",
    "nein, bitte nicht",
    "nein, ich stimme nicht zu",
    "nicht zustimmen",
    "nicht einverstanden",
    "ich lehne ab",
    "mit erforderlichen einstellungen fortfahren",
    "mit erforderlichen cookies fortfahren",
    "mit notwendigen fortfahren"
  ];
  var REJECT_PATTERNS_ITALIAN = [
    // rifiuta / rifiutare / rifiuto / nega / negare / blocca (reject verbs)
    /(^|\s)(rifiut|neg(a|are|hi)|blocca i cookie)/is,
    // accept/use only necessary / essential / technical
    /^\s*(accetta|accettare|usa|installa|consenti|chiudi e prosegui( solo con)?)?\s*(solo|soltanto|unicamente)?\s*(i\s+|gli\s+)?(cookies?\s+)?(strettamente\s+)?(necessari|necessary|essenziali|tecnici|di navigazione)\s*(necessari|tecnici|essenziali)?\s*$/is,
    // continue without accepting
    /continua(re)? senza accettare/is,
    "non accetto"
  ];
  var REJECT_PATTERNS_BRAZILIAN_PORTUGUESE = [
    // (deny)
    /^\s*(rejeitar|recusar|desativar|bloquear|negar|não\s*aceito|não \s*aceitar)\s*$/is,
    // (proceed) (without accepting)
    /^\s*(continuar|prosseguir|seguir)\s*(sem\s*aceitar)\s*$/is,
    // (deny) (everything) (optional)
    /^\s*(rejeitar|recusar|desativar|bloquear|negar|não\s*aceito|não \s*aceitar)\s*(tudo|o)?\s*(opcional|(não[-\s](essencial|funcional|obrigatório|necessário)))?\s*$/is,
    // (deny) (all) (the) (optional) (cookies)
    /^\s*(rejeitar|recusar|desativar|bloquear|negar|não\s*aceito|não \s*aceitar)\s*(todos)?\s*(os)?\s*(cookies)?\s*(opcionais|(não[-\s](essenciais|funcionais|obrigatórios|necessários)))?\s*$/is,
    // (accept) (only) (the) (essential)
    /^\s*(aceitar|utilizar)?\s*(apenas|somente|só)?\s*(o)?\s*(essencial|funcional|obrigatório|necessário)\s*$/is,
    // (accept) (only) (the) (essential) (cookies)
    /^\s*(aceitar|utilizar)?\s*(apenas|somente|só)?\s*(os)?\s*(cookies)?\s*(essenciais|funcionais|obrigatórios|necessários)\s*$/is
  ];
  var REJECT_PATTERNS_SPANISH = [
    // rechazar / denegar / declinar / negar (reject verbs, any position)
    // "rechazar y pagar" / "rechazar y suscribirse" are excluded via BUTTON_NEVER_MATCH_PATTERNS
    /(^|\s)(rechaz|recház|deneg|negar|declin)/is,
    // accept/allow/use (only) necessary / essential / technical / functional / own
    /^\s*(aceptar?|acepta|permitir|permite|usar|utilizar)?\s*(solo|sólo|només|únicamente)?\s*(las?\s+|los\s+)?(cookies?\s+)?(estrictamente\s+)?(necesari\w*|esencial\w*|técnic\w*|obligatori\w*|funcional\w*|propias)\s*$/is,
    // "solo/sólo/no, sólo ... necessary/essential"
    /^(no,?\s+)?(solo|sólo|només)\s+(usar\s+|las?\s+|los\s+|lo\s+)?.{0,20}(necesari|esencial|estrictamente)/is,
    // refusals / opt-outs
    /^(no acept|no consentir|no permitir|no estoy de acuerdo|no,? gracias|sin consentimiento|continuar sin aceptar|prefiero rechazarlas|descartar todas)/is,
    "acceptar nom\xE9s les necess\xE0ries",
    "nom\xE9s sutilitzen cookies quan \xE9s necessari",
    "pulsa aqu\xED para desactivar las cookies opcionales"
  ];
  var REJECT_PATTERNS_SWEDISH = [
    // avvisa / avböj / neka / förneka (reject verbs)
    /(^|\s)(avvisa|avböj|neka|nekar|förneka)/is,
    // (allow/accept/use) only necessary cookies/kakor
    /(bara|endast|enbart)\s+nödvändig/is,
    // "godkänn/acceptera/använd/tillåt (bara/endast/enbart) nödvändiga (cookies/kakor)"
    /^(ok,?\s+|nej,?\s+)?(jag\s+)?(godkänn\w*|godta|acceptera\w*|använd\w*|tillåt|spara)?\s*(bara|endast|enbart)?\s*(strikt\s+)?nödvändiga?t?( (cookies|kakor|tjänster))?\.?$/is,
    // continue without accepting
    /fortsätt utan att (acceptera|godkänna)/is,
    /strikt nödvändig/is,
    "till\xE5t inte cookies",
    "jag accepterar endast grundl\xE4ggande kakor"
  ];
  var REJECT_PATTERNS_DANISH = [
    // afvis / afvis alle / afvis alle cookies (reject verbs)
    /(^|\s)afvis/is,
    // (accept/allow) only necessary cookies
    /^(accepter\s+|tillad\s+)?(kun|udelukkende)\s+(strengt\s+)?nødvendige( cookies)?$/is,
    // "nej tak" (no thanks)
    /^nej(,?\s+tak)?$/is
  ];
  var REJECT_PATTERNS_NORWEGIAN = [
    // avvis / avslå (reject verbs)
    /(^|\s)(avvis|avslå)/is,
    // (accept/allow/use) only necessary cookies
    /^(godta\s+|tillat\s+|aksepter\s+|bruk\s+)?(kun|bare)\s+(strengt\s+)?nødvendige( (informasjonskapsler|cookies))?$/is,
    // "nei" / "nei takk" (no thanks)
    /^nei(,?\s+takk)?$/is
  ];
  var REJECT_PATTERNS_CATALAN = [
    /(^|\s)rebutj/is,
    "no accepto",
    "no, gr\xE0cies",
    // accept/allow/use (only) necessary / essential / technical / functional
    /^\s*(acceptar?|accepto|permetre|utilitzar|usar)?\s*(només|sols|únicament)?\s*(les\s+|els\s+)?(galetes\s+|cookies?\s+)?(estrictament\s+)?(necess[aà]ri\w*|essencial\w*|tècni\w*|funcional\w*|imprescindibles)\s*$/is,
    // continue without accepting
    /^continuar sense acceptar/is
  ];
  var REJECT_PATTERNS_GALICIAN = [/(^|\s)rexeitar/is];
  var REJECT_PATTERNS_BASQUE = [/(^|\s)(baztertu|ukatu)/is];
  var REJECT_PATTERNS_PORTUGUESE = [/^aceitar apenas cookies essenciais\.$/];
  var REJECT_PATTERNS_CZECH = ["povolit pouze nezbytn\xE9 cookie"];
  var REJECT_PATTERNS_POLISH = [
    // odrzuć / odrzucam / odmawiam / rezygnuję / blokuj wszystkie (reject verbs)
    /odrzu(ć|cam|cenie|cać|canie|cić)|odmaw|odmowa|odmów|rezygnuj|blokuj wszystk/is,
    // (accept) only necessary / required
    /(^|\s)tylko\s+(bezwzględnie\s+)?(niezbędn\w*|wymagan\w*|konieczne)/is,
    /(akceptuj|akceptuję|zaakceptuj|zatwierdź|potwierdzam|zezwól)\s+(tylko\s+)?(na\s+)?(niezbędn\w*|wymagan\w*|konieczne)/is,
    /korzystaj wyłącznie z niezbędn/is,
    // continue without accepting / consent
    /kontynuuj bez (akceptacj|akceptowani|wyrażania zgody)/is,
    // refusals
    /nie (akceptuję|zgadzam|wyrażam zgody|wyrażaj zgody|zezwalaj|potwierdzam)/is,
    /^nie(,?\s+(dziękuję|nie zgadzam.*))?$/is,
    "niezb\u0119dne",
    "niezb\u0119dne pliki cookie",
    /^funkcjonalne pliki cookie \(wymagane\)$/
  ];
  var REJECT_PATTERNS_RUSSIAN = [
    // отклонить / отказаться / запретить (reject verbs); \w does not match Cyrillic
    /(^|\s)(отклон[а-яё]*|отказ[а-яё]*|откаж[а-яё]*|запрет[а-яё]*|запрещ[а-яё]*)/is,
    // "только необходимые (файлы cookie)" / "принять только необходимые куки"
    /^\s*(принять\s+|принима[а-яё]+\s+|разрешить\s+|использовать\s+|оставить\s+)?(только|лишь)\s+(строго\s+)?(необходим[а-яё]+|нужн[а-яё]+|обязательн[а-яё]+|техническ[а-яё]+|функциональн[а-яё]+)(\s+файл[а-яё]*)?([\s-]+(cookie|куки)([\s-]+файл[а-яё]*)?)?\s*$/is,
    // refusals: "не принимаю", "не согласен", "не соглашаюсь", "нет, спасибо"
    /^\s*(не\s+(принима[а-яё]+|соглас[а-яё]+|разреша[а-яё]+|хочу)|нет(,?\s+спасибо)?)\s*$/is
  ];
  var REJECT_PATTERNS_TURKISH = ["reddet", "\xE7erezleri reddet"];
  var REJECT_PATTERNS_INDONESIAN = ["tolak cookie"];
  var REJECT_PATTERNS_JAPANESE = [
    // e.g. "拒否", "すべて拒否", "全て拒否する", "cookieを拒否"
    /^(すべて|全て)?\s?(の)?(cookie|クッキー)?\s?(を)?拒否(する)?$/i,
    "\u540C\u610F\u3057\u306A\u3044",
    "\u540C\u610F\u3057\u307E\u305B\u3093"
  ];
  var REJECT_PATTERNS = [
    ...REJECT_PATTERNS_ENGLISH,
    ...REJECT_PATTERNS_DUTCH,
    ...REJECT_PATTERNS_FRENCH,
    ...REJECT_PATTERNS_GERMAN,
    ...REJECT_PATTERNS_ITALIAN,
    ...REJECT_PATTERNS_BRAZILIAN_PORTUGUESE,
    ...REJECT_PATTERNS_SPANISH,
    ...REJECT_PATTERNS_SWEDISH,
    ...REJECT_PATTERNS_DANISH,
    ...REJECT_PATTERNS_NORWEGIAN,
    ...REJECT_PATTERNS_CATALAN,
    ...REJECT_PATTERNS_GALICIAN,
    ...REJECT_PATTERNS_BASQUE,
    ...REJECT_PATTERNS_PORTUGUESE,
    ...REJECT_PATTERNS_CZECH,
    ...REJECT_PATTERNS_POLISH,
    ...REJECT_PATTERNS_RUSSIAN,
    ...REJECT_PATTERNS_TURKISH,
    ...REJECT_PATTERNS_INDONESIAN,
    ...REJECT_PATTERNS_JAPANESE
  ];
  var BUTTON_NEVER_MATCH_PATTERNS = [
    // text of several concatenated buttons, or popup body text rather than a button
    /accept all.*reject all|reject all.*accept all/is,
    /^.{300,}$/s,
    /pay|subscribe/is,
    /abonneer/is,
    /abonnier/is,
    /abonner/is,
    /abbonati/is,
    /iscriviti/is,
    /abbonare/is,
    /iscrivere/is,
    /sostienici/is,
    /suscribir/is,
    // Spanish (ES)
    /^abandonar este sitio$/,
    /suscribo/,
    /^accede gratis con cookies publicitarias$/,
    /pagar/,
    /suscríbete/,
    /sin cookies .{0,10}euro/s,
    // Polish (PL)
    /subskrybuj/,
    // Russian (RU): paywall/subscription wording, e.g. "отказаться от подписки", "оплатить"
    /подписатьс|подписк|оплатит|оплачива/is
  ];
  var SETTINGS_PATTERNS = [
    // Multilingual "open customization" patterns: a customization verb next to a
    // cookie/preference/settings/options/details/purposes noun (both word orders).
    // The negative lookahead avoids policy links and save/confirm/accept phrases (those are accept/acknowledge/other).
    /^(?!.*\b(policy|policies|notice|statement|impressum|\w*richtlinie\w*|\w*erklärung|page|beschrijving|privacy$|beleid|politique|política|polityk|speichern|guardar|opslaan|zapisz|enregistrer|sauvegarder|bevestig|bestätig|confirm|save|submit|akzeptier|accept|zaakcept)\b)(customi[sz]e|manage|adjust|configure|personali[sz]e|let me choose|edit|change|set|select|view|see|review|update|open|show|choose|anpassen|verwalten|konfigurieren|bearbeiten|öffnen|anzeigen|einblenden|einstellen|festlegen|auswählen|wählen|aanpassen|beheren|instellen|wijzig\w*|personaliseren|personaliseer|kies|bekijk|toon|personnaliser|paramétrer|gérer|configurer|choisir|afficher|définir|modifier|configurar|personalizar|gestionar|administrar|ajustar|seleccionar|modificar|establecer|dostosuj|zarządzaj|personalizuj|ustaw\w*|zmień|pokaż|wybierz)(?!\w).{0,20}(cookies?|preferences?|settings?|options?|choices?|controls?|details?|purposes?|services?|consent|einstellung\w*|optionen|präferenzen|einzelheiten|zwecke|dienste|datenschutz\w*|auswahl|voorkeur\w*|instelling\w*|opties|diensten|préférences|paramètres|réglages|choix|détails|finalités|témoins|preferencia\w*|opciones|ajustes|configuraci\w*|detalles|servicios|elección|preferencj\w*|ustawie\w*|opcje|szczegół\w*|cele|galetes)\b/is,
    /^(?!.*\b(policy|policies|notice|statement|impressum|\w*richtlinie\w*|\w*erklärung|page|beschrijving|privacy$|beleid|politique|política|polityk|speichern|guardar|opslaan|zapisz|enregistrer|sauvegarder|bevestig|bestätig|confirm|save|submit|akzeptier|accept|zaakcept)\b)(cookies?|preferences?|settings?|options?|choices?|controls?|details?|purposes?|services?|consent|einstellung\w*|optionen|präferenzen|einzelheiten|zwecke|dienste|datenschutz\w*|auswahl|voorkeur\w*|instelling\w*|opties|diensten|préférences|paramètres|réglages|choix|détails|finalités|témoins|preferencia\w*|opciones|ajustes|configuraci\w*|detalles|servicios|elección|preferencj\w*|ustawie\w*|opcje|szczegół\w*|cele|galetes)\b(.{0,14}\W)?(customi[sz]e|manage|adjust|configure|personali[sz]e|let me choose|edit|change|set|select|view|see|review|update|open|show|choose|anpassen|verwalten|konfigurieren|bearbeiten|öffnen|anzeigen|einblenden|einstellen|festlegen|auswählen|wählen|aanpassen|beheren|instellen|wijzig\w*|personaliseren|personaliseer|kies|bekijk|toon|personnaliser|paramétrer|gérer|configurer|choisir|afficher|définir|modifier|configurar|personalizar|gestionar|administrar|ajustar|seleccionar|modificar|establecer|dostosuj|zarządzaj|personalizuj|ustaw\w*|zmień|pokaż|wybierz)(?!\w)/is,
    // settings noun + cookies, e.g. "paramètres des cookies", "ajustes de cookies", "instellingen voor cookies en diensten"
    /^(paramètres|préférences|réglages|ajustes|opciones|elección|preferencias|instellingen)( (de|des|les|voor|van))? cookies( (et des|en|y) (services|diensten|servicios))?$/is,
    "settings",
    "preferences",
    /customi(s|z)e/is,
    "more options",
    /(manage|configure) (my|your) (preferences|choices|cookies)/is,
    /(cookie )?preference center/is,
    "configure",
    "cookie manager",
    "cookie preference",
    "let me choose",
    "cookieconsent preferences",
    /privacy choices/is,
    /^(privacy|cookie|custom) settings$/is,
    /^cookies? (settings|preferences|setting)(?!.*\bdo not\b)/is,
    /^(?!.*\bpolic(y|ies)\b).*(manage|customize|customise|opt-out|edit).*(cookies|preferences|settings|options)/is,
    "cookie consent options",
    "privacy controls",
    // German
    "einstellungen",
    // Spanish (ES)
    /^(configurar|configuración|administrar)$/,
    /^(gestionar|ver|establecer) preferencias$/,
    "ajustes",
    "centro de preferencias",
    "configura",
    /^configuración( de( las)?)? cookies?( y servicios)?$/,
    /^configurar\.\.\.$/,
    "configurarlas",
    "detalles",
    "gestiona tus preferencias",
    /^gestionar ?(las?|mis)? ?(configuración|preferencias)?(( de)? cookies?)?$/,
    "gesti\xF3n cookies",
    "gesti\xF3n de cookies",
    "mis preferencias",
    "mostrar detalles",
    "mostrar los prop\xF3sitos",
    "m\xE1s opciones",
    "no, ajustar",
    "obtener m\xE1s informaci\xF3n y configuraci\xF3n",
    "opciones de gesti\xF3n",
    "panel de configuraci\xF3n de cookies",
    "personalice",
    "personalizar",
    "preferencias de privacidad",
    "preferencias",
    "quiero configurarlas",
    "saber m\xE1s y personalizar",
    "seleccionar fines individuales",
    // Catalan (CA)
    "configura-les",
    "personalitza",
    "veure prefer\xE8ncies",
    /^(configuració|personalitzar|preferències|més opcions)$/,
    /^(configuració|preferències|opcions)( de( les)?)? (galetes|cookies?)$/is,
    /^(gestiona|gestionar|configura|configurar|personalitza|personalitzar|veure|establir|administrar)( les)?( meves)? (preferències|galetes|cookies?|opcions)$/is,
    // Galician (GL)
    "xestionar preferencias",
    // Basque (EU)
    /^(konfigurazioa|konfiguratu)$/,
    // Portuguese (PT)
    "gerenciar cookies",
    // French (FR)
    "param\xE9trage des cookies",
    "param\xE9trer",
    "personnaliser",
    "param\xE8tres",
    "pr\xE9f\xE9rences",
    "r\xE9glages",
    "d\xE9tails",
    "gestion des cookies",
    /^gérer (les |mes )?cookies$/,
    "je choisis",
    "voir les pr\xE9f\xE9rences",
    // German (DE)
    "abschnitt einzelheiten",
    "cookie-details",
    /^datenschutz-?einstellungen$/,
    "cookie-einstellungen",
    /^einstell(ungen|en) oder ablehnen$/,
    "ausw\xE4hlen",
    /^einstellungen (anpassen|ansehen|verwalten|ändern)$/,
    "erweiterte einstellungen",
    "individuelle datenschutz-pr\xE4ferenzen",
    "individuelle datenschutzeinstellungen",
    "konfigurieren",
    "mehr optionen",
    "pr\xE4ferenzen",
    "individuelle einstellungen",
    "privatsph\xE4re einstellungen",
    // Dutch (NL)
    /^(aan|an)passen$/,
    /^cookie[- ]instellingen$/,
    "cookiestatement instellingen",
    /^details (tonen|weergeven)$/,
    "instellingen",
    "meer opties",
    "zelf instellen",
    // Czech (CS)
    "podrobn\xE9 nastaven\xED",
    // Polish (PL)
    // examples:
    //  dostosuj pliki cookie (adjust cookies)
    //  zarządzaj plikami cookie (manage cookies)
    /^(dostosuj|s?personalizuj|chcę dostosować|zarządzaj) ?(moje|moimi)? ?(ustawieniami|preferencjami)? ?(zgody|wybory|(plik(i|ami|ów))? cookies?)?$/,
    /^(preferencje|zarządzaj preferencjami)$/,
    /^(ustawienia|zmień ustawienia|zmiana ustawień|zarządzaj opcjami)$/,
    "centrum preferencji",
    /^chcę dokonać ustawień cookies\.$/,
    "dostosuj wyb\xF3r",
    "edytuj ustawienia",
    "konfiguracja zg\xF3d",
    "otw\xF3rz ustawienia",
    "personalizacja",
    "poka\u017C cele",
    "poka\u017C szczeg\xF3\u0142y",
    "szczeg\xF3\u0142y",
    "pozw\xF3l mi wybra\u0107",
    /^przejdź do ustawień plików cookies\.$/,
    "przejd\u017A do ustawie\u0144 prywatno\u015Bci",
    "przejd\u017A do ustawie\u0144",
    "skonfiguruj",
    "ustaw swoje wybory",
    "ustawienia ciasteczek",
    "ustawienia prywatno\u015Bci",
    "ustawienia zaawansowane",
    "ustawienia zgody",
    /^ustawienia(ch)?( plików)? cookies?$/,
    "ustawieniach",
    "ustawie\u0144 zaawansowanych",
    "wi\u0119cej opcji",
    "wi\u0119cej ustawie\u0144",
    /^wybierz, jakie pliki cookies chcesz zaakceptować\.$/,
    "zaawansowane",
    "zarz\u0105dzaj zgodami dotycz\u0105cymi plik\xF3w cookies",
    "zarz\u0105dzaj zgodami",
    "zarz\u0105dzania zgodami",
    "zarz\u0105dzanie opcjami",
    "zarz\u0105dzanie preferencjami",
    "zarz\u0105dzanie ustawieniami plik\xF3w cookie",
    "zmieniam ustawienia",
    "zmieniam zgody",
    "zmie\u0144 swoje preferencje",
    /^zmień ustawienia( plików)? cookies?$/,
    "zmie\u0144 zgody",
    "zobacz preferencje",
    // Russian (RU)
    // e.g. "настроить", "настройки куки", "параметры конфиденциальности"; \w does not match Cyrillic
    /^\s*((мои|моими|свои|своими)\s+)?(настро[а-яё]+|парамет[а-яё]+|предпочтени[а-яё]+)([\s-]+(мои|моими|свои|своими|файл[а-яё]*|cookie|куки[а-яё]*|конфиденциальност[а-яё]*|согласи[а-яё]*|приватност[а-яё]*))*\s*$/is,
    // e.g. "управление файлами cookie", "изменить настройки", "выбрать категории"
    // "подробн" is deliberately excluded: it would also match the "подробнее о cookie" policy link
    /^\s*(управл[а-яё]+|измен[а-яё]+|выбрать|персонализ[а-яё]+|расширенн[а-яё]+|индивидуальн[а-яё]+)[\s-]+.{0,20}(настройк[а-яё]*|парамет[а-яё]*|предпочтени[а-яё]*|категори[а-яё]*|файл[а-яё]*|cookie|куки[а-яё]*|согласи[а-яё]*|конфиденциальност[а-яё]*)\s*$/is,
    "\u043F\u043E\u0434\u0440\u043E\u0431\u043D\u044B\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438",
    // Italian (IT)
    "personalizza cookie",
    // English (EN)
    "advanced settings",
    "consent settings",
    /^details (anzeigen|zeigen|section)$/,
    "no, adjust",
    "personalize",
    "plus doptions",
    "privacy manager"
  ];
  var ACCEPT_PATTERNS = [
    // EN accept/agree/allow/consent/enable (+ all/cookies/selection/continue/close/proceed...).
    // The negative lookahead avoids essential-only/reject wording (those are reject).
    /^(?!.*\b(essential|necessary|required|functional|minimal|reject|deny|refuse|decline|only|dismiss)\b)(?!.*all cookies continue)(yes,?\s+)?(i\s+)?(accept|agree|allow|consent|enable)(\s+(to\s+)?(all( cookies)?|cookies|selection|selected( cookies)?|everything|recommended( cookies| settings)?|optional( cookies)?|additional cookies|analytics cookies))?(\s+(and\s+)?(continue|close|proceed|save))?\s*$/is,
    /^continue (and accept|using cookies|with (all|recommended cookies|cookies))$/is,
    // DE accept verbs
    /^(alle[sn]?\s+|allem\s+|ich\s+|cookies\s+|ausgewählte\s+|webanalyse\s+)?(cookies?\s+)?(akzeptieren|annehmen|zustimmen|zulassen|erlauben|einwilligen|aktivieren|auswählen)(\s+(und\s+)?(weiter|schlie(ß|ss)en))?\s*$/is,
    /^((meine\s+)?auswahl|alle)\s+(bestätigen|akzeptieren|auswählen)$/is,
    /^(alle[nm]?\s+)?(zustimmen|einverstanden|einwilligung|zustimmung)$/is,
    /^ich (bin einverstanden|akzeptiere( alle)?|stimme zu)$/is,
    // NL accept verbs
    /^(ja,?\s+)?(alle[s]?\s+|ik\s+)?(cookies?\s+)?(accepteer|accepteren|toestaan|aanvaard|aanvaarden|ga akkoord|akkoord)(\s+((en\s+)?sluiten|en\s+(doorgaan|verdergaan)|cookies|alle))?\s*$/is,
    /^(selectie (accepteren|toestaan)|accepteer (selectie|alle)|alle (toestaan|accepteren|aanvaarden)|ja, (dat is prima|prima|alles toestaan|accepteren|ik accepteer cookies|ik ga akkoord)|is goed)$/is,
    // FR accept verbs
    /^(oui,?\s+)?(je\s+)?(tout\s+)?(accepter|jaccepte|autoriser)(\s+(tout|tous les (cookies|témoins)|les (cookies|témoins)|la sélection|et (continuer|fermer|poursuivre)))?\s*$/is,
    /^(oui, (jaccepte|je suis daccord)|jaccepte (les cookies|lutilisation de cookies)|accepter (continuer|et poursuivre)|continuer et accepter|fermer et accepter)$/is,
    // ES/CA accept verbs
    /^(sí,?\s+|si,?\s+)?(aceptar|acepta|permitir|permitirlas|consentir|estoy de acuerdo|de acuerdo|estic dacord)(\s+(todo|todas( las cookies)?|cookies|la selección|selección|y (cerrar|continuar|seguir( leyendo)?|leer gratis)))?\s*$/is,
    // save / submit selection / preferences (accept semantics; acknowledge catches "guardar configuración/selección" first)
    /^(save|store|submit|guardar|sauvegarder|zapisz|opslaan|bewaar)\b.{0,25}(preference|setting|selection|choice|mes choix|cookie|voorkeur|keuze|ustawien|zgod)/is,
    /^((meine\s+)?auswahl|einstellungen|einwilligung|voorkeuren|instellingen|selectie|keuzes)\s+(speichern|opslaan)$/is,
    /i (accept|allow)( all)?/is,
    "yes",
    /accept all above/is,
    "close and accept",
    /(^|\s)accept all$/is,
    "im ok with that",
    // Spanish (ES)
    /^acept(ar|o)( cookies)?$/,
    /^acept(o|ar) todas las cookies$/,
    "aceptar cookies opcionales",
    "aceptar gratis",
    "aceptar las cookies",
    "aceptar todas cookies",
    "aceptar todas y cerrar",
    "aceptar todas y continuar",
    "aceptar todo y cerrar",
    /^aceptar y (continuar|seguir|navegar)( gratis)?$/,
    "aceptar y seguir navegando",
    "aceptarlas todas",
    "guardar preferencias",
    "ok, las acepto",
    /^s[íi], acepto todas las cookies$/,
    /^s[íi], acepto$/,
    /^s[íi], estoy de acuerdo$/,
    "x aceptar y cerrar",
    // Catalan (CA)
    /^accept(ar|o)( cookies)?$/,
    "accepta",
    "accepta totes les cookies",
    "accepta-ho tot",
    // FR/CA "d'accord" / "d'acord"
    /^dac?cord( fermer)?$/is,
    "accepta-les totes",
    "acceptar galetes",
    "acceptar i tancar",
    "acceptar tot",
    "acepta-les totes",
    "permet-les totes",
    "permetre totes les cookies",
    "permetre la selecci\xF3",
    // Basque (EU)
    /^denak? onartu$/,
    /^onartu \(cookie\)$/,
    "onartu cookieak",
    "onartu",
    // Portuguese (PT)
    "aceitar cookies",
    "aceitar",
    "de acordo",
    // French (FR)
    /^accepter (tout|tous les cookies|fermer)$/,
    // German (DE)
    /^(alles akzeptieren|alle zulassen|auswahl erlauben|cookies zulassen|einverstanden|einwilligung|zustimmen|zustimmung)$/,
    // Dutch (NL)
    /^(accepteer (alles|alle cookies)|alles (accepteren|toestaan)|alle cookies (accepteren|toestaan))$/,
    // Czech (CS)
    "souhlas\xEDm",
    // Polish (PL)
    // examples:
    //  akceptuj cookies (Accept cookies)
    //  akceptuj wszystkie pliki cookie (Accept all cookies)
    /^(zaakceptuj|akceptuj[eę]|akceptuj) ?(wszystkie|wszystko)?( pliki)? ?(zgody|ciasteczka|cookies?)?$/,
    "akceptowanie plik\xF3w cookie",
    "akceptuj wybrane",
    "akceptuj i zamknij",
    "akceptuj wszystkie i przejd\u017A do serwisu",
    "akceptuj\u0119 i przechodz\u0119 do serwisu",
    "akceptuj\u0119 polityk\u0119 plik\xF3w cookies i przechodz\u0119 do strony",
    "akceptuj\u0119 ustawienia cookies",
    "akceptuj\u0119 wszystkie i korzystam z us\u0142ug",
    "akceptuj\u0119!",
    "ok, zgadzam si\u0119",
    "potwierdzam wszystkie",
    "tak",
    "tak, zgadzam si\u0119 na wszystkie pliki cookie",
    "tak, zgadzam si\u0119",
    "wyra\u017A zgod\u0119 na wszystko",
    "wyra\u017Cam zgod\u0119 na wszystkie",
    "wyra\u017Cam zgod\u0119",
    "w\u0142\u0105cz wszystkie ciasteczka",
    "zaakceptuj i kontynuuj",
    "zaakceptuj i zamknij",
    "zaakceptuj wszystkie i przejd\u017A do serwisu",
    "zaakceptuj wszystkie zgody i wejd\u017A do serwisu",
    "zaakceptuj wszystkie zgody i zapisz",
    "zatwierd\u017A",
    "zezwolenie na wszystkie",
    "zezw\xF3l na wszystkie ciasteczka",
    "zezw\xF3l na wszystkie cookies",
    "zezw\xF3l na wszystkie pliki cookies",
    "zezw\xF3l na wszystkie",
    "zezw\xF3l na wyb\xF3r",
    "zezw\xF3l",
    "zgadzam si\u0119 na wszystkie",
    "zgadzam si\u0119",
    "zgoda na wszystkie",
    "zgoda",
    "zaakceptuj wybrane",
    "zezw\xF3l na wybrane",
    "zgoda na wybrane",
    // Russian (RU)
    // e.g. "принять всё", "принять все файлы cookie", "разрешить куки", "я согласен"
    // confirm/save wording (подтвердить, сохранить) is acknowledge, not accept
    /^\s*(да,?\s+)?(я\s+)?(принять|принима[а-яё]+|соглас[а-яё]+|разрешить|разреша[а-яё]+)(\s+(вс[её]|(все\s+)?(файлы[\s-]+)?(cookie|куки)([\s-]+файл[а-яё]*)?|выбранные|выбор))?\s*$/is,
    "\u043F\u0440\u0438\u043D\u044F\u0442\u044C",
    // Turkish (TR)
    "kabul et",
    // Italian (IT)
    "accetta",
    "accetta tutti i cookie",
    "accetto tutti i cookie"
  ];
  var ACKNOWLEDGE_PATTERNS = [
    // close / dismiss the banner/dialog/message (multilingual). The negative lookahead avoids
    // accept/save phrases (e.g. "agree and close", "akkoord en sluiten", "speichern schließen").
    /^(?!.*\b(accept\w*|accepter|accepteer|accepteren|agree|allow|akkoord|aanvaard\w*|zustimm\w*|annehm\w*|akzeptier\w*|aceptar|acepta|permit\w*|consent\w*|einverstanden|zezw\w*|zgadzam|zgoda|guardar|opslaan|enregistrer|speicher\w*|zapisz)\b)(x\s+|nee,?\s+)?(close|dismiss|schlie(ß|ss)en|sluiten|afsluiten|fermer|cerrar|tanca|beenden|masquer|zamknij)( (this|the|ce|le|el|de|des|het|la|een)?\s*(banner|bandeau|banier|bar|dialog|dialogue|window|okno|melding|message|notification|informa\w*|notificaci\w*|cookie\w*|bannière|rgpd|gdpr|hier|des cookies|de cookies|x))*\.?\s*$/is,
    // "ok" / "okay" / "oké" (optionally followed by a short acknowledgement)
    /^(ok|okay|oké|okey|k)([ .!,]*)(got it|verstanden|compris|rozumiem|thanks|gracias|ik begrijp( dat| het)?|continue to website|pour moi|fermer)?[ .!]*$/is,
    // "understood" / "got it" / "that's ok" (multilingual)
    /^(i understand|understood|got it|thats (ok|fine|okay)|alright|alles klar|in ordnung|verstanden|begrepen|jai compris|je comprends|compris|ik begrijp het|ik snap het|entendido|c(e)?st ok pour moi)[ !.,]*(merci|bedankt|dismiss this banner)?[ !.]*$/is,
    // confirm
    /^(confirm|bestätigen|bevestigen|confirmar|potwierdź)[ !.]*$/is,
    // neutral "continue" without accept/reject wording
    /^(continuer|doorgaan|ga verder)$/is,
    "continue",
    "x",
    /^got it!?$/,
    "acknowledge",
    /^close (banner|cookie notification)$/is,
    /understood$/is,
    "confirm my choices",
    // German (DE)
    "speichern schlie\xDFen",
    // Spanish (ES)
    /^.?( lo)?(entendido|entiendo).?$/s,
    "aceptar seleccionadas",
    "continuar",
    "guardar configuraci\xF3n",
    "guardar selecci\xF3n",
    "guardar y cerrar",
    "ir al contenido principal",
    "seguir",
    "vale",
    "\xA1vamos!",
    // Catalan (CA)
    /^(ho )?(entenc|entès|entesos)[ !.]*$/s,
    // Polish (PL)
    "kontynuuj",
    "ok, zrozumia\u0142em",
    /^ok.? rozumiem.?$/s,
    "rozumiem!",
    "rozumiem",
    "rozumiem, nie pokazuj wi\u0119cej",
    "w porz\u0105dku!",
    "w porz\u0105dku",
    /^zamknij informację o( plikach)? cookies$/,
    "zapisz i zamknij",
    // Russian (RU)
    // e.g. "понятно", "всё понятно", "хорошо", "ясно"; \w does not match Cyrillic
    /^\s*(хорошо|ясно|(вс[её]\s+)?(понятно|понял[аи]?))[!.]*\s*$/is,
    // e.g. "закрыть", "закрыть уведомление о cookie"
    /^\s*закрыть([\s-]+(это|эту|баннер|уведомлени[а-яё]*|окно|сообщени[а-яё]*|плашк[а-яё]*|информаци[а-яё]*)){0,2}([\s-]+(о|об)[\s-]+(cookie|куки[а-яё]*|файл[а-яё]*[\s-]+cookie))?\s*$/is,
    // e.g. "больше не показывать", "не показывать снова"
    /^\s*(больше\s+не\s+показывать|не\s+показывать(\s+(снова|больше|это\s+сообщение))?)\s*$/is,
    // e.g. "подтвердить", "подтверждаю выбор", "сохранить настройки", "сохранить и закрыть"
    /^\s*(подтвер(дить|ждаю|ждени[а-яё]*)|сохран(ить|яю|ение))([\s-]+(мой|мои|моё|свой|свои|своё)?[\s-]*(выбор[а-яё]*|настройк[а-яё]*|парамет[а-яё]*|предпочтени[а-яё]*|согласи[а-яё]*))?([\s-]+и[\s-]+(закрыть|продолжить))?\s*$/is,
    "\u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C"
  ];
  var COOKIE_CHOICE = [
    "\\b(?:accept|reject|decline|refuse|deny|allow|manage|customi[sz]e)\\b[^\\n]{0,25}\\bcookies?\\b",
    "\\b(?:reject|decline|deny|refuse) all\\b",
    "\\b(?:essential|necessary|required) (?:cookies )?only\\b|\\bonly (?:essential|necessary|required)\\b",
    "\\bcookies? (?:notice|settings|preferences|banner)\\b",
    "\\b(?:alle )?(?:cookies )?ablehnen\\b",
    "\\b(?:alles |alle cookies )?(?:weigeren|weiger|afwijzen)\\b",
    "\\b(?:tout )?refuser\\b",
    "\\brechazar(?: todas?)?\\b",
    "\\brifiuta(?: tutti)?\\b",
    // purposes and vendors as a button or heading line: some consent dialogs ask "under 18?"
    "^[^\\n]{0,40}\\b(?:purposes|finalit\xE9s|prop\xF3sitos|zwecke|doeleinden|finalit\xE0|vendors|fournisseurs|proveedores|leveranciers|fornitori)(?!\\w)[^\\n]{0,10}$",
    "\\b(?:legitimate (?:business )?interest|int\xE9r\xEAt l\xE9gitime|inter\xE9s leg\xEDtimo|berechtigtes interesse|gerechtvaardigd belang|legittimo interesse)\\b",
    "\\b(?:we|nous|wir|wij|noi|nosotros) (?:and|et|und|en|e|y) (?:our|nos|unsere|onze|i nostri|nuestros) (?:\\d+ )?(?:partners|partenaires|partner|socios)\\b"
  ].join("|");
  var BARE_ACCEPT = [
    "\\b(?:accept|allow) all\\b",
    "\\b(?:alle )?(?:cookies )?(?:akzeptieren|erlauben|zulassen)\\b",
    "\\b(?:alles |alle cookies )?(?:accepteren|accepteer|toestaan)\\b",
    "\\b(?:tout )?accepter\\b",
    "\\baceptar(?: todas?)?\\b",
    "\\baccetta(?: tutti)?\\b"
  ].join("|");
  var COOKIE_CHOICE_RE = new RegExp(COOKIE_CHOICE, "im");
  var CONSENT_CHOICE = new RegExp(`${COOKIE_CHOICE}|${BARE_ACCEPT}`, "im");
  var AGE_WORDING = new RegExp(
    [
      "\\b(?:over|above|at least|older than|minimum(?: age of)?)\\s*(?:18|21|eighteen)\\b",
      // "18+" only with age words after it: a bare "18+" also appears in cookie banners on adult sites
      "\\b(?:18|21)\\+?\\s*(?:years?(?: of age| old)?|yo|or older|or over)\\b",
      "\\b(?:you|users?|visitors?) must be (?:over |above |at least )?(?:18|21)\\b",
      "\\b(?:i'?m|i am) (?:over |at least )?(?:18|21)\\b",
      "\\bage (?:verification|confirmation|check|gate|restriction)\\b",
      "\\b(?:adults? only|adult[\\s-](?:oriented|content|material|website)|legal age|age of majority|not a minor|minors)\\b",
      "\\b(?:18|21) jahre\\b",
      "\\balters(?:beschr\xE4nkung|best\xE4tigung|verifikation|pr\xFCfung|kontrolle)",
      "\\b(?:vollj\xE4hrig|f\xFCr erwachsene|minderj\xE4hrige)\\b",
      "\\b(?:18|21) jaar\\b",
      "\\b(?:volwassenen|meerderjarig|minderjarigen|leeftijdsverificatie)\\b",
      "\\b(?:18|21) ans\\b",
      // no \\b before an accented letter: without the u flag it is not a word character
      "\\b(?:pour adultes|v\xE9rification de l.\xE2ge|mineurs)\\b|\xE2ge l\xE9gal\\b",
      "\\b(?:18|21) a\xF1os\\b",
      "\\b(?:mayor(?:es)? de edad|menores de edad|para adultos|verificaci\xF3n de edad)\\b",
      "\\b(?:18|21) anni\\b",
      "\\b(?:maggiorenne|minorenni|per adulti)\\b|\\bverifica dell.et\xE0(?!\\w)"
    ].join("|"),
    "i"
  );
  var DISMISS_LINE = /^\s*(?:(?:yes,? )?(?:i )?(?:ok(?:ay)?|accept|agree|allow|decline|deny|reject|refuse|understand|acknowledge(?: the use of cookies)?|got it|understood)(?: all)?(?:,? (?:and|&) (?:continue|close))?(?: non-essential)?|close|dismiss|akzeptieren|zustimmen|verstanden|einverstanden|ablehnen|accepteren|akkoord|weigeren|accepter|j.accepte|d.accord|refuser|fermer|aceptar|acepto|rechazar|entendido|accetto|accetta|rifiuta|ho capito|chiudi)\s*[!.]?\s*$/im;
  var DISMISS_END = /[.!?]\s+(?:ok(?:ay)?|got it|i agree|accept)\s*!?\s*$|\[\s*[x×]\s*\]|^\s*[x×✕]\s*$/im;
  var NOTICE_CONTROL = new RegExp(`${CONSENT_CHOICE.source}|${DISMISS_LINE.source}|${DISMISS_END.source}`, "im");
  var LEAVE_LINE = /^\s*(?:(?:no,? )?(?:i )?(?:want to )?(?:leave|exit|verlassen|quitter|sortir|salir|abandonar|esci|uscire|verlaten)\b[^\n]{0,30}|no,? take me away|(?:seite|hier) verlassen|(?:i am|i'm|ich bin|ik ben|je suis|soy|sono) (?:under|unter|onder|jonger dan|menor de(?: edad)?|minorenne|mineur)\b[^\n]{0,10})\s*[!.]?\s*$/im;
  var NOTICE_OWN_CONTROL = new RegExp(
    [
      "\\bcookies? verwalten\\b|\\bcookie-?(?:einstellungen|pr\xE4ferenzen)\\b|\\beinstellungen verwalten\\b",
      "\\bconfigura(?:r|ci\xF3n de)(?: las)? cookies\\b|\\bgestionar(?: las)? cookies\\b|\\bpersonalizar(?: las)? cookies\\b",
      "\\bparam[\xE9e]trer(?: les)? cookies\\b|\\bparam[\xE8e]tres(?: des)? cookies\\b|\\bg[\xE9e]rer(?: les)? cookies\\b|\\bpersonnaliser(?: les)? cookies\\b",
      "\\bgestisci(?: i)? cookie|\\bimpostazioni(?: dei| sui)? cookie|\\bpersonalizza(?: i)? cookie",
      "\\bcookie-?instellingen\\b|\\bcookies? beheren\\b|\\bvoorkeuren (?:beheren|aanpassen)\\b",
      "^\\s*(?:customi[sz]e|personnaliser|param\xE9trer|personalizar|configurar|personalizza|anpassen|aanpassen|meer opties|more options|weitere optionen|plus d.options|m\xE1s opciones|altre opzioni|manage (?:options|preferences|choices))\\s*$",
      "^\\s*close (?:this|the) (?:popup|banner|notice|message)\\s*$"
    ].join("|"),
    "im"
  );
  var ageGateUnless = (control) => (text) => !LEAVE_LINE.test(text) && (control.test(text) || NOTICE_OWN_CONTROL.test(text));
  var CONSENT_WORDS = /cookie|consent|track|partner|personali[sz]|advertis|analytic|privacy (?:options|choices|settings|rights)|do not sell|opt[- ]out/i;
  var LEGAL_AGREEMENT = /\b(?:end[- ]user licen[cs]e agreement|licen[cs]e agreement|limitation of liability|governing law|indemnif\w*|hereunder|disclaimers? of warrant\w*|warrant(?:y|ies) of merchantability)\b/i;
  var DETECT_CONTEXT_NEGATIVES = [
    // popups with their own age confirmation are age gates, even when they mention cookies; a bare accept doesn't count
    // as a cookie choice here, since it may confirm the age
    { name: "age-gate-popup", pattern: AGE_WORDING, unless: ageGateUnless(COOKIE_CHOICE_RE), whole: true, input: "popup" },
    // a license or terms agreement may mention cookies, and its decline button must not be clicked as a cookie reject
    { name: "legal-agreement", pattern: LEGAL_AGREEMENT, whole: true, input: "popup" },
    // page text next to an age gate, unless a consent control is there too
    { name: "age-gate", pattern: AGE_WORDING, unless: ageGateUnless(NOTICE_CONTROL), lines: [4, 5], input: "page" },
    // terms of use need cookie or consent wording; a privacy-policy-only notice needs that or a button
    {
      name: "terms-without-consent",
      pattern: /\bterms\b|\bconditions\b/i,
      unless: CONSENT_WORDS,
      appliesTo: [BY_CONTINUING_PRIVACY]
    },
    {
      name: "privacy-without-control",
      unless: new RegExp(`${CONSENT_WORDS.source}|${DISMISS_LINE.source}`, "im"),
      appliesTo: [BY_CONTINUING_PRIVACY]
    },
    // a cookie policy link among short footer link lines
    {
      name: "footer-link",
      pattern: /^[^.!?:\n]{0,60}\n[\s]*\n?[^.!?:\s][^.!?:\n]{0,59}(?:\n|$)/,
      unless: NOTICE_CONTROL,
      lines: [0, 2],
      input: "page",
      appliesTo: [USE_OF_COOKIES, VERWENDUNG_VON_COOKIES, UTILISATION_DES_COOKIES, GEBRUIK_VAN_COOKIES]
    },
    // "accept all" in prose; case-sensitive since button labels run together in innerText
    {
      name: "accept-all-prose",
      pattern: /\baccept all [a-z]|\baccept All[a-z]/,
      unless: /accept all (?:cookies|and|&)/i,
      window: 15,
      appliesTo: [ACCEPT_ALL]
    },
    {
      name: "acceptez-terms",
      pattern: /conditions (?:générales )?d.utilisation|\bcgu\b/i,
      unless: /cookie|témoin|traceur|partenaire/i,
      appliesTo: [ACCEPTEZ_UTILISATION]
    },
    // the same sentence is also a footer line with only a "learn more" link
    { name: "de-cookie-verb-needs-control", unless: NOTICE_CONTROL, lines: [1, 6], input: "page", appliesTo: [DE_COOKIE_VERB] }
  ];
  var DETECT_PATTERN_LITERALS = [
    ["accept cookies"],
    ["accept all"],
    ["reject all"],
    ["only necessary cookies"],
    [],
    [],
    [" cookies"],
    ["we are using cookies"],
    ["use of cookies"],
    ["website uses cookies to enhance your browsing experience"],
    ["cookies"],
    [" technologies"],
    ["such as cookies"],
    ["read more about"],
    ["consent to"],
    ["we and our partners"],
    ["information"],
    ["store and/or access information"],
    ["personalised ads and content, ad and content measurement"],
    [" and/or access"],
    ["and our partners ask for your consent"],
    ["we and "],
    ["partners", "partnern", "partner", "partenaires", "socios", "vendors", "fornitori"],
    ["partner"],
    ["technolog"],
    ["cookies"],
    ["cookies"],
    ["optional", "additional", "non-essential"],
    ["storing of cookies", "placed cookies"],
    [" on your device", "access and store "],
    ["we use "],
    ["out of "],
    ["out of the sale"],
    ["this website or its third"],
    ["information"],
    ["rights with regard to the sale"],
    ["we use technologies "],
    ["continue reading with advertising", " tracking"],
    ["consent and continue"],
    ["store or retrieve information on your browser", "stock\xE9es dans votre navigateur ou r\xE9cup\xE9r\xE9es"],
    ["utilisons"],
    ["cookies"],
    ["consentement"],
    ["partenaires"],
    ["publicit\xE9s"],
    ["utilise"],
    ["utilisent"],
    ["stocker"],
    ["consentement"],
    ["consentement"],
    ["accepter"],
    ["utilisation"],
    ["technologies"],
    ["utilisation"],
    ["continuer sans accepter"],
    ["tout refuser"],
    [" tous les cookies"],
    ["je refuse"],
    ["refuser et continuer"],
    ["refuser les cookies"],
    ["seulement n\xE9cessaires"],
    ["je d\xE9sactive les finalit\xE9s non essentielles"],
    ["cookies essentiels uniquement"],
    ["n\xE9cessaires uniquement"],
    ["stocker", "stockons"],
    ["nos partenaires demandent votre consentement"],
    ["consentez \xE0 l", " cookies"],
    ["les cookies nous permettent", "nos partenaires et nous"],
    ["accepter "],
    ["verwenden"],
    ["partner"],
    ["zugriff auf informationen auf"],
    ["werbeleistung"],
    ["cookies"],
    ["verwendung"],
    ["cookies"],
    ["verwendet"],
    ["auswahl"],
    ["technologien"],
    ["verwenden"],
    ["ablehnen"],
    ["zus\xE4tzliche", "essenzielle", "funktionale", "notwendige", "erforderliche"],
    ["einwilligung", "zustimmung", "cookies"],
    ["ablehnen"],
    ["nur funktionale cookies akzeptieren"],
    ["optionale ablehnen"],
    ["zustimmung verweigern"],
    ["speichern und/oder "],
    ["unsere partner bitten um ihre zustimmung"],
    [" cookies"],
    ["cookies "],
    [" zum einsatz", "einsatz von cookies"],
    ["einverstanden", "einverstanden"],
    ["akzeptieren", "zulassen", "erlauben", "zustimmen"],
    ["zustimmen und weiter", " ohne zu "],
    ["einwilligung", "zustimmung", "zustimmung", "einwilligung"],
    ["tracking-technologien"],
    ["verwendung "],
    ["mit werbetracking weiterlesen", "weiter mit werbung", "con tracking e annunci"],
    ["gebruik"],
    ["gebruiken"],
    ["vergelijkbare"],
    ["afwijzen", "weigeren", "verwerpen"],
    ["noodzakelijk"],
    ["cookies weigeren"],
    ["weiger"],
    ["doorgaan zonder "],
    ["optionele", "functionele", "functioneel", "noodzakelijke", "essenti\xEBle"],
    ["wijs alles af"],
    [],
    ["onze partners vragen om "],
    ["wij en onze "],
    [" cookies"],
    ["accepteer "],
    ["analytische", "functionele", "essenti\xEBle", "noodzakelijke"],
    [" contin"],
    ["cookie"],
    [" uso de cookies"],
    ["usa cookies de google"],
    [" uso de cookies"],
    ["al utilizar nuestro sitio web"],
    ["almacenar la informaci\xF3n en un dispositivo y"],
    [" utiliza"],
    ["cookies propias y de"],
    ["son necesarias"],
    [" cookie"],
    ["navegando"],
    ["nosotros y nuestros"],
    ["recopilamos y almacenamos datos de usted y de su dispositivo"],
    ["utilizamos tecnolog"],
    ["almacenar", "almacenamos"],
    ["nuestros socios solicitan su consentimiento"],
    ["tanto nosotros como", "nosotros y"],
    ["aceptar", "rechazar", "continuar sin aceptar", "solo las necesarias"],
    ["uso de "],
    ["cookies "],
    ["las cookies nos "],
    ["instalamos", "empleamos"],
    ["cookies", "necesitamos usar cookies"],
    [" cookie"],
    ["u\u017Cywa\u0107", "u\u017Cywamy"],
    ["cele przetwarzania twoich danych przez zaufanych partner\xF3w iab"],
    ["dzi\u0119ki "],
    [" plik\xF3w cookie"],
    ["korzystamy z technologii, takich jak pliki cookie"],
    ["korzystamy"],
    ["niekt\xF3re pliki cookies"],
    ["pliki cookies i pokrewne im technologie umo\u017Cliwiaj\u0105 poprawne dzia\u0142anie strony i pomagaj\u0105 nam dostosowa\u0107 ofert\u0119 do twoich potrzeb"],
    ["przechowywanie informacji na urz\u0105dzeniu lub dost\u0119p do nich"],
    ["przechowywanie plik\xF3w cookie na swoim urz\u0105dzeniu"],
    ["przechowywa\u0107 i uzyskiwa\u0107 dost\u0119p do informacji na twoich urz\u0105dzeniach"],
    ["przetwarzamy"],
    [" u\u017Cywa "],
    ["ta strona korzysta z ciasteczek"],
    ["uzyskujemy dost\u0119p i przechowujemy informacje na urz\u0105dzeniu"],
    ["u\u017Cywa plik"],
    ["u\u017Cywamy plik\xF3w"],
    ["wykorzystuj\u0105 "],
    ["za pomoc\u0105 plik\xF3w cookies"],
    ["zgod\u0105 my i nasi partnerzy mo\u017Cemy wykorzystywa\u0107 precyzyjne dane geolokalizacyjne i identyfikacj\u0119"],
    ["cookies pr\xF2pies i de tercers"],
    ["utilitzem galetes"],
    ["\xFAnicament utilitza galetes pr\xF2pies amb finalitat t\xE8cnica"],
    ["este lloc web utilitza nom\xE9s cookies t\xE8cniques necess\xE0ries per al seu funcionament"],
    ["de personalitzaci\xF3 i an\xE0lisi"],
    ["utilitzem cookies i altres tecnologies"],
    ["cookies", "galetes"],
    ["cookie propio eta hirugarrenenak helburu teknikoarekin erabiltzen ditu"],
    ["cookie propioak eta hirugarrenen cookieak erabiltzen ditugu"],
    ["cookie propioak eta hirugarrenenak helburu teknikoarekin erabiltzen ditu"],
    ["ak erabiltzen ditu"],
    ["cookieak erabiltzen ditu"],
    [" bazkideek cookieak eta identifikadoreak erabiltzen ditugu"],
    ["norberaren eta hirugarrenen cookie"],
    ["web orri honek cookieak erabiltzen ditu"],
    ["webgune honek cookie propioak eta hirugarrenen cookie-fitxategiak erabiltzen ditu"],
    ["empregamos cookies propias"],
    ["este portal emprega cookies propias ou de terceiros con fins anal\xEDticos"],
    ["\u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443"],
    ["\u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443"],
    ["cookie", "\u043A\u0443\u043A\u0438"],
    ["\u0442\u0435\u0445\u043D\u043E\u043B\u043E\u0433\u0438"],
    ["cookie", "\u043A\u0443\u043A\u0438"],
    [],
    ["usiamo", "utilizziamo"],
    ["cookie"],
    ["noi e i nostri"],
    [" cookie"],
    [" cookie"],
    ["tecnici", "di profilazione", "di terze parti", "analitici", "statistici", "di marketing"],
    ["acconsent", "accett"],
    [" navigazione"],
    ["accetta", "accetto", "accettare", "rifiuta", "rifiuto", "rifiutare"],
    [" senza accettare"],
    ["rifiuta e abbonati"],
    ["consenso "],
    [" nostri "],
    ["terze parti selezionate"],
    ["archiviare", "archiviamo", "memorizzare", "memorizziamo"],
    ["anv\xE4nder"],
    ["cookie", "\u30AF\u30C3\u30AD\u30FC"],
    ["bruger cookies"],
    ["informasjonskapsler", "cookies"]
  ];
  function literalIndex(all) {
    const distinct = [...new Set(all)].sort((a, b) => b.length - a.length);
    if (distinct.length === 0) {
      return { present: () => /* @__PURE__ */ new Set() };
    }
    const escape = (l) => l.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
    const any = new RegExp(`(?=(${distinct.map(escape).join("|")}))`, "g");
    const implies = /* @__PURE__ */ new Map();
    const impliedBy = (m) => {
      let list = implies.get(m);
      if (!list) {
        list = distinct.filter((l) => m.startsWith(l));
        implies.set(m, list);
      }
      return list;
    };
    return {
      present(lower) {
        const found = /* @__PURE__ */ new Set();
        for (const m of lower.matchAll(any)) {
          if (!found.has(m[1])) {
            impliedBy(m[1]).forEach((l) => found.add(l));
          }
        }
        return found;
      }
    };
  }
  var TEXT_LIMIT = 1e5;
  var DEFAULT_WINDOW = 150;
  var builtinLiterals;
  function literalsOf(pattern) {
    if (!builtinLiterals) {
      const fresh = DETECT_PATTERN_LITERALS.length === DETECT_PATTERNS.length;
      builtinLiterals = new Map(fresh ? DETECT_PATTERNS.map((p, i) => [patternOf(p), DETECT_PATTERN_LITERALS[i]]) : []);
    }
    return builtinLiterals.get(pattern) ?? [];
  }
  var index;
  var literalsIn = (lower) => (index ??= literalIndex(DETECT_PATTERN_LITERALS.flat())).present(lower);
  var truncate = (text) => (text || "").slice(0, TEXT_LIMIT);
  var forInput = (scoped, input) => !scoped.input || scoped.input === input;
  var stateless = (re) => new RegExp(re.source, re.flags.replace(/[gy]/g, ""));
  function toPredicate(test) {
    if (typeof test === "function") {
      return test;
    }
    const re = stateless(test);
    return (text) => re.test(text);
  }
  var compiledPatterns = /* @__PURE__ */ new WeakMap();
  var compiledNegatives = /* @__PURE__ */ new WeakMap();
  function compilePatterns(detectPatterns) {
    let compiled = compiledPatterns.get(detectPatterns);
    if (!compiled) {
      compiled = detectPatterns.map((p) => {
        const pattern = patternOf(p);
        const input = p instanceof RegExp ? void 0 : p.input;
        const global = pattern.flags.includes("g") ? pattern : new RegExp(pattern.source, `${pattern.flags}g`);
        return { id: pattern.toString(), pattern, global, input, literals: literalsOf(pattern) };
      });
      compiledPatterns.set(detectPatterns, compiled);
    }
    return compiled;
  }
  function compileNegatives(negatives) {
    let compiled = compiledNegatives.get(negatives);
    if (!compiled) {
      compiled = negatives.map((n) => {
        const pattern = n.pattern ? stateless(n.pattern) : null;
        const unless = n.unless ? toPredicate(n.unless) : null;
        return {
          ...n,
          hits: (context) => (!pattern || pattern.test(context)) && !(unless && unless(context)),
          applies: n.appliesTo ? new Set(n.appliesTo.map(String)) : null
        };
      });
      compiledNegatives.set(negatives, compiled);
    }
    return compiled;
  }
  function negativeContext(text, start, end, negative) {
    if (negative.whole) {
      return text;
    }
    if (negative.lines === void 0) {
      const w = negative.window ?? DEFAULT_WINDOW;
      return text.slice(Math.max(0, start - w), end + w);
    }
    const lineEnd = (i) => {
      const next = text.indexOf("\n", i);
      return next === -1 ? text.length : next;
    };
    const [before, after] = Array.isArray(negative.lines) ? negative.lines : [negative.lines, negative.lines];
    let from = start > 0 ? text.lastIndexOf("\n", start - 1) + 1 : 0;
    let to = lineEnd(end);
    for (let i = 0; i < before; i++) {
      from = from >= 2 ? text.lastIndexOf("\n", from - 2) + 1 : 0;
    }
    for (let i = 0; i < after; i++) {
      to = to < text.length ? lineEnd(to + 1) : to;
    }
    return text.slice(from, to);
  }
  function checkHeuristicPatterns(allText, input, options = {}) {
    return matchHeuristicPatterns(allText, input, options, false);
  }
  function hasHeuristicPatterns(allText, input, options = {}) {
    return matchHeuristicPatterns(allText, input, options, true).patterns.length > 0;
  }
  function matchHeuristicPatterns(allText, input, { patterns: detectPatterns = DETECT_PATTERNS, negatives = DETECT_CONTEXT_NEGATIVES }, firstOnly) {
    if (input !== void 0 && input !== "popup" && input !== "page") {
      const got = Array.isArray(input) ? "a pattern list (pass it as the `patterns` option)" : JSON.stringify(input);
      throw new TypeError(`heuristic input must be 'popup', 'page' or undefined, got ${got}`);
    }
    allText = truncate(allText);
    const patterns = [];
    const snippets2 = [];
    const suppressed = [];
    const applicable = compileNegatives(negatives).filter((n) => forInput(n, input));
    let present;
    const wholeHits = /* @__PURE__ */ new Map();
    const hitsAt = (n, start, end) => {
      if (!n.whole) {
        return n.hits(negativeContext(allText, start, end, n));
      }
      let hit = wholeHits.get(n);
      if (hit === void 0) {
        hit = n.hits(allText);
        wholeHits.set(n, hit);
      }
      return hit;
    };
    for (const d of compilePatterns(detectPatterns)) {
      if (!forInput(d, input)) {
        continue;
      }
      if (d.literals.length) {
        const inText = present ??= literalsIn(allText.toLowerCase());
        if (!d.literals.some((l) => inText.has(l))) {
          continue;
        }
      }
      const own = applicable.filter((n) => !n.applies || n.applies.has(d.id));
      const matched = [];
      const dropped = /* @__PURE__ */ new Set();
      let found = false;
      let kept = own.length === 0;
      for (const m of allText.matchAll(d.global)) {
        found = true;
        if (!kept) {
          const start = m.index ?? 0;
          const hit = own.find((n) => hitsAt(n, start, start + m[0].length));
          if (hit) {
            dropped.add(hit.name);
          } else {
            kept = true;
          }
        }
        if (kept && firstOnly) {
          break;
        }
        matched.push(m[0].substring(0, 200));
      }
      if (!found) {
        continue;
      }
      if (!kept) {
        dropped.forEach((negative) => suppressed.push({ pattern: d.id, negative }));
        continue;
      }
      patterns.push(d.id);
      if (firstOnly) {
        break;
      }
      snippets2.push(...matched);
    }
    return { patterns, snippets: snippets2, suppressed };
  }
  function classifyButtons(buttons) {
    for (const button of buttons) {
      button.regexClassification = classifyButtonTextRegex(button.text);
    }
  }
  function classifyPopup(buttons) {
    const { reject, settings, accept, acknowledge } = buttons.reduce(
      (acc, button) => {
        if (button.regexClassification && button.regexClassification !== "other") {
          acc[button.regexClassification]++;
        }
        return acc;
      },
      { reject: 0, settings: 0, accept: 0, acknowledge: 0 }
    );
    if (reject > 0) {
      return "reject";
    }
    if (settings > 0) {
      return "none";
    }
    if (acknowledge > 0) {
      return "tier1";
    }
    if (accept > 0) {
      return accept === 1 ? "tier2" : "none";
    }
    return "none";
  }
  function testButtonMatches(buttonText, matchPatterns, neverMatchPatterns) {
    if (!buttonText) {
      return false;
    }
    const cleanedButtonText = cleanButtonText(buttonText);
    return !neverMatchPatterns.some((p) => p instanceof RegExp && p.test(cleanedButtonText) || p === cleanedButtonText) && matchPatterns.some((p) => p instanceof RegExp && p.test(cleanedButtonText) || p === cleanedButtonText);
  }
  function cleanButtonText(buttonText) {
    let result = buttonText.toLowerCase();
    result = result.replace(/[“”"'/#&[\]→✕×⟩❯><✗×‘’›«»]+/g, "");
    result = result.replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u2600-\u26FF\u2700-\u27BF\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu,
      ""
    );
    result = result.replace(/\n+/g, " ");
    result = result.replace(/\s+/g, " ");
    result = result.trim();
    return result;
  }
  function classifyButtonTextRegex(buttonText) {
    if (testButtonMatches(buttonText, REJECT_PATTERNS, BUTTON_NEVER_MATCH_PATTERNS)) {
      return "reject";
    }
    if (testButtonMatches(buttonText, SETTINGS_PATTERNS, BUTTON_NEVER_MATCH_PATTERNS)) {
      return "settings";
    }
    if (testButtonMatches(buttonText, ACCEPT_PATTERNS, BUTTON_NEVER_MATCH_PATTERNS)) {
      return "accept";
    }
    if (testButtonMatches(buttonText, ACKNOWLEDGE_PATTERNS, BUTTON_NEVER_MATCH_PATTERNS)) {
      return "acknowledge";
    }
    return "other";
  }
  var BUTTON_LIKE_ELEMENT_SELECTOR = 'button, input[type="button"], input[type="submit"], a, [role="button"], [class*="button"]';
  var POPUP_SEARCH_MAX_TIME = 100;
  var FRAGMENT_NEGATIVES = DETECT_CONTEXT_NEGATIVES.filter((n) => !n.whole);
  var hasFragmentPatterns = (text) => hasHeuristicPatterns(text, "popup", { negatives: FRAGMENT_NEGATIVES });
  var ACCEPTED_LEVELS = {
    off: [],
    reject: ["reject"],
    tier1: ["reject", "tier1"],
    tier2: ["reject", "tier1", "tier2"]
  };
  function getActionablePopups(mode = "reject", timeout = POPUP_SEARCH_MAX_TIME, hitTest = false) {
    const acceptedLevels = ACCEPTED_LEVELS[mode];
    const isActionable = (popup) => acceptedLevels.includes(popup.regexClassification) && isConsentPopup(popup);
    const popups = searchPopups(timeout, hitTest, DEFAULT_HIT_TEST_GRID, true).filter(isActionable);
    return popups.sort((a, b) => classificationRank(a) - classificationRank(b));
  }
  function searchPopups(timeout, hitTest, hitTestGrid, stopOnReject = false) {
    if (!isTopFrame()) {
      return getFramePopups();
    }
    const deadline = performance.now() + timeout;
    const hitTestPopups = hitTest ? findPopupsByHitTest(deadline, hitTestGrid) : [];
    if (stopOnReject && hitTestPopups.some((p) => p.regexClassification === "reject" && isConsentPopup(p))) {
      return hitTestPopups;
    }
    const walkPopups = collectPositionedPopups(deadline);
    return [...walkPopups, ...mergeWalkOverlaps(hitTestPopups, walkPopups)];
  }
  var consentPopups = /* @__PURE__ */ new WeakMap();
  function classificationRank(popup) {
    return ACCEPTED_LEVELS.tier2.indexOf(popup.regexClassification);
  }
  function isConsentPopup(popup) {
    if (!ACCEPTED_LEVELS.tier2.includes(popup.regexClassification)) {
      return false;
    }
    let result = consentPopups.get(popup);
    if (result === void 0) {
      const popupText = popup.text.trim();
      result = !!popupText && hasHeuristicPatterns(popupText, "popup");
      consentPopups.set(popup, result);
    }
    return result;
  }
  function mergeWalkOverlaps(hitTestPopups, walkPopups) {
    return hitTestPopups.filter((h) => {
      const hitIsConsent = isConsentPopup(h);
      const absorbs = (p) => !hitIsConsent || isConsentPopup(p) && classificationRank(p) <= classificationRank(h);
      const walkPopup = walkPopups.find((p) => composedOverlaps(p.element, h.element) && absorbs(p));
      if (walkPopup) {
        (walkPopup.hitPoints ??= []).push(...h.hitPoints ?? []);
      }
      return !walkPopup;
    });
  }
  function getFramePopups() {
    if (window.parent && window.parent !== window.top) {
      return [];
    }
    const frameElement = getFramePopupElement(document);
    const popup = frameElement && toPopupData(frameElement);
    if (!popup) {
      return [];
    }
    popup.source = "frame";
    return [popup];
  }
  function collectPositionedPopups(deadline) {
    const { elements, shadowHosts } = getPopupLikeElements(deadline);
    const potentialPopups = [];
    const expanded = [];
    for (const el of elements) {
      const popup = toPopupData(el, shadowHosts);
      if (!popup) {
        continue;
      }
      const root = performance.now() > deadline ? popup : expandPopupFragment(popup, shadowHosts);
      if (potentialPopups.some((p) => p.element === root.element)) {
        continue;
      }
      if (root !== popup) {
        expanded.push(root.element);
      }
      root.source = "walk";
      potentialPopups.push(root);
    }
    return potentialPopups.filter((p) => !expanded.some((root) => root !== p.element && composedContains(root, p.element)));
  }
  var DEFAULT_HIT_TEST_GRID = {
    columns: [0.1, 0.5, 0.9],
    // banners sit along the top and bottom edges and modals in the middle; rows 150px in added almost nothing in crawls
    edgeRows: [30, 90]
  };
  function findPopupsByHitTest(deadline, grid) {
    const climbed = /* @__PURE__ */ new Map();
    const found = [];
    const toPopup = (el) => el.querySelector(TEXT_ENTRY_SELECTOR) ? null : toPopupRoot(el);
    for (const [x, y] of getHitTestPoints(grid)) {
      if (performance.now() > deadline) {
        return found;
      }
      const path = [];
      let reached = null;
      const shouldStop = (el) => {
        if (climbed.has(el)) {
          reached = climbed.get(el) ?? null;
          return true;
        }
        const overlapped = found.find((p) => composedOverlaps(p.element, el));
        if (overlapped) {
          reached = composedContains(overlapped.element, el) ? overlapped : null;
          return true;
        }
        path.push(el);
        return false;
      };
      const hit = closestHTMLElement(deepElementFromPoint(x, y));
      const popup = climbToPopup(hit, MAX_HIT_TEST_CLIMB_DEPTH, toPopup, shouldStop);
      if (popup) {
        popup.source = "hitTest";
        found.push(popup);
        reached = popup;
      }
      for (const el of path) {
        climbed.set(el, reached);
      }
      if (reached) {
        (reached.hitPoints ??= []).push([x, y]);
      }
    }
    return found;
  }
  function getHitTestPoints(grid) {
    const { innerWidth: width, innerHeight: height } = window;
    const rows = [...grid.edgeRows, height / 2, ...grid.edgeRows.map((y) => height - y)].map((y) => Math.round(y));
    const ys = [...new Set(rows)].filter((y) => y >= 0 && y < height);
    return ys.flatMap((y) => grid.columns.map((column) => [Math.round(column * width), y]));
  }
  var TEXT_ENTRY_SELECTOR = 'textarea, input:not([type]), input[type="text"], input[type="email"], input[type="password"], input[type="search"], input[type="tel"], input[type="number"], input[type="url"]';
  function deepElementFromPoint(x, y) {
    let el = document.elementFromPoint(x, y);
    while (el?.shadowRoot) {
      const inner = el.shadowRoot.elementFromPoint(x, y);
      if (!inner || inner === el) {
        break;
      }
      el = inner;
    }
    return el;
  }
  function closestHTMLElement(el) {
    while (el && !(el instanceof HTMLElement)) {
      el = el.parentElement;
    }
    return el;
  }
  function toPopupData(el, shadowHosts, text = getElementText(el)) {
    if (!text) {
      return null;
    }
    const buttons = getButtonData(el, shadowHosts);
    classifyButtons(buttons);
    return { text, element: el, buttons, regexClassification: classifyPopup(buttons) };
  }
  function hasPopupButtons(text, buttons) {
    return !isOnlyButtonText(text, buttons) && buttons.some((b) => b.regexClassification !== "other");
  }
  function isOnlyButtonText(text, buttons) {
    let rest = text;
    for (const button of buttons) {
      rest = rest.replace(button.text, "");
    }
    return rest.replace(/\s+/g, "").length < 10;
  }
  function toPopupRoot(el, shadowHosts) {
    const text = getElementText(el);
    if (!text || !hasFragmentPatterns(text)) {
      return null;
    }
    const popup = toPopupData(el, shadowHosts, text);
    return popup && hasPopupButtons(text, popup.buttons) ? popup : null;
  }
  var MAX_FRAGMENT_EXPANSION_DEPTH = 6;
  var MAX_HIT_TEST_CLIMB_DEPTH = 8;
  function climbToPopup(el, maxDepth, toPopup, shouldStop) {
    for (let depth = 0; el && depth < maxDepth; depth++, el = getComposedParent(el)) {
      if (shouldStop?.(el) || el === document.body || el === document.documentElement || el.getBoundingClientRect().height > window.innerHeight) {
        return null;
      }
      const popup = toPopup(el);
      if (popup) {
        return popup;
      }
    }
    return null;
  }
  function expandPopupFragment(popup, shadowHosts) {
    if (hasFragmentPatterns(popup.text) && hasPopupButtons(popup.text, popup.buttons)) {
      return popup;
    }
    const parent = getComposedParent(popup.element);
    return climbToPopup(parent, MAX_FRAGMENT_EXPANSION_DEPTH, (el) => toPopupRoot(el, shadowHosts)) ?? popup;
  }
  function getComposedParent(el) {
    if (el.parentElement) {
      return el.parentElement;
    }
    const parent = el.parentNode;
    return parent instanceof ShadowRoot && parent.host instanceof HTMLElement ? parent.host : null;
  }
  function getFramePopupElement(doc) {
    const el = doc.body || doc.documentElement;
    const win = doc.defaultView;
    if (!el || !win || win.innerWidth === 0 || win.innerHeight === 0 || !isStyleVisible(el)) {
      return null;
    }
    return getElementText(el).trim() ? el : null;
  }
  function isStyleVisible(el) {
    return typeof el.checkVisibility !== "function" || el.checkVisibility({ checkVisibilityCSS: true });
  }
  function getElementText(el) {
    const text = el.innerText || "";
    if (!el.shadowRoot) {
      return text;
    }
    const shadowTexts = Array.from(el.shadowRoot.children, (child) => isRenderedTextElement(child) ? getElementText(child) : "");
    return [text, ...shadowTexts].filter((t) => t.trim()).join("\n");
  }
  function isRenderedTextElement(el) {
    return el instanceof HTMLElement && !["STYLE", "SCRIPT", "TEMPLATE", "NOSCRIPT", "LINK", "SLOT"].includes(el.tagName) && window.getComputedStyle(el).display !== "none";
  }
  function composedOverlaps(a, b) {
    return composedContains(a, b) || composedContains(b, a);
  }
  function composedContains(container, node) {
    if (container.contains(node)) {
      return true;
    }
    let root = node.getRootNode();
    while (root instanceof ShadowRoot) {
      if (container.contains(root.host)) {
        return true;
      }
      root = root.host.getRootNode();
    }
    return false;
  }
  function isPopupCandidateVisible(el) {
    return isElementVisible(el) && isStyleVisible(el) && isOnScreen(el);
  }
  function isOnScreen(el) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return window.getComputedStyle(el).overflow === "visible" && Array.from(el.children).some((child) => isOnScreen(child));
    }
    return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
  }
  function isDialogLikeElement(node) {
    if (node.tagName === "DIALOG" && node.hasAttribute("open")) {
      return true;
    }
    if (node.getAttribute("role") === "dialog" || node.getAttribute("aria-modal") === "true") {
      return true;
    }
    return false;
  }
  function getPopupLikeElements(deadline) {
    const found = [];
    const shadowHosts = [];
    const roots = [document.documentElement];
    for (let i = 0; i < roots.length; i++) {
      if (i > 0 && performance.now() > deadline) {
        break;
      }
      const walker = document.createTreeWalker(
        roots[i],
        NodeFilter.SHOW_ELEMENT,
        // visit only element nodes
        {
          acceptNode(node) {
            if (node.shadowRoot) {
              shadowHosts.push(node);
              roots.push(node.shadowRoot);
            }
            if (node.tagName === "BODY") {
              return NodeFilter.FILTER_SKIP;
            }
            const style = window.getComputedStyle(node);
            if (style.display === "none") {
              return NodeFilter.FILTER_REJECT;
            }
            const cssPosition = style.position;
            if ((cssPosition === "fixed" || cssPosition === "sticky" || isDialogLikeElement(node)) && isPopupCandidateVisible(node)) {
              return NodeFilter.FILTER_ACCEPT;
            }
            if (performance.now() > deadline) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_SKIP;
          }
        }
      );
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        found.push(node);
      }
    }
    return { elements: excludeContainers(found.filter((element) => getElementText(element).trim())), shadowHosts };
  }
  function getButtonData(el, shadowHosts) {
    const buttons = [];
    for (const b of excludeContainers(getButtonLikeElements(el, shadowHosts))) {
      if (!isElementVisible(b) || isDisabled(b)) {
        continue;
      }
      const text = getElementText(b).trim() || // <input> values do not appear in innerText
      (b instanceof HTMLInputElement && ["submit", "button"].includes(b.type) ? b.value?.trim() : "");
      if (text) {
        buttons.push({ text, element: b });
      }
    }
    return buttons;
  }
  function getButtonLikeElements(el, shadowHosts = findShadowHosts(el)) {
    const buttons = Array.from(el.querySelectorAll(BUTTON_LIKE_ELEMENT_SELECTOR));
    for (const host of shadowHosts) {
      if (composedContains(el, host)) {
        buttons.push(...host.shadowRoot.querySelectorAll(BUTTON_LIKE_ELEMENT_SELECTOR));
      }
    }
    return buttons;
  }
  function findShadowHosts(root) {
    const hosts = [];
    const candidates = root instanceof HTMLElement ? [root, ...root.querySelectorAll("*")] : root.querySelectorAll("*");
    for (const el of candidates) {
      if (el.shadowRoot) {
        hosts.push(el, ...findShadowHosts(el.shadowRoot));
      }
    }
    return hosts;
  }
  function isDisabled(el) {
    return "disabled" in el && Boolean(el.disabled) || el.hasAttribute("disabled");
  }
  function excludeContainers(elements) {
    const candidates = new Set(elements);
    const containers = /* @__PURE__ */ new Set();
    for (const el of elements) {
      for (let node = el.parentNode; node; node = node.parentNode || (node instanceof ShadowRoot ? node.host : null)) {
        if (candidates.has(node)) {
          containers.add(node);
        }
      }
    }
    return elements.filter((el) => !containers.has(el)).reverse();
  }
  var defaultRunContext = {
    main: true,
    frame: false,
    urlPattern: ""
  };
  var AutoConsentCMPBase = class {
    constructor(autoconsentInstance) {
      this.name = "BASERULE";
      this.runContext = defaultRunContext;
      this.autoconsent = autoconsentInstance;
    }
    get hasSelfTest() {
      throw new Error("Not Implemented");
    }
    get isIntermediate() {
      throw new Error("Not Implemented");
    }
    get isCosmetic() {
      throw new Error("Not Implemented");
    }
    mainWorldEval(snippetId) {
      const snippet = snippets[snippetId];
      if (!snippet) {
        this.autoconsent.config.logs.errors && console.warn("Snippet not found", snippetId);
        return Promise.resolve(false);
      }
      const logsConfig = this.autoconsent.config.logs;
      if (this.autoconsent.config.isMainWorld) {
        logsConfig.evals && console.log("inline eval:", snippetId, snippet);
        let result = false;
        try {
          result = !!snippet.call(globalThis);
        } catch (e) {
          logsConfig.evals && console.error("error evaluating rule", snippetId, e);
        }
        return Promise.resolve(result);
      }
      const snippetSrc = getFunctionBody(snippet);
      logsConfig.evals && console.log("async eval:", snippetId, snippetSrc);
      return requestEval(snippetSrc, snippetId).catch((e) => {
        logsConfig.evals && console.error("error evaluating rule", snippetId, e);
        return false;
      });
    }
    checkRunContext() {
      if (!this.checkFrameContext(isTopFrame())) {
        return false;
      }
      if (this.runContext.urlPattern && !this.hasMatchingUrlPattern()) {
        return false;
      }
      return true;
    }
    checkFrameContext(isTop) {
      const runCtx = {
        ...defaultRunContext,
        ...this.runContext
      };
      if (isTop && !runCtx.main) {
        return false;
      }
      if (!isTop && !runCtx.frame) {
        return false;
      }
      return true;
    }
    hasMatchingUrlPattern() {
      return Boolean(this.runContext?.urlPattern && window.location.href.match(this.runContext.urlPattern));
    }
    detectCmp() {
      throw new Error("Not Implemented");
    }
    async detectPopup() {
      return false;
    }
    optOut() {
      throw new Error("Not Implemented");
    }
    optIn() {
      throw new Error("Not Implemented");
    }
    openCmp() {
      throw new Error("Not Implemented");
    }
    async test() {
      return Promise.resolve(true);
    }
    async highlightElements(elements, all = false, delayTimeout = 2e3) {
      if (elements.length === 0) {
        return;
      }
      if (!all) {
        elements = [elements[0]];
      }
      this.autoconsent.sendContentMessage({
        type: "visualDelay",
        timeout: delayTimeout
      });
      for (const el of elements) {
        this.autoconsent.config.logs.rulesteps && console.log("highlighting", el);
        highlightNode(el);
      }
      await this.wait(delayTimeout);
      for (const el of elements) {
        unhighlightNode(el);
      }
    }
    // Implementing DomActionsProvider below:
    async clickElement(element) {
      if (this.autoconsent.config.visualTest) {
        await this.highlightElements([element]);
      }
      this.autoconsent.updateState({ clicks: this.autoconsent.state.clicks + 1 });
      return this.autoconsent.domActions.clickElement(element);
    }
    async click(selector, all = false) {
      if (this.autoconsent.config.visualTest) {
        await this.highlightElements(this.elementSelector(selector), all);
      }
      this.autoconsent.updateState({ clicks: this.autoconsent.state.clicks + 1 });
      return this.autoconsent.domActions.click(selector, all);
    }
    elementExists(selector) {
      return this.autoconsent.domActions.elementExists(selector);
    }
    elementVisible(selector, check) {
      return this.autoconsent.domActions.elementVisible(selector, check);
    }
    waitForElement(selector, timeout) {
      return this.autoconsent.domActions.waitForElement(selector, timeout);
    }
    waitForVisible(selector, timeout, check) {
      return this.autoconsent.domActions.waitForVisible(selector, timeout, check);
    }
    async waitForThenClick(selector, timeout, all, retries, retryInterval) {
      if (this.autoconsent.config.visualTest) {
        await this.highlightElements(this.elementSelector(selector), all);
      }
      this.autoconsent.updateState({ clicks: this.autoconsent.state.clicks + 1 });
      return this.autoconsent.domActions.waitForThenClick(selector, timeout, all, retries, retryInterval);
    }
    wait(ms) {
      return this.autoconsent.domActions.wait(ms);
    }
    hide(selector, method) {
      return this.autoconsent.domActions.hide(selector, method);
    }
    stylesheet(cssRule, stylesheetId) {
      return this.autoconsent.domActions.stylesheet(cssRule, stylesheetId);
    }
    removeClass(selector, className) {
      return this.autoconsent.domActions.removeClass(selector, className);
    }
    setStyle(selector, css) {
      return this.autoconsent.domActions.setStyle(selector, css);
    }
    addStyle(selector, css) {
      return this.autoconsent.domActions.addStyle(selector, css);
    }
    cookieContains(substring) {
      return this.autoconsent.domActions.cookieContains(substring);
    }
    prehide(selector) {
      return this.autoconsent.domActions.prehide(selector);
    }
    undoPrehide() {
      return this.autoconsent.domActions.undoPrehide();
    }
    querySingleReplySelector(selector, parent) {
      return this.autoconsent.domActions.querySingleReplySelector(selector, parent);
    }
    querySelectorChain(selectors) {
      return this.autoconsent.domActions.querySelectorChain(selectors);
    }
    elementSelector(selector) {
      return this.autoconsent.domActions.elementSelector(selector);
    }
    waitForMutation(selector) {
      return this.autoconsent.domActions.waitForMutation(selector);
    }
  };
  var AutoConsentCMP = class extends AutoConsentCMPBase {
    constructor(rule, autoconsentInstance) {
      super(autoconsentInstance);
      this.rule = rule;
      this.name = rule.name;
      this.runContext = rule.runContext || defaultRunContext;
    }
    get hasSelfTest() {
      return !!this.rule.test && this.rule.test.length > 0;
    }
    get isIntermediate() {
      return !!this.rule.intermediate;
    }
    get isCosmetic() {
      return !!this.rule.cosmetic;
    }
    get prehideSelectors() {
      return this.rule.prehideSelectors || [];
    }
    async detectCmp() {
      if (this.rule.detectCmp) {
        return this._runRulesSequentially(this.rule.detectCmp, this.autoconsent.config.logs.detectionsteps);
      }
      return false;
    }
    async detectPopup() {
      if (this.rule.detectPopup) {
        return this._runRulesSequentially(this.rule.detectPopup, this.autoconsent.config.logs.detectionsteps);
      }
      return false;
    }
    async optOut() {
      const logsConfig = this.autoconsent.config.logs;
      if (this.rule.optOut) {
        logsConfig.lifecycle && console.log("Initiated optOut()", this.rule.optOut);
        return this._runRulesSequentially(this.rule.optOut, this.autoconsent.config.logs.rulesteps);
      }
      return false;
    }
    async optIn() {
      const logsConfig = this.autoconsent.config.logs;
      if (this.rule.optIn) {
        logsConfig.lifecycle && console.log("Initiated optIn()", this.rule.optIn);
        return this._runRulesSequentially(this.rule.optIn, this.autoconsent.config.logs.rulesteps);
      }
      return false;
    }
    async openCmp() {
      if (this.rule.openCmp) {
        return this._runRulesSequentially(this.rule.openCmp, this.autoconsent.config.logs.rulesteps);
      }
      return false;
    }
    async test() {
      if (this.hasSelfTest && this.rule.test) {
        return this._runRulesSequentially(this.rule.test, this.autoconsent.config.logs.rulesteps);
      }
      return super.test();
    }
    async evaluateRuleStep(rule) {
      const results = [];
      const logsConfig = this.autoconsent.config.logs;
      if (rule.exists) {
        results.push(this.elementExists(rule.exists));
      }
      if (rule.visible) {
        results.push(this.elementVisible(rule.visible, rule.check));
      }
      if (rule.eval) {
        const res = this.mainWorldEval(rule.eval);
        results.push(res);
      }
      if (rule.waitFor) {
        results.push(this.waitForElement(rule.waitFor, rule.timeout));
      }
      if (rule.waitForVisible) {
        results.push(this.waitForVisible(rule.waitForVisible, rule.timeout, rule.check));
      }
      if (rule.click) {
        results.push(this.click(rule.click, rule.all));
      }
      if (rule.waitForThenClick) {
        results.push(this.waitForThenClick(rule.waitForThenClick, rule.timeout, rule.all, rule.retry, rule.retryInterval));
      }
      if (rule.wait) {
        results.push(this.wait(rule.wait));
      }
      if (rule.hide) {
        results.push(this.hide(rule.hide, rule.method));
      }
      if (rule.stylesheet !== void 0) {
        results.push(this.stylesheet(rule.stylesheet, rule.stylesheetId));
      }
      if (rule.removeClass !== void 0) {
        results.push(rule.selector ? this.removeClass(rule.selector, rule.removeClass) : false);
      }
      if (rule.setStyle !== void 0) {
        results.push(rule.selector ? this.setStyle(rule.selector, rule.setStyle) : false);
      }
      if (rule.addStyle !== void 0) {
        results.push(rule.selector ? this.addStyle(rule.selector, rule.addStyle) : false);
      }
      if (rule.cookieContains) {
        results.push(this.cookieContains(rule.cookieContains));
      }
      if (rule.if) {
        if (!rule.if.exists && !rule.if.visible) {
          console.error("invalid conditional rule", rule.if);
          return false;
        }
        if (!rule.then) {
          console.error('invalid conditional rule, missing "then" step', rule.if);
          return false;
        }
        const condition = await this.evaluateRuleStep(rule.if);
        logsConfig.rulesteps && console.log("Condition is", condition);
        if (condition) {
          results.push(this._runRulesSequentially(rule.then, logsConfig.rulesteps));
        } else if (rule.else) {
          results.push(this._runRulesSequentially(rule.else, logsConfig.rulesteps));
        } else {
          results.push(true);
        }
      }
      if (rule.any) {
        let resultOfAny = false;
        for (const step of rule.any) {
          if (await this.evaluateRuleStep(step)) {
            resultOfAny = true;
            break;
          }
        }
        results.push(resultOfAny);
      }
      if (results.length === 0) {
        logsConfig.errors && console.warn("Unrecognized rule", rule);
        return false;
      }
      const all = await Promise.all(results);
      const result = all.reduce((a, b) => a && b, true);
      if (rule.negated) {
        return !result;
      }
      return result;
    }
    async _runRulesParallel(rules) {
      const results = rules.map((rule) => this.evaluateRuleStep(rule));
      const detections = await Promise.all(results);
      return detections.every((r) => !!r);
    }
    async _runRulesSequentially(rules, logSteps = true) {
      for (const rule of rules) {
        logSteps && console.log("Running rule...", rule);
        const result = await this.evaluateRuleStep(rule);
        logSteps && console.log("...rule result", result);
        if (!result && !rule.optional) {
          return false;
        }
      }
      return true;
    }
  };
  var AutoConsentHeuristicCMP = class extends AutoConsentCMPBase {
    constructor(autoconsentInstance, mode = "reject") {
      super(autoconsentInstance);
      this.popups = [];
      this.name = "HEURISTIC";
      this.runContext = {
        main: true,
        frame: false
        // do not run in iframes for security reasons
      };
      this.mode = mode;
    }
    get hasSelfTest() {
      return true;
    }
    get isIntermediate() {
      return false;
    }
    get isCosmetic() {
      return false;
    }
    async detectCmp() {
      await new Promise((resolve) => setTimeout(resolve, 0));
      this.autoconsent.config.performanceLoggingEnabled && performance.mark("heuristicDetectorStart");
      this.popups = getActionablePopups(
        this.mode,
        this.autoconsent.config.heuristicPopupSearchTimeout,
        this.autoconsent.config.enableHeuristicHitTest
      );
      this.autoconsent.config.performanceLoggingEnabled && performance.mark("heuristicDetectorEnd");
      this.autoconsent.config.performanceLoggingEnabled && performance.measure("heuristicDetector", "heuristicDetectorStart", "heuristicDetectorEnd");
      if (this.popups.length > 0) {
        this.name = `HEURISTIC-${this.popups[0].regexClassification?.toUpperCase()}`;
        return Promise.resolve(true);
      }
      return Promise.resolve(false);
    }
    async detectPopup() {
      if (this.popups.length > 0) {
        if (this.popups.length > 1) {
          this.autoconsent.config.logs.errors && console.warn("Heuristic found multiple popups");
        }
        return true;
      }
      return false;
    }
    getTargetButton() {
      const popup = this.popups[0];
      const level = popup.regexClassification;
      const buttons = popup.buttons;
      const targetButtonType = level === "reject" ? "reject" : level === "tier1" ? "acknowledge" : "accept";
      return buttons.find((button) => button.regexClassification === targetButtonType);
    }
    optOut() {
      const button = this.getTargetButton();
      if (button) {
        return this.clickElement(button.element);
      }
      return Promise.resolve(false);
    }
    optIn() {
      throw new Error("Not Implemented");
    }
    openCmp() {
      throw new Error("Not Implemented");
    }
    async test() {
      const button = this.getTargetButton();
      if (button) {
        await this.wait(500);
        return !isElementVisible(button.element);
      }
      return false;
    }
  };
  var cookieSettingsButton = "#truste-show-consent";
  var shortcutOptOut = "#truste-consent-required";
  var shortcutOptIn = "#truste-consent-button";
  var popupContent = "#truste-consent-content";
  var bannerOverlay = "#trustarc-banner-overlay";
  var bannerContainer = "#truste-consent-track";
  var prefCenterDeclineAll = [".truste_popframe.trustarc_newcm_container", 'button[data-button-key="decline_all"]'];
  var TrustArcTop = class extends AutoConsentCMPBase {
    constructor(autoconsentInstance) {
      super(autoconsentInstance);
      this.name = "TrustArc-top";
      this.prehideSelectors = [".trustarc-banner-container", `.truste_popframe,.truste_overlay,.truste_box_overlay,${bannerContainer}`];
      this.runContext = {
        main: true,
        frame: false
      };
      this._shortcutButton = null;
      this._optInDone = false;
      this._optOutDone = false;
    }
    get hasSelfTest() {
      return true;
    }
    get isIntermediate() {
      if (this._optInDone || this._optOutDone) {
        return false;
      }
      return !this._shortcutButton;
    }
    get isCosmetic() {
      return false;
    }
    async detectCmp() {
      const result = this.elementExists(`${cookieSettingsButton},${bannerContainer}`);
      if (result) {
        this._shortcutButton = document.querySelector(shortcutOptOut);
      }
      return result;
    }
    async detectPopup() {
      return this.elementVisible(`${popupContent},${bannerOverlay},${bannerContainer}`, "any");
    }
    async optOut() {
      if (this.elementExists(shortcutOptOut)) {
        this.click(shortcutOptOut);
        return true;
      }
      hideElements(getStyleElement(), `.truste_popframe, .truste_overlay, .truste_box_overlay, ${bannerContainer}`);
      await this.click(cookieSettingsButton);
      if (await this.waitForElement(prefCenterDeclineAll, 3e3)) {
        this._optOutDone = true;
        await this.click(prefCenterDeclineAll);
      }
      setTimeout(() => {
        getStyleElement().remove();
      }, 1e4);
      return true;
    }
    async optIn() {
      this._optInDone = true;
      return await this.click(shortcutOptIn);
    }
    async openCmp() {
      return true;
    }
    async test() {
      await this.wait(500);
      return await this.mainWorldEval("EVAL_TRUSTARC_TOP");
    }
  };
  var Cookiebot = class extends AutoConsentCMPBase {
    constructor() {
      super(...arguments);
      this.name = "Cybotcookiebot";
      this.prehideSelectors = [
        "#CybotCookiebotDialog,#CybotCookiebotDialogBodyUnderlay,#dtcookie-container,#cookiebanner,#cb-cookieoverlay,.modal--cookie-banner,#cookiebanner_outer,#CookieBanner"
      ];
    }
    get hasSelfTest() {
      return true;
    }
    get isIntermediate() {
      return false;
    }
    get isCosmetic() {
      return false;
    }
    async detectCmp() {
      return await this.mainWorldEval("EVAL_COOKIEBOT_1");
    }
    async detectPopup() {
      return this.mainWorldEval("EVAL_COOKIEBOT_2");
    }
    async optOut() {
      if (this.elementVisible("#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll")) {
        return await this.click("#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll");
      }
      await this.wait(500);
      let res = await this.mainWorldEval("EVAL_COOKIEBOT_3");
      await this.wait(1e3);
      res = res && await this.mainWorldEval("EVAL_COOKIEBOT_4");
      if (this.elementVisible("#CybotCookiebotDialogBodyButtonDecline")) {
        return await this.click("#CybotCookiebotDialogBodyButtonDecline");
      }
      return res;
    }
    async optIn() {
      if (this.elementExists("#dtcookie-container")) {
        return await this.click(".h-dtcookie-accept");
      }
      await this.click(".CybotCookiebotDialogBodyLevelButton:not(:checked):enabled", true);
      await this.click("#CybotCookiebotDialogBodyLevelButtonAccept");
      await this.click("#CybotCookiebotDialogBodyButtonAccept");
      return true;
    }
    async test() {
      await this.wait(500);
      return await this.mainWorldEval("EVAL_COOKIEBOT_5");
    }
  };
  var SourcePoint = class extends AutoConsentCMPBase {
    constructor() {
      super(...arguments);
      this.name = "Sourcepoint-frame";
      this.prehideSelectors = ["div[id^='sp_message_container_'],.message-overlay", "#sp_privacy_manager_container"];
      this.ccpaNotice = false;
      this.ccpaPopup = false;
      this.runContext = {
        main: true,
        frame: true
      };
    }
    get hasSelfTest() {
      return false;
    }
    get isIntermediate() {
      return false;
    }
    get isCosmetic() {
      return false;
    }
    async detectCmp() {
      const url = new URL(location.href);
      if (url.searchParams.has("message_id") && url.hostname === "ccpa-notice.sp-prod.net") {
        this.ccpaNotice = true;
        return true;
      }
      if (url.hostname === "ccpa-pm.sp-prod.net") {
        this.ccpaPopup = true;
        return true;
      }
      return (url.pathname === "/index.html" || url.pathname === "/privacy-manager/index.html" || url.pathname === "/ccpa_pm/index.html" || url.pathname === "/us_pm/index.html") && (url.searchParams.has("message_id") || url.searchParams.has("requestUUID") || url.searchParams.has("consentUUID"));
    }
    async detectPopup() {
      if (this.ccpaNotice) {
        return true;
      }
      if (this.ccpaPopup) {
        return await this.waitForElement(".priv-save-btn", 2e3);
      }
      await this.waitForElement(
        ".sp_choice_type_11,.sp_choice_type_12,.sp_choice_type_13,.sp_choice_type_ACCEPT_ALL,.sp_choice_type_SAVE_AND_EXIT",
        2e3
      );
      return !this.elementExists(".sp_choice_type_9");
    }
    async optIn() {
      await this.waitForElement(".sp_choice_type_11,.sp_choice_type_ACCEPT_ALL", 2e3);
      if (await this.click(".sp_choice_type_11")) {
        return true;
      }
      if (await this.click(".sp_choice_type_ACCEPT_ALL")) {
        return true;
      }
      return false;
    }
    isManagerOpen() {
      if (location.pathname === "/privacy-manager/index.html" || location.pathname === "/ccpa_pm/index.html") {
        return true;
      }
      if (location.pathname === "/us_pm/index.html" && !document.querySelector(".sp_choice_type_11,.sp_choice_type_ACCEPT_ALL")) {
        return true;
      }
      return false;
    }
    async optOut() {
      await this.wait(500);
      const logsConfig = this.autoconsent.config.logs;
      if (this.ccpaPopup) {
        const toggles = document.querySelectorAll(
          ".priv-purpose-container .sp-switch-arrow-block a.neutral.on .right"
        );
        for (const t of toggles) {
          t.click();
        }
        const switches = document.querySelectorAll(
          ".priv-purpose-container .sp-switch-arrow-block a.switch-bg.on"
        );
        for (const t of switches) {
          t.click();
        }
        return await this.click(".priv-save-btn");
      }
      if (this.elementVisible(".sp_choice_type_SE", "any")) {
        await this.click(
          [
            "xpath///div[contains(., 'Do not share my personal information') and contains(@class, 'switch-container')]",
            ".pm-switch[aria-checked=false] .slider"
          ],
          false
        );
        return await this.click(".sp_choice_type_SE");
      }
      if (!this.isManagerOpen()) {
        const manageSelector = '.sp_choice_type_12,[data-choice]:not([class*="sp_choice_type_"])';
        const actionable = await this.waitForVisible(`${manageSelector},.sp_choice_type_13`);
        if (!actionable) {
          return false;
        }
        if (this.elementVisible(".sp_choice_type_13", "any")) {
          return await this.click(".sp_choice_type_13");
        }
        await this.click(manageSelector);
        await waitFor(() => this.isManagerOpen(), 200, 100);
      }
      await this.waitForElement(".type-modal", 2e4);
      if (this.elementExists("[role=tablist]")) {
        await this.waitForElement("[role=tablist] [role=tab]", 1e4);
      }
      this.waitForThenClick(".ccpa-stack .pm-switch[aria-checked=true] .slider", 500, true);
      try {
        const rejectSelector1 = ".sp_choice_type_REJECT_ALL";
        const rejectSelector2 = ".reject-toggle";
        const path = await Promise.race([
          this.waitForElement(rejectSelector1, 2e3).then((success) => success ? 0 : -1),
          this.waitForElement(rejectSelector2, 2e3).then((success) => success ? 1 : -1),
          this.waitForElement(".pm-features", 2e3).then((success) => success ? 2 : -1)
        ]);
        if (path === 0) {
          await this.waitForVisible(rejectSelector1);
          return await this.click(rejectSelector1);
        } else if (path === 1) {
          await this.click(rejectSelector2);
        } else if (path === 2) {
          await this.waitForElement(".pm-features", 1e4);
          await this.click(".checked > span", true);
          await this.click(".chevron");
        }
      } catch (e) {
        logsConfig.errors && console.warn(e);
      }
      return await this.click(".sp_choice_type_SAVE_AND_EXIT");
    }
  };
  var ConsentManager = class extends AutoConsentCMPBase {
    constructor() {
      super(...arguments);
      this.name = "consentmanager.net";
      this.prehideSelectors = ["#cmpbox,#cmpbox2"];
      this.apiAvailable = false;
    }
    get hasSelfTest() {
      return this.apiAvailable;
    }
    get isIntermediate() {
      return false;
    }
    get isCosmetic() {
      return false;
    }
    async detectCmp() {
      this.apiAvailable = await this.mainWorldEval("EVAL_CONSENTMANAGER_1");
      if (!this.apiAvailable) {
        return this.elementExists("#cmpbox");
      } else {
        return true;
      }
    }
    async detectPopup() {
      if (this.elementVisible("#cmpbox .cmpmore", "any")) {
        return true;
      } else if (this.apiAvailable) {
        await this.wait(500);
        return await this.mainWorldEval("EVAL_CONSENTMANAGER_2");
      }
      return false;
    }
    async optOut() {
      await this.wait(500);
      if (this.apiAvailable) {
        return await this.mainWorldEval("EVAL_CONSENTMANAGER_3");
      }
      if (await this.click(".cmpboxbtnno")) {
        return true;
      }
      if (this.elementExists(".cmpwelcomeprpsbtn")) {
        await this.click(".cmpwelcomeprpsbtn > a[aria-checked=true]", true);
        await this.click(".cmpboxbtnsave");
        return true;
      }
      await this.click(".cmpboxbtncustom");
      await this.waitForElement(".cmptblbox", 2e3);
      await this.click(".cmptdchoice > a[aria-checked=true]", true);
      await this.click(".cmpboxbtnyescustomchoices");
      this.hide("#cmpwrapper,#cmpbox", "display");
      return true;
    }
    async optIn() {
      if (this.apiAvailable) {
        return await this.mainWorldEval("EVAL_CONSENTMANAGER_4");
      }
      return await this.click(".cmpboxbtnyes");
    }
    async test() {
      if (this.apiAvailable) {
        return await this.mainWorldEval("EVAL_CONSENTMANAGER_5");
      }
      return false;
    }
  };
  var Evidon = class extends AutoConsentCMPBase {
    constructor() {
      super(...arguments);
      this.name = "Evidon";
    }
    get hasSelfTest() {
      return false;
    }
    get isIntermediate() {
      return false;
    }
    get isCosmetic() {
      return false;
    }
    async detectCmp() {
      return this.elementExists("#_evidon_banner");
    }
    async detectPopup() {
      return this.elementVisible("#_evidon_banner", "any");
    }
    async optOut() {
      if (await this.click("#_evidon-decline-button")) {
        return true;
      }
      hideElements(getStyleElement(), "#evidon-prefdiag-overlay,#evidon-prefdiag-background,#_evidon-background");
      await this.waitForThenClick("#_evidon-option-button");
      await this.waitForElement("#evidon-prefdiag-overlay", 5e3);
      await this.wait(500);
      await this.waitForThenClick("#evidon-prefdiag-decline");
      return true;
    }
    async optIn() {
      return await this.click("#_evidon-accept-button");
    }
  };
  var Onetrust = class extends AutoConsentCMPBase {
    constructor() {
      super(...arguments);
      this.name = "Onetrust";
      this.prehideSelectors = ["#onetrust-banner-sdk,#onetrust-consent-sdk,.onetrust-pc-dark-filter,.js-consent-banner"];
    }
    get hasSelfTest() {
      return true;
    }
    get isIntermediate() {
      return false;
    }
    get isCosmetic() {
      return false;
    }
    // Some sites pre-render the banner before the SDK loads, and clicks before then may be lost.
    // Sites that copy the markup without the SDK never get #onetrust-style, so only wait when the page loads the SDK.
    async waitForSdk() {
      if (this.elementExists("#onetrust-style")) {
        return;
      }
      const sdkRef = /cookielaw\.org|otSDKStub|otBannerSdk/;
      const sdkExpected = Array.from(document.scripts).some((s) => sdkRef.test(s.src) || !s.src && sdkRef.test(s.textContent || ""));
      if (sdkExpected) {
        await this.waitForElement("#onetrust-style", 1e4);
      }
    }
    async detectCmp() {
      return this.elementExists("#onetrust-banner-sdk") || this.elementVisible("#onetrust-pc-sdk", "any");
    }
    async detectPopup() {
      return this.elementVisible("#onetrust-banner-sdk,#onetrust-pc-sdk", "any");
    }
    async optOut() {
      await this.wait(500);
      await this.waitForSdk();
      if (this.elementVisible("#onetrust-reject-all-handler", "any")) {
        return await this.click("#onetrust-reject-all-handler");
      }
      if (this.elementVisible(".ot-pc-refuse-all-handler", "any")) {
        return await this.click(".ot-pc-refuse-all-handler");
      }
      if (this.elementVisible(".js-reject-cookies", "any")) {
        return await this.click(".js-reject-cookies");
      }
      if (this.elementVisible(".onetrust-close-btn-handler", "any")) {
        const closeBtn = document.querySelector(".onetrust-close-btn-handler");
        const btnText = closeBtn?.textContent?.toLowerCase() || "";
        const rejectPatterns = ["without", "ohne", "sans", "sin ", "zonder", "senza", "refuse", "decline", "reject", "ablehnen"];
        if (rejectPatterns.some((pattern) => btnText.includes(pattern))) {
          return await this.click(".onetrust-close-btn-handler");
        }
        const banner = document.getElementById("onetrust-banner-sdk");
        const isCloseOnlyNotice = banner?.classList.contains("ot-close-btn-link") && !this.elementExists(
          "#onetrust-accept-btn-handler,#onetrust-reject-all-handler,#onetrust-pc-btn-handler,.ot-sdk-show-settings,button.js-cookie-settings"
        );
        if (isCloseOnlyNotice) {
          return await this.click(".onetrust-close-btn-handler");
        }
      }
      if (this.elementExists("#onetrust-pc-btn-handler")) {
        await this.click("#onetrust-pc-btn-handler");
      } else {
        await this.click(".ot-sdk-show-settings,button.js-cookie-settings");
      }
      await this.waitForElement("#onetrust-consent-sdk", 2e3);
      await this.wait(1e3);
      await this.click("#onetrust-consent-sdk input.category-switch-handler:checked,.js-editor-toggle-state:checked", true);
      await this.wait(1e3);
      await this.waitForElement(".save-preference-btn-handler,.js-consent-save", 2e3);
      await this.click(".save-preference-btn-handler,.js-consent-save");
      await this.waitForVisible("#onetrust-banner-sdk", 5e3, "none");
      return true;
    }
    async optIn() {
      await this.waitForSdk();
      return await this.click("#onetrust-accept-btn-handler,#accept-recommended-btn-handler,.js-accept-cookies");
    }
    async test() {
      return await waitFor(() => this.mainWorldEval("EVAL_ONETRUST_1"), 10, 500);
    }
  };
  var Klaro = class extends AutoConsentCMPBase {
    constructor() {
      super(...arguments);
      this.name = "Klaro";
      this.prehideSelectors = [".klaro"];
      this.settingsOpen = false;
    }
    get hasSelfTest() {
      return true;
    }
    get isIntermediate() {
      return false;
    }
    get isCosmetic() {
      return false;
    }
    async detectCmp() {
      if (this.elementExists(".klaro > .cookie-modal")) {
        this.settingsOpen = true;
        return true;
      }
      return this.elementExists(".klaro > .cookie-notice");
    }
    async detectPopup() {
      return this.elementVisible(".klaro > .cookie-notice,.klaro > .cookie-modal", "any");
    }
    async optOut() {
      const apiOptOutSuccess = await this.mainWorldEval("EVAL_KLARO_TRY_API_OPT_OUT");
      if (apiOptOutSuccess) {
        return true;
      }
      if (await this.click(".klaro .cn-decline")) {
        return true;
      }
      await this.mainWorldEval("EVAL_KLARO_OPEN_POPUP");
      if (await this.click(".klaro .cn-decline")) {
        return true;
      }
      await this.click(
        ".cm-purpose:not(.cm-toggle-all) > input:not(.half-checked,.required,.only-required),.cm-purpose:not(.cm-toggle-all) > div > input:not(.half-checked,.required,.only-required)",
        true
      );
      return await this.click(".cm-btn-accept,.cm-button");
    }
    async optIn() {
      if (await this.click(".klaro .cm-btn-accept-all")) {
        return true;
      }
      if (this.settingsOpen) {
        await this.click(".cm-purpose:not(.cm-toggle-all) > input.half-checked", true);
        return await this.click(".cm-btn-accept");
      }
      return await this.click(".klaro .cookie-notice .cm-btn-success");
    }
    async test() {
      return await this.mainWorldEval("EVAL_KLARO_1");
    }
  };
  var Uniconsent = class extends AutoConsentCMPBase {
    constructor() {
      super(...arguments);
      this.name = "Uniconsent";
    }
    get prehideSelectors() {
      return [".unic", ".modal:has(.unic)"];
    }
    get hasSelfTest() {
      return true;
    }
    get isIntermediate() {
      return false;
    }
    get isCosmetic() {
      return false;
    }
    async detectCmp() {
      return this.elementExists(".unic .unic-box,.unic .unic-bar,.unic .unic-modal");
    }
    async detectPopup() {
      return this.elementVisible(".unic .unic-box,.unic .unic-bar,.unic .unic-modal", "any");
    }
    async optOut() {
      await this.waitForElement(".unic button", 1e3);
      document.querySelectorAll(".unic button").forEach((button) => {
        const text = button.textContent || "";
        if (text.includes("Manage Options") || text.includes("Optionen verwalten")) {
          button.click();
        }
      });
      if (await this.waitForElement(".unic input[type=checkbox]", 1e3)) {
        await this.waitForElement(".unic button", 1e3);
        document.querySelectorAll(".unic input[type=checkbox]").forEach((c) => {
          if (c.checked) {
            c.click();
          }
        });
        for (const b of document.querySelectorAll(".unic button")) {
          const text = b.textContent || "";
          for (const pattern of ["Confirm Choices", "Save Choices", "Auswahl speichern"]) {
            if (text.includes(pattern)) {
              b.click();
              await this.wait(500);
              return true;
            }
          }
        }
      }
      return false;
    }
    async optIn() {
      return this.waitForThenClick(".unic #unic-agree");
    }
    async test() {
      await this.wait(1e3);
      const res = this.elementExists(".unic .unic-box,.unic .unic-bar");
      return !res;
    }
  };
  var Conversant = class extends AutoConsentCMPBase {
    constructor() {
      super(...arguments);
      this.prehideSelectors = [".cmp-root"];
      this.name = "Conversant";
    }
    get hasSelfTest() {
      return true;
    }
    get isIntermediate() {
      return false;
    }
    get isCosmetic() {
      return false;
    }
    async detectCmp() {
      return this.elementExists(".cmp-root .cmp-receptacle");
    }
    async detectPopup() {
      return this.elementVisible(".cmp-root .cmp-receptacle", "any");
    }
    async optOut() {
      if (!await this.waitForThenClick(".cmp-main-button:not(.cmp-main-button--primary)")) {
        return false;
      }
      if (!await this.waitForElement(".cmp-view-tab-tabs")) {
        return false;
      }
      await this.waitForThenClick(".cmp-view-tab-tabs > :first-child");
      await this.waitForThenClick(".cmp-view-tab-tabs > .cmp-view-tab--active:first-child");
      for (const item of Array.from(document.querySelectorAll(".cmp-accordion-item"))) {
        item.querySelector(".cmp-accordion-item-title").click();
        await waitFor(() => !!item.querySelector(".cmp-accordion-item-content.cmp-active"), 10, 50);
        const content = item.querySelector(".cmp-accordion-item-content.cmp-active");
        if (!content) {
          return false;
        }
        content.querySelectorAll(".cmp-toggle-actions .cmp-toggle-deny:not(.cmp-toggle-deny--active)").forEach((e) => e.click());
        content.querySelectorAll(".cmp-toggle-actions .cmp-toggle-checkbox:not(.cmp-toggle-checkbox--active)").forEach((e) => e.click());
      }
      await this.click(".cmp-main-button:not(.cmp-main-button--primary)");
      return true;
    }
    async optIn() {
      return this.waitForThenClick(".cmp-main-button.cmp-main-button--primary");
    }
    async test() {
      return document.cookie.includes("cmp-data=0");
    }
  };
  var Tiktok = class extends AutoConsentCMPBase {
    constructor() {
      super(...arguments);
      this.name = "tiktok.com";
      this.runContext = {
        urlPattern: "tiktok"
      };
    }
    get hasSelfTest() {
      return true;
    }
    get isIntermediate() {
      return false;
    }
    get isCosmetic() {
      return false;
    }
    getShadowRoot() {
      const container = document.querySelector("tiktok-cookie-banner");
      if (!container) {
        return null;
      }
      return container.shadowRoot;
    }
    async detectCmp() {
      return this.elementExists("tiktok-cookie-banner");
    }
    async detectPopup() {
      const banner = this.getShadowRoot()?.querySelector(".tiktok-cookie-banner");
      return isElementVisible(banner);
    }
    async optOut() {
      const logsConfig = this.autoconsent.config.logs;
      const declineButton = this.getShadowRoot()?.querySelector(".button-wrapper button:first-child");
      if (declineButton) {
        logsConfig.rulesteps && console.log("[clicking]", declineButton);
        declineButton.click();
        return true;
      } else {
        logsConfig.errors && console.log("no decline button found");
        return false;
      }
    }
    async optIn() {
      const logsConfig = this.autoconsent.config.logs;
      const acceptButton = this.getShadowRoot()?.querySelector(".button-wrapper button:last-child");
      if (acceptButton) {
        logsConfig.rulesteps && console.log("[clicking]", acceptButton);
        acceptButton.click();
        return true;
      } else {
        logsConfig.errors && console.log("no accept button found");
        return false;
      }
    }
    async test() {
      const match = document.cookie.match(/cookie-consent=([^;]+)/);
      if (!match) {
        return false;
      }
      const value = JSON.parse(decodeURIComponent(match[1]));
      return Object.values(value).every((x) => typeof x !== "boolean" || x === false);
    }
  };
  var Admiral = class extends AutoConsentCMPBase {
    constructor() {
      super(...arguments);
      this.name = "Admiral";
      this.consentCardSelector = "div > div[class*=Card] > div[class*=Frame] > div[class*=Pills] > button[class*=Pills__StyledPill]";
    }
    getVrmNotice() {
      return Array.from(document.querySelectorAll("body > div")).find((element) => {
        const text = element.innerText || "";
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return style.position === "fixed" && rect.width > 0 && rect.height > 0 && text.includes("Your Privacy") && text.includes("VRM") && text.includes("Admiral");
      });
    }
    isVisibleElement(element) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    }
    getVrmCloseButton() {
      const notice = this.getVrmNotice();
      const closeButton = notice?.querySelector('button[aria-label="Close"]');
      return closeButton && this.isVisibleElement(closeButton) ? closeButton : null;
    }
    get hasSelfTest() {
      return false;
    }
    get isIntermediate() {
      return false;
    }
    get isCosmetic() {
      return false;
    }
    async detectCmp() {
      return await this.elementExists(this.consentCardSelector) || Boolean(this.getVrmNotice());
    }
    async detectPopup() {
      return await this.elementVisible(this.consentCardSelector, "any") || Boolean(this.getVrmNotice());
    }
    async optOut() {
      const rejectAllSelector = "xpath///button[contains(., 'Afvis alle') or contains(., 'Reject all') or contains(., 'Odbaci sve') or contains(., 'Rechazar todo') or contains(., 'Atmesti visus') or contains(., 'Odm\xEDtnout v\u0161e') or contains(., '\u0391\u03C0\u03CC\u03C1\u03C1\u03B9\u03C8\u03B7 \u03CC\u03BB\u03C9\u03BD') or contains(., 'Rejeitar tudo') or contains(., 'T\xFCm\xFCn\xFC reddet') or contains(., '\u041E\u0442\u043A\u043B\u043E\u043D\u0438\u0442\u044C \u0432\u0441\u0435') or contains(., 'Noraid\u012Bt visu') or contains(., 'Avvisa alla') or contains(., 'Odrzu\u0107 wszystkie') or contains(., 'Alles afwijzen') or contains(., '\u041E\u0442\u0445\u0432\u044A\u0440\u043B\u044F\u043D\u0435 \u043D\u0430 \u0432\u0441\u0438\u0447\u043A\u0438') or contains(., 'Rifiuta tutto') or contains(., 'Zavrni vse') or contains(., 'Az \xF6sszes elutas\xEDt\xE1sa') or contains(., 'Respinge\u021Bi tot') or contains(., 'Alles ablehnen') or contains(., 'Tout rejeter') or contains(., 'Odmietnu\u0165 v\u0161etko') or contains(., 'L\xFCkka k\xF5ik tagasi') or contains(., 'Hylk\xE4\xE4 kaikki')]";
      if (await this.waitForElement(rejectAllSelector, 500)) {
        const rejectButton = this.elementSelector(rejectAllSelector)[0];
        if (rejectButton.disabled) {
          const cardBody = rejectButton.closest("div[class*=CardHeader]")?.parentElement?.querySelector("div[class*=CardBody]");
          if (cardBody) {
            cardBody.scrollTop = cardBody.scrollHeight;
          }
          await waitFor(() => !rejectButton.disabled, 10, 200);
        }
        return await this.click(rejectAllSelector);
      }
      const vrmCloseButton = this.getVrmCloseButton();
      if (vrmCloseButton) {
        return await this.clickElement(vrmCloseButton);
      }
      const purposesButtonSelector = "xpath///button[contains(., 'Zwecke') or contains(., '\u03A3\u03BA\u03BF\u03C0\u03BF\u03AF') or contains(., 'Purposes') or contains(., '\u0426\u0435\u043B\u0438') or contains(., 'Eesm\xE4rgid') or contains(., 'Tikslai') or contains(., 'Svrhe') or contains(., 'Cele') or contains(., '\xDA\u010Dely') or contains(., 'Finalidades') or contains(., 'M\u0113r\u0137i') or contains(., 'Scopuri') or contains(., 'Fines') or contains(., '\xC4ndam\xE5l') or contains(., 'Finalit\xE9s') or contains(., 'Doeleinden') or contains(., 'Tarkoitukset') or contains(., 'Scopi') or contains(., 'Ama\xE7lar') or contains(., 'Nameni') or contains(., 'C\xE9lok') or contains(., 'Form\xE5l')]";
      const saveAndExitSelector = "xpath///button[contains(., 'Spara & avsluta') or contains(., 'Save & exit') or contains(., 'Ulo\u017Eit a ukon\u010Dit') or contains(., 'Enregistrer et quitter') or contains(., 'Speichern & Verlassen') or contains(., 'Tallenna ja poistu') or contains(., 'I\u0161saugoti ir i\u0161eiti') or contains(., 'Opslaan & afsluiten') or contains(., 'Guardar y salir') or contains(., 'Shrani in zapri') or contains(., 'Ulo\u017Ei\u0165 a ukon\u010Di\u0165') or contains(., 'Kaydet ve \xE7\u0131k\u0131\u015F yap') or contains(., '\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0438 \u0432\u044B\u0439\u0442\u0438') or contains(., 'Salvesta ja v\xE4lju') or contains(., 'Salva ed esci') or contains(., 'Gem & afslut') or contains(., '\u0391\u03C0\u03BF\u03B8\u03AE\u03BA\u03B5\u03C5\u03C3\u03B7 \u03BA\u03B1\u03B9 \u03AD\u03BE\u03BF\u03B4\u03BF\u03C2') or contains(., 'Saglab\u0101t un iziet') or contains(., 'Ment\xE9s \xE9s kil\xE9p\xE9s') or contains(., 'Guardar e sair') or contains(., 'Zapisz & zako\u0144cz') or contains(., 'Salvare \u0219i ie\u0219ire') or contains(., 'Spremi i iza\u0111i') or contains(., '\u0417\u0430\u043F\u0430\u0437\u0432\u0430\u043D\u0435 \u0438 \u0438\u0437\u0445\u043E\u0434')]";
      if (await this.waitForThenClick(purposesButtonSelector) && await this.waitForVisible(saveAndExitSelector)) {
        const popupBody = this.elementSelector(saveAndExitSelector)[0].parentElement?.parentElement;
        const checkboxes = popupBody?.querySelectorAll("input[type=checkbox]:checked");
        checkboxes?.forEach((checkbox) => checkbox.click());
        return await this.click(saveAndExitSelector);
      }
      return false;
    }
    async optIn() {
      return await this.click(
        "xpath///button[contains(., 'Sprejmi vse') or contains(., 'Prihvati sve') or contains(., 'Godk\xE4nn alla') or contains(., 'Prija\u0165 v\u0161etko') or contains(., '\u041F\u0440\u0438\u043D\u044F\u0442\u044C \u0432\u0441\u0435') or contains(., 'Aceptar todo') or contains(., '\u0391\u03C0\u03BF\u03B4\u03BF\u03C7\u03AE \u03CC\u03BB\u03C9\u03BD') or contains(., 'Zaakceptuj wszystkie') or contains(., 'Accetta tutto') or contains(., 'Priimti visus') or contains(., 'Pie\u0146emt visu') or contains(., 'T\xFCm\xFCn\xFC kabul et') or contains(., 'Az \xF6sszes elfogad\xE1sa') or contains(., 'Accept all') or contains(., '\u041F\u0440\u0438\u0435\u043C\u0430\u043D\u0435 \u043D\u0430 \u0432\u0441\u0438\u0447\u043A\u0438') or contains(., 'Accepter alle') or contains(., 'Hyv\xE4ksy kaikki') or contains(., 'Tout accepter') or contains(., 'Alles accepteren') or contains(., 'Aktsepteeri k\xF5ik') or contains(., 'P\u0159ijmout v\u0161e') or contains(., 'Alles akzeptieren') or contains(., 'Aceitar tudo') or contains(., 'Accepta\u021Bi tot')]"
      );
    }
  };
  var dynamicCMPs = [
    TrustArcTop,
    Cookiebot,
    SourcePoint,
    ConsentManager,
    Evidon,
    Onetrust,
    Klaro,
    Uniconsent,
    Conversant,
    Tiktok,
    Admiral
  ];
  var DEFAULT_CLICK_RETRY_INTERVAL = 300;
  var CLICK_RETRY_POLL_INTERVAL = 50;
  var DomActions = class {
    constructor(autoconsentInstance) {
      this.autoconsentInstance = autoconsentInstance;
    }
    async clickElement(element) {
      if (!element || !(element instanceof HTMLElement)) {
        return false;
      }
      this.autoconsentInstance.config.logs.rulesteps && console.log("[clickElement]", element);
      element.click();
      return true;
    }
    async click(selector, all = false) {
      const elements = this.elementSelector(selector);
      this.autoconsentInstance.config.logs.rulesteps && console.log("[click]", selector, all, elements);
      if (elements.length > 0) {
        if (all) {
          for (const e of elements) {
            e.click();
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        } else {
          elements[0].click();
        }
      }
      return elements.length > 0;
    }
    elementExists(selector) {
      const exists = this.elementSelector(selector).length > 0;
      return exists;
    }
    elementVisible(selector, check = "all") {
      const elem = this.elementSelector(selector);
      const results = new Array(elem.length);
      elem.forEach((e, i) => {
        results[i] = isElementVisible(e);
      });
      if (check === "none") {
        return results.every((r) => !r);
      } else if (results.length === 0) {
        return false;
      } else if (check === "any") {
        return results.some((r) => r);
      }
      return results.every((r) => r);
    }
    waitForElement(selector, timeout = 1e4) {
      const interval = 200;
      const times = Math.ceil(timeout / interval);
      this.autoconsentInstance.config.logs.rulesteps && console.log("[waitForElement]", selector);
      return waitFor(() => this.elementSelector(selector).length > 0, times, interval);
    }
    waitForVisible(selector, timeout = 1e4, check = "any") {
      const interval = 200;
      const times = Math.ceil(timeout / interval);
      this.autoconsentInstance.config.logs.rulesteps && console.log("[waitForVisible]", selector);
      return waitFor(() => this.elementVisible(selector, check), times, interval);
    }
    async waitForThenClick(selector, timeout = 1e4, all = false, retries = 0, retryInterval = DEFAULT_CLICK_RETRY_INTERVAL) {
      await this.waitForElement(selector, timeout);
      let clicked = await this.click(selector, all);
      for (let attempt = 0; clicked && attempt < retries; attempt++) {
        const pollTimes = Math.ceil(retryInterval / CLICK_RETRY_POLL_INTERVAL);
        const isGone = await waitFor(() => !this.elementVisible(selector, "any"), pollTimes, CLICK_RETRY_POLL_INTERVAL);
        if (isGone) {
          break;
        }
        this.autoconsentInstance.config.logs.rulesteps && console.log("[waitForThenClick] retrying click", selector);
        clicked = await this.click(selector, all);
      }
      return clicked;
    }
    wait(ms) {
      this.autoconsentInstance.config.logs.rulesteps && this.autoconsentInstance.config.logs.waits && console.log("[wait]", ms);
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(true);
        }, ms);
      });
    }
    cookieContains(substring) {
      return document.cookie.includes(substring);
    }
    hide(selector, method) {
      this.autoconsentInstance.config.logs.rulesteps && console.log("[hide]", selector);
      const styleEl = getStyleElement();
      return hideElements(styleEl, selector, method);
    }
    stylesheet(cssRule, stylesheetId) {
      this.autoconsentInstance.config.logs.rulesteps && console.log("[stylesheet]", cssRule, stylesheetId);
      const styleEl = getStyleElement();
      return appendStylesheetRule(styleEl, cssRule, stylesheetId);
    }
    removeClass(selector, className) {
      const elements = this.elementSelector(selector);
      this.autoconsentInstance.config.logs.rulesteps && console.log("[removeClass]", selector, className, elements);
      elements.forEach((el) => el.classList.remove(className));
      return elements.length > 0;
    }
    setStyle(selector, css) {
      const elements = this.elementSelector(selector);
      this.autoconsentInstance.config.logs.rulesteps && console.log("[setStyle]", selector, css, elements);
      elements.forEach((el) => el.style.cssText = css);
      return elements.length > 0;
    }
    addStyle(selector, css) {
      const elements = this.elementSelector(selector);
      this.autoconsentInstance.config.logs.rulesteps && console.log("[addStyle]", selector, css, elements);
      elements.forEach((el) => el.style.cssText += "; " + css);
      return elements.length > 0;
    }
    prehide(selector) {
      const styleEl = getStyleElement("autoconsent-prehide");
      this.autoconsentInstance.config.logs.lifecycle && console.log("[prehide]", styleEl, location.href);
      return hideElements(styleEl, selector, "opacity");
    }
    undoPrehide() {
      const existingElement = getStyleElement("autoconsent-prehide");
      this.autoconsentInstance.config.logs.lifecycle && console.log("[undoprehide]", existingElement, location.href);
      existingElement.remove();
    }
    async createOrUpdateStyleSheet(cssText, styleSheet) {
      if (!styleSheet) {
        styleSheet = new CSSStyleSheet();
      }
      styleSheet = await styleSheet.replace(cssText);
      return styleSheet;
    }
    removeStyleSheet(styleSheet) {
      if (styleSheet) {
        styleSheet.replace("");
        return true;
      }
      return false;
    }
    querySingleReplySelector(selector, parent = document) {
      if (selector.startsWith("aria/")) {
        return [];
      }
      if (selector.startsWith("xpath/")) {
        const xpath = selector.slice(6);
        const result = document.evaluate(xpath, parent, null, XPathResult.ANY_TYPE, null);
        let node;
        const elements = [];
        while (node = result.iterateNext()) {
          elements.push(node);
        }
        return elements;
      }
      if (selector.startsWith("text/")) {
        return [];
      }
      if (selector.startsWith("pierce/")) {
        return [];
      }
      if (parent.shadowRoot) {
        return Array.from(parent.shadowRoot.querySelectorAll(selector));
      }
      if (parent.contentDocument?.querySelectorAll) {
        return Array.from(parent.contentDocument.querySelectorAll(selector));
      }
      return Array.from(parent.querySelectorAll(selector));
    }
    querySelectorChain(selectors) {
      let parent = document;
      let matches = [];
      for (const selector of selectors) {
        matches = this.querySingleReplySelector(selector, parent);
        if (matches.length === 0) {
          return [];
        }
        parent = matches[0];
      }
      return matches;
    }
    elementSelector(selector) {
      if (typeof selector === "string") {
        return this.querySingleReplySelector(selector);
      }
      return this.querySelectorChain(selector);
    }
    waitForMutation(selector, timeout = 6e4) {
      const node = this.elementSelector(selector);
      if (node.length === 0) {
        throw new Error(`${selector} did not match any elements`);
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error("Timed out waiting for mutation"));
          observer.disconnect();
        }, timeout);
        const observer = new MutationObserver(() => {
          clearTimeout(timer);
          observer.disconnect();
          resolve(true);
        });
        observer.observe(node[0], {
          subtree: true,
          childList: true,
          attributes: true
        });
      });
    }
  };
  var compactedRuleSteps = [
    ["exists", "e"],
    ["visible", "v"],
    ["waitForThenClick", "c"],
    ["click", "k"],
    ["waitFor", "w"],
    ["waitForVisible", "wv"],
    ["hide", "h"],
    ["cookieContains", "cc"]
  ];
  function decodeNullableBoolean(value) {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
    return void 0;
  }
  function decodeRules(encoded) {
    if (encoded.v > 1) {
      throw new Error("Unsupported rule format.");
    }
    return encoded.r.filter((r) => r[0] <= SUPPORTED_RULE_STEP_VERSION).map((rule) => new CompactedCMPRule(rule, encoded.s));
  }
  var CompactedCMPRule = class {
    constructor(rule, strings) {
      this.intermediate = false;
      this.optIn = [];
      this.r = rule;
      this.s = strings;
      if (this.r[10] && this.r[10].intermediate) {
        this.intermediate = this.r[10].intermediate;
      }
    }
    _decodeRuleStep(step) {
      const clonedStep = { ...step };
      const decodeRuleStep = this._decodeRuleStep.bind(this);
      for (const [longKey, shortKey] of compactedRuleSteps) {
        if (clonedStep[shortKey] !== void 0) {
          clonedStep[longKey] = this.s[clonedStep[shortKey]];
          delete clonedStep[shortKey];
        }
      }
      if (step.if) {
        clonedStep.if = decodeRuleStep(step.if);
        clonedStep.then = step.then && step.then.map(decodeRuleStep);
        if (step.else) {
          clonedStep.else = step.else.map(decodeRuleStep);
        }
      }
      if (step.any) {
        clonedStep.any = step.any.map(decodeRuleStep);
      }
      return { ...clonedStep };
    }
    get minimumRuleStepVersion() {
      return this.r[0];
    }
    get name() {
      return this.r[1];
    }
    get cosmetic() {
      return decodeNullableBoolean(this.r[2]);
    }
    get runContext() {
      const runContext = {};
      const urlPattern = this.r[3];
      const mainFrame = this.r[4];
      const runInMainFrame = decodeNullableBoolean(Math.floor(mainFrame / 10) % 10);
      const runInSubFrame = decodeNullableBoolean(mainFrame % 10);
      if (runInMainFrame !== void 0) {
        runContext.main = runInMainFrame;
      }
      if (runInSubFrame !== void 0) {
        runContext.frame = runInSubFrame;
      }
      if (urlPattern !== "") {
        runContext.urlPattern = urlPattern;
      }
      return runContext;
    }
    get prehideSelectors() {
      return this.r[5].map((i) => this.s[i].toString());
    }
    get detectCmp() {
      return this.r[6].map(this._decodeRuleStep.bind(this));
    }
    get detectPopup() {
      return this.r[7].map(this._decodeRuleStep.bind(this));
    }
    get optOut() {
      return this.r[8].map(this._decodeRuleStep.bind(this));
    }
    get test() {
      return this.r[9].map(this._decodeRuleStep.bind(this));
    }
  };
  function filterCMPs(rules, config) {
    return rules.filter((cmp) => {
      return (!config.disabledCmps || !config.disabledCmps.includes(cmp.name)) && // CMP is not disabled
      (config.enableCosmeticRules || !cmp.isCosmetic) && // CMP is not cosmetic or cosmetic rules are enabled
      (config.enableGeneratedRules || !cmp.name.startsWith("auto_"));
    });
  }
  var _config;
  var AutoConsent = class {
    constructor(sendContentMessage, config = null, declarativeRules = null) {
      this.id = getRandomID();
      this.rules = [];
      __privateAdd(this, _config);
      this.state = {
        lifecycle: "loading",
        prehideOn: false,
        findCmpAttempts: 0,
        detectedCmps: [],
        detectedPopups: [],
        heuristicPatterns: [],
        heuristicSnippets: [],
        selfTest: null,
        clicks: 0,
        startTime: 0,
        endTime: 0
      };
      evalState.sendContentMessage = sendContentMessage;
      this.sendContentMessage = sendContentMessage;
      this.rules = [];
      this.updateState({ lifecycle: "loading" });
      this.addDynamicRules();
      if (config) {
        this.initialize(config, declarativeRules);
      } else {
        if (declarativeRules) {
          this.parseDeclarativeRules(declarativeRules);
        }
        const initMsg = {
          type: "init",
          url: window.location.href
        };
        sendContentMessage(initMsg);
        this.updateState({ lifecycle: "waitingForInitResponse" });
      }
      this.domActions = new DomActions(this);
    }
    get config() {
      if (!__privateGet(this, _config)) {
        throw new Error("AutoConsent is not initialized yet");
      }
      return __privateGet(this, _config);
    }
    initialize(config, declarativeRules) {
      const normalizedConfig = normalizeConfig(config);
      normalizedConfig.logs.lifecycle && console.log("autoconsent init", window.location.href);
      __privateSet(this, _config, normalizedConfig);
      if (!normalizedConfig.enabled) {
        normalizedConfig.logs.lifecycle && console.log("autoconsent is disabled");
        return;
      }
      if (declarativeRules) {
        this.parseDeclarativeRules(declarativeRules);
      }
      this.rules = filterCMPs(this.rules, normalizedConfig);
      if (this.shouldPrehide) {
        if (document.documentElement) {
          this.prehideElements();
        } else {
          const delayedPrehide = () => {
            window.removeEventListener("DOMContentLoaded", delayedPrehide);
            this.prehideElements();
          };
          window.addEventListener("DOMContentLoaded", delayedPrehide);
        }
      }
      if (document.readyState === "loading") {
        const onReady = () => {
          window.removeEventListener("DOMContentLoaded", onReady);
          this.start();
        };
        window.addEventListener("DOMContentLoaded", onReady);
      } else {
        this.start();
      }
      this.updateState({ lifecycle: "initialized" });
    }
    get shouldPrehide() {
      return this.config.enablePrehide && !this.config.visualTest;
    }
    saveFocus() {
      this.focusedElement = document.activeElement;
      if (this.focusedElement) {
        this.config.logs.lifecycle && console.log("saving focus", this.focusedElement, location.href);
      }
    }
    restoreFocus() {
      if (this.focusedElement) {
        this.config.logs.lifecycle && console.log("restoring focus", this.focusedElement, location.href);
        try {
          this.focusedElement.focus({ preventScroll: true });
        } catch (e) {
          this.config.logs.errors && console.warn("error restoring focus", e);
        }
        this.focusedElement = void 0;
      }
    }
    addDynamicRules() {
      dynamicCMPs.forEach((Cmp) => {
        this.rules.push(new Cmp(this));
      });
    }
    parseDeclarativeRules(declarativeRules) {
      const perfEnabled = __privateGet(this, _config)?.performanceLoggingEnabled;
      perfEnabled && performance.mark("parseDeclarativeRulesStart");
      if (declarativeRules.autoconsent) {
        declarativeRules.autoconsent.forEach((ruleset) => {
          this.addDeclarativeCMP(ruleset);
        });
      }
      if (declarativeRules.compact) {
        try {
          const rules = decodeRules(declarativeRules.compact);
          rules.forEach(this.addDeclarativeCMP.bind(this));
        } catch (e) {
          __privateGet(this, _config)?.logs.errors && console.error(e);
        }
      }
      perfEnabled && performance.mark("parseDeclarativeRulesEnd");
      perfEnabled && performance.measure("parseDeclarativeRules", "parseDeclarativeRulesStart", "parseDeclarativeRulesEnd");
    }
    addDeclarativeCMP(ruleset) {
      if ((ruleset.minimumRuleStepVersion || 1) <= SUPPORTED_RULE_STEP_VERSION) {
        this.rules.push(new AutoConsentCMP(ruleset, this));
      }
    }
    // start the detection process, possibly with a delay
    start() {
      scheduleWhenIdle(() => this._start());
    }
    async _start() {
      const logsConfig = this.config.logs;
      logsConfig.lifecycle && console.log(`Detecting CMPs on ${window.location.href}`);
      this.updateState({ lifecycle: "started" });
      const foundCmps = await this.findCmp(this.config.detectRetries);
      this.updateState({ detectedCmps: foundCmps.map((c) => c.name) });
      if (this.config.performanceLoggingEnabled) {
        this.updateState({ performance: this.measurePerformance() });
      }
      if (foundCmps.length === 0) {
        logsConfig.lifecycle && console.log("no CMP found", location.href);
        if (this.shouldPrehide) {
          this.undoPrehide();
        }
        this.updateState({ lifecycle: "nothingDetected" });
        return false;
      }
      this.updateState({ lifecycle: "cmpDetected" });
      const staticCmps = [];
      const cosmeticCmps = [];
      for (const cmp of foundCmps) {
        if (cmp.isCosmetic) {
          cosmeticCmps.push(cmp);
        } else {
          staticCmps.push(cmp);
        }
      }
      let result = false;
      let foundPopups = await this.detectPopups(staticCmps, async (cmp) => {
        result = await this.handlePopup(cmp);
      });
      if (foundPopups.length === 0) {
        foundPopups = await this.detectPopups(cosmeticCmps, async (cmp) => {
          result = await this.handlePopup(cmp);
        });
      }
      if (foundPopups.length === 0) {
        logsConfig.lifecycle && console.log("no popup found");
        if (this.shouldPrehide) {
          this.undoPrehide();
        }
        return false;
      }
      if (foundPopups.length > 1) {
        const errorDetails = {
          msg: `Found multiple CMPs, check the detection rules.`,
          cmps: foundPopups.map((cmp) => cmp.name)
        };
        logsConfig.errors && console.warn(errorDetails.msg, errorDetails.cmps);
        this.sendContentMessage({
          type: "autoconsentError",
          details: errorDetails
        });
      }
      return result;
    }
    async findCmp(retries) {
      const logsConfig = this.config.logs;
      this.updateState({ findCmpAttempts: this.state.findCmpAttempts + 1 });
      const foundCMPs = [];
      const isTop = isTopFrame();
      const siteSpecificRules = [];
      const genericRules = [];
      this.rules.forEach((cmp) => {
        if (cmp.checkFrameContext(isTop)) {
          const isSiteSpecific = !!cmp.runContext.urlPattern;
          if (cmp.hasMatchingUrlPattern()) {
            siteSpecificRules.push(cmp);
          } else if (!isSiteSpecific) {
            genericRules.push(cmp);
          }
        }
      });
      const heuristicEnabled = isTop && this.config.heuristicMode !== "off";
      const heuristicRules = heuristicEnabled && this.state.findCmpAttempts % 2 === 0 ? [new AutoConsentHeuristicCMP(this, this.config.heuristicMode)] : [];
      const rulesPriorityStages = [
        ["site-specific", siteSpecificRules],
        ["generic", genericRules],
        ["heuristic", heuristicRules]
      ];
      const runDetectCmp = async (cmp) => {
        try {
          const result = await cmp.detectCmp();
          if (result) {
            logsConfig.lifecycle && console.log(`Found CMP: ${cmp.name} ${window.location.href}`);
            this.sendContentMessage({
              type: "cmpDetected",
              url: location.href,
              cmp: cmp.name
            });
            foundCMPs.push(cmp);
          }
        } catch (e) {
          logsConfig.errors && console.warn(`error detecting ${cmp.name}`, e);
        }
      };
      const mutationObserver = this.domActions.waitForMutation("html");
      mutationObserver.catch(() => {
      });
      for (const [stageName, ruleGroup] of rulesPriorityStages) {
        logsConfig.lifecycle && ruleGroup.length > 0 && console.log(
          `Trying ${stageName} rules`,
          ruleGroup.map((r) => r.name)
        );
        this.config.performanceLoggingEnabled && performance.mark(`findCmpStage_${stageName}`);
        await Promise.all(ruleGroup.map(runDetectCmp));
        this.config.performanceLoggingEnabled && performance.mark(`findCmpStageEnd_${stageName}`);
        this.config.performanceLoggingEnabled && performance.measure(`findCmp_${stageName}`, `findCmpStage_${stageName}`, `findCmpStageEnd_${stageName}`);
        if (foundCMPs.length > 0) {
          break;
        }
      }
      this.detectHeuristics();
      if (foundCMPs.length === 0 && retries > 0) {
        const waitFor2 = [this.domActions.wait(500)];
        const heuristicSkipped = heuristicEnabled && heuristicRules.length === 0;
        if (this.state.findCmpAttempts > 1 && !heuristicSkipped) {
          waitFor2.push(mutationObserver);
        }
        try {
          await Promise.all(waitFor2);
        } catch (e) {
          return [];
        }
        return this.findCmp(retries - 1);
      }
      return foundCMPs;
    }
    detectHeuristics() {
      if (this.config.enableHeuristicDetection) {
        this.config.performanceLoggingEnabled && performance.mark("detectHeuristicsStart");
        const { patterns, snippets: snippets2 } = checkHeuristicPatterns(document.documentElement?.innerText || "", "page");
        if (patterns.length > 0 && (patterns.length !== this.state.heuristicPatterns.length || this.state.heuristicPatterns.some((p, i) => p !== patterns[i]))) {
          this.config.logs.lifecycle && console.log("Heuristic patterns found", patterns, snippets2);
          this.updateState({ heuristicPatterns: patterns, heuristicSnippets: snippets2 });
        }
        this.config.performanceLoggingEnabled && performance.mark("detectHeuristicsEnd");
        this.config.performanceLoggingEnabled && performance.measure("detectHeuristics", "detectHeuristicsStart", "detectHeuristicsEnd");
      }
    }
    /**
     * Detect if a CMP has a popup open. Fullfils with the CMP if a popup is open, otherwise rejects.
     */
    async detectPopup(cmp) {
      const isOpen = await this.waitForPopup(cmp).catch((error) => {
        this.config.logs.errors && console.warn(`error waiting for a popup for ${cmp.name}`, error);
        return false;
      });
      if (isOpen) {
        this.updateState({ detectedPopups: this.state.detectedPopups.concat([cmp.name]) });
        this.sendContentMessage({
          type: "popupFound",
          cmp: cmp.name,
          url: location.href
        });
        return cmp;
      }
      throw new Error("Popup is not shown");
    }
    /**
     * Detect if any of the CMPs has a popup open. Returns a list of CMPs with open popups.
     */
    async detectPopups(cmps, onFirstPopupAppears) {
      const tasks = cmps.map((cmp) => this.detectPopup(cmp));
      await Promise.any(tasks).then((cmp) => {
        this.detectHeuristics();
        onFirstPopupAppears(cmp);
      }).catch(() => {
      });
      const results = await Promise.allSettled(tasks);
      const popups = [];
      for (const result of results) {
        if (result.status === "fulfilled") {
          popups.push(result.value);
        }
      }
      return popups;
    }
    async handlePopup(cmp) {
      this.updateState({ lifecycle: "openPopupDetected", startTime: Date.now() });
      if (this.shouldPrehide && !this.state.prehideOn) {
        this.prehideElements();
      }
      this.foundCmp = cmp;
      if (this.config.autoAction === "optOut") {
        return await this.doOptOut();
      } else if (this.config.autoAction === "optIn") {
        return await this.doOptIn();
      } else {
        this.config.logs.lifecycle && console.log("waiting for opt-out signal...", location.href);
        return true;
      }
    }
    async doOptOut() {
      const logsConfig = this.config.logs;
      this.updateState({ lifecycle: "runningOptOut" });
      this.saveFocus();
      let optOutResult;
      if (!this.foundCmp) {
        logsConfig.errors && console.log("no CMP to opt out");
        optOutResult = false;
      } else {
        logsConfig.lifecycle && console.log(`CMP ${this.foundCmp.name}: opt out on ${window.location.href}`);
        optOutResult = await this.foundCmp.optOut();
        logsConfig.lifecycle && console.log(`${this.foundCmp.name}: opt out result ${optOutResult}`);
      }
      if (this.shouldPrehide) {
        this.undoPrehide();
      }
      this.sendContentMessage({
        type: "optOutResult",
        cmp: this.foundCmp ? this.foundCmp.name : "none",
        result: optOutResult,
        scheduleSelfTest: Boolean(this.foundCmp && this.foundCmp.hasSelfTest),
        url: location.href
      });
      if (optOutResult && this.foundCmp && !this.foundCmp.isIntermediate) {
        this.state.endTime = Date.now();
        logsConfig.lifecycle && console.log(
          `${this.foundCmp.name}: done in ${this.state.endTime - this.state.startTime}ms with ${this.state.clicks} clicks`
        );
        this.sendContentMessage({
          type: "autoconsentDone",
          cmp: this.foundCmp?.name,
          isCosmetic: this.foundCmp?.isCosmetic,
          url: location.href,
          duration: this.state.endTime - this.state.startTime,
          totalClicks: this.state.clicks
        });
        this.updateState({ lifecycle: "done" });
      } else {
        this.updateState({ lifecycle: optOutResult ? "optOutSucceeded" : "optOutFailed" });
      }
      this.restoreFocus();
      return optOutResult;
    }
    async doOptIn() {
      const logsConfig = this.config.logs;
      this.updateState({ lifecycle: "runningOptIn" });
      this.saveFocus();
      let optInResult;
      if (!this.foundCmp) {
        logsConfig.errors && console.log("no CMP to opt in");
        optInResult = false;
      } else {
        logsConfig.lifecycle && console.log(`CMP ${this.foundCmp.name}: opt in on ${window.location.href}`);
        optInResult = await this.foundCmp.optIn();
        logsConfig.lifecycle && console.log(`${this.foundCmp.name}: opt in result ${optInResult}`);
      }
      if (this.shouldPrehide) {
        this.undoPrehide();
      }
      this.sendContentMessage({
        type: "optInResult",
        cmp: this.foundCmp ? this.foundCmp.name : "none",
        result: optInResult,
        scheduleSelfTest: false,
        // self-tests are only for opt-out at the moment
        url: location.href
      });
      if (optInResult && this.foundCmp && !this.foundCmp.isIntermediate) {
        this.state.endTime = Date.now();
        logsConfig.lifecycle && console.log(
          `${this.foundCmp.name}: done in ${this.state.endTime - this.state.startTime}ms with ${this.state.clicks} clicks`
        );
        this.sendContentMessage({
          type: "autoconsentDone",
          cmp: this.foundCmp.name,
          isCosmetic: this.foundCmp.isCosmetic,
          url: location.href,
          duration: this.state.endTime - this.state.startTime,
          totalClicks: this.state.clicks
        });
        this.updateState({ lifecycle: "done" });
      } else {
        this.updateState({ lifecycle: optInResult ? "optInSucceeded" : "optInFailed" });
      }
      this.restoreFocus();
      return optInResult;
    }
    async doSelfTest() {
      const logsConfig = this.config.logs;
      let selfTestResult;
      if (!this.foundCmp) {
        logsConfig.errors && console.log("no CMP to self test");
        selfTestResult = false;
      } else {
        logsConfig.lifecycle && console.log(`CMP ${this.foundCmp.name}: self-test on ${window.location.href}`);
        selfTestResult = await this.foundCmp.test();
      }
      this.sendContentMessage({
        type: "selfTestResult",
        cmp: this.foundCmp ? this.foundCmp.name : "none",
        result: selfTestResult,
        url: location.href
      });
      this.updateState({ selfTest: selfTestResult });
      return selfTestResult;
    }
    async waitForPopup(cmp, retries = 10, interval = 500) {
      const logsConfig = this.config.logs;
      logsConfig.lifecycle && console.log("checking if popup is open...", cmp.name);
      let mutationObserver = null;
      if (this.config.enablePopupMutationObserver) {
        mutationObserver = this.domActions.waitForMutation("html", 1e4);
        mutationObserver.catch(() => {
        });
      }
      const isOpen = await cmp.detectPopup().catch((e) => {
        logsConfig.errors && console.warn(`error detecting popup for ${cmp.name}`, e);
        return false;
      });
      if (!isOpen && retries > 0) {
        if (mutationObserver) {
          try {
            await Promise.all([this.domActions.wait(interval), mutationObserver]);
          } catch (e) {
            logsConfig.lifecycle && console.log(cmp.name, "popup detection timed out waiting for DOM mutation");
          }
        } else {
          await this.domActions.wait(interval);
        }
        return this.waitForPopup(cmp, retries - 1, interval);
      }
      logsConfig.lifecycle && console.log(cmp.name, `popup is ${isOpen ? "open" : "not open"}`);
      return isOpen;
    }
    prehideElements() {
      const logsConfig = this.config.logs;
      const globalHidden = [
        "#didomi-popup,.didomi-popup-container,.didomi-popup-notice,.didomi-consent-popup-preferences,#didomi-notice,.didomi-popup-backdrop,.didomi-screen-medium"
      ];
      const selectors = this.rules.filter((rule) => rule.prehideSelectors && rule.checkRunContext()).reduce((selectorList, rule) => [...selectorList || [], ...rule.prehideSelectors || []], globalHidden);
      this.updateState({ prehideOn: true });
      setTimeout(() => {
        if (this.shouldPrehide && this.state.prehideOn && !["runningOptOut", "runningOptIn"].includes(this.state.lifecycle)) {
          logsConfig.lifecycle && console.log("Process is taking too long, unhiding elements");
          this.undoPrehide();
        }
      }, this.config.prehideTimeout || 2e3);
      return this.domActions.prehide(selectors.join(","));
    }
    undoPrehide() {
      this.updateState({ prehideOn: false });
      this.domActions.undoPrehide();
    }
    updateState(change) {
      Object.assign(this.state, change);
      this.sendContentMessage({
        type: "report",
        instanceId: this.id,
        url: window.location.href,
        mainFrame: isTopFrame(),
        state: this.state
      });
    }
    async receiveMessageCallback(message) {
      const logsConfig = __privateGet(this, _config)?.logs;
      if (logsConfig?.messages) {
        console.log("received from background", message, window.location.href);
      }
      switch (message.type) {
        case "initResp":
          this.initialize(message.config, message.rules);
          break;
        case "optIn":
          await this.doOptIn();
          break;
        case "optOut":
          await this.doOptOut();
          break;
        case "selfTest":
          await this.doSelfTest();
          break;
        case "evalResp":
          resolveEval(message.id, message.result);
          break;
        case "measurePerformance":
          this.updateState({ performance: this.measurePerformance() });
          break;
      }
    }
    measurePerformance() {
      const getRoundedPerformanceEntries = (name) => performance.getEntriesByName(name).map((m) => Number(m.duration.toFixed(3)));
      return {
        detectHeuristics: getRoundedPerformanceEntries("detectHeuristics"),
        heuristicDetector: getRoundedPerformanceEntries("heuristicDetector"),
        findCmpSiteSpecific: getRoundedPerformanceEntries("findCmp_site-specific"),
        findCmpGeneric: getRoundedPerformanceEntries("findCmp_generic"),
        findCmpHeuristic: getRoundedPerformanceEntries("findCmp_heuristic"),
        parseDeclarativeRules: getRoundedPerformanceEntries("parseDeclarativeRules")
      };
    }
  };
  _config = /* @__PURE__ */ new WeakMap();

  // shared/js/cpm.js
  var consent = new AutoConsent(async (msg) => {
    const response = await chrome.runtime.sendMessage({
      messageType: "autoconsent",
      autoconsentPayload: msg
    });
    if (response) {
      await consent.receiveMessageCallback(response);
    }
  });
})();
