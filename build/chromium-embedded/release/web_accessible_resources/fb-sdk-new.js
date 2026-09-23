/**
 * Shim script for the Facebook SDK. Stubs out `window.FB`, and loads the real
 * Facebook SDK bundle if the user clicks a "Login with Facebook" button.
 *
 * An amalgamation of the old Click to Load shim[1], and Mozilla's shim[2], but
 * with large changes on top. Code is therefore licensed under a mix of
 * https://www.apache.org/licenses/LICENSE-2.0. and http://mozilla.org/MPL/2.0/.
 *
 * 1 - https://github.com/duckduckgo/tracker-surrogates/blob/245cba26f925476b237965c952f5219aa8b90d1b/surrogates/fb-sdk.js
 * 2 - https://searchfox.org/firefox-main/source/browser/extensions/webcompat/shims/facebook-sdk.js
 */
(() => {
    'use strict';

    // Figure out the real SDK bundle's URL.
    let locale = 'en_US';
    let fragment = null;
    try {
        const { hostname, pathname, hash } = new URL(document?.currentScript?.src);
        const baseDomain = hostname.split('.').slice(-2).join('.');
        if (baseDomain === 'facebook.net' || baseDomain === 'facebook.com') {
            locale = pathname.match(/^\/([a-zA-Z_]+)\/(?:sdk|all)\.js$/)?.[1] ?? locale;
            fragment = new URLSearchParams(hash.slice(1));
        }
    } catch (e) {}
    const bundleURL = `https://connect.facebook.net/${locale}/bundle/sdk.js/`;

    // True once the real SDK bundle has started loading.
    let fbIsEnabled = false;
    // `FB.init` options captured from the page (or the URL fragment fallback),
    // to replay on the real SDK.
    let initData = null;
    // Shimmed fbAsyncInit replacement.
    let shimAsyncInit = null;
    // A fbAsyncInit assigned by the page while the SDK bundle was loading.
    let pageAsyncInit = null;
    // True once window.open has been wrapped (see replaceWindowOpen).
    let windowOpenReplaced = false;
    // Login buttons that have already been processed by `renderLoginButtons`.
    const shimmedButtons = new WeakSet();

    // `FB.Event.subscribe`/`FB.XFBML.parse` calls made against the stub, to
    // replay on the real SDK.
    const subscribeCalls = [];
    const parseCalls = [];

    // The blank popup pre-opened during the login gesture.
    let loginPopup = null;
    const popupName = Math.random().toString(36).replace(/[^a-z]+/g, '').slice(0, 12);

    // Sites can configure the SDK via the sdk.js URL fragment
    // (sdk.js#xfbml=1&version=v24.0&appId=...) instead of calling `FB.init`.
    // But capture it as a fallback, since a `FB.init` overwrites it.
    if (fragment?.get('appId')) {
        initData = {
            appId: fragment.get('appId'),
            version: fragment.get('version') ?? undefined,
            xfbml: fragment.get('xfbml') === '1',
            cookie: fragment.get('cookie') === '1',
            autoLogAppEvents: fragment.get('autoLogAppEvents') === '1'
        };
    }

    // The pending login flow, replayed once the real SDK is ready.
    const fbLogin = {
        callback () {},
        params: undefined,
        // True while a login is waiting for the real SDK to load.
        shouldRun: false,
        // True when the pending login came through `FB.ui` rather than
        // `FB.login`.
        viaUi: false
    };

    /**
     * Load the real Facebook SDK bundle.
     *
     * Once ready, the real SDK calls `window.fbAsyncInit`. We use that hook to
     * re-apply the page's init options, re-register its buffered event
     * subscriptions and XFBML widgets, then run the pending login.
     */
    function enableFacebookSDK () {
        if (fbIsEnabled) {
            return;
        }
        fbIsEnabled = true;

        // Clear the stubbed `window.FB` API, ready for the real SDK bundle to
        // install its own. But keep a reference, so the stub can be restored if
        // the bundle fails to load.
        const stubFB = window.FB;
        window.FB = undefined;
        shimAsyncInit = () => {
            if (initData) {
                window.FB.init(initData);
            }
            for (const args of subscribeCalls) {
                window.FB.Event.subscribe(...args);
            }
            for (const args of parseCalls) {
                window.FB.XFBML.parse(...args);
            }
            // If the page assigned its own fbAsyncInit while the bundle was
            // loading (captured in the onload handler), run it now that the
            // real SDK is available.
            if (typeof pageAsyncInit === 'function' && !pageAsyncInit.hasRun) {
                pageAsyncInit.hasRun = true;
                pageAsyncInit();
            }
            if (fbLogin.shouldRun) {
                if (fbLogin.viaUi) {
                    window.FB.ui(fbLogin.params, fbLogin.callback);
                } else {
                    window.FB.login(fbLogin.callback, fbLogin.params);
                }
            }
        };
        window.fbAsyncInit = shimAsyncInit;

        // Load the real Facebook SDK bundle.

        // Note: Use `createElementNS` since during testing some website wrapped
        //       `document.createElement('script')` and broke the login flow.
        const fbScript = document.createElementNS('http://www.w3.org/1999/xhtml', 'script');

        fbScript.setAttribute('crossorigin', 'anonymous');
        fbScript.setAttribute('async', '');
        fbScript.setAttribute('defer', '');

        // Note: Opt-out from consent auto-blocking, otherwise the login flow
        //       won't work. Acceptable since the user explicitly expressed
        //       intent by clicking a "Login with Facebook" or similar button.
        fbScript.setAttribute('data-ot-ignore', '');

        fbScript.src = bundleURL;
        fbScript.onload = () => {
            // If the page overwrote fbAsyncInit while the bundle was loading,
            // capture its hook and re-assert ours, so that the pending login
            // still replays. shimAsyncInit calls the page's hook too.
            if (window.fbAsyncInit !== shimAsyncInit) {
                pageAsyncInit = window.fbAsyncInit;
                window.fbAsyncInit = shimAsyncInit;
            }
            try {
                window.FB_LOCAL_GLOBAL.require('sdk.dynamic-module-loader').load({});
            } catch (e) {}
        };
        fbScript.onerror = () => {
            // Loading the bundle failed. Restore the stubbed `window.FB` so
            // the page keeps working, notify the pending login callback (that
            // also closes the pre-opened blank popup), and reset the state so
            // the user can retry.
            fbScript.remove();
            window.FB = stubFB;
            fbIsEnabled = false;
            fbLogin.shouldRun = false;
            fbLogin.callback({ status: 'unknown', authResponse: null });
        };
        document.head.appendChild(fbScript);
    }

    function runFacebookLogin ({ callback, params, viaUi = false } = {}) {
        if (fbLogin.shouldRun) {
            // A new login supersedes the pending one. Notify the previous
            // caller with a logged-out response, so that it isn't left
            // waiting for a response forever.
            fbLogin.callback({ status: 'unknown', authResponse: null });
        }
        fbLogin.callback = (response) => {
            // The login flow is finished, stop treating Facebook popups as
            // the login dialog (see replaceWindowOpen).
            fbLogin.shouldRun = false;
            // If login resolved without a popup (e.g. FedCM), close the blank
            // one we pre-opened. If Facebook navigated it cross-origin this
            // throws and we leave it alone (the real dialog manages itself).
            try {
                if (loginPopup?.location.href === 'about:blank') {
                    loginPopup.close();
                }
            } catch (e) {}
            if (typeof callback === 'function') {
                callback(response);
            }
        };
        fbLogin.params = params;
        fbLogin.shouldRun = true;
        fbLogin.viaUi = viaUi;
        replaceWindowOpen();
        openLoginPopup();
        enableFacebookSDK();
    }

    /**
     * To avoid the (async loaded) login popup from being blocked, pre-open a
     * blank popup inside the gesture (openLoginPopup) and force the SDK to
     * reuse it by rewriting the window name of its login dialog popup.
     */
    function replaceWindowOpen () {
        if (windowOpenReplaced) {
            return;
        }
        windowOpenReplaced = true;
        const oldOpen = window.open;
        window.open = (url, name, windowParams) => {
            try {
                const { protocol, hostname } = new URL(url, location.href);
                const baseDomain = hostname.split('.').slice(-2).join('.');
                if (fbLogin.shouldRun && protocol === 'https:' && baseDomain === 'facebook.com') {
                    name = popupName;
                }
            } catch (e) {}
            return oldOpen.call(window, url, name, windowParams);
        };
    }

    function openLoginPopup () {
        const width = Math.min(window.screen.width, 450);
        const height = Math.min(window.screen.height, 450);
        const popupParams = `width=${width},height=${height},scrollbars=1,location=1`;
        loginPopup = window.open('about:blank', popupName, popupParams);
    }

    // Facebook "f" logo, used for Facebook login buttons. Copyright is dedicated
    // to the Public Domain, see https://en.wikipedia.org/wiki/File:Facebook_f_logo_(2019).svg
    const logoURI = 'data:image/svg+xml,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14222 14222">' +
        '<circle cx="7111" cy="7112" r="7111" fill="#fff"/>' +
        '<path d="M9879 9168l315-2056H8222V5778c0-562 275-1111 1159-1111h897V2917s-814-139-1592-139c-1624 ' +
        '0-2686 984-2686 2767v1567H4194v2056h1806v4969c362 57 733 86 1111 86s749-30 1111-86V9168z" fill="#1977f3"/>' +
        '</svg>'
    );

    /**
     * Facebook login buttons are empty placeholder elements that the Facebook
     * SDK then renders, so let's render a facsimile to ensure users have
     * something to click on. Once login succeeds, run the button's onlogin
     * snippet to notify the page.
     */
    function renderLoginButtons (root = document) {
        if (!root?.querySelectorAll) {
            return;
        }
        for (const button of root.querySelectorAll('.fb-login-button, fb\\:login-button')) {
            if (shimmedButtons.has(button)) {
                continue;
            }
            shimmedButtons.add(button);
            if (!button.childElementCount && !button.textContent.trim()) {
                const logo = document.createElement('img');
                logo.src = logoURI;
                logo.alt = '';
                logo.style.cssText = 'width:20px;height:20px;margin-right:8px;vertical-align:-5px;';
                const label = document.createElement('span');
                label.style.cssText =
                    'display:inline-block;background:#1877f2;color:#fff;border-radius:6px;' +
                    'padding:10px 16px;font:bold 15px/1.35 Helvetica,Arial,sans-serif;user-select:none;';
                label.append(logo, button.getAttribute('data-button-type') === 'continue_with'
                    ? 'Continue with Facebook'
                    : 'Log in with Facebook');
                button.appendChild(label);
            }
            button.style.cursor = 'pointer';
            button.addEventListener('click', () => {
                const scope = button.getAttribute('data-scope') ?? button.getAttribute('scope') ?? undefined;
                const onlogin = button.getAttribute('data-onlogin') ?? button.getAttribute('onlogin');
                const callback = (response) => {
                    if (onlogin && response?.status === 'connected') {
                        try {
                            // eslint-disable-next-line no-new-func
                            new Function(onlogin).call(button);
                        } catch (e) {}
                    }
                };
                if (fbIsEnabled) {
                    // The real SDK has taken over. Usually it will have
                    // re-rendered the button (so clicks land on its widget,
                    // not here), but when it hasn't, run the login directly
                    // to support retries (e.g. after a cancelled dialog).
                    // While the bundle is still loading `window.FB` is
                    // undefined and this safely does nothing; the pending
                    // login runs once the bundle is ready.
                    window.FB?.login?.(callback, { scope });
                    return;
                }
                runFacebookLogin({ callback, params: { scope } });
            });
        }
    }

    function init () {
        const { fbAsyncInit } = window;
        if (typeof fbAsyncInit === 'function' && !fbAsyncInit.hasRun && fbAsyncInit !== shimAsyncInit) {
            fbAsyncInit.hasRun = true;
            fbAsyncInit();
        }
        renderLoginButtons();
    }

    // Instead of using `fbAsyncInit`, some sites use Facebook's loader stub,
    // which queues FB API calls in `window.FB.__buffer` to be replayed later.
    const buffer = window.FB?.__buffer;

    if (!window.FB || (buffer && typeof window.FB.getLoginStatus !== 'function')) {
        window.FB = {
            api (...args) {
                // Graph calls can't be answered before the real SDK exists,
                // call back with an empty object so callers don't hang.
                const callback = args[args.length - 1];
                if (typeof callback === 'function') {
                    callback({});
                }
            },
            init (obj) {
                if (obj) {
                    initData = obj;
                }
            },
            ui (obj, callback) {
                obj = obj ?? {};
                if (['share', 'share_open_graph', 'send'].includes(obj.method)) {
                    // Sharing needs no SDK: open the public sharer directly.
                    // Call back right away (the sharer popup's outcome isn't
                    // observable cross-origin anyway) so that follow-up logic
                    // isn't left hanging.
                    const href = encodeURIComponent(obj.href ?? obj.link ?? location.href);
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${href}`, 'share-facebook', 'width=550,height=235');
                    callback?.({});
                    return;
                }
                if (['permissions.oauth', 'permissions.request', 'login'].includes(obj.method)) {
                    runFacebookLogin({ callback, params: obj, viaUi: true });
                    return;
                }
                callback?.({});
            },
            getAccessToken () {
                return null;
            },
            getAuthResponse () {
                return null;
            },
            getLoginStatus (callback) {
                setTimeout(() => callback?.({ status: 'unknown', authResponse: null }), 0);
            },
            getUserID () {
                return '';
            },
            login (callback, params) {
                runFacebookLogin({ callback, params });
            },
            logout (callback) {
                callback?.({ status: 'unknown', authResponse: null });
            },
            AppEvents: {
                EventNames: {
                    ACHIEVED_LEVEL: 'fb_mobile_level_achieved',
                    ADDED_PAYMENT_INFO: 'fb_mobile_add_payment_info',
                    ADDED_TO_CART: 'fb_mobile_add_to_cart',
                    ADDED_TO_WISHLIST: 'fb_mobile_add_to_wishlist',
                    COMPLETED_REGISTRATION: 'fb_mobile_complete_registration',
                    COMPLETED_TUTORIAL: 'fb_mobile_tutorial_completion',
                    INITIATED_CHECKOUT: 'fb_mobile_initiated_checkout',
                    PAGE_VIEW: 'fb_page_view',
                    RATED: 'fb_mobile_rate',
                    SEARCHED: 'fb_mobile_search',
                    SPENT_CREDITS: 'fb_mobile_spent_credits',
                    UNLOCKED_ACHIEVEMENT: 'fb_mobile_achievement_unlocked',
                    VIEWED_CONTENT: 'fb_mobile_content_view'
                },
                ParameterNames: {
                    APP_USER_ID: '_app_user_id',
                    APP_VERSION: '_appVersion',
                    CONTENT_ID: 'fb_content_id',
                    CONTENT_TYPE: 'fb_content_type',
                    CURRENCY: 'fb_currency',
                    DESCRIPTION: 'fb_description',
                    LEVEL: 'fb_level',
                    MAX_RATING_VALUE: 'fb_max_rating_value',
                    NUM_ITEMS: 'fb_num_items',
                    PAYMENT_INFO_AVAILABLE: 'fb_payment_info_available',
                    REGISTRATION_METHOD: 'fb_registration_method',
                    SEARCH_STRING: 'fb_search_string',
                    SUCCESS: 'fb_success'
                },
                activateApp () {},
                clearAppVersion () {},
                clearUserID () {},
                getAppVersion () {
                    return '';
                },
                getUserID () {
                    return '';
                },
                logEvent () {},
                logPageView () {},
                logPurchase () {},
                setAppVersion () {},
                setUserID () {},
                updateUserProperties () {}
            },
            Canvas: {
                Plugin: {
                    hidePluginElement () {},
                    showPluginElement () {}
                },
                Prefetcher: {
                    COLLECT_AUTOMATIC: 0,
                    COLLECT_MANUAL: 1,
                    addStaticResource () {},
                    setCollectionMode () {}
                },
                getHash () {
                    return '';
                },
                getPageInfo (callback) {
                    callback?.({
                        clientHeight: 1,
                        clientWidth: 1,
                        offsetLeft: 0,
                        offsetTop: 0,
                        scrollLeft: 0,
                        scrollTop: 0
                    });
                },
                scrollTo () {},
                setAutoGrow () {},
                setDoneLoading () {},
                setHash () {},
                setSize () {},
                setUrlHandler () {},
                startTimer () {},
                stopTimer () {}
            },
            Event: {
                subscribe (event, callback) {
                    subscribeCalls.push([event, callback]);
                    // Fire `xfbml.render` immediately since some websites wait
                    // for it.
                    if (event === 'xfbml.render') {
                        callback?.();
                    }
                },
                unsubscribe () {}
            },
            XFBML: {
                parse (root, callback) {
                    parseCalls.push([root, callback]);
                    renderLoginButtons(root ?? document);
                    callback?.();
                }
            },
            frictionless: {
                init () {},
                isAllowed () {
                    return false;
                }
            },
            gamingservices: {
                friendFinder () {},
                uploadImageToMediaLibrary () {}
            },
            __buffer: {
                replay: null,
                calls: [],
                opts: null
            }
        };

        // Replay anything the loader stub queued before we ran.
        if (buffer?.opts) {
            window.FB.init(buffer.opts);
        }
        for (const [method, params] of buffer?.calls ?? []) {
            const path = String(method).split('.');
            const name = path.pop();
            const ctx = path.reduce((obj, key) => obj?.[key], window.FB);
            if (typeof ctx?.[name] === 'function') {
                ctx[name](...(params ?? []));
            }
        }

        // Fire fbAsyncInit as soon as possible.
        // Note: `init()` is idempotent, so safe to retry it at DOM-ready and
        //       load in case the page defines `fbAsyncInit` later on.
        init();
        if (document.readyState !== 'complete') {
            window.addEventListener('DOMContentLoaded', init);
            window.addEventListener('load', init);
        }
    }
})();
