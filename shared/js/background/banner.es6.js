const pixel = require("./pixel.es6");

const filterUrls = {
  valid: [
    "https://www.google.com/",
    "https://www.google.com/search",
    "https://www.google.com/webhp",
    "https://www.google.com/videohp",
    "https://www.google.com/shopping",
    "https://images.google.com/"
  ],
  invalid: ["https://www.google.com/maps"]
};

let updatedTabs = {};

function isValidURL(url) {
  const urlObj = new URL(url);
  const href = urlObj.href;
  // ensure match is at beginning of string
  return (
    filterUrls.valid.some(pattern => href.indexOf(pattern) === 0) &&
    !filterUrls.invalid.some(pattern => href.indexOf(pattern) === 0)
  );
}

function isDdgHome(url) {
  const urlObj = new URL(url);
  const params = urlObj.searchParams;
  const hasQuery = params.has("q");

  // match duckduckgo.com/
  // match duckduckgo.com/?atb=v123-4
  // ignore duckduckgo.com/?q=apple
  return urlObj.pathname === "/" && !hasQuery;
}

function isDdgSerp(url) {
  const urlObj = new URL(url);
  const params = urlObj.searchParams;
  const hasQuery = params.has("q");
  const hasIA = params.has("ia");

  // match duckduckgo.com/?q=apple
  // match duckduckgo.com/apple?ia=web
  // ignore duckduckgo.com/about
  if (urlObj.pathname !== "/" && !hasIA) return false;
  return urlObj.pathname === "/" && hasQuery;
}

function isDdgURL(url) {
  const urlObj = new URL(url);
  const href = urlObj.href;
  const hostname = urlObj.hostname;
  const params = urlObj.searchParams;

  if (hostname !== "duckduckgo.com") return false;
  if (isDdgHome(url) || isDdgSerp(url)) return true;
  return false;
}

function resetTab(tabId) {
  updatedTabs[tabId] = false;
}

function injectAssets(tabId) {
  // Inject CSS
  chrome.tabs.insertCSS(
    {
      file: "/public/css/banner.css",
      runAt: "document_start"
    },
    function() {
      console.group("DDG BANNER");
      console.warn(`Tab ${tabId}: CSS injected!`);
      console.groupEnd();
    }
  );

  //  Inject JS
  chrome.tabs.executeScript(
    {
      file: "/public/js/content-scripts/banner.js",
      runAt: "document_start"
    },
    function(array) {
      console.group("DDG BANNER");
      console.warn(`Tab ${tabId}: Content Script injected!`);
      console.groupEnd();
    }
  );
}

// Check if we can show the banner
function canShowBanner(url) {
  console.warn("ℹ️ Checking URL: ", url);
  let isValid = false;
  if (isValidURL(url)) {
    console.warn("✅ URL IS VALID");
    isValid = true;
  } else if (isDdgURL(url)) {
    console.warn("🦆 URL IS DDG URL");
  } else {
    console.warn("❌ URL IS NOT VALID");
  }
  return isValid;
}

function createBanner(tabId) {
  injectAssets(tabId);
  // prevent injecting more than once
  updatedTabs[tabId] = true;
}

function handleUpdated(details) {
  console.group("DDG BANNER");
  const { url, tabId } = details;

  console.warn(`🔔 Updated tab: ${tabId}`);
  console.warn("ℹ️ Details: ", details);

  // TODO: RESET TAB?
  //   resetTab(tabId);

  if (isDdgURL(url) && details.transitionType === "form_submit") {
    chrome.storage.local.get(["bannerDismissed"], result => {
      // cast boolean to int
      pixel.fire("evd", { b: +result.bannerDismissed });
    });
  }

  if (canShowBanner(url)) {
    // Check if banner dismissed before loading
    chrome.storage.local.get(["bannerDismissed"], result => {
      if (!result.bannerDismissed) {
        createBanner(tabId);
      } else {
        console.warn("IGNORING. BANNER DISMISSED");
      }
      console.groupEnd();
    });
  }
  console.groupEnd();
}

var Banner = (() => {
  return {
    handleUpdated
  };
})();

module.exports = Banner;
