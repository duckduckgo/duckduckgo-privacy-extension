/**
 * Manages fingerprint protection of JavaScript browser API's. Overwrites
 * object properties and methods to reduce entropy or modify fingerprint
 * data through obsufcation / randomness.
 */

(function protect () {
    // Exclude some content types from injection
    const elem = document.head || document.documentElement
    try {
        const contentType = elem.ownerDocument.contentType
        if (contentType === 'application/xml' ||
            contentType === 'application/json' ||
            contentType === 'text/xml' ||
            contentType === 'text/json' ||
            contentType === 'text/rss+xml' ||
            contentType === 'application/rss+xml'
        ) {
            return
        }
    } catch (e) {
        // if we can't find content type, go ahead with injection.
    }

    // Property values to be set and their original values.
    const fingerprintPropertyValues = {
        'screen': {
            'availTop': {
                'object': 'screen',
                'origValue': screen.availTop,
                'targetValue': 0
            },
            'availLeft': {
                'object': 'screen',
                'origValue': screen.availLeft,
                'targetValue': 0
            },
            'availWidth': {
                'object': 'screen',
                'origValue': screen.availWidth,
                'targetValue': screen.width
            },
            'availHeight': {
                'object': 'screen',
                'origValue': screen.availHeight,
                'targetValue': screen.height
            },
            'colorDepth': {
                'object': 'screen',
                'origValue': screen.colorDepth,
                'targetValue': 24
            },
            'pixelDepth': {
                'object': 'screen',
                'origValue': screen.pixelDepth,
                'targetValue': 24
            }
        },
        'hardware': {
            'keyboard': {
                'object': 'navigator',
                'origValue': navigator.keyboard,
                'targetValue': undefined
            },
            'hardwareConcurrency': {
                'object': 'navigator',
                'origValue': navigator.hardwareConcurrency,
                'targetValue': 8
            },
            'deviceMemory': {
                'object': 'navigator',
                'origValue': navigator.deviceMemory,
                'targetValue': 8
            }
        },
        /*
        'useragent': {
//            'userAgent': {
//                'object': 'navigator',
//                'origValue': navigator.userAgent,
//                'targetValue': `"${ddg_ext_ua}"` // Defined in chrome-events.es6.js and injected as a variable
//            },
              'appVersion': {
                'object': 'navigator',
                'origValue': navigator.appVersion,
                'targetValue': `"${getAppVersionValue()}"`
            }
        },
        */
        'options': {
            'doNotTrack': {
                'object': 'navigator',
                'origValue': navigator.doNotTrack,
                'targetValue': /Firefox/i.test(navigator.userAgent) ? '"unspecified"' : null
            }
        }
    }

    // ddg_referrer is defined in chrome-events.es6.js and injected as a variable if referrer should be modified
    // Unfortunately, we only have limited information about the referrer and current frame. A single
    // page may load many requests and sub frames, all with different referrers. Since we
    if (ddg_referrer && // make sure the referrer was set correctly
        ddg_referrer.referrer !== undefined && // referrer value will be undefined when it should be unchanged.
        document.referrer && // don't change the value it isn't set
        document.referrer !== '' && // don't add referrer information
        new URL(document.URL).hostname !== new URL(document.referrer).hostname) { // don't replace the referrer for the current host.
        let trimmedReferer = document.referrer
        if (new URL(document.referrer).hostname === ddg_referrer.referrerHost) {
            // make sure the real referrer & replacement referrer match if we're going to replace it
            trimmedReferer = ddg_referrer.referrer
        } else {
            // if we don't have a matching referrer, just trim it to hostname.
            trimmedReferer = new URL(document.referrer).hostname
        }
        fingerprintPropertyValues['document'] = {
            'referrer': {
                'object': 'document',
                'origValue': document.referrer,
                'targetValue': `"${trimmedReferer}"`
            }
        }
    }

    /**
     * the navigator.appVersion is sometimes used to 'validate' the user agent. In Firefox, this 
     * returns a truncated version of the user Agent with just the OS type (X11, Macintosh, etc). Chrome
     * returns the full user Agent.
     *
     * This function returns the spoofed user agent, unless the browser is FireFox, when it leaves it unchanged.
     */
    function getAppVersionValue () {
        if (/Firefox/i.test(navigator.userAgent)) {
            // Running Firefox, so keep the original value.
            return navigator.appVersion
        }
        // UserAgent is in the format of "Mozilla/<details>", appVersion only includes the details portion
        return ddg_ext_ua.replace('Mozilla/', '')
    }

    /*
     * Return device specific battery value that prevents fingerprinting.
     * On Desktop/Laptop - fully charged and plugged in.
     * On Mobile, should not plugged in with random battery values every load.
     * Property event functions are also defined, for setting later.
     */
    function getBattery () {
        let battery = {}
        battery.value = {
            charging: true,
            chargingTime: 0,
            dischargingTime: Infinity,
            level: 1
        }
        battery.properties = ['onchargingchange', 'onchargingtimechange', 'ondischargingtimechange', 'onlevelchange']
        return battery
    }

    /**
     * For each property defined on the object, update it with the target value.
     */
    function buildScriptProperties () {
        let script = ''
        for (const category in fingerprintPropertyValues) {
            for (const [name, prop] of Object.entries(fingerprintPropertyValues[category])) {
                // Don't update if existing value is undefined or null
                if (!(prop.origValue === undefined)) {
                    script += `try {
                        Object.defineProperty(${prop.object}, "${name}", { value: ${prop.targetValue} });
                    } catch (e) {}
                    `
                }
            }
        }
        return script
    }

    /**
     *  Build a script that overwrites the Battery API if present in the browser.
     *  It will return the values defined in the getBattery function to the client,
     *  as well as prevent any script from listening to events.
     */
    function buildBatteryScript () {
        if (navigator.getBattery) {
            const battery = getBattery()
            let batteryScript = `
                navigator.getBattery = function getBattery () {
                let battery = ${JSON.stringify(battery.value)}
            `
            for (const prop of battery.properties) {
                // Prevent setting events via event handlers
                batteryScript += `
                try {
                    Object.defineProperty(battery, '${prop}', {
                        enumerable: true,
                        configurable: false,
                        writable: false,
                        value: undefined
                    })
                } catch (e) {}
                `
            }

            // Wrap event listener functions so handlers aren't added
            for (const handler of ['addEventListener']) {
                batteryScript += `
                    battery.${handler} = function ${handler} () {
                        return
                    }
                `
            }
            batteryScript += `
                return Promise.resolve(battery)
                }
            `
            return batteryScript
        } else {
            return ''
        }
    }

    /**
     * All the steps for building the injection script. Should only be done at initial page load.
     */
    function buildInjectionScript () {
        let script = buildScriptProperties()
        script += modifyTemporaryStorage()
        script += buildBatteryScript()
        script += setWindowDimensions()
        return script
    }

    /**
     * normalize window dimensions, if more than one monitor is in play.
     *  X/Y values are set in the browser based on distance to the main monitor top or left, which
     * can mean second or more monitors have very large or negative values. This function maps a given
     * given coordinate value to the proper place on the main screen.
     */
    function normalizeWindowDimension (value, targetDimension) {
        if (value > targetDimension) {
            return value % targetDimension
        }
        if (value < 0) {
            return targetDimension + value
        }
        return value
    }

    function setWindowPropertyValue (property, value) {
        let script = `
            try {
                window.${property} = ${value}
            } catch (e) { }
        `
        return script
    }

    /**
     * Fix window dimensions. The extension runs in a different JS context than the
     * page, so we can inject the correct screen values as the window is resized,
     * ensuring that no information is leaked as the dimensions change, but also that the
     * values change correctly for valid use cases.
     */
    function setWindowDimensions () {
        let windowScript = ''
        try {
            const normalizedY = normalizeWindowDimension(window.screenY, window.screen.height)
            const normalizedX = normalizeWindowDimension(window.screenX, window.screen.width)
            if (normalizedY <= fingerprintPropertyValues.screen.availTop.origValue) {
                windowScript += setWindowPropertyValue('screenY', 0)
                windowScript += setWindowPropertyValue('screenTop', 0)
            } else {
                windowScript += setWindowPropertyValue('screenY', normalizedY)
                windowScript += setWindowPropertyValue('screenTop', normalizedY)
            }

            if (top.window.outerHeight >= fingerprintPropertyValues.screen.availHeight.origValue - 1) {
                windowScript += setWindowPropertyValue('top.window.outerHeight', 'window.screen.height')
            } else {
                try {
                    windowScript += setWindowPropertyValue('top.window.outerHeight', top.window.outerHeight)
                } catch (e) {
                    // top not accessible to certain iFrames, so ignore.
                }
            }

            if (normalizedX <= fingerprintPropertyValues.screen.availLeft.origValue) {
                windowScript += setWindowPropertyValue('screenX', 0)
                windowScript += setWindowPropertyValue('screenLeft', 0)
            } else {
                windowScript += setWindowPropertyValue('screenX', normalizedX)
                windowScript += setWindowPropertyValue('screenLeft', normalizedX)
            }

            if (top.window.outerWidth >= fingerprintPropertyValues.screen.availWidth.origValue - 1) {
                windowScript += setWindowPropertyValue('top.window.outerWidth', 'window.screen.width')
            } else {
                try {
                    windowScript += setWindowPropertyValue('top.window.outerWidth', top.window.outerWidth)
                } catch (e) {
                    // top not accessible to certain iFrames, so ignore.
                }
            }
        } catch (e) {
            // in a cross domain iFrame, top.window is not accessible.
        }

        return windowScript
    }

    /**
     * Temporary storage can be used to determine hard disk usage and size.
     * This will limit the max storage to 4GB without completely disabling the
     * feature.
     */
    function modifyTemporaryStorage () {
        const script = `
            if (navigator.webkitTemporaryStorage) {
                try {
                    const org = navigator.webkitTemporaryStorage.queryUsageAndQuota
                    navigator.webkitTemporaryStorage.queryUsageAndQuota = function queryUsageAndQuota (callback, err) {
                        const modifiedCallback = function (usedBytes, grantedBytes) {
                            const maxBytesGranted = 4 * 1024 * 1024 * 1024
                            const spoofedGrantedBytes = Math.min(grantedBytes, maxBytesGranted)
                            callback(usedBytes, spoofedGrantedBytes)
                        }
                        org.call(navigator.webkitTemporaryStorage, modifiedCallback, err)
                    }
                }
                catch(e) {}
            }
        `
        return script
    }

    /**
     * Inject all the overwrites into the page.
     */
    function inject (scriptToInject, removeAfterExec, elemToInject) {
        // Inject into main page
        try {
            let e = document.createElement('script')
            e.textContent = scriptToInject
            elemToInject.appendChild(e)

            if (removeAfterExec) {
                e.remove()
            }
        } catch (e) {
        }
    }

    window.addEventListener('resize', function () {
        const windowScript = setWindowDimensions()
        inject(windowScript, true, elem)
    })

    const injectionScript = buildInjectionScript()
    inject(injectionScript, true, elem)
})()
