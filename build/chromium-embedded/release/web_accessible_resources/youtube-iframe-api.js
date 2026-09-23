(() => {
    'use strict';

    if (typeof YT !== 'undefined') {
        return;
    }

    const youtubeEntityName = 'Youtube';

    // See https://developers.google.com/youtube/iframe_api_reference
    const iframeAPIURL = 'https://www.youtube.com/iframe_api';
    const defaultHeight = 640;
    const defaultWidth = 390;

    // The website's `onYouTubeIframeAPIReady` listener (if any).
    let realOnYouTubeIframeAPIReady;

    // Reference to the "real" `YT.Player` constructor and `YT.get` method.
    let RealYTPlayer = null;
    let RealYTGet = null;

    // Loading state of the YouTube Iframe API.
    let youTubeIframeAPILoaded = false;
    let youTubeIframeAPILoadingPromise = null;

    // Mappings between mock `YT.Player` Objects, their element in the page and
    // any event listeners they might have.
    const mockPlayerByVideoElement = new WeakMap();
    const onReadyListenerByVideoElement = new WeakMap();
    const onStateChangeListenerByVideoElement = new WeakMap();
    const otherEventListenersByVideoElement = new WeakMap();

    // Mappings between the "real" video elements and their placeholder
    // elements.
    const videoElementsByID = new Map();
    const videoElementByPlaceholderElement = new Map();
    const placeholderElementByVideoElement = new Map();

    function* allVideoElements () {
        yield* videoElementByPlaceholderElement.values();
        yield* videoElementsByID.values();
    }

    /**
     * Workaround for websites that use the YouTube Iframe API to set the video
     * ID _after_ the onReady event fires for the video player.
     * Note: This is not ideal, but most websites do not use the YouTube Iframe
     *       API in this way. In the future, this code-path could be expanded
     *       upon if necessary (e.g. to handle similar load functions and
     *       events).
     */
    function handleDeferredVideoLoad (target, url, eventListeners) {
        const fakeVideoLoad = () => {
            const listeners = otherEventListenersByVideoElement.get(target) || [];

            for (const [eventName, listener] of listeners) {
                switch (eventName) {
                case 'onAutoplayBlocked':
                    listener({ target: this });
                    break;
                case 'onStateChange':
                    listener({ target: this, data: window.YT.PlayerState.PAUSED });
                    break;
                }
            }
        };
        const fakeStateChange = state => {
            const listeners = otherEventListenersByVideoElement.get(target) || [];

            for (const [eventName, listener] of listeners) {
                if (eventName === 'onStateChange') {
                    listener({ target: this, data: state });
                    break;
                }
            }
        };

        this.getIframe = () => target;
        this.loadVideoById = videoId => {
            url.pathname = '/embed/' + encodeURIComponent(videoId);
            target.src = url.href;
            fakeVideoLoad();
        };
        this.loadVideoByUrl = videoUrl => {
            url.pathname = new URL(videoUrl).pathname;
            target.src = url.href;
            fakeVideoLoad();
        };
        this.addEventListener = (eventName, listener) => {
            // For some reason, the YouTube addEventListener API also accepts a
            // string containing the listening function's name.
            if (typeof listener !== 'function') {
                listener = window[listener.toString()];
            }

            // Give up if the listening function can't be found.
            if (typeof listener !== 'function') {
                return;
            }

            // Note the event listener. Used to fake state/load events and also
            // added to the real video if loaded.
            if (!otherEventListenersByVideoElement.has(target)) {
                otherEventListenersByVideoElement.set(target, []);
            }
            otherEventListenersByVideoElement.get(target).push([eventName, listener]);
        };

        // Take note of events passed in to via Player constructor's config too.
        // Note: The onReady event is skipped, since that is faked shortly, and
        //       it shouldn't fire twice.
        for (const eventName of Object.keys(eventListeners)) {
            if (eventName === 'onReady') {
                continue;
            }

            this.addEventListener(eventName, eventListeners[eventName]);
        }

        // Stub out some video methods here, to avoid an exception being thrown
        // if they are called before the video really loads. For the
        // play/pause/stop methods, also fire the state change event (if any),
        // to avoid websites waiting forever for the state to change.
        this.playVideo = fakeStateChange.bind(this, window.YT.PlayerState.PLAYING);
        this.pauseVideo = fakeStateChange.bind(this, window.YT.PlayerState.PAUSED);
        this.stopVideo = fakeStateChange.bind(this, window.YT.PlayerState.ENDED);
        this.getCurrentTime = () => 0;
        this.getDuration = () => 0;
        this.removeEventListener = () => { };

        eventListeners.onReady({ target: this });
    }

    /**
     * Mock of the `YT.get` method.
     */
    function fakeYTGet (id) {
        // Use the real YT.get if available.
        // Note: Mock players won't be returned, so it might not work.
        if (RealYTGet) {
            const player = RealYTGet(id);
            if (player) {
                return player;
            }
        }

        // Now check for mock players.
        for (const videoElement of allVideoElements()) {
            const player = mockPlayerByVideoElement.get(videoElement);
            if (player) {
                return player;
            }
        }

        return undefined;
    }

    /**
     * Mock of the `YT.Player` constructor.
     */
    function Player (target, config = { }, ...rest) {
        if (youTubeIframeAPILoaded) {
            return new RealYTPlayer(target, config, ...rest);
        }

        let { height, width, videoId, playerVars = { }, events } = config;

        if (!(target instanceof Element)) {
            const orignalTarget = target;
            target = document.getElementById(orignalTarget);

            if (!target) {
                for (const videoElement of allVideoElements()) {
                    // eslint-disable-next-line eqeqeq
                    if (videoElement.id == orignalTarget) {
                        target = videoElement;
                        break;
                    }
                }
            }
        }

        // Normalise target to always be the video element instead of the
        // placeholder element (if either even exists at this point).
        if (videoElementByPlaceholderElement.has(target)) {
            target = videoElementByPlaceholderElement.get(target);
        }

        if (!target) {
            throw new Error('Target not found');
        }

        const url = new URL(window.YTConfig.host);
        url.pathname = '/embed/';

        // Some websites have an iframe ready, with some of the video
        // parameters set. Take care to check for those.
        if (target instanceof HTMLIFrameElement) {
            let existingUrl;
            try { existingUrl = new URL(target.src); } catch (e) {}
            if (existingUrl?.hostname === 'youtube.com' ||
                existingUrl?.hostname === 'youtube-nocookie.com' ||
                existingUrl?.hostname === 'www.youtube.com' ||
                existingUrl?.hostname === 'www.youtube-nocookie.com') {
                // Existing iframe URL has a video ID, use that if one
                // wasn't passed in the config.
                if (existingUrl.pathname.startsWith('/embed/')) {
                    videoId = videoId || existingUrl.pathname.substr(7);
                }

                // Make use of any setting parameters too, though note they
                // can be overwritten by parameters given in the config.
                for (const [key, value] of existingUrl.searchParams) {
                    url.searchParams.set(key, value);
                }
            }
        }

        // Set up the video element if the target isn't an existing video.
        if (!placeholderElementByVideoElement.has(target)) {
            // For videos (not playlists) append the video ID to the path.
            // See https://developers.google.com/youtube/player_parameters
            if (!playerVars.list && videoId) {
                url.pathname += encodeURIComponent(videoId);
            }

            // Check for the setting parameters included in playerVars.
            for (const [key, value] of Object.entries(playerVars)) {
                url.searchParams.set(key, value);
            }

            // Ensure that JavaScript control of the video is always enabled.
            // This is necessary for the onReady event to fire for the video.
            url.searchParams.set('enablejsapi', '1');

            if (target instanceof HTMLIFrameElement) {
                target.src = url.href;
            } else {
                const videoIframe = document.createElement('iframe');
                videoIframe.height = height?.toString() || defaultHeight;
                videoIframe.width = width?.toString() || defaultWidth;
                videoIframe.src = url.href;

                if (target.id) {
                    videoIframe.id = target.id;
                }

                target.replaceWith(videoIframe);
                target = videoIframe;
            }

            target.dispatchEvent(new CustomEvent('ddg-ctp-replace-element'));
        }

        if (events) {
            if (events.onReady) {
                if (!playerVars.list && !videoId) {
                    // A few websites only set the video ID _after_ the onReady
                    // event has fired. That way of using the API doesn't make
                    // much sense, but it's still worth handling.
                    window.setTimeout(
                        handleDeferredVideoLoad.bind(
                            this, target, url, events
                        ), 0
                    );
                } else {
                    // Usually though, when there is an onReady event listener,
                    // that should be kept and only fired once the video is
                    // really loading.
                    onReadyListenerByVideoElement.set(target, events.onReady);
                }
            }
            if (events.onStateChange) {
                onStateChangeListenerByVideoElement.set(target, events.onStateChange);
            }
        }

        mockPlayerByVideoElement.set(target, this);
        this.playerInfo = {};
        return this;
    }

    // Stub out the YouTube Iframe API.
    window.YTConfig = {
        host: 'https://www.youtube.com'
    };
    window.YT = {
        loading: 1,
        loaded: 1,
        Player,
        PlayerState: {
            UNSTARTED: -1,
            ENDED: 0,
            PLAYING: 1,
            PAUSED: 2,
            BUFFERING: 3,
            CUED: 5
        },
        setConfig (config) {
            for (const key of Object.keys(config)) {
                window.YTConfig[key] = config[key];
            }
        },
        get: fakeYTGet,
        ready () { },
        scan () { },
        subscribe () { },
        unsubscribe () { }
    };

    /**
     * Load the YouTube Iframe API, replacing the stub.
     * @return {Promise}
     *   Promise which resolves after the API has finished loading.
     */
    function ensureYouTubeIframeAPILoaded () {
        if (youTubeIframeAPILoaded) {
            return Promise.resolve();
        }
        if (youTubeIframeAPILoadingPromise) {
            return youTubeIframeAPILoadingPromise;
        }

        const loadingPromise = new Promise((resolve, reject) => {
            // The YouTube Iframe API calls the `onYouTubeIframeAPIReady`
            // function to signal that it is ready for use by the website.
            window.onYouTubeIframeAPIReady = resolve;
        }).then(() => {
            window.onYouTubeIframeAPIReady = realOnYouTubeIframeAPIReady;
            RealYTPlayer = window.YT.Player;
            RealYTGet = window.YT.get;
            window.YT.get = fakeYTGet;
            youTubeIframeAPILoaded = true;
            youTubeIframeAPILoadingPromise = null;
        });

        // Delete the stub `YT` Object, since its presence will prevent the
        // YouTube Iframe API from loading.
        // Note: There's a chance that website will attempt to reference the
        //       `YT` Object inbetween now and when the script has loaded. This
        //       is unfortunate but unavoidable.
        delete window.YT;

        // Load the YouTube Iframe API.
        const script = document.createElement('script');
        script.src = iframeAPIURL;
        document.body.appendChild(script);

        youTubeIframeAPILoadingPromise = loadingPromise;
        return loadingPromise;
    }

    function onClickToPlayReady () {
        // Signal to the website that the YouTube Iframe API is ready for use,
        // even though it probably is not. That triggers the website to attempt
        // to create any videos that it wants to, which we can then block and
        // replace with placeholders.
        realOnYouTubeIframeAPIReady = window.onYouTubeIframeAPIReady;
        if (typeof realOnYouTubeIframeAPIReady === 'function') {
            realOnYouTubeIframeAPIReady();
        }
    }

    function onElementAnnounced (name) {
        return ({
            target,
            detail: {
                entity, widgetID: videoID,
                replaceSettings: { type: replaceType }
            }
        }) => {
            if (entity !== youtubeEntityName || replaceType !== 'youtube-video') {
                return;
            }

            let entry = videoElementsByID.get(videoID);
            if (entry) {
                entry[name] = target;
                videoElementByPlaceholderElement.set(entry.placeholder, entry.video);
                placeholderElementByVideoElement.set(entry.video, entry.placeholder);
                videoElementsByID.delete(videoID);
            } else {
                entry = { [name]: target };
                videoElementsByID.set(videoID, entry);
            }
        };
    }

    async function onPlaceholderClicked ({
        target,
        detail: {
            entity,
            replaceSettings: { type: replaceType }
        }
    }) {
        if (entity !== youtubeEntityName || replaceType !== 'youtube-video') {
            return;
        }

        await ensureYouTubeIframeAPILoaded();

        const mockPlayer = mockPlayerByVideoElement.get(target);
        if (!mockPlayer) {
            return;
        }

        const onReadyListener = onReadyListenerByVideoElement.get(target);
        const onStateChangeListener = onStateChangeListenerByVideoElement.get(target);
        const otherEventListeners = otherEventListenersByVideoElement.get(target);

        const config = { events: { } };
        if (onStateChangeListener && !otherEventListeners) {
            config.events.onStateChange = onStateChangeListener;
        }

        let realPlayer; // eslint-disable-line prefer-const

        config.events.onReady = (...args) => {
            // Make a best attempt at turning the mock `YT.Player` instance into
            // something that behaves the same as the "real" one. Necessary
            // since the website will likely still have a reference to the mock.

            // The methods of `YT.Player` instances are stored directly on the
            // instance, instead of in `YT.Player.__proto__` as would be
            // expected. Copy those over onto the mock, taking care to rebind
            // them so that they behave the same when called.
            //   Instead of copying over raw values, replace them with a
            // getter and setter which act on the value. That way any raw values
            // should stay consistent between a mock and "real" `YT.Player`
            // instance.
            const properties = Object.getOwnPropertyDescriptors(realPlayer);
            for (const [property, descriptor] of Object.entries(properties)) {
                if (Object.prototype.hasOwnProperty.call(descriptor, 'value') &&
                    typeof descriptor.value !== 'function' &&
                    !descriptor.get && !descriptor.set) {
                    // Plain value, replace with getter + setter.
                    delete descriptor.writable;
                    delete descriptor.value;
                    descriptor.get = () => realPlayer[property];
                    descriptor.set = (newValue) => { realPlayer[property] = newValue; };
                } else {
                    // Method or getter + setter. Rebind to apply to the "real"
                    // instance.
                    for (const key of ['get', 'set', 'value']) {
                        const value = descriptor[key];
                        if (typeof value === 'function') {
                            descriptor[key] = value.bind(realPlayer);
                        }
                    }
                }
            }
            delete this.playerInfo;
            Object.defineProperties(mockPlayer, properties);

            // Set the "real" player instance as the prototype of the mock. That
            // way, checks like `instanceof` are more likely to behave as
            // expected.
            mockPlayer.__proto__ = realPlayer; // eslint-disable-line no-proto

            if (onReadyListener) {
                onReadyListener(...args);
            }

            if (otherEventListeners) {
                // Take care to add event listeners captured by
                // handleDeferredVideoLoad now that the video is really loading.
                for (const [eventName, eventListener] of otherEventListeners) {
                    if (eventName === 'onStateChange') {
                        // Some state change events (e.g. UNSTARTED, BUFFERING)
                        // fire when the video is first loaded. Some websites
                        // are confused when those fire, since a faked PLAYING
                        // state event might have already been received.
                        // Avoid dispatching those events until the video has
                        // really loaded.
                        let loading = true;
                        realPlayer.addEventListener(eventName, ({ target, data }) => {
                            if (loading) {
                                if (data === window.YT.PlayerState.PLAYING ||
                                    data === window.YT.PlayerState.ENDED) {
                                    loading = false;
                                } else {
                                    return;
                                }
                            }

                            eventListener({ target, data });
                        });
                    } else {
                        realPlayer.addEventListener(eventName, eventListener);
                    }
                }
            }
        };

        realPlayer = new RealYTPlayer(target, config);

        onReadyListenerByVideoElement.delete(target);
        onStateChangeListenerByVideoElement.delete(target);
    }

    window.addEventListener(
        'ddg-ctp-ready', onClickToPlayReady,
        { once: true }
    );
    window.addEventListener(
        'ddg-ctp-tracking-element', onElementAnnounced('video'),
        { capture: true }
    );
    window.addEventListener(
        'ddg-ctp-placeholder-element', onElementAnnounced('placeholder'),
        { capture: true }
    );
    window.addEventListener(
        'ddg-ctp-placeholder-clicked', onPlaceholderClicked,
        { capture: true }
    );

    window.dispatchEvent(new CustomEvent('ddg-ctp-surrogate-load'));
})();
